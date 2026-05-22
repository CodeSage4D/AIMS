import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Handles daily self-service check-out for authenticated interns.
 * POST /api/attendance/check-out
 */
export async function POST() {
  try {
    // 1. Session verification
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "INTERN") {
      return NextResponse.json({ error: "Only interns can log self-service check-outs." }, { status: 403 });
    }

    // 2. Fetch the linked Intern profile
    const intern = await db.intern.findUnique({
      where: { userId },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
    }

    // 3. Resolve current date & IST (UTC + 5.5 Hours)
    const now = new Date();
    const offsetIST = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + offsetIST);
    
    // Normalize date to absolute midnight UTC in IST coordinates
    const todayUTC = new Date(
      Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 0, 0, 0, 0)
    );

    // 4. Find today's attendance record
    const attendance = await db.attendance.findUnique({
      where: {
        internId_date: {
          internId: intern.id,
          date: todayUTC,
        },
      },
    });

    if (!attendance || !attendance.checkIn) {
      return NextResponse.json(
        { error: "No active check-in record found for today. Please check in first." },
        { status: 400 }
      );
    }

    if (attendance.checkOut) {
      const timeString = new Date(attendance.checkOut.getTime() + offsetIST)
        .toISOString()
        .split("T")[1]
        .substring(0, 5);
      return NextResponse.json(
        { error: `You have already checked out today at ${timeString} IST.` },
        { status: 400 }
      );
    }

    // 4.5. Close any open WorkSession
    const openSession = await db.workSession.findFirst({
      where: {
        attendanceId: attendance.id,
        endTime: null,
      },
    });

    if (openSession) {
      await db.workSession.update({
        where: { id: openSession.id },
        data: { endTime: now },
      });
    }

    // 4.6. Compute total work duration from all closed sessions
    const allSessions = await db.workSession.findMany({
      where: { attendanceId: attendance.id },
    });

    let totalWorkDuration = 0;
    allSessions.forEach((session) => {
      const end = session.endTime || now;
      const durationMs = end.getTime() - session.startTime.getTime();
      totalWorkDuration += Math.round(durationMs / (1000 * 60)); // in minutes
    });

    // 5. Update attendance record with checkout timestamp and total work duration
    const hourIST = nowIST.getUTCHours();
    const minuteIST = nowIST.getUTCMinutes();
    const currentRemarks = attendance.remarks ? `${attendance.remarks} | ` : "";

    // Restore correct final status badge (LATE if checked in past 9:30 AM, else PRESENT)
    const checkInIST = new Date(attendance.checkIn.getTime() + offsetIST);
    const checkInHour = checkInIST.getUTCHours();
    const checkInMin = checkInIST.getUTCMinutes();
    const wasLate = checkInHour > 9 || (checkInHour === 9 && checkInMin > 30);
    const finalStatus = wasLate ? "LATE" : "PRESENT";

    const updatedAttendance = await db.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        status: finalStatus,
        totalWorkDuration,
        remarks: `${currentRemarks}Checked out via portal at ${hourIST
          .toString()
          .padStart(2, "0")}:${minuteIST.toString().padStart(2, "0")} IST. Total session time: ${totalWorkDuration} mins.`,
      },
    });

    // 6. Register activity log
    await db.activityLog.create({
      data: {
        userId,
        action: "ATTENDANCE_CHECK_OUT",
        description: `Intern ${intern.fullName} checked out at ${now.toISOString()}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Check-out logged successfully.",
      attendance: {
        id: updatedAttendance.id,
        date: updatedAttendance.date.toISOString(),
        status: updatedAttendance.status,
        checkIn: updatedAttendance.checkIn ? updatedAttendance.checkIn.toISOString() : null,
        checkOut: updatedAttendance.checkOut ? updatedAttendance.checkOut.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error("Check-out Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during check-out." },
      { status: 500 }
    );
  }
}
