import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await props.params;

    if (!docId) {
      return NextResponse.json(
        { error: "Missing document or certificate verification identifier." },
        { status: 400 }
      );
    }

    // 1. Search in GeneratedDocument table (e.g., Offer Letter, NDA, Onboarding Agreements)
    const document = await db.generatedDocument.findFirst({
      where: {
        OR: [
          { id: docId },
          { verificationHash: docId }
        ]
      },
      include: {
        intern: {
          select: {
            fullName: true,
            internId: true,
            roleDomain: true,
            department: true,
            university: true,
            startDate: true,
          }
        },
        approvedBy: {
          select: {
            fullName: true,
            role: true,
          }
        }
      }
    });

    if (document) {
      return NextResponse.json(
        {
          type: "DOCUMENT",
          docType: document.type,
          status: document.status,
          fullName: document.intern.fullName,
          internId: document.intern.internId,
          roleDomain: document.intern.roleDomain,
          department: document.intern.department,
          startDate: document.intern.startDate,
          signedAt: document.approvedAt || document.createdAt,
          signedBy: document.approvedBy ? `${document.approvedBy.fullName} (${document.approvedBy.role})` : "AIMS System Authority",
          verificationHash: document.verificationHash,
          signatureStamp: document.signature,
        },
        { status: 200 }
      );
    }

    // 2. Search in Certificate table
    const certificate = await db.certificate.findFirst({
      where: {
        OR: [
          { id: docId },
          { certificateId: docId },
          { verificationToken: docId }
        ]
      },
      include: {
        intern: {
          select: {
            internId: true,
            roleDomain: true,
            department: true,
          }
        }
      }
    });

    if (certificate) {
      return NextResponse.json(
        {
          type: "CERTIFICATE",
          docType: certificate.type,
          status: "APPROVED",
          fullName: certificate.holderName,
          internId: certificate.intern?.internId || "AXN-EXT-ALUMNI",
          roleDomain: certificate.intern?.roleDomain || "N/A",
          department: certificate.intern?.department || "N/A",
          startDate: certificate.issueDate,
          signedAt: certificate.issueDate,
          signedBy: "AURXON Executive Board",
          verificationHash: certificate.verificationToken,
          signatureStamp: `Digitally Verified Certificate [${certificate.certificateId}] | Issuer: AURXON Board of Directors`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "No matching verified credentials found on AIMS server." },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Verification API lookup error:", error);
    return NextResponse.json(
      { error: "Verification server process failure." },
      { status: 500 }
    );
  }
}
