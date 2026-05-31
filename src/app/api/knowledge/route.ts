import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

// 1. Fetch policy documents
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role as Role;

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // e.g. "pending_review" for Founder

    // Founders and HR can read all drafts and indexed policies
    const isAdmin = userRole === "FOUNDER" || userRole === "HR" || userRole === "SUPER_ADMIN" || userRole === "ADMIN";

    if (isAdmin) {
      const documents = await db.knowledgeDocument.findMany({
        where: filter === "pending_review" ? { status: "PENDING" } : {},
        include: {
          creator: { select: { fullName: true } },
          approvedBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(documents);
    }

    // Standard employees/interns can only read approved policies within their access scope
    const roleHierarchyOrder: Role[] = [
      Role.INTERN,
      Role.EMPLOYEE,
      Role.TEAM_LEAD,
      Role.HR,
      Role.ADMIN,
      Role.SUPER_ADMIN,
      Role.FOUNDER,
    ];
    const userHierarchyIndex = roleHierarchyOrder.indexOf(userRole);

    const approvedDocs = await db.knowledgeDocument.findMany({
      where: { status: "APPROVED" },
      include: {
        creator: { select: { fullName: true } },
      },
    });

    const authorizedDocs = approvedDocs.filter((doc) => {
      const docHierarchyIndex = roleHierarchyOrder.indexOf(doc.roleBarrier);
      return userHierarchyIndex >= docHierarchyIndex;
    });

    return NextResponse.json(authorizedDocs);
  } catch (error: any) {
    console.error("GET Knowledge API Error:", error);
    return NextResponse.json({ error: "Failed to query policy registry." }, { status: 500 });
  }
}

// 2. HR/Admins upload a policy draft
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role as Role;

    // Must have onboardingAccess or settingsAccess to write guidelines
    const hasWriteAccess = await hasPermission(userId, userRole, "onboardingAccess") || userRole === "FOUNDER" || userRole === "SUPER_ADMIN";
    if (!hasWriteAccess) {
      return NextResponse.json({ error: "Forbidden. Administrative access required to publish policies." }, { status: 403 });
    }

    const { title, category, content, roleBarrier } = await req.json().catch(() => ({}));

    if (!title?.trim() || !category?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title, category, and content are required." }, { status: 400 });
    }

    const barrier = (roleBarrier as Role) || Role.INTERN;

    const newDoc = await db.knowledgeDocument.create({
      data: {
        title: title.trim(),
        category: category.trim(),
        content: content.trim(),
        roleBarrier: barrier,
        status: "PENDING", // Newly uploaded policies are PENDING by default
        createdById: userId,
      },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "KNOWLEDGE_UPLOAD",
        description: `HR/Admin uploaded dynamic policy draft "${title.trim()}" (${category.trim()}) awaiting Founder index approval.`,
      },
    });

    return NextResponse.json({ success: true, document: newDoc }, { status: 201 });
  } catch (error: any) {
    console.error("POST Knowledge API Error:", error);
    return NextResponse.json({ error: "Failed to upload policy draft." }, { status: 500 });
  }
}

// 3. Founder Approves or Rejects the draft
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role as Role;

    // Gated exclusively to FOUNDER as directed by Founder Approval indexing guidelines
    if (userRole !== "FOUNDER") {
      return NextResponse.json({ error: "Forbidden. Gated exclusively to Founder approval." }, { status: 403 });
    }

    const { docId, action, title, content, roleBarrier, version } = await req.json().catch(() => ({}));

    if (!docId) {
      return NextResponse.json({ error: "Missing parameter: docId" }, { status: 400 });
    }

    const doc = await db.knowledgeDocument.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      return NextResponse.json({ error: "Policy draft record not found." }, { status: 404 });
    }

    if (action === "REJECT") {
      const rejected = await db.knowledgeDocument.update({
        where: { id: docId },
        data: {
          status: "REJECTED",
        },
      });

      await db.activityLog.create({
        data: {
          userId,
          action: "KNOWLEDGE_REJECT",
          description: `Founder rejected policy draft "${doc.title}". Excluded from indexing.`,
        },
      });

      return NextResponse.json({ success: true, document: rejected });
    }

    if (action === "APPROVE") {
      const approved = await db.knowledgeDocument.update({
        where: { id: docId },
        data: {
          status: "APPROVED",
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      await db.activityLog.create({
        data: {
          userId,
          action: "KNOWLEDGE_INDEXED",
          description: `Founder approved and indexed policy "${doc.title}" (v${doc.version}) to the active AI Assistant knowledge retrieval base.`,
        },
      });

      return NextResponse.json({ success: true, document: approved });
    }

    // Support Policy Versioning & Revisions
    if (action === "UPDATE_VERSION") {
      const nextVersion = (version || doc.version) + 1;

      const updated = await db.knowledgeDocument.update({
        where: { id: docId },
        data: {
          title: title?.trim() || doc.title,
          content: content?.trim() || doc.content,
          roleBarrier: roleBarrier || doc.roleBarrier,
          version: nextVersion,
          status: "APPROVED", // Approved directly since Founder is making the change
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      await db.activityLog.create({
        data: {
          userId,
          action: "KNOWLEDGE_VERSION_UPGRADE",
          description: `Founder upgraded policy "${doc.title}" version to v${nextVersion}. Re-indexed.`,
        },
      });

      return NextResponse.json({ success: true, document: updated });
    }

    return NextResponse.json({ error: "Invalid action. Supported: APPROVE, REJECT, UPDATE_VERSION" }, { status: 400 });
  } catch (error: any) {
    console.error("PUT Knowledge API Error:", error);
    return NextResponse.json({ error: "Failed to review policy draft." }, { status: 500 });
  }
}
