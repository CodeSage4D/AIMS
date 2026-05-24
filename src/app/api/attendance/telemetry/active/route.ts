import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/attendance/telemetry/active
 * Retrieves all active interns and calculates their real-time presence telemetry mapping.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const now = new Date();
    const offsetIST = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + offsetIST);
    
    // Normalize date to absolute midnight UTC in IST coordinates to match Prisma entries
    const todayUTC = new Date(
      Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 0, 0, 0, 0)
    );

    const interns = await db.intern.findMany({
      where: {
        deletedAt: null,
        status: { in: ["ACTIVE", "ONBOARDING"] }
      },
      include: {
        attendance: {
          where: {
            date: todayUTC
          }
        },
        supervisor: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: { fullName: "asc" }
    });

    const activeRoster = interns.map((intern) => {
      const att = intern.attendance[0];
      let presenceState: "ACTIVE" | "IDLE" | "PAUSED" | "OFFLINE" = "OFFLINE";
      let lastActive: string | null = null;

      if (att) {
        if (att.checkOut) {
          presenceState = "OFFLINE";
          lastActive = att.checkOut.toISOString();
        } else if (att.status === "WORK_PAUSED") {
          presenceState = "PAUSED";
          let lastHeartbeat = att.checkIn || att.createdAt;
          if (att.activityTimestamps && att.activityTimestamps.length > 0) {
            const lastStampStr = att.activityTimestamps[att.activityTimestamps.length - 1];
            const lastStamp = new Date(lastStampStr);
            if (!isNaN(lastStamp.getTime())) {
              lastHeartbeat = lastStamp;
            }
          }
          lastActive = lastHeartbeat.toISOString();
        } else if (att.checkIn) {
          presenceState = "ACTIVE";
          let lastHeartbeat = att.checkIn;

          if (att.activityTimestamps && att.activityTimestamps.length > 0) {
            const lastStampStr = att.activityTimestamps[att.activityTimestamps.length - 1];
            const lastStamp = new Date(lastStampStr);
            if (!isNaN(lastStamp.getTime())) {
              lastHeartbeat = lastStamp;
            }
          }

          lastActive = lastHeartbeat.toISOString();
          const diffMs = now.getTime() - lastHeartbeat.getTime();
          const tenMinutesInMs = 10 * 60 * 1000;

          if (diffMs > tenMinutesInMs) {
            presenceState = "IDLE";
          }
        }
      }

      return {
        id: intern.id,
        internId: intern.internId,
        fullName: intern.fullName,
        roleDomain: intern.roleDomain,
        department: intern.department,
        supervisorName: intern.supervisor?.fullName || "Unassigned",
        presenceState,
        lastActive
      };
    });

    return NextResponse.json({ success: true, roster: activeRoster }, { status: 200 });

  } catch (error: any) {
    console.error("Active Telemetry GET Error:", error);
    return NextResponse.json({ error: "Failed to retrieve real-time presence data." }, { status: 500 });
  }
}
