"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { UploadCloud, AlertTriangle, ShieldCheck, Download, Sparkles, RefreshCw } from "lucide-react";
import { getRoleMeta } from "@/lib/roles";

interface IdCardGeneratorProps {
  fullName: string;
  internId: string;
  department: string;
  roleDomain: string;
  status: string;
  dbInternId: string; // The database primary key of the intern/employee record
}

export default function IdCardGenerator({
  fullName,
  internId,
  department,
  roleDomain,
  status,
  dbInternId,
}: IdCardGeneratorProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [theme, setTheme] = useState<"glacial" | "gold" | "matrix" | "cyber" | "orange">("orange");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roleMeta = getRoleMeta(roleDomain);

  // Fetch saved configuration on mount
  useEffect(() => {
    async function fetchSavedCard() {
      try {
        const res = await fetch(`/api/documents/id-card?internId=${dbInternId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.content) {
            if (data.content.avatarUrl) {
              setPhotoUrl(data.content.avatarUrl);
            }
            if (data.content.theme) {
              setTheme(data.content.theme);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch saved ID card badge setup:", err);
      }
    }
    if (dbInternId) {
      fetchSavedCard();
    }
  }, [dbInternId]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setPhotoSuccess(null);
    const file = e.target.files?.[0];

    if (!file) return;

    // Secure 50 KB client-side validation
    if (file.size > 50 * 1024) {
      setPhotoError("Rejected: Profile photo exceeds the secure 50 KB maximum limit. Please compress your picture.");
      setPhotoUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
        setPhotoSuccess("Photo uploaded and prepared for compliance secure compilation!");
      }
    };
    reader.onerror = () => {
      setPhotoError("Failed to read the selected photo file.");
    };
    reader.readAsDataURL(file);
  };

  const drawCardOnCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number, imgElement?: HTMLImageElement): Promise<void> => {
    return new Promise((resolve) => {
      // 1. Background Gradients & Theme Styles
      let bgGradient = ctx.createLinearGradient(0, 0, width, height);
      let borderGlow = "rgba(245, 158, 11, 0.3)";
      let textColor = "#ffffff";
      let secondaryColor = "#f59e0b"; // Orange default

      if (theme === "glacial") {
        bgGradient.addColorStop(0, "#0f172a");
        bgGradient.addColorStop(0.5, "#1e293b");
        bgGradient.addColorStop(1, "#0369a1");
        borderGlow = "rgba(56, 189, 248, 0.3)";
        secondaryColor = "#38bdf8";
      } else if (theme === "gold") {
        bgGradient.addColorStop(0, "#09090b");
        bgGradient.addColorStop(0.5, "#18181b");
        bgGradient.addColorStop(1, "#78350f");
        borderGlow = "rgba(251, 191, 36, 0.3)";
        secondaryColor = "#fbbf24";
      } else if (theme === "matrix") {
        bgGradient.addColorStop(0, "#022c22");
        bgGradient.addColorStop(1, "#000000");
        borderGlow = "rgba(52, 211, 153, 0.3)";
        secondaryColor = "#34d399";
      } else if (theme === "cyber") {
        bgGradient.addColorStop(0, "#1e1b4b");
        bgGradient.addColorStop(0.5, "#311042");
        bgGradient.addColorStop(1, "#701a75");
        borderGlow = "rgba(232, 121, 249, 0.4)";
        secondaryColor = "#e879f9";
      } else { // orange (AURXON neon amber)
        bgGradient.addColorStop(0, "#0f172a");
        bgGradient.addColorStop(0.5, "#111827");
        bgGradient.addColorStop(1, "#7c2d12");
        borderGlow = "rgba(245, 158, 11, 0.35)";
        secondaryColor = "#f97316";
      }

      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Card Border/Frame
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Subtle internal glassmorphism outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(18, 18, width - 36, height - 36);

      // 3. Draw Headers
      ctx.textAlign = "center";
      ctx.font = "900 24px sans-serif";
      ctx.fillStyle = textColor;
      ctx.fillText("AURXON Technologies", width / 2, 50);

      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = secondaryColor;
      ctx.fillText("WORKFORCE CREDENTIAL MODULE", width / 2, 70);

      // Draw horizontal line separator
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(30, 85, width - 60, 2);

      // 4. Draw Profile Picture Circle
      const centerX = width / 2;
      const centerY = 190;
      const radius = 65;

      // Draw photo background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = secondaryColor;
      ctx.stroke();

      if (imgElement) {
        // Draw the uploaded profile image clipped inside the circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgElement, centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.restore();
      } else {
        // Draw sleek avatar icon placeholder
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
        ctx.clip();
        
        // head
        ctx.beginPath();
        ctx.arc(centerX, centerY - 10, 20, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fill();
        
        // shoulders
        ctx.beginPath();
        ctx.arc(centerX, centerY + 50, 40, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fill();
        ctx.restore();
      }

      // 5. Draw Profile Data Fields
      ctx.textAlign = "center";
      
      // Full Name
      ctx.font = "900 22px sans-serif";
      ctx.fillStyle = textColor;
      ctx.fillText(fullName, width / 2, 300);

      // Department & Domain Role
      const roleMeta = getRoleMeta(roleDomain);
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = secondaryColor;
      ctx.fillText(`${roleDomain.toUpperCase()} (${roleMeta.shortCode})`, width / 2, 325);
      
      ctx.font = "500 11px sans-serif";
      ctx.fillStyle = "#94a3b8"; // Muted Slate
      ctx.fillText(department, width / 2, 343);

      ctx.font = "bold 8px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillText(roleMeta.appointmentSource.toUpperCase(), width / 2, 355);

      // Separator
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(40, 368, width - 80, 1);

      // Official Intern ID
      ctx.textAlign = "left";
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("CREDENTIAL ID", 45, 395);
      ctx.font = "mono 14px Courier";
      ctx.fillStyle = textColor;
      ctx.fillText(internId, 45, 415);

      // Status
      ctx.textAlign = "right";
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("STATUS", width - 45, 395);
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#34d399"; // Emerald active
      ctx.fillText(status === "ONBOARDING" ? "ACTIVE RECRUIT" : "ACTIVE MEMBER", width - 45, 415);

      // 6. Draw Barcode / QR Section
      // Draw simulated secure barcode
      const barcodeY = 460;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(40, barcodeY, width - 80, 45); // white card base for barcode
      
      // Draw black lines
      ctx.fillStyle = "#000000";
      let cursorX = 50;
      const barcodeWidth = width - 100;
      
      while (cursorX < width - 50) {
        const lineW = Math.floor(Math.random() * 4) + 1;
        ctx.fillRect(cursorX, barcodeY + 5, lineW, 35);
        cursorX += lineW + Math.floor(Math.random() * 5) + 1;
      }
      
      // Draw barcode numbers
      ctx.textAlign = "center";
      ctx.font = "bold 9px sans-serif";
      ctx.fillStyle = "#4b5563";
      ctx.fillText(`* ${internId} *`, width / 2, barcodeY + 50);

      // Security text
      ctx.font = "500 8.5px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillText("AURXON SECURITY PROTOCOLS ENFORCED - VERIFIED BY COMPLIANCE SHIELD", width / 2, 545);

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
          theme,
          avatarUrl: photoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save ID card.");

      setPhotoSuccess("Official corporate ID card successfully saved and compiled inside the Compliance Vault!");
    } catch (err: any) {
      setPhotoError(err.message || "Could not persist badge configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (isGenerating) return;
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

      // Instant PNG Download trigger
      const link = document.createElement("a");
      link.download = `AURXON-ID-${internId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
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

      setPhotoSuccess("Sleek digital ID card exported and downloaded successfully!");
    } catch (err: any) {
      setPhotoError(err.message || "Failed to render card onto canvas pipeline.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative select-none text-slate-800 dark:text-white space-y-6">
      
      {/* Hidden Render Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main card customizer UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left: Customizer Controls */}
        <div className="p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] bg-white/60 dark:bg-[#0b0f19]/70 backdrop-blur-md rounded-2xl shadow-xl space-y-5">
          <div className="space-y-1 border-b border-slate-200 dark:border-white/[0.06] pb-3">
            <h3 className="text-sm font-heading font-extrabold flex items-center space-x-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              <span>Digital ID Customizer</span>
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-gray-400">
              Customize theme, attach profile portrait, and export your official corporate badge.
            </p>
          </div>

          {/* Feedback alerts */}
          {photoError && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-650 dark:text-red-400 text-[10px] font-bold rounded-lg flex items-center space-x-2 animate-pulse">
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
                <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">Accepts JPG/PNG. Size limit: <span className="font-extrabold text-indigo-550 dark:text-indigo-400">Strictly ≤ 50 KB</span></p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2 pt-1">
            <label className="text-[9px] font-heading font-extrabold text-slate-500 dark:text-gray-450 uppercase tracking-widest block">
              Digital Badge Theme Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(["orange", "glacial", "gold", "matrix", "cyber"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-1 py-2 rounded-xl text-[9px] font-heading font-extrabold uppercase border tracking-wider transition-all cursor-pointer ${
                    theme === t
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-indigo-500 scale-105 shadow-md"
                      : "bg-transparent border-slate-200 dark:border-white/[0.08] hover:border-indigo-500/50 text-slate-650 dark:text-gray-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Secure compliance notice */}
          <p className="text-[9px] text-slate-400 dark:text-gray-500 leading-normal bg-slate-50 dark:bg-white/[0.01] p-3 rounded-xl border border-slate-150 dark:border-white/[0.04]">
            🔒 <span className="font-bold">COMPLIANCE VAULT PERSISTENCE:</span> To support organizational transparency, audit logs, and supervisor retrieval, your ID card configuration is securely encrypted and stored inside AURXON's compliance database services.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5">
            <Button
              onClick={handleSaveAndGenerate}
              disabled={isSaving}
              variant="outline"
              className="w-full h-11 text-xs font-bold font-heading border-indigo-500/20 hover:bg-indigo-500/5 text-indigo-500 dark:text-indigo-400 rounded-xl shadow cursor-pointer flex items-center justify-center space-x-1.5"
              isLoading={isSaving}
            >
              <Sparkles className="h-4 w-4 mr-0.5" />
              <span>Save & Compile</span>
            </Button>

            <Button
              onClick={handleDownload}
              disabled={isGenerating || isSaving}
              variant="primary"
              className="w-full h-11 text-xs font-bold font-heading bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow cursor-pointer flex items-center justify-center space-x-1.5"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{isGenerating ? "Compiling..." : "Export Badge"}</span>
            </Button>
          </div>
        </div>

        {/* Right: Modern High-Contrast Real-Time Preview Card */}
        <div className="flex justify-center items-center">
          <div
            className={`w-[290px] h-[450px] rounded-2xl border-4 p-5 flex flex-col justify-between transition-all duration-500 relative select-text shadow-2xl overflow-hidden ${
              theme === "glacial"
                ? "bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0369a1] border-sky-400/40 shadow-sky-500/10 text-white"
                : theme === "gold"
                ? "bg-gradient-to-br from-[#09090b] via-[#18181b] to-[#78350f] border-amber-400/40 shadow-amber-500/10 text-white"
                : theme === "matrix"
                ? "bg-gradient-to-br from-[#022c22] to-[#000000] border-emerald-400/40 shadow-emerald-500/10 text-white"
                : theme === "cyber"
                ? "bg-gradient-to-br from-[#1e1b4b] via-[#311042] to-[#701a75] border-fuchsia-400/40 shadow-fuchsia-500/10 text-white"
                : "bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#7c2d12] border-orange-500/40 shadow-orange-500/15 text-white"
            }`}
          >
            {/* Ambient Background Grid Overlay for premium feel */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

            {/* Header Area */}
            <div className="text-center space-y-1 relative z-10">
              <h4 className="text-sm font-heading font-extrabold tracking-widest">AURXON</h4>
              <span className={`text-[8px] font-bold uppercase tracking-widest ${
                theme === "glacial" ? "text-sky-400" : theme === "gold" ? "text-amber-400" : theme === "matrix" ? "text-emerald-400" : theme === "cyber" ? "text-fuchsia-400" : "text-orange-400"
              }`}>WORKFORCE ID CARD</span>
              <div className="h-0.5 w-full bg-white/10 mt-1" />
            </div>

            {/* Photo & Identity Center */}
            <div className="flex flex-col items-center space-y-3.5 relative z-10">
              {/* Photo Ring wrapper */}
              <div className={`h-[110px] w-[110px] rounded-full flex items-center justify-center border-2 ${
                theme === "glacial" ? "border-sky-400" : theme === "gold" ? "border-amber-400" : theme === "matrix" ? "border-emerald-400" : theme === "cyber" ? "border-fuchsia-400" : "border-orange-500"
              }`}>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Badge portrait"
                    className="h-[102px] w-[102px] rounded-full object-cover shadow-inner"
                  />
                ) : (
                  <div className="h-[102px] w-[102px] rounded-full bg-white/5 flex items-center justify-center text-white/25 border border-white/5 shadow-inner">
                    <span className="text-[10px] uppercase font-bold text-center tracking-wider px-2">No Photo Attached</span>
                  </div>
                )}
              </div>

              {/* Text items */}
              <div className="text-center space-y-1">
                <span className="text-sm font-heading font-extrabold tracking-wide block">{fullName}</span>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                  theme === "glacial" ? "text-sky-300" : theme === "gold" ? "text-amber-300" : theme === "matrix" ? "text-emerald-300" : theme === "cyber" ? "text-fuchsia-300" : "text-orange-400"
                }`}>{roleDomain} ({roleMeta.shortCode})</span>
                <div className="flex flex-col items-center space-y-1 mt-0.5">
                  <span className="text-[9px] text-slate-400/90 block font-medium uppercase tracking-wide">{department}</span>
                  <span className={`text-[7.5px] font-heading font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-white/[0.04] border-white/10 ${
                    roleMeta.appointmentSource === "Founder-appointed"
                      ? "text-amber-400"
                      : roleMeta.appointmentSource === "HR-appointed"
                      ? "text-sky-400"
                      : "text-emerald-450"
                  }`}>{roleMeta.appointmentSource}</span>
                </div>
              </div>
            </div>

            {/* Identity details and barcode */}
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center text-[10px] px-1 border-t border-white/5 pt-2">
                <div>
                  <span className="text-slate-400 block text-[8px] font-bold uppercase tracking-wider">Credential ID</span>
                  <span className="font-mono font-bold tracking-wide">{internId}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[8px] font-bold uppercase tracking-wider">Status</span>
                  <span className="font-bold text-emerald-400 uppercase tracking-wide">Verified</span>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="bg-white p-1 rounded border border-white/5 shadow-md h-9 overflow-hidden flex flex-col justify-between">
                {/* barcode lines simulated */}
                <div className="flex items-end justify-between h-5 w-full select-none">
                  {Array.from({ length: 48 }).map((_, i) => {
                    const h = [6, 12, 16, 20, 24][(i + (internId.charCodeAt(i % internId.length) || 0)) % 5];
                    const w = [1, 2, 3][(i * 3) % 3];
                    return (
                      <div
                        key={i}
                        className="bg-black shrink-0"
                        style={{ height: `${h}px`, width: `${w}px` }}
                      />
                    );
                  })}
                </div>
                <span className="block text-[7px] text-center text-slate-500 font-bold font-mono tracking-widest leading-none mt-1 select-all">
                  {internId}
                </span>
              </div>
            </div>
            
          </div>
        </div>

      </div>

    </div>
  );
}

