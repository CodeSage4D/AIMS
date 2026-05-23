import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { internId } = body;

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

    // Role-based Access Control
    const isSelf = intern.userId === userId;
    const isAdmin = userRole === "FOUNDER" || userRole === "HR" || userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const isSupervisor = intern.supervisorId === userId;

    if (!isSelf && !isAdmin && !isSupervisor) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to download this ID card." }, { status: 403 });
    }

    // Log the download action in ActivityLog for compliance audits
    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "DOWNLOAD_ID_CARD",
        description: `Downloaded official corporate ID card of ${intern.fullName} (${intern.internId || "PENDING"})`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST ID Card Download Audit Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
