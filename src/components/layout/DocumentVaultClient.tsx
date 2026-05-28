"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import IdCardGenerator from "@/components/layout/IdCardGenerator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  FileText,
  Search,
  UploadCloud,
  CheckCircle,
  Clock,
  AlertTriangle,
  FolderOpen,
  UserCheck,
  ShieldCheck,
  Eye,
  Trash2,
  FileCheck,
  XCircle,
  HelpCircle,
  X,
  User,
  Check,
  Fingerprint,
  Edit,
  Printer,
  Barcode,
  RotateCw,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";

interface DocumentItem {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  verified: boolean;
  createdAt: string;
}

interface InternRecord {
  id: string;
  internId?: string;
  fullName: string;
  email: string;
  department: string;
  roleDomain: string;
  status: string;
  employmentType?: string;
  supervisor?: { fullName: string } | null;
  documents: DocumentItem[];
  generatedDocuments?: {
    id: string;
    type: string;
    status: string;
    approvedAt: string | null;
    signature: string | null;
    fileUrl: string | null;
    notes: string | null;
    createdAt?: string | Date | null;
    content?: any;
  }[];
}

interface DocumentVaultClientProps {
  initialInterns: InternRecord[];
  role: string;
}

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const getBlob = (q: number): Promise<Blob | null> => {
          return new Promise((resBlob) => {
            canvas.toBlob((blob) => resBlob(blob), "image/jpeg", q);
          });
        };

        const tryCompress = async (q: number): Promise<File> => {
          const blob = await getBlob(q);
          if (!blob) return file;
          if (blob.size > 100 * 1024 && q > 0.1) {
            return tryCompress(q - 0.15);
          }
          return new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
        };

        tryCompress(quality)
          .then(resolve)
          .catch(() => resolve(file));
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

const REQUIRED_DOCS = [
  { type: "OFFER_LETTER", label: "Offer Letter" },
  { type: "RESUME", label: "Resume" },
  { type: "ID_PROOF", label: "ID Proof / SSN" },
  { type: "AGREEMENT", label: "Signed Agreement" },
  { type: "CERTIFICATE", label: "Program Certificate" },
  { type: "NDA", label: "NDA (Non-Disclosure Agreement)" },
  { type: "EXPERIENCE_LETTER", label: "Experience Letter" },
  { type: "APPOINTMENT_LETTER", label: "Appointment Letter" },
  { type: "JOINING_DOCUMENTS", label: "Joining Documents" },
  { type: "OTHER_FILES", label: "Other Files / Addenda" }
];

