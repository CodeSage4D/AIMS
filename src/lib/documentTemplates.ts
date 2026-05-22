/**
 * Dynamic Document Template Generators for AURXON AIMS
 * Defines rich, corporate structured default schemas for Offer Letters, NDAs, and ID Cards.
 */

export interface OfferLetterContent {
  title: string;
  companyName: string;
  salutation: string;
  introduction: string;
  role: string;
  department: string;
  startDate: string;
  endDate: string;
  stipend: string;
  terms: string[];
  closing: string;
}

export interface NDAContent {
  title: string;
  partyA: string; // Company
  partyB: string; // Intern/Employee
  effectiveDate: string;
  clauses: { title: string; text: string }[];
  governingLaw: string;
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
}

export function generateOfferLetterDraft(intern: {
  fullName: string;
  internId: string;
  roleDomain: string;
  department: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  stipendAmount?: number | any;
}): OfferLetterContent {
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
    : "Completion of Training";

  const stipendVal = intern.stipendAmount ? Number(intern.stipendAmount) : 0;
  const stipendText = stipendVal > 0 ? `INR ${stipendVal.toLocaleString()}/month` : "Unpaid (Training)";

  return {
    title: "OFFICIAL LETTER OF INTERNSHIP OFFER",
    companyName: "AURXON DB & SOFTWARE SYSTEMS",
    salutation: `Dear ${intern.fullName},`,
    introduction: `We are pleased to offer you an internship position with AURXON DB & Software Systems. Based on your impressive interview performance and academic records, we are confident you will make a valuable addition to our engineering organization.`,
    role: intern.roleDomain,
    department: intern.department,
    startDate: formattedStart,
    endDate: formattedEnd,
    stipend: stipendText,
    terms: [
      "Position Scope: You will serve in the capacity of an engineering intern, reporting to your designated project lead or supervisor.",
      "Work Commitment: You are expected to dedicate full-time active hours to your assigned projects, adhering strictly to our code quality standards.",
      "Confidentiality: You must not disclose any intellectual property, database schemas, or customer records of AURXON systems to external parties.",
      "Intellectual Property: Any code, artifacts, databases, or documentation built by you during this engagement remains the sole property of AURXON.",
      "Termination Guard: The company reserves the right to terminate this agreement at any time with 3 days prior notice in case of performance or compliance failure."
    ],
    closing: "We look forward to having you onboard and witnessing your development. Welcome to AURXON!",
  };
}

export function generateNDADraft(intern: {
  fullName: string;
  startDate: Date | string;
}): NDAContent {
  const formattedDate = new Date(intern.startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    title: "MUTUAL NON-DISCLOSURE & PROPRIETARY RIGHTS AGREEMENT",
    partyA: "AURXON DB & SOFTWARE SYSTEMS INC.",
    partyB: intern.fullName,
    effectiveDate: formattedDate,
    clauses: [
      {
        title: "1. Definition of Confidential Information",
        text: "Confidential Information refers to any proprietary database records, system schemas, client source codes, API credentials, server assets, and technical infrastructure designs owned or managed by AURXON DB."
      },
      {
        title: "2. Absolute Non-Disclosure Obligations",
        text: "The Recipient (Intern/Employee) agrees to hold all confidential information in strict confidence and shall not share, screenshot, export, distribute, or leak any materials to any third party without express written consent from the Founder."
      },
      {
        title: "3. Ownership of Work Products & IP",
        text: "All ideas, technical modules, software patches, custom components, database queries, and designs conceived or developed during the service window remain exclusively and permanently the intellectual property of AURXON."
      },
      {
        title: "4. Compliance & Legal Damages",
        text: "Any breach of security, illegal data modifications, or sharing of passwords will trigger immediate termination of services, revocation of certificates, and legal action under governing intellectual property and cyber-crime acts."
      }
    ],
    governingLaw: "State and Federal Laws of India, subject to Bangalore Jurisdiction.",
  };
}

export function generateIDCardDraft(intern: {
  fullName: string;
  internId: string;
  roleDomain: string;
  department: string;
  startDate: Date | string;
  endDate?: Date | string | null;
}): IDCardContent {
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
    avatarUrl: "", // Defaults to custom dynamic SVG initials or uploaded photo
    barcode: `*${intern.internId}*`,
  };
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
}

export function generateExperienceLetterDraft(intern: {
  fullName: string;
  roleDomain: string;
  department: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  performanceNotes?: string | null;
}): ExperienceLetterContent {
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

  const perfNotes = intern.performanceNotes || "demonstrated high technical aptitude, active learning ability, and positive team spirit throughout the program.";

  return {
    title: "CERTIFICATE OF WORK EXPERIENCE & COMPLETION",
    companyName: "AURXON DB & SOFTWARE SYSTEMS",
    salutation: "TO WHOMSOEVER IT MAY CONCERN",
    body: `This is to certify that ${intern.fullName} has successfully completed their training and work engagement at AURXON DB & Software Systems. During their tenure, they worked actively within our core engineering and operations departments.`,
    role: intern.roleDomain,
    department: intern.department,
    startDate: formattedStart,
    endDate: formattedEnd,
    performanceNotes: `During their engagement, ${intern.fullName} ${perfNotes}`,
    closing: "We wish them the absolute best in their future endeavors and academic pursuits.",
  };
}

