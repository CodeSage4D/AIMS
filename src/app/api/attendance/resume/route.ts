import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Handles work resume (break end) for authenticated interns.
 * POST /api/attendance/resume
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

    if (attendance.status !== "WORK_PAUSED") {
      return NextResponse.json(
        { error: "Your work session is not currently paused." },
        { status: 400 }
      );
    }

    // 5. Find the last closed WorkSession to compute break/pause duration
    const lastSession = await db.workSession.findFirst({
      where: {
        attendanceId: attendance.id,
        endTime: { not: null },
      },
      orderBy: { startTime: "desc" },
    });

    let breakIncrement = 0;
    if (lastSession && lastSession.endTime) {
      const breakMs = now.getTime() - lastSession.endTime.getTime();
      breakIncrement = Math.round(breakMs / (1000 * 60)); // in minutes
    }

    const newBreakDuration = attendance.breakDuration + breakIncrement;

    // 6. Create a new active WorkSession
    await db.workSession.create({
      data: {
        attendanceId: attendance.id,
        startTime: now,
      },
    });

    // 7. Update attendance status back to original (LATE if checked in past 9:30 AM, else PRESENT/WORK_RESUMED)
    const checkInIST = new Date(attendance.checkIn.getTime() + offsetIST);
    const checkInHour = checkInIST.getUTCHours();
    const checkInMin = checkInIST.getUTCMinutes();
    const wasLate = checkInHour > 9 || (checkInHour === 9 && checkInMin > 30);
    
    // Default restore status
    let restoreStatus = wasLate ? "LATE" : "PRESENT";

    // 1. Try to recover status tag from remarks
    if (attendance.remarks) {
      const match = attendance.remarks.match(/\[PrevStatus:([A-Z0-9_]+)\]/);
      if (match && match[1]) {
        restoreStatus = match[1];
      }
    }

    // 2. Query for an active approved LeaveApplication for today to protect leave status
    const activeLeave = await db.leaveApplication.findFirst({
      where: {
        internId: intern.id,
        status: "APPROVED",
        startDate: { lte: todayUTC },
        endDate: { gte: todayUTC },
      },
    });

    if (activeLeave) {
      if (activeLeave.type === "HALF_DAY_1ST_HALF") {
        restoreStatus = "HALF_DAY_1ST_HALF";
      } else if (activeLeave.type === "HALF_DAY_2ND_HALF") {
        restoreStatus = "HALF_DAY_2ND_HALF";
      } else if (activeLeave.type === "EMERGENCY_LEAVE") {
        restoreStatus = "EMERGENCY_LEAVE";
      } else {
        restoreStatus = "LEAVE";
      }
    }

    const hourIST = nowIST.getUTCHours();
    const minuteIST = nowIST.getUTCMinutes();
    const currentRemarks = attendance.remarks ? `${attendance.remarks} | ` : "";

    const updatedAttendance = await db.attendance.update({
      where: { id: attendance.id },
      data: {
        status: restoreStatus as any,
        breakDuration: newBreakDuration,
        remarks: `${currentRemarks}Resumed work at ${hourIST
          .toString()
          .padStart(2, "0")}:${minuteIST.toString().padStart(2, "0")} IST. Break duration added: ${breakIncrement} mins.`,
      },
    });

    // 8. Register activity log
    await db.activityLog.create({
      data: {
        userId,
        action: "ATTENDANCE_RESUME",
        description: `Intern ${intern.fullName} resumed work at ${now.toISOString()}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Work session resumed successfully.",
      attendance: {
        id: updatedAttendance.id,
        status: updatedAttendance.status,
        breakDuration: updatedAttendance.breakDuration,
        remarks: updatedAttendance.remarks,
      },
    });
  } catch (error: any) {
    console.error("Resume Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during resume request." },
      { status: 500 }
    );
  }
}