export default function DocumentVaultClient({ initialInterns, role }: DocumentVaultClientProps) {
  const router = useRouter();
  const isSuperUser = role === "FOUNDER" || role === "HR" || role === "SUPER_ADMIN" || role === "ADMIN";
  const isFounder = role === "FOUNDER" || role === "SUPER_ADMIN";

  // Tab State
  const [activeTab, setActiveTab] = useState<"compliance" | "approvals">("compliance");

  // Currency Hook
  const { currency } = useCurrency();

  // Real-time customizer preview states (Phase 10)
  const [selectedCardType, setSelectedCardType] = useState<"standard" | "banner" | "smart">("standard");
  const [selectedCardTheme, setSelectedCardTheme] = useState<"glacial" | "gold" | "matrix" | "cyber" | "orange">("orange");
  const [selectedBadgeColor, setSelectedBadgeColor] = useState<string>("#ea580c");
  const [selectedThemeColor, setSelectedThemeColor] = useState<string>("#ea580c");
  const [selectedVerificationBadgeStyle, setSelectedVerificationBadgeStyle] = useState<string>("gold");
  const [selectedCertTheme, setSelectedCertTheme] = useState<"gold" | "glacial" | "emerald" | "royal">("gold");
  const [previewMode, setPreviewMode] = useState<"letter" | "certificate">("certificate");
  const [isDoubleSided, setIsDoubleSided] = useState<boolean>(true);

  // State Management
  const [search, setSearch] = useState("");
  const [selectedIntern, setSelectedIntern] = useState<InternRecord | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Upload States
  const [targetInternId, setTargetInternId] = useState("");
  const [docType, setDocType] = useState("OFFER_LETTER");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Approvals & Draft States
  const [selectedGeneratedDoc, setSelectedGeneratedDoc] = useState<any | null>(null);
  const [editingGeneratedDoc, setEditingGeneratedDoc] = useState<any | null>(null);
  const [editFormContent, setEditFormContent] = useState<any>({});
  const [adminModalTab, setAdminModalTab] = useState<"upload" | "generated">("upload");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedGeneratedDoc && selectedGeneratedDoc.type === "ID_CARD") {
      const content = selectedGeneratedDoc.content || {};
      setSelectedCardType(content.cardType || "standard");
      setSelectedCardTheme(content.theme || "orange");
      setSelectedBadgeColor(content.badgeColor || "#ea580c");
      setSelectedThemeColor(content.themeColor || "#ea580c");
      setSelectedVerificationBadgeStyle(content.verificationBadgeStyle || "gold");
    }
  }, [selectedGeneratedDoc]);

  // Custom high-fidelity workspace for regular enrollee Interns
  if (role === "INTERN" || role === "EMPLOYEE") {
    const myRecord = initialInterns[0];
    if (!myRecord) {
      return (
        <div className="flex items-center justify-center min-h-[45vh] text-center p-6 select-none">
          <Card className="border-amber-500/20 bg-amber-500/5 max-w-md p-6 space-y-4">
            <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto animate-pulse" />
            <h3 className="text-lg font-heading font-extrabold text-foreground">Intern Profile Link Missing</h3>
            <p className="text-xs text-muted-foreground">
              AIMS was unable to load your linked enrollee profile. Please contact the Founder or HR to establish your account.
            </p>
          </Card>
        </div>
      );
    }

    const uploadedCount = myRecord.documents.length;
    const verifiedCount = myRecord.documents.filter(d => d.verified).length;
    const myComplianceRate = Math.round((verifiedCount / REQUIRED_DOCS.length) * 100);

    const [internActionLoading, setInternActionLoading] = useState<string | null>(null);

    const handleGenerateDraftForIntern = async (type: string) => {
      setError(null);
      setSuccess(null);
      setInternActionLoading(type);

      try {
        const res = await fetch("/api/documents/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ internId: myRecord.id, type, preferredCurrency: currency }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate document draft.");

        setSuccess(`Dynamic draft for ${type.replace(/_/g, " ")} generated successfully!`);
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Could not generate document draft.");
      } finally {
        setInternActionLoading(null);
      }
    };

    // Document Upload Action
    const handleUploadForIntern = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      setLoading(true);

      if (!docType || !selectedFile) {
        setError("Please complete all upload details and attach a file.");
        setLoading(false);
        return;
      }

      let fileToUpload = selectedFile;
      if (selectedFile.type.startsWith("image/")) {
        try {
          fileToUpload = await compressImage(selectedFile);
        } catch (e) {
          console.error("Compression failed:", e);
        }
      }

      if (fileToUpload.size > 100 * 1024) {
        setError("Rejected: Selected file exceeds the strict maximum limit of 100 KB. Please compress the file.");
        setLoading(false);
        return;
      }

      const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowedTypes.includes(fileToUpload.type)) {
        setError("Rejected: Only PDF, JPEG, and PNG files are permitted for secure upload.");
        setLoading(false);
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("internId", myRecord.id);
        formData.append("type", docType);

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to upload document file.");

        setSuccess("Document file persisted successfully into secure cloud storage!");
        setSelectedFile(null);
        setIsUploadOpen(false);

        // Refresh data
        router.refresh();
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred during upload.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6 relative animate-fadeIn text-foreground">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl font-heading font-extrabold tracking-tight">
              My Compliance Vault & Credentials
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Access your official corporate credentials and upload compliance documents for verification.
            </p>
          </div>
          <Button
            onClick={() => {
              setTargetInternId(myRecord.id);
              setDocType("OFFER_LETTER");
              setIsUploadOpen(true);
            }}
            variant="primary"
            size="sm"
            className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 rounded-xl px-4 transition-all"
          >
            <UploadCloud className="h-4.5 w-4.5" />
            <span>Upload compliance file</span>
          </Button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs animate-pulse">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs">
            <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/45 bg-card/60 backdrop-blur-md p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                My Compliance Progress
              </span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-heading font-extrabold tracking-tight font-mono">
                  {myComplianceRate}%
                </span>
                <span className="text-[10px] text-muted-foreground font-bold">
                  {verifiedCount} of {REQUIRED_DOCS.length} verified
                </span>
              </div>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full mt-4 overflow-hidden border border-border/20">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${myComplianceRate}%` }}
              />
            </div>
          </Card>

          <Card className="border-border/45 bg-card/60 backdrop-blur-md p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3">
              <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                Total Files Uploaded
              </span>
              <div className="p-2 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 shrink-0">
                <FolderOpen className="h-4 w-4" />
              </div>
            </div>
            <span className="text-2xl font-heading font-extrabold mt-1 font-mono">{uploadedCount}</span>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold">Self-uploaded documents for audit</p>
          </Card>

          <Card className="border-border/45 bg-card/60 backdrop-blur-md p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3">
              <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                Audit Status
              </span>
              <div className="p-2 rounded bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Clock className="h-4 w-4 shrink-0" />
              </div>
            </div>
            <span className="text-base font-heading font-extrabold mt-1 uppercase tracking-wide">
              {uploadedCount === verifiedCount && verifiedCount > 0 ? "UP TO DATE" : "AWAITING AUDIT"}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold">
              {uploadedCount - verifiedCount} files pending supervisor audit
            </p>
          </Card>
        </div>

        {/* Double Column Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Verified Credentials (3/5 width) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-border/45 bg-card/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
              <CardHeader className="border-b border-border/40 bg-secondary/10">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <span>Verified Corporate Credentials</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Official documents digitally signed and certified by the Founder.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {["OFFER_LETTER", "NDA", "AGREEMENT", "ID_CARD", "EXPERIENCE_LETTER"].map((type) => {


                  const existing = (myRecord.generatedDocuments || []).find((d) => d.type === type);
                  const isApproved = existing?.status === "APPROVED";
                  const isHired = myRecord.status === "ACTIVE" || myRecord.status === "COMPLETED" || myRecord.employmentType === "PERMANENT" || myRecord.employmentType === "CONTRACT";

                  return (
                    <div
                      key={type}
                      className={cn(
                        "p-4 rounded-xl border transition-all duration-300 flex flex-col space-y-4",
                        isApproved
                          ? "bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/25 hover:border-emerald-500/40"
                          : existing
                          ? "bg-secondary/5 border-border/40"
                          : "bg-secondary/5 border-dashed border-border/40"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] font-heading font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                            AURXON OFFICIAL CREDENTIAL
                          </span>
                          <h4 className="text-sm font-bold">{type.replace(/_/g, " ")}</h4>
                          {existing && (
                            <p className="text-[10px] text-muted-foreground">
                              Issued {formatDate(existing.approvedAt || existing.createdAt || new Date())}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0">
                          {isApproved ? (
                            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wide">
                              <CheckCircle className="h-3 w-3" />
                              <span>Approved & Signed</span>
                            </div>
                          ) : existing ? (
                            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wide">
                              <Clock className="h-3 w-3 animate-pulse" />
                              <span>Awaiting Founder Signature</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-secondary border border-border/45 text-muted-foreground text-[10px] font-extrabold uppercase tracking-wide">
                              <span>Not Issued</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {isApproved ? (
                        <>
                          <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-3.5 space-y-1 select-text">
                            <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-heading font-extrabold text-[10px] uppercase tracking-wider">
                              <ShieldCheck className="h-4 w-4 shrink-0" />
                              <span>AURXON Compliance Shield Verified</span>
                            </div>
                            <p className="text-[10px]">
                              Digitally Approved & Signed by Founder
                            </p>
                            <span className="block text-[8.5px] font-mono text-cyan-600 dark:text-cyan-400 break-all leading-none mt-1 select-all">
                              {existing.signature}
                            </span>
                          </div>

                          <div className="flex items-center justify-end space-x-3 pt-2">
                            <Button
                              onClick={() => setSelectedGeneratedDoc({
                                ...existing,
                                intern: {
                                  id: myRecord.id,
                                  fullName: myRecord.fullName,
                                  internId: myRecord.internId,
                                  department: myRecord.department,
                                  roleDomain: myRecord.roleDomain,
                                  email: myRecord.email,
                                }
                              })}
                              size="sm"
                              variant="primary"
                              className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 border border-white/5 rounded-xl transition-all shadow-md select-none"
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              <span>View & Download Credential</span>
                            </Button>
                          </div>
                        </>
                      ) : isHired ? (
                        <div className="space-y-3">
                          <div className="bg-cyan-500/[0.03] border border-cyan-500/10 rounded-xl p-3.5 text-xs text-foreground/90 leading-relaxed">
                            <span className="font-bold text-cyan-600 dark:text-cyan-400 block mb-1">🎉 Hired Status Confirmed!</span>
                            As a hired specialist, you possess the operational power to draft your own official {type.replace(/_/g, " ")}. Click below to compile the dynamic draft for Founder review.
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleGenerateDraftForIntern(type)}
                              size="sm"
                              variant="primary"
                              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border border-white/5 rounded-xl transition-all shadow-md select-none"
                              isLoading={internActionLoading === type}
                            >
                              <span>{existing ? "Recompile Draft" : "Compile Draft"}</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-secondary/5 border border-dashed border-border/40 rounded-xl p-3.5 text-center text-xs text-muted-foreground italic">
                          This document is locked and will be generated automatically with dynamic signatures once the Founder approves your learning seat.
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right: Compliance Document Locker checklist (2/5 width) */}
          <div className="lg:col-span-2">
            <Card className="border-border/45 bg-card/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
              <CardHeader className="border-b border-border/40 bg-secondary/10 p-4">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <FolderOpen className="h-5 w-5 text-cyan-500" />
                  <span>Compliance Checklist</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Upload files required for certification and compliance.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {REQUIRED_DOCS.map((req) => {
                  const doc = myRecord.documents.find((d) => d.type === req.type);
                  
                  return (
                    <div
                      key={req.type}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/5 border border-border/20 hover:bg-secondary/10 transition-all"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-xs font-bold block truncate">{req.label}</span>
                        {doc ? (
                          <span className="text-[9px] text-muted-foreground block truncate">{doc.fileName.substring(0, 20)}...</span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground font-medium block">Not Uploaded</span>
                        )}
                      </div>

                      <div className="shrink-0 ml-3">
                        {doc ? (
                          doc.verified ? (
                            <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wide">
                              <CheckCircle className="h-3 w-3 shrink-0" />
                              <span>Verified</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-[9px] font-bold uppercase tracking-wide">
                              <Clock className="h-3 w-3 shrink-0 animate-pulse" />
                              <span>Review</span>
                            </div>
                          )
                        ) : (
                          <Button
                            onClick={() => {
                              setTargetInternId(myRecord.id);
                              setDocType(req.type);
                              setIsUploadOpen(true);
                            }}
                            size="sm"
                            className="h-7 px-2.5 text-[9px] font-extrabold uppercase bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 rounded-lg"
                          >
                            Upload
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upload File Overlay Modal for Intern */}
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
            <div className="w-full max-w-md animate-fadeIn">
              <Card className="border-border bg-card shadow-2xl relative rounded-2xl overflow-hidden text-foreground">
                <button
                  onClick={() => {
                    setIsUploadOpen(false);
                    setSelectedFile(null);
                  }}
                  className="absolute top-4.5 right-4.5 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/10 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
                <CardHeader className="pb-4">
                  <CardTitle>Vault File Upload</CardTitle>
                  <CardDescription className="text-muted-foreground">Register compliance forms directly to AIMS secure storage.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadForIntern} className="space-y-4.5">
                    
                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                        Compliance Category
                      </label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        required
                        className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                      >
                        {REQUIRED_DOCS.map((doc) => (
                          <option key={doc.type} value={doc.type} className="bg-card text-foreground">
                            {doc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                        Document File Attachment
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        required
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="flex w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-heading file:font-bold file:bg-cyan-500/10 file:text-cyan-600 dark:file:text-cyan-400 file:cursor-pointer hover:file:bg-cyan-500/20 border border-border rounded-xl p-1 bg-background"
                      />
                    </div>

                    {selectedFile && (
                      <div className="p-3.5 rounded-xl border bg-secondary/5 border-border/40 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-semibold truncate">Selected Size:</span>
                          <span className={cn(
                            "font-bold font-mono",
                            selectedFile.size > 100 * 1024
                              ? "text-rose-500 animate-pulse"
                              : selectedFile.size > 10 * 1024
                              ? "text-amber-500"
                              : "text-emerald-500"
                          )}>
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </span>
                        </div>
                        
                        {selectedFile.size > 100 * 1024 && (
                          <p className="text-[10px] text-rose-500 font-bold leading-tight flex items-start space-x-1 mt-1.5 animate-pulse">
                            <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>REJECTED: File size exceeds the strict 100 KB hard limit.</span>
                          </p>
                        )}
                        
                        {selectedFile.size <= 100 * 1024 && selectedFile.size > 10 * 1024 && (
                          <p className="text-[10px] text-amber-500 font-bold leading-tight flex items-start space-x-1 mt-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>WARNING: File is heavier than the preferred 10 KB size. We recommend optimization.</span>
                          </p>
                        )}

                        {selectedFile.size <= 10 * 1024 && (
                          <p className="text-[10px] text-emerald-500 font-bold leading-tight flex items-start space-x-1 mt-1.5">
                            <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                            <span>EXCELLENT: File size is perfectly optimized under 10 KB.</span>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-border select-none">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsUploadOpen(false);
                          setSelectedFile(null);
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        className="font-semibold bg-indigo-600 hover:bg-indigo-500 border border-white/5 text-white"
                        isLoading={loading}
                      >
                        Upload File
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Dynamic Document Previewer Modal */}
        {selectedGeneratedDoc && renderDocumentPreviewModal()}
      </div>
    );
  }

  // Admin / Superuser Logic
  const activeInterns = initialInterns.filter((i) => i.status === "ACTIVE" || i.status === "ONBOARDING");
  const totalRequired = activeInterns.length * REQUIRED_DOCS.length;
  let totalUploaded = 0;
  let totalVerified = 0;

  activeInterns.forEach((intern) => {
    intern.documents.forEach((doc) => {
      totalUploaded++;
      if (doc.verified) totalVerified++;
    });
  });

  const complianceRate = totalRequired > 0 ? Math.round((totalVerified / totalRequired) * 100) : 100;
  
  const filteredInterns = initialInterns.filter((i) =>
    i.fullName.toLowerCase().includes(search.toLowerCase()) ||
    i.department.toLowerCase().includes(search.toLowerCase()) ||
    i.id.toLowerCase().includes(search.toLowerCase()) ||
    (i.internId && i.internId.toLowerCase().includes(search.toLowerCase()))
  );

  // Document Upload Action (Admin)
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!targetInternId || !docType || !selectedFile) {
      setError("Please complete all upload details and attach a file.");
      setLoading(false);
      return;
    }

    let fileToUpload = selectedFile;
    if (selectedFile.type.startsWith("image/")) {
      try {
        fileToUpload = await compressImage(selectedFile);
      } catch (e) {
        console.error("Compression failed:", e);
      }
    }

    if (fileToUpload.size > 100 * 1024) {
      setError("Rejected: Selected file exceeds the strict maximum limit of 100 KB. Please compress the file.");
      setLoading(false);
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(fileToUpload.type)) {
      setError("Rejected: Only PDF, JPEG, and PNG files are permitted for secure upload.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("internId", targetInternId);
      formData.append("type", docType);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload document file.");

      setSuccess("Document file persisted successfully into Secure Vault!");
      setSelectedFile(null);
      setTargetInternId("");
      setIsUploadOpen(false);

      // Refresh data
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during upload.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Document Action (Admin Only)
  const handleVerify = async (docId: string) => {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, verified: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify document.");

      // Refresh client modal view if active
      if (selectedIntern) {
        const updatedDocs = selectedIntern.documents.map((d) =>
          d.id === docId ? { ...d, verified: true } : d
        );
        setSelectedIntern({ ...selectedIntern, documents: updatedDocs });
      }

      setSuccess("Document audit verified successfully!");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not complete document verification.");
    }
  };

  // Delete Document Action (Admin Only)
  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document from storage?")) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/documents?id=${docId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete document.");

      // Refresh client modal view if active
      if (selectedIntern) {
        const updatedDocs = selectedIntern.documents.filter((d) => d.id !== docId);
        setSelectedIntern({ ...selectedIntern, documents: updatedDocs });
      }

      setSuccess("Document wiped from vault.");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not complete deletion.");
    }
  };

  // Compile Dynamic Draft Action
  const handleGenerateDraft = async (internId: string, type: string) => {
    setError(null);
    setSuccess(null);
    setActionLoading(`${internId}-${type}`);

    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId, type, preferredCurrency: currency }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate dynamic draft.");

      setSuccess(`Dynamic draft for ${type.replace(/_/g, " ")} generated successfully!`);
      
      // Update selectedIntern generated docs array dynamically
      if (selectedIntern && selectedIntern.id === internId) {
        const genDocs = selectedIntern.generatedDocuments || [];
        const existingIdx = genDocs.findIndex((d) => d.type === type);
        const newDocItem = {
          id: data.document.id,
          type: data.document.type,
          status: data.document.status,
          approvedAt: null,
          signature: null,
          fileUrl: null,
          notes: data.document.notes,
          content: data.document.content,
        };

        if (existingIdx > -1) {
          genDocs[existingIdx] = newDocItem;
        } else {
          genDocs.push(newDocItem);
        }
        setSelectedIntern({ ...selectedIntern, generatedDocuments: [...genDocs] });
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not generate onboarding draft.");
    } finally {
      setActionLoading(null);
    }
  };

  // Sign Generated Document Action (Founder Only)
  const handleSignDocument = async (docId: string) => {
    if (!isFounder) {
      setError("Rejected: Only AIMS Founders possess the credentials to digitally sign official compliance documents.");
      return;
    }

    setError(null);
    setSuccess(null);
    setActionLoading(docId);

    try {
      const doc = initialInterns.flatMap(i => i.generatedDocuments || []).find(d => d.id === docId);
      const isIdCard = doc?.type === "ID_CARD";
      
      const payload: any = {
        documentId: docId,
        action: "APPROVE",
        notes: "Approved and digitally signed under Founder authority.",
      };
      
      if (isIdCard) {
        payload.cardType = selectedCardType;
        payload.theme = selectedCardTheme;
        payload.badgeColor = selectedBadgeColor;
        payload.themeColor = selectedThemeColor;
        payload.verificationStatus = "Authorized & Verified";
        payload.verificationBadgeStyle = selectedVerificationBadgeStyle;
      }

      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve and digitally sign document.");

      setSuccess("Document approved, timestamped, and digitally signed!");
      
      // Update selected intern state if open
      if (selectedIntern) {
        const updatedGen = (selectedIntern.generatedDocuments || []).map((d) =>
          d.id === docId ? { ...d, status: "APPROVED", signature: data.document.signature, approvedAt: data.document.approvedAt } : d
        );
        setSelectedIntern({ ...selectedIntern, generatedDocuments: updatedGen });
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Approval signing operation failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Draft Action (Admin)
  const handleRejectDocument = async (docId: string, remarks?: string) => {
    setError(null);
    setSuccess(null);
    setActionLoading(docId);

    try {
      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, action: "REJECT", notes: remarks || "Rejected during manual audit review." }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject draft document.");

      setSuccess("Document draft rejected successfully.");
      
      if (selectedIntern) {
        const updatedGen = (selectedIntern.generatedDocuments || []).map((d) =>
          d.id === docId ? { ...d, status: "REJECTED" } : d
        );
        setSelectedIntern({ ...selectedIntern, generatedDocuments: updatedGen });
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Rejection action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // Save Edited Content Action (Admin)
  const handleSaveEditedDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGeneratedDoc) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: editingGeneratedDoc.id,
          action: "EDIT",
          content: editFormContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to edit draft content.");

      setSuccess("Draft content customized successfully!");
      setEditingGeneratedDoc(null);
      
      // Update selected intern state if open
      if (selectedIntern) {
        const updatedGen = (selectedIntern.generatedDocuments || []).map((d) =>
          d.id === data.document.id ? { ...d, content: data.document.content } : d
        );
        setSelectedIntern({ ...selectedIntern, generatedDocuments: updatedGen });
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not save customized parameters.");
    } finally {
      setLoading(false);
    }
  };

  // Start Editing Draft Setup
  const startEditingDraft = (doc: any) => {
    setEditingGeneratedDoc(doc);
    setEditFormContent(doc.content || {});
  };

  // Helper: check document status inside enrollee record
  const getDocStatus = (intern: InternRecord, type: string) => {
    const doc = intern.documents.find((d) => d.type === type);
    if (!doc) {
      return {
        status: "not_uploaded",
        element: (
          <div className="flex items-center space-x-1 text-slate-400 dark:text-slate-400 select-none bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/20 shrink-0 text-[10px] font-bold">
            <span>Not Uploaded</span>
          </div>
        )
      };
    }
    if (doc.verified) {
      return {
        status: "verified",
        element: (
          <div className="flex items-center space-x-1 text-emerald-400 select-none bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 shrink-0 text-[10px] font-bold">
            <CheckCircle className="h-3 w-3 shrink-0" />
            <span>Verified</span>
          </div>
        )
      };
    }
    return {
      status: "pending",
      element: (
        <div className="flex items-center space-x-1 text-amber-400 select-none bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25 shrink-0 text-[10px] font-bold">
          <Clock className="h-3 w-3 shrink-0 animate-pulse" />
          <span>Review</span>
        </div>
      )
    };
  };

  // Aggregate all generated documents across all interns for approvals queue view
  const allGeneratedDocuments: any[] = [];
  initialInterns.forEach((intern) => {
    if (intern.generatedDocuments) {
      intern.generatedDocuments.forEach((doc) => {
        allGeneratedDocuments.push({
          ...doc,
          intern: {
            id: intern.id,
            fullName: intern.fullName,
            internId: intern.internId,
            department: intern.department,
            roleDomain: intern.roleDomain,
            email: intern.email,
          }
        });
      });
    }
  });

  return (
    <div className="space-y-6 relative animate-fadeIn text-foreground">
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-heading font-extrabold tracking-tight">
            AURXON Compliance Document Vault
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit offer letters, NDAs, identity records, and release compliance certificates.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Tab buttons */}
          <div className="bg-secondary/20 p-1 rounded-xl flex items-center border border-border/40 select-none">
            <button
              onClick={() => setActiveTab("compliance")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold font-heading transition-all",
                activeTab === "compliance"
                  ? "bg-card text-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Compliance Locker
            </button>
            <button
              onClick={() => setActiveTab("approvals")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold font-heading transition-all flex items-center space-x-1",
                activeTab === "approvals"
                  ? "bg-card text-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Fingerprint className="h-3.5 w-3.5 text-primary" />
              <span>Approvals Console</span>
            </button>
          </div>

          <Button
            onClick={() => setIsUploadOpen(true)}
            variant="primary"
            size="sm"
            className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 rounded-xl px-4 transition-all"
          >
            <UploadCloud className="h-4.5 w-4.5" />
            <span>Upload compliance file</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs animate-pulse">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs">
          <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* 2. Analytical compliance meter header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-border/45 bg-card/60 backdrop-blur-md flex flex-col justify-between p-5 md:col-span-2 rounded-2xl shadow-xl">
          <div>
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Overall Compliance Ratio
            </span>
            <div className="flex items-end justify-between mt-3">
              <span className="text-4xl font-heading font-extrabold tracking-tight">
                {complianceRate}%
              </span>
              <span className="text-[10px] text-muted-foreground font-bold">
                {totalVerified} of {totalRequired} documents verified
              </span>
            </div>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full mt-4.5 overflow-hidden border border-border/20">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </Card>

        <Card className="border-border/45 bg-card/60 backdrop-blur-md p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between pb-3.5">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Total Uploaded
            </span>
            <div className="p-2 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-heading font-extrabold">{totalUploaded}</span>
          <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Pending and verified file logs</p>
        </Card>

        <Card className="border-border/45 bg-card/60 backdrop-blur-md p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between pb-3.5">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Audit Pending Review
            </span>
            <div className="p-2 rounded bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-heading font-extrabold">{totalUploaded - totalVerified}</span>
          <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Awaiting admin verifications</p>
        </Card>
      </div>

      {activeTab === "compliance" ? (
        /* 3. Search and interactive folder roster */
        <Card className="border-border/45 bg-card/60 backdrop-blur-md p-0 overflow-hidden shadow-lg rounded-2xl">
          {/* Search controls */}
          <div className="p-4 border-b border-border/40 bg-secondary/5 flex items-center space-x-3.5">
            <Search className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search enrollee name, university, or program ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none bg-transparent p-0 h-auto focus:ring-0 focus:border-none focus:outline-none placeholder-muted-foreground text-foreground"
            />
          </div>

          {/* Desktop View: Table (md and larger) */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full min-w-[1350px] text-left border-collapse table-auto">
              <thead>
                <tr className="border-b border-border bg-secondary/15 text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                  <th className="py-4 px-6 w-[260px] min-w-[260px]">Enrollee Profile</th>
                  <th className="py-4 px-6 w-[220px] min-w-[220px]">Department / Supervisor</th>
                  <th className="py-4 px-6 text-center min-w-[740px]">Compliance Roster</th>
                  <th className="py-4 px-6 w-[130px] min-w-[130px] text-center bg-[#0d1225] dark:bg-[#0c1220]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-xs font-medium text-muted-foreground">
                {filteredInterns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm font-semibold">
                      <div className="flex flex-col items-center space-y-2.5">
                        <FolderOpen className="h-8 w-8 text-muted-foreground/45" />
                        <span>No enrollees match your search criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const grouped = filteredInterns.reduce((acc, intern) => {
                      const dept = intern.department || "Unassigned";
                      if (!acc[dept]) acc[dept] = [];
                      acc[dept].push(intern);
                      return acc;
                    }, {} as Record<string, InternRecord[]>);

                    return Object.entries(grouped).map(([dept, interns]) => (
                      <React.Fragment key={dept}>
                        <tr className="bg-primary/5 border-y border-primary/10">
                          <td colSpan={4} className="py-2 px-6 font-extrabold text-primary uppercase tracking-widest text-[10px]">
                            {dept} Division
                          </td>
                        </tr>
                        {interns.map((intern) => (
                          <tr key={intern.id} className="group hover:bg-secondary/10 hover:text-foreground transition-colors duration-150">
                            <td className="py-4 px-6 w-[260px] min-w-[260px]">
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground text-sm">{intern.fullName}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">{intern.internId || intern.id} • {intern.email}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 w-[220px] min-w-[220px]">
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">{intern.department}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                  Mentored by: {intern.supervisor?.fullName || "Unassigned"}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6 min-w-[740px]">
                              <div className="flex items-center justify-start space-x-2.5">
                                {REQUIRED_DOCS.map((docType) => {
                                  const state = getDocStatus(intern, docType.type);
                                  return (
                                    <div
                                      key={docType.type}
                                      title={`${docType.label}: ${state.status.toUpperCase()}`}
                                      className={cn(
                                        "flex flex-col items-center space-y-1.5 p-2 rounded-lg select-none shrink-0 min-w-16 transition-all duration-200 hover:scale-105",
                                        state.status === "verified"
                                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                          : state.status === "pending"
                                          ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                                          : "bg-slate-500/5 border border-slate-500/20 text-slate-400 dark:text-slate-400"
                                      )}
                                    >
                                      <span className="text-[8px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                                        {docType.type.split("_")[0]}
                                      </span>
                                      {state.element}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-4 px-6 w-[130px] min-w-[130px] text-center bg-[#0d1225] dark:bg-[#0c1220] group-hover:bg-[#161c2f] dark:group-hover:bg-[#151c2f] border-l border-border/20 transition-colors duration-150">
                              <Button
                                onClick={() => {
                                  setSelectedIntern(intern);
                                  setAdminModalTab("upload");
                                }}
                                variant="outline"
                                size="sm"
                                className="h-8.5 text-[10px] font-bold border-border/40 hover:bg-secondary/20"
                              >
                                <Eye className="h-3.5 w-3.5 shrink-0 mr-1.5 text-cyan-500" />
                                <span>Manage Vault</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Card Stack (md and smaller) */}
          <div className="block md:hidden space-y-4 p-4">
            {filteredInterns.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-muted-foreground">
                No enrollees match your search criteria.
              </div>
            ) : (
              filteredInterns.map((intern) => {
                const uploadedCount = intern.documents.length;
                const verifiedCount = intern.documents.filter(d => d.verified).length;
                return (
                  <div
                    key={`vault-${intern.id}`}
                    className="p-4 rounded-xl border border-border/40 bg-card/65 space-y-3.5"
                  >
                    {/* Mobile Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{intern.fullName}</h4>
                        <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 block tracking-wide">
                          {intern.internId || intern.id}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{intern.department} • Mentor: {intern.supervisor?.fullName || "Unassigned"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold bg-secondary border border-border/40 px-2 py-0.5 rounded-lg">
                          {verifiedCount}/{REQUIRED_DOCS.length} Verified
                        </span>
                      </div>
                    </div>

                    {/* Micro compliance progress bar */}
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden border border-border/10">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
                        style={{ width: `${(verifiedCount / REQUIRED_DOCS.length) * 100}%` }}
                      />
                    </div>

                    {/* Mobile Grid representing document blocks */}
                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      {REQUIRED_DOCS.map((docType) => {
                        const state = getDocStatus(intern, docType.type);
                        return (
                          <div
                            key={`mob-doc-${intern.id}-${docType.type}`}
                            className={cn(
                              "flex flex-col items-center justify-between p-1.5 rounded-lg border bg-secondary/5 min-h-12 justify-center",
                              state.status === "verified"
                                ? "bg-emerald-500/10 border-emerald-500/30"
                                : state.status === "pending"
                                ? "bg-amber-500/10 border-amber-500/30"
                                : "bg-slate-500/5 border-slate-500/20"
                            )}
                          >
                            <span className="text-[7.5px] font-bold text-muted-foreground uppercase tracking-wide">
                              {docType.type.split("_")[0]}
                            </span>
                            <div className="mt-1">
                              {state.status === "verified" ? (
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                              ) : state.status === "pending" ? (
                                <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                              ) : (
                                <span className="text-[7.5px] text-muted-foreground/60 font-bold block uppercase">Not Uploaded</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action launcher */}
                    <div className="pt-2.5 border-t border-border/30 flex items-center justify-end">
                      <Button
                        onClick={() => {
                          setSelectedIntern(intern);
                          setAdminModalTab("upload");
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full py-2.5 rounded-xl text-xs font-bold border-border/40 hover:bg-secondary/20 flex items-center justify-center space-x-1.5"
                      >
                        <Eye className="h-4 w-4 text-cyan-500" />
                        <span>Manage Compliance Vault</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      ) : (
        /* Approvals Queue Console */
        <div className="space-y-6">
          <Card className="border-border/45 bg-card/60 backdrop-blur-md p-6 rounded-2xl shadow-xl">
            <CardHeader className="p-0 pb-4 border-b border-border/40 mb-6">
              <CardTitle className="text-base flex items-center space-x-1.5">
                <Fingerprint className="h-5 w-5 text-primary" />
                <span>Super-Admin Approvals Console Queue</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Verify terms, customize legal contents, and apply Founder-level digital SHA256 signatures to authorize credentials.
              </CardDescription>
            </CardHeader>
            <div className="space-y-6">
              {allGeneratedDocuments.length === 0 ? (
                <div className="py-12 text-center text-sm font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2">
                  <FolderOpen className="h-10 w-10 text-muted-foreground/35 animate-bounce" />
                  <span>No dynamic document drafts generated inside the system yet.</span>
                </div>
              ) : (() => {
                const pendingDocs = allGeneratedDocuments.filter(d => d.status === "PENDING" || !d.status);
                const completedDocs = allGeneratedDocuments.filter(d => d.status === "APPROVED" || d.status === "REJECTED");
                
                const groupDocs = (docs: any[]) => {
                  const groups: { [groupKey: string]: { [internKey: string]: any[] } } = {};
                  docs.forEach((doc) => {
                    const date = doc.createdAt ? new Date(doc.createdAt) : new Date();
                    const monthYear = date.toLocaleString("en-US", { month: "long", year: "numeric" });
                    const internKey = `${doc.intern?.internId || doc.intern?.id || "Unlinked"} - ${doc.intern?.fullName || "Unknown Intern"}`;
                    
                    if (!groups[monthYear]) groups[monthYear] = {};
                    if (!groups[monthYear][internKey]) groups[monthYear][internKey] = [];
                    groups[monthYear][internKey].push(doc);
                  });
                  return groups;
                };

                const pendingGroups = groupDocs(pendingDocs);
                const completedGroups = groupDocs(completedDocs);

                const renderGroups = (groups: any, title: string, emptyMsg: string, titleColor: string) => (
                  <div className="mb-10">
                    <h2 className={cn("text-lg font-heading font-extrabold uppercase tracking-widest mb-6 border-b border-border/40 pb-2", titleColor)}>
                      {title}
                    </h2>
                    {Object.keys(groups).length === 0 ? (
                      <p className="text-sm text-muted-foreground italic px-2">{emptyMsg}</p>
                    ) : (
                      Object.entries(groups).map(([monthYear, internsMap]) => (
                        <div key={monthYear} className="space-y-4 border-b border-border/10 pb-6 last:border-0 last:pb-0 mb-6">
                          <h3 className="text-xs font-heading font-extrabold text-muted-foreground uppercase tracking-widest px-1">
                            {monthYear}
                          </h3>
                          <div className="space-y-6 pl-2">
                            {Object.entries(internsMap as Record<string, any[]>).map(([internKey, docs]) => (
                              <div key={internKey} className="space-y-3">
                                <p className="text-xs font-bold text-slate-400 pl-2 border-l-2 border-primary/50">
                                  {internKey}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {docs.map((doc) => {
                              const isApproved = doc.status === "APPROVED";
                              const isRejected = doc.status === "REJECTED";
                              
                              return (
                                <Card
                                  key={`card-${doc.id}`}
                                  className={cn(
                                    "border-border/40 bg-card/70 transition-all rounded-xl p-5 flex flex-col justify-between hover:shadow-lg relative overflow-hidden",
                                    isApproved ? "border-emerald-500/25 bg-emerald-500/[0.01]" : isRejected ? "border-rose-500/20 bg-rose-500/[0.01]" : "hover:border-primary/30"
                                  )}
                                >
                                  {/* Ribbon / Status block */}
                                  <div className="absolute top-0 right-0">
                                    <span className={cn(
                                      "text-[8px] font-heading font-extrabold uppercase tracking-widest px-2.5 py-1 block rounded-bl-lg shadow-sm border-l border-b",
                                      isApproved
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        : isRejected
                                        ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                    )}>
                                      {doc.status}
                                    </span>
                                  </div>

                                  <div className="space-y-4 w-full">
                                    <div>
                                      <span className="text-[9px] font-heading font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block mb-1">
                                        {doc.type.replace(/_/g, " ")}
                                      </span>
                                      <h4 className="text-sm font-extrabold text-foreground leading-tight">
                                        {doc.intern?.fullName || "Unlinked Intern"}
                                      </h4>
                                      <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">
                                        {doc.intern?.internId || doc.intern?.id}
                                      </span>
                                    </div>

                                    {/* Audit Details */}
                                    <div className="bg-secondary/10 border border-border/10 rounded-xl p-3 space-y-1.5 text-[10px]">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground font-semibold">Department:</span>
                                        <span className="font-bold text-foreground">{doc.intern?.department}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground font-semibold">Created On:</span>
                                        <span>{formatDate(doc.createdAt)}</span>
                                      </div>
                                      {doc.signature && (
                                        <div className="pt-1.5 border-t border-border/30">
                                          <span className="text-[7.5px] font-mono text-emerald-600 dark:text-emerald-400 break-all leading-tight block">
                                            {doc.signature}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex items-center space-x-2.5 pt-4 mt-4 border-t border-border/30 w-full select-none">
                                    <Button
                                      onClick={() => setSelectedGeneratedDoc(doc)}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-8 text-[9px] font-bold"
                                    >
                                      <Eye className="h-3 w-3 mr-1 text-cyan-500" />
                                      <span>Preview</span>
                                    </Button>
                                    
                                    {!isApproved && (
                                      <Button
                                        onClick={() => startEditingDraft(doc)}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                        title="Edit Parameters"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    )}

                                    {!isApproved && (
                                      <div className="flex items-center space-x-1 shrink-0">
                                        {isFounder ? (
                                          <Button
                                            onClick={() => handleSignDocument(doc.id)}
                                            variant="primary"
                                            size="sm"
                                            className="h-8 text-[9px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 border-none px-3"
                                            isLoading={actionLoading === doc.id}
                                          >
                                            Sign & Certify
                                          </Button>
                                        ) : (
                                          <div className="text-[8px] bg-secondary border border-border/40 px-2 py-1.5 rounded-lg text-muted-foreground font-semibold uppercase tracking-wide">
                                            Lock Signature
                                          </div>
                                        )}

                                        <Button
                                          onClick={() => handleRejectDocument(doc.id)}
                                          variant="outline"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-rose-500 border-rose-500/25 hover:bg-rose-500/5 hover:border-rose-500/40"
                                          isLoading={actionLoading === doc.id}
                                          title="Reject Draft"
                                        >
                                          <XCircle className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
                  </div>
                );

                return (
                  <div className="space-y-8">
                    {renderGroups(pendingGroups, "Pending Approval", "No documents are pending approval.", "text-amber-500")}
                    {renderGroups(completedGroups, "Completed Documents", "No completed documents yet.", "text-emerald-500")}
                  </div>
                );
              })()}</div>
          </Card>
        </div>
      )}

      {/* 4. Sliding Manage Document Vault Overlay */}
      {selectedIntern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-3xl">
            <Card className="border-border bg-card shadow-2xl relative rounded-2xl overflow-hidden text-foreground">
              <button
                onClick={() => setSelectedIntern(null)}
                className="absolute top-4.5 right-4.5 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="flex items-center space-x-2">
                  <FileCheck className="h-5 w-5 text-cyan-500" />
                  <span>Compliance Roster: {selectedIntern.fullName}</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">ID: {selectedIntern.internId || selectedIntern.id} • Department: {selectedIntern.department}</CardDescription>
                
                {/* Admin Modal Toggle */}
                <div className="bg-secondary/20 p-0.5 rounded-lg flex items-center border border-border/40 select-none w-max mt-4">
                  <button
                    onClick={() => setAdminModalTab("upload")}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase transition-all",
                      adminModalTab === "upload"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Compliance Locker
                  </button>
                  <button
                    onClick={() => setAdminModalTab("generated")}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase transition-all",
                      adminModalTab === "generated"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Dynamic Drafts & Previews
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {adminModalTab === "upload" ? (
                  /* Documents List (Compliance uploaded) */
                  <div className="space-y-3">
                    <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                      Uploaded File Inventory
                    </span>
                    {selectedIntern.documents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 bg-secondary/5 border border-border/20 rounded-xl text-xs font-semibold text-muted-foreground space-y-2">
                        <AlertTriangle className="h-6 w-6 text-muted-foreground/35 shrink-0" />
                        <span>No files uploaded under this profile yet.</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {selectedIntern.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-secondary/5 rounded-xl border border-border/20 hover:border-border transition-all gap-3"
                          >
                            <div className="flex space-x-3.5 min-w-0">
                              <div className="h-8.5 w-8.5 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 border border-cyan-500/20">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-foreground truncate">{doc.fileName}</span>
                                  <span className="text-[8px] font-heading font-extrabold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-lg select-none uppercase tracking-wider shrink-0">
                                    {doc.type}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">Uploaded {formatDate(doc.createdAt)}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                              {/* Verify Action for Admin only */}
                              {!doc.verified ? (
                                isSuperUser ? (
                                  <Button
                                    onClick={() => handleVerify(doc.id)}
                                    variant="outline"
                                    size="sm"
                                    className="h-7.5 px-2.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/5 hover:border-emerald-500/30 rounded-lg"
                                  >
                                    Verify File
                                  </Button>
                                ) : (
                                  <div className="flex items-center space-x-1 text-amber-500 select-none bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-[9px] font-bold uppercase tracking-wide">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    <span>Awaiting review</span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 select-none bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wide">
                                  <CheckCircle className="h-3 w-3 shrink-0" />
                                  <span>Verified</span>
                                </div>
                              )}

                              {/* View File link */}
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center h-7.5 px-2.5 text-[9px] font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all select-none"
                              >
                                Open File
                              </a>

                              {/* Delete File action (Admin Only) */}
                              {isFounder && (
                                <Button
                                  onClick={() => handleDelete(doc.id)}
                                  variant="outline"
                                  size="sm"
                                  className="h-7.5 w-7.5 p-0 text-red-500 border-red-500/25 hover:bg-red-500/10 rounded-lg"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Dynamic Generated Documents List */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                        Autogenerated Official Documents
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1.5">
                      {["OFFER_LETTER", "NDA", "ID_CARD", "EXPERIENCE_LETTER"].map((type) => {
                        const existing = (selectedIntern.generatedDocuments || []).find((d) => d.type === type);
                        const isApproved = existing?.status === "APPROVED";
                        
                        return (
                          <div
                            key={`gen-doc-${type}`}
                            className={cn(
                              "p-3.5 rounded-xl border flex flex-col justify-between space-y-4 bg-secondary/5",
                              isApproved ? "border-emerald-500/20 bg-emerald-500/[0.01]" : existing ? "border-border/30" : "border-dashed border-border"
                            )}
                          >
                            <div className="space-y-1">
                              <span className="text-[8px] font-heading font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                                {type.replace(/_/g, " ")}
                              </span>
                              
                              {existing ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-foreground">Draft Exists</span>
                                  <span className={cn(
                                    "text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                    isApproved
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                      : existing.status === "REJECTED"
                                      ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                      : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                  )}>
                                    {existing.status}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No draft document compiled yet.</p>
                              )}
                            </div>

                            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-border/20 select-none">
                              {existing ? (
                                <>
                                  <Button
                                    onClick={() => setSelectedGeneratedDoc({
                                      ...existing,
                                      intern: {
                                        id: selectedIntern.id,
                                        fullName: selectedIntern.fullName,
                                        internId: selectedIntern.internId,
                                        department: selectedIntern.department,
                                        roleDomain: selectedIntern.roleDomain,
                                        email: selectedIntern.email,
                                      }
                                    })}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-[9px] font-bold"
                                  >
                                    <Eye className="h-3 w-3 mr-1 text-cyan-500" />
                                    <span>Preview</span>
                                  </Button>

                                  {!isApproved && (
                                    <Button
                                      onClick={() => startEditingDraft(existing)}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title="Edit parameters"
                                    >
                                      <Edit className="h-3 w-3.5" />
                                    </Button>
                                  )}

                                  {!isApproved && (
                                    <>
                                      {isFounder ? (
                                        <Button
                                          onClick={() => handleSignDocument(existing.id)}
                                          variant="primary"
                                          size="sm"
                                          className="h-8 text-[9px] font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 border-none px-2"
                                          isLoading={actionLoading === existing.id}
                                        >
                                          Sign
                                        </Button>
                                      ) : (
                                        <span className="text-[8px] bg-secondary border border-border/30 px-2 py-1 rounded text-muted-foreground font-semibold">
                                          Lock
                                        </span>
                                      )}
                                    </>
                                  )}
                                  
                                  {(isApproved || existing.status === "REJECTED") && (
                                    <Button
                                      onClick={() => handleGenerateDraft(selectedIntern.id, type)}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-[9px] font-extrabold text-amber-500 border-amber-500/20 hover:bg-amber-500/5"
                                      isLoading={actionLoading === `${selectedIntern.id}-${type}`}
                                    >
                                      Recompile
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Button
                                  onClick={() => handleGenerateDraft(selectedIntern.id, type)}
                                  variant="primary"
                                  size="sm"
                                  className="h-8 px-3 text-[9px] font-bold bg-cyan-600 hover:bg-cyan-500 border border-white/5"
                                  isLoading={actionLoading === `${selectedIntern.id}-${type}`}
                                >
                                  Generate Onboarding Draft
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-border select-none">
                  <Button
                    onClick={() => setSelectedIntern(null)}
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                  >
                    Close Vault
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 5. Upload File Overlay Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-md animate-fadeIn">
            <Card className="border-border bg-card shadow-2xl relative rounded-2xl overflow-hidden text-foreground">
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setSelectedFile(null);
                }}
                className="absolute top-4.5 right-4.5 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <CardHeader className="pb-4">
                <CardTitle>Vault File Upload</CardTitle>
                <CardDescription className="text-muted-foreground">Register compliance forms directly to Vercel CDN storage.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpload} className="space-y-4.5">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                      Target Enrollee Profile
                    </label>
                    <select
                      value={targetInternId}
                      onChange={(e) => setTargetInternId(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                    >
                      <option value="" className="bg-card text-foreground">Select Enrollee Profile...</option>
                      {initialInterns.map((i) => (
                        <option key={i.id} value={i.id} className="bg-card text-foreground">
                          {i.fullName} ({i.internId || i.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                      Compliance Category
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                    >
                      {REQUIRED_DOCS.map((doc) => (
                        <option key={doc.type} value={doc.type} className="bg-card text-foreground">
                          {doc.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                      Document File Attachment
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      required
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="flex w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-heading file:font-bold file:bg-cyan-500/10 file:text-cyan-600 dark:file:text-cyan-400 file:cursor-pointer hover:file:bg-cyan-500/20 border border-border rounded-xl p-1 bg-background"
                    />
                  </div>

                  {selectedFile && (
                    <div className="p-3.5 rounded-xl border bg-secondary/5 border-border/40 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-semibold truncate">Selected Size:</span>
                        <span className={cn(
                          "font-bold font-mono",
                          selectedFile.size > 100 * 1024
                            ? "text-rose-500 animate-pulse"
                            : selectedFile.size > 10 * 1024
                            ? "text-amber-500"
                            : "text-emerald-500"
                        )}>
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </span>
                      </div>
                      
                      {selectedFile.size > 100 * 1024 && (
                        <p className="text-[10px] text-rose-500 font-bold leading-tight flex items-start space-x-1 mt-1.5 animate-pulse">
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>REJECTED: File size exceeds the strict 100 KB hard limit.</span>
                        </p>
                      )}
                      
                      {selectedFile.size <= 100 * 1024 && selectedFile.size > 10 * 1024 && (
                        <p className="text-[10px] text-amber-500 font-bold leading-tight flex items-start space-x-1 mt-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>WARNING: File is heavier than the preferred 10 KB size. We recommend optimization.</span>
                        </p>
                      )}

                      {selectedFile.size <= 10 * 1024 && (
                        <p className="text-[10px] text-emerald-500 font-bold leading-tight flex items-start space-x-1 mt-1.5">
                          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                          <span>EXCELLENT: File size is perfectly optimized under 10 KB.</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-border select-none">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setIsUploadOpen(false);
                        setSelectedFile(null);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="font-semibold bg-indigo-600 hover:bg-indigo-500 border border-white/5 text-white"
                      isLoading={loading}
                    >
                      Upload File
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dynamic Document Previewer Modal */}
      {selectedGeneratedDoc && renderDocumentPreviewModal()}

      {/* Dynamic Draft Customizer Drawer */}
      {editingGeneratedDoc && renderDraftEditorModal()}
    </div>
  );

  // High-Fidelity SVG ID Card & Official Documents Visual Renderer
  function renderDocumentPreviewModal() {
    const doc = selectedGeneratedDoc;
    const isApproved = doc.status === "APPROVED";
    const isIdCard = doc.type === "ID_CARD";
    const content = doc.content || {};

    const handlePrint = () => {
      window.print();
    };

    // ID Card fallbacks & variables
    const fullName = content.fullName || "";
    const monogram = fullName
      ? fullName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "AX";

    // Theme style matrices for ID Card (Phase 10)
    const cardThemes = {
      glacial: {
        bgStart: "#050811",
        bgMid: "#0b132b",
        bgEnd: "#1c2541",
        gradStart: "#3b82f6",
        gradEnd: "#06b6d4",
        accentColor: "#06b6d4",
        glowColor: "rgba(6, 182, 212, 0.2)",
        textColor: "#06b6d4",
        borderColor: "rgba(6, 182, 212, 0.4)",
        patternColor: "rgba(6, 182, 212, 0.05)"
      },
      gold: {
        bgStart: "#09090b",
        bgMid: "#18181b",
        bgEnd: "#27272a",
        gradStart: "#f59e0b",
        gradEnd: "#fbbf24",
        accentColor: "#fbbf24",
        glowColor: "rgba(251, 191, 36, 0.2)",
        textColor: "#fbbf24",
        borderColor: "rgba(251, 191, 36, 0.4)",
        patternColor: "rgba(251, 191, 36, 0.05)"
      },
      matrix: {
        bgStart: "#010702",
        bgMid: "#022c06",
        bgEnd: "#010702",
        gradStart: "#10b981",
        gradEnd: "#34d399",
        accentColor: "#34d399",
        glowColor: "rgba(52, 211, 153, 0.2)",
        textColor: "#34d399",
        borderColor: "rgba(52, 211, 153, 0.4)",
        patternColor: "rgba(52, 211, 153, 0.05)"
      },
      cyber: {
        bgStart: "#0f081c",
        bgMid: "#250b38",
        bgEnd: "#0f081c",
        gradStart: "#a855f7",
        gradEnd: "#e879f9",
        accentColor: "#e879f9",
        glowColor: "rgba(232, 121, 249, 0.2)",
        textColor: "#e879f9",
        borderColor: "rgba(232, 121, 249, 0.4)",
        patternColor: "rgba(232, 121, 249, 0.05)"
      },
      orange: {
        bgStart: "#140e0a",
        bgMid: "#2b1c11",
        bgEnd: "#140e0a",
        gradStart: "#ea580c",
        gradEnd: "#fb923c",
        accentColor: "#fb923c",
        glowColor: "rgba(251, 146, 60, 0.2)",
        textColor: "#fb923c",
        borderColor: "rgba(251, 146, 60, 0.4)",
        patternColor: "rgba(251, 146, 60, 0.05)"
      }
    };

    const cardTheme = cardThemes[selectedCardTheme];

    // Theme style matrices for Completion Certificate (Phase 10)
    const certThemes = {
      gold: {
        bgStart: "#070a13",
        bgEnd: "#111625",
        frameColor: "#d4af37",
        goldLine: "#fbbf24",
        sealBgStart: "#ffe69c",
        sealBgEnd: "#805d15",
        accentColor: "#d4af37",
        bodyColor: "#e4e4e7",
        sigColor: "#fbbf24",
        guillocheColor: "rgba(212, 175, 55, 0.15)",
        paperBg: "#0d1326"
      },
      glacial: {
        bgStart: "#f0f9ff",
        bgEnd: "#ffffff",
        frameColor: "#0284c7",
        goldLine: "#38bdf8",
        sealBgStart: "#e0f2fe",
        sealBgEnd: "#0284c7",
        accentColor: "#0c4a6e",
        bodyColor: "#334155",
        sigColor: "#0284c7",
        guillocheColor: "rgba(2, 132, 199, 0.1)",
        paperBg: "#ffffff"
      },
      emerald: {
        bgStart: "#fcfbf7",
        bgEnd: "#f7f5ed",
        frameColor: "#065f46",
        goldLine: "#d4af37",
        sealBgStart: "#d1fae5",
        sealBgEnd: "#047857",
        accentColor: "#065f46",
        bodyColor: "#1e293b",
        sigColor: "#047857",
        guillocheColor: "rgba(6, 95, 70, 0.1)",
        paperBg: "#faf9f5"
      },
      royal: {
        bgStart: "#0b132b",
        bgEnd: "#1e293b",
        frameColor: "#eab308",
        goldLine: "#fbbf24",
        sealBgStart: "#fef08a",
        sealBgEnd: "#a16207",
        accentColor: "#eab308",
        bodyColor: "#f8fafc",
        sigColor: "#fbbf24",
        guillocheColor: "rgba(234, 179, 8, 0.15)",
        paperBg: "#0f172a"
      }
    };

    const certTheme = certThemes[selectedCertTheme];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 transition-opacity animate-fadeIn overflow-y-auto select-none print:p-0 print:bg-white print:backdrop-blur-none">
        {/* Dynamic stylesheet injection for isolated print styling */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #aims-print-root, #aims-print-root * {
              visibility: visible !important;
            }
            #aims-print-root {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              z-index: 99999 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
            }
            .print-hide {
              display: none !important;
            }
            @page {
              size: ${isIdCard ? "portrait" : doc.type === "EXPERIENCE_LETTER" && previewMode === "certificate" ? "landscape" : "portrait"} !important;
              margin: 0 !important;
            }
          }
        `}</style>

        <div className="w-full max-w-5xl flex flex-col md:flex-row bg-card border border-border shadow-2xl rounded-2xl overflow-hidden h-[90vh] md:h-[85vh] print:h-auto print:max-h-none print:border-none print:shadow-none print:rounded-none">
          {/* Close button inside modal */}
          <button
            onClick={() => setSelectedGeneratedDoc(null)}
            className="absolute top-4.5 right-4.5 text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer z-20 print:hidden"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Left Column: Premium Preview Element */}
          <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-start bg-secondary/10 overflow-y-auto select-text print:bg-white print:p-0 h-full">
            
            {/* Top Selector pill only for Experience Letters */}
            {doc.type === "EXPERIENCE_LETTER" && (
              <div className="flex items-center space-x-1.5 bg-secondary/20 border border-border/40 p-1 rounded-xl mb-4.5 print:hidden shrink-0">
                <button
                  onClick={() => setPreviewMode("letter")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold font-heading transition-all",
                    previewMode === "letter"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Plain Letter
                </button>
                <button
                  onClick={() => setPreviewMode("certificate")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold font-heading transition-all flex items-center space-x-1.5",
                    previewMode === "certificate"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Certificate Copy</span>
                </button>
              </div>
            )}

            {/* Print Isolation Root Element */}
            <div id="aims-print-root" className="w-full flex items-center justify-center print:p-0">
              {isIdCard ? (
                <div className="w-full flex justify-center items-center p-4">
                  <IdCardGenerator
                    fullName={fullName}
                    internId={content.internId || doc.intern?.internId || "AXN-REF-PENDING"}
                    department={content.department || doc.intern?.department || ""}
                    roleDomain={content.role || doc.intern?.roleDomain || ""}
                    status={doc.intern?.status || "ACTIVE"}
                    dbInternId={doc.intern?.id || doc.internId || ""}
                    employmentType={doc.intern?.employmentType || content.employmentType}
                    defaultPhotoUrl={content.avatarUrl}
                    linkedIn={content.linkedIn}
                    gitHub={content.gitHub}
                    instagram={content.instagram}
                    viewOnly={true}
                    overrideCardType={selectedCardType}
                    overrideTheme={selectedCardTheme}
                    overrideBadgeColor={selectedBadgeColor}
                    overrideThemeColor={selectedThemeColor}
                    overrideVerificationStatus={isApproved ? "Authorized & Verified" : "Pending Verification"}
                    overrideVerificationBadgeStyle={selectedVerificationBadgeStyle}
                  />
                </div>
              ) : doc.type === "CERTIFICATE" || (doc.type === "EXPERIENCE_LETTER" && previewMode === "certificate") ? (
                /* Phase 10: Elite Landscape Completion Certificate SVG Generator */
                <svg width="842" height="595" viewBox="0 0 842 595" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto max-w-full aspect-[1.414] select-none shadow-2xl rounded-xl transition-all duration-300 print:shadow-none print:rounded-none print:border-none">
                  <defs>
                    <style>{`
                      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;800&family=Playfair+Display:ital,wght@1,600;1,700&display=swap');
                      .cert-title-cinzel { font-family: 'Cinzel', serif; font-weight: 800; }
                      .cert-font-inter { font-family: 'Inter', sans-serif; }
                      .cert-font-playfair { font-family: 'Playfair Display', serif; font-style: italic; }
                    `}</style>
                    <linearGradient id={`bgGradCert-${doc.id}`} x1="421" y1="0" x2="421" y2="595" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor={certTheme.bgStart} />
                      <stop offset="100%" stopColor={certTheme.bgEnd} />
                    </linearGradient>
                    <linearGradient id="sealGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={certTheme.sealBgStart} />
                      <stop offset="100%" stopColor={certTheme.sealBgEnd} />
                    </linearGradient>
                  </defs>

                  {/* Certificate Base Layer */}
                  <rect width="842" height="595" fill={`url(#bgGradCert-${doc.id})`} rx="12" />
                  
                  {/* Watermark Logo Background */}
                  <g opacity="0.02" transform="translate(421, 297) scale(2.8)">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill={certTheme.goldLine} />
                    <path d="M2 17L12 22L22 17M2 12L22 12" stroke={certTheme.frameColor} strokeWidth="1.5" />
                  </g>

                  {/* Intricate Corner Guilloche Overlays */}
                  {/* Top-Left */}
                  <path d="M 20 60 C 60 60, 60 20, 60 20 C 60 20, 20 20, 20 60 Z" stroke={certTheme.guillocheColor} strokeWidth="0.8" fill="none" />
                  <path d="M 15 70 C 70 70, 70 15, 70 15 C 70 15, 15 15, 15 70 Z" stroke={certTheme.guillocheColor} strokeDasharray="3 3" strokeWidth="0.8" fill="none" />
                  {/* Top-Right */}
                  <path d="M 822 60 C 782 60, 782 20, 782 20 C 782 20, 822 20, 822 60 Z" stroke={certTheme.guillocheColor} strokeWidth="0.8" fill="none" />
                  <path d="M 827 70 C 772 70, 772 15, 772 15 C 772 15, 827 15, 827 70 Z" stroke={certTheme.guillocheColor} strokeDasharray="3 3" strokeWidth="0.8" fill="none" />
                  {/* Bottom-Left */}
                  <path d="M 20 535 C 60 535, 60 575, 60 575 C 60 575, 20 575, 20 535 Z" stroke={certTheme.guillocheColor} strokeWidth="0.8" fill="none" />
                  <path d="M 15 525 C 70 525, 70 580, 70 580 C 70 580, 15 580, 15 525 Z" stroke={certTheme.guillocheColor} strokeDasharray="3 3" strokeWidth="0.8" fill="none" />
                  {/* Bottom-Right */}
                  <path d="M 822 535 C 782 535, 782 575, 782 575 C 782 575, 822 575, 822 535 Z" stroke={certTheme.guillocheColor} strokeWidth="0.8" fill="none" />
                  <path d="M 827 525 C 772 525, 772 580, 772 580 C 772 580, 827 580, 827 525 Z" stroke={certTheme.guillocheColor} strokeDasharray="3 3" strokeWidth="0.8" fill="none" />

                  {/* Dynamic Ornate Frame Borders */}
                  <rect x="20" y="20" width="802" height="555" rx="8" fill="none" stroke={certTheme.frameColor} strokeWidth="2.5" />
                  <rect x="28" y="28" width="786" height="539" rx="6" fill="none" stroke={certTheme.goldLine} strokeDasharray="8 4" strokeWidth="1" opacity="0.75" />

                  {/* Top-Center Logo */}
                  <image href="/Logo-AIMS/AurxonLogo.png" x="396" y="32" width="50" height="35" preserveAspectRatio="xMidYMid slice" />

                  {/* Header Typography */}
                  <text x="421" y="95" fill={certTheme.accentColor} className="cert-title-cinzel" fontSize="23" letterSpacing="4" textAnchor="middle">CERTIFICATE OF WORK EXPERIENCE</text>
                  <text x="421" y="125" fill={certTheme.accentColor} className="cert-title-cinzel" fontSize="16" letterSpacing="8" textAnchor="middle">& COMPLETION</text>
                  
                  <line x1="320" y1="140" x2="522" y2="140" stroke={certTheme.goldLine} strokeWidth="1" opacity="0.5" />
                  
                  <text x="421" y="175" fill={certTheme.bodyColor} opacity="0.7" className="cert-font-inter" fontWeight="600" fontSize="9.5" letterSpacing="3.5" textAnchor="middle">THIS IS PROUDLY PRESENTED TO</text>
                  
                  {/* Recipient Cursive/Serif styling */}
                  <text x="421" y="228" fill="#ffffff" className="cert-font-playfair" fontWeight="700" fontSize="36" textAnchor="middle">{fullName}</text>
                  
                  <path d="M 370 246 L 400 246 L 410 251 L 421 246 L 432 251 L 442 246 L 472 246" stroke={certTheme.goldLine} strokeWidth="1.5" opacity="0.6" fill="none" />

                  {/* Certificate Narrative Paragraph */}
                  <g className="cert-font-inter" fontSize="12" fill={certTheme.bodyColor} textAnchor="middle">
                    <text x="421" y="290" fontWeight="400" opacity="0.85">for outstanding professional performance, dedicated execution, and corporate contributions</text>
                    <text x="421" y="315" fontWeight="400" opacity="0.85">
                      exhibited during their tenure as a <tspan fill={certTheme.accentColor} fontWeight="800">{content.role || "Software Engineering Intern"}</tspan> in the
                    </text>
                    <text x="421" y="340" fontWeight="400" opacity="0.85">
                      domain of <tspan fill={certTheme.accentColor} fontWeight="800">{content.department || "Development"}</tspan> at <tspan fontWeight="800" fill="#ffffff">{content.companyName || "AURXON SYSTEMS"}</tspan>
                    </text>
                    <text x="421" y="365" fontWeight="400" opacity="0.85">
                      spanning the program window from <tspan fontWeight="600" fill="#ffffff">{content.startDate || "N/A"}</tspan> to <tspan fontWeight="600" fill="#ffffff">{content.endDate || "N/A"}</tspan>.
                    </text>
                    <text x="421" y="398" fontWeight="500" fontSize="10.5" opacity="0.65" fontStyle="italic">This credential verifies direct alignment with all enterprise standards and execution guidelines.</text>
                  </g>

                  {/* Secure verification cryptography hash */}
                  <g transform="translate(65, 475)">
                    <text x="0" y="0" fill={certTheme.bodyColor} opacity="0.4" className="cert-font-inter" fontWeight="800" fontSize="7" letterSpacing="1">VERIFICATION STAMP</text>
                    <text x="0" y="14" fill={certTheme.accentColor} fontFamily="monospace" fontWeight="700" fontSize="7.5">{doc.signature ? doc.signature.substring(0, 32) : "UNAUTHORIZED DRAFT KEY"}</text>
                    <text x="0" y="24" fill={certTheme.accentColor} fontFamily="monospace" fontWeight="700" fontSize="7.5">{doc.signature ? doc.signature.substring(32, 64) : ""}</text>
                    <text x="0" y="35" fill={certTheme.bodyColor} opacity="0.3" className="cert-font-inter" fontSize="6.5">AIMS dynamic tamper-proof compliance secure seal.</text>
                  </g>

                  {/* Grand Gold Security Seal */}
                  <g transform="translate(421, 480)">
                    {/* Double ribbon tails */}
                    <path d="M -12 25 L -20 72 L 0 58 L 20 72 L 12 25 Z" fill="url(#sealGrad)" opacity="0.8" />
                    
                    {/* Scalloped edge base */}
                    <circle cx="0" cy="0" r="35" fill="url(#sealGrad)" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.4))" />
                    
                    {/* Inner layers */}
                    <circle cx="0" cy="0" r="29" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 2" />
                    <circle cx="0" cy="0" r="25" fill="url(#sealGrad)" />
                    <circle cx="0" cy="0" r="22" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.3" />
                    
                    {/* Verification star */}
                    <path d="M 0 -6.5 L 2 -1.5 L 7 -1.5 L 3 1.5 L 4.5 6.5 L 0 3.5 L -4.5 6.5 L -3 1.5 L -7 -1.5 L -2 -1.5 Z" fill="#ffffff" fillOpacity="0.9" />
                    
                    {/* Circular border text mock */}
                    <circle cx="0" cy="0" r="18" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.15" />
                  </g>

                  {/* Founder Signature Section */}
                  <g transform="translate(615, 475)">
                    <line x1="0" y1="28" x2="160" y2="28" stroke={certTheme.goldLine} strokeWidth="1" opacity="0.4" />
                    <text x="80" y="42" fill={certTheme.accentColor} className="cert-font-inter" fontWeight="800" fontSize="9" letterSpacing="1" textAnchor="middle">FOUNDER & CEO</text>
                    <text x="80" y="53" fill={certTheme.bodyColor} opacity="0.4" className="cert-font-inter" fontSize="7.5" textAnchor="middle">{content.companyName || "AURXON DB SYSTEMS"}</text>
                    
                    {/* Signature cursive path overlay */}
                    {isApproved && (
                      <path d="M 25 24 c 10 -25, 22 -42, 38 -12 c 12,24, -14,10, 18 -8 c 20,-12, 8 -28, 18 -10 c 8,10, -5,18, 14,8 c 18,-8, 25 -32, 35 -8" stroke={certTheme.sigColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
                    )}
                  </g>
                </svg>
              ) : (
                /* Standard High-Fidelity Letter / NDA Layout */
                <div id="aims-document-print" className="w-full max-w-xl min-h-[720px] bg-white border border-gray-200 shadow-2xl p-8 sm:p-12 flex flex-col justify-between text-slate-800 relative font-sans leading-relaxed text-sm select-text rounded-xl print:shadow-none print:border-none print:p-0 print:my-0">
                  
                  {/* Background Watermark */}
                  {isApproved && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none z-0">
                      <svg className="h-[350px] w-[350px] text-cyan-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
                      </svg>
                    </div>
                  )}

                  <div className="space-y-6 z-10 relative text-left">
                    {/* Company Letterhead */}
                    <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
                      <div className="flex items-center space-x-3">
                        <img 
                          src="/Logo-AIMS/AurxonLogo.png" 
                          alt="Aurxon Logo" 
                          className="h-9 w-auto object-contain shrink-0 animate-fadeIn" 
                        />
                        <div>
                          <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
                            {content.companyName || "AURXON DB & SOFTWARE SYSTEMS"}
                          </h2>
                          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-1">
                            Enterprise Databases • API Orchestrations • Automated Operations
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[8px] text-slate-400 font-bold uppercase">
                        <span>Ref: AXN-DOC-{doc.intern?.internId || "DRAFT"}</span>
                      </div>
                    </div>

                    {/* Document Title */}
                    <div className="text-center py-2.5">
                      <h3 className="text-base font-heading font-extrabold uppercase text-slate-900 tracking-wide border-y border-slate-200 py-1.5">
                        {content.title || doc.type.replace(/_/g, " ")}
                      </h3>
                    </div>

                    {/* Content forms */}
                    {doc.type === "OFFER_LETTER" && (
                      <div className="space-y-4 text-xs text-slate-700">
                        <p className="font-bold">{content.salutation}</p>
                        <p>{content.introduction}</p>
                        
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 space-y-2.5 my-3 text-left">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">Position Role:</span>
                            <span className="font-semibold text-slate-700">{content.role}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">Business Department:</span>
                            <span>{content.department}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">Commencement Date:</span>
                            <span>{content.startDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">Tenure Endpoint:</span>
                            <span>{content.endDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">Stipend Allocation:</span>
                            <span className="font-extrabold text-primary">{content.stipend}</span>
                          </div>
                        </div>

                        {content.terms && content.terms.length > 0 && (
                          <div className="space-y-2 pt-2 text-left">
                            <span className="font-bold text-slate-900 block">Terms & Service Regulations:</span>
                            <ul className="list-decimal pl-5 space-y-1.5">
                              {content.terms.map((t: string, i: number) => (
                                <li key={i} className="leading-relaxed">{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="pt-2">{content.closing}</p>
                      </div>
                    )}

                    {doc.type === "NDA" && (
                      <div className="space-y-4 text-xs text-slate-700">
                        <p className="leading-relaxed">
                          This Non-Disclosure Agreement (the "Agreement") is executed on <span className="font-bold text-slate-900">{content.effectiveDate}</span>, between <span className="font-bold text-slate-900">{content.partyA}</span> (the "Company") and <span className="font-bold text-slate-900">{content.partyB}</span> (the "Recipient").
                        </p>

                        {content.clauses && content.clauses.map((c: any, i: number) => (
                          <div key={i} className="space-y-1 text-left">
                            <h4 className="font-bold text-slate-900">{c.title}</h4>
                            <p className="leading-relaxed pl-2.5 text-[11px] text-slate-600">{c.text}</p>
                          </div>
                        ))}

                        <div className="pt-2 text-[10px] text-left">
                          <span className="font-bold text-slate-900 block">Governing Jurisdiction:</span>
                          <p>{content.governingLaw}</p>
                        </div>
                      </div>
                    )}

                    {doc.type === "AGREEMENT" && (
                      <div className="space-y-4 text-xs text-slate-700">
                        <p className="leading-relaxed">
                          This Internship Agreement (the "Agreement") is entered into on <span className="font-bold text-slate-900">{content.effectiveDate}</span>, by and between <span className="font-bold text-slate-900">{content.partyA}</span> ("Company") and <span className="font-bold text-slate-900">{content.partyB}</span> ("Intern").
                        </p>

                        {content.terms && content.terms.length > 0 && (
                          <div className="space-y-2 pt-2 text-left">
                            <span className="font-bold text-slate-900 block">Terms & Engagement Policies:</span>
                            <ul className="list-decimal pl-5 space-y-1.5">
                              {content.terms.map((t: string, i: number) => (
                                <li key={i} className="leading-relaxed">{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="pt-2">{content.closing}</p>
                      </div>
                    )}

                    {doc.type === "EXPERIENCE_LETTER" && (
                      <div className="space-y-4 text-xs text-slate-700">
                        <p className="font-heading font-extrabold text-slate-900 py-1">{content.salutation}</p>
                        <p className="leading-relaxed">{content.body}</p>
                        
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 space-y-2.5 my-3 text-left">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">Assigned Domain:</span>
                            <span className="font-semibold">{content.role}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">Assigned Department:</span>
                            <span>{content.department}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">Tenure Window:</span>
                            <span>{content.startDate} to {content.endDate}</span>
                          </div>
                        </div>

                        <p className="leading-relaxed">{content.performanceNotes}</p>
                        <p className="pt-2">{content.closing}</p>
                      </div>
                    )}
                  </div>

                  {/* Signature Box */}
                  <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-start sm:items-end gap-4 z-10 relative">
                    <div className="text-[10px] text-slate-500 text-left max-w-xs">
                      <span className="font-bold block uppercase tracking-wider text-slate-700">Audit Compliance Guard</span>
                      <span>AURXON AIMS double-signature authorization framework.</span>
                    </div>
                    
                    {/* Render signatures */}
                    {["OFFER_LETTER", "NDA", "AGREEMENT"].includes(doc.type) ? (
                      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        {/* Candidate Signature */}
                        {content.candidateSignature ? (
                          <div className="flex flex-col items-start border border-emerald-200 rounded-lg p-3 bg-emerald-50/20 min-w-[200px] text-left">
                            <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1.5">Candidate Signature</span>
                            <span className="text-sm font-serif italic font-semibold text-slate-900 leading-none">{content.candidateSignature}</span>
                            <span className="text-[8px] text-slate-500 font-medium mt-1 leading-none">Signed: {content.candidateSignedAt}</span>
                            <span className="text-[6.5px] text-slate-400 font-mono mt-1 block max-w-[190px] truncate leading-none" title={content.candidateSignatureStamp}>
                              {content.candidateSignatureStamp}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start border border-dashed border-amber-300 rounded-lg p-3 bg-amber-50/30 min-w-[200px] text-left">
                            <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest leading-none mb-1.5">Candidate Signature</span>
                            <span className="text-xs text-amber-600 font-semibold italic animate-pulse leading-none">Awaiting Signature</span>
                          </div>
                        )}

                        {/* Founder Signature */}
                        {isApproved ? (
                          <div className="flex flex-col items-start border border-emerald-200 rounded-lg p-3 bg-emerald-50/20 min-w-[200px] text-left">
                            <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1.5">Authorized Signer</span>
                            <span className="text-sm font-serif italic font-semibold text-slate-900 leading-none">{doc.approvedBy?.fullName || "Founder & CEO"}</span>
                            <span className="text-[8px] text-slate-500 font-medium mt-1 leading-none">Signed: {new Date(doc.approvedAt!).toLocaleDateString()}</span>
                            <span className="text-[6.5px] text-slate-400 font-mono mt-1 block max-w-[190px] truncate leading-none" title={doc.signature}>
                              {doc.signature}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50 min-w-[200px] text-left">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1.5">Authorized Signer</span>
                            <span className="text-xs text-slate-400 font-medium italic leading-none">Awaiting Approval</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Single Signature for EXPERIENCE_LETTER / CERTIFICATE */
                      isApproved ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 w-full sm:max-w-xs space-y-1 text-left select-text">
                          <div className="flex items-center space-x-1 text-emerald-700 font-heading font-extrabold text-[8px] uppercase tracking-wider">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>AURXON SECURE SEAL VERIFIED</span>
                          </div>
                          <p className="text-[9px] text-slate-600 leading-tight">
                            Signed & authorized under administrative credentials
                          </p>
                          <span className="block text-[7.5px] font-mono text-cyan-700 dark:text-cyan-600 break-all select-all leading-none mt-1.5">
                            {doc.signature}
                          </span>
                        </div>
                      ) : (
                        <div className="text-amber-500 font-bold uppercase tracking-widest text-[9px] border border-dashed border-amber-300 rounded px-2.5 py-1.5 bg-amber-50/50">
                          Unsigned Draft Copy
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dynamic Credentials Customization & Metadata Panel */}
          <div className="w-full md:w-80 bg-card p-6 md:p-8 border-t md:border-t-0 md:border-l border-border/40 flex flex-col justify-between shrink-0 h-full overflow-y-auto select-none print:hidden">
            <div className="space-y-6">
              <div>
                <span className="text-[9px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                  Customizer & Audit
                </span>
                <h4 className="text-base font-extrabold text-foreground mt-1.5">Administrative Panel</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Control live presentation and security approval parameters.</p>
              </div>

              <div className="space-y-4">
                
                {/* 1. Real-time Design Parameter Customization Suite */}
                {isIdCard && (
                  <div className="p-3 bg-secondary/5 rounded-xl border border-border/10 space-y-3">
                    {isFounder ? (
                      <>
                        <span className="text-[9px] font-heading font-bold text-primary uppercase tracking-wider block">
                          Badge Design Options
                        </span>
                        
                        {/* Card Layout Type Selector */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] text-muted-foreground font-bold uppercase block">Card Layout Type</label>
                          <div className="grid grid-cols-3 gap-1">
                            {(["standard", "banner", "smart"] as const).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setSelectedCardType(type)}
                                className={cn(
                                  "h-6.5 rounded-md text-[8.5px] font-bold uppercase transition-all border flex items-center justify-center",
                                  selectedCardType === type
                                    ? "bg-primary border-primary text-white"
                                    : "bg-card border-border hover:bg-secondary/15 text-muted-foreground"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Card Theme Style Selector */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] text-muted-foreground font-bold uppercase block">Card Theme Style</label>
                          <div className="grid grid-cols-5 gap-1">
                            {(["glacial", "gold", "matrix", "cyber", "orange"] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setSelectedCardTheme(t)}
                                className={cn(
                                  "h-6.5 rounded-md text-[8.5px] font-bold uppercase transition-all border flex items-center justify-center",
                                  selectedCardTheme === t
                                    ? "bg-primary border-primary text-white"
                                    : "bg-card border-border hover:bg-secondary/15 text-muted-foreground"
                                )}
                                title={t}
                              >
                                {t[0].toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Smart Card settings */}
                        {selectedCardType === "smart" && (
                          <div className="space-y-2.5 pt-2 border-t border-border/20">
                            {/* Premium Preset Selector */}
                            <div className="space-y-1.5">
                              <label className="text-[7.5px] text-muted-foreground font-bold uppercase block">Premium Color Preset</label>
                              <div className="grid grid-cols-5 gap-1">
                                {[
                                  { name: "Glacial", badge: "#06b6d4", theme: "#3b82f6", bg: "bg-cyan-500" },
                                  { name: "Gold", badge: "#fbbf24", theme: "#f59e0b", bg: "bg-yellow-500" },
                                  { name: "Matrix", badge: "#34d399", theme: "#10b981", bg: "bg-emerald-500" },
                                  { name: "Cyber", badge: "#e879f9", theme: "#a855f7", bg: "bg-purple-500" },
                                  { name: "Orange", badge: "#fb923c", theme: "#ea580c", bg: "bg-orange-500" }
                                ].map((preset) => (
                                  <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => {
                                      setSelectedBadgeColor(preset.badge);
                                      setSelectedThemeColor(preset.theme);
                                    }}
                                    className={cn(
                                      "h-8 rounded-md text-[7px] font-bold uppercase transition-all border flex flex-col items-center justify-center p-0.5",
                                      selectedBadgeColor === preset.badge && selectedThemeColor === preset.theme
                                        ? "border-primary bg-primary/20 text-white scale-105"
                                        : "border-border bg-card hover:bg-secondary/15 text-muted-foreground"
                                    )}
                                    title={preset.name}
                                  >
                                    <span className={cn("w-1.5 h-1.5 rounded-full mb-0.5", preset.bg)} />
                                    <span>{preset.name[0]}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Verification Badge Style (e.g. Gold, Neon, Emerald) */}
                            <div className="space-y-1">
                              <label className="text-[7.5px] text-muted-foreground font-bold uppercase block">Verification Style</label>
                              <select
                                value={selectedVerificationBadgeStyle}
                                onChange={(e) => setSelectedVerificationBadgeStyle(e.target.value)}
                                className="flex h-7 w-full rounded-md border border-border bg-background px-2 py-0.5 text-[9px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                              >
                                <option value="gold" className="bg-card text-foreground">Executive Level</option>
                                <option value="neon" className="bg-card text-foreground">Standard Level</option>
                                <option value="emerald" className="bg-card text-foreground">Associate Level</option>
                                <option value="royal" className="bg-card text-foreground">Specialist Level</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] font-heading font-bold text-primary uppercase tracking-wider block">
                        Badge View Options
                      </span>
                    )}
                    
                    <div className="flex items-center justify-between border-t border-border/20 pt-2.5 mt-1">
                      <span className="text-[9.5px] font-bold text-muted-foreground">Show Back Badge</span>
                      <input
                        type="checkbox"
                        checked={isDoubleSided}
                        onChange={(e) => setIsDoubleSided(e.target.checked)}
                        className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {doc.type === "EXPERIENCE_LETTER" && previewMode === "certificate" && (
                  <div className="p-3 bg-secondary/5 rounded-xl border border-border/10 space-y-3">
                    <span className="text-[9px] font-heading font-bold text-primary uppercase tracking-wider block">
                      Certificate Theme Style
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["gold", "glacial", "emerald", "royal"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedCertTheme(t)}
                          className={cn(
                            "py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all border text-center",
                            selectedCertTheme === t
                              ? "bg-primary border-primary text-white"
                              : "bg-card border-border hover:bg-secondary/15 text-muted-foreground"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Parameters Logging */}
                <div className="p-3 bg-secondary/5 rounded-xl border border-border/10 space-y-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-muted-foreground font-bold uppercase">Associated Profile</span>
                    <span className="text-xs font-bold text-foreground mt-0.5">{doc.intern?.fullName}</span>
                    <span className="text-[9px] text-muted-foreground">{doc.intern?.email}</span>
                  </div>
                  
                  <div className="flex flex-col border-t border-border/20 pt-2">
                    <span className="text-[8px] text-muted-foreground font-bold uppercase">Compliance Type</span>
                    <span className="text-xs font-bold text-foreground mt-0.5">{doc.type.replace(/_/g, " ")}</span>
                  </div>

                  <div className="flex flex-col border-t border-border/20 pt-2">
                    <span className="text-[8px] text-muted-foreground font-bold uppercase">Enforcement Status</span>
                    <span className="text-xs font-bold mt-0.5 flex items-center space-x-1">
                      {isApproved ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-emerald-500">Approved & Signed</span>
                        </>
                      ) : doc.status === "REJECTED" ? (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="text-rose-500">Rejected & Locked</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 animate-pulse" />
                          <span className="text-amber-500">Awaiting Verification</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {isApproved && (
                  <div className="p-3 bg-emerald-500/[0.02] border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-heading font-bold text-[9px] uppercase tracking-wider">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Authorized Security Stamps</span>
                    </div>
                    
                    <div className="space-y-1.5 text-[9.5px]">
                      <div>
                        <span className="text-muted-foreground font-medium block">Signed On:</span>
                        <span className="font-bold text-foreground">{formatDate(doc.approvedAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium block">Signed By:</span>
                        <span className="font-bold text-foreground">{doc.approvedBy?.fullName || "AIMS Founder"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Print & Action Controls (Phase 10 Print Styles Isolated) */}
            <div className="space-y-3 pt-6 border-t border-border/40 select-none">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="w-full h-10 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-1.5 border-border/40 hover:bg-secondary/15"
              >
                <Printer className="h-4 w-4" />
                <span>{isIdCard ? "Print Cards (A4)" : "Print Credential (A4)"}</span>
              </Button>

              {!isApproved && (
                <div className="flex items-center space-x-2 w-full">
                  {isFounder ? (
                    <Button
                      onClick={() => handleSignDocument(doc.id)}
                      variant="primary"
                      size="sm"
                      className="flex-1 h-10 rounded-xl text-xs font-bold font-heading bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 text-white"
                      isLoading={actionLoading === doc.id}
                    >
                      <span>Sign & Approve</span>
                    </Button>
                  ) : (
                    <div className="flex-1 text-center bg-secondary border border-border/30 rounded-xl py-2.5 text-xs font-bold text-muted-foreground uppercase">
                      Awaiting Sign
                    </div>
                  )}

                  <Button
                    onClick={() => handleRejectDocument(doc.id)}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl text-rose-500 border-rose-500/25 hover:bg-rose-500/5 hover:border-rose-500/40"
                    isLoading={actionLoading === doc.id}
                  >
                    <XCircle className="h-4.5 w-4.5" />
                  </Button>
                </div>
              )}

              <Button
                onClick={() => setSelectedGeneratedDoc(null)}
                variant="secondary"
                size="sm"
                className="w-full h-10 rounded-xl text-xs font-bold font-heading"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Edit Draft Drawer Form dynamically per doc type
  function renderDraftEditorModal() {
    const doc = editingGeneratedDoc;
    const type = doc.type;
    const content = editFormContent;

    const handleFieldChange = (key: string, value: any) => {
      setEditFormContent({ ...editFormContent, [key]: value });
    };

    const handleTermsChange = (text: string) => {
      const arr = text.split("\n").filter((l) => l.trim().length > 0);
      handleFieldChange("terms", arr);
    };

    const handleClauseChange = (idx: number, field: "title" | "text", val: string) => {
      const arr = [...(content.clauses || [])];
      if (arr[idx]) {
        arr[idx] = { ...arr[idx], [field]: val };
      }
      handleFieldChange("clauses", arr);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-xs transition-opacity animate-fadeIn select-none">
        <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col justify-between shadow-2xl animate-slideLeft text-foreground relative">
          
          <button
            onClick={() => setEditingGeneratedDoc(null)}
            className="absolute top-4.5 right-4.5 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/15 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Editor Header */}
          <CardHeader className="pb-4 border-b border-border/40 shrink-0">
            <CardTitle className="text-base flex items-center space-x-1.5">
              <Edit className="h-4.5 w-4.5 text-primary" />
              <span>Customize Draft Content: {type.replace(/_/g, " ")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Adjust text paragraphs and metadata parameters for compliance before digital signing.</CardDescription>
          </CardHeader>

          {/* Dynamic Scrollable Form Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold select-text">
            {type === "OFFER_LETTER" && (
              <>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Letter Title</label>
                  <Input value={content.title || ""} onChange={(e) => handleFieldChange("title", e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Salutation Text</label>
                  <Input value={content.salutation || ""} onChange={(e) => handleFieldChange("salutation", e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Introduction Paragraph</label>
                  <textarea
                    rows={4}
                    value={content.introduction || ""}
                    onChange={(e) => handleFieldChange("introduction", e.target.value)}
                    className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Designated Role</label>
                    <Input value={content.role || ""} onChange={(e) => handleFieldChange("role", e.target.value)} />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Department</label>
                    <Input value={content.department || ""} onChange={(e) => handleFieldChange("department", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Start Date</label>
                    <Input value={content.startDate || ""} onChange={(e) => handleFieldChange("startDate", e.target.value)} />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">End Date</label>
                    <Input value={content.endDate || ""} onChange={(e) => handleFieldChange("endDate", e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Stipend Value</label>
                  <Input value={content.stipend || ""} onChange={(e) => handleFieldChange("stipend", e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Terms (One clause per line)</label>
                  <textarea
                    rows={6}
                    value={(content.terms || []).join("\n")}
                    onChange={(e) => handleTermsChange(e.target.value)}
                    className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-sans font-medium"
                  />
                </div>
              </>
            )}

            {type === "NDA" && (
              <>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Agreement Title</label>
                  <Input value={content.title || ""} onChange={(e) => handleFieldChange("title", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Party A (Company)</label>
                    <Input value={content.partyA || ""} onChange={(e) => handleFieldChange("partyA", e.target.value)} />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Party B (Recipient)</label>
                    <Input value={content.partyB || ""} onChange={(e) => handleFieldChange("partyB", e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Effective Commencement Date</label>
                  <Input value={content.effectiveDate || ""} onChange={(e) => handleFieldChange("effectiveDate", e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Governing Law Jurisdiction</label>
                  <Input value={content.governingLaw || ""} onChange={(e) => handleFieldChange("governingLaw", e.target.value)} />
                </div>

                <div className="space-y-4 pt-3 border-t border-border/20">
                  <label className="text-[10px] font-heading font-extrabold text-primary uppercase block">Agreement Clauses</label>
                  {(content.clauses || []).map((c: any, idx: number) => (
                    <div key={idx} className="p-3 bg-secondary/5 rounded-xl border border-border/20 space-y-2">
                      <div className="flex flex-col space-y-1">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold">Clause Title</span>
                        <Input value={c.title || ""} onChange={(e) => handleClauseChange(idx, "title", e.target.value)} />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold">Clause Text</span>
                        <textarea
                          rows={3}
                          value={c.text || ""}
                          onChange={(e) => handleClauseChange(idx, "text", e.target.value)}
                          className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {type === "ID_CARD" && (
              <>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Company Name</label>
                  <Input value={content.companyName || ""} onChange={(e) => handleFieldChange("companyName", e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Full Name</label>
                  <Input value={content.fullName || ""} onChange={(e) => handleFieldChange("fullName", e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Designated Role</label>
                  <Input value={content.role || ""} onChange={(e) => handleFieldChange("role", e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Business Department</label>
                  <Input value={content.department || ""} onChange={(e) => handleFieldChange("department", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Joining Date</label>
                    <Input value={content.joiningDate || ""} onChange={(e) => handleFieldChange("joiningDate", e.target.value)} />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Valid Until</label>
                    <Input value={content.validUntil || ""} onChange={(e) => handleFieldChange("validUntil", e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {type === "EXPERIENCE_LETTER" && (
              <>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Letter Title</label>
                  <Input value={content.title || ""} onChange={(e) => handleFieldChange("title", e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Salutation Text</label>
                  <Input value={content.salutation || ""} onChange={(e) => handleFieldChange("salutation", e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Main Letter Body</label>
                  <textarea
                    rows={5}
                    value={content.body || ""}
                    onChange={(e) => handleFieldChange("body", e.target.value)}
                    className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Assigned Role</label>
                    <Input value={content.role || ""} onChange={(e) => handleFieldChange("role", e.target.value)} />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Department</label>
                    <Input value={content.department || ""} onChange={(e) => handleFieldChange("department", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Start Date</label>
                    <Input value={content.startDate || ""} onChange={(e) => handleFieldChange("startDate", e.target.value)} />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground">End Date</label>
                    <Input value={content.endDate || ""} onChange={(e) => handleFieldChange("endDate", e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Performance Notes</label>
                  <textarea
                    rows={4}
                    value={content.performanceNotes || ""}
                    onChange={(e) => handleFieldChange("performanceNotes", e.target.value)}
                    className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-6 border-t border-border shrink-0 select-none bg-secondary/5 flex items-center justify-end space-x-3.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditingGeneratedDoc(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditedDraft}
              variant="primary"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 px-4"
              isLoading={loading}
            >
              <Check className="h-4 w-4" />
              <span>Save & Compile Draft</span>
            </Button>
          </div>

        </div>
      </div>
    );
  }
}
