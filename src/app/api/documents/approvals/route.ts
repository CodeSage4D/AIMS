import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import crypto from "crypto";
import { hasPermission } from "@/lib/permissions";
import { generateDocumentPdf } from "@/lib/pdfGenerator";
import { uploadToGcs } from "@/lib/gcs";
import { scanFileBuffer } from "@/lib/scanner";

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
    const { documentId, action, notes, content, theme, cardType, badgeColor, themeColor, verificationStatus, verificationBadgeStyle } = body;

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

      const salt = process.env.NEXTAUTH_SECRET || "AURXON_SALT_2026";
      const verificationHash = crypto
        .createHash("sha256")
        .update(`${documentId}-${doc.internId}-${doc.type}-${approvedAt.getTime()}-${salt}`)
        .digest("hex");

      let nextContent = doc.content;
      if (doc.type === "ID_CARD") {
        nextContent = {
          ...(doc.content as any),
          cardType: cardType || (doc.content as any).cardType || "standard",
          theme: theme || (doc.content as any).theme || "orange",
          badgeColor: badgeColor || (doc.content as any).badgeColor || "#ea580c",
          themeColor: themeColor || (doc.content as any).themeColor || "#ea580c",
          verificationStatus: verificationStatus || "Authorized & Verified",
          verificationBadgeStyle: verificationBadgeStyle || "gold",
          verifiedAt: approvedAt.toISOString(),
          verifiedBy: `${userRole} (${userName})`,
        };
      }

      // 1. Compile the high-fidelity PDF server-side using jsPDF
      const pdfBuffer = await generateDocumentPdf({
        type: doc.type,
        id: documentId,
        status: "APPROVED",
        signature: signatureStamp,
        intern: {
          internId: doc.intern.internId,
          fullName: doc.intern.fullName,
          email: doc.intern.email,
          phoneNumber: doc.intern.phoneNumber,
          address: doc.intern.address,
          roleDomain: doc.intern.roleDomain,
          department: doc.intern.department,
          startDate: doc.intern.startDate,
          employmentType: doc.intern.employmentType,
        },
        content: nextContent,
      });

      // 2. Perform malware safety verification
      const pdfName = `Verified_${doc.type}_${doc.intern.internId || doc.intern.id}.pdf`;
      const scanResult = await scanFileBuffer(pdfBuffer, pdfName, "application/pdf");
      if (!scanResult.clean) {
        return NextResponse.json({ error: `Security threat detected in compiled document layout: ${scanResult.threatName}` }, { status: 400 });
      }

      // 3. Upload to Google Cloud Storage (with backup failover support)
      const uploadRes = await uploadToGcs(
        pdfBuffer,
        pdfName,
        "application/pdf",
        doc.internId,
        doc.type
      );

      const updatedDoc = await db.$transaction(async (tx) => {
        // Calculate document versioning atomically
        const lastDoc = await tx.secureDocument.findFirst({
          where: { ownerId: doc.internId, documentCategory: doc.type, archived: false },
          orderBy: { version: "desc" },
        });
        const nextVersion = lastDoc ? lastDoc.version + 1 : 1;

        // Archive previous versions of the same category
        if (lastDoc) {
          await tx.secureDocument.updateMany({
            where: { ownerId: doc.internId, documentCategory: doc.type },
            data: { archived: true },
          });
        }

        // Persist metadata and audit compliance in secure_documents table
        const secureDoc = await tx.secureDocument.create({
          data: {
            fileId: uploadRes.fileId,
            fileName: pdfName,
            storagePath: uploadRes.storagePath,
            fileType: "application/pdf",
            fileSize: uploadRes.fileSize,
            ownerId: doc.internId,
            uploadedById: userId,
            sha256Hash: uploadRes.sha256Hash,
            documentCategory: doc.type,
            version: nextVersion,
            bucketUsed: uploadRes.bucketUsed,
          },
        });

        // Generate the secure redirect url to point to GCS signed url stream proxy
        const vaultUrlProxy = `/api/documents/view?id=${secureDoc.id}&vault=true`;

        const docRecord = await tx.generatedDocument.update({
          where: { id: documentId },
          data: {
            status: "APPROVED",
            approvedById: userId,
            approvedAt,
            signature: signatureStamp,
            notes: notes || `Document approved, digitally signed, and archived (Ver: ${nextVersion}).`,
            content: nextContent as any,
            verificationHash,
            fileUrl: vaultUrlProxy, // Lock preview link to vault stream
          },
        });

        // Store a verified final GCS PDF reference inside the candidate's personal documents vault
        await tx.document.create({
          data: {
            internId: doc.internId,
            type: doc.type as any,
            fileName: pdfName,
            fileUrl: vaultUrlProxy,
            verified: true,
          },
        });

        return docRecord;
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

    // ACTION 4: DEACTIVATE Document/ID Card
    if (action === "DEACTIVATE") {
      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          status: "DEACTIVATED",
          signature: null,
          notes: notes || "Document/ID Card deactivated by compliance",
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "DEACTIVATE_DOCUMENT",
          description: `Deactivated document/ID Card ${doc.type} for ${doc.intern.fullName}`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    // ACTION 5: ACTIVATE (Re-activate) Document/ID Card
    if (action === "ACTIVATE") {
      const approvedAt = new Date();
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
          notes: notes || "Document/ID Card reactivated by compliance.",
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "ACTIVATE_DOCUMENT",
          description: `Reactivated & digitally signed document/ID Card ${doc.type} for ${doc.intern.fullName}`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    return NextResponse.json({ error: "Invalid action. Supported: EDIT, REJECT, APPROVE, DEACTIVATE, ACTIVATE" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
