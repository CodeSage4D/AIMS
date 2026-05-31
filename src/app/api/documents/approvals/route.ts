import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import crypto from "crypto";
import { hasPermission } from "@/lib/permissions";

/**
 * REST Endpoint for Document Approvals
 * GET  /api/documents/approvals → Fetch all generated documents
 * PUT  /api/documents/approvals → Edit, Approve, Reject, Archive, Revoke a document
 */

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/documents/approvals
// ─────────────────────────────────────────────────────────────────────────────

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
    const lifecycleFilter = searchParams.get("lifecycle"); // Optional lifecycle filter

    const docs = await db.generatedDocument.findMany({
      where: {
        ...(internId ? { internId } : {}),
        ...(lifecycleFilter ? { lifecycleStatus: lifecycleFilter } : {}),
      },
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

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/documents/approvals
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || (session.user as any).fullName || "AURXON Administration";

    const hasApprovalAccess = await hasPermission(userId, userRole, "approvalAccess");
    if (!hasApprovalAccess) {
      return NextResponse.json({ error: "Forbidden. Administrative access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      documentId,
      action,
      notes,
      content,
      theme,
      cardType,
      badgeColor,
      themeColor,
      verificationStatus,
      verificationBadgeStyle,
    } = body;

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

    // ── Auto-fill founder signatory ────────────────────────────────────────────
    let founderSignatory = userName;
    try {
      const setting = await db.systemSetting.findUnique({ where: { key: "founder_signatory_name" } });
      if (setting?.value) founderSignatory = setting.value;
    } catch { /* fallback to session name */ }

    // ── ACTION: EDIT Draft Content ─────────────────────────────────────────────
    if (action === "EDIT") {
      if (!content) {
        return NextResponse.json({ error: "Missing parameter: content for update" }, { status: 400 });
      }

      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          content: content,
          lifecycleStatus: "DRAFT",
          watermarkStatus: "DRAFT",
          notes: notes || doc.notes,
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "EDIT_DOCUMENT",
          description: `Edited draft content for ${doc.type} (v${doc.version}) for ${doc.intern.fullName}. Lifecycle reset to DRAFT.`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    // ── ACTION: PENDING_REVIEW — Move to review stage ─────────────────────────
    if (action === "SEND_TO_REVIEW") {
      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          lifecycleStatus: "PENDING_REVIEW",
          watermarkStatus: "PENDING",
          status: "PENDING",
          notes: notes || "Submitted for founder/HR review.",
          founderSignatory,
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "DOCUMENT_SENT_FOR_REVIEW",
          description: `${doc.type} (v${doc.version}) for ${doc.intern.fullName} moved to PENDING_REVIEW with PENDING watermark.`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    // ── ACTION: REJECT ─────────────────────────────────────────────────────────
    if (action === "REJECT") {
      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          lifecycleStatus: "REJECTED",
          watermarkStatus: "DRAFT",
          status: "REJECTED",
          notes: notes || "Rejected during administrative review.",
          approvedById: null,
          approvedAt: null,
          signature: null,
          founderSigned: false,
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "REJECT_DOCUMENT",
          description: `Rejected ${doc.type} (v${doc.version}) for ${doc.intern.fullName}. Lifecycle: REJECTED.`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    // ── ACTION: APPROVE & DIGITAL SIGN (Founder/HR) ────────────────────────────
    if (action === "APPROVE") {
      const approvedAt = new Date();

      // SHA-256 cryptographic signature stamp (NO SHA-1)
      const sigInput = `${doc.intern.id}|${userId}|${approvedAt.toISOString()}|FOUNDER_APPROVED`;
      const sigHash = crypto
        .createHash("sha256")
        .update(sigInput)
        .digest("hex")
        .substring(0, 24)
        .toUpperCase();
      const signatureStamp = `Digitally Signed by ${userRole} [${founderSignatory}] | SHA-256: AXN-SIG-${sigHash} | DATE: ${approvedAt.toLocaleDateString()}`;

      const salt = process.env.NEXTAUTH_SECRET || "AURXON_SALT_2026";
      const verificationHash = crypto
        .createHash("sha256")
        .update(`${documentId}|${doc.internId}|${doc.type}|${approvedAt.getTime()}|${salt}`)
        .digest("hex");

      // Determine if candidate has already signed
      const existingContent = doc.content as any;
      const candidateAlreadySigned = !!(existingContent?.signatures?.candidateSignature || existingContent?.candidateSignature || doc.candidateSigned);

      // Determine watermark — OFFICIAL only when both have signed
      const newWatermark = candidateAlreadySigned ? "OFFICIAL" : "PENDING";
      const newLifecycle = candidateAlreadySigned ? "APPROVED" : "PENDING_REVIEW";

      // Founder signature details
      const founderSignedAt = approvedAt.toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });

      let nextContent: any = {
        ...(existingContent || {}),
        founderSignatory,
        signatures: {
          ...(existingContent?.signatures || {}),
          founderSignature: founderSignatory,
          founderSignedAt,
          founderSignatureStamp: signatureStamp,
        },
      };

      // Special: ID_CARD enrichment
      if (doc.type === "ID_CARD") {
        nextContent = {
          ...nextContent,
          cardType: cardType || nextContent.cardType || "standard",
          theme: theme || nextContent.theme || "orange",
          badgeColor: badgeColor || nextContent.badgeColor || "#ea580c",
          themeColor: themeColor || nextContent.themeColor || "#ea580c",
          verificationStatus: verificationStatus || "Authorized & Verified",
          verificationBadgeStyle: verificationBadgeStyle || "gold",
          verifiedAt: approvedAt.toISOString(),
          verifiedBy: `${userRole} (${founderSignatory})`,
        };
      }

      // Patch verification hash in content
      if (nextContent.verification) {
        nextContent.verification.sha256Hash = verificationHash;
        nextContent.verification.watermark = newWatermark as any;
        nextContent.verification.lifecycleStatus = newLifecycle;
      }

      const updatedDoc = await db.$transaction(async (tx) => {
        const docRecord = await tx.generatedDocument.update({
          where: { id: documentId },
          data: {
            status: "APPROVED",
            lifecycleStatus: newLifecycle,
            watermarkStatus: newWatermark,
            approvedById: userId,
            approvedAt,
            signature: signatureStamp,
            founderSigned: true,
            founderSignatory,
            notes: notes || "Approved and digitally signed by authorised signatory.",
            content: nextContent as any,
            verificationHash,
          },
        });

        // Store a verified document reference in the candidate's personal vault
        await tx.document.upsert({
          where: {
            id: `verified-${documentId}`,
          },
          update: {
            verified: true,
          },
          create: {
            id: `verified-${documentId}`,
            internId: doc.internId,
            type: (doc.type as any) in {
              OFFER_LETTER: 1, NDA: 1, AGREEMENT: 1, ID_CARD: 1,
              EXPERIENCE_LETTER: 1, CERTIFICATE: 1
            } ? (doc.type as any) : "OTHER_FILES",
            fileName: `AURXON_${doc.type}_v${doc.version}_${doc.intern.internId}.pdf`,
            fileUrl: `/api/documents/view?id=${documentId}`,
            verified: true,
          },
        });

        return docRecord;
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "SIGN_DOCUMENT",
          description: `Founder/HR signed ${doc.type} (v${doc.version}) for ${doc.intern.fullName}. Lifecycle: ${newLifecycle}. Watermark: ${newWatermark}.`,
        },
      });

      // ── Compile PDF & archive to GCS Vault if both parties have signed ────────
      if (newWatermark === "OFFICIAL" && doc.type !== "ID_CARD") {
        try {
          const { compilePDF, generateDocumentHash } = await import("@/lib/pdfGenerator");
          const { uploadToGcs } = await import("@/lib/gcs");
          const { scanFileBuffer } = await import("@/lib/scanner");

          const verification = {
            documentId,
            verificationNumber: `AXN-VRF-${documentId.substring(0, 8).toUpperCase()}`,
            sha256Hash: verificationHash,
            verificationUrl: `${req.headers.get("origin") || "https://aims.aurxon.com"}/verify/${documentId}`,
            qrPlaceholder: `QR_VERIFY_${documentId}`,
            watermark: "OFFICIAL" as const,
            version: doc.version || 1,
            lifecycleStatus: "APPROVED",
          };

          const pdfBuffer = compilePDF({
            content: nextContent,
            docType: doc.type,
            watermark: "OFFICIAL",
            founderSignatory,
            verification,
          });

          // Malware scan before vault upload
          const scanResult = await scanFileBuffer(pdfBuffer, `${doc.type}.pdf`, "application/pdf");
          if (!scanResult.clean) {
            console.error(`[PDF GCS UPLOAD] Malware detected in generated PDF for document ${documentId}:`, scanResult.threatName);
          } else {
            const uploadResult = await uploadToGcs(
              pdfBuffer,
              `AURXON_${doc.type}_v${doc.version}_${doc.intern.internId}.pdf`,
              "application/pdf",
              doc.internId,
              "GENERATED_DOCUMENTS"
            );

            // Persist vault metadata
            await db.secureDocument.create({
              data: {
                fileId: uploadResult.fileId,
                fileName: `AURXON_${doc.type}_v${doc.version}_${doc.intern.internId}.pdf`,
                storagePath: uploadResult.storagePath,
                fileType: "application/pdf",
                fileSize: uploadResult.fileSize,
                ownerId: doc.internId,
                uploadedById: userId,
                sha256Hash: uploadResult.sha256Hash,
                documentCategory: "GENERATED_DOCUMENTS",
                version: doc.version || 1,
                bucketUsed: uploadResult.bucketUsed,
              },
            });

            // Update the generated document with GCS reference
            await db.generatedDocument.update({
              where: { id: documentId },
              data: {
                fileUrl: uploadResult.storagePath,
                gcsFileId: uploadResult.fileId,
              },
            });

            await db.activityLog.create({
              data: {
                userId: safeUserId,
                action: "ARCHIVE_DOCUMENT_GCS",
                description: `Compiled OFFICIAL PDF for ${doc.type} (v${doc.version}) and archived to GCS Vault. FileID: ${uploadResult.fileId}. Bucket: ${uploadResult.bucketUsed}.`,
              },
            });
          }
        } catch (pdfErr: any) {
          console.error("[PDF COMPILATION / GCS ARCHIVE ERROR]", pdfErr?.message);
          // Non-fatal — document approval still succeeds
        }
      }

      // Trigger email notification
      try {
        const vaultUrl = `${req.headers.get("origin") || "http://localhost:3000"}/documents`;
        const { sendDocumentApprovedEmail } = await import("@/lib/emailService");
        const readableType = doc.type.replace(/_/g, " ");
        sendDocumentApprovedEmail(
          { fullName: doc.intern.fullName, email: doc.intern.email },
          readableType,
          vaultUrl
        ).catch((err) => console.error("Document approval email failed:", err));
      } catch { /* non-fatal */ }

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    // ── ACTION: DEACTIVATE ─────────────────────────────────────────────────────
    if (action === "DEACTIVATE") {
      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          status: "DEACTIVATED",
          lifecycleStatus: "ARCHIVED",
          watermarkStatus: "DRAFT",
          signature: null,
          founderSigned: false,
          notes: notes || "Document deactivated by compliance.",
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "DEACTIVATE_DOCUMENT",
          description: `Deactivated ${doc.type} (v${doc.version}) for ${doc.intern.fullName}. Lifecycle: ARCHIVED.`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    // ── ACTION: ACTIVATE (Re-activate) ────────────────────────────────────────
    if (action === "ACTIVATE") {
      const approvedAt = new Date();
      const sigInput = `${doc.intern.id}|${userId}|${approvedAt.toISOString()}|REACTIVATE`;
      const sigHash = crypto
        .createHash("sha256")
        .update(sigInput)
        .digest("hex")
        .substring(0, 24)
        .toUpperCase();
      const signatureStamp = `Re-activated & Signed by ${userRole} [${founderSignatory}] | SHA-256: AXN-SIG-${sigHash} | DATE: ${approvedAt.toLocaleDateString()}`;

      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          status: "APPROVED",
          lifecycleStatus: "APPROVED",
          watermarkStatus: "OFFICIAL",
          approvedById: userId,
          approvedAt,
          signature: signatureStamp,
          founderSigned: true,
          founderSignatory,
          notes: notes || "Document reactivated by compliance.",
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "ACTIVATE_DOCUMENT",
          description: `Reactivated ${doc.type} (v${doc.version}) for ${doc.intern.fullName}. Lifecycle: APPROVED. Watermark: OFFICIAL.`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    // ── ACTION: REVOKE ─────────────────────────────────────────────────────────
    if (action === "REVOKE") {
      const updatedDoc = await db.generatedDocument.update({
        where: { id: documentId },
        data: {
          status: "REJECTED",
          lifecycleStatus: "REVOKED",
          watermarkStatus: "DRAFT",
          signature: null,
          founderSigned: false,
          candidateSigned: false,
          notes: notes || "Document revoked by compliance authority.",
        },
      });

      await db.activityLog.create({
        data: {
          userId: safeUserId,
          action: "REVOKE_DOCUMENT",
          description: `REVOKED ${doc.type} (v${doc.version}) for ${doc.intern.fullName}. Lifecycle: REVOKED.`,
        },
      });

      return NextResponse.json({ success: true, document: updatedDoc });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported: EDIT, SEND_TO_REVIEW, REJECT, APPROVE, DEACTIVATE, ACTIVATE, REVOKE" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[DOCUMENT APPROVALS ERROR]", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
