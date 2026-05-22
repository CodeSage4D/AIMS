import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("id")?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Missing required query parameter: id" },
        { status: 400 }
      );
    }

    // Look up certificate by certificateId OR verificationToken
    const certificate = await db.certificate.findFirst({
      where: {
        OR: [
          { certificateId: { equals: query, mode: "insensitive" } },
          { verificationToken: { equals: query, mode: "insensitive" } },
        ],
      },
      include: {
        intern: {
          select: {
            internId: true,
            department: true,
            roleDomain: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { valid: false, error: "Certificate not found or invalid authenticity token." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      certificateId: certificate.certificateId,
      verificationToken: certificate.verificationToken,
      holderName: certificate.holderName,
      type: certificate.type,
      issueDate: certificate.issueDate,
      internDetails: certificate.intern ? {
        internId: certificate.intern.internId,
        department: certificate.intern.department,
        roleDomain: certificate.intern.roleDomain,
      } : null,
    });
  } catch (error: any) {
    console.error("Certificate lookup API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during verification." },
      { status: 500 }
    );
  }
}
