import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Handles temporary work pause (break start) for authenticated interns.
 * POST /api/attendance/pause
 */
export async function POST(req: Request) {
  try {
    // 1. Session verification
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const userName = session.user.name || "AIMS User";
    const userEmail = session.user.email || "";

    // Fetch or create profile dynamically
    const { getOrCreateInternProfile } = await import("@/lib/safeUser");
    const intern = await getOrCreateInternProfile(userId, userRole, userName, userEmail);

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
      return NextResponse.json(
        { error: "You have already checked out for today." },
        { status: 400 }
      );
    }

    if (attendance.status === "WORK_PAUSED") {
      return NextResponse.json(
        { error: "Your work session is already paused." },
        { status: 400 }
      );
    }

    // Parse reason from body if any
    let reason = "Break";
    try {
      const body = await req.json();
      if (body.reason) reason = body.reason;
    } catch (e) {
      // Body might be empty, ignore
    }

    // 5. Close the open WorkSession
    const openSession = await db.workSession.findFirst({
      where: {
        attendanceId: attendance.id,
        endTime: null,
      },
    });

    if (openSession) {
      await db.workSession.update({
        where: { id: openSession.id },
        data: {
          endTime: now,
          isPaused: true,
          pauseReason: reason,
        },
      });
    }

    // 6. Update attendance status to WORK_PAUSED
    const hourIST = nowIST.getUTCHours();
    const minuteIST = nowIST.getUTCMinutes();
    const currentRemarks = attendance.remarks ? `${attendance.remarks} | ` : "";

    const specialStatuses = ["HALF_DAY_1ST_HALF", "HALF_DAY_2ND_HALF", "EMERGENCY_LEAVE", "LEAVE", "PRESENT", "LATE"];
    const prevStatusTag = specialStatuses.includes(attendance.status) ? `[PrevStatus:${attendance.status}] ` : "";

    const updatedAttendance = await db.attendance.update({
      where: { id: attendance.id },
      data: {
        status: "WORK_PAUSED",
        remarks: `${currentRemarks}${prevStatusTag}Paused work (Reason: ${reason}) at ${hourIST
          .toString()
          .padStart(2, "0")}:${minuteIST.toString().padStart(2, "0")} IST.`,
      },
    });

    // 7. Register activity log
    await db.activityLog.create({
      data: {
        userId,
        action: "ATTENDANCE_PAUSE",
        description: `Intern ${intern.fullName} paused work at ${now.toISOString()} (Reason: ${reason})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Work session paused successfully.",
      attendance: {
        id: updatedAttendance.id,
        status: updatedAttendance.status,
        remarks: updatedAttendance.remarks,
      },
    });
  } catch (error: any) {
    console.error("Pause Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during pause request." },
      { status: 500 }
    );
  }
}
