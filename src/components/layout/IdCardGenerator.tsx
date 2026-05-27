"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { UploadCloud, AlertTriangle, ShieldCheck, Download, Sparkles, RefreshCw, Eye, Printer } from "lucide-react";
import { getRoleMeta } from "@/lib/roles";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";

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
  viewOnly?: boolean; // Toggles simplified sidebar view
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
    const clean = url.trim().replace(/\/$/, "");
    const parts = clean.split("/");
    return parts[parts.length - 1] || fallback;
  } catch {
    return fallback;
  }
};

const PREMIUM_THEMES = {
  glacial: {
    label: "ELITE GLACIAL",
    themeName: "glacial",
    primaryColor: "#3b82f6",
    secondaryColor: "#06b6d4",
    accentColor: "#06b6d4",
    techColor: "#3b82f6",
    bgColorStart: "#050811",
    bgColorEnd: "#1c2541",
    badgeBg: "bg-cyan-950/40 text-cyan-300 border border-cyan-800/40",
    panelBg: "rgba(11, 19, 43, 0.75)",
    badgeText: "VERIFIED ACTIVE",
    textColor: "#ffffff",
  },
  gold: {
    label: "IMPERIAL GOLD",
    themeName: "gold",
    primaryColor: "#f59e0b",
    secondaryColor: "#fbbf24",
    accentColor: "#fbbf24",
    techColor: "#f59e0b",
    bgColorStart: "#09090b",
    bgColorEnd: "#27272a",
    badgeBg: "bg-yellow-950/40 text-yellow-300 border border-yellow-800/40",
    panelBg: "rgba(24, 24, 27, 0.75)",
    badgeText: "VERIFIED ACTIVE",
    textColor: "#ffffff",
  },
  matrix: {
    label: "MATRIX GREEN",
    themeName: "matrix",
    primaryColor: "#10b981",
    secondaryColor: "#34d399",
    accentColor: "#34d399",
    techColor: "#10b981",
    bgColorStart: "#010702",
    bgColorEnd: "#0c1f0e",
    badgeBg: "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40",
    panelBg: "rgba(2, 44, 6, 0.75)",
    badgeText: "VERIFIED ACTIVE",
    textColor: "#ffffff",
  },
  cyber: {
    label: "CYBERPUNK PINK",
    themeName: "cyber",
    primaryColor: "#a855f7",
    secondaryColor: "#e879f9",
    accentColor: "#e879f9",
    techColor: "#a855f7",
    bgColorStart: "#0f081c",
    bgColorEnd: "#250b38",
    badgeBg: "bg-purple-950/40 text-purple-300 border border-purple-800/40",
    panelBg: "rgba(37, 11, 56, 0.75)",
    badgeText: "VERIFIED ACTIVE",
    textColor: "#ffffff",
  },
  orange: {
    label: "SUNSET ORANGE",
    themeName: "orange",
    primaryColor: "#ea580c",
    secondaryColor: "#fb923c",
    accentColor: "#fb923c",
    techColor: "#ea580c",
    bgColorStart: "#140e0a",
    bgColorEnd: "#2b1c11",
    badgeBg: "bg-orange-950/40 text-orange-300 border border-orange-800/40",
    panelBg: "rgba(43, 28, 17, 0.75)",
    badgeText: "VERIFIED ACTIVE",
    textColor: "#ffffff",
  }
};

