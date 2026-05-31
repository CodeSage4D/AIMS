/**
 * AURXON AIMS — Server-Side PDF Generator
 * Renders all 9 corporate document types as high-fidelity PDFs using jsPDF.
 *
 * Watermarks: "DRAFT" (diagonal, red-tinted) | "OFFICIAL" (diagonal, green-tinted)
 * Branding: AURXON logo embedded base64 or text fallback header
 * Digital Verification Footer on every page
 */

import { jsPDF } from "jspdf";
import crypto from "crypto";
import type {
  CompensationBreakdown,
  DigitalVerification,
  SignatureBlock,
} from "./documentTemplates";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_W = 210;  // A4 width in mm
const PAGE_H = 297;  // A4 height in mm
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLORS = {
  primary: [30, 41, 59] as [number, number, number],       // slate-800 — main text
  accent: [234, 88, 12] as [number, number, number],        // orange-600 — AURXON brand
  muted: [100, 116, 139] as [number, number, number],       // slate-500 — secondary text
  lightBg: [248, 250, 252] as [number, number, number],     // slate-50 — section bg
  border: [203, 213, 225] as [number, number, number],      // slate-300 — lines
  draftWm: [220, 38, 38] as [number, number, number],       // red-600 — DRAFT watermark
  officialWm: [22, 163, 74] as [number, number, number],    // green-600 — OFFICIAL watermark
  pendingWm: [161, 98, 7] as [number, number, number],      // amber-700 — PENDING watermark
  tableHeader: [30, 41, 59] as [number, number, number],    // slate-800 — table header bg
  tableRowEven: [241, 245, 249] as [number, number, number],// slate-100 — even rows
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

function setColor(doc: jsPDF, rgb: [number, number, number], fill = true) {
  if (fill) doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  else doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function drawHRule(doc: jsPDF, y: number, alpha = 0.3) {
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  // Filled section header bar
  setColor(doc, COLORS.primary, true);
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, 6.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), MARGIN + 3, y + 4.5);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  return y + 9;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 15): number {
  if (y + needed > PAGE_H - 25) {
    doc.addPage();
    return MARGIN + 5;
  }
  return y;
}

// ─────────────────────────────────────────────────────────────────────────────
// Watermark Renderer
// ─────────────────────────────────────────────────────────────────────────────

