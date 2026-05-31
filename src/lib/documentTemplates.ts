/**
 * Dynamic Document Template Generators for AURXON AIMS
 * Automatically compiles professional, modern, enterprise-grade templates and calculations
 * for Internship, Permanent Employment, and Contractor documents.
 */

import crypto from "crypto";

export interface CompensationDetails {
  ctc: number;
  basic: number;
  hra: number;
  ta: number;
  pf: number;
  specialAllowance: number;
  ctcMonthly: number;
  basicMonthly: number;
  hraMonthly: number;
  taMonthly: number;
  pfMonthly: number;
  specialAllowanceMonthly: number;
}

export interface VerificationMetadata {
  documentId: string;
  verificationSerial: string;
  sha256Hash: string;
  verificationUrl: string;
  qrPlaceholder: string;
  watermarkText: string;
}

export interface OfferLetterContent {
  title: string;
  companyName: string;
  salutation: string;
  introduction: string;
  role: string;
  department: string;
  startDate: string;
  endDate: string;
  stipendOrCompensation: string;
  compensationBreakdown?: CompensationDetails;
  terms: string[];
  closing: string;
  verification: VerificationMetadata;
  signatory: {
    name: string;
    title: string;
    date: string;
  };
}

export interface NDAContent {
  title: string;
  companyName: string;
  partyA: string; // Company
  partyB: string; // Recipient
  effectiveDate: string;
  clauses: { title: string; text: string }[];
  governingLaw: string;
  verification: VerificationMetadata;
  signatory: {
    name: string;
    title: string;
    date: string;
  };
}

export interface IDCardContent {
  companyName: string;
  fullName: string;
  internId: string;
  role: string;
  department: string;
  joiningDate: string;
  validUntil: string;
  avatarUrl: string;
  barcode: string;
  verification: VerificationMetadata;
}

export interface ExperienceLetterContent {
  title: string;
  companyName: string;
  salutation: string;
  body: string;
  department: string;
  role: string;
  startDate: string;
  endDate: string;
  performanceNotes: string;
  closing: string;
  verification: VerificationMetadata;
  signatory: {
    name: string;
    title: string;
    date: string;
  };
}

export interface AgreementContent {
  title: string;
  companyName: string;
  partyA: string;
  partyB: string;
  effectiveDate: string;
  terms: string[];
  closing: string;
  verification: VerificationMetadata;
  signatory: {
    name: string;
    title: string;
    date: string;
  };
}

/**
 * Robust salary calculator with configurable structures.
 * Basic Pay: 50%
 * HRA: 40% of Basic (20% of CTC)
 * Conveyance/TA: 10%
 * Statutory PF (Employer): 12% of Basic (6% of CTC)
 * Special Allowance: Residual 14% of CTC
 */
export function calculateCompensation(
  totalCTC: number,
  config: {
    basicPct?: number;
    hraPctOfBasic?: number;
    taPct?: number;
    pfPctOfBasic?: number;
  } = {}
): CompensationDetails {
  const basicPct = config.basicPct ?? 0.50;
  const hraPctOfBasic = config.hraPctOfBasic ?? 0.40;
  const taPct = config.taPct ?? 0.10;
  const pfPctOfBasic = config.pfPctOfBasic ?? 0.12;

  const ctc = Number(totalCTC);
  const basic = ctc * basicPct;
  const hra = basic * hraPctOfBasic;
  const ta = ctc * taPct;
  const pf = basic * pfPctOfBasic;
  const specialAllowance = Math.max(0, ctc - (basic + hra + ta + pf));

  return {
    ctc,
    basic,
    hra,
    ta,
    pf,
    specialAllowance,
    ctcMonthly: ctc / 12,
    basicMonthly: basic / 12,
    hraMonthly: hra / 12,
    taMonthly: ta / 12,
    pfMonthly: pf / 12,
    specialAllowanceMonthly: specialAllowance / 12,
  };
}

/**
 * Generate cryptographic SHA-256 verification hash of document attributes
 */
function createVerificationHash(documentId: string, internId: string, type: string, secret = "AURXON_VERIFY_2026"): string {
  return crypto
    .createHash("sha256")
    .update(`${documentId}-${internId}-${type}-${secret}`)
    .digest("hex");
}

/**
 * Compile general verification metadata block
 */