const getCardDesign = (role: string, empType?: string, chosenTheme?: string | null) => {
  const cleanTheme = (chosenTheme || "").toLowerCase();
  
  if (cleanTheme.includes("glacial") || cleanTheme.includes("blue")) return PREMIUM_THEMES.glacial;
  if (cleanTheme.includes("gold") || cleanTheme.includes("yellow")) return PREMIUM_THEMES.gold;
  if (cleanTheme.includes("matrix") || cleanTheme.includes("green")) return PREMIUM_THEMES.matrix;
  if (cleanTheme.includes("cyber") || cleanTheme.includes("purple") || cleanTheme.includes("royal")) return PREMIUM_THEMES.cyber;
  if (cleanTheme.includes("orange") || cleanTheme.includes("sunset")) return PREMIUM_THEMES.orange;

  // Fallback to role-based mappings
  const lowerRole = (role || "").toLowerCase();
  const lowerEmp = (empType || "").toLowerCase();
  
  if (lowerRole.includes("founder") || lowerRole.includes("director") || lowerRole.includes("owner")) {
    return PREMIUM_THEMES.cyber;
  }
  if (
    lowerRole.includes("hr") || 
    lowerRole.includes("human resources") || 
    lowerRole.includes("talent") || 
    lowerRole.includes("management") || 
    lowerRole.includes("operations")
  ) {
    return PREMIUM_THEMES.glacial;
  }
  if (lowerRole.includes("intern") || lowerEmp.includes("intern")) {
    return PREMIUM_THEMES.orange;
  }
  if (lowerEmp.includes("contract")) {
    return PREMIUM_THEMES.matrix;
  }
  return PREMIUM_THEMES.glacial;
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
  viewOnly = false,
}: IdCardGeneratorProps) {
  const { data: session } = useSession();
  const loggedInRole = (session?.user as any)?.role || "INTERN";

  const [photoUrl, setPhotoUrl] = useState<string | null>(defaultPhotoUrl || null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [cardStatus, setCardStatus] = useState<string | null>(null);
  const [cardDocId, setCardDocId] = useState<string | null>(null);
  const [cardSignature, setCardSignature] = useState<string | null>(null);

  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [savedTheme, setSavedTheme] = useState<string | null>(null);

  // Tabs for viewOnly preview switcher
  const [previewTab, setPreviewTab] = useState<"card" | "badge">("card");

  const design = getCardDesign(roleDomain, employmentType, selectedTheme || savedTheme);
  const roleMeta = getRoleMeta(roleDomain);

  const fetchSavedCard = async () => {
    try {
      const res = await fetch(`/api/documents/id-card?internId=${dbInternId}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setCardStatus(data.status);
          setCardDocId(data.id);
          setCardSignature(data.signature);
          if (data.content) {
            if (data.content.avatarUrl) {
              setPhotoUrl(data.content.avatarUrl);
            }
            if (data.content.theme) {
              setSavedTheme(data.content.theme);
            }
          }
        }
      } else {
        setCardStatus(null);
        setCardDocId(null);
        setCardSignature(null);
        setSavedTheme(null);
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
            resImg();
          };
        });
      } catch (e) {
        console.warn("Canvas logo load exception:", e);
      }

      // 1. Fill Dark Base Background
      let bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, design.bgColorStart);
      bgGradient.addColorStop(1, design.bgColorEnd);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. High-Fidelity Futuristic Tech Grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Tech circular orbit guides
      ctx.strokeStyle = design.primaryColor + "15";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 30, 140, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 30, 90, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Secure Border Frame
      ctx.strokeStyle = design.secondaryColor;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, width - 6, height - 6);

      // 5. Tech Accent Bar Top and Bottom
      ctx.fillStyle = design.primaryColor;
      ctx.fillRect(20, 14, width - 40, 3);
      ctx.fillRect(20, height - 17, width - 40, 3);

      // 6. Header Section (Logo + Brand Text in White)
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      
      let textY = 46;
      let subtitleY = 65;
      let sepY = 78;

      if (logoImg) {
        const logoSize = 36;
        ctx.drawImage(logoImg, width / 2 - logoSize / 2, 18, logoSize, logoSize);
        textY = 70;
        subtitleY = 85;
        sepY = 94;
      }

      ctx.font = "900 19px sans-serif";
      ctx.fillText("AURXON", width / 2, textY);

      ctx.font = "bold 8px sans-serif";
      ctx.fillStyle = design.secondaryColor;
      ctx.fillText("OFFICIAL WORKFORCE CREDENTIAL", width / 2, subtitleY);

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(30, sepY, width - 60, 1);

      // 7. Portrait Circle and Glow
      const centerX = width / 2;
      const centerY = 175;
      const radius = 54;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = design.secondaryColor;
      ctx.stroke();

      if (imgElement) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgElement, centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.restore();
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY - 8, 18, 0, Math.PI * 2);
        ctx.fillStyle = "#475569";
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY + 40, 34, 0, Math.PI * 2);
        ctx.fillStyle = "#475569";
        ctx.fill();
        ctx.restore();
      }

      // 8. Holographic microchip
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.strokeStyle = design.secondaryColor + "33";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(30, 110, 24, 18, 4);
      ctx.fill();
      ctx.stroke();

      // 9. Info Panel (Futuristic Glassmorphic details panel)
      const panelY = 250;
      const panelHeight = 145;
      ctx.fillStyle = "rgba(10, 15, 30, 0.85)"; // Semi-opaque deep space black
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.roundRect(25, panelY, width - 50, panelHeight, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.font = "900 18px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(fullName, width / 2, panelY + 26);

      ctx.font = "900 10px sans-serif";
      ctx.fillStyle = design.secondaryColor;
      ctx.fillText(`${roleDomain.toUpperCase()} (${roleMeta.shortCode})`, width / 2, panelY + 44);
      
      ctx.font = "bold 9.5px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText(department, width / 2, panelY + 60);

      // Pill badge
      const badgeW = 140;
      const badgeH = 18;
      ctx.fillStyle = design.primaryColor + "1a";
      ctx.strokeStyle = design.secondaryColor + "33";
      ctx.beginPath();
      ctx.roundRect(width / 2 - badgeW / 2, panelY + 74, badgeW, badgeH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = "900 7.5px sans-serif";
      ctx.fillStyle = design.secondaryColor;
      ctx.fillText(design.label, width / 2, panelY + 86);

      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fillRect(40, panelY + 102, width - 80, 1);

      ctx.textAlign = "left";
      ctx.font = "900 8px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillText("CREDENTIAL ID", 40, panelY + 118);
      
      ctx.font = "bold 11.5px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(internId, 40, panelY + 131);

      ctx.textAlign = "right";
      ctx.font = "900 8px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillText("STATUS", width - 40, panelY + 118);

      const isApproved = cardStatus === "APPROVED" || isAdminActor;
      ctx.font = "900 10.5px sans-serif";
      ctx.fillStyle = isApproved ? "#34d399" : "#fb923c";
      ctx.fillText(isApproved ? "VERIFIED ACTIVE" : "PENDING AUDIT", width - 40, panelY + 131);

      // 10. Barcode (White block for perfect scanner contrast)
      const barcodeY = 408;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(35, barcodeY, width - 70, 42, 6);
      ctx.fill();
      
      ctx.fillStyle = "#000000";
      let cursorX = 45;
      const barHeight = 25;
      let count = 0;
      while (cursorX < width - 45) {
        const lineW = [1, 2, 1.5, 3][(count + internId.charCodeAt(count % internId.length)) % 4];
        ctx.fillRect(cursorX, barcodeY + 4, lineW, barHeight);
        cursorX += lineW + [1, 2, 1.5][(count * 2) % 3];
        count++;
      }
      
      ctx.textAlign = "center";
      ctx.font = "bold 7.5px monospace";
      ctx.fillStyle = "#1e293b";
      ctx.fillText(`* ${internId} *`, width / 2, barcodeY + 36);

      // 11. Digital keys and stamps
      const encryptionKey = generateEncryptionKey(internId, dbInternId);
      ctx.textAlign = "center";
      ctx.font = "bold 6.5px monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.fillText(`SECURITY KEY: ${encryptionKey}`, width / 2, height - 34);

      ctx.font = "bold 6.5px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fillText("AURXON SECURE COMPLIANCE BADGE - COMPLIANCE SHIELD ACTIVE", width / 2, height - 24);

      if (cardStatus === "DEACTIVATED") {
        ctx.font = "bold 7px sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("⚠️ COMPLIANCE DEACTIVATED / REVOKED", width / 2, height - 12);
      } else if (isApproved) {
        ctx.font = "500 6px monospace";
        ctx.fillStyle = "#ffffff";
        const sig = cardSignature || `ARXN-SIG-${internId}-${dbInternId.substring(0, 6)}`.toUpperCase();
        const cleanSig = sig.length > 55 ? sig.substring(0, 52) + "..." : sig;
        ctx.fillText(cleanSig, width / 2, height - 12);
      } else {
        ctx.font = "bold 7px sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("⚠️ UNAPPROVED CREDENTIAL DRAFT", width / 2, height - 12);
      }

      // Watermark Stamp overlay if deactivated
      if (cardStatus === "DEACTIVATED") {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.textAlign = "center";
        
        ctx.fillStyle = "rgba(254, 242, 242, 0.95)";
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-100, -14, 200, 28, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = "900 11px sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("⚠️ COMPLIANCE DEACTIVATED", 0, 4);
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
          theme: selectedTheme || design.themeName,
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
          theme: selectedTheme || design.themeName,
          notes: "Approved and signed digital ID Card badge.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve ID card.");

      setPhotoSuccess("Successfully approved, cryptographically signed, and finalized this ID Card!");
      await fetchSavedCard();
    } catch (err: any) {
      setPhotoError(err.message || "Failed to approve ID card.");
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

      // Grid overlay
      bctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      bctx.lineWidth = 1;
      for (let x = 0; x < bW / SCALE; x += 15) {
        bctx.beginPath();
        bctx.moveTo(x, 0);
        bctx.lineTo(x, bH / SCALE);
        bctx.stroke();
      }
      for (let y = 0; y < bH / SCALE; y += 15) {
        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.lineTo(bW / SCALE, y);
        bctx.stroke();
      }

      // Left bar
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
      bctx.strokeStyle = design.secondaryColor;
      bctx.lineWidth = 2.5;
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
        bctx.fillStyle = "#1e293b";
        bctx.fillRect(photoX - photoR, photoY - photoR, photoR * 2, photoR * 2);
        bctx.restore();
      }

      if (logoImg) bctx.drawImage(logoImg, bW / SCALE - 50, 12, 30, 30);

      const textX = 120;
      bctx.textAlign = "left";

      bctx.font = `900 21px sans-serif`;
      bctx.fillStyle = "#ffffff";
      bctx.fillText(fullName, textX, 48);

      bctx.font = `bold 10.5px sans-serif`;
      bctx.fillStyle = design.secondaryColor;
      bctx.fillText(`${roleDomain.toUpperCase()} · ${department.toUpperCase()}`, textX, 70);

      bctx.font = `bold 9.5px monospace`;
      bctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      bctx.fillText(`ID: ${internId}`, textX, 90);

      // Badge pill
      bctx.fillStyle = design.primaryColor + "1a";
      bctx.strokeStyle = design.secondaryColor + "33";
      bctx.lineWidth = 1;
      bctx.beginPath();
      bctx.roundRect(textX, 100, 140, 18, 6);
      bctx.fill();
      bctx.stroke();
      bctx.font = `900 8.5px sans-serif`;
      bctx.fillStyle = design.secondaryColor;
      bctx.textAlign = "center";
      bctx.fillText(design.label, textX + 70, 112);

      // Status
      bctx.textAlign = "right";
      const isApproved = cardStatus === "APPROVED" || isAdminActor;
      bctx.font = `900 9.5px sans-serif`;
      bctx.fillStyle = isApproved ? "#34d399" : "#fb923c";
      bctx.fillText(isApproved ? "✓ ACTIVE VERIFIED" : "⏱ PENDING AUDIT", bW / SCALE - 16, bH / SCALE - 18);

      bctx.fillStyle = design.primaryColor;
      bctx.fillRect(0, bH / SCALE - 4, bW / SCALE, 4);

      // Social Links
      const nameSlug = fullName.toLowerCase().replace(/\s+/g, "-");
      const liHandle = getHandleName(linkedIn, nameSlug);
      const ghHandle = getHandleName(gitHub, nameSlug);

      const socialX = 310;
      bctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      bctx.font = "bold 9.5px sans-serif";
      bctx.textAlign = "left";
      bctx.fillText(`/in/${liHandle}`, socialX, 43);
      bctx.fillText(`@${ghHandle}`, socialX, 63);

      const encryptionKey = generateEncryptionKey(internId, dbInternId);
      bctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      bctx.font = "bold 7.5px monospace";
      bctx.fillText(`KEY: ${encryptionKey.substring(0, 18)}...`, socialX, 83);

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

      const SCALE = 4;
      const baseW = 320;
      const baseH = 480;
      const width = baseW * SCALE;
      const height = baseH * SCALE;
      canvas.width = width;
      canvas.height = height;
      ctx.scale(SCALE, SCALE);

      if (photoUrl) {
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
  const isCardApproved = cardStatus === "APPROVED" || isAdminActor;

  const nameSlug = fullName.toLowerCase().replace(/\s+/g, "-");
  const liHandle = getHandleName(linkedIn, nameSlug);
  const ghHandle = getHandleName(gitHub, nameSlug);
  const encryptionKey = generateEncryptionKey(internId, dbInternId);

  // Previews container component
  const PreviewsContent = () => (
    <div className="flex flex-col items-center justify-center space-y-5 w-full">
      {/* Tab Selectors inside Previews Block for viewOnly mode */}
      {viewOnly && (
        <div className="flex bg-slate-900 border border-white/[0.08] p-1 rounded-xl w-fit mb-2">
          <button
            type="button"
            onClick={() => setPreviewTab("card")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold font-heading transition-all",
              previewTab === "card" ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white"
            )}
          >
            Identity Card
          </button>
          <button
            type="button"
            onClick={() => setPreviewTab("badge")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold font-heading transition-all",
              previewTab === "badge" ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white"
            )}
          >
            ID Badge
          </button>
        </div>
      )}

      {/* RENDER IDENTITY CARD (Vertical) */}
      {(!viewOnly || previewTab === "card") && (
        <div className="w-[310px] h-[465px] shrink-0 relative select-none">
          <div
            className="w-full h-full rounded-2xl border-4 p-4.5 flex flex-col justify-between transition-all duration-500 relative shadow-2xl overflow-hidden text-white"
            style={{
              borderColor: design.secondaryColor,
              boxShadow: `0 10px 30px ${design.primaryColor}1a`,
              background: `linear-gradient(to bottom right, ${design.bgColorStart}, ${design.bgColorEnd})`,
            }}
          >
            {cardStatus === "DEACTIVATED" && (
              <div className="absolute inset-0 z-40 bg-rose-950/20 backdrop-blur-[1.5px] flex items-center justify-center">
                <div className="bg-red-600 border-2 border-white px-3 py-1.5 rounded-lg shadow-xl -rotate-12 transform">
                  <span className="text-white text-[11px] font-heading font-black tracking-widest">
                    ⚠️ COMPLIANCE DEACTIVATED
                  </span>
                </div>
              </div>
            )}

            {/* Tech details grids */}
            <div className="absolute top-4 left-5 right-5 h-[3px] rounded-full z-20" style={{ backgroundColor: design.primaryColor }} />
            <div className="absolute bottom-4 left-5 right-5 h-[3px] rounded-full z-20" style={{ backgroundColor: design.primaryColor }} />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col items-center justify-center space-y-0.5 relative z-10 pt-1 select-none">
              <img
                src="/Logo-AIMS/AurxonLogo.png"
                alt="AIMS Logo"
                className="h-8 w-auto object-contain shrink-0 mt-1 mb-0.5"
              />
              <h4 className="text-xs font-heading font-extrabold tracking-widest text-white leading-none mt-1">
                AURXON
              </h4>
              <span className="text-[7.5px] font-black uppercase tracking-widest block leading-none mt-0.5" style={{ color: design.secondaryColor }}>
                WORKFORCE CREDENTIAL
              </span>
              <div className="h-[1px] w-full bg-white/10 mt-1" />
            </div>

            {/* Photo & Ring */}
            <div className="flex flex-col items-center space-y-2.5 relative z-10">
              <div 
                className="h-[90px] w-[90px] rounded-full flex items-center justify-center border-[2.5px] shadow-sm bg-slate-950"
                style={{ borderColor: design.secondaryColor }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Badge portrait"
                    className="h-[80px] w-[80px] rounded-full object-cover shadow-inner"
                  />
                ) : (
                  <div className="h-[80px] w-[80px] rounded-full bg-slate-900 flex items-center justify-center text-slate-500 border border-white/5 shadow-inner">
                    <span className="text-[8px] uppercase font-bold text-center tracking-wider px-2">No Photo</span>
                  </div>
                )}
              </div>

              {/* Details card body (Glassmorphic) */}
              <div className="w-full rounded-xl border border-white/[0.06] p-2.5 text-center space-y-0.5 shadow-sm bg-black/85">
                <span className="text-xs font-heading font-extrabold tracking-wide block text-white select-text">
                  {fullName}
                </span>
                
                <span className="text-[9px] font-extrabold uppercase tracking-wider block" style={{ color: design.secondaryColor }}>
                  {roleDomain} ({roleMeta.shortCode})
                </span>
                
                <span className="text-[8px] text-gray-400 block font-bold uppercase tracking-wide">
                  {department}
                </span>

                <div className="pt-0.5 select-none">
                  <span className={cn("text-[7.5px] font-heading font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border", design.badgeBg)}>
                    {design.badgeText}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer blocks */}
            <div className="space-y-2 relative z-10 pb-1">
              <div className="flex justify-between items-center text-[8.5px] px-1.5 border border-white/[0.06] bg-black/50 p-1.5 rounded-xl">
                <div>
                  <span className="text-gray-500 block text-[6.5px] font-bold uppercase tracking-wider">Credential ID</span>
                  <span className="font-mono font-bold tracking-wide text-white select-text">{internId}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block text-[6.5px] font-bold uppercase tracking-wider">Status</span>
                  <span className="font-black uppercase tracking-wide text-[8.5px]" style={{ color: isCardApproved ? "#34d399" : "#fb923c" }}>
                    {isCardApproved ? "Active verified" : "Pending audit"}
                  </span>
                </div>
              </div>

              <div className="text-[7.5px] border border-white/[0.06] bg-black/50 px-2 py-1 rounded-xl text-center font-mono text-gray-400">
                <span className="font-sans font-bold text-[6px] uppercase text-gray-500 block leading-none mb-0.5">Digital Encryption Key</span>
                <span className="truncate block font-bold text-gray-300">{encryptionKey}</span>
              </div>

              {/* Barcode (High contrast container) */}
              <div className="bg-white p-1 rounded-xl border border-white/10 shadow-sm h-7 overflow-hidden flex flex-col justify-between">
                <div className="flex items-end justify-between h-4 w-full select-none">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const h = [6, 12, 16, 20, 24][(i + (internId.charCodeAt(i % internId.length) || 0)) % 5];
                    const w = [1, 2, 1.5][(i * 3) % 3];
                    return (
                      <div
                        key={i}
                        className="bg-black shrink-0"
                        style={{ height: `${h * 0.6}px`, width: `${w}px` }}
                      />
                    );
                  })}
                </div>
                <span className="block text-[6px] text-center text-slate-700 font-bold font-mono tracking-widest leading-none">
                  {internId}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER DIGITAL BADGE (Horizontal) */}
      {(!viewOnly || previewTab === "badge") && (
        <div className="w-full max-w-[440px] shrink-0 relative select-none">
          <div
            className="w-full rounded-2xl border-4 p-4 flex items-center justify-between relative shadow-xl overflow-hidden text-white aspect-[3/1] min-h-[148px]"
            style={{
              borderColor: design.secondaryColor,
              boxShadow: `0 8px 30px ${design.primaryColor}15`,
              background: `linear-gradient(to bottom right, ${design.bgColorStart}, ${design.bgColorEnd})`,
            }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: design.primaryColor }} />
            <div className="absolute left-0 right-0 bottom-0 h-1" style={{ backgroundColor: design.primaryColor }} />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />

            <div className="flex items-center space-x-3 relative z-10">
              <div
                className="h-[70px] w-[70px] rounded-full flex items-center justify-center border-2 bg-slate-950 shrink-0"
                style={{ borderColor: design.secondaryColor }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Badge avatar"
                    className="h-[64px] w-[64px] rounded-full object-cover shadow-inner"
                  />
                ) : (
                  <div className="h-[64px] w-[64px] rounded-full bg-slate-900 flex items-center justify-center text-slate-500 text-[8px] font-bold uppercase tracking-wider text-center">
                    No Photo
                  </div>
                )}
              </div>

              <div className="text-left space-y-0.5">
                <h4 className="text-xs sm:text-sm font-heading font-black text-white leading-tight">
                  {fullName}
                </h4>
                <p className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: design.secondaryColor }}>
                  {roleDomain} ({roleMeta.shortCode})
                </p>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wide">
                  {department}
                </p>
                <div className="pt-0.5">
                  <span className={cn("text-[7px] font-heading font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border", design.badgeBg)}>
                    {design.badgeText}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end justify-between h-full py-0.5 text-right relative z-10 shrink-0">
              <img
                src="/Logo-AIMS/AurxonLogo.png"
                alt="AIMS Logo"
                className="h-7 w-auto object-contain shrink-0"
              />

              <div className="space-y-0.5 my-1 text-left">
                <div className="flex items-center space-x-1.5 text-[8.5px] font-semibold text-gray-300">
                  <span className="font-mono text-gray-400 truncate max-w-[95px]">/in/{liHandle}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[8.5px] font-semibold text-gray-300">
                  <span className="font-mono text-gray-400 truncate max-w-[95px]">@{ghHandle}</span>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-0.5">
                <span className="text-[7px] font-mono text-gray-500 block leading-none">
                  {encryptionKey.substring(0, 16)}...
                </span>
                <span className="text-[8px] font-black uppercase text-emerald-400 flex items-center gap-0.5 leading-none">
                  ✓ VERIFIED ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downloads Actions for viewOnly mode, presented cleanly underneath preview */}
      {viewOnly && (
        <div className="w-full flex flex-col space-y-2 border-t border-white/[0.08] pt-4 select-none">
          <span className="text-[8.5px] font-bold text-gray-500 uppercase tracking-wider block text-center">Export Verified Assets</span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleDownload("PNG")}
              disabled={isGenerating || cardStatus === "DEACTIVATED"}
              variant="secondary"
              className="h-9 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span>Identity PNG</span>
            </Button>
            <Button
              onClick={handleBadgeDownload}
              disabled={isGenerating || cardStatus === "DEACTIVATED"}
              variant="secondary"
              className="h-9 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5 text-yellow-400" />
              <span>Badge PNG</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative text-slate-800 dark:text-white">
      
      {/* Hidden Render Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* If viewOnly mode, render the clean centered preview block directly */}
      {viewOnly ? (
        <div className="flex flex-col items-center justify-center w-full max-w-full">
          <PreviewsContent />
        </div>
      ) : (
        /* Full Customizer Grid UI (Admin customization mode) */
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

            {/* Custom Theme Selector Grid */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-heading font-extrabold text-slate-500 dark:text-gray-450 uppercase tracking-widest block">
                Badge Theme Style
              </label>
              <div className="grid grid-cols-5 gap-1">
                {(["glacial", "gold", "matrix", "cyber", "orange"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTheme(t)}
                    className={cn(
                      "h-7 rounded-md text-[8.5px] font-bold uppercase transition-all border flex items-center justify-center",
                      (selectedTheme || savedTheme || "orange") === t
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-650 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5"
                    )}
                    title={t}
                  >
                    {t[0]}
                  </button>
                ))}
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

          {/* Right: Previews Block */}
          <div className="lg:col-span-7 flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center w-full pt-6 xl:pt-0 pb-4 overflow-hidden">
            <PreviewsContent />
          </div>
        </div>
      )}
    </div>
  );
}
