import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import crypto from "crypto";
import { hasPermission } from "@/lib/permissions";

/**
 * REST Endpoint for Document Approvals
 * GET /api/documents/approvals -> Fetch all generated documents
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const hasApprovalAccess = await hasPermission(userId, userRole, "approvalAccess");
    if (!hasApprovalAccess) {
      return NextResponse.json({ error: "Forbidden. Access restricted." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const internId = searchParams.get("internId");

    const docs = await db.generatedDocument.findMany({
      where: internId ? { internId } : {},
      include: {
        intern: {
          select: {
            fullName: true,
            internId: true,
            email: true,
            roleDomain: true,
            department: true,
          },
        },
        approvedBy: {
          select: {
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, documents: docs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/documents/approvals -> Edit, Approve, or Reject a generated document
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || "Administrator";

    const hasApprovalAccess = await hasPermission(userId, userRole, "approvalAccess");
    if (!hasApprovalAccess) {
      return NextResponse.json({ error: "Forbidden. Administrative access required." }, { status: 403 });
    }

    const body = await req.json();
    const { documentId, action, notes, content } = body;

    if (!documentId) {
      return NextResponse.json({ error: "Missing parameter: documentId" }, { status: 400 });
    }

    const doc = await db.generatedDocument.findUnique({
      where: { id: documentId },
      include: { intern: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const safeUserId = await getSafeUserId(userId);

    // ACTION 1: EDIT Draft Content
    if (action === "EDIT") {
      if (!content) {
        return NextResponse.json({ error: "Missing parameter: content for update" }, { status: 400 });
      }

      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          content: content,
          notes: notes || doc.notes,
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "EDIT_DOCUMENT",
          description: `Edited dynamic draft content for ${doc.type} for ${doc.intern.fullName}`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    // ACTION 2: REJECT Draft
    if (action === "REJECT") {
      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          status: "REJECTED",
          notes: notes || "Rejected during administrative review",
          approvedById: null,
          approvedAt: null,
          signature: null,
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "REJECT_DOCUMENT",
          description: `Rejected document draft ${doc.type} for ${doc.intern.fullName}`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    // ACTION 3: APPROVE & DIGITAL SIGN
    if (action === "APPROVE") {
      const approvedAt = new Date();
      // Create a solid cryptographic signature block
      const sigInput = `${doc.intern.id}-${userId}-${approvedAt.toISOString()}`;
      const sigHash = crypto.createHash("sha256").update(sigInput).digest("hex").substring(0, 16).toUpperCase();
      
      const signatureStamp = `Digitally Signed by ${userRole} [${userName}] | HASH: AXN-SIG-${sigHash} | DATE: ${approvedAt.toLocaleDateString()}`;

      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          status: "APPROVED",
          approvedById: userId,
          approvedAt,
          signature: signatureStamp,
          notes: notes || "Document approved and digitally signed.",
        },
      });

      // Register activity log
      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "SIGN_DOCUMENT",
          description: `Approved & digitally signed compliance ${doc.type} for ${doc.intern.fullName}`,
        },
      });

      // Trigger automated notification email asynchronously
      const vaultUrl = `${req.headers.get("origin") || "http://localhost:3000"}/documents`;
      const { sendDocumentApprovedEmail } = await import("@/lib/emailService");
      
      let readableType = doc.type.replace("_", " ");
      sendDocumentApprovedEmail(
        { fullName: doc.intern.fullName, email: doc.intern.email },
        readableType,
        vaultUrl
      ).catch((err) => console.error("Asynchronous document approval email failed:", err));

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    return NextResponse.json({ error: "Invalid action. Supported: EDIT, REJECT, APPROVE" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
