import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import { hasPermission } from "@/lib/permissions";

/**
 * REST Endpoint for querying daily attendance records.
 * GET /api/attendance?date=YYYY-MM-DD
 */
export async function GET(req: Request) {
  try {
    // 1. Session verification
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized access. Session credentials missing." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    if (userRole === "INTERN" || !(await hasPermission(userId, userRole, "attendanceAccess"))) {
      return NextResponse.json(
        { error: "Forbidden. Access restricted." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateQuery = searchParams.get("date");

    if (!dateQuery) {
      return NextResponse.json({ error: "Missing required date parameter." }, { status: 400 });
    }

    const targetDate = new Date(dateQuery);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Invalid date signature format." }, { status: 400 });
    }

    // Set timestamps boundary boundaries to query the specific calendar date
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const attendance = await db.attendance.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        internId: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error during attendance retrieval." },
      { status: 500 }
    );
  }
}

/**
 * REST Endpoint for bulk saving daily attendance rosters.
 * POST /api/attendance
 */
export async function POST(req: Request) {
  try {
    // 1. Session verification
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized session credentials." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    if (role === "INTERN" || !(await hasPermission(userId, role, "attendanceAccess"))) {
      return NextResponse.json(
        { error: "Forbidden. Only authorized accounts with attendance write permissions can modify bulk attendance." },
        { status: 403 }
      );
    }

    // 2. Extract payload
    const body = await req.json();
    const { date, records } = body;

    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid request payload format." }, { status: 400 });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    // Standardize time fields to midnight UTC to maintain absolute daily records consistency
    const recordDate = new Date(targetDate);
    recordDate.setUTCHours(0, 0, 0, 0);

    // 3. Execute bulk upserts inside an atomic Prisma Transaction (Protects data from half-written sheets)
    await db.$transaction(
      records.map((rec: { internId: string; status: any }) =>
        db.attendance.upsert({
          where: {
            internId_date: {
              internId: rec.internId,
              date: recordDate,
            },
          },
          update: {
            status: rec.status,
          },
          create: {
            internId: rec.internId,
            date: recordDate,
            status: rec.status,
          },
        })
      )
    );

    // 4. Register security log
    await db.activityLog.create({
      data: {
        userId: await getSafeUserId(userId),
        action: "LOG_ATTENDANCE",
        description: `Committed bulk daily attendance sheet for date ${date} across ${records.length} active intern files`,
      },
    });

    return NextResponse.json({ success: true, count: records.length }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error during bulk transaction commits." },
      { status: 500 }
    );
  }
}
