import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import {
  CompensationDetails,
  VerificationMetadata,
  buildSignatoryBlock,
} from "./documentTemplates";

/**
 * Server-side high-fidelity PDF Generator for AURXON AIMS
 * Compiles beautiful, brand-harmonized, mobile-readable PDF documents.
 */
export async function generateDocumentPdf(docRecord: {
  type: string;
  id: string;
  status: string;
  signature?: string | null;
  intern: {
    internId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    address: string;
    roleDomain: string;
    department: string;
    startDate: Date | string;
    employmentType: string;
  };
  content: any;
}): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { content, type, status, id, intern } = docRecord;
  const watermarkText = status === "APPROVED" ? "AURXON OFFICIAL COMPLIANCE DOCUMENT" : "AURXON DRAFT ONLY";
  const refNumber = content.verification?.verificationSerial || `AXN-${type.substring(0,3)}-2026-${id.split("-")[0].toUpperCase()}`;
  const issueDate = content.effectiveDate || content.startDate || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const signatory = buildSignatoryBlock(status, docRecord.signature);
  
  // Try to load official AURXON logo as base64
  let logoBase64 = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "Logo-AIMS", "AurxonLogo.png");
    if (fs.existsSync(logoPath)) {
      logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
    }
  } catch (err) {
    console.warn("[PDF GENERATOR] Logo not loaded:", err);
  }

  let currentPage = 1;

  // Helper to draw common background elements (Branding, Watermark, Page borders)
  const drawPageDecoration = (pdf: jsPDF, pageNum: number) => {
    // 1. Light Blue-grey border
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.rect(10, 10, 190, 277);

    // 2. Light Grey Watermark printed diagonally across the page center
    pdf.saveGraphicsState();
    pdf.setTextColor(240, 242, 245);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    // Draw diagonal watermark (needs angle parameter or state translation)
    pdf.text(watermarkText, 105, 148, {
      align: "center",
      angle: 45,
    });
    pdf.restoreGraphicsState();

    // 3. Centered Brand Header Logo or Brand Text
    if (logoBase64) {
      try {
        pdf.addImage(logoBase64, "PNG", 97.5, 14, 15, 15);
      } catch {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(9, 12, 22);
        pdf.text("AURXON", 105, 20, { align: "center" });
      }
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(9, 12, 22);
      pdf.text("AURXON", 105, 20, { align: "center" });
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(15, 23, 42); // slate-900
    pdf.text("AURXON", 105, 33, { align: "center" });

    // 4. Document Type Title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(79, 70, 229); // Indigo-600
    pdf.text(content.title || type.replace("_", " "), 105, 39, { align: "center" });

    // 5. Ref and Date Block
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184); // slate-400
    pdf.text(`Document Reference: ${refNumber}  |  Version: v${content.documentVersion || 1}  |  Issued: ${issueDate}`, 105, 43, { align: "center" });

    // Decorative slim line under header
    pdf.setDrawColor(241, 245, 249);
    pdf.line(20, 47, 190, 47);

    // Page Number Indicator
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${pageNum}`, 105, 283, { align: "center" });
  };

  // Draw Page 1 decoration
  drawPageDecoration(doc, currentPage);

  // 1. structured candidate information card block
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(20, 51, 170, 36, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(20, 51, 170, 36);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("CANDIDATE INFORMATION BLOCK", 24, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500

  // Left Column
  doc.text("Full Name:", 24, 62);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intern.fullName, 52, 62);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Employee / Intern ID:", 24, 68);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intern.internId || "Awaiting Setup", 58, 68);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Designation / Role:", 24, 74);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intern.roleDomain, 55, 74);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Department:", 24, 80);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intern.department, 45, 80);

  // Right Column
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Email Address:", 110, 62);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intern.email, 134, 62);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Contact Number:", 110, 68);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intern.phoneNumber || "N/A", 137, 68);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Joining Date:", 110, 74);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(new Date(intern.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 131, 74);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Employment Type:", 110, 80);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(intern.employmentType, 139, 80);

  // Start rendering terms and clauses with automatic page breaks
  let y = 94;

  const addNewPage = () => {
    doc.addPage();
    currentPage++;
    drawPageDecoration(doc, currentPage);
    y = 52; // Start after header area
  };

  // Introduction Paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // slate-700
  
  if (content.salutation) {
    doc.setFont("helvetica", "bold");
    doc.text(content.salutation, 20, y);
    y += 5;
  }

  doc.setFont("helvetica", "normal");
  if (content.introduction) {
    const wrappedIntro = doc.splitTextToSize(content.introduction, 170);
    doc.text(wrappedIntro, 20, y);
    y += (wrappedIntro.length * 4.5) + 3;
  }

  // Stipend or Compensation breakdown display
  if (content.compensationBreakdown) {
    const breakdown = content.compensationBreakdown as CompensationDetails;
    
    // Draw section title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("COMPENSATION STRUCTURE BREAKDOWN (CTC)", 20, y);
    y += 5;

    // Draw header table
    doc.setFillColor(241, 245, 249);
    doc.rect(20, y, 170, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Salary Component", 22, y + 4.5);
    doc.text("Monthly Structure", 85, y + 4.5);
    doc.text("Annual Breakdown", 140, y + 4.5);
    y += 6;

    const currencySymbol = "INR";
    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencySymbol, maximumFractionDigits: 0 }).format(val);
    };

    const salaryRows = [
      { name: "Basic Salary (50% of CTC)", monthly: breakdown.basicMonthly, annual: breakdown.basic },
      { name: "House Rent Allowance (HRA)", monthly: breakdown.hraMonthly, annual: breakdown.hra },
      { name: "Conveyance & TA Allowance", monthly: breakdown.taMonthly, annual: breakdown.ta },
      { name: "Statutory PF (Employer Contribution)", monthly: breakdown.pfMonthly, annual: breakdown.pf },
      { name: "Special Corporate Allowance", monthly: breakdown.specialAllowanceMonthly, annual: breakdown.specialAllowance },
      { name: "Total Cost to Company (CTC)", monthly: breakdown.ctcMonthly, annual: breakdown.ctc, isTotal: true },
    ];

    doc.setFont("helvetica", "normal");
    salaryRows.forEach((row) => {
      if (row.isTotal) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, y, 170, 6.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
      } else {
        doc.setTextColor(51, 65, 85);
      }
      doc.text(row.name, 22, y + 4.5);
      doc.text(formatCurrency(row.monthly), 85, y + 4.5);
      doc.text(formatCurrency(row.annual), 140, y + 4.5);
      
      // Draw bottom cell line
      doc.setDrawColor(241, 245, 249);
      doc.line(20, y + 6.5, 190, y + 6.5);
      y += 6.5;
    });

    y += 4;
  } else if (content.stipendOrCompensation) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Compensation Details:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(`  ${content.stipendOrCompensation}`, 60, y);
    y += 7;
  }

  // Standard Terms & Conditions
  if (content.terms && content.terms.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("TERMS AND CONDITIONS OF ENGAGEMENT", 20, y);
    y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    content.terms.forEach((term: string, idx: number) => {
      const termText = `${idx + 1}. ${term}`;
      const wrappedTerm = doc.splitTextToSize(termText, 170);
      
      // Page boundary check
      if (y + (wrappedTerm.length * 4.5) > 262) {
        addNewPage();
      }

      doc.text(wrappedTerm, 20, y);
      y += (wrappedTerm.length * 4.5) + 2.5;
    });
    y += 2.5;
  }

  // Wording NDA clauses if applicable
  if (content.clauses && content.clauses.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("NDA & INTELLECTUAL PROPERTY COVENANTS", 20, y);
    y += 5.5;

    content.clauses.forEach((c: any, idx: number) => {
      const wrappedTitle = doc.splitTextToSize(`${idx + 1}. ${c.title}`, 170);
      const wrappedText = doc.splitTextToSize(c.text, 164);

      if (y + (wrappedTitle.length * 4.5) + (wrappedText.length * 4) > 262) {
        addNewPage();
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(wrappedTitle, 20, y);
      y += (wrappedTitle.length * 4.5) + 1;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(wrappedText, 25, y);
      y += (wrappedText.length * 4) + 3;
    });
  }

  // Closing Paragraph
  if (content.closing) {
    const wrappedClosing = doc.splitTextToSize(content.closing, 170);
    if (y + (wrappedClosing.length * 4.5) > 260) {
      addNewPage();
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(wrappedClosing, 20, y);
    y += (wrappedClosing.length * 4.5) + 6;
  }

  // --- DOUBLE SIGNATURE CARD BLOCK ---
  if (y > 210) {
    // If signature block doesn't fit on this page, push to a fresh page to avoid truncation
    addNewPage();
  }

  doc.setFillColor(248, 250, 252);
  doc.rect(20, y, 170, 36, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(20, y, 170, 36);

  // Left Signature (Candidate)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(79, 70, 229);
  doc.text("EMPLOYEE / CANDIDATE SIGNATURE", 24, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  if (content.candidateSignature) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(content.candidateSignature, 24, y + 14);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Signed Date: ${content.candidateSignedAt}`, 24, y + 19);
    
    doc.setFont("mono", "normal");
    doc.setFontSize(5.5);
    doc.text(content.candidateSignatureStamp || "", 24, y + 24);
  } else {
    doc.setFont("helvetica", "oblique");
    doc.setTextColor(148, 163, 184);
    doc.text("Awaiting Electronic Signature...", 24, y + 14);
  }

  // Right Signature (Founder / HR Signatory)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(79, 70, 229);
  doc.text("AURXON AUTHORIZED REPRESENTATIVE", 110, y + 6);

  if (docRecord.signature) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(signatory.name, 110, y + 14);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Title: ${signatory.title}`, 110, y + 19);
    doc.text(`Approval Date: ${signatory.date}`, 110, y + 24);

    doc.setFont("mono", "normal");
    doc.setFontSize(5.5);
    doc.text(docRecord.signature.substring(0, 50), 110, y + 29);
  } else {
    doc.setFont("helvetica", "oblique");
    doc.setTextColor(148, 163, 184);
    doc.text("Awaiting Authorized Sign-off...", 110, y + 14);
  }

  // Bottom Compliance Verification Block
  const verifyMeta = content.verification as VerificationMetadata;
  const bottomY = 255;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, bottomY, 190, bottomY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("DIGITAL COMPLIANCE VERIFICATION FOOTER", 20, bottomY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);

  doc.text(`Document ID: ${id}`, 20, bottomY + 10);
  doc.text(`Verification Serial: ${verifyMeta?.verificationSerial || refNumber}`, 20, bottomY + 14);
  doc.text(`Verification Hash (SHA-256): ${verifyMeta?.sha256Hash || "N/A"}`, 20, bottomY + 18);
  doc.text(`Verification URL: ${verifyMeta?.verificationUrl || "N/A"}`, 20, bottomY + 22);

  // Draw QR code placeholder box
  doc.rect(166, bottomY + 2, 24, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(148, 163, 184);
  doc.text("SCAN TO", 178, bottomY + 10, { align: "center" });
  doc.text("VERIFY", 178, bottomY + 13, { align: "center" });
  doc.text("COMPLIANCE", 178, bottomY + 16, { align: "center" });
  
  // Tiny outline for barcode styling in box
  doc.rect(168, bottomY + 18, 20, 6);
  doc.setLineWidth(0.1);
  for (let bar = 170; bar < 186; bar += 1.5) {
    doc.line(bar, bottomY + 19, bar, bottomY + 23);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
