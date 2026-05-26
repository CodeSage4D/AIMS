import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import {
  generateOfferLetterDraft,
  generateNDADraft,
  generateIDCardDraft,
  generateExperienceLetterDraft,
  generateAgreementDraft,
} from "@/lib/documentTemplates";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const body = await req.json();
    const { internId, type, preferredCurrency } = body;

    if (!internId || !type) {
      return NextResponse.json({ error: "Missing parameters: internId and type" }, { status: 400 });
    }

    const intern = await db.intern.findUnique({
      where: { id: internId },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern record not found." }, { status: 404 });
    }

    const isSelf = intern.userId === userId;
    const isHired = intern.status === "ACTIVE" || intern.status === "COMPLETED" || intern.employmentType === "PERMANENT" || intern.employmentType === "CONTRACT";

    if (userRole !== "FOUNDER" && userRole !== "HR" && !(isSelf && isHired)) {
      return NextResponse.json({ error: "Forbidden. Administrative access or hired status required." }, { status: 403 });
    }

    const validTypes = ["OFFER_LETTER", "NDA", "ID_CARD", "EXPERIENCE_LETTER", "AGREEMENT"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    // Check if an APPROVED document already exists of this type
    const existingDoc = await db.generatedDocument.findFirst({
      where: { internId, type },
    });

    if (existingDoc && existingDoc.status === "APPROVED") {
      return NextResponse.json(
          { error: "This document is already APPROVED and digitally signed. Overwriting is locked for compliance." },
          { status: 400 }
      );
    }

    // Determine the preferred currency to use for generation
    let currencyFallback = "INR";
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/aurxon_currency=([^;]+)/);
    if (match) {
      currencyFallback = match[1];
    }
    const finalCurrency = preferredCurrency || currencyFallback || "INR";

    let content: any;
    if (type === "OFFER_LETTER") {
      content = generateOfferLetterDraft(intern, finalCurrency);
    } else if (type === "NDA") {
      content = generateNDADraft(intern);
    } else if (type === "ID_CARD") {
      content = generateIDCardDraft(intern);
    } else if (type === "EXPERIENCE_LETTER") {
      content = generateExperienceLetterDraft(intern);
    } else if (type === "AGREEMENT") {
      content = generateAgreementDraft(intern);
    }

    let resultDoc;
    if (existingDoc) {
      resultDoc = await db.generatedDocument.update({
        where: { id: existingDoc.id },
        data: {
          content: content as any,
          status: "PENDING",
          approvedById: null,
          approvedAt: null,
          signature: null,
          notes: "Re-compiled draft document.",
        },
      });
    } else {
      resultDoc = await db.generatedDocument.create({
        data: {
          internId,
          type,
          content: content as any,
          status: "PENDING",
        },
      });
    }

    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "GENERATE_DRAFT",
        description: `Generated dynamic draft of ${type} for ${intern.fullName}`,
      },
    });

    return NextResponse.json({ success: true, document: resultDoc });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
