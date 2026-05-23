import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const internId = searchParams.get("internId");

    if (!internId) {
      return NextResponse.json({ error: "Missing parameter: internId" }, { status: 400 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Fetch the intern / employee record
    const intern = await db.intern.findUnique({
      where: { id: internId },
    });

    if (!intern) {
      return NextResponse.json({ error: "Workspace profile not found." }, { status: 404 });
    }

    // Role-based Access Control: must be self or Founder/Admin/HR/Team Supervisor
    const isSelf = intern.userId === userId;
    const isAdmin = userRole === "FOUNDER" || userRole === "HR" || userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const isSupervisor = intern.supervisorId === userId;

    if (!isSelf && !isAdmin && !isSupervisor) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to access this ID card." }, { status: 403 });
    }

    // Find the generated document of type "ID_CARD"
    const doc = await db.generatedDocument.findFirst({
      where: {
        internId,
        type: "ID_CARD",
      },
    });

    if (!doc) {
      return NextResponse.json({ message: "No ID Card generated yet." }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error("GET ID Card Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { internId, theme, avatarUrl } = body;

    if (!internId) {
      return NextResponse.json({ error: "Missing parameters: internId" }, { status: 400 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Fetch the intern / employee record
    const intern = await db.intern.findUnique({
      where: { id: internId },
    });

    if (!intern) {
      return NextResponse.json({ error: "Workspace profile not found." }, { status: 404 });
    }

    // Role-based Access Control
    const isSelf = intern.userId === userId;
    const isAdmin = userRole === "FOUNDER" || userRole === "HR" || userRole === "SUPER_ADMIN" || userRole === "ADMIN";

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to generate this ID card." }, { status: 403 });
    }

    // Determine card endpoints
    const validUntil = intern.endDate
      ? new Date(intern.endDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "PERMANENT";

    const joiningDate = new Date(intern.startDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const docContent = {
      companyName: "AURXON",
      fullName: intern.fullName,
      internId: intern.internId,
      role: intern.roleDomain,
      department: intern.department,
      joiningDate,
      validUntil,
      avatarUrl: avatarUrl || "",
      theme: theme || "orange",
      barcode: `*${intern.internId}*`,
    };

    const isSaveAdmin = userRole === "FOUNDER" || userRole === "HR" || userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const initialStatus = isSaveAdmin ? "APPROVED" : "PENDING";
    const initialNotes = isSaveAdmin 
      ? "ID Card generated and approved directly by Administrator."
      : "ID Card compiled by enrollee, pending administrative approval.";

    // Check if ID Card GeneratedDocument already exists
    const existingDoc = await db.generatedDocument.findFirst({
      where: {
        internId,
        type: "ID_CARD",
      },
    });

    let resultDoc;
    if (existingDoc) {
      resultDoc = await db.generatedDocument.update({
        where: { id: existingDoc.id },
        data: {
          content: docContent as any,
          status: initialStatus,
          notes: initialNotes,
        },
      });
    } else {
      resultDoc = await db.generatedDocument.create({
        data: {
          internId,
          type: "ID_CARD",
          content: docContent as any,
          status: initialStatus,
          notes: initialNotes,
        },
      });
    }

    // Log this action for compliance audit
    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "GENERATE_ID_CARD",
        description: `Generated official ID card of ${intern.fullName} (${intern.internId || "PENDING"})`,
      },
    });

    return NextResponse.json({ success: true, document: resultDoc });
  } catch (error: any) {
    console.error("POST ID Card Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
