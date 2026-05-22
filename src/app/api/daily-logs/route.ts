import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";

// helper to authenticate and check roles
async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) {
    return { authenticated: false, status: 401, error: "Unauthorized access. Please log in." };
  }
  const user = session.user as any;
  return { authenticated: true, user };
}

/**
 * GET /api/daily-logs
 * Retrieves daily activity logs based on roles:
 * - Founder / HR: All logs
 * - Team Lead: Logs for interns under direct supervision
 * - Intern: Self logs only
 */
export async function GET(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    let logs: any[] = [];

    if (user.role === "FOUNDER" || user.role === "HR") {
      logs = await db.dailyLog.findMany({
        include: {
          intern: {
            select: { id: true, internId: true, fullName: true, department: true },
          },
          task: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "TEAM_LEAD") {
      logs = await db.dailyLog.findMany({
        where: {
          intern: {
            supervisorId: user.id,
          },
        },
        include: {
          intern: {
            select: { id: true, internId: true, fullName: true, department: true },
          },
          task: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "INTERN") {
      const internProfile = await db.intern.findUnique({
        where: { userId: user.id },
      });

      if (!internProfile) {
        return NextResponse.json({ error: "No intern profile found for your account." }, { status: 404 });
      }

      logs = await db.dailyLog.findMany({
        where: {
          internId: internProfile.id,
        },
        include: {
          intern: {
            select: { id: true, internId: true, fullName: true, department: true },
          },
          task: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(logs, { status: 200 });
  } catch (err: any) {
    console.error("Error retrieving daily logs:", err);
    return NextResponse.json({ error: "Internal database query error." }, { status: 500 });
  }
}

/**
 * POST /api/daily-logs
 * Submits a new daily activity log (Restricted to INTERNs only)
 */
export async function POST(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    if (user.role !== "INTERN") {
      return NextResponse.json({ error: "Forbidden. Only interns/employees can submit daily activity logs." }, { status: 403 });
    }

    const internProfile = await db.intern.findUnique({
      where: { userId: user.id },
    });

    if (!internProfile) {
      return NextResponse.json({ error: "Forbidden. No active intern profile associated with this account." }, { status: 403 });
    }

    // Input parsing
    const body = await req.json().catch(() => ({}));
    const { workCompleted, blockers, hoursWorked, notes, taskId } = body;

    if (!workCompleted?.trim() || hoursWorked === undefined) {
      return NextResponse.json(
        { error: "Validation failed. Missing required fields: workCompleted or hoursWorked." },
        { status: 400 }
      );
    }

    const hours = parseFloat(hoursWorked);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      return NextResponse.json({ error: "Validation failed. hoursWorked must be a positive number between 0.1 and 24." }, { status: 400 });
    }

    // Optional task verification
    if (taskId) {
      const task = await db.task.findUnique({
        where: { id: taskId },
      });
      if (!task) {
        return NextResponse.json({ error: "Validation failed. Linked task goal does not exist." }, { status: 400 });
      }
      if (task.internId !== internProfile.id) {
        return NextResponse.json({ error: "Forbidden. Cannot link logs to tasks assigned to another intern." }, { status: 403 });
      }
    }

    // Create daily log in transactional ACID block along with activity audit log
    const newLog = await db.$transaction(async (tx) => {
      const safeUserId = await getSafeUserId(user.id, tx);
      const log = await tx.dailyLog.create({
        data: {
          internId: internProfile.id,
          workCompleted: workCompleted.trim(),
          blockers: blockers?.trim() || null,
          hoursWorked: hours,
          notes: notes?.trim() || null,
          taskId: taskId || null,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: safeUserId,
          action: "SUBMIT_DAILY_LOG",
          description: `Submitted a daily log for ${hours} hours worked.`,
        },
      });

      return log;
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (err: any) {
    console.error("Error creating daily log:", err);
    return NextResponse.json({ error: "Internal database save error." }, { status: 500 });
  }
}
