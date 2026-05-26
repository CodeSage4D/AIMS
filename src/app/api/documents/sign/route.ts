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

    const updatedDoc = await db.generatedDocument.update({
      where: { id: documentId },
      data: {
        content: updatedContent as any,
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
