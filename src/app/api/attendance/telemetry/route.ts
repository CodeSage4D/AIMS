import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Endpoint for recording low-overhead telemetry activity heartbeats (keyboard/mouse only)
 * POST /api/attendance/telemetry
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
      return NextResponse.json({ error: "Telemetry restricted to intern roles." }, { status: 403 });
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

    // 4. Retrieve today's attendance record
    const attendance = await db.attendance.findUnique({
      where: {
        internId_date: {
          internId: intern.id,
          date: todayUTC,
        },
      },
    });

    if (!attendance) {
      return NextResponse.json({ error: "No attendance record found for today. Please check in first." }, { status: 400 });
    }

    if (!attendance.checkIn) {
      return NextResponse.json({ error: "You are not checked in for today." }, { status: 400 });
    }

    if (attendance.checkOut) {
      return NextResponse.json({ error: "Already checked out for today. Telemetry suspended." }, { status: 400 });
    }

    // Safeguard: Check if user is currently paused
    if (attendance.status === "WORK_PAUSED") {
      return NextResponse.json({ message: "Activity telemetry ignored while paused." });
    }

    // 5. Throttle heartbeats (only write if the last recorded heartbeat was > 5 minutes ago)
    const currentISOString = now.toISOString();
    let updatedTimestamps = [...attendance.activityTimestamps];

    if (updatedTimestamps.length > 0) {
      const lastTimestamp = new Date(updatedTimestamps[updatedTimestamps.length - 1]);
      const diffMs = now.getTime() - lastTimestamp.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (diffMs < fiveMinutesInMs) {
        // Ignored due to throttling - saves DB writes
        return NextResponse.json({ success: true, message: "Telemetry throttled (already logged within 5 mins)." });
      }
    }

    // Add new heartbeat stamp
    updatedTimestamps.push(currentISOString);

    // Persist in the database
    await db.attendance.update({
      where: { id: attendance.id },
      data: {
        activityTimestamps: updatedTimestamps,
      },
    });

    return NextResponse.json({ success: true, message: "Telemetry activity logged." });
  } catch (error: any) {
    console.error("Telemetry Logging Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during telemetry logging." },
      { status: 500 }
    );
  }
}
