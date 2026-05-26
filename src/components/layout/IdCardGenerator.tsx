"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { UploadCloud, AlertTriangle, ShieldCheck, Download, Sparkles, RefreshCw, Eye, Printer } from "lucide-react";
import { getRoleMeta } from "@/lib/roles";
import { jsPDF } from "jspdf";

interface IdCardGeneratorProps {
  fullName: string;
  internId: string;
  department: string;
  roleDomain: string;
  status: string;
  dbInternId: string; // The database primary key of the intern/employee record
  employmentType?: string; // The employment status type
  defaultPhotoUrl?: string | null; // Profile picture default fallback
}

export default function IdCardGenerator({
  fullName,
  internId,
  department,
  roleDomain,
  status,
  dbInternId,
  employmentType,
  defaultPhotoUrl,
}: IdCardGeneratorProps) {
  const { data: session } = useSession();
  const loggedInRole = (session?.user as any)?.role || "INTERN";
  const loggedInUserId = (session?.user as any)?.id;

  const [photoUrl, setPhotoUrl] = useState<string | null>(defaultPhotoUrl || null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Document state from DB
  const [cardStatus, setCardStatus] = useState<string | null>(null);
  const [cardDocId, setCardDocId] = useState<string | null>(null);
  const [cardSignature, setCardSignature] = useState<string | null>(null);

  // Dynamic light-themed color configuration based on enrollee's role for high contrast visual identity
  const getCardDesign = (domain: string, empType?: string) => {
    const lowerRole = (domain || "").toLowerCase();
    const lowerEmp = (empType || "").toLowerCase();
    
    // 1. Founder (Royal Purple)
    if (lowerRole.includes("founder") || lowerRole.includes("director") || lowerRole.includes("owner")) {
      return {
        label: "FOUNDER & OWNER",
        themeName: "Royal Purple Premium (White Base)",
        primaryColor: "#7c3aed", // Royal Purple
        secondaryColor: "#8b5cf6", // Violet Highlight
        accentColor: "#6d28d9", // Deep Purple
        techColor: "#7c3aed", // Royal Purple
        bgColorStart: "#ffffff",
        bgColorEnd: "#faf8ff", // Cool Purple Tint
        badgeBg: "bg-purple-100 text-purple-700 border border-purple-250 shadow-sm dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40",
        panelBg: "rgba(255, 255, 255, 0.95)",
        badgeText: "FOUNDER CONTROL",
        textColor: "#000000",
      };
    }
    // 2. HR / Staff Management (Blue)
    if (
      lowerRole.includes("hr") || 
      lowerRole.includes("human resources") || 
      lowerRole.includes("talent") || 
      lowerRole.includes("management") || 
      lowerRole.includes("operations")
    ) {
      return {
        label: "HR & MANAGEMENT",
        themeName: "Soft Blue Enterprise (White Base)",
        primaryColor: "#2563eb", // Royal Blue
        secondaryColor: "#3b82f6", // Sky Blue Highlight
        accentColor: "#1d4ed8", // Dark Blue
        techColor: "#2563eb", // Blue
        bgColorStart: "#ffffff",
        bgColorEnd: "#f8faff", // Cool Blue Tint
        badgeBg: "bg-blue-100 text-blue-700 border border-blue-250 shadow-sm dark:bg-blue-950/40 dark:text-blue-350 dark:border-blue-800/40",
        panelBg: "rgba(255, 255, 255, 0.95)",
        badgeText: "HR ADMINISTRATION",
        textColor: "#000000",
      };
    }
    // 3. Intern (Orange)
    if (lowerRole.includes("intern") || lowerEmp.includes("intern")) {
      return {
        label: "OFFICIAL INTERN",
        themeName: "Off-White Minimalist Orange (White Base)",
        primaryColor: "#f97316", // Orange
        secondaryColor: "#ea580c", // Orange Highlight
        accentColor: "#c2410c", // Charcoal Orange
        techColor: "#f97316", // Orange
        bgColorStart: "#ffffff",
        bgColorEnd: "#fffbf7", // Cool Orange Tint
        badgeBg: "bg-orange-100 text-orange-700 border border-orange-250 shadow-sm dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40",
        panelBg: "rgba(255, 255, 255, 0.95)",
        badgeText: "LEARNING ENROLLEE",
        textColor: "#000000",
      };
    }
    // 4. Contract Employee (Green)
    if (lowerEmp.includes("contract")) {
      return {
        label: "CONTRACT ASSOCIATE",
        themeName: "White + Green Enterprise (White Base)",
        primaryColor: "#10b981", // Green Accent
        secondaryColor: "#059669", // Green Highlight
        accentColor: "#047857", // Deep Green
        techColor: "#10b981", // Green
        bgColorStart: "#ffffff",
        bgColorEnd: "#f6fffb", // Cool Green Tint
        badgeBg: "bg-emerald-100 text-emerald-700 border border-emerald-250 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
        panelBg: "rgba(255, 255, 255, 0.95)",
        badgeText: "CONTRACT MEMBER",
        textColor: "#000000",
      };
    }
    // 5. Permanent Employee (Dark Navy or Teal - default fallback for Software Engineers etc.)
    return {
      label: "PERMANENT ASSOCIATE",
      themeName: "Dark Navy & Teal (White Base)",
      primaryColor: "#1e3a8a", // Dark Navy
      secondaryColor: "#0f766e", // Teal Accent
      accentColor: "#1e3a8a", // Dark Navy
      techColor: "#1e3a8a", // Dark Navy
      bgColorStart: "#ffffff",
      bgColorEnd: "#f8fafc", // Cool Navy-Grey Tint
      badgeBg: "bg-teal-100 text-teal-700 border border-teal-250 shadow-sm dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40",
      panelBg: "rgba(255, 255, 255, 0.95)",
      badgeText: "PERMANENT STAFF",
      textColor: "#000000",
    };
  };

  const design = getCardDesign(roleDomain, employmentType);
  const roleMeta = getRoleMeta(roleDomain);

  // Fetch saved configuration and approvals on mount
  const fetchSavedCard = async () => {
    try {
      const res = await fetch(`/api/documents/id-card?internId=${dbInternId}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setCardStatus(data.status);
          setCardDocId(data.id);
          setCardSignature(data.signature);
          if (data.content && data.content.avatarUrl) {
            setPhotoUrl(data.content.avatarUrl);
          }
        }
      } else {
        setCardStatus(null);
        setCardDocId(null);
        setCardSignature(null);
      }
    } catch (err) {
      console.warn("Failed to fetch saved ID card badge setup:", err);
    }
  };

  useEffect(() => {
    if (dbInternId) {
      fetchSavedCard();
    }
  }, [dbInternId]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setPhotoSuccess(null);
    const file = e.target.files?.[0];

    if (!file) return;

    // Secure 20 KB client-side validation
    if (file.size > 20 * 1024) {
      setPhotoError("Rejected: Profile photo exceeds the secure 20 KB maximum limit. Please compress your picture.");
      setPhotoUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
        setPhotoSuccess("Photo uploaded and prepared for compliance review!");
      }
    };
    reader.onerror = () => {
      setPhotoError("Failed to read the selected photo file.");
    };
    reader.readAsDataURL(file);
  };

  const drawCardOnCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number, imgElement?: HTMLImageElement): Promise<void> => {
    return new Promise(async (resolve) => {
      // Load corporate AIMS logo image first for high contrast header identity
      let logoImg: HTMLImageElement | null = null;
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = "/Logo-AIMS/AurxonLogo.png";
        await new Promise<void>((resImg) => {
          img.onload = () => {
            logoImg = img;
            resImg();
          };
          img.onerror = () => {
            resImg(); // Resolve gracefully without blocking preview compilation
          };
        });
      } catch (e) {
        console.warn("Canvas logo load exception:", e);
      }

      // 1. High Contrast Background Gradient (Light-themed)
      let bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, design.bgColorStart);
      bgGradient.addColorStop(1, design.bgColorEnd);
      
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle light-contrast grid overlay
      ctx.fillStyle = "rgba(15, 23, 42, 0.015)";
      for (let x = 0; x < width; x += 15) {
        ctx.fillRect(x, 0, 1, height);
      }
      for (let y = 0; y < height; y += 15) {
        ctx.fillRect(0, y, width, 1);
      }

      // 2. High-Readability Card Frame
      ctx.strokeStyle = design.secondaryColor;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, width - 8, height - 8);

      ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Draw top tech line stripes
      ctx.strokeStyle = design.techColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(25, 22);
      ctx.lineTo(width - 25, 22);
      ctx.stroke();

      // Top decorative tech block
      ctx.fillStyle = design.techColor;
      ctx.fillRect(width / 2 - 25, 20, 50, 4);

      // Draw bottom tech line stripes
      ctx.beginPath();
      ctx.moveTo(25, height - 22);
      ctx.lineTo(width - 25, height - 22);
      ctx.stroke();

      // Bottom decorative tech block
      ctx.fillRect(width / 2 - 25, height - 24, 50, 4);

      // 3. Header Section (Highly Readable Slate Black Title)
      ctx.textAlign = "center";
      ctx.fillStyle = "#0f172a"; // Slate-900
      
      // Shadow for subtle contrast
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 1;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      // Aligned text and separator heights
      let textY = 46;
      let subtitleY = 65;
      let sepY = 80;

      if (logoImg) {
        const logoSize = 24;
        ctx.drawImage(logoImg, width / 2 - logoSize / 2, 28, logoSize, logoSize);
        textY = 70;
        subtitleY = 89;
        sepY = 104;
      }

      ctx.font = "900 22px sans-serif";
      ctx.fillText("AURXON", width / 2, textY);

      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.font = "bold 9px sans-serif";
      ctx.fillStyle = "#334155"; // Slate-700
      ctx.fillText("OFFICIAL WORKFORCE CREDENTIAL", width / 2, subtitleY);

      // Horizontal separator
      ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
      ctx.fillRect(30, sepY, width - 60, 1.5);

      // 4. Draw Profile Picture Frame
      const centerX = width / 2;
      const centerY = 190;
      const radius = 68;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15, 23, 42, 0.04)";
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = design.secondaryColor;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.1)";
      ctx.stroke();

      if (imgElement) {
        // Clipped photo draw
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgElement, centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.restore();
      } else {
        // Draw crisp vector avatar placeholder (Light style)
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.fillStyle = "#f1f5f9"; // Slate-100
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY - 12, 22, 0, Math.PI * 2);
        ctx.fillStyle = "#cbd5e1"; // Slate-300
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY + 48, 42, 0, Math.PI * 2);
        ctx.fillStyle = "#cbd5e1"; // Slate-300
        ctx.fill();
        ctx.restore();
      }

      // 5. Solid Opaque Overlay Panel for Superior Text Readability (White theme)
      const panelY = 280;
      const panelHeight = 158;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)"; // Solid Opaque White Panel
      ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";  // Soft border
      ctx.lineWidth = 1;
      
      // Draw rounded container panel
      ctx.beginPath();
      ctx.roundRect(25, panelY, width - 50, panelHeight, 16);
      ctx.fill();
      ctx.stroke();

      // Draw text inside panel
      ctx.textAlign = "center";
      
      // Full Name (Heavy Slate Black Font)
      ctx.font = "900 21px sans-serif";
      ctx.fillStyle = "#090d16"; // Ink Black
      ctx.fillText(fullName, width / 2, panelY + 32);

      // Role Domain Badge Text
      ctx.font = "900 11px sans-serif";
      ctx.fillStyle = design.accentColor;
      ctx.fillText(`${roleDomain.toUpperCase()} (${roleMeta.shortCode})`, width / 2, panelY + 54);
      
      // Department
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#475569"; // Slate-600
      ctx.fillText(department, width / 2, panelY + 74);

      // Dynamic Design Role Label Badge
      const badgeW = 160;
      const badgeH = 18;
      ctx.fillStyle = "rgba(15, 23, 42, 0.03)";
      ctx.strokeStyle = design.primaryColor + "33"; // soft border
      ctx.beginPath();
      ctx.roundRect(width / 2 - badgeW / 2, panelY + 90, badgeW, badgeH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = "900 8.5px sans-serif";
      ctx.fillStyle = design.accentColor;
      ctx.fillText(design.label, width / 2, panelY + 102);

      // Separator
      ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
      ctx.fillRect(40, panelY + 118, width - 80, 1.5);

      // Credential ID (Highly Readable Black)
      ctx.textAlign = "left";
      ctx.font = "900 9px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("CREDENTIAL ID", 45, panelY + 134);
      
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = "#0f172a";
      ctx.fillText(internId, 45, panelY + 148);

      // Status
      ctx.textAlign = "right";
      ctx.font = "900 9px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("STATUS", width - 45, panelY + 134);

      const isApproved = cardStatus === "APPROVED";
      ctx.font = "900 11.5px sans-serif";
      ctx.fillStyle = isApproved ? "#047857" : "#c2410c"; // Dark Green or Dark Orange
      ctx.fillText(isApproved ? "VERIFIED ACTIVE" : "PENDING AUDIT", width - 45, panelY + 148);

      // 6. Draw Barcode Section
      const barcodeY = 458;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(35, barcodeY, width - 70, 48); // white base block (keeps scan contrast high)
      
      ctx.fillStyle = "#000000";
      let cursorX = 45;
      const barHeight = 36;
      
      // Structured barcode generation loop for uniform appearance
      let count = 0;
      while (cursorX < width - 45) {
        const lineW = [1, 2, 3, 1.5][(count + internId.charCodeAt(count % internId.length)) % 4];
        ctx.fillRect(cursorX, barcodeY + 4, lineW, barHeight);
        cursorX += lineW + [1, 2.5, 1.5][(count * 2) % 3];
        count++;
      }
      
      ctx.textAlign = "center";
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#374151"; // Charcoal
      ctx.fillText(`* ${internId} *`, width / 2, barcodeY + 45);

      // 7. Security Footnotes & Signature Stamp
      ctx.font = "bold 8px sans-serif";
      ctx.fillStyle = "rgba(15, 23, 42, 0.4)"; // Charcoal opaque footnotes
      ctx.fillText("AURXON SECURE COMPLIANCE BADGE - COMPLIANCE SHIELD ACTIVE", width / 2, 524);

      if (cardStatus === "DEACTIVATED") {
        ctx.font = "bold 7.5px sans-serif";
        ctx.fillStyle = "#dc2626"; // High contrast Red
        ctx.fillText("⚠️ COMPLIANCE DEACTIVATED / REVOKED", width / 2, 538);
      } else if (isApproved && cardSignature) {
        ctx.font = "500 7px monospace";
        ctx.fillStyle = "#0f172a"; // Signature ink black
        // Limit signature stamp width safely
        const cleanSig = cardSignature.length > 55 ? cardSignature.substring(0, 52) + "..." : cardSignature;
        ctx.fillText(cleanSig, width / 2, 538);
      } else {
        ctx.font = "bold 7.5px sans-serif";
        ctx.fillStyle = "#dc2626"; // High contrast Red
        ctx.fillText("⚠️ UNAPPROVED CREDENTIAL DRAFT", width / 2, 538);
      }

      // 8. Deactivation Watermark if deactivated
      if (cardStatus === "DEACTIVATED") {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(-Math.PI / 6); // -30 degrees
        ctx.textAlign = "center";
        
        // Solid white backing block for readability
        ctx.fillStyle = "rgba(254, 242, 242, 0.95)";
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-140, -18, 280, 36, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = "900 13px sans-serif";
        ctx.fillStyle = "#dc2626"; // Bold Red text
        ctx.fillText("⚠️ COMPLIANCE DEACTIVATED", 0, 5);
        ctx.restore();
      }

      resolve();
    });
  };

  const handleSaveAndGenerate = async () => {
    setIsSaving(true);
    setPhotoError(null);
    setPhotoSuccess(null);

    try {
      const res = await fetch("/api/documents/id-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internId: dbInternId,
          theme: design.themeName,
          avatarUrl: photoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save ID card.");

      setPhotoSuccess(
        loggedInRole === "FOUNDER" || loggedInRole === "HR" || loggedInRole === "ADMIN" || loggedInRole === "SUPER_ADMIN"
          ? "Official corporate ID card successfully saved and approved!"
          : "Official corporate ID card successfully saved! Pending administrative sign-off by Founder/HR."
      );
      await fetchSavedCard();
    } catch (err: any) {
      setPhotoError(err.message || "Could not persist badge configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveCard = async () => {
    if (!cardDocId) return;
    setIsApproving(true);
    setPhotoError(null);
    setPhotoSuccess(null);

    try {
      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: cardDocId,
          action: "APPROVE",
          notes: "Approved and signed digital ID Card badge.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve ID card.");

      setPhotoSuccess("Successfully approved, cryptographically signed, and finalized this ID Card!");
      await fetchSavedCard();
    } catch (err: any) {
      setPhotoError(err.message || "Approval transaction failed.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDownload = async (format: "PNG" | "JPG" | "PDF") => {
    if (isGenerating) return;

    if (cardStatus === "DEACTIVATED") {
      setPhotoError("Compliance Suspension: This identity credential has been deactivated and downloads are permanently locked.");
      return;
    }
    
    // Safety guard: Standard enrollees cannot download until approved
    const isApproved = cardStatus === "APPROVED";
    const isAdmin = loggedInRole === "FOUNDER" || loggedInRole === "HR" || loggedInRole === "ADMIN" || loggedInRole === "SUPER_ADMIN";
    
    if (!isApproved && !isAdmin) {
      setPhotoError("Security Violation: You are not permitted to download this ID card until it is approved by the Founder or HR.");
      return;
    }

    setIsGenerating(true);
    setPhotoError(null);
    setPhotoSuccess(null);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Rendering element is missing.");

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to initialize graphics pipeline.");

      const width = 360;
      const height = 560;
      canvas.width = width;
      canvas.height = height;

      if (photoUrl) {
        // Load image safely inside browser thread
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = photoUrl;
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load selected profile image."));
        });

        await drawCardOnCanvas(ctx, width, height, img);
      } else {
        await drawCardOnCanvas(ctx, width, height);
      }

      // 1. Export in requested formats
      if (format === "PNG") {
        const link = document.createElement("a");
        link.download = `AURXON-ID-${internId}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else if (format === "JPG") {
        const link = document.createElement("a");
        link.download = `AURXON-ID-${internId}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.click();
      } else if (format === "PDF") {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [360, 560],
        });
        pdf.addImage(imgData, "PNG", 0, 0, 360, 560);
        pdf.save(`AURXON-ID-${internId}.pdf`);
      }
      
      // Perform security audit log fetch
      try {
        await fetch("/api/documents/id-card/log-download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ internId: dbInternId }),
        });
      } catch (logErr) {
        console.warn("Failed to audit log ID card download:", logErr);
      }

      setPhotoSuccess(`High-contrast digital ID card successfully exported as ${format}!`);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to render card onto canvas pipeline.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isCardApproved = cardStatus === "APPROVED";
  const isAdminActor = loggedInRole === "FOUNDER" || loggedInRole === "HR" || loggedInRole === "SUPER_ADMIN" || loggedInRole === "ADMIN";

  return (
    <div className="relative text-slate-800 dark:text-white space-y-6">
      
      {/* Hidden Render Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main card customizer UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left: Customizer Controls */}
        <div className="p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] bg-white/60 dark:bg-[#0b0f19]/70 backdrop-blur-md rounded-2xl shadow-xl space-y-5">
          <div className="space-y-1 border-b border-slate-200 dark:border-white/[0.06] pb-3">
            <h3 className="text-sm font-heading font-extrabold flex items-center space-x-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              <span>Sleek ID Card Customizer</span>
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-gray-400">
              Attach a profile photo, save your configuration, and download your verified role badge.
            </p>
          </div>

          {/* Feedback alerts */}
          {photoError && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-lg flex items-center space-x-2 animate-pulse">
              <AlertTriangle className="h-4 w-4 text-red-550 shrink-0" />
              <span>{photoError}</span>
            </div>
          )}

          {photoSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 dark:border-emerald-500/20 text-emerald-650 dark:text-emerald-450 text-[10px] font-bold rounded-lg flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{photoSuccess}</span>
            </div>
          )}

          {/* Upload photo controller */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-heading font-extrabold text-slate-500 dark:text-gray-450 uppercase tracking-widest block">
              Profile Portrait Attachment
            </label>
            <div className="relative border border-dashed border-slate-250 dark:border-white/10 rounded-xl p-4 bg-slate-50/50 dark:bg-[#0c1220] hover:bg-slate-100 dark:hover:bg-[#0f172a] transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-2">
              <UploadCloud className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
              <div className="text-xs">
                <span className="font-bold text-indigo-550 dark:text-indigo-400">Click to attach photo</span>
                <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Accepts JPG/PNG. Size limit: <span className="font-extrabold text-indigo-550 dark:text-indigo-400">Strictly ≤ 20 KB</span></p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>

          {/* Role Visual Identity Theme Display */}
          <div className="p-3 rounded-xl border border-white/[0.05] bg-white/[0.01] space-y-1">
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Visual Identity</span>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300">Design Schema:</span>
              <span className="font-bold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-[10px]">
                🎨 {design.themeName}
              </span>
            </div>
          </div>

          {/* Approval Action for Admins/Founder */}
          {cardStatus === "PENDING" && isAdminActor && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5 animate-fadeIn">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Pending Administrative Sign-Off</h4>
                  <p className="text-[9px] text-gray-400 leading-normal">
                    This enrollee's credentials card is awaiting approval. Review the design preview and apply your digital signature.
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleApproveCard}
                disabled={isApproving}
                variant="primary"
                className="w-full h-9 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg flex items-center justify-center space-x-1.5 shadow-md shadow-amber-600/10"
              >
                {isApproving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                <span>{isApproving ? "Authenticating Card..." : "Approve & Cryptographically Sign Card"}</span>
              </Button>
            </div>
          )}

          {/* Pending Alert banner for Interns */}
          {!isCardApproved && !isAdminActor && cardStatus !== "DEACTIVATED" && (
            <div className="p-4 rounded-xl border border-red-500/25 bg-red-500/5 flex items-start space-x-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Pending Review Gate</h4>
                <p className="text-[9px] text-red-300 leading-normal">
                  Your corporate ID card is currently awaiting review. The download buttons below are disabled and watermark stamp is locked until finalized by Founder (Karan Mishra) or HR.
                </p>
              </div>
            </div>
          )}

          {/* Deactivated Compliance Alert block */}
          {cardStatus === "DEACTIVATED" && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start space-x-2.5 animate-fadeIn">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-rose-500">⚠️ COMPLIANCE DEACTIVATED</h4>
                <p className="text-[9px] text-rose-450 leading-normal">
                  This identity credential has been suspended/deactivated by administrative compliance. All exports are locked, and the credential badge is visually revoked.
                </p>
              </div>
            </div>
          )}

          {/* Download and Save actions */}
          <div className="space-y-3.5 pt-1.5 border-t border-slate-200 dark:border-white/[0.06]">
            
            <Button
              onClick={handleSaveAndGenerate}
              disabled={isSaving || cardStatus === "DEACTIVATED"}
              variant="outline"
              className="w-full h-11 text-xs font-bold font-heading border-indigo-500/20 hover:bg-indigo-500/5 text-indigo-500 dark:text-indigo-400 rounded-xl shadow flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              isLoading={isSaving}
            >
              <Sparkles className="h-4 w-4" />
              <span>Compile & Save Configuration</span>
            </Button>

            <div className="space-y-2">
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Download Options</span>
              <div className="grid grid-cols-3 gap-2.5">
                <Button
                  onClick={() => handleDownload("PNG")}
                  disabled={isGenerating || (!isCardApproved && !isAdminActor) || cardStatus === "DEACTIVATED"}
                  variant="secondary"
                  className="h-10 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-cyan-400" />
                  <span>PNG</span>
                </Button>

                <Button
                  onClick={() => handleDownload("JPG")}
                  disabled={isGenerating || (!isCardApproved && !isAdminActor) || cardStatus === "DEACTIVATED"}
                  variant="secondary"
                  className="h-10 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span>JPG</span>
                </Button>

                <Button
                  onClick={() => handleDownload("PDF")}
                  disabled={isGenerating || (!isCardApproved && !isAdminActor) || cardStatus === "DEACTIVATED"}
                  variant="secondary"
                  className="h-10 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="h-3.5 w-3.5 text-indigo-400" />
                  <span>PDF</span>
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Right: Modern High-Contrast Real-Time Preview Card */}
        <div className="flex justify-center items-center w-full py-8 overflow-visible">
          <div className="scale-100 sm:scale-105 md:scale-115 lg:scale-120 xl:scale-125 origin-center transition-all duration-300">
            <div
              className="w-[290px] h-[450px] rounded-2xl border-4 p-5 flex flex-col justify-between transition-all duration-500 relative shadow-2xl overflow-hidden text-slate-800 bg-white"
              style={{
                borderColor: design.primaryColor,
                boxShadow: `0 10px 40px ${design.primaryColor}1a`,
                background: `linear-gradient(to bottom right, ${design.bgColorStart}, ${design.bgColorEnd})`,
              }}
            >
            {cardStatus === "DEACTIVATED" && (
              <div className="absolute inset-0 z-40 bg-rose-950/20 backdrop-blur-[1.5px] flex items-center justify-center select-none">
                <div className="bg-red-650 border-2 border-white px-3 py-1.5 rounded-lg shadow-xl -rotate-12 transform">
                  <span className="text-white text-[11px] font-heading font-black tracking-widest flex items-center gap-1.5">
                    ⚠️ COMPLIANCE DEACTIVATED
                  </span>
                </div>
              </div>
            )}

            {/* Top Tech Accent Line */}
            <div 
              className="absolute top-4 left-5 right-5 h-[4px] rounded-full z-20"
              style={{ backgroundColor: design.primaryColor }}
            />
            {/* Top Tech Center Block */}
            <div 
              className="absolute top-[14px] left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-b-md z-20"
              style={{ backgroundColor: design.primaryColor }}
            />

            {/* Bottom Tech Accent Line */}
            <div 
              className="absolute bottom-4 left-5 right-5 h-[4px] rounded-full z-20"
              style={{ backgroundColor: design.primaryColor }}
            />
            {/* Bottom Tech Center Block */}
            <div 
              className="absolute bottom-[14px] left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-t-md z-20"
              style={{ backgroundColor: design.primaryColor }}
            />

            {/* Ambient Background Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.015)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

            {/* Header Area */}
            <div className="flex flex-col items-center justify-center space-y-1 relative z-10 pt-1 select-none">
              <img
                src="/Logo-AIMS/AurxonLogo.png"
                alt="AIMS Logo"
                className="h-6 w-auto object-contain shrink-0"
              />
              <h4 className="text-xs font-heading font-extrabold tracking-widest text-slate-900 leading-none mt-1.5">
                AURXON
              </h4>
              <span 
                className="text-[8px] font-black uppercase tracking-widest block leading-none"
                style={{ color: design.primaryColor }}
              >
                WORKFORCE CREDENTIAL
              </span>
              <div className="h-0.5 w-full bg-slate-100 mt-1" />
            </div>

            {/* Photo & Identity Center */}
            <div className="flex flex-col items-center space-y-3 relative z-10">
              {/* Photo Ring wrapper */}
              <div 
                className="h-[106px] w-[106px] rounded-full flex items-center justify-center border-[3.5px] shadow-sm bg-slate-50"
                style={{ borderColor: design.primaryColor }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Badge portrait"
                    className="h-[96px] w-[96px] rounded-full object-cover shadow-inner"
                  />
                ) : (
                  <div className="h-[96px] w-[96px] rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200/50 shadow-inner">
                    <span className="text-[8.5px] uppercase font-bold text-center tracking-wider px-2">No Photo</span>
                  </div>
                )}
              </div>

              {/* Text items inside solid panel */}
              <div 
                className="w-full rounded-xl border border-slate-250 p-3 text-center space-y-0.5 shadow-sm bg-white"
              >
                <span className="text-sm font-heading font-extrabold tracking-wide block text-slate-900 select-text">
                  {fullName}
                </span>
                
                <span 
                  className="text-[9.5px] font-extrabold uppercase tracking-wider block"
                  style={{ color: design.primaryColor }}
                >
                  {roleDomain} ({roleMeta.shortCode})
                </span>
                
                <span className="text-[8.5px] text-slate-500 block font-bold uppercase tracking-wide">
                  {department}
                </span>

                <div className="pt-1 select-none">
                  <span className={`text-[8px] font-heading font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full border ${design.badgeBg}`}>
                    {design.badgeText}
                  </span>
                </div>
              </div>
            </div>

            {/* Identity details and barcode */}
            <div className="space-y-3 relative z-10 pb-1.5">
              <div className="flex justify-between items-center text-[9px] px-1 border border-slate-200 bg-slate-50/50 p-1.5 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[7.5px] font-bold uppercase tracking-wider">Credential ID</span>
                  <span className="font-mono font-bold tracking-wide text-slate-800 select-text">{internId}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[7.5px] font-bold uppercase tracking-wider">Status</span>
                  <span 
                    className="font-black uppercase tracking-wide text-[10px]"
                    style={{ color: isCardApproved ? "#047857" : "#c2410c" }}
                  >
                    {isCardApproved ? "Active verified" : "Pending audit"}
                  </span>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm h-9 overflow-hidden flex flex-col justify-between">
                <div className="flex items-end justify-between h-5 w-full select-none">
                  {Array.from({ length: 42 }).map((_, i) => {
                    const h = [6, 12, 16, 20, 24][(i + (internId.charCodeAt(i % internId.length) || 0)) % 5];
                    const w = [1, 2, 1.5][(i * 3) % 3];
                    return (
                      <div
                        key={i}
                        className="bg-black shrink-0"
                        style={{ height: `${h}px`, width: `${w}px` }}
                      />
                    );
                  })}
                </div>
                <span className="block text-[6.5px] text-center text-slate-500 font-bold font-mono tracking-widest leading-none mt-1">
                  {internId}
                </span>
              </div>
            </div>
            
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