function buildVerificationMetadata(
  documentId: string,
  internId: string,
  type: string,
  status: string = "DRAFT"
): VerificationMetadata {
  const sha256Hash = createVerificationHash(documentId, internId, type);
  // Remove any SHA-1 references; use custom sequential formatted serial
  const cleanTypeAbbrev = type.replace("_", "").substring(0, 3).toUpperCase();
  const serialSuffix = documentId.split("-")[0].toUpperCase();
  const verificationSerial = `AXN-${cleanTypeAbbrev}-2026-${serialSuffix}`;
  
  const verificationUrl = `${process.env.NEXTAUTH_URL || "https://aims.aurxon.com"}/verify/${documentId}`;
  
  // Custom draft watermark indicator
  const watermarkText = status === "APPROVED" ? "AURXON OFFICIAL COMPLIANCE DOCUMENT" : "AURXON DRAFT ONLY";

  return {
    documentId,
    verificationSerial,
    sha256Hash,
    verificationUrl,
    qrPlaceholder: `[SCAN_QR_AXN_VERIFY_${verificationSerial}]`,
    watermarkText,
  };
}

/**
 * Auto-fills founder signatory details based on role and signature date.
 */
export function buildSignatoryBlock(docStatus: string, signatureText?: string | null): { name: string; title: string; date: string } {
  if (docStatus === "APPROVED" && signatureText) {
    // Extract info if stored in signature Stamp
    // Format is: "Digitally Signed by FOUNDER [Karan Verma] | HASH: AXN-SIG-ABC | DATE: 05/31/2026"
    const nameMatch = signatureText.match(/\[(.*?)\]/);
    const dateMatch = signatureText.match(/DATE: (.*?)$/);
    const roleMatch = signatureText.match(/Signed by (.*?) \[/);

    return {
      name: nameMatch ? nameMatch[1] : "Karan Verma",
      title: roleMatch ? `AURXON Authorized ${roleMatch[1]}` : "AURXON Authorized Representative",
      date: dateMatch ? dateMatch[1] : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    };
  }

  // Default default fallback for drafts
  return {
    name: "Karan Verma",
    title: "Founder & Chief Architect, AURXON",
    date: "Awaiting Electronic Execution",
  };
}

/**
 * Generates custom dynamic sequential version numbers for file compliance tracking.
 */
export function getDocumentVersion(existingDoc?: any): number {
  if (existingDoc && typeof existingDoc.content === "object" && existingDoc.content !== null) {
    const prevVersion = (existingDoc.content as any).documentVersion || 1;
    return prevVersion + 1;
  }
  return 1;
}

/**
 * DRAFT OFFER LETTER TEMPLATE GENERATOR
 */
export function generateOfferLetterDraft(
  intern: {
    id: string;
    fullName: string;
    internId: string;
    roleDomain: string;
    department: string;
    startDate: Date | string;
    endDate?: Date | string | null;
    stipendAmount?: number | any;
    employmentType?: string | any;
  },
  preferredCurrency: string = "INR",
  existingDoc?: any
): OfferLetterContent {
  const documentId = existingDoc?.id || crypto.randomUUID();
  const documentVersion = getDocumentVersion(existingDoc);
  const status = existingDoc?.status || "DRAFT";
  const verification = buildVerificationMetadata(documentId, intern.internId || intern.id, "OFFER_LETTER", status);
  const signatory = buildSignatoryBlock(status, existingDoc?.signature);

  const formattedStart = new Date(intern.startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const empType = intern.employmentType || "INTERN";
  const rawStipend = intern.stipendAmount ? Number(intern.stipendAmount) : 0;
  
  // Smart dynamic monthly vs annual converter (threshold: 120,000)
  const isAnnual = rawStipend > 120000;
  const annualCTC = isAnnual ? rawStipend : rawStipend * 12;
  const monthlyCTC = isAnnual ? rawStipend / 12 : rawStipend;

  let stipendOrCompensation = "Unpaid (Educational Training)";
  let compensationBreakdown: CompensationDetails | undefined = undefined;

  if (rawStipend > 0) {
    const symbol = preferredCurrency === "USD" ? "$" : "₹";
    const amountFormatted = new Intl.NumberFormat(preferredCurrency === "USD" ? "en-US" : "en-IN", {
      style: "currency",
      currency: preferredCurrency,
      maximumFractionDigits: 0,
    }).format(monthlyCTC);
    
    stipendOrCompensation = `${amountFormatted}/month`;

    if (empType === "PERMANENT") {
      compensationBreakdown = calculateCompensation(annualCTC);
      const annualFormatted = new Intl.NumberFormat(preferredCurrency === "USD" ? "en-US" : "en-IN", {
        style: "currency",
        currency: preferredCurrency,
        maximumFractionDigits: 0,
      }).format(annualCTC);
      stipendOrCompensation = `${amountFormatted}/month (${annualFormatted} Annual CTC)`;
    }
  }

  let salutation = `Dear ${intern.fullName},`;
  let title = "OFFICIAL LETTER OF INTERNSHIP OFFER";
  let introduction = `We are pleased to offer you an internship position with AURXON. Based on your impressive interview performance and academic records, we are confident you will make a valuable addition to our engineering organization.`;
  let closing = "We look forward to having you onboard and witnessing your development. Welcome to AURXON!";
  
  let terms: string[] = [];

  if (empType === "PERMANENT") {
    title = "OFFICIAL LETTER OF EMPLOYMENT OFFER";
    introduction = `On behalf of AURXON, we are thrilled to offer you a permanent position as a ${intern.roleDomain} within our ${intern.department} Division. We were extremely impressed by your experience, values, and dedication to high-quality operations.`;
    terms = [
      "Role & Duty Scope: You will serve in the capacity of a full-time employee, reporting to your designated supervisor or management lead.",
      "Probation Period: You will undergo a standard probation period of three (3) months starting from your Date of Joining.",
      "Notice Period: Either party may terminate this employment relationship by providing forty-five (45) days of prior written notice.",
      "Hours of Work: Our standard office operational framework consists of forty (40) hours per week, remote or hybrid as scheduled.",
      "Confidentiality & Security: You must strictly protect all database access keys, technical schemas, passwords, and source code of AURXON.",
      "Intellectual Property Rights: All software modules, codes, queries, and technical docs designed during your service belong exclusively to AURXON."
    ];
  } else if (empType === "CONTRACT") {
    title = "OFFICIAL CONTRACT SERVICE ENGAGEMENT OFFER";
    introduction = `We are pleased to present this Contract of Service Offer to engage you as an Independent Contractor for ${intern.roleDomain} services in the ${intern.department} Division at AURXON.`;
    terms = [
      "Contract Duration: This service window is bounded to the project scope and deliverables outlined in your specific project timeline.",
      "Deliverables & Project Scope: You will execute the deliverables specified by your Project Director within agreed deadlines.",
      "Payment Terms: Disbursements are processed in accordance with the signed service agreement (Fixed-Fee, monthly, or milestone based).",
      "Notice Period: This contract may be terminated by either party with fifteen (15) days of prior written notice.",
      "Intellectual Property: Any system modifications, libraries, integrations, or documentation built remain the exclusive property of AURXON.",
      "Confidentiality: Strict absolute protection of server nodes, database structures, customer identifiers, and administrative API credentials."
    ];
  } else {
    // INTERNSHIP (Paid/Unpaid)
    const formattedEnd = intern.endDate
      ? new Date(intern.endDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "Completion of Assigned Training Curriculum";

    terms = [
      `Learning Objectives: You will receive structured training in ${intern.roleDomain} methodologies, database engineering, and corporate software systems.`,
      `Internship Duration: This training engagement commences on ${formattedStart} and is scheduled to conclude on ${formattedEnd}.`,
      "Expected Responsibilities: You are expected to dedicate active learning hours to assignments, participate in sync calls, and submit daily work logs.",
      "No Permanent Relationship: This program is educational and does not constitute a promise of permanent employment unless officially offered.",
      "Confidentiality & Access: You are prohibited from sharing, exporting, or leaking any AURXON operational details or internal schemas.",
      "Intellectual Property Ownership: All code elements, patches, database queries, and designs generated remain the sole property of AURXON."
    ];
    if (rawStipend > 0) {
      terms.push(`Stipend Disbursement: Stipend is paid on a monthly frequency subject to positive performance and active daily work logs.`);
    } else {
      terms.push("Educational Nature: This is a highly intensive unpaid training program focused strictly on hands-on skill development.");
    }
  }

  return {
    title,
    companyName: "AURXON",
    salutation,
    introduction,
    role: intern.roleDomain,
    department: intern.department,
    startDate: formattedStart,
    endDate: intern.endDate ? new Date(intern.endDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A",
    stipendOrCompensation,
    compensationBreakdown,
    terms,
    closing,
    verification,
    signatory,
  };
}

/**
 * DRAFT MUTUAL NDA TEMPLATE GENERATOR
 */
export function generateNDADraft(
  intern: {
    fullName: string;
    startDate: Date | string;
    roleDomain: string;
    employmentType?: string | any;
    internId: string;
    id: string;
  },
  existingDoc?: any
): NDAContent {
  const documentId = existingDoc?.id || crypto.randomUUID();
  const documentVersion = getDocumentVersion(existingDoc);
  const status = existingDoc?.status || "DRAFT";
  const verification = buildVerificationMetadata(documentId, intern.internId || intern.id, "NDA", status);
  const signatory = buildSignatoryBlock(status, existingDoc?.signature);

  const formattedDate = new Date(intern.startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const empType = intern.employmentType || "INTERN";

  let title = "MUTUAL NON-DISCLOSURE & PROPRIETARY RIGHTS AGREEMENT";
  if (empType === "PERMANENT") title = "EMPLOYEE MUTUAL NON-DISCLOSURE AGREEMENT";
  if (empType === "CONTRACT") title = "CONTRACTOR NON-DISCLOSURE & INTELLECTUAL PROPERTY DEED";

  const clauses = [
    {
      title: "1. Definition of Confidential Information",
      text: "Confidential Information refers to any proprietary database records, system schemas, client source codes, API credentials, server assets, credentials, business strategies, and technical infrastructure designs owned or managed by AURXON."
    },
    {
      title: "2. Absolute Non-Disclosure Obligations",
      text: "The Recipient agrees to hold all confidential information in strict confidence and shall not share, screenshot, export, distribute, or leak any materials to any third party without express written consent from the Founder."
    },
    {
      title: "3. Ownership of Work Products & IP",
      text: "All ideas, technical modules, software patches, custom components, database queries, and designs conceived or developed during the service window remain exclusively and permanently the intellectual property of AURXON."
    },
    {
      title: "4. Compliance & Legal Damages",
      text: "Any breach of security, illegal data modifications, or sharing of passwords will trigger immediate termination of services, revocation of certificates, and legal action under governing intellectual property and cyber-crime acts."
    }
  ];

  return {
    title,
    companyName: "AURXON",
    partyA: "AURXON",
    partyB: intern.fullName,
    effectiveDate: formattedDate,
    clauses,
    governingLaw: "State and Federal Laws of India, subject to Bangalore Jurisdiction.",
    verification,
    signatory,
  };
}

/**
 * DRAFT ID CARD TEMPLATE GENERATOR
 */
export function generateIDCardDraft(
  intern: {
    fullName: string;
    internId: string;
    roleDomain: string;
    department: string;
    startDate: Date | string;
    endDate?: Date | string | null;
    id: string;
  },
  existingDoc?: any
): IDCardContent {
  const documentId = existingDoc?.id || crypto.randomUUID();
  const status = existingDoc?.status || "DRAFT";
  const verification = buildVerificationMetadata(documentId, intern.internId || intern.id, "ID_CARD", status);

  const formattedStart = new Date(intern.startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const formattedEnd = intern.endDate
    ? new Date(intern.endDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "PERMANENT";

  return {
    companyName: "AURXON",
    fullName: intern.fullName,
    internId: intern.internId,
    role: intern.roleDomain,
    department: intern.department,
    joiningDate: formattedStart,
    validUntil: formattedEnd,
    avatarUrl: "", 
    barcode: `*${intern.internId}*`,
    verification,
  };
}

/**
 * DRAFT EXPERIENCE LETTER / COMPLETION TEMPLATE GENERATOR
 */
export function generateExperienceLetterDraft(
  intern: {
    fullName: string;
    roleDomain: string;
    department: string;
    startDate: Date | string;
    endDate?: Date | string | null;
    performanceNotes?: string | null;
    employmentType?: string | any;
    internId: string;
    id: string;
  },
  existingDoc?: any
): ExperienceLetterContent {
  const documentId = existingDoc?.id || crypto.randomUUID();
  const documentVersion = getDocumentVersion(existingDoc);
  const status = existingDoc?.status || "DRAFT";
  const verification = buildVerificationMetadata(documentId, intern.internId || intern.id, "EXPERIENCE_LETTER", status);
  const signatory = buildSignatoryBlock(status, existingDoc?.signature);

  const formattedStart = new Date(intern.startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedEnd = intern.endDate
    ? new Date(intern.endDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const empType = intern.employmentType || "INTERN";
  const perfNotes = intern.performanceNotes || "exhibited high technical aptitude, active learning ability, and positive team spirit throughout the program.";

  let title = "CERTIFICATE OF WORK EXPERIENCE & COMPLETION";
  let body = `This is to certify that ${intern.fullName} has successfully completed their training and work engagement at AURXON. During their tenure, they worked actively within our core engineering and operations departments.`;
  
  if (empType === "PERMANENT") {
    title = "OFFICIAL EMPLOYEE EXPERIENCE CERTIFICATE";
    body = `This experience certificate confirms that ${intern.fullName} was employed as a permanent ${intern.roleDomain} in the ${intern.department} Division at AURXON from ${formattedStart} to ${formattedEnd}.`;
  } else if (empType === "CONTRACT") {
    title = "CONTRACT SERVICE COMPLETION CERTIFICATE";
    body = `This is to certify that ${intern.fullName} has successfully completed their independent contract service term with AURXON as a ${intern.roleDomain} from ${formattedStart} to ${formattedEnd}.`;
  }

  return {
    title,
    companyName: "AURXON",
    salutation: "TO WHOMSOEVER IT MAY CONCERN",
    body,
    role: intern.roleDomain,
    department: intern.department,
    startDate: formattedStart,
    endDate: formattedEnd,
    performanceNotes: `During their engagement, ${intern.fullName} ${perfNotes}`,
    closing: "We wish them the absolute best in their future endeavors and academic pursuits.",
    verification,
    signatory,
  };
}

/**
 * DRAFT COMPLIANCE AGREEMENT TEMPLATE GENERATOR
 */
export function generateAgreementDraft(
  intern: {
    fullName: string;
    startDate: Date | string;
    roleDomain: string;
    department: string;
    employmentType?: string | any;
    stipendAmount?: number | any;
    internId: string;
    id: string;
  },
  existingDoc?: any
): AgreementContent {
  const documentId = existingDoc?.id || crypto.randomUUID();
  const documentVersion = getDocumentVersion(existingDoc);
  const status = existingDoc?.status || "DRAFT";
  const verification = buildVerificationMetadata(documentId, intern.internId || intern.id, "AGREEMENT", status);
  const signatory = buildSignatoryBlock(status, existingDoc?.signature);

  const formattedDate = new Date(intern.startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const empType = intern.employmentType || "INTERN";
  const rawStipend = intern.stipendAmount ? Number(intern.stipendAmount) : 0;

  let title = "OFFICIAL INTERNSHIP AGREEMENT & ENGAGEMENT POLICY";
  let terms: string[] = [];

  if (empType === "PERMANENT") {
    title = "OFFICIAL ENTERPRISE EMPLOYMENT AGREEMENT";
    terms = [
      `Employment Appointment: The Employee is officially designated as a ${intern.roleDomain} within the ${intern.department} Division.`,
      "Work Standards & Conduct: The Employee agrees to participate in system architecture discussions, maintain robust coding standards, and report daily progress.",
      "Security Protocols: Strict adherence to data security guidelines, including the non-disclosure of backend databases, customer schemas, or local passwords.",
      "IP Ownership: All inventions, code scripts, software modules, and technical specifications designed remain the permanent, exclusive property of AURXON.",
      "Termination & Resolution: Termination clauses are governed by standard office policy with dispute resolution subject to Bangalore jurisdiction."
    ];
  } else if (empType === "CONTRACT") {
    title = "INDEPENDENT CONTRACTOR SERVICE AGREEMENT";
    terms = [
      `Independent Contractor Appointment: The Contractor is engaged to deliver ${intern.roleDomain} expertise inside the ${intern.department} department.`,
      "Project Deliverables: The Contractor agrees to complete all project milestones, code deliverables, and API integrations as assigned.",
      "Payment Disbursements: Compensation will be disbursed based on the selected payment structure upon verified milestone approvals.",
      "IP Transfer: The Contractor hereby assigns all rights, titles, and interests in any work products created for AURXON exclusively to the company.",
      "Termination Terms: Either party may terminate this contractor agreement upon fifteen (15) days of prior written compliance notice."
    ];
  } else {
    // INTERNSHIP
    terms = [
      `Engagement Scope: The Intern is appointed as a ${intern.roleDomain} within the ${intern.department} Division.`,
      "Code of Conduct: The Intern agrees to participate in sync calls, maintain active coding hours, and submit contribution records regularly.",
      "Regulatory Compliance: The Intern agrees to strictly follow data access controls, and avoid leaking technical database structures.",
      "IP Ownership: All codes, designs, database schemas, and documentation created remain the sole intellectual property of AURXON.",
      "Termination Policy: Either party may terminate this agreement with 3 days prior written notice."
    ];
    if (rawStipend === 0) {
      terms.push("Educational Intent: The Intern acknowledges that this program is purely for learning and no employment relationship is created.");
    }
  }

  return {
    title,
    companyName: "AURXON",
    partyA: "AURXON",
    partyB: intern.fullName,
    effectiveDate: formattedDate,
    terms,
    closing: "By signing below, both parties agree to the corporate rules and terms specified in this document.",
    verification,
    signatory,
  };
}
