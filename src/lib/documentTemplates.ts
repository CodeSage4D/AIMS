/**
 * AURXON AIMS — Master Employment Document Template Engine
 * Generates all 9 corporate document types for Interns, Employees, and Contractors.
 *
 * Branding Rule: Company name is "AURXON" exclusively.
 * Verification: SHA-256 only. No SHA-1.
 * Lifecycle: DRAFT → PENDING_REVIEW → APPROVED (with OFFICIAL watermark)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SignatureBlock {
  candidateSignature?: string;
  candidateSignedAt?: string;
  candidateSignatureStamp?: string;
  founderSignature?: string;
  founderSignedAt?: string;
  founderSignatureStamp?: string;
  founderSignatory?: string; // Auto-filled founder name
}

export interface DigitalVerification {
  documentId: string;
  verificationNumber: string;   // AXN-VRF-XXXX format
  sha256Hash: string;           // SHA-256 of document identity fields
  verificationUrl: string;      // /verify/[docId]
  qrPlaceholder: string;        // "QR_VERIFY_<documentId>"
  watermark: "DRAFT" | "PENDING" | "OFFICIAL"; // Promoted on double-sign
  version: number;
  lifecycleStatus: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compensation Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface CompensationRules {
  basicPercent: number;        // % of Annual CTC — default 50
  hraPercent: number;          // % of Basic — default 40
  taPercent: number;           // % of CTC — default 10
  performanceAllowanceFlat?: number; // Optional flat monthly amount
  pfApplicable: boolean;       // Whether PF (12% of Basic) applies
}

export const DEFAULT_COMPENSATION_RULES: CompensationRules = {
  basicPercent: 50,
  hraPercent: 40,
  taPercent: 10,
  pfApplicable: true,
};

export interface CompensationBreakdown {
  annualCTC: number;
  monthly: {
    basic: number;
    hra: number;
    ta: number;
    specialAllowance: number;
    performanceAllowance: number;
    grossSalary: number;
    pfDeduction: number; // Employee side
    netTakeHome: number;
  };
  annual: {
    basic: number;
    hra: number;
    ta: number;
    specialAllowance: number;
    performanceAllowance: number;
    grossSalary: number;
    pfDeduction: number;
    netTakeHome: number;
    employerPF: number;
    totalCTC: number;
  };
  currency: string;
}

export function calculateCompensation(
  annualCTC: number,
  rules: CompensationRules = DEFAULT_COMPENSATION_RULES,
  currency: string = "INR"
): CompensationBreakdown {
  const basic = Math.round((annualCTC * rules.basicPercent) / 100);
  const hra = Math.round((basic * rules.hraPercent) / 100);
  const ta = Math.round((annualCTC * rules.taPercent) / 100);
  const perfAnnual = (rules.performanceAllowanceFlat || 0) * 12;
  const pfAnnual = rules.pfApplicable ? Math.round(basic * 0.12) : 0;
  const employerPF = pfAnnual;
  const specialAllowance = Math.max(0, annualCTC - basic - hra - ta - perfAnnual);
  const grossAnnual = basic + hra + ta + specialAllowance + perfAnnual;
  const netAnnual = grossAnnual - pfAnnual;

  const div12 = (n: number) => Math.round(n / 12);

  return {
    annualCTC,
    currency,
    monthly: {
      basic: div12(basic),
      hra: div12(hra),
      ta: div12(ta),
      specialAllowance: div12(specialAllowance),
      performanceAllowance: rules.performanceAllowanceFlat || 0,
      grossSalary: div12(grossAnnual),
      pfDeduction: div12(pfAnnual),
      netTakeHome: div12(netAnnual),
    },
    annual: {
      basic,
      hra,
      ta,
      specialAllowance,
      performanceAllowance: perfAnnual,
      grossSalary: grossAnnual,
      pfDeduction: pfAnnual,
      netTakeHome: netAnnual,
      employerPF,
      totalCTC: annualCTC,
    },
  };
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(Math.round(amount / 83));
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate Information Block
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateInfo {
  fullName: string;
  employeeId: string;        // Intern ID, Employee ID, or Contract ID
  designation: string;
  department: string;
  email: string;
  phone: string;
  address: string;
  joiningDate: string;
  employmentType: "INTERN" | "PERMANENT" | "CONTRACT";
  reportingManager?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Content Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseDocumentContent {
  // Header
  companyName: "AURXON";
  documentTitle: string;
  referenceNumber: string;
  issueDate: string;
  // Candidate block
  candidate: CandidateInfo;
  // Digital verification
  verification: DigitalVerification;
  // Signatures
  signatures: SignatureBlock;
}

export interface InternshipOfferLetterContent extends BaseDocumentContent {
  internType: "PAID" | "UNPAID";
  startDate: string;
  endDate: string;
  duration: string;
  stipend: string;
  learningObjectives: string[];
  responsibilities: string[];
  reportingManager: string;
  performanceExpectations: string;
  codeOfConduct: string[];
  termsAndConditions: string[];
  closing: string;
}

export interface InternshipAgreementContent extends BaseDocumentContent {
  internType: "PAID" | "UNPAID";
  startDate: string;
  endDate: string;
  workingHours: string;
  reportingManager: string;
  terms: string[];
  confidentialityClause: string;
  ipClause: string;
  completionConditions: string[];
  terminationClause: string;
  closing: string;
}

export interface NDAContent extends BaseDocumentContent {
  effectiveDate: string;
  partyA: string;
  partyB: string;
  clauses: { title: string; text: string }[];
  governingLaw: string;
  duration: string;
}

export interface EmployeeOfferLetterContent extends BaseDocumentContent {
  designation: string;
  department: string;
  reportingManager: string;
  dateOfJoining: string;
  probationPeriod: string;
  noticePeriod: string;
  workingHours: string;
  leaveStructure: string;
  compensation: CompensationBreakdown;
  termsAndConditions: string[];
  closing: string;
}

export interface EmployeeAgreementContent extends BaseDocumentContent {
  designation: string;
  reportingManager: string;
  dateOfJoining: string;
  employmentType: string;
  probationPeriod: string;
  noticePeriod: string;
  workingHours: string;
  leaveStructure: string;
  compensation: CompensationBreakdown;
  terms: string[];
  closing: string;
}

export interface ContractOfferLetterContent extends BaseDocumentContent {
  contractDuration: string;
  startDate: string;
  endDate: string;
  projectScope: string;
  deliverables: string[];
  paymentStructure: "FIXED_FEE" | "MONTHLY" | "MILESTONE" | "PROJECT_BASED";
  paymentAmount: string;
  paymentTerms: string;
  renewalTerms: string;
  terminationTerms: string;
  termsAndConditions: string[];
  closing: string;
}

export interface ContractAgreementContent extends BaseDocumentContent {
  contractDuration: string;
  startDate: string;
  endDate: string;
  projectScope: string;
  deliverables: string[];
  paymentStructure: "FIXED_FEE" | "MONTHLY" | "MILESTONE" | "PROJECT_BASED";
  paymentAmount: string;
  paymentTerms: string;
  renewalTerms: string;
  terminationTerms: string;
  ipOwnership: string;
  confidentiality: string;
  disputeResolution: string;
  closing: string;
}

export interface IDCardContent {
  companyName: "AURXON";
  fullName: string;
  internId: string;
  role: string;
  department: string;
  joiningDate: string;
  validUntil: string;
  avatarUrl: string;
  barcode: string;
}

export interface ExperienceLetterContent extends BaseDocumentContent {
  role: string;
  startDate: string;
  endDate: string;
  performanceNotes: string;
  body: string;
  closing: string;
}

export interface CompletionCertificateContent extends BaseDocumentContent {
  role: string;
  startDate: string;
  endDate: string;
  performanceNotes: string;
  certificateId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function fmtShort(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}

function buildRefNumber(internId: string, type: string): string {
  const code = type.replace(/_/g, "-").substring(0, 4);
  const year = new Date().getFullYear();
  return `AXN-${code}-${year}-${internId.substring(0, 6).toUpperCase()}`;
}

function buildVerification(docId: string, internId: string, type: string, version: number): DigitalVerification {
  // SHA-256 based verification hash (built server-side in API routes using crypto module)
  // Here we provide a placeholder that gets replaced server-side
  return {
    documentId: docId,
    verificationNumber: `AXN-VRF-${docId.substring(0, 8).toUpperCase()}`,
    sha256Hash: "PENDING_SERVER_HASH", // replaced by crypto.createHash('sha256') in API
    verificationUrl: `https://aims.aurxon.com/verify/${docId}`,
    qrPlaceholder: `QR_VERIFY_${docId}`,
    watermark: "DRAFT",
    version,
    lifecycleStatus: "DRAFT",
  };
}

function buildCandidateInfo(intern: any): CandidateInfo {
  return {
    fullName: intern.fullName,
    employeeId: intern.internId,
    designation: intern.roleDomain,
    department: intern.department,
    email: intern.email || "",
    phone: intern.phoneNumber || "",
    address: [intern.address, intern.city, intern.state, intern.country].filter(Boolean).join(", "),
    joiningDate: intern.startDate ? fmt(intern.startDate) : fmt(new Date()),
    employmentType: (intern.employmentType as "INTERN" | "PERMANENT" | "CONTRACT") || "INTERN",
    reportingManager: intern.supervisor?.fullName || "Assigned Supervisor",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Internship Offer Letter (Paid & Unpaid)
// ─────────────────────────────────────────────────────────────────────────────

export function generateInternshipOfferLetter(
  intern: any,
  currency: string = "INR",
  docId: string = "draft",
  version: number = 1
): InternshipOfferLetterContent {
  const stipendVal = intern.stipendAmount ? Number(intern.stipendAmount) : 0;
  const isPaid = stipendVal > 0;
  const internType = isPaid ? "PAID" : "UNPAID";

  const stipendText = isPaid
    ? formatCurrency(stipendVal, currency) + "/month"
    : "Unpaid (Training & Development Purpose)";

  const startDate = intern.startDate ? fmt(intern.startDate) : fmt(new Date());
  const endDate = intern.endDate ? fmt(intern.endDate) : "Completion of Training";
  const startRaw = new Date(intern.startDate || new Date());
  const endRaw = intern.endDate ? new Date(intern.endDate) : null;
  const durationMonths = endRaw
    ? Math.max(1, Math.round((endRaw.getTime() - startRaw.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : null;
  const duration = durationMonths ? `${durationMonths} month(s)` : "Flexible Duration";

  const unpaidDisclosure = isPaid
    ? []
    : [
        "Educational Purpose Disclosure: This internship is structured as an educational and training engagement and does not constitute an employment relationship unless separately formalised in writing.",
        "No Compensation: No monetary stipend, salary, or wages shall be paid for this engagement.",
      ];

  return {
    companyName: "AURXON",
    documentTitle: `OFFICIAL INTERNSHIP OFFER LETTER — ${internType} INTERNSHIP`,
    referenceNumber: buildRefNumber(intern.internId, `INT-OFR-${internType}`),
    issueDate: fmt(new Date()),
    candidate: buildCandidateInfo(intern),
    verification: buildVerification(docId, intern.id, "INTERNSHIP_OFFER_LETTER", version),
    signatures: {},
    internType,
    startDate,
    endDate,
    duration,
    stipend: stipendText,
    reportingManager: intern.supervisor?.fullName || "Designated Supervisor",
    learningObjectives: [
      `Gain hands-on expertise in ${intern.roleDomain} within the ${intern.department} division.`,
      "Contribute actively to real-world engineering, design, or operational projects.",
      "Develop professional communication, project management, and technical documentation skills.",
      "Learn and apply AURXON's internal engineering standards, coding conventions, and workflow practices.",
    ],
    responsibilities: [
      `Work as an engineering intern within the ${intern.department} department under the direct guidance of your assigned supervisor.`,
      "Attend all scheduled sync calls, standups, and team meetings as directed.",
      "Submit regular daily logs, task updates, and deliverable evidence on the AIMS platform.",
      "Adhere strictly to AURXON's code quality standards, data handling policies, and conduct guidelines.",
      "Maintain active working hours during the engagement period.",
    ],
    performanceExpectations:
      "The intern is expected to demonstrate initiative, consistency, technical growth, and collaborative effort throughout the engagement period. Performance will be reviewed periodically by the assigned supervisor.",
    codeOfConduct: [
      "Maintain professional behaviour during all communications and interactions with team members.",
      "Protect all confidential organisational data and systems in strict accordance with the signed NDA.",
      "Refrain from sharing AURXON's internal tools, codebase, or data with external parties.",
      "Report any security concerns, conflicts of interest, or policy violations to the HR division promptly.",
    ],
    termsAndConditions: [
      ...unpaidDisclosure,
      "Confidentiality: All intellectual property, data architectures, codebase, and system designs accessed during this engagement are strictly confidential and remain the exclusive property of AURXON.",
      "Intellectual Property: Any code, documentation, designs, or technical artefacts produced during this internship shall be the sole property of AURXON.",
      "Termination: AURXON reserves the right to terminate this engagement with 3 days' written notice in the event of performance failure, policy violation, or operational necessity.",
      "Completion Certificate: Subject to satisfactory completion of the engagement and meeting all performance criteria, a Completion Certificate and/or Experience Certificate may be issued.",
      "Non-Compete: During the internship period, the intern shall not engage in conflicting employment or projects with competing organisations without prior written consent.",
    ],
    closing:
      "We look forward to welcoming you to the AURXON team and witnessing your professional growth. Please sign and return this letter within 5 business days to confirm your acceptance.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Internship Agreement (Paid & Unpaid)
// ─────────────────────────────────────────────────────────────────────────────

export function generateInternshipAgreement(
  intern: any,
  docId: string = "draft",
  version: number = 1
): InternshipAgreementContent {
  const stipendVal = intern.stipendAmount ? Number(intern.stipendAmount) : 0;
  const isPaid = stipendVal > 0;
  const internType = isPaid ? "PAID" : "UNPAID";

  const unpaidTerms = isPaid
    ? []
    : [
        "No Employment Relationship: This Agreement shall not be construed as creating an employment relationship, employer-employee bond, or entitlement to future employment at AURXON.",
        "Educational Engagement: The intern acknowledges that this engagement is undertaken for educational and skill-development purposes solely.",
      ];

  return {
    companyName: "AURXON",
    documentTitle: "INTERNSHIP ENGAGEMENT AGREEMENT",
    referenceNumber: buildRefNumber(intern.internId, `INT-AGR`),
    issueDate: fmt(new Date()),
    candidate: buildCandidateInfo(intern),
    verification: buildVerification(docId, intern.id, "INTERNSHIP_AGREEMENT", version),
    signatures: {},
    internType,
    startDate: intern.startDate ? fmt(intern.startDate) : fmt(new Date()),
    endDate: intern.endDate ? fmt(intern.endDate) : "Completion of Training",
    workingHours: "As per project requirements and supervisor directives. Typically 6-8 hours per business day.",
    reportingManager: intern.supervisor?.fullName || "Assigned Supervisor",
    confidentialityClause:
      "The Intern agrees to hold all Confidential Information in strict confidence and shall not disclose, reproduce, or transmit any trade secrets, technical data, client information, or operational processes of AURXON to any third party without express prior written consent from the Founder.",
    ipClause:
      "All intellectual property, code, designs, documentation, and innovations created by the Intern during the engagement period shall become the sole and exclusive property of AURXON. The Intern irrevocably assigns all such rights to AURXON.",
    completionConditions: [
      "Satisfactory completion of all assigned projects and deliverables.",
      "Submission of a complete final intern portfolio report on the AIMS platform.",
      "Positive performance assessment from the reporting supervisor.",
      "Compliance with all AURXON conduct and data protection policies throughout the engagement.",
    ],
    terminationClause:
      "Either party may terminate this Agreement by providing 3 business days' written notice. AURXON reserves the right to immediately terminate this Agreement in cases of policy violations, data breaches, misconduct, or abandonment of duties.",
    terms: [
      ...unpaidTerms,
      `Role & Department: The Intern is engaged as ${intern.roleDomain} in the ${intern.department} department.`,
      "Attendance & Commitment: The Intern shall maintain active participation, attend all required meetings, and complete assigned tasks within agreed deadlines.",
      "Tools & Access: AURXON will provide necessary system access. All access credentials are strictly for official use only and must be treated as confidential.",
      "Data Security: The Intern shall not download, copy, or export company data to personal devices or external systems.",
      "Social Media: The Intern shall not publish or share any AURXON-related project details, code, designs, or internal communications on public platforms.",
      "Governing Law: This Agreement shall be governed by applicable laws of India, subject to jurisdiction at the location of AURXON's principal operations.",
    ],
    closing:
      "By executing this Agreement, both parties agree to be bound by all terms and conditions stated herein.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Internship / Employee / Contract NDA
// ─────────────────────────────────────────────────────────────────────────────

export function generateNDA(
  intern: any,
  ndaType: "INTERN" | "EMPLOYEE" | "CONTRACT" = "INTERN",
  docId: string = "draft",
  version: number = 1
): NDAContent {
  const docTypeMap = {
    INTERN: "INTERNSHIP NON-DISCLOSURE AGREEMENT",
    EMPLOYEE: "EMPLOYEE NON-DISCLOSURE & PROPRIETARY RIGHTS AGREEMENT",
    CONTRACT: "CONTRACTOR NON-DISCLOSURE & CONFIDENTIALITY AGREEMENT",
  };

  const durationMap = {
    INTERN: "the duration of the internship and 2 years thereafter",
    EMPLOYEE: "the duration of employment and 3 years thereafter",
    CONTRACT: "the contract period and 2 years thereafter",
  };

  return {
    companyName: "AURXON",
    documentTitle: docTypeMap[ndaType],
    referenceNumber: buildRefNumber(intern.internId, `NDA-${ndaType.substring(0, 3)}`),
    issueDate: fmt(new Date()),
    candidate: buildCandidateInfo(intern),
    verification: buildVerification(docId, intern.id, `${ndaType}_NDA`, version),
    signatures: {},
    effectiveDate: intern.startDate ? fmt(intern.startDate) : fmt(new Date()),
    partyA: "AURXON",
    partyB: intern.fullName,
    duration: durationMap[ndaType],
    governingLaw: "Laws of India, subject to jurisdiction at AURXON's principal place of operations.",
    clauses: [
      {
        title: "1. Definition of Confidential Information",
        text: `Confidential Information means all non-public information disclosed by AURXON to the ${ndaType === "CONTRACT" ? "Contractor" : ndaType === "EMPLOYEE" ? "Employee" : "Intern"} including but not limited to: source code, database schemas, API credentials, architectural designs, product roadmaps, client data, business strategies, financial data, internal tools, system credentials, and trade secrets. Confidential Information does not include information already in the public domain through no breach of this Agreement.`,
      },
      {
        title: "2. Non-Disclosure Obligations",
        text: `The Recipient agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose, share, copy, screenshot, export, or transmit any Confidential Information to any third party without prior written consent from AURXON; (c) use Confidential Information solely for performing assigned duties at AURXON; (d) immediately notify AURXON of any unauthorized disclosure or suspected breach.`,
      },
      {
        title: "3. Intellectual Property Ownership",
        text: "All inventions, software, code, designs, documentation, databases, reports, and work product created by the Recipient during or arising from the engagement at AURXON shall be deemed Works Made for Hire and shall be the sole and exclusive property of AURXON. The Recipient irrevocably assigns all intellectual property rights to AURXON without limitation.",
      },
      {
        title: "4. Non-Solicitation & Non-Compete",
        text: `During the engagement and for a period of 1 year thereafter, the Recipient shall not: (a) solicit or hire any AURXON employee, contractor, or consultant; (b) engage in, or be employed by, any directly competing organisation or project without prior written approval from AURXON's Founder.`,
      },
      {
        title: "5. Data Protection & Security Obligations",
        text: "The Recipient shall comply with AURXON's data protection policies at all times. All company data must be accessed only on authorized AURXON-managed systems. No data shall be stored on personal devices, cloud accounts, or external storage without express written authorisation.",
      },
      {
        title: "6. Breach & Consequences",
        text: "Any breach of this Agreement shall entitle AURXON to: (a) immediate termination of the engagement; (b) revocation of all issued certificates and credentials; (c) seek injunctive relief without the requirement to post bond; (d) pursue all available legal remedies including damages under applicable intellectual property and cybercrime laws. AURXON's rights under this Agreement are cumulative.",
      },
      {
        title: "7. Return of Materials",
        text: "Upon termination of the engagement, the Recipient shall promptly return or destroy all materials, devices, and access credentials belonging to AURXON. The Recipient certifies that no copies of Confidential Information are retained on personal devices or cloud storage.",
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Employee Offer Letter
// ─────────────────────────────────────────────────────────────────────────────

export function generateEmployeeOfferLetter(
  intern: any,
  annualCTC: number,
  compensationRules: CompensationRules = DEFAULT_COMPENSATION_RULES,
  currency: string = "INR",
  docId: string = "draft",
  version: number = 1
): EmployeeOfferLetterContent {
  const compensation = calculateCompensation(annualCTC, compensationRules, currency);

  return {
    companyName: "AURXON",
    documentTitle: "OFFICIAL EMPLOYMENT OFFER LETTER",
    referenceNumber: buildRefNumber(intern.internId, `EMP-OFR`),
    issueDate: fmt(new Date()),
    candidate: buildCandidateInfo(intern),
    verification: buildVerification(docId, intern.id, "EMPLOYEE_OFFER_LETTER", version),
    signatures: {},
    designation: intern.roleDomain,
    department: intern.department,
    reportingManager: intern.supervisor?.fullName || "Assigned Manager",
    dateOfJoining: intern.startDate ? fmt(intern.startDate) : fmt(new Date()),
    probationPeriod: "90 days from the Date of Joining",
    noticePeriod: "30 days (during probation); 60 days (post-confirmation)",
    workingHours: "9:00 AM – 6:00 PM IST, Monday – Friday (40 hours/week). Remote and hybrid arrangements as approved.",
    leaveStructure: "12 Paid Annual Leaves | 12 Sick Leaves | 12 Casual Leaves | Public Holidays as per AURXON HR Policy",
    compensation,
    termsAndConditions: [
      "This offer is contingent upon successful background verification and submission of all required onboarding documents.",
      "The employment relationship is governed by AURXON's Employee Handbook and applicable HR policies, which may be updated from time to time.",
      `Probation Period: The initial 90 days shall be a probationary period during which either party may terminate this arrangement with 15 days' written notice.`,
      "Post-Confirmation Notice Period: 60 days' written notice is required from either party following successful probation confirmation.",
      "Confidentiality: The Employee must execute and comply with AURXON's NDA as a condition of employment.",
      "Background Verification: This offer is conditional upon satisfactory completion of AURXON's background verification process.",
      "Governing Law: This offer and the resulting employment relationship shall be governed by applicable Indian labour laws.",
    ],
    closing:
      "We are delighted to extend this offer and look forward to you joining the AURXON team. Please sign and return this letter within 7 business days to formally accept this offer.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Employee Employment Agreement
// ─────────────────────────────────────────────────────────────────────────────

export function generateEmployeeAgreement(
  intern: any,
  annualCTC: number,
  compensationRules: CompensationRules = DEFAULT_COMPENSATION_RULES,
  currency: string = "INR",
  docId: string = "draft",
  version: number = 1
): EmployeeAgreementContent {
  const compensation = calculateCompensation(annualCTC, compensationRules, currency);

  return {
    companyName: "AURXON",
    documentTitle: "EMPLOYMENT AGREEMENT",
    referenceNumber: buildRefNumber(intern.internId, `EMP-AGR`),
    issueDate: fmt(new Date()),
    candidate: buildCandidateInfo(intern),
    verification: buildVerification(docId, intern.id, "EMPLOYEE_AGREEMENT", version),
    signatures: {},
    designation: intern.roleDomain,
    reportingManager: intern.supervisor?.fullName || "Assigned Manager",
    dateOfJoining: intern.startDate ? fmt(intern.startDate) : fmt(new Date()),
    employmentType: "Full-Time, Permanent Employment",
    probationPeriod: "90 days from Date of Joining",
    noticePeriod: "60 days written notice post-confirmation; 15 days during probation",
    workingHours: "40 hours per week, Monday–Friday, 9:00 AM – 6:00 PM IST",
    leaveStructure: "12 Paid Annual | 12 Sick | 12 Casual | Public Holidays per AURXON HR Policy",
    compensation,
    terms: [
      `Role & Department: The Employee is appointed as ${intern.roleDomain} in the ${intern.department} Department.`,
      "Duties: The Employee agrees to perform all duties diligently, professionally, and in the best interests of AURXON as assigned by the reporting manager.",
      "Compliance: The Employee agrees to comply with all AURXON policies, HR guidelines, security protocols, and applicable laws at all times.",
      "Confidentiality: The Employee shall execute and adhere to AURXON's NDA, which forms an integral part of this Agreement.",
      "Intellectual Property: All work products, inventions, and developments created by the Employee during employment shall be the exclusive property of AURXON.",
      "Data Protection: The Employee shall handle all company and client data in compliance with AURXON's data protection standards.",
      "Conflict of Interest: The Employee shall promptly disclose any actual or potential conflict of interest to AURXON's HR division.",
      "Termination: Either party may terminate this agreement with the applicable notice period in writing. AURXON reserves the right to terminate immediately for gross misconduct.",
      "Severance: Severance entitlements shall be governed by applicable Indian labour laws.",
      "Dispute Resolution: Any disputes arising under this Agreement shall be resolved through mutual good-faith negotiation, followed by arbitration under Indian law.",
      "Governing Law: This Agreement shall be governed by and construed in accordance with applicable Indian employment laws.",
    ],
    closing:
      "By executing this Agreement, both parties acknowledge having read, understood, and agreed to all terms and conditions herein.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Contract Offer Letter
// ─────────────────────────────────────────────────────────────────────────────

export function generateContractOfferLetter(
  intern: any,
  contractDetails: {
    projectScope: string;
    deliverables: string[];
    paymentStructure: "FIXED_FEE" | "MONTHLY" | "MILESTONE" | "PROJECT_BASED";
    paymentAmount: string;
    paymentTerms: string;
    renewalTerms: string;
    terminationTerms: string;
  },
  currency: string = "INR",
  docId: string = "draft",
  version: number = 1
): ContractOfferLetterContent {
  const startDate = intern.startDate ? fmt(intern.startDate) : fmt(new Date());
  const endDate = intern.endDate ? fmt(intern.endDate) : "Contract Completion";

  return {
    companyName: "AURXON",
    documentTitle: "CONTRACTOR ENGAGEMENT OFFER LETTER",
    referenceNumber: buildRefNumber(intern.internId, `CTR-OFR`),
    issueDate: fmt(new Date()),
    candidate: buildCandidateInfo(intern),
    verification: buildVerification(docId, intern.id, "CONTRACT_OFFER_LETTER", version),
    signatures: {},
    contractDuration: intern.endDate
      ? `${startDate} to ${endDate}`
      : "As mutually agreed in writing",
    startDate,
    endDate,
    projectScope: contractDetails.projectScope,
    deliverables: contractDetails.deliverables,
    paymentStructure: contractDetails.paymentStructure,
    paymentAmount: contractDetails.paymentAmount,
    paymentTerms: contractDetails.paymentTerms,
    renewalTerms: contractDetails.renewalTerms,
    terminationTerms: contractDetails.terminationTerms,
    termsAndConditions: [
      "This engagement is a contractual service arrangement and does not constitute employment.",
      "The Contractor is responsible for their own statutory contributions (PF, taxes, insurance) as applicable.",
      "AURXON shall not be liable for any third-party obligations incurred by the Contractor.",
      "The Contractor shall maintain professional standards and deliver all outputs as specified in the agreed scope.",
      "All intellectual property produced under this contract shall vest exclusively in AURXON upon payment.",
    ],
    closing:
      "Please review this offer carefully. By signing, you agree to engage on the terms specified. Return this signed letter within 5 business days to commence the contract.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Contract Service Agreement
// ─────────────────────────────────────────────────────────────────────────────

export function generateContractAgreement(
  intern: any,
  contractDetails: {
    projectScope: string;
    deliverables: string[];
    paymentStructure: "FIXED_FEE" | "MONTHLY" | "MILESTONE" | "PROJECT_BASED";
    paymentAmount: string;
    paymentTerms: string;
    renewalTerms: string;
    terminationTerms: string;
  },
  docId: string = "draft",
  version: number = 1
): ContractAgreementContent {
  const startDate = intern.startDate ? fmt(intern.startDate) : fmt(new Date());
  const endDate = intern.endDate ? fmt(intern.endDate) : "Contract Completion";

  return {
    companyName: "AURXON",
    documentTitle: "SERVICE AGREEMENT — CONTRACTOR ENGAGEMENT",
    referenceNumber: buildRefNumber(intern.internId, `CTR-AGR`),
    issueDate: fmt(new Date()),
    candidate: buildCandidateInfo(intern),
    verification: buildVerification(docId, intern.id, "CONTRACT_AGREEMENT", version),
    signatures: {},
    contractDuration: `${startDate} to ${endDate}`,
    startDate,
    endDate,
    projectScope: contractDetails.projectScope,
    deliverables: contractDetails.deliverables,
    paymentStructure: contractDetails.paymentStructure,
    paymentAmount: contractDetails.paymentAmount,
    paymentTerms: contractDetails.paymentTerms,
    renewalTerms: contractDetails.renewalTerms,
    terminationTerms: contractDetails.terminationTerms,
    ipOwnership:
      "All code, designs, documentation, software, databases, creative outputs, and technical deliverables developed under this Agreement shall be the sole intellectual property of AURXON upon full payment. The Contractor irrevocably assigns all such rights.",
    confidentiality:
      "The Contractor agrees to hold all Confidential Information of AURXON in strict confidence and shall not disclose it to any third party during the contract and for 2 years thereafter.",
    disputeResolution:
      "All disputes arising from this Agreement shall first be addressed through good-faith negotiation between the parties. If unresolved within 30 days, disputes shall be subject to binding arbitration under Indian law.",
    closing:
      "By executing this Agreement, both parties confirm acceptance of all terms and conditions. This Agreement supersedes all prior understandings, oral or written, relating to its subject matter.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ID Card (unchanged — kept for compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export function generateIDCardDraft(intern: any): IDCardContent {
  return {
    companyName: "AURXON",
    fullName: intern.fullName,
    internId: intern.internId,
    role: intern.roleDomain,
    department: intern.department,
    joiningDate: fmtShort(intern.startDate || new Date()),
    validUntil: intern.endDate ? fmtShort(intern.endDate) : "PERMANENT",
    avatarUrl: "",
    barcode: `*${intern.internId}*`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Experience Letter & Completion Certificate
// ─────────────────────────────────────────────────────────────────────────────

export function generateExperienceLetter(
  intern: any,
  docId: string = "draft",
  version: number = 1
): ExperienceLetterContent {
  const perfNotes =
    intern.performanceNotes ||
    "demonstrated high technical aptitude, consistent work ethic, active collaboration, and positive professional conduct throughout the engagement.";

  return {
    companyName: "AURXON",
    documentTitle: "CERTIFICATE OF WORK EXPERIENCE",
    referenceNumber: buildRefNumber(intern.internId, `EXP-LTR`),
    issueDate: fmt(new Date()),
    candidate: buildCandidateInfo(intern),
    verification: buildVerification(docId, intern.id, "EXPERIENCE_LETTER", version),
    signatures: {},
    role: intern.roleDomain,
    startDate: intern.startDate ? fmt(intern.startDate) : fmt(new Date()),
    endDate: intern.endDate ? fmt(intern.endDate) : fmt(new Date()),
    performanceNotes: perfNotes,
    body: `This is to certify that ${intern.fullName} (ID: ${intern.internId}) was engaged with AURXON in the capacity of ${intern.roleDomain} within the ${intern.department} department. During their tenure, they ${perfNotes}`,
    closing:
      "We wish them continued success in all future professional and academic endeavours. This certificate is issued in good faith and may be independently verified using the verification credentials provided herein.",
  };
}

export function generateCompletionCertificate(
  intern: any,
  certificateId: string,
  docId: string = "draft",
  version: number = 1
): CompletionCertificateContent {
  const perfNotes =
    intern.performanceNotes ||
    "successfully completed all assigned projects, met performance expectations, and demonstrated commendable professional conduct.";

  return {
    companyName: "AURXON",
    documentTitle: "INTERNSHIP COMPLETION CERTIFICATE",
    referenceNumber: certificateId,
    issueDate: fmt(new Date()),
    candidate: buildCandidateInfo(intern),
    verification: buildVerification(docId, intern.id, "COMPLETION_CERTIFICATE", version),
    signatures: {},
    role: intern.roleDomain,
    startDate: intern.startDate ? fmt(intern.startDate) : fmt(new Date()),
    endDate: intern.endDate ? fmt(intern.endDate) : fmt(new Date()),
    performanceNotes: perfNotes,
    certificateId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy Compatibility Exports (used by existing API routes & UI)
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use generateInternshipOfferLetter instead */
export function generateOfferLetterDraft(intern: any, currency: string = "INR"): any {
  return generateInternshipOfferLetter(intern, currency, "legacy-draft", 1);
}

/** @deprecated Use generateNDA instead */
export function generateNDADraft(intern: any): any {
  return generateNDA(intern, "INTERN", "legacy-draft", 1);
}

/** @deprecated Use generateInternshipAgreement instead */
export function generateAgreementDraft(intern: any): any {
  return generateInternshipAgreement(intern, "legacy-draft", 1);
}

/** @deprecated Use generateExperienceLetter instead */
export function generateExperienceLetterDraft(intern: any): any {
  return generateExperienceLetter(intern, "legacy-draft", 1);
}

// Re-export types for API/UI usage
// CompensationBreakdown and CompensationRules are exported as interfaces above
