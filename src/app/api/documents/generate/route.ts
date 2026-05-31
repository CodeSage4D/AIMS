import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import crypto from "crypto";
import {
  generateInternshipOfferLetter,
  generateInternshipAgreement,
  generateNDA,
  generateIDCardDraft,
  generateExperienceLetter,
  generateCompletionCertificate,
  generateEmployeeOfferLetter,
  generateEmployeeAgreement,
  generateContractOfferLetter,
  generateContractAgreement,
  DEFAULT_COMPENSATION_RULES,
  type CompensationRules,
} from "@/lib/documentTemplates";

// ─────────────────────────────────────────────────────────────────────────────
// Supported document types per employment category
// ─────────────────────────────────────────────────────────────────────────────

const INTERN_TYPES = ["OFFER_LETTER", "NDA", "AGREEMENT", "ID_CARD", "EXPERIENCE_LETTER", "COMPLETION_CERTIFICATE"];
const EMPLOYEE_TYPES = ["EMPLOYEE_OFFER_LETTER", "EMPLOYEE_AGREEMENT", "EMPLOYEE_NDA", "ID_CARD"];
const CONTRACT_TYPES = ["CONTRACT_OFFER_LETTER", "CONTRACT_AGREEMENT", "CONTRACT_NDA", "ID_CARD"];
const ALL_VALID_TYPES = [...new Set([...INTERN_TYPES, ...EMPLOYEE_TYPES, ...CONTRACT_TYPES])];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/documents/generate
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || (session.user as any).fullName || "AURXON Administration";

    const body = await req.json();
    const {
      internId,
      type,
      preferredCurrency,
      annualCTC,
      compensationRulesOverride,
      contractDetails,
    } = body;

    if (!internId || !type) {
      return NextResponse.json({ error: "Missing parameters: internId and type" }, { status: 400 });
    }

    if (!ALL_VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${ALL_VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Fetch intern record ────────────────────────────────────────────────────
    const intern = await db.intern.findUnique({
      where: { id: internId },
      include: { supervisor: { select: { fullName: true } } },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern record not found." }, { status: 404 });
    }

    // ── Access control ────────────────────────────────────────────────────────
    const isSelf = intern.userId === userId;
    const isHired = intern.status === "ACTIVE" || intern.status === "COMPLETED";
    if (userRole !== "FOUNDER" && userRole !== "HR" && userRole !== "SUPER_ADMIN" && !(isSelf && isHired)) {
      return NextResponse.json({ error: "Forbidden. Administrative access required." }, { status: 403 });
    }

    // ── Block overwriting APPROVED documents ──────────────────────────────────
    const existingDoc = await db.generatedDocument.findFirst({
      where: { internId, type },
      orderBy: { version: "desc" },
    });

    if (existingDoc && existingDoc.status === "APPROVED" && existingDoc.lifecycleStatus === "APPROVED") {
      return NextResponse.json(
        { error: "This document is APPROVED and digitally signed. Re-generation is locked for compliance integrity." },
        { status: 400 }
      );
    }

    // ── Resolve preferred currency ─────────────────────────────────────────────
    let finalCurrency = preferredCurrency || "INR";
    try {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/aurxon_currency=([^;]+)/);
      if (match) finalCurrency = match[1];
    } catch { /* ignore */ }

    // ── Load compensation rules from system settings (if applicable) ───────────
    let compensationRules: CompensationRules = DEFAULT_COMPENSATION_RULES;
    if (compensationRulesOverride) {
      compensationRules = { ...DEFAULT_COMPENSATION_RULES, ...compensationRulesOverride };
    } else {
      try {
        const setting = await db.systemSetting.findUnique({ where: { key: "compensation_rules" } });
        if (setting?.value) {
          const parsed = JSON.parse(setting.value);
          compensationRules = { ...DEFAULT_COMPENSATION_RULES, ...parsed };
        }
      } catch { /* use defaults */ }
    }

    // ── Auto-fill founder signatory ────────────────────────────────────────────
    let founderSignatory = userName;
    try {
      const setting = await db.systemSetting.findUnique({ where: { key: "founder_signatory_name" } });
      if (setting?.value) founderSignatory = setting.value;
    } catch { /* fallback to session name */ }

    // ── Calculate next version number ─────────────────────────────────────────
    const nextVersion = existingDoc ? (existingDoc.version || 1) + 1 : 1;

    // ── Generate a placeholder doc ID for the verification block ───────────────
    const docId = existingDoc?.id || crypto.randomUUID();

    // ── Generate document content ─────────────────────────────────────────────
    let content: any;
    const internData = { ...intern, supervisor: intern.supervisor };

    switch (type) {
      case "OFFER_LETTER":
        content = generateInternshipOfferLetter(internData, finalCurrency, docId, nextVersion);
        break;
      case "AGREEMENT":
        content = generateInternshipAgreement(internData, docId, nextVersion);
        break;
      case "NDA":
        content = generateNDA(internData, "INTERN", docId, nextVersion);
        break;
      case "ID_CARD":
        content = generateIDCardDraft(internData);
        break;
      case "EXPERIENCE_LETTER":
        content = generateExperienceLetter(internData, docId, nextVersion);
        break;
      case "COMPLETION_CERTIFICATE": {
        const certId = `AXN-CERT-${new Date().getFullYear()}-${intern.internId.substring(0, 6)}`;
        content = generateCompletionCertificate(internData, certId, docId, nextVersion);
        break;
      }
      case "EMPLOYEE_OFFER_LETTER": {
        const ctc = annualCTC || 600000;
        content = generateEmployeeOfferLetter(internData, ctc, compensationRules, finalCurrency, docId, nextVersion);
        break;
      }
      case "EMPLOYEE_AGREEMENT": {
        const ctc = annualCTC || 600000;
        content = generateEmployeeAgreement(internData, ctc, compensationRules, finalCurrency, docId, nextVersion);
        break;
      }
      case "EMPLOYEE_NDA":
        content = generateNDA(internData, "EMPLOYEE", docId, nextVersion);
        break;
      case "CONTRACT_OFFER_LETTER": {
        const details = contractDetails || {
          projectScope: "As agreed in writing between AURXON and the Contractor.",
          deliverables: ["Deliverable 1 — To be specified", "Deliverable 2 — To be specified"],
          paymentStructure: "FIXED_FEE",
          paymentAmount: "As agreed",
          paymentTerms: "Net 30 days from invoice",
          renewalTerms: "Renewable by mutual written agreement",
          terminationTerms: "14 days written notice by either party",
        };
        content = generateContractOfferLetter(internData, details, finalCurrency, docId, nextVersion);
        break;
      }
      case "CONTRACT_AGREEMENT": {
        const details = contractDetails || {
          projectScope: "As agreed in writing between AURXON and the Contractor.",
          deliverables: ["Deliverable 1 — To be specified"],
          paymentStructure: "FIXED_FEE",
          paymentAmount: "As agreed",
          paymentTerms: "Net 30 days from invoice",
          renewalTerms: "Renewable by mutual written agreement",
          terminationTerms: "14 days written notice by either party",
        };
        content = generateContractAgreement(internData, details, docId, nextVersion);
        break;
      }
      case "CONTRACT_NDA":
        content = generateNDA(internData, "CONTRACT", docId, nextVersion);
        break;
      default:
        return NextResponse.json({ error: `Unsupported document type: ${type}` }, { status: 400 });
    }

    // ── Inject auto-filled founder signatory into content ─────────────────────
    content.founderSignatory = founderSignatory;

    // ── Generate SHA-256 verification hash ────────────────────────────────────
    const salt = process.env.NEXTAUTH_SECRET || "AURXON_SALT_2026";
    const verificationHash = crypto
      .createHash("sha256")
      .update(`${docId}|${internId}|${type}|${Date.now()}|${salt}`)
      .digest("hex");

    // Patch the verification block inside content
    if (content.verification) {
      content.verification.sha256Hash = verificationHash;
      content.verification.documentId = docId;
      content.verification.verificationNumber = `AXN-VRF-${docId.substring(0, 8).toUpperCase()}`;
    }

    // ── Persist document ───────────────────────────────────────────────────────
    let resultDoc: any;
    if (existingDoc) {
      resultDoc = await db.generatedDocument.update({
        where: { id: existingDoc.id },
        data: {
          content: content as any,
          version: nextVersion,
          lifecycleStatus: "DRAFT",
          watermarkStatus: "DRAFT",
          status: "PENDING",
          approvedById: null,
          approvedAt: null,
          signature: null,
          candidateSigned: false,
          founderSigned: false,
          founderSignatory,
          notes: `Re-compiled draft v${nextVersion} generated.`,
          verificationHash,
          fileUrl: null,
          gcsFileId: null,
        },
      });
    } else {
      resultDoc = await db.generatedDocument.create({
        data: {
          internId,
          type,
          content: content as any,
          version: 1,
          lifecycleStatus: "DRAFT",
          watermarkStatus: "DRAFT",
          status: "PENDING",
          founderSignatory,
          verificationHash,
        },
      });
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "GENERATE_DRAFT",
        description: `Generated ${type} (v${nextVersion}) for ${intern.fullName}. Lifecycle: DRAFT. Watermark: DRAFT.`,
      },
    });

    return NextResponse.json({ success: true, document: resultDoc });
  } catch (error: any) {
    console.error("[GENERATE DOCUMENT ERROR]", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