function drawWatermark(doc: jsPDF, type: "DRAFT" | "PENDING" | "OFFICIAL") {
  const totalPages = doc.getNumberOfPages();
  const colorMap = {
    DRAFT: COLORS.draftWm,
    PENDING: COLORS.pendingWm,
    OFFICIAL: COLORS.officialWm,
  };
  const color = colorMap[type];

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    // Set transparency via global alpha (jsPDF supports this)
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(72);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(type, PAGE_W / 2, PAGE_H / 2, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  }
  doc.setPage(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Header (Logo + Company Name + Document Title + Ref)
// ─────────────────────────────────────────────────────────────────────────────

function drawHeader(
  doc: jsPDF,
  documentTitle: string,
  referenceNumber: string,
  issueDate: string
): number {
  let y = MARGIN;

  // Orange accent bar at top
  doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.rect(0, 0, PAGE_W, 3, "F");

  // Company name — centered, large
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.text("AURXON", PAGE_W / 2, y + 10, { align: "center" });

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("INTERNAL MANAGEMENT SYSTEM  |  OFFICIAL DOCUMENT", PAGE_W / 2, y + 15.5, { align: "center" });

  y += 20;
  drawHRule(doc, y);
  y += 5;

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(documentTitle, PAGE_W / 2, y + 5, { align: "center" });
  y += 11;

  // Reference and Date row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text(`Ref: ${referenceNumber}`, MARGIN, y + 2);
  doc.text(`Issue Date: ${issueDate}`, PAGE_W - MARGIN, y + 2, { align: "right" });
  y += 7;

  drawHRule(doc, y);
  return y + 6;
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate Information Block
// ─────────────────────────────────────────────────────────────────────────────

function drawCandidateBlock(doc: jsPDF, candidate: any, y: number): number {
  y = sectionHeader(doc, "Candidate Information", y);

  const fields = [
    ["Full Name", candidate.fullName],
    ["Employee / Intern ID", candidate.employeeId],
    ["Designation", candidate.designation],
    ["Department", candidate.department],
    ["Email Address", candidate.email],
    ["Phone Number", candidate.phone],
    ["Employment Type", candidate.employmentType],
    ["Address", candidate.address],
    ["Date of Joining", candidate.joiningDate],
    ["Reporting Manager", candidate.reportingManager || "To be assigned"],
  ];

  // Two-column layout
  const colW = CONTENT_W / 2 - 2;
  let col = 0;
  let rowY = y;
  let maxRowY = y;

  fields.forEach(([label, value], idx) => {
    const x = MARGIN + col * (colW + 4);

    // Alternate row shading
    if (idx % 4 < 2) {
      doc.setFillColor(COLORS.lightBg[0], COLORS.lightBg[1], COLORS.lightBg[2]);
      doc.rect(x - 1, rowY - 1, colW + 2, 8.5, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text(label.toUpperCase(), x, rowY + 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    const lines = wrapText(doc, value || "—", colW - 2);
    lines.forEach((line, li) => {
      doc.text(line, x, rowY + 7 + li * 3.5);
    });

    const fieldH = 7 + lines.length * 3.5;
    if (col === 1 || idx === fields.length - 1) {
      rowY = Math.max(rowY, rowY) + fieldH + 2;
      maxRowY = rowY;
      col = 0;
    } else {
      col = 1;
    }
  });

  return maxRowY + 4;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compensation Breakdown Table
// ─────────────────────────────────────────────────────────────────────────────

function drawCompensationTable(doc: jsPDF, comp: CompensationBreakdown, y: number): number {
  y = checkPageBreak(doc, y, 80);
  y = sectionHeader(doc, "Compensation Structure", y);

  const fmt = (n: number) => {
    if (comp.currency === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.round(n / 83));
    }
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  };

  // Table headers
  const colWidths = [75, 45, 45];
  const headers = ["Component", "Monthly", "Annual"];
  const startX = MARGIN;

  // Header row
  doc.setFillColor(COLORS.tableHeader[0], COLORS.tableHeader[1], COLORS.tableHeader[2]);
  doc.rect(startX, y, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  let hx = startX + 3;
  headers.forEach((h, i) => {
    doc.text(h, hx, y + 5);
    hx += colWidths[i];
  });
  y += 8;

  const rows = [
    ["Basic Pay", fmt(comp.monthly.basic), fmt(comp.annual.basic)],
    ["House Rent Allowance (HRA)", fmt(comp.monthly.hra), fmt(comp.annual.hra)],
    ["Conveyance / Travel Allowance (TA)", fmt(comp.monthly.ta), fmt(comp.annual.ta)],
    ["Special Allowance", fmt(comp.monthly.specialAllowance), fmt(comp.annual.specialAllowance)],
    ...(comp.monthly.performanceAllowance > 0
      ? [["Performance Allowance", fmt(comp.monthly.performanceAllowance), fmt(comp.annual.performanceAllowance)]]
      : []),
    ["Gross Salary", fmt(comp.monthly.grossSalary), fmt(comp.annual.grossSalary)],
    ["PF Deduction (Employee — 12% of Basic)", `(${fmt(comp.monthly.pfDeduction)})`, `(${fmt(comp.annual.pfDeduction)})`],
    ["Net Take-Home Salary", fmt(comp.monthly.netTakeHome), fmt(comp.annual.netTakeHome)],
    ["Employer PF Contribution (12% of Basic)", "—", fmt(comp.annual.employerPF)],
    ["Total Cost to Company (CTC)", "—", fmt(comp.annual.totalCTC)],
  ];

  rows.forEach((row, idx) => {
    const isHighlight = row[0].includes("Gross") || row[0].includes("Net Take") || row[0].includes("CTC");
    const isEven = idx % 2 === 0;

    if (isHighlight) {
      doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
      doc.rect(startX, y, CONTENT_W, 7, "F");
      doc.setTextColor(255, 255, 255);
    } else if (isEven) {
      doc.setFillColor(COLORS.tableRowEven[0], COLORS.tableRowEven[1], COLORS.tableRowEven[2]);
      doc.rect(startX, y, CONTENT_W, 7, "F");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    } else {
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    }

    doc.setFont(isHighlight ? "helvetica" : "helvetica", isHighlight ? "bold" : "normal");
    doc.setFontSize(7.5);
    let rx = startX + 3;
    row.forEach((cell, ci) => {
      doc.text(cell, rx, y + 5);
      rx += colWidths[ci];
    });

    y += 7;
  });

  // Draw table border
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.4);
  doc.rect(startX, y - rows.length * 7 - 8, CONTENT_W, rows.length * 7 + 8, "S");

  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  y += 4;

  // Disclaimer note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text(
    "* Compensation components are subject to AURXON HR Policy. Statutory deductions may vary based on applicable laws. CTC = Gross Salary + Employer PF.",
    MARGIN,
    y,
    { maxWidth: CONTENT_W }
  );

  return y + 8;
}

// ─────────────────────────────────────────────────────────────────────────────
// Terms & Conditions Renderer
// ─────────────────────────────────────────────────────────────────────────────

function drawTermsList(doc: jsPDF, terms: string[], y: number, title = "Terms & Conditions"): number {
  y = checkPageBreak(doc, y, 20);
  y = sectionHeader(doc, title, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);

  terms.forEach((term, idx) => {
    y = checkPageBreak(doc, y, 12);
    const bullet = `${idx + 1}.`;
    const lines = wrapText(doc, term, CONTENT_W - 10);
    doc.setFont("helvetica", "bold");
    doc.text(bullet, MARGIN, y);
    doc.setFont("helvetica", "normal");
    lines.forEach((line, li) => {
      doc.text(line, MARGIN + 8, y + li * 4);
    });
    y += lines.length * 4 + 3;
  });

  return y + 4;
}

// ─────────────────────────────────────────────────────────────────────────────
// NDA Clauses Renderer
// ─────────────────────────────────────────────────────────────────────────────

function drawClauses(doc: jsPDF, clauses: { title: string; text: string }[], y: number): number {
  y = sectionHeader(doc, "Agreement Clauses", y);

  clauses.forEach((clause) => {
    y = checkPageBreak(doc, y, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.text(clause.title, MARGIN, y + 3);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    const lines = wrapText(doc, clause.text, CONTENT_W);
    lines.forEach((line) => {
      y = checkPageBreak(doc, y, 6);
      doc.text(line, MARGIN, y);
      y += 4;
    });

    y += 4;
  });

  return y + 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signature Block
// ─────────────────────────────────────────────────────────────────────────────

function drawSignatureBlock(
  doc: jsPDF,
  signatures: SignatureBlock,
  founderSignatory: string,
  y: number
): number {
  y = checkPageBreak(doc, y, 55);
  y = sectionHeader(doc, "Authorised Signatures", y);

  const halfW = CONTENT_W / 2 - 4;

  // Candidate signature box
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, halfW, 40, 2, 2, "S");

  // Founder/Company signature box
  doc.roundedRect(MARGIN + halfW + 8, y, halfW, 40, 2, 2, "S");

  // Labels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("CANDIDATE / EMPLOYEE SIGNATURE", MARGIN + 4, y + 5);
  doc.text("AUTHORISED SIGNATORY — AURXON", MARGIN + halfW + 12, y + 5);

  // Signature names
  if (signatures.candidateSignature) {
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text(signatures.candidateSignature, MARGIN + 4, y + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text(`Signed: ${signatures.candidateSignedAt || "—"}`, MARGIN + 4, y + 26);
    if (signatures.candidateSignatureStamp) {
      const stampLines = wrapText(doc, signatures.candidateSignatureStamp, halfW - 8);
      stampLines.forEach((l, li) => {
        doc.text(l, MARGIN + 4, y + 30 + li * 3.5);
      });
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text("Awaiting candidate signature...", MARGIN + 4, y + 22);
  }

  // Founder signature
  const fx = MARGIN + halfW + 12;
  if (signatures.founderSignature) {
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.text(founderSignatory || "Founder, AURXON", fx, y + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text(`Signed: ${signatures.founderSignedAt || "—"}`, fx, y + 26);
    if (signatures.founderSignatureStamp) {
      const stampLines = wrapText(doc, signatures.founderSignatureStamp, halfW - 8);
      stampLines.forEach((l, li) => {
        doc.text(l, fx, y + 30 + li * 3.5);
      });
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text("Awaiting authorised signature...", fx, y + 22);
  }

  // Line under signature name
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.2);
  doc.line(MARGIN + 4, y + 34, MARGIN + halfW - 4, y + 34);
  doc.line(fx, y + 34, MARGIN + halfW + 8 + halfW - 4, y + 34);

  // Designation labels below line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("Signature & Date", MARGIN + 4, y + 38);
  doc.text("Founder / Authorised Signatory, AURXON", fx, y + 38);

  return y + 48;
}

// ─────────────────────────────────────────────────────────────────────────────
// Digital Verification Footer
// ─────────────────────────────────────────────────────────────────────────────

function drawVerificationFooter(doc: jsPDF, verification: DigitalVerification) {
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = PAGE_H - 18;

    // Footer separator
    drawHRule(doc, footerY - 2);

    // QR placeholder box
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, footerY + 1, 12, 12, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4);
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text("SCAN TO", MARGIN + 1.5, footerY + 5.5);
    doc.text("VERIFY", MARGIN + 2, footerY + 8.5);

    // Verification details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("DOCUMENT VERIFICATION", MARGIN + 15, footerY + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text(`Doc ID: ${verification.documentId}`, MARGIN + 15, footerY + 7.5);
    doc.text(`Verification No: ${verification.verificationNumber}`, MARGIN + 15, footerY + 10.5);
    doc.text(`SHA-256: ${verification.sha256Hash.substring(0, 48)}...`, MARGIN + 15, footerY + 13.5);

    // Verify URL — right side
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.text(verification.verificationUrl, PAGE_W - MARGIN, footerY + 7.5, { align: "right" });

    // Lifecycle + watermark status
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text(
      `Status: ${verification.lifecycleStatus}  |  Version: ${verification.version}  |  © ${new Date().getFullYear()} AURXON. All Rights Reserved.`,
      PAGE_W - MARGIN,
      footerY + 11,
      { align: "right" }
    );

    // Page number
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W / 2, footerY + 14, { align: "center" });
  }

  doc.setPage(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SHA-256 Content Hash Generator
// ─────────────────────────────────────────────────────────────────────────────

export function generateDocumentHash(
  docId: string,
  internId: string,
  type: string,
  timestamp: number,
  salt: string
): string {
  return crypto
    .createHash("sha256")
    .update(`${docId}|${internId}|${type}|${timestamp}|${salt}`)
    .digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PDF Compiler
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfGenerationInput {
  content: any;
  docType: string;
  watermark: "DRAFT" | "PENDING" | "OFFICIAL";
  founderSignatory: string;
  verification: DigitalVerification;
}

export function compilePDF(input: PdfGenerationInput): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const { content, docType, watermark, founderSignatory, verification } = input;

  // ── Header ──────────────────────────────────────────────────────────────────
  let y = drawHeader(
    doc,
    content.documentTitle || docType.replace(/_/g, " "),
    content.referenceNumber || verification.verificationNumber,
    content.issueDate || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  );

  // ── Candidate Block ──────────────────────────────────────────────────────────
  if (content.candidate) {
    y = drawCandidateBlock(doc, content.candidate, y);
    y += 4;
  }

  // ── Document-specific sections ───────────────────────────────────────────────
  const type = docType.toUpperCase();

  // Internship Offer Letter
  if (type === "OFFER_LETTER" || type === "INTERNSHIP_OFFER_LETTER") {
    y = checkPageBreak(doc, y, 15);
    y = sectionHeader(doc, "Internship Details", y);

    const detailFields = [
      ["Internship Type", content.internType === "PAID" ? "Paid Internship" : "Unpaid Internship (Training)"],
      ["Start Date", content.startDate],
      ["End Date", content.endDate],
      ["Duration", content.duration],
      ["Stipend / Compensation", content.stipend],
      ["Reporting Manager", content.reportingManager],
      ["Performance Expectations", content.performanceExpectations],
    ];

    detailFields.forEach(([label, value]) => {
      y = checkPageBreak(doc, y, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
      doc.text(label + ":", MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      const lines = wrapText(doc, value || "—", CONTENT_W - 55);
      lines.forEach((l, li) => doc.text(l, MARGIN + 55, y + li * 4));
      y += Math.max(6, lines.length * 4) + 1;
    });

    y += 3;

    if (content.learningObjectives?.length) {
      y = drawTermsList(doc, content.learningObjectives, y, "Learning Objectives");
    }
    if (content.responsibilities?.length) {
      y = drawTermsList(doc, content.responsibilities, y, "Responsibilities");
    }
    if (content.codeOfConduct?.length) {
      y = drawTermsList(doc, content.codeOfConduct, y, "Code of Conduct");
    }
    if (content.termsAndConditions?.length) {
      y = drawTermsList(doc, content.termsAndConditions, y, "Terms & Conditions");
    }

    // Closing
    y = checkPageBreak(doc, y, 15);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    const closingLines = wrapText(doc, content.closing || "", CONTENT_W);
    closingLines.forEach((l) => { doc.text(l, MARGIN, y); y += 4.5; });
    y += 4;
  }

  // Internship Agreement
  if (type === "AGREEMENT" || type === "INTERNSHIP_AGREEMENT") {
    y = checkPageBreak(doc, y, 15);
    y = sectionHeader(doc, "Agreement Details", y);

    const detailFields = [
      ["Agreement Type", content.internType === "PAID" ? "Paid Internship Agreement" : "Unpaid Internship Agreement"],
      ["Effective Date", content.startDate],
      ["End Date", content.endDate],
      ["Working Hours", content.workingHours],
      ["Reporting Manager", content.reportingManager],
    ];

    detailFields.forEach(([label, value]) => {
      y = checkPageBreak(doc, y, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
      doc.text(label + ":", MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      const lines = wrapText(doc, value || "—", CONTENT_W - 55);
      lines.forEach((l, li) => doc.text(l, MARGIN + 55, y + li * 4));
      y += Math.max(6, lines.length * 4) + 1;
    });

    y += 3;
    if (content.terms?.length) {
      y = drawTermsList(doc, content.terms, y, "Agreement Terms");
    }

    // Confidentiality
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "Confidentiality Clause", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    const confLines = wrapText(doc, content.confidentialityClause || "", CONTENT_W);
    confLines.forEach((l) => { doc.text(l, MARGIN, y); y += 4.5; });
    y += 4;

    // IP Clause
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "Intellectual Property", y);
    const ipLines = wrapText(doc, content.ipClause || "", CONTENT_W);
    ipLines.forEach((l) => { doc.text(l, MARGIN, y); y += 4.5; });
    y += 4;

    if (content.completionConditions?.length) {
      y = drawTermsList(doc, content.completionConditions, y, "Completion Conditions");
    }

    // Termination
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "Termination Clause", y);
    const termLines = wrapText(doc, content.terminationClause || "", CONTENT_W);
    termLines.forEach((l) => { doc.text(l, MARGIN, y); y += 4.5; });
    y += 4;
  }

  // NDA
  if (type === "NDA" || type.includes("NDA")) {
    y = checkPageBreak(doc, y, 15);
    y = sectionHeader(doc, "Agreement Parties", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text(`Party A (Company): ${content.partyA || "AURXON"}`, MARGIN, y + 3);
    y += 7;
    doc.text(`Party B (Recipient): ${content.partyB || "—"}`, MARGIN, y + 3);
    y += 7;
    doc.text(`Effective Date: ${content.effectiveDate || "—"}`, MARGIN, y + 3);
    y += 7;
    doc.text(`Duration: Confidentiality obligations survive for ${content.duration || "the duration and 2 years thereafter"}.`, MARGIN, y + 3);
    y += 10;

    if (content.clauses?.length) {
      y = drawClauses(doc, content.clauses, y);
    }

    // Governing Law
    y = checkPageBreak(doc, y, 15);
    y = sectionHeader(doc, "Governing Law & Jurisdiction", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const govLines = wrapText(doc, content.governingLaw || "", CONTENT_W);
    govLines.forEach((l) => { doc.text(l, MARGIN, y); y += 4; });
    y += 4;
  }

  // Employee Offer Letter & Agreement
  if (type === "EMPLOYEE_OFFER_LETTER" || type === "EMPLOYEE_AGREEMENT") {
    y = checkPageBreak(doc, y, 15);
    y = sectionHeader(doc, "Employment Details", y);

    const empFields = [
      ["Designation", content.designation],
      ["Department", content.candidate?.department],
      ["Date of Joining", content.dateOfJoining],
      ["Employment Type", content.employmentType || "Full-Time, Permanent"],
      ["Probation Period", content.probationPeriod],
      ["Notice Period", content.noticePeriod],
      ["Working Hours", content.workingHours],
      ["Leave Structure", content.leaveStructure],
      ["Reporting Manager", content.reportingManager],
    ];

    empFields.forEach(([label, value]) => {
      if (!value) return;
      y = checkPageBreak(doc, y, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
      doc.text(label + ":", MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      const lines = wrapText(doc, value || "—", CONTENT_W - 55);
      lines.forEach((l, li) => doc.text(l, MARGIN + 55, y + li * 4));
      y += Math.max(6, lines.length * 4) + 1;
    });
    y += 3;

    if (content.compensation) {
      y = drawCompensationTable(doc, content.compensation, y);
    }

    if (content.terms?.length) {
      y = drawTermsList(doc, content.terms, y, "Agreement Terms");
    }
    if (content.termsAndConditions?.length) {
      y = drawTermsList(doc, content.termsAndConditions, y, "Terms & Conditions");
    }
  }

  // Contract Offer Letter & Agreement
  if (type === "CONTRACT_OFFER_LETTER" || type === "CONTRACT_AGREEMENT") {
    y = checkPageBreak(doc, y, 15);
    y = sectionHeader(doc, "Contract Details", y);

    const cFields = [
      ["Contract Duration", content.contractDuration],
      ["Start Date", content.startDate],
      ["End Date", content.endDate],
      ["Payment Structure", content.paymentStructure?.replace(/_/g, " ") || "—"],
      ["Payment Amount", content.paymentAmount],
      ["Payment Terms", content.paymentTerms],
      ["Renewal Terms", content.renewalTerms],
      ["Termination Terms", content.terminationTerms],
    ];

    cFields.forEach(([label, value]) => {
      if (!value) return;
      y = checkPageBreak(doc, y, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
      doc.text(label + ":", MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      const lines = wrapText(doc, value || "—", CONTENT_W - 55);
      lines.forEach((l, li) => doc.text(l, MARGIN + 55, y + li * 4));
      y += Math.max(6, lines.length * 4) + 1;
    });
    y += 3;

    // Project Scope
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "Project Scope", y);
    const scopeLines = wrapText(doc, content.projectScope || "As agreed in writing.", CONTENT_W);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    scopeLines.forEach((l) => { doc.text(l, MARGIN, y); y += 4.5; });
    y += 3;

    // Deliverables
    if (content.deliverables?.length) {
      y = drawTermsList(doc, content.deliverables, y, "Deliverables");
    }

    if (type === "CONTRACT_AGREEMENT") {
      // IP & Confidentiality
      y = checkPageBreak(doc, y, 20);
      y = sectionHeader(doc, "Intellectual Property", y);
      const ipLines = wrapText(doc, content.ipOwnership || "", CONTENT_W);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      ipLines.forEach((l) => { doc.text(l, MARGIN, y); y += 4.5; });
      y += 4;

      y = checkPageBreak(doc, y, 20);
      y = sectionHeader(doc, "Confidentiality", y);
      const confLines = wrapText(doc, content.confidentiality || "", CONTENT_W);
      confLines.forEach((l) => { doc.text(l, MARGIN, y); y += 4.5; });
      y += 4;

      y = checkPageBreak(doc, y, 20);
      y = sectionHeader(doc, "Dispute Resolution", y);
      const dispLines = wrapText(doc, content.disputeResolution || "", CONTENT_W);
      dispLines.forEach((l) => { doc.text(l, MARGIN, y); y += 4.5; });
      y += 4;
    }

    if (content.termsAndConditions?.length) {
      y = drawTermsList(doc, content.termsAndConditions, y, "Terms & Conditions");
    }
  }

  // Experience Letter
  if (type === "EXPERIENCE_LETTER") {
    y = checkPageBreak(doc, y, 15);
    y = sectionHeader(doc, "Certification", y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("TO WHOMSOEVER IT MAY CONCERN", PAGE_W / 2, y + 4, { align: "center" });
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const bodyLines = wrapText(doc, content.body || "", CONTENT_W);
    bodyLines.forEach((l) => { doc.text(l, MARGIN, y); y += 5; });
    y += 6;

    const certFields = [
      ["Role / Designation", content.role],
      ["Department", content.candidate?.department],
      ["Engagement Period", `${content.startDate} — ${content.endDate}`],
    ];
    certFields.forEach(([label, value]) => {
      y = checkPageBreak(doc, y, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
      doc.text(label + ":", MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.text(value || "—", MARGIN + 55, y);
      y += 7;
    });

    y += 5;
    const closingLines = wrapText(doc, content.closing || "", CONTENT_W);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    closingLines.forEach((l) => { doc.text(l, MARGIN, y); y += 5; });
    y += 6;
  }

  // Completion Certificate
  if (type === "COMPLETION_CERTIFICATE" || type === "CERTIFICATE") {
    y = checkPageBreak(doc, y, 20);
    // Award box
    doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.roundedRect(MARGIN, y, CONTENT_W, 28, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("THIS CERTIFIES THAT", PAGE_W / 2, y + 7, { align: "center" });

    doc.setFontSize(15);
    doc.text(content.candidate?.fullName || "—", PAGE_W / 2, y + 15, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`has successfully completed the internship programme as ${content.role}`, PAGE_W / 2, y + 22, { align: "center" });

    y += 33;

    const certFields = [
      ["Certificate ID", content.certificateId || content.referenceNumber],
      ["Department", content.candidate?.department],
      ["Period", `${content.startDate} — ${content.endDate}`],
      ["Performance", content.performanceNotes],
    ];

    certFields.forEach(([label, value]) => {
      y = checkPageBreak(doc, y, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
      doc.text(label + ":", MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      const lines = wrapText(doc, value || "—", CONTENT_W - 40);
      lines.forEach((l, li) => doc.text(l, MARGIN + 40, y + li * 4));
      y += Math.max(7, lines.length * 4) + 1;
    });

    y += 6;
  }

  // ── Signature Block ──────────────────────────────────────────────────────────
  y = drawSignatureBlock(
    doc,
    content.signatures || {},
    founderSignatory,
    y
  );

  // ── Watermark (applied to all pages) ────────────────────────────────────────
  drawWatermark(doc, watermark);

  // ── Digital Verification Footer (all pages) ──────────────────────────────────
  drawVerificationFooter(doc, verification);

  // ── Return Buffer ────────────────────────────────────────────────────────────
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
