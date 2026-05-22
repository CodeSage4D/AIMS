import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Handles daily self-service check-in for authenticated interns.
 * POST /api/attendance/check-in
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
      return NextResponse.json({ error: "Only interns can log self-service check-ins." }, { status: 403 });
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

    // Calculate if they are late (past 9:30 AM IST)
    const hourIST = nowIST.getUTCHours();
    const minuteIST = nowIST.getUTCMinutes();
    const isLate = hourIST > 9 || (hourIST === 9 && minuteIST > 30);
    const status = isLate ? "LATE" : "PRESENT";

    // 4. Check for existing attendance record today
    let attendance = await db.attendance.findUnique({
      where: {
        internId_date: {
          internId: intern.id,
          date: todayUTC,
        },
      },
    });

    if (attendance) {
      // If they already have a checkIn, prevent overwriting
      if (attendance.checkIn) {
        const timeString = new Date(attendance.checkIn.getTime() + offsetIST)
          .toISOString()
          .split("T")[1]
          .substring(0, 5);
        return NextResponse.json(
          { error: `You have already checked in today at ${timeString} IST.` },
          { status: 400 }
        );
      }

      // Safeguard: Only override if the pre-existing record is auto-marked ABSENT.
      // If it is LEAVE or any other admin status, block the check-in to preserve integrity.
      if (attendance.status !== "ABSENT") {
        return NextResponse.json(
          { error: `You cannot check in because today is marked as '${attendance.status}'.` },
          { status: 400 }
        );
      }

      // If the record was auto-marked as ABSENT, override it since they are logging in now!
      attendance = await db.attendance.update({
        where: { id: attendance.id },
        data: {
          checkIn: now,
          status: status,
          remarks: `Checked in via portal at ${hourIST.toString().padStart(2, "0")}:${minuteIST
            .toString()
            .padStart(2, "0")} IST. Overrode auto-absent.`,
        },
      });
    } else {
      // Create new record
      attendance = await db.attendance.create({
        data: {
          internId: intern.id,
          date: todayUTC,
          checkIn: now,
          status: status,
          remarks: `Logged self-service check-in at ${hourIST.toString().padStart(2, "0")}:${minuteIST
            .toString()
            .padStart(2, "0")} IST.${isLate ? " (Late Check-in)" : ""}`,
        },
      });
    }

    // 4.5. Initialize active WorkSession for this attendance
    await db.workSession.create({
      data: {
        attendanceId: attendance.id,
        startTime: now,
      },
    });

    // 5. Register security activity log
    await db.activityLog.create({
      data: {
        userId,
        action: "ATTENDANCE_CHECK_IN",
        description: `Intern ${intern.fullName} checked in at ${now.toISOString()} (${status})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: isLate ? "Check-in logged as LATE." : "Check-in logged successfully.",
      attendance: {
        id: attendance.id,
        date: attendance.date.toISOString(),
        status: attendance.status,
        checkIn: attendance.checkIn ? attendance.checkIn.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error("Check-in Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during check-in." },
      { status: 500 }
    );
  }
}
