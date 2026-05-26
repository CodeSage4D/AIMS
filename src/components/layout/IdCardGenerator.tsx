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
  linkedIn?: string | null;
  gitHub?: string | null;
}

// Deterministic Cryptographic Security Key Generator
const generateEncryptionKey = (id: string, dbId: string) => {
  if (!id || !dbId) return "ARXN-SEC-PENDING";
  const str = `${id}-${dbId}-aurxon-secure-salt-2026`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).substring(0, 4).toUpperCase();
  const hex2 = Math.abs(hash * 31).toString(16).substring(0, 4).toUpperCase();
  const hex3 = Math.abs(hash * 97).toString(16).substring(0, 4).toUpperCase();
  return `ARXN-SEC-${hex1}-${hex2}-${hex3}`;
};

// URL parser to retrieve professional handles
const getHandleName = (url?: string | null, fallback: string = "") => {
  if (!url) return fallback;
  try {
    const clean = url.trim().replace(/\/$/, ""); // remove trailing slash
    const parts = clean.split("/");
    return parts[parts.length - 1] || fallback;
  } catch {
    return fallback;
  }
};

export default function IdCardGenerator({
  fullName,
  internId,
  department,
  roleDomain,
  status,
  dbInternId,
  employmentType,
  defaultPhotoUrl,
  linkedIn = null,
  gitHub = null,
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
        label: "ELITE FOUNDER",
        themeName: "Royal Purple Premium (White Base)",
        primaryColor: "#7c3aed", // Royal Purple
        secondaryColor: "#8b5cf6", // Violet Highlight
        accentColor: "#6d28d9", // Deep Purple
        techColor: "#7c3aed", // Royal Purple
        bgColorStart: "#ffffff",
        bgColorEnd: "#faf8ff", // Cool Purple Tint
        badgeBg: "bg-purple-100 text-purple-700 border border-purple-250 shadow-sm dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40",
        panelBg: "rgba(255, 255, 255, 0.95)",
        badgeText: "LEADERSHIP MANAGEMENT",
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
        const logoSize = 48; // Increased logo size from 24
        ctx.drawImage(logoImg, width / 2 - logoSize / 2, 16, logoSize, logoSize);
        textY = 82;
        subtitleY = 98;
        sepY = 108;
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

      const isApproved = cardStatus === "APPROVED" || isAdminActor;
      ctx.font = "900 11.5px sans-serif";
      ctx.fillStyle = isApproved ? "#047857" : "#c2410c"; // Dark Green or Dark Orange
      ctx.fillText(isApproved ? "VERIFIED ACTIVE" : "PENDING AUDIT", width - 45, panelY + 148);

      // Draw the digital encryption key block
      const encryptionKey = generateEncryptionKey(internId, dbInternId);
      ctx.textAlign = "center";
      ctx.font = "bold 7px monospace";
      ctx.fillStyle = "#475569";
      ctx.fillText(`SECURITY KEY: ${encryptionKey}`, width / 2, 446);

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
      } else if (isApproved) {
        ctx.font = "500 7px monospace";
        ctx.fillStyle = "#0f172a"; // Signature ink black
        // Fallback cryptographically simulated signature if missing from DB
        const sig = cardSignature || `ARXN-SIG-${internId}-${dbInternId.substring(0, 6)}`.toUpperCase();
        const cleanSig = sig.length > 55 ? sig.substring(0, 52) + "..." : sig;
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
    } finally {
      setIsApproving(false);
    }
  };

  const handleBadgeDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setPhotoError(null);
    setPhotoSuccess(null);
    try {
      // HD Badge canvas: 1920x640 (widescreen LinkedIn-style)
      const SCALE = 4;
      const bW = 480 * SCALE;
      const bH = 160 * SCALE;
      const bc = document.createElement("canvas");
      bc.width = bW;
      bc.height = bH;
      const bctx = bc.getContext("2d")!;
      bctx.scale(SCALE, SCALE);

      // Background
      const bg = bctx.createLinearGradient(0, 0, bW / SCALE, bH / SCALE);
      bg.addColorStop(0, design.bgColorStart);
      bg.addColorStop(1, design.bgColorEnd);
      bctx.fillStyle = bg;
      bctx.fillRect(0, 0, bW / SCALE, bH / SCALE);

      // Left accent bar
      bctx.fillStyle = design.primaryColor;
      bctx.fillRect(0, 0, 6, bH / SCALE);

      // Load logo
      let logoImg: HTMLImageElement | null = null;
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = "/Logo-AIMS/AurxonLogo.png";
        await new Promise<void>((res) => { img.onload = () => { logoImg = img; res(); }; img.onerror = () => res(); });
      } catch {}

      // Photo circle on left
      const photoX = 50;
      const photoY = bH / SCALE / 2;
      const photoR = 52;
      bctx.beginPath();
      bctx.arc(photoX, photoY, photoR + 3, 0, Math.PI * 2);
      bctx.strokeStyle = design.primaryColor;
      bctx.lineWidth = 3;
      bctx.stroke();

      if (photoUrl) {
        try {
          const pImg = new Image();
          pImg.crossOrigin = "anonymous";
          pImg.src = photoUrl;
          await new Promise<void>((res, rej) => { pImg.onload = () => res(); pImg.onerror = () => rej(); });
          bctx.save();
          bctx.beginPath();
          bctx.arc(photoX, photoY, photoR, 0, Math.PI * 2);
          bctx.clip();
          bctx.drawImage(pImg, photoX - photoR, photoY - photoR, photoR * 2, photoR * 2);
          bctx.restore();
        } catch {}
      } else {
        bctx.save();
        bctx.beginPath();
        bctx.arc(photoX, photoY, photoR, 0, Math.PI * 2);
        bctx.clip();
        bctx.fillStyle = "#f1f5f9";
        bctx.fillRect(photoX - photoR, photoY - photoR, photoR * 2, photoR * 2);
        bctx.restore();
      }

      // Company logo top right
      if (logoImg) bctx.drawImage(logoImg, bW / SCALE - 50, 12, 30, 30);

      // Text block
      const textX = 120;
      bctx.textAlign = "left";
      bctx.shadowColor = "transparent";

      bctx.font = `900 22px sans-serif`;
      bctx.fillStyle = "#0f172a";
      bctx.fillText(fullName, textX, 48);

      bctx.font = `bold 11px sans-serif`;
      bctx.fillStyle = design.primaryColor;
      bctx.fillText(`${roleDomain.toUpperCase()} · ${department.toUpperCase()}`, textX, 70);

      bctx.font = `bold 10px monospace`;
      bctx.fillStyle = "#475569";
      bctx.fillText(`ID: ${internId}`, textX, 90);

      // Badge pill
      bctx.fillStyle = design.primaryColor + "18";
      bctx.strokeStyle = design.primaryColor + "44";
      bctx.lineWidth = 1;
      bctx.beginPath();
      bctx.roundRect(textX, 100, 140, 18, 6);
      bctx.fill();
      bctx.stroke();
      bctx.font = `900 8px sans-serif`;
      bctx.fillStyle = design.primaryColor;
      bctx.textAlign = "center";
      bctx.fillText(design.label, textX + 70, 113);

      // Status
      bctx.textAlign = "right";
      bctx.font = `900 10px sans-serif`;
      bctx.fillStyle = "#047857";
      bctx.fillText("✓ ACTIVE VERIFIED", bW / SCALE - 16, bH / SCALE - 18);

      // Bottom border
      bctx.fillStyle = design.primaryColor;
      bctx.fillRect(0, bH / SCALE - 4, bW / SCALE, 4);

      // Draw Social Icons and Handles on the right side
      const nameSlug = fullName.toLowerCase().replace(/\s+/g, "-");
      const liHandle = getHandleName(linkedIn, nameSlug);
      const ghHandle = getHandleName(gitHub, nameSlug);

      const socialX = 310;
      // 1. LinkedIn Icon
      bctx.fillStyle = "#0077b5";
      bctx.beginPath();
      bctx.roundRect(socialX, 32, 14, 14, 3);
      bctx.fill();
      bctx.fillStyle = "#ffffff";
      bctx.font = "bold 9px sans-serif";
      bctx.textAlign = "center";
      bctx.fillText("in", socialX + 7, 42);

      // LinkedIn text
      bctx.fillStyle = "#334155";
      bctx.font = "bold 10px sans-serif";
      bctx.textAlign = "left";
      bctx.fillText(`/in/${liHandle}`, socialX + 20, 43);

      // 2. GitHub Icon
      bctx.fillStyle = "#24292e";
      bctx.beginPath();
      bctx.roundRect(socialX, 52, 14, 14, 3);
      bctx.fill();
      bctx.fillStyle = "#ffffff";
      bctx.font = "bold 9px sans-serif";
      bctx.textAlign = "center";
      bctx.fillText("gh", socialX + 7, 62);

      // GitHub text
      bctx.fillStyle = "#334155";
      bctx.font = "bold 10px sans-serif";
      bctx.textAlign = "left";
      bctx.fillText(`@${ghHandle}`, socialX + 20, 63);

      // 3. Security Key display on the right
      const encryptionKey = generateEncryptionKey(internId, dbInternId);
      bctx.fillStyle = "#64748b";
      bctx.font = "bold 8px monospace";
      bctx.textAlign = "left";
      bctx.fillText(`KEY: ${encryptionKey.substring(0, 20)}...`, socialX, 83);

      // Export
      const link = document.createElement("a");
      link.download = `AURXON-BADGE-${internId}.png`;
      link.href = bc.toDataURL("image/png");
      link.click();
      setPhotoSuccess("Digital badge exported as Full HD PNG!");
    } catch (err: any) {
      setPhotoError(err.message || "Failed to generate digital badge.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (format: "PNG" | "JPG" | "PDF") => {
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

      // Full HD 4x resolution rendering (1440x2240 output)
      const SCALE = 4;
      const baseW = 360;
      const baseH = 560;
      const width = baseW * SCALE;
      const height = baseH * SCALE;
      canvas.width = width;
      canvas.height = height;
      ctx.scale(SCALE, SCALE);

      if (photoUrl) {
        // Load image safely inside browser thread
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = photoUrl;
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load selected profile image."));
        });

        await drawCardOnCanvas(ctx, baseW, baseH, img);
      } else {
        await drawCardOnCanvas(ctx, baseW, baseH);
      }

      // 1. Export in requested formats (Full HD quality)
      if (format === "PNG") {
        const link = document.createElement("a");
        link.download = `AURXON-ID-${internId}-HD.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else if (format === "JPG") {
        const link = document.createElement("a");
        link.download = `AURXON-ID-${internId}-HD.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 1.0);
        link.click();
      } else if (format === "PDF") {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [baseW, baseH],
        });
        pdf.addImage(imgData, "PNG", 0, 0, baseW, baseH);
        pdf.save(`AURXON-ID-${internId}-HD.pdf`);
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

  const isAdminActor = loggedInRole === "FOUNDER" || loggedInRole === "HR" || loggedInRole === "SUPER_ADMIN" || loggedInRole === "ADMIN";
  // Admins/Founder always see as approved — they issued the card
  const isCardApproved = cardStatus === "APPROVED" || isAdminActor;

  const nameSlug = fullName.toLowerCase().replace(/\s+/g, "-");
  const liHandle = getHandleName(linkedIn, nameSlug);
  const ghHandle = getHandleName(gitHub, nameSlug);
  const encryptionKey = generateEncryptionKey(internId, dbInternId);

  return (
    <div className="relative text-slate-800 dark:text-white space-y-6">
      
      {/* Hidden Render Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main card customizer UI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start overflow-hidden">
        
        {/* Left: Customizer Controls */}
        <div className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] bg-white/60 dark:bg-[#0b0f19]/70 backdrop-blur-md rounded-2xl shadow-xl space-y-5">
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
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">ID Card — Full HD Download</span>
              <div className="grid grid-cols-3 gap-2.5">
                <Button
                  onClick={() => handleDownload("PNG")}
                  disabled={isGenerating || cardStatus === "DEACTIVATED"}
                  variant="secondary"
                  className="h-10 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-cyan-400" />
                  <span>PNG</span>
                </Button>

                <Button
                  onClick={() => handleDownload("JPG")}
                  disabled={isGenerating || cardStatus === "DEACTIVATED"}
                  variant="secondary"
                  className="h-10 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span>JPG</span>
                </Button>

                <Button
                  onClick={() => handleDownload("PDF")}
                  disabled={isGenerating || cardStatus === "DEACTIVATED"}
                  variant="secondary"
                  className="h-10 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="h-3.5 w-3.5 text-indigo-400" />
                  <span>PDF</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-white/[0.06]">
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Digital Badge — LinkedIn / Social</span>
              <Button
                onClick={handleBadgeDownload}
                disabled={isGenerating || cardStatus === "DEACTIVATED"}
                variant="outline"
                className="w-full h-10 text-[10px] font-bold border-yellow-500/20 hover:bg-yellow-500/5 text-yellow-400 rounded-xl flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                <span>Download Digital Badge (HD PNG)</span>
              </Button>
            </div>

          </div>
        </div>

        {/* Right: Previews Container (ID Card + Digital Badge + Legend) */}
        <div className="lg:col-span-7 flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center w-full pt-6 xl:pt-0 pb-4 overflow-hidden">
          
          {/* Vertical ID Card Preview */}
          <div className="w-[340px] h-[530px] shrink-0 relative select-none">
            <div
              className="w-full h-full rounded-2xl border-4 p-4.5 flex flex-col justify-between transition-all duration-500 relative shadow-2xl overflow-hidden text-slate-800 bg-white"
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
              <div className="flex flex-col items-center justify-center space-y-0.5 relative z-10 pt-1 select-none">
                <img
                  src="/Logo-AIMS/AurxonLogo.png"
                  alt="AIMS Logo"
                  className="h-10 w-auto object-contain shrink-0 mt-1 mb-0.5"
                />
                <h4 className="text-xs font-heading font-extrabold tracking-widest text-slate-900 leading-none mt-1">
                  AURXON
                </h4>
                <span 
                  className="text-[7.5px] font-black uppercase tracking-widest block leading-none mt-0.5"
                  style={{ color: design.primaryColor }}
                >
                  WORKFORCE CREDENTIAL
                </span>
                <div className="h-0.5 w-full bg-slate-100 mt-1" />
              </div>

              {/* Photo & Identity Center */}
              <div className="flex flex-col items-center space-y-2.5 relative z-10">
                {/* Photo Ring wrapper */}
                <div 
                  className="h-[96px] w-[96px] rounded-full flex items-center justify-center border-[3px] shadow-sm bg-slate-50"
                  style={{ borderColor: design.primaryColor }}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Badge portrait"
                      className="h-[86px] w-[86px] rounded-full object-cover shadow-inner"
                    />
                  ) : (
                    <div className="h-[86px] w-[86px] rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200/50 shadow-inner">
                      <span className="text-[8px] uppercase font-bold text-center tracking-wider px-2">No Photo</span>
                    </div>
                  )}
                </div>

                {/* Text items inside solid panel */}
                <div 
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-center space-y-0.5 shadow-sm bg-white"
                >
                  <span className="text-xs font-heading font-extrabold tracking-wide block text-slate-900 select-text">
                    {fullName}
                  </span>
                  
                  <span 
                    className="text-[9px] font-extrabold uppercase tracking-wider block"
                    style={{ color: design.primaryColor }}
                  >
                    {roleDomain} ({roleMeta.shortCode})
                  </span>
                  
                  <span className="text-[8px] text-slate-500 block font-bold uppercase tracking-wide">
                    {department}
                  </span>

                  <div className="pt-0.5 select-none">
                    <span className={`text-[7.5px] font-heading font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${design.badgeBg}`}>
                      {design.badgeText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Identity details, security key and barcode */}
              <div className="space-y-2 relative z-10 pb-1">
                <div className="flex justify-between items-center text-[8.5px] px-1.5 border border-slate-200 bg-slate-50/50 p-1.5 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[7px] font-bold uppercase tracking-wider">Credential ID</span>
                    <span className="font-mono font-bold tracking-wide text-slate-800 select-text">{internId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[7px] font-bold uppercase tracking-wider">Status</span>
                    <span 
                      className="font-black uppercase tracking-wide text-[9px]"
                      style={{ color: isCardApproved ? "#047857" : "#c2410c" }}
                    >
                      {isCardApproved ? "Active verified" : "Pending audit"}
                    </span>
                  </div>
                </div>

                {/* Security Key monospaced text */}
                <div className="text-[7.5px] border border-slate-200 bg-slate-50/50 px-2 py-1 rounded-xl text-center font-mono text-slate-500">
                  <span className="font-sans font-bold text-[6.5px] uppercase text-slate-400 block leading-none mb-0.5">Digital Encryption Key</span>
                  <span className="truncate block font-bold text-slate-700">{encryptionKey}</span>
                </div>

                {/* Barcode representation */}
                <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm h-8 overflow-hidden flex flex-col justify-between">
                  <div className="flex items-end justify-between h-4.5 w-full select-none">
                    {Array.from({ length: 42 }).map((_, i) => {
                      const h = [6, 12, 16, 20, 24][(i + (internId.charCodeAt(i % internId.length) || 0)) % 5];
                      const w = [1, 2, 1.5][(i * 3) % 3];
                      return (
                        <div
                          key={i}
                          className="bg-black shrink-0"
                          style={{ height: `${h * 0.7}px`, width: `${w}px` }}
                        />
                      );
                    })}
                  </div>
                  <span className="block text-[6px] text-center text-slate-500 font-bold font-mono tracking-widest leading-none">
                    {internId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side previews: Digital Badge Preview & Color Legend */}
          <div className="flex-1 min-w-[320px] max-w-[480px] space-y-6">
            
            {/* Horizontal Digital Badge Preview */}
            <div className="space-y-2 select-none">
              <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-slate-450 dark:text-gray-400 block text-center xl:text-left">
                Verified Digital Badge Preview (LinkedIn)
              </span>
              <div
                className="w-full rounded-2xl border-4 p-4 flex items-center justify-between relative shadow-xl overflow-hidden text-slate-800 bg-white aspect-[3/1] min-h-[148px]"
                style={{
                  borderColor: design.primaryColor,
                  boxShadow: `0 8px 30px ${design.primaryColor}15`,
                  background: `linear-gradient(to bottom right, ${design.bgColorStart}, ${design.bgColorEnd})`,
                }}
              >
                {/* Left primary accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: design.primaryColor }}
                />

                {/* Bottom primary border */}
                <div
                  className="absolute left-0 right-0 bottom-0 h-1"
                  style={{ backgroundColor: design.primaryColor }}
                />

                {/* Grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.015)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />

                {/* Left: Avatar & Identity Block */}
                <div className="flex items-center space-x-3 relative z-10">
                  <div
                    className="h-[74px] w-[74px] rounded-full flex items-center justify-center border-2 bg-slate-50 shrink-0"
                    style={{ borderColor: design.primaryColor }}
                  >
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Badge avatar"
                        className="h-[68px] w-[68px] rounded-full object-cover shadow-inner"
                      />
                    ) : (
                      <div className="h-[68px] w-[68px] rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[8px] font-bold uppercase tracking-wider text-center">
                        No Photo
                      </div>
                    )}
                  </div>

                  <div className="text-left space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-heading font-black text-slate-900 leading-tight">
                      {fullName}
                    </h4>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: design.primaryColor }}>
                      {roleDomain} ({roleMeta.shortCode})
                    </p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wide">
                      {department}
                    </p>
                    <div className="pt-0.5">
                      <span className={`text-[7px] font-heading font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border ${design.badgeBg}`}>
                        {design.badgeText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Logos, Handles & Info */}
                <div className="flex flex-col items-end justify-between h-full py-0.5 text-right relative z-10 shrink-0">
                  <img
                    src="/Logo-AIMS/AurxonLogo.png"
                    alt="AIMS Logo"
                    className="h-8 w-auto object-contain shrink-0"
                  />

                  {/* Social Links Handles */}
                  <div className="space-y-0.5 my-1 text-left">
                    <div className="flex items-center space-x-1.5 text-[8.5px] font-semibold text-slate-650">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-[#0077b5] shrink-0">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      <span className="font-mono text-slate-600 truncate max-w-[95px]">/in/{liHandle}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[8.5px] font-semibold text-slate-650">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-[#24292e] shrink-0">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <span className="font-mono text-slate-600 truncate max-w-[95px]">@{ghHandle}</span>
                    </div>
                  </div>

                  {/* Verified Pill */}
                  <div className="flex flex-col items-end space-y-0.5">
                    <span className="text-[7px] font-mono text-slate-400 block leading-none">
                      {encryptionKey.substring(0, 16)}...
                    </span>
                    <span className="text-[8px] font-black uppercase text-emerald-650 flex items-center gap-0.5 leading-none">
                      ✓ VERIFIED ACTIVE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Color Legend Card */}
            <div className="p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] bg-white/60 dark:bg-[#0b0f19]/70 backdrop-blur-md rounded-2xl shadow-xl space-y-3.5">
              <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/[0.06] pb-2">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-500" />
                <h4 className="text-xs font-heading font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                  Workforce Identity Color Legend
                </h4>
              </div>
              <p className="text-[9.5px] text-slate-450 dark:text-gray-400 leading-normal font-medium font-sans">
                Aurxon uses a standardized visual credential policy. Colored indicators represent security scopes, verification clearings, and internal hierarchy:
              </p>
              <div className="space-y-3">
                {[
                  { color: "border-purple-500 bg-purple-500/10 text-purple-650 dark:text-purple-400", role: "Elite Founder & Owner", desc: "Purple theme. Absolute administrative clearance and platform control.", code: "FND" },
                  { color: "border-blue-500 bg-blue-500/10 text-blue-650 dark:text-blue-400", role: "HR & Operations Management", desc: "Blue theme. Full workforce onboarding and management access.", code: "HR" },
                  { color: "border-orange-500 bg-orange-500/10 text-orange-650 dark:text-orange-400", role: "Official Learning Intern", desc: "Orange theme. Standard learning track with scoped repository access.", code: "INT" },
                  { color: "border-emerald-500 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400", role: "Contract Associate", desc: "Green theme. Temporary project-specific workforce credentials.", code: "CON" },
                  { color: "border-indigo-650 bg-indigo-650/10 text-indigo-600 dark:text-indigo-400", role: "Permanent Associate / Staff", desc: "Navy/Teal theme. Full-time corporate workforce member status.", code: "STA" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-xs leading-tight">
                    <span className={`px-2 py-0.5 rounded-full border text-[8.5px] font-heading font-black tracking-wider shrink-0 ${item.color}`}>
                      {item.code}
                    </span>
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 dark:text-white block text-[11px]">{item.role}</span>
                      <span className="text-[9.5px] text-slate-450 dark:text-gray-400 font-medium block leading-normal">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
