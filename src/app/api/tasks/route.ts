import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskStatus } from "@prisma/client";
import { getSafeUserId } from "@/lib/safeUser";
import { hasPermission } from "@/lib/permissions";

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
    if (user.role === "INTERN" || !(await hasPermission(user.id, user.role, "taskAccess"))) {
      return NextResponse.json({ error: "Forbidden. Insufficient permissions to assign tasks." }, { status: 403 });
    }

    if ((user.role === "TEAM_LEAD" || user.role === "ADMIN") && intern.supervisorId !== user.id) {
      return NextResponse.json({ error: "Forbidden. Managers can only assign tasks to enrollees under their direct supervision." }, { status: 403 });
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
    const { taskId, status, remarks, submissionComment, feedbackComment } = body;

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

    // Check taskAccess permission and roles
    const hasTaskAccess = await hasPermission(user.id, user.role, "taskAccess");
    const isAssigner = task.assignedById === user.id;
    const isSupervisor = task.intern.supervisorId === user.id;
    const isOwner = task.intern.userId === user.id;

    if (user.role === "INTERN") {
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden. You can only update your own tasks." }, { status: 403 });
      }
      if (!hasTaskAccess) {
        return NextResponse.json({ error: "Forbidden. Insufficient permissions to access tasks." }, { status: 403 });
      }
    } else {
      if (!hasTaskAccess) {
        return NextResponse.json({ error: "Forbidden. Insufficient permissions to manage tasks." }, { status: 403 });
      }
      if ((user.role === "TEAM_LEAD" || user.role === "ADMIN") && !isAssigner && !isSupervisor) {
        return NextResponse.json({ error: "Forbidden. You can only manage tasks under your direct supervision or assigned by you." }, { status: 403 });
      }
    }

    // Role-based status transition restrictions:
    if (user.role === "INTERN") {
      if (status === "COMPLETED" || status === "PENDING") {
        return NextResponse.json({ error: "Forbidden. Interns/Employees cannot approve tasks or revert them to PENDING." }, { status: 403 });
      }
      if (status === "IN_REVIEW" && !submissionComment?.trim()) {
        return NextResponse.json({ error: "Validation failed. You must provide a submission comment when submitting your work for review." }, { status: 400 });
      }
    }

    // Perform database status update and audit log in a safe transaction
    const updatedTask = await db.$transaction(async (tx) => {
      const safeUserId = await getSafeUserId(user.id, tx);
      
      const updateData: any = {
        status: status as TaskStatus,
        remarks: remarks !== undefined ? remarks : undefined,
      };

      if (user.role === "INTERN") {
        if (submissionComment !== undefined) {
          updateData.submissionComment = submissionComment.trim();
        }
      } else {
        if (feedbackComment !== undefined) {
          updateData.feedbackComment = feedbackComment.trim();
        }
      }

      const updated = await tx.task.update({
        where: { id: taskId },
        data: updateData,
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

/**
 * DELETE /api/tasks?id=taskId
 * Deletes a work goal/task (Founder / HR / Admins with taskAccess)
 */
export async function DELETE(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json({ error: "Validation failed. Missing query parameter: id." }, { status: 400 });
    }

    // Verify task exists
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { intern: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Validation failed. Target task does not exist." }, { status: 404 });
    }

    // Strict Authorization Check: Must have taskAccess permission and not be INTERN
    const hasTaskAccess = await hasPermission(user.id, user.role, "taskAccess");
    if (user.role === "INTERN" || !hasTaskAccess) {
      return NextResponse.json({ error: "Forbidden. Insufficient permissions to delete tasks." }, { status: 403 });
    }

    const isAssigner = task.assignedById === user.id;
    const isSupervisor = task.intern.supervisorId === user.id;

    if ((user.role === "TEAM_LEAD" || user.role === "ADMIN") && !isAssigner && !isSupervisor) {
      return NextResponse.json({ error: "Forbidden. You can only delete tasks under your direct supervision or assigned by you." }, { status: 403 });
    }

    // Delete task in transaction with activity log
    await db.$transaction(async (tx) => {
      const safeUserId = await getSafeUserId(user.id, tx);
      await tx.task.delete({
        where: { id: taskId },
      });

      await tx.activityLog.create({
        data: {
          userId: safeUserId,
          action: "DELETE_TASK",
          description: `Deleted task "${task.title}"`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Task successfully deleted." }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting task:", err);
    return NextResponse.json({ error: "Internal database write error." }, { status: 500 });
  }
}
