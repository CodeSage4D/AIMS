import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import crypto from "crypto";

/**
 * POST /api/documents/sign
 * Candidate digital signature endpoint.
 * - Updates lifecycle to PENDING_REVIEW after candidate signs.
 * - Watermark upgrades to OFFICIAL if Founder has already signed.
 * - Triggers GCS PDF archival if both parties have signed.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json().catch(() => ({}));
    const { documentId, signatureName } = body;

    if (!documentId || !signatureName?.trim()) {
      return NextResponse.json(
        { error: "Missing required parameters: documentId, signatureName." },
        { status: 400 }
      );
    }

    const doc = await db.generatedDocument.findUnique({
      where: { id: documentId },
      include: { intern: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document draft not found." }, { status: 404 });
    }

    // Only the candidate themselves can sign their onboarding documents
    if (doc.intern.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden. You can only sign your own onboarding documents." },
        { status: 403 }
      );
    }

    if (doc.lifecycleStatus === "APPROVED" && doc.candidateSigned) {
      return NextResponse.json(
        { error: "This document is already fully signed and locked." },
        { status: 400 }
      );
    }

    if (doc.lifecycleStatus === "REVOKED" || doc.lifecycleStatus === "ARCHIVED") {
      return NextResponse.json(
        { error: `Cannot sign a document in ${doc.lifecycleStatus} state.` },
        { status: 400 }
      );
    }

    const signedAt = new Date();
    const cleanSigName = signatureName.trim();

    // SHA-256 candidate signature stamp (NO SHA-1)
    const sigInput = `${documentId}|${userId}|${signedAt.toISOString()}|CANDIDATE_SIGNED`;
    const sigHash = crypto
      .createHash("sha256")
      .update(sigInput)
      .digest("hex")
      .substring(0, 24)
      .toUpperCase();

    const candidateSignatureStamp = `Digitally Signed by Candidate [${cleanSigName}] | SHA-256: AXN-CSIG-${sigHash} | Date: ${signedAt.toLocaleDateString()}`;

    const existingContent = typeof doc.content === "object" && doc.content !== null
      ? doc.content as any
      : {};

    // Determine if founder has already signed
    const founderAlreadySigned = doc.founderSigned || !!(existingContent?.signatures?.founderSignature);

    // Update signatures block
    const updatedSignatures = {
      ...(existingContent.signatures || {}),
      candidateSignature: cleanSigName,
      candidateSignedAt: signedAt.toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      }),
      candidateSignatureStamp,
    };

    // Legacy compatibility fields (used by OnboardingFlow and DocumentVaultClient)
    const updatedContent = {
      ...existingContent,
      signatures: updatedSignatures,
      candidateSignature: cleanSigName,
      candidateSignedAt: signedAt.toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      }),
      candidateSignatureStamp,
    };

    // Patch verification block
    if (updatedContent.verification) {
      updatedContent.verification.lifecycleStatus = founderAlreadySigned ? "APPROVED" : "PENDING_REVIEW";
      updatedContent.verification.watermark = founderAlreadySigned ? "OFFICIAL" : "PENDING";
    }

    // Lifecycle & watermark promotion
    const newLifecycle = founderAlreadySigned ? "APPROVED" : "PENDING_REVIEW";
    const newWatermark = founderAlreadySigned ? "OFFICIAL" : "PENDING";
    const newStatus = founderAlreadySigned ? "APPROVED" : "PENDING";

    const salt = process.env.NEXTAUTH_SECRET || "AURXON_SALT_2026";
    const verificationHash = crypto
      .createHash("sha256")
      .update(`${documentId}|${doc.internId}|${doc.type}|${signedAt.getTime()}|${salt}|CANDIDATE`)
      .digest("hex");

    const updatedDoc = await db.generatedDocument.update({
      where: { id: documentId },
      data: {
        content: updatedContent as any,
        candidateSigned: true,
        lifecycleStatus: newLifecycle,
        watermarkStatus: newWatermark,
        status: newStatus,
        verificationHash,
      },
    });

    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "SIGN_DOCUMENT_CANDIDATE",
        description: `Candidate signed ${doc.type} (v${doc.version}). Lifecycle: ${newLifecycle}. Watermark: ${newWatermark}.`,
      },
    });

    // ── Compile OFFICIAL PDF + archive to GCS if both parties have signed ──────
    if (newWatermark === "OFFICIAL" && doc.type !== "ID_CARD") {
      try {
        const { compilePDF } = await import("@/lib/pdfGenerator");
        const { uploadToGcs } = await import("@/lib/gcs");
        const { scanFileBuffer } = await import("@/lib/scanner");

        const founderSignatory = doc.founderSignatory || "Founder, AURXON";

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
          content: updatedContent,
          docType: doc.type,
          watermark: "OFFICIAL",
          founderSignatory,
          verification,
        });

        const scanResult = await scanFileBuffer(pdfBuffer, `${doc.type}.pdf`, "application/pdf");
        if (scanResult.clean) {
          const uploadResult = await uploadToGcs(
            pdfBuffer,
            `AURXON_${doc.type}_v${doc.version}_${doc.intern.internId}.pdf`,
            "application/pdf",
            doc.internId,
            "GENERATED_DOCUMENTS"
          );

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
              description: `OFFICIAL PDF compiled for ${doc.type} (v${doc.version}) and archived to GCS Vault after candidate signature. FileID: ${uploadResult.fileId}.`,
            },
          });
        }
      } catch (pdfErr: any) {
        console.error("[PDF SIGN/COMPILE ERROR]", pdfErr?.message);
        // Non-fatal
      }
    }

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error: any) {
    console.error("Candidate Document Signing Error:", error);
    return NextResponse.json({ error: error.message || "Failed to sign document." }, { status: 500 });
  }
}
