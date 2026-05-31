import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import { generateDocumentPdf } from "@/lib/pdfGenerator";
import { uploadToGcs } from "@/lib/gcs";
import { scanFileBuffer } from "@/lib/scanner";

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
      return NextResponse.json({ error: "Missing required parameters: documentId, signatureName." }, { status: 400 });
    }

    const doc = await db.generatedDocument.findUnique({
      where: { id: documentId },
      include: { intern: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document draft not found." }, { status: 404 });
    }

    if (doc.intern.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. You can only sign your own onboarding documents." }, { status: 403 });
    }

    if (doc.status === "APPROVED") {
      return NextResponse.json({ error: "This document is already fully approved and locked." }, { status: 400 });
    }

    const signedAt = new Date();
    // Parse existing content and merge signature details
    const updatedContent = typeof doc.content === "object" && doc.content !== null
      ? {
          ...doc.content,
          candidateSignature: signatureName.trim(),
          candidateSignedAt: signedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          candidateSignatureStamp: `Digitally Signed by Candidate [${signatureName.trim()}] | Date: ${signedAt.toLocaleDateString()}`
        }
      : {
          candidateSignature: signatureName.trim(),
          candidateSignedAt: signedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          candidateSignatureStamp: `Digitally Signed by Candidate [${signatureName.trim()}] | Date: ${signedAt.toLocaleDateString()}`
        };

    let fileUrlProxy = doc.fileUrl;

    if (doc.signature) {
      // 1. Compile PDF
      const pdfBuffer = await generateDocumentPdf({
        type: doc.type,
        id: documentId,
        status: "APPROVED",
        signature: doc.signature,
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
        content: updatedContent,
      });

      // 2. Scan malware
      const pdfName = `Verified_${doc.type}_${doc.intern.internId || doc.intern.id}.pdf`;
      const scanResult = await scanFileBuffer(pdfBuffer, pdfName, "application/pdf");
      if (!scanResult.clean) {
        return NextResponse.json({ error: `Security threat detected in compiled PDF layout: ${scanResult.threatName}` }, { status: 400 });
      }

      // 3. Upload to GCS
      const uploadRes = await uploadToGcs(
        pdfBuffer,
        pdfName,
        "application/pdf",
        doc.internId,
        doc.type
      );

      // 4. Save inside Transaction
      await db.$transaction(async (tx) => {
        const lastDoc = await tx.secureDocument.findFirst({
          where: { ownerId: doc.internId, documentCategory: doc.type, archived: false },
          orderBy: { version: "desc" },
        });
        const nextVersion = lastDoc ? lastDoc.version + 1 : 1;

        if (lastDoc) {
          await tx.secureDocument.updateMany({
            where: { ownerId: doc.internId, documentCategory: doc.type },
            data: { archived: true },
          });
        }

        const secureDoc = await tx.secureDocument.create({
          data: {
            fileId: uploadRes.fileId,
            fileName: pdfName,
            storagePath: uploadRes.storagePath,
            fileType: "application/pdf",
            fileSize: uploadRes.fileSize,
            ownerId: doc.internId,
            uploadedById: doc.intern.userId || userId,
            sha256Hash: uploadRes.sha256Hash,
            documentCategory: doc.type,
            version: nextVersion,
            bucketUsed: uploadRes.bucketUsed,
          },
        });

        fileUrlProxy = `/api/documents/view?id=${secureDoc.id}&vault=true`;

        // Store a verified final GCS PDF reference inside the candidate's personal documents vault
        await tx.document.create({
          data: {
            internId: doc.internId,
            type: doc.type as any,
            fileName: pdfName,
            fileUrl: fileUrlProxy,
            verified: true,
          },
        });
      });
    }

    const updatedDoc = await db.generatedDocument.update({
      where: { id: documentId },
      data: {
        content: updatedContent as any,
        status: doc.signature ? "APPROVED" : "PENDING_FOUNDER",
        fileUrl: fileUrlProxy,
      },
    });

    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "SIGN_DOCUMENT_CANDIDATE",
        description: `Candidate digitally accepted and signed document ${doc.type}`,
      },
    });

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error: any) {
    console.error("Candidate Document Signing Error:", error);
    return NextResponse.json({ error: error.message || "Failed to sign document." }, { status: 500 });
  }
}
