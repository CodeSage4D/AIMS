import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Fetch leave applications
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    if (role === "INTERN") {
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
      // Founders, HR, Team Leads can see all enrollees' leave requests
      const leaves = await db.leaveApplication.findMany({
        include: {
          intern: {
            select: {
              fullName: true,
              internId: true,
              department: true,
              roleDomain: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

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

    if (role !== "INTERN") {
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

// PATCH: Approve or reject leave application (Founder / HR)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    // Only Founder and HR are authorized to approve leaves
    if (role !== "FOUNDER" && role !== "HR") {
      return NextResponse.json({ error: "Only the Founder and HR managers can resolve leave requests." }, { status: 403 });
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

    // Update status
    const updatedLeave = await db.leaveApplication.update({
      where: { id },
      data: { status },
    });

    // If APPROVED, auto-populate Daily Attendance Roll records for the date range
    if (status === "APPROVED") {
      const start = new Date(leaveApp.startDate);
      const end = new Date(leaveApp.endDate);
      const current = new Date(start);

      // Determine attendance status based on leave type
      let attStatus: any = "LEAVE";
      if (leaveApp.type === "HALF_DAY_1ST_HALF") attStatus = "HALF_DAY_1ST_HALF";
      if (leaveApp.type === "HALF_DAY_2ND_HALF") attStatus = "HALF_DAY_2ND_HALF";

      while (current <= end) {
        // Set time to noon to avoid date zone shift mismatches
        const targetDate = new Date(current);
        targetDate.setUTCHours(12, 0, 0, 0);

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

        current.setDate(current.getDate() + 1);
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
