"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { 
  UploadCloud, 
  AlertTriangle, 
  ShieldCheck, 
  Download, 
  Sparkles, 
  RefreshCw, 
  Eye, 
  Printer, 
  RotateCcw,
  CheckCircle,
  Clock,
  Layers,
  Settings
} from "lucide-react";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
import { getRoleMeta } from "@/lib/roles";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";

interface IdCardGeneratorProps {
  fullName: string;
  internId: string;
  department: string;
  roleDomain: string;
  status: string;
  dbInternId: string;
  employmentType?: string;
  defaultPhotoUrl?: string | null;
  linkedIn?: string | null;
  gitHub?: string | null;
  instagram?: string | null;
  viewOnly?: boolean;
  overrideCardType?: "standard" | "banner" | "smart";
  overrideTheme?: string | null;
  overrideBadgeColor?: string;
  overrideThemeColor?: string;
  overrideVerificationStatus?: string;
  overrideVerificationBadgeStyle?: string;
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

// URL parser to retrieve handles
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
    panelBg: "rgba(11, 19, 43, 0.85)",
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

const getCardThemeConfig = (role: string, empType?: string, chosenTheme?: string | null) => {
  const cleanTheme = (chosenTheme || "").toLowerCase();
  if (cleanTheme.includes("glacial") || cleanTheme.includes("blue")) return PREMIUM_THEMES.glacial;
  if (cleanTheme.includes("gold") || cleanTheme.includes("yellow")) return PREMIUM_THEMES.gold;
  if (cleanTheme.includes("matrix") || cleanTheme.includes("green")) return PREMIUM_THEMES.matrix;
  if (cleanTheme.includes("cyber") || cleanTheme.includes("purple") || cleanTheme.includes("royal")) return PREMIUM_THEMES.cyber;
  if (cleanTheme.includes("orange") || cleanTheme.includes("sunset")) return PREMIUM_THEMES.orange;

  const lowerRole = (role || "").toLowerCase();
  const lowerEmp = (empType || "").toLowerCase();
  if (lowerRole.includes("founder") || lowerRole.includes("director") || lowerRole.includes("owner")) return PREMIUM_THEMES.cyber;
  if (lowerRole.includes("hr") || lowerRole.includes("human resources") || lowerRole.includes("talent")) return PREMIUM_THEMES.glacial;
  if (lowerRole.includes("intern") || lowerEmp.includes("intern")) return PREMIUM_THEMES.orange;
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
  instagram = null,
  viewOnly = false,
  overrideCardType,
  overrideTheme,
  overrideBadgeColor,
  overrideThemeColor,
  overrideVerificationStatus,
  overrideVerificationBadgeStyle,
}: IdCardGeneratorProps) {
  const { data: session } = useSession();
  const loggedInRole = (session?.user as any)?.role || "INTERN";
  const isAdminActor = loggedInRole === "FOUNDER" || loggedInRole === "HR" || loggedInRole === "SUPER_ADMIN" || loggedInRole === "ADMIN";

  const [photoUrl, setPhotoUrl] = useState<string | null>(defaultPhotoUrl || null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (overrideCardType) setCardType(overrideCardType);
  }, [overrideCardType]);

  useEffect(() => {
    if (overrideTheme) setSelectedTheme(overrideTheme);
  }, [overrideTheme]);

  useEffect(() => {
    if (overrideBadgeColor) setBadgeColor(overrideBadgeColor);
  }, [overrideBadgeColor]);

  useEffect(() => {
    if (overrideThemeColor) setThemeColor(overrideThemeColor);
  }, [overrideThemeColor]);

  useEffect(() => {
    if (overrideVerificationStatus) setVerificationStatus(overrideVerificationStatus);
  }, [overrideVerificationStatus]);

  useEffect(() => {
    if (overrideVerificationBadgeStyle) setVerificationBadgeStyle(overrideVerificationBadgeStyle);
  }, [overrideVerificationBadgeStyle]);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [cardStatus, setCardStatus] = useState<string | null>(null);
  const [cardDocId, setCardDocId] = useState<string | null>(null);
  const [cardSignature, setCardSignature] = useState<string | null>(null);

  // Card customizer fields
  const [cardType, setCardType] = useState<"standard" | "banner" | "smart">("standard");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [savedTheme, setSavedTheme] = useState<string | null>(null);
  const [badgeColor, setBadgeColor] = useState<string>("#ea580c");
  const [themeColor, setThemeColor] = useState<string>("#ea580c");
  const [verificationStatus, setVerificationStatus] = useState<string>("Pending Verification");
  const [verificationBadgeStyle, setVerificationBadgeStyle] = useState<string>("gold");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [verifiedBy, setVerifiedBy] = useState<string | null>(null);

  // Standard Card view settings
  const [isFlipped, setIsFlipped] = useState(false);

  const design = getCardThemeConfig(roleDomain, employmentType, selectedTheme || savedTheme);
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
            if (data.content.avatarUrl) setPhotoUrl(data.content.avatarUrl);
            if (data.content.theme) setSavedTheme(data.content.theme);
            if (data.content.cardType) setCardType(data.content.cardType);
            if (data.content.badgeColor) setBadgeColor(data.content.badgeColor);
            if (data.content.themeColor) setThemeColor(data.content.themeColor);
            if (data.content.verificationStatus) setVerificationStatus(data.content.verificationStatus);
            if (data.content.verificationBadgeStyle) setVerificationBadgeStyle(data.content.verificationBadgeStyle);
            if (data.content.verifiedAt) setVerifiedAt(data.content.verifiedAt);
            if (data.content.verifiedBy) setVerifiedBy(data.content.verifiedBy);
          }
        }
      } else {
        setCardStatus(null);
        setCardDocId(null);
        setCardSignature(null);
        setSavedTheme(null);
        setVerifiedAt(null);
        setVerifiedBy(null);
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
          cardType,
          badgeColor,
          themeColor,
          verificationStatus,
          verificationBadgeStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save ID card.");

      setPhotoSuccess(
        isAdminActor
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
          cardType,
          badgeColor,
          themeColor,
          verificationStatus: "Authorized & Verified",
          verificationBadgeStyle,
          notes: "Approved and signed digital ID Card badge.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve ID card.");

      setPhotoSuccess("Successfully approved, cryptographically signed, and verified this ID Card!");
      await fetchSavedCard();
    } catch (err: any) {
      setPhotoError(err.message || "Failed to approve ID card.");
    } finally {
      setIsApproving(false);
    }
  };

  // Canvas drawing routines for high-quality downloads
  const drawVerticalFrontOnCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number, pImg?: HTMLImageElement, logoImg?: HTMLImageElement, isSmart: boolean = false) => {
    // Fill Gradient Background
    let bgGradient = ctx.createLinearGradient(0, 0, width, height);
    if (isSmart) {
      bgGradient.addColorStop(0, design.bgColorStart);
      bgGradient.addColorStop(1, themeColor || design.bgColorEnd);
    } else {
      bgGradient.addColorStop(0, design.bgColorStart);
      bgGradient.addColorStop(1, design.bgColorEnd);
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Tech Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 15) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 15) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = isSmart ? (badgeColor || design.secondaryColor) : design.secondaryColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, width - 6, height - 6);

    // Accent line Top/Bottom
    ctx.fillStyle = design.primaryColor;
    ctx.fillRect(20, 14, width - 40, 3);
    ctx.fillRect(20, height - 17, width - 40, 3);

    // Brand Header
    if (logoImg) {
      ctx.drawImage(logoImg, width / 2 - 18, 22, 36, 36);
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 18px sans-serif";
    ctx.fillText("AURXON", width / 2, 74);

    ctx.font = "bold 8px sans-serif";
    ctx.fillStyle = isSmart ? (badgeColor || design.secondaryColor) : design.secondaryColor;
    ctx.fillText("OFFICIAL WORKFORCE CREDENTIAL", width / 2, 88);

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(30, 96, width - 60, 1);

    // Portrait Photo
    const cx = width / 2;
    const cy = 175;
    const radius = 54;

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    ctx.fill();
    ctx.strokeStyle = isSmart ? (badgeColor || design.secondaryColor) : design.secondaryColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (pImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(pImg, cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 24px sans-serif";
      ctx.fillText(fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(), cx, cy + 8);
    }

    // Smart chip if applicable
    if (isSmart) {
      ctx.fillStyle = "rgba(255, 215, 0, 0.85)";
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(30, 110, 28, 22, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.moveTo(38, 110); ctx.lineTo(38, 132);
      ctx.moveTo(46, 110); ctx.lineTo(46, 132);
      ctx.moveTo(30, 117); ctx.lineTo(58, 117);
      ctx.moveTo(30, 125); ctx.lineTo(58, 125);
      ctx.stroke();
    }

    // Info Glass panel
    const py = 250;
    const ph = 145;
    ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(25, py, width - 50, ph, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 16px sans-serif";
    ctx.fillText(fullName, cx, py + 26);

    ctx.font = "900 9.5px sans-serif";
    ctx.fillStyle = isSmart ? (badgeColor || design.secondaryColor) : design.secondaryColor;
    ctx.fillText(`${roleDomain.toUpperCase()} (${roleMeta.shortCode})`, cx, py + 42);

    ctx.font = "bold 9px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText(department, cx, py + 57);

    // Pill badge for verification
    ctx.fillStyle = isSmart ? `${badgeColor}1c` : `${design.primaryColor}1a`;
    ctx.strokeStyle = isSmart ? `${badgeColor}33` : `${design.secondaryColor}33`;
    ctx.beginPath();
    ctx.roundRect(cx - 70, py + 72, 140, 18, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = "900 7px sans-serif";
    ctx.fillStyle = isSmart ? (badgeColor || design.secondaryColor) : design.secondaryColor;
    const displayStatus = cardStatus === "APPROVED" ? "AUTHORIZED & VERIFIED" : verificationStatus.toUpperCase();
    ctx.fillText(displayStatus, cx, py + 83);

    // Metadata lines
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(40, py + 98, width - 80, 1);

    ctx.textAlign = "left";
    ctx.font = "900 7px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("CREDENTIAL ID", 40, py + 112);
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(internId, 40, py + 124);

    ctx.textAlign = "right";
    ctx.font = "900 7px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("VERIFICATION", width - 40, py + 112);
    ctx.font = "900 8.5px sans-serif";
    const verified = cardStatus === "APPROVED";
    ctx.fillStyle = verified ? "#10b981" : "#f59e0b";
    ctx.fillText(verified ? (verificationBadgeStyle || "GOLD").toUpperCase() : "PENDING", width - 40, py + 124);

    // Barcode Container
    const barY = 408;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(35, barY, width - 70, 42, 6);
    ctx.fill();
    ctx.fillStyle = "#000000";
    let curX = 45;
    let count = 0;
    while (curX < width - 45) {
      const lineW = [1.5, 2.5, 1, 3.5][(count + internId.charCodeAt(count % internId.length)) % 4];
      ctx.fillRect(curX, barY + 4, lineW, 25);
      curX += lineW + [1.5, 2][(count * 2) % 2];
      count++;
    }
    ctx.textAlign = "center";
    ctx.font = "bold 7px monospace";
    ctx.fillText(`* ${internId} *`, width / 2, barY + 36);

    // Verifier stamp on bottom
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.font = "bold 6px monospace";
    ctx.fillText(`KEY: ${generateEncryptionKey(internId, dbInternId)}`, width / 2, height - 34);

    ctx.font = "bold 6px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillText("AURXON SECURE IDENTITY GATE - COMPLIANCE VERIFIED", width / 2, height - 24);

    if (verified) {
      ctx.font = "500 5.5px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(cardSignature || `SIGNED BY FOUNDER · DATE: ${new Date(verifiedAt || Date.now()).toLocaleDateString()}`, width / 2, height - 12);
    } else {
      ctx.font = "bold 6.5px sans-serif";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("⚠️ PENDING FINAL SIGNATURE GATE", width / 2, height - 12);
    }
  };

  const drawVerticalBackOnCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number, logoImg?: HTMLImageElement) => {
    // Fill Background
    let bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, design.bgColorStart);
    bgGradient.addColorStop(1, design.bgColorEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Outer border
    ctx.strokeStyle = design.secondaryColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, width - 6, height - 6);

    // Magnetic Strip
    ctx.fillStyle = "#111116";
    ctx.fillRect(0, 40, width, 45);
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.fillRect(0, 42, width, 4);

    // Terms and conditions
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "900 7.5px sans-serif";
    ctx.fillText("TERMS OF IDENTITY COMPLIANCE", 25, 115);

    ctx.font = "500 7px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    const rules = [
      "1. This card is properties of Aurxon DB Systems.",
      "2. Show pass inside AIMS controlled workspaces.",
      "3. NDA guidelines are active on this credential.",
      "4. Reported loss triggers key deactivation.",
      "5. Misuse is transactionally logged for audit."
    ];
    rules.forEach((rule, idx) => {
      ctx.fillText(rule, 25, 132 + idx * 10);
    });

    // Technical Scanner zone
    const boxY = 195;
    const boxH = 110;
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.roundRect(20, boxY, width - 40, boxH, 8);
    ctx.fill();
    ctx.stroke();

    // Mock QR Code block
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(35, boxY + 15, 80, 80);
    ctx.fillStyle = "#000000";
    ctx.fillRect(41, boxY + 21, 22, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(44, boxY + 24, 16, 16);
    ctx.fillStyle = "#000000";
    ctx.fillRect(47, boxY + 27, 10, 10);

    ctx.fillRect(87, boxY + 21, 22, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(90, boxY + 24, 16, 16);
    ctx.fillStyle = "#000000";
    ctx.fillRect(93, boxY + 27, 10, 10);

    ctx.fillRect(41, boxY + 67, 22, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(44, boxY + 70, 16, 16);
    ctx.fillStyle = "#000000";
    ctx.fillRect(47, boxY + 73, 10, 10);

    // Dynamic QR dots
    ctx.fillRect(67, boxY + 21, 10, 10);
    ctx.fillRect(77, boxY + 31, 10, 10);
    ctx.fillRect(67, boxY + 47, 20, 10);
    ctx.fillRect(87, boxY + 47, 10, 10);
    ctx.fillRect(87, boxY + 67, 10, 20);

    // Contact Details
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "800 6.5px sans-serif";
    ctx.fillText("EMERGENCY HOTLINE", 130, boxY + 30);
    ctx.font = "bold 9.5px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("+91 83490-53536", 130, boxY + 42);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "800 6.5px sans-serif";
    ctx.fillText("OFFICIAL EMAIL", 130, boxY + 65);
    ctx.font = "bold 8.5px monospace";
    ctx.fillStyle = design.secondaryColor;
    ctx.fillText("support@aurxon.com", 130, boxY + 77);

    // Signatures
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(25, 360, 130, 1);
    ctx.textAlign = "left";
    ctx.font = "bold 6.5px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillText("AUTHORIZED SIGNATURE", 25, 372);

    // Draw cursive vector signature path
    ctx.strokeStyle = design.secondaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, 348);
    ctx.bezierCurveTo(45, 335, 55, 335, 65, 350);
    ctx.bezierCurveTo(75, 362, 85, 320, 95, 345);
    ctx.bezierCurveTo(105, 355, 115, 340, 125, 348);
    ctx.stroke();

    // Biometric scanner mock
    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    ctx.roundRect(190, 325, 105, 58, 6);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = "bold 6.5px sans-serif";
    ctx.fillText("SECURE BIOMETRIC", 242, 345);
    ctx.fillText("HARDWARE OK", 242, 355);

    // Stamp
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 420); ctx.lineTo(width - 20, 420);
    ctx.stroke();
    ctx.font = "bold 7px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillText("AURXON SECURE GLOBAL AUDIT GATEWAYS", width / 2, 442);
    ctx.font = "500 6px monospace";
    ctx.fillText("AIMS v3.4 // COMPLIANT SECURE PASS", width / 2, 454);
  };

  const drawHorizontalBannerOnCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number, pImg?: HTMLImageElement, logoImg?: HTMLImageElement) => {
    // Fill Gradient Background
    let bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, design.bgColorStart);
    bgGradient.addColorStop(1, design.bgColorEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = design.secondaryColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Left Bar decoration
    ctx.fillStyle = design.primaryColor;
    ctx.fillRect(0, 0, 8, height);

    // Photo circle
    const px = 50;
    const py = height / 2;
    const pr = 48;

    ctx.beginPath();
    ctx.arc(px, py, pr + 3, 0, Math.PI * 2);
    ctx.strokeStyle = design.secondaryColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (pImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(pImg, px - pr, py - pr, pr * 2, pr * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Logo image top right
    if (logoImg) {
      ctx.drawImage(logoImg, width - 50, 12, 30, 30);
    }

    // Details Text
    const tx = 115;
    ctx.textAlign = "left";

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 20px sans-serif";
    ctx.fillText(fullName, tx, 44);

    ctx.fillStyle = design.secondaryColor;
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(`${roleDomain.toUpperCase()} · ${department.toUpperCase()}`, tx, 64);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`ID: ${internId}`, tx, 82);

    // Verification Pill
    ctx.fillStyle = `${design.primaryColor}1a`;
    ctx.strokeStyle = `${design.secondaryColor}33`;
    ctx.beginPath();
    ctx.roundRect(tx, 92, 140, 16, 5);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = design.secondaryColor;
    ctx.font = "900 7px sans-serif";
    const statusText = cardStatus === "APPROVED" ? "AUTHORIZED & VERIFIED" : verificationStatus.toUpperCase();
    ctx.fillText(statusText, tx + 70, 102);

    // Social Links on the right
    const rx = 310;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "bold 9px sans-serif";

    const liText = `/in/${getHandleName(linkedIn, fullName.toLowerCase().replace(/\s+/g, "-"))}`;
    const ghText = `@${getHandleName(gitHub, fullName.toLowerCase().replace(/\s+/g, "-"))}`;
    const igText = instagram ? `@${getHandleName(instagram, fullName.toLowerCase().replace(/\s+/g, "-"))}` : null;

    ctx.fillText(liText, rx, 40);
    ctx.fillText(ghText, rx, 58);
    if (igText) {
      ctx.fillText(igText, rx, 76);
    }

    // Key
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "bold 7px monospace";
    ctx.fillText(`KEY: ${generateEncryptionKey(internId, dbInternId).substring(0, 18)}...`, rx, igText ? 94 : 76);

    // Verification Status right-bottom
    ctx.textAlign = "right";
    const verified = cardStatus === "APPROVED";
    ctx.fillStyle = verified ? "#10b981" : "#f59e0b";
    ctx.font = "900 9px sans-serif";
    ctx.fillText(verified ? "✓ VERIFIED ACTIVE" : "⏱ PENDING AUDIT", width - 16, height - 16);
  };

  const handleDownload = async (format: "PNG" | "JPG" | "PDF", side: "front" | "back" = "front") => {
    if (cardStatus === "DEACTIVATED") {
      setPhotoError("Compliance Suspension: This identity credential has been deactivated and exports are permanently locked.");
      return;
    }
    
    const isApproved = cardStatus === "APPROVED";
    if (!isApproved && !isAdminActor) {
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
      const isBanner = cardType === "banner";
      
      const baseW = isBanner ? 480 : 320;
      const baseH = isBanner ? 160 : 480;

      canvas.width = baseW * SCALE;
      canvas.height = baseH * SCALE;
      ctx.scale(SCALE, SCALE);

      // Preload images safely
      let pImg: HTMLImageElement | undefined;
      if (photoUrl) {
        pImg = new Image();
        pImg.crossOrigin = "anonymous";
        pImg.src = photoUrl;
        await new Promise<void>((resolve, reject) => {
          pImg!.onload = () => resolve();
          pImg!.onerror = () => reject(new Error("Failed to load selected profile image."));
        });
      }

      let logoImg: HTMLImageElement | undefined;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/Logo-AIMS/AurxonLogo.png";
      await new Promise<void>((resolve) => {
        img.onload = () => { logoImg = img; resolve(); };
        img.onerror = () => resolve();
      });

      if (isBanner) {
        drawHorizontalBannerOnCanvas(ctx, baseW, baseH, pImg, logoImg);
      } else {
        if (side === "front") {
          drawVerticalFrontOnCanvas(ctx, baseW, baseH, pImg, logoImg, cardType === "smart");
        } else {
          drawVerticalBackOnCanvas(ctx, baseW, baseH, logoImg);
        }
      }

      if (format === "PNG") {
        const link = document.createElement("a");
        link.download = `AURXON-ID-${internId}-${side.toUpperCase()}-HD.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else if (format === "JPG") {
        const link = document.createElement("a");
        link.download = `AURXON-ID-${internId}-${side.toUpperCase()}-HD.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 1.0);
        link.click();
      } else if (format === "PDF") {
        if (cardType === "standard") {
          // Double sided PDF
          const imgFront = canvas.toDataURL("image/png");
          
          // Render back side to canvas
          ctx.clearRect(0, 0, baseW, baseH);
          drawVerticalBackOnCanvas(ctx, baseW, baseH, logoImg);
          const imgBack = canvas.toDataURL("image/png");

          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "px",
            format: [baseW, baseH]
          });
          pdf.addImage(imgFront, "PNG", 0, 0, baseW, baseH);
          pdf.addPage();
          pdf.addImage(imgBack, "PNG", 0, 0, baseW, baseH);
          pdf.save(`AURXON-ID-${internId}-DOUBLE-SIDED-HD.pdf`);
        } else {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({
            orientation: isBanner ? "landscape" : "portrait",
            unit: "px",
            format: [baseW, baseH]
          });
          pdf.addImage(imgData, "PNG", 0, 0, baseW, baseH);
          pdf.save(`AURXON-ID-${internId}-${cardType.toUpperCase()}-HD.pdf`);
        }
      }

      try {
        await fetch("/api/documents/id-card/log-download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ internId: dbInternId }),
        });
      } catch {}

      setPhotoSuccess(`Digital asset successfully exported as ${format}!`);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to render card onto canvas pipeline.");
    } finally {
      setIsGenerating(false);
    }
  };

  const nameSlug = fullName.toLowerCase().replace(/\s+/g, "-");
  const liHandle = getHandleName(linkedIn, nameSlug);
  const ghHandle = getHandleName(gitHub, nameSlug);
  const igHandle = instagram ? getHandleName(instagram, nameSlug) : null;
  const encryptionKey = generateEncryptionKey(internId, dbInternId);
  const isApproved = cardStatus === "APPROVED";

  return (
    <div className="relative text-slate-800 dark:text-white w-full">
      {/* Dynamic stylesheet injection for isolated CSS 3D Flipping Card */}
      <style>{`
        .flip-card {
          background-color: transparent;
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>
      
      {/* Hidden Render Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <div className={cn("grid grid-cols-1 gap-6 items-start overflow-hidden", viewOnly ? "lg:grid-cols-1" : "lg:grid-cols-12")}>
        
        {/* Left: Customizer Controls (Only when not viewOnly) */}
        {!viewOnly && (
          <div className="lg:col-span-5 p-5 sm:p-6 border border-slate-250 dark:border-white/[0.08] bg-white/60 dark:bg-[#0b0f19]/70 backdrop-blur-md rounded-2xl shadow-xl space-y-5">
            <div className="space-y-1 border-b border-slate-200 dark:border-white/[0.06] pb-3">
              <h3 className="text-sm font-heading font-extrabold flex items-center space-x-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
                <span>Sleek ID Card Customizer</span>
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-gray-400">
                Configure card layout style, theme colors, attach portrait photo, and request verifications.
              </p>
            </div>

            {/* Alerts */}
            {photoError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-lg flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-550 shrink-0" />
                <span>{photoError}</span>
              </div>
            )}
            {photoSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 dark:border-emerald-500/20 text-emerald-655 dark:text-emerald-450 text-[10px] font-bold rounded-lg flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{photoSuccess}</span>
              </div>
            )}

            {/* 1. Layout Type Choice */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-heading font-extrabold text-slate-500 dark:text-gray-450 uppercase tracking-widest block">
                ID Card Layout Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["standard", "banner", "smart"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCardType(t)}
                    className={cn(
                      "h-8 rounded-lg text-[9px] font-bold uppercase transition-all border flex items-center justify-center space-x-1",
                      cardType === t
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-650 dark:text-gray-400"
                    )}
                  >
                    <span>{t === "standard" ? "Standard (2-Sided)" : t === "banner" ? "Digital Banner" : "Smart (Chip)"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Photo Upload */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-heading font-extrabold text-slate-500 dark:text-gray-450 uppercase tracking-widest block">
                Profile Portrait Attachment
              </label>
              <div className="relative border border-dashed border-slate-250 dark:border-white/10 rounded-xl p-4 bg-slate-50/50 dark:bg-[#0c1220] hover:bg-slate-100 dark:hover:bg-[#0f172a] transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-2">
                <UploadCloud className="h-8 w-8 text-indigo-550 dark:text-indigo-400" />
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

            {/* 3. Theme styles */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-heading font-extrabold text-slate-500 dark:text-gray-450 uppercase tracking-widest block">
                Corporate Theme Color
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(["glacial", "gold", "matrix", "cyber", "orange"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTheme(t)}
                    className={cn(
                      "h-7 rounded-md text-[8px] font-bold uppercase transition-all border flex items-center justify-center",
                      (selectedTheme || savedTheme || "glacial") === t
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-650 dark:text-gray-400"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Smart Chip Card customizations (Only for smart type + Admin) */}
            {cardType === "smart" && (
              <div className="p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02] space-y-3.5">
                <span className="text-[9px] font-heading font-bold text-indigo-400 uppercase tracking-widest block flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  Smart Card Dynamic Styling
                </span>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[8.5px] text-muted-foreground font-bold uppercase block">Badge Color</label>
                    <input
                      type="color"
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value)}
                      className="h-8 w-full rounded border border-border bg-transparent p-0.5 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8.5px] text-muted-foreground font-bold uppercase block">Theme End Gradient</label>
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="h-8 w-full rounded border border-border bg-transparent p-0.5 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8.5px] text-muted-foreground font-bold uppercase block">Verification Badge Style</label>
                  <select
                    value={verificationBadgeStyle}
                    onChange={(e) => setVerificationBadgeStyle(e.target.value)}
                    className="w-full text-xs rounded border border-border bg-background p-1.5 text-foreground cursor-pointer focus:outline-none"
                  >
                    <option value="gold">Gold Emblem Verified</option>
                    <option value="silver">Silver Shield Verified</option>
                    <option value="emerald">Emerald Neon Verified</option>
                  </select>
                </div>
              </div>
            )}

            {/* Administrative verify / approve action */}
            {!isApproved && cardStatus === "PENDING" && isAdminActor && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">Verification Approvals Audit</h4>
                    <p className="text-[9px] text-gray-400 leading-normal">
                      Inspect the dynamic preview on the right. Press compile & approve below to cryptographically sign and lock this workforce credential.
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
                  <span>{isApproving ? "Authenticating Card..." : "Verify & Approve Card"}</span>
                </Button>
              </div>
            )}

            {!isApproved && !isAdminActor && (
              <div className="p-4 rounded-xl border border-red-500/25 bg-red-500/5 flex items-start space-x-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Awaiting Administrator Review</h4>
                  <p className="text-[9px] text-red-300 leading-normal">
                    This card is currently pending approval. Watermarks and warnings will clear automatically once verified by Founder (Karan Mishra) or HR.
                  </p>
                </div>
              </div>
            )}

            {/* Customized action buttons */}
            <div className="space-y-3.5 pt-2 border-t border-slate-200 dark:border-white/[0.06]">
              <Button
                onClick={handleSaveAndGenerate}
                disabled={isSaving || cardStatus === "DEACTIVATED"}
                variant="outline"
                className="w-full h-10 text-xs font-bold font-heading border-indigo-500/20 hover:bg-indigo-500/5 text-indigo-500 dark:text-indigo-400 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                isLoading={isSaving}
              >
                <Sparkles className="h-4 w-4" />
                <span>Compile & Save Configuration</span>
              </Button>

              <div className="space-y-2">
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">HD Render Export</span>
                
                {cardType === "standard" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleDownload("PNG", "front")}
                      disabled={isGenerating || cardStatus === "DEACTIVATED"}
                      variant="secondary"
                      className="h-10 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Front PNG</span>
                    </Button>
                    <Button
                      onClick={() => handleDownload("PNG", "back")}
                      disabled={isGenerating || cardStatus === "DEACTIVATED"}
                      variant="secondary"
                      className="h-10 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Back PNG</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleDownload("PNG", "front")}
                    disabled={isGenerating || cardStatus === "DEACTIVATED"}
                    variant="secondary"
                    className="w-full h-10 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Download HD PNG</span>
                  </Button>
                )}

                <Button
                  onClick={() => handleDownload("PDF", "front")}
                  disabled={isGenerating || cardStatus === "DEACTIVATED"}
                  variant="outline"
                  className="w-full h-10 text-[10px] font-bold border-indigo-500/20 hover:bg-indigo-500/5 text-indigo-400 rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Download Print PDF {cardType === "standard" && "(2 Pages)"}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Right: ID Card Previews Panel */}
        <div className={cn("flex flex-col items-center justify-center space-y-5 w-full pt-4", viewOnly ? "lg:col-span-1" : "lg:col-span-7")}>
          
          {/* Card Style preview header */}
          <div className="flex items-center justify-between w-full max-w-[320px] select-none bg-slate-900/40 p-2 rounded-xl border border-white/[0.04]">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest pl-2">Live Rendering</span>
            {cardType === "standard" && (
              <Button
                size="sm"
                onClick={() => setIsFlipped(!isFlipped)}
                variant="outline"
                className="h-6 px-2.5 text-[8.5px] font-bold border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-400 rounded-md flex items-center space-x-1"
              >
                <RotateCcw className="h-3 w-3 shrink-0" />
                <span>{isFlipped ? "Show Front" : "Flip to Back"}</span>
              </Button>
            )}
            {cardType === "banner" && (
              <span className="text-[8px] bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Mobile Banner</span>
            )}
            {cardType === "smart" && (
              <span className="text-[8px] bg-purple-950/40 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Smart Chip</span>
            )}
          </div>

          {/* 3D Flipping Card for Standard */}
          {cardType === "standard" && (
            <div className="w-[310px] h-[465px] shrink-0 relative select-none flip-card" style={{ transformStyle: "preserve-3d" }}>
              <div className={cn("w-full h-full flip-card-inner transition-transform duration-500", isFlipped && "flipped")}>
                
                {/* Standard FRONT */}
                <div className="flip-card-front w-full h-full rounded-2xl border-4 p-4.5 flex flex-col justify-between transition-all duration-500 relative shadow-2xl overflow-hidden text-white"
                  style={{
                    borderColor: design.secondaryColor,
                    boxShadow: `0 10px 30px ${design.primaryColor}1a`,
                    background: `linear-gradient(to bottom right, ${design.bgColorStart}, ${design.bgColorEnd})`,
                  }}
                >
                  <div className="absolute top-4 left-5 right-5 h-[3px] rounded-full z-20" style={{ backgroundColor: design.primaryColor }} />
                  <div className="absolute bottom-4 left-5 right-5 h-[3px] rounded-full z-20" style={{ backgroundColor: design.primaryColor }} />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

                  {/* Header */}
                  <div className="flex flex-col items-center justify-center space-y-0.5 relative z-10 pt-1">
                    <img src="/Logo-AIMS/AurxonLogo.png" alt="Logo" className="h-8 w-auto object-contain shrink-0 mt-1" />
                    <h4 className="text-xs font-heading font-extrabold tracking-widest text-white leading-none mt-1">AURXON</h4>
                    <span className="text-[7.5px] font-black uppercase tracking-widest block leading-none mt-0.5" style={{ color: design.secondaryColor }}>
                      WORKFORCE CREDENTIAL
                    </span>
                    <div className="h-[1px] w-full bg-white/10 mt-1.5" />
                  </div>

                  {/* Photo & Ring */}
                  <div className="flex flex-col items-center space-y-2.5 relative z-10">
                    <div className="h-[90px] w-[90px] rounded-full flex items-center justify-center border-[2.5px] shadow-sm bg-slate-950" style={{ borderColor: design.secondaryColor }}>
                      {photoUrl ? (
                        <img src={photoUrl} alt="Portrait" className="h-[80px] w-[80px] rounded-full object-cover shadow-inner" />
                      ) : (
                        <div className="h-[80px] w-[80px] rounded-full bg-slate-900 flex items-center justify-center text-slate-500 text-[9px] font-bold">No Photo</div>
                      )}
                    </div>

                    {/* Details Panel */}
                    <div className="w-full rounded-xl border border-white/[0.06] p-2.5 text-center space-y-0.5 shadow-sm bg-black/85">
                      <span className="text-xs font-heading font-extrabold tracking-wide block text-white select-text">{fullName}</span>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider block" style={{ color: design.secondaryColor }}>
                        {roleDomain} ({roleMeta.shortCode})
                      </span>
                      <span className="text-[8px] text-gray-400 block font-bold uppercase tracking-wide">{department}</span>
                      <div className="pt-0.5">
                        <span className={cn("text-[7px] font-heading font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border", design.badgeBg)}>
                          {isApproved ? "VERIFIED ACTIVE" : verificationStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div className="space-y-2 relative z-10 pb-1">
                    <div className="flex justify-between items-center text-[8.5px] px-1.5 border border-white/[0.06] bg-black/50 p-1.5 rounded-xl">
                      <div>
                        <span className="text-gray-500 block text-[6px] font-bold uppercase tracking-wider">Credential ID</span>
                        <span className="font-mono font-bold tracking-wide text-white select-text">{internId}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 block text-[6px] font-bold uppercase tracking-wider">Status</span>
                        <span className="font-black uppercase tracking-wide text-[8.5px]" style={{ color: isApproved ? "#34d399" : "#fb923c" }}>
                          {isApproved ? "Verified active" : "Pending audit"}
                        </span>
                      </div>
                    </div>
                    {/* Barcode representation */}
                    <div className="bg-white p-1 rounded-xl border border-white/10 shadow-sm h-7 overflow-hidden flex flex-col justify-between">
                      <div className="flex items-end justify-between h-4 w-full">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div key={i} className="bg-black shrink-0" style={{ height: `${[6, 12, 16, 20, 24][(i + (internId.charCodeAt(i % internId.length) || 0)) % 5] * 0.6}px`, width: `${[1, 2, 1.5][(i * 3) % 3]}px` }} />
                        ))}
                      </div>
                      <span className="block text-[6px] text-center text-slate-700 font-bold font-mono tracking-widest leading-none">{internId}</span>
                    </div>
                  </div>
                </div>

                {/* Standard BACK */}
                <div className="flip-card-back w-full h-full rounded-2xl border-4 p-4.5 flex flex-col justify-between transition-all duration-500 relative shadow-2xl overflow-hidden text-white"
                  style={{
                    borderColor: design.secondaryColor,
                    boxShadow: `0 10px 30px ${design.primaryColor}1a`,
                    background: `linear-gradient(to bottom right, ${design.bgColorStart}, ${design.bgColorEnd})`,
                  }}
                >
                  <rect className="absolute y-10 left-0 right-0 h-10 bg-[#111116] w-full" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

                  {/* Rules block */}
                  <div className="space-y-1.5 pt-12 relative z-10 text-left">
                    <span className="text-[8px] font-heading font-black text-gray-500 uppercase tracking-widest block">Terms & Rules</span>
                    <ul className="text-[6.5px] text-gray-400 space-y-1 pl-1 font-medium">
                      <li>• Card belongs to Aurxon and is strictly non-transferable.</li>
                      <li>• Displays AIMS secure verification hash on approval.</li>
                      <li>• Compliance with all internal NDA covenants is mandatory.</li>
                      <li>• In case of loss, report immediately to AIMS administration.</li>
                    </ul>
                  </div>

                  {/* QR Details */}
                  <div className="bg-black/40 border border-white/[0.06] p-2 rounded-xl flex items-center justify-between gap-3 relative z-10">
                    <div className="h-16 w-16 bg-white p-1 rounded-md shrink-0 flex flex-wrap justify-between items-center relative">
                      {/* Simple mock QR pattern */}
                      <div className="h-4.5 w-4.5 bg-black rounded" />
                      <div className="h-4.5 w-4.5 bg-black rounded" />
                      <div className="h-4.5 w-4.5 bg-black rounded" />
                      <div className="h-3 w-3 bg-black/60 rounded" />
                    </div>
                    <div className="text-left space-y-1">
                      <span className="text-[6px] font-bold text-gray-500 uppercase tracking-wider block">Security hotline</span>
                      <span className="text-[9px] font-bold font-mono text-white block">+91 83490-53536</span>
                      <span className="text-[6px] font-bold text-gray-500 uppercase tracking-wider block">Corporate email</span>
                      <span className="text-[8px] font-bold text-cyan-400 block font-mono">support@aurxon.com</span>
                    </div>
                  </div>

                  {/* Founder Signature cursive */}
                  <div className="flex justify-between items-end border-t border-white/[0.06] pt-2 pb-1 relative z-10">
                    <div className="text-left">
                      <span className="text-[5.5px] text-gray-500 block uppercase font-bold">Authorized signature</span>
                      <span className="text-[8px] font-serif italic text-white/90">Karan Mishra</span>
                      <span className="text-[5px] text-gray-500 block uppercase">Founder & CEO</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[5.5px] text-gray-550 block uppercase font-bold">Biometric</span>
                      <span className="text-[7.5px] text-emerald-400 font-extrabold block">✓ ONLINE</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Digital Banner Style Horizontal ID Card */}
          {cardType === "banner" && (
            <div className="w-full max-w-[440px] shrink-0 relative select-none">
              <div
                className="w-full rounded-2xl border-4 p-4.5 flex items-center justify-between relative shadow-xl overflow-hidden text-white aspect-[3/1] min-h-[148px]"
                style={{
                  borderColor: design.secondaryColor,
                  boxShadow: `0 8px 30px ${design.primaryColor}15`,
                  background: `linear-gradient(to bottom right, ${design.bgColorStart}, ${design.bgColorEnd})`,
                }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: design.primaryColor }} />
                <div className="absolute left-0 right-0 bottom-0 h-1" style={{ backgroundColor: design.primaryColor }} />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />

                <div className="flex items-center space-x-3.5 relative z-10">
                  <div className="h-[74px] w-[74px] rounded-full flex items-center justify-center border-2 bg-slate-950 shrink-0" style={{ borderColor: design.secondaryColor }}>
                    {photoUrl ? (
                      <img src={photoUrl} alt="Avatar" className="h-[68px] w-[68px] rounded-full object-cover" />
                    ) : (
                      <div className="h-[68px] w-[68px] rounded-full bg-slate-900 flex items-center justify-center text-slate-500 text-[8px] font-bold">No Photo</div>
                    )}
                  </div>

                  <div className="text-left space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-heading font-black text-white leading-tight">{fullName}</h4>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: design.secondaryColor }}>
                      {roleDomain} ({roleMeta.shortCode})
                    </p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wide">{department}</p>
                    <div className="pt-0.5">
                      <span className={cn("text-[6.5px] font-heading font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border", design.badgeBg)}>
                        {isApproved ? "VERIFIED ACTIVE" : verificationStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between h-full py-0.5 text-right relative z-10 shrink-0">
                  <img src="/Logo-AIMS/AurxonLogo.png" alt="AIMS Logo" className="h-7 w-auto object-contain shrink-0" />
                  
                  <div className="space-y-0.5 my-1 text-left">
                    <div className="flex items-center space-x-1.5 text-[8px] font-semibold text-gray-300">
                      <LinkedinIcon className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                      <span className="font-mono text-gray-400 truncate max-w-[95px]">/in/{liHandle}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[8px] font-semibold text-gray-300">
                      <GithubIcon className="h-2.5 w-2.5 text-purple-400 shrink-0" />
                      <span className="font-mono text-gray-400 truncate max-w-[95px]">@{ghHandle}</span>
                    </div>
                    {igHandle && (
                      <div className="flex items-center space-x-1.5 text-[8px] font-semibold text-gray-300">
                        <InstagramIcon className="h-2.5 w-2.5 text-pink-400 shrink-0" />
                        <span className="font-mono text-gray-400 truncate max-w-[95px]">@{igHandle}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-0.5">
                    <span className="text-[6.5px] font-mono text-gray-500 block leading-none">{encryptionKey.substring(0, 16)}...</span>
                    <span className="text-[7.5px] font-black uppercase text-emerald-400 flex items-center gap-0.5 leading-none">
                      ✓ {isApproved ? "VERIFIED ACTIVE" : "PENDING AUDIT"}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Digital Chip-Based Smart ID Card */}
          {cardType === "smart" && (
            <div className="w-[310px] h-[465px] shrink-0 relative select-none">
              <div
                className="w-full h-full rounded-2xl border-4 p-4.5 flex flex-col justify-between relative shadow-2xl overflow-hidden text-white"
                style={{
                  borderColor: badgeColor || design.secondaryColor,
                  boxShadow: `0 12px 36px ${badgeColor || design.primaryColor}2b`,
                  background: `linear-gradient(to bottom right, ${design.bgColorStart}, ${themeColor || design.bgColorEnd})`,
                }}
              >
                <div className="absolute top-4 left-5 right-5 h-[3px] rounded-full z-20" style={{ backgroundColor: badgeColor || design.primaryColor }} />
                <div className="absolute bottom-4 left-5 right-5 h-[3px] rounded-full z-20" style={{ backgroundColor: badgeColor || design.primaryColor }} />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

                {/* Brand Header */}
                <div className="flex flex-col items-center justify-center space-y-0.5 relative z-10 pt-1">
                  <img src="/Logo-AIMS/AurxonLogo.png" alt="Logo" className="h-8 w-auto object-contain mt-1" />
                  <h4 className="text-xs font-heading font-extrabold tracking-widest text-white leading-none mt-1">AURXON SMART</h4>
                  <span className="text-[7px] font-black uppercase tracking-widest block leading-none mt-0.5" style={{ color: badgeColor || design.secondaryColor }}>
                    CHIP-DESIGN SYSTEM PASS
                  </span>
                  <div className="h-[1px] w-full bg-white/10 mt-1.5" />
                </div>

                {/* Interactive Golden Smart Chip SVG */}
                <div className="absolute left-[30px] top-[110px] z-20 cursor-pointer hover:scale-105 transition-all">
                  <svg width="34" height="26" viewBox="0 0 34 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="34" height="26" rx="4" fill="url(#chipGrad)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                    <path d="M9 0v26M17 0v26M25 0v26M0 8.5h34M0 17.5h34" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                    <rect x="12" y="8" width="10" height="10" rx="1.5" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
                    <defs>
                      <linearGradient id="chipGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ffe69c" />
                        <stop offset="50%" stopColor="#d3a237" />
                        <stop offset="100%" stopColor="#805d15" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Profile Photo */}
                <div className="flex flex-col items-center space-y-2.5 relative z-10">
                  <div className="h-[90px] w-[90px] rounded-full flex items-center justify-center border-[2.5px] bg-slate-950" style={{ borderColor: badgeColor || design.secondaryColor }}>
                    {photoUrl ? (
                      <img src={photoUrl} alt="Portrait" className="h-[80px] w-[80px] rounded-full object-cover" />
                    ) : (
                      <div className="h-[80px] w-[80px] rounded-full bg-slate-900 flex items-center justify-center text-slate-500 text-[9px] font-bold">No Photo</div>
                    )}
                  </div>

                  {/* Info Glass Panel */}
                  <div className="w-full rounded-xl border border-white/[0.06] p-2.5 text-center space-y-0.5 shadow-sm bg-black/85">
                    <span className="text-xs font-heading font-extrabold tracking-wide block text-white select-text">{fullName}</span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider block" style={{ color: badgeColor || design.secondaryColor }}>
                      {roleDomain} ({roleMeta.shortCode})
                    </span>
                    <span className="text-[8px] text-gray-400 block font-bold uppercase tracking-wide">{department}</span>
                    
                    <div className="pt-0.5">
                      <span className={cn(
                        "text-[7px] font-heading font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border shadow-sm",
                        isApproved ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40" : "bg-amber-955/40 text-amber-300 border-amber-800/40"
                      )}>
                        {isApproved ? "AUTHORIZED & VERIFIED" : verificationStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer and dynamic tags */}
                <div className="space-y-2 relative z-10 pb-1">
                  <div className="flex justify-between items-center text-[8.5px] px-1.5 border border-white/[0.06] bg-black/50 p-1.5 rounded-xl">
                    <div className="text-left">
                      <span className="text-gray-500 block text-[6px] font-bold uppercase tracking-wider">Credential ID</span>
                      <span className="font-mono font-bold tracking-wide text-white select-text">{internId}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 block text-[6px] font-bold uppercase tracking-wider">Verifier details</span>
                      <span className="font-extrabold uppercase tracking-wide text-[7px]" style={{ color: isApproved ? "#10b981" : "#fb923c" }}>
                        {isApproved ? (verificationBadgeStyle || "GOLD").toUpperCase() : "PENDING"}
                      </span>
                    </div>
                  </div>
                  <div className="text-[7px] border border-white/[0.06] bg-black/50 px-2 py-0.5 rounded-xl text-center font-mono text-gray-400">
                    <span className="truncate block font-bold text-gray-400">{encryptionKey}</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Download buttons when in viewOnly mode */}
          {viewOnly && (
            <div className="w-full flex flex-col space-y-2 border-t border-white/[0.08] pt-4 select-none max-w-[320px]">
              <span className="text-[8.5px] font-bold text-gray-500 uppercase tracking-wider block text-center">Export Verified Assets</span>
              <div className="grid grid-cols-2 gap-2">
                {cardType === "standard" ? (
                  <>
                    <Button
                      onClick={() => handleDownload("PNG", "front")}
                      disabled={isGenerating || cardStatus === "DEACTIVATED"}
                      variant="secondary"
                      className="h-9 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1"
                    >
                      <Download className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Front PNG</span>
                    </Button>
                    <Button
                      onClick={() => handleDownload("PNG", "back")}
                      disabled={isGenerating || cardStatus === "DEACTIVATED"}
                      variant="secondary"
                      className="h-9 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Back PNG</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleDownload("PNG", "front")}
                    disabled={isGenerating || cardStatus === "DEACTIVATED"}
                    variant="secondary"
                    className="h-9 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center justify-center space-x-1 col-span-2"
                  >
                    <Download className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Download PNG</span>
                  </Button>
                )}
                
                <Button
                  onClick={() => handleDownload("PDF", "front")}
                  disabled={isGenerating || cardStatus === "DEACTIVATED"}
                  variant="outline"
                  className="h-9 text-[10px] font-bold border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center space-x-1 col-span-2 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Download PDF {cardType === "standard" && "(2 Pages)"}</span>
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
