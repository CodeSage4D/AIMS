import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET: Fetch leave applications
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const hasApprovalAccess = await hasPermission(userId, role, "approvalAccess");

    if (role === "INTERN" || role === "EMPLOYEE") {
      // Find the corresponding intern profile
      const intern = await db.intern.findUnique({
        where: { userId },
      });

      if (!intern) {
        return NextResponse.json({ error: "Intern profile not found" }, { status: 404 });
      }

      const leaves = await db.leaveApplication.findMany({
        where: { internId: intern.id },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(leaves, { status: 200 });
    } else {
      if (!hasApprovalAccess) {
        return NextResponse.json({ error: "Forbidden. Access restricted." }, { status: 403 });
      }
      // Founders, HR, Team Leads can see all enrollees' leave requests
      const leaves = await db.leaveApplication.findMany({
        include: {
          intern: {
            select: {
              fullName: true,
              internId: true,
              department: true,
              roleDomain: true,
              supervisorId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Filter by supervision if they are TEAM_LEAD or ADMIN
      if (role === "TEAM_LEAD" || role === "ADMIN") {
        const filteredLeaves = leaves.filter(l => l.intern.supervisorId === userId);
        return NextResponse.json(filteredLeaves, { status: 200 });
      }

      return NextResponse.json(leaves, { status: 200 });
    }
  } catch (error) {
    console.error("Fetch leaves API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching leaves." },
      { status: 500 }
    );
  }
}

// POST: Submit a new leave application (Intern only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    if (role !== "INTERN" && role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Only interns can apply for leaves." }, { status: 403 });
    }

    // Find intern profile
    const intern = await db.intern.findUnique({
      where: { userId },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern profile not found" }, { status: 404 });
    }

    const { startDate, endDate, type, reason } = await request.json();

    if (!startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "Start date, end date, and reason are required." },
        { status: 400 }
      );
    }

    const leave = await db.leaveApplication.create({
      data: {
        internId: intern.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: type || "FULL_DAY",
        reason: String(reason).trim(),
        status: "PENDING",
      },
    });

    // Create activity log
    await db.activityLog.create({
      data: {
        userId,
        action: "LEAVE_APPLIED",
        description: `Intern applied for leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
      },
    });

    return NextResponse.json(leave, { status: 200 });
  } catch (error) {
    console.error("Apply leave API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while applying for leave." },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject leave application (Founder / HR / Admins with approvalAccess)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    // Check approvalAccess permission
    const hasApprovalAccess = await hasPermission(userId, role, "approvalAccess");
    if (role === "INTERN" || role === "EMPLOYEE" || !hasApprovalAccess) {
      return NextResponse.json({ error: "Forbidden. Only authorized managers can resolve leave requests." }, { status: 403 });
    }

    const { id, status } = await request.json();

    if (!id || !status || (status !== "APPROVED" && status !== "REJECTED")) {
      return NextResponse.json(
        { error: "Leave application ID and valid status (APPROVED/REJECTED) are required." },
        { status: 400 }
      );
    }

    // Fetch the leave application
    const leaveApp = await db.leaveApplication.findUnique({
      where: { id },
      include: {
        intern: true,
      },
    });

    if (!leaveApp) {
      return NextResponse.json({ error: "Leave application not found." }, { status: 404 });
    }

    if ((role === "TEAM_LEAD" || role === "ADMIN") && leaveApp.intern.supervisorId !== userId) {
      return NextResponse.json({ error: "Forbidden. You can only resolve leave requests for interns under your direct supervision." }, { status: 403 });
    }

    // Update status
    const updatedLeave = await db.leaveApplication.update({
      where: { id },
      data: { status },
    });

    // If APPROVED, auto-populate Daily Attendance Roll records for the date range
    if (status === "APPROVED") {
      const start = new Date(leaveApp.startDate);
      const end = new Date(leaveApp.endDate);
      
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(0, 0, 0, 0);
      
      const current = new Date(start);

      // Determine attendance status based on leave type
      let attStatus: any = "LEAVE";
      if (leaveApp.type === "HALF_DAY_1ST_HALF") attStatus = "HALF_DAY_1ST_HALF";
      if (leaveApp.type === "HALF_DAY_2ND_HALF") attStatus = "HALF_DAY_2ND_HALF";
      if (leaveApp.type === "EMERGENCY_LEAVE" || leaveApp.type === "URGENT_LEAVE") attStatus = "EMERGENCY_LEAVE";
      if (leaveApp.type === "WORK_PAUSE") attStatus = "WORK_PAUSED";
      if (leaveApp.type === "WORK_RESUME") attStatus = "PRESENT";

      while (current <= end) {
        const targetDate = new Date(current);
        targetDate.setUTCHours(0, 0, 0, 0);

        await db.attendance.upsert({
          where: {
            internId_date: {
              internId: leaveApp.internId,
              date: targetDate,
            },
          },
          update: {
            status: attStatus,
            remarks: `Approved Leave: ${leaveApp.reason}`,
          },
          create: {
            internId: leaveApp.internId,
            date: targetDate,
            status: attStatus,
            remarks: `Approved Leave: ${leaveApp.reason}`,
          },
        });

        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    // Log the approval activity
    await db.activityLog.create({
      data: {
        userId,
        action: `LEAVE_${status}`,
        description: `${role} ${status} leave request for ${leaveApp.intern.fullName} from ${new Date(leaveApp.startDate).toLocaleDateString()} to ${new Date(leaveApp.endDate).toLocaleDateString()}.`,
      },
    });

    return NextResponse.json(updatedLeave, { status: 200 });
  } catch (error) {
    console.error("Resolve leave API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while resolving the leave request." },
      { status: 500 }
    );
  }
}
