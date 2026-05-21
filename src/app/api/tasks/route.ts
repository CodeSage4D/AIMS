import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskStatus } from "@prisma/client";
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
 * POST /api/tasks
 * Assigns a new work goal/task to an active intern
 */
export async function POST(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Strict input validation
    const body = await req.json().catch(() => ({}));
    const { title, description, deadline, internId } = body;

    if (!title?.trim() || !description?.trim() || !deadline || !internId) {
      return NextResponse.json(
        { error: "Validation failed. Missing required fields: title, description, deadline, or internId." },
        { status: 400 }
      );
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return NextResponse.json({ error: "Validation failed. Invalid deadline date format." }, { status: 400 });
    }

    // Verify intern exists and is ACTIVE
    const intern = await db.intern.findUnique({
      where: { id: internId },
      select: { id: true, status: true, supervisorId: true },
    });

    if (!intern) {
      return NextResponse.json({ error: "Validation failed. Target intern does not exist." }, { status: 400 });
    }

    if (intern.status !== "ACTIVE" && intern.status !== "ONBOARDING") {
      return NextResponse.json({ error: "Validation failed. Tasks can only be assigned to ACTIVE or ONBOARDING interns." }, { status: 400 });
    }

    // Mentor authorization validation:
    // If user is MENTOR, verify they are allowed to assign tasks.
    // In AIMS, mentors can assign tasks to any intern or specifically interns under their supervision.
    // Let's allow assigning if they are ADMIN or the designated supervisor, or standard program mentors.
    if (user.role !== "FOUNDER" && user.role !== "HR" && user.role !== "TEAM_LEAD") {
      return NextResponse.json({ error: "Forbidden. Insufficient permissions to assign tasks." }, { status: 403 });
    }

    if (user.role === "TEAM_LEAD" && intern.supervisorId !== user.id) {
      return NextResponse.json({ error: "Forbidden. Team Leads can only assign tasks to enrollees under their direct supervision." }, { status: 403 });
    }

    // Create the task in a database transaction along with the audit log
    const newTask = await db.$transaction(async (tx) => {
      const safeUserId = await getSafeUserId(user.id, tx);
      const task = await tx.task.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          deadline: deadlineDate,
          internId,
          assignedById: safeUserId,
          status: TaskStatus.PENDING,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: safeUserId,
          action: "ASSIGN_TASK",
          description: `Assigned task "${title.trim()}" to intern (ID: ${internId})`,
        },
      });

      return task;
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (err: any) {
    console.error("Error creating task:", err);
    return NextResponse.json({ error: "Internal database save error." }, { status: 500 });
  }
}

/**
 * PATCH /api/tasks
 * Updates the state status of a specific task
 */
export async function PATCH(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Strict input validation
    const body = await req.json().catch(() => ({}));
    const { taskId, status, remarks } = body;

    if (!taskId || !status) {
      return NextResponse.json({ error: "Validation failed. Missing required fields: taskId or status." }, { status: 400 });
    }

    // Validate that the target status is a valid TaskStatus enum value
    if (!Object.values(TaskStatus).includes(status as any)) {
      return NextResponse.json({ error: `Validation failed. Invalid status value. Must be one of: ${Object.values(TaskStatus).join(", ")}` }, { status: 400 });
    }

    // Verify task exists
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { intern: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Validation failed. Target task does not exist." }, { status: 404 });
    }

    // Mentor authorization validation:
    // Team Leads can only update tasks they assigned OR tasks belonging to interns they supervise. Founder and HR can update any task.
    if (user.role !== "FOUNDER" && user.role !== "HR") {
      const isAssigner = task.assignedById === user.id;
      const isSupervisor = task.intern.supervisorId === user.id;

      if (!isAssigner && !isSupervisor) {
        return NextResponse.json({ error: "Forbidden. You are not authorized to update this task's status." }, { status: 403 });
      }
    }

    // Perform database status update and audit log in a safe transaction
    const updatedTask = await db.$transaction(async (tx) => {
      const safeUserId = await getSafeUserId(user.id, tx);
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          status: status as TaskStatus,
          remarks: remarks !== undefined ? remarks : undefined,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: safeUserId,
          action: "UPDATE_TASK_STATUS",
          description: `Updated status of task "${task.title}" to ${status}`,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (err: any) {
    console.error("Error updating task status:", err);
    return NextResponse.json({ error: "Internal database update error." }, { status: 500 });
  }
}
