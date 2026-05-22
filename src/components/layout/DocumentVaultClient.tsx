"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  Sparkles,
  Barcode,
  RotateCw,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

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

const REQUIRED_DOCS = [
  { type: "OFFER_LETTER", label: "Offer Letter" },
  { type: "RESUME", label: "Resume" },
  { type: "ID_PROOF", label: "ID Proof / SSN" },
  { type: "AGREEMENT", label: "Signed Agreement" },
  { type: "CERTIFICATE", label: "Program Certificate" },
  { type: "NDA", label: "NDA (Non-Disclosure Agreement)" },
  { type: "EXPERIENCE_LETTER", label: "Experience Letter" }
];

export default function DocumentVaultClient({ initialInterns, role }: DocumentVaultClientProps) {
  const router = useRouter();
  const isSuperUser = role === "FOUNDER" || role === "HR";
  const isFounder = role === "FOUNDER";

  // Tab State
  const [activeTab, setActiveTab] = useState<"compliance" | "approvals">("compliance");

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

  // Custom high-fidelity workspace for regular enrollee Interns
  if (role === "INTERN") {
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

      if (selectedFile.size > 100 * 1024) {
        setError("Rejected: Selected file exceeds the strict maximum limit of 100 KB. Please compress the file.");
        setLoading(false);
        return;
      }

      const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Rejected: Only PDF, JPEG, and PNG files are permitted for secure upload.");
        setLoading(false);
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
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
      <div className="space-y-6 select-none relative animate-fadeIn text-foreground">
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
                {(!myRecord.generatedDocuments || myRecord.generatedDocuments.length === 0) ? (
                  <div className="py-12 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider flex flex-col items-center space-y-3">
                    <FileText className="h-8 w-8 text-muted-foreground/40 animate-pulse" />
                    <span>No generated credentials issued yet.</span>
                  </div>
                ) : (
                  myRecord.generatedDocuments.map((doc) => {
                    const isApproved = doc.status === "APPROVED";
                    
                    return (
                      <div
                        key={doc.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all duration-300 flex flex-col space-y-4",
                          isApproved
                            ? "bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/25 hover:border-emerald-500/40"
                            : "bg-secondary/5 border-border/40 opacity-75"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-heading font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                              AURXON OFFICIAL CERTIFICATE
                            </span>
                            <h4 className="text-sm font-bold">{doc.type.replace(/_/g, " ")}</h4>
                            <p className="text-[10px] text-muted-foreground">
                              Issued {formatDate(doc.approvedAt || doc.createdAt || new Date())}
                            </p>
                          </div>
                          
                          <div className="shrink-0">
                            {isApproved ? (
                              <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wide">
                                <CheckCircle className="h-3 w-3" />
                                <span>Approved & Signed</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wide">
                                <Clock className="h-3 w-3 animate-pulse" />
                                <span>Awaiting Approval</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Signature stamp representation */}
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
                                {doc.signature}
                              </span>
                            </div>

                            {/* View/Print actions */}
                            <div className="flex items-center justify-end space-x-3 pt-2">
                              <Button
                                onClick={() => setSelectedGeneratedDoc(doc)}
                                size="sm"
                                variant="primary"
                                className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 border border-white/5 rounded-xl transition-all shadow-md select-none"
                              >
                                <Eye className="h-4 w-4 mr-1.5" />
                                <span>View & Download Credential</span>
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="bg-secondary/5 border border-dashed border-border/40 rounded-xl p-3.5 text-center text-xs text-muted-foreground italic">
                            This document is locked and will be generated automatically with dynamic signatures once the Founder approves your learning seat.
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
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
                          <span className="text-[9px] text-amber-500 font-bold block">Missing Document File</span>
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

    if (selectedFile.size > 100 * 1024) {
      setError("Rejected: Selected file exceeds the strict maximum limit of 100 KB. Please compress the file.");
      setLoading(false);
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Rejected: Only PDF, JPEG, and PNG files are permitted for secure upload.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
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
        body: JSON.stringify({ internId, type }),
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
      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, action: "APPROVE", notes: "Approved and digitally signed under Founder authority." }),
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
    if (!doc) return { status: "missing", element: null };
    if (doc.verified) {
      return {
        status: "verified",
        element: (
          <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 select-none bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 shrink-0 text-[10px]">
            <CheckCircle className="h-3 w-3 shrink-0" />
            <span>Verified</span>
          </div>
        )
      };
    }
    return {
      status: "pending",
      element: (
        <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 select-none bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25 shrink-0 text-[10px]">
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
    <div className="space-y-6 select-none relative animate-fadeIn text-foreground">
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
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/15 text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                  <th className="py-4 px-6">Enrollee Profile</th>
                  <th className="py-4 px-6">Department / Supervisor</th>
                  <th className="py-4 px-6 text-center">Compliance Roster</th>
                  <th className="py-4 px-6 text-center">Actions</th>
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
                  filteredInterns.map((intern) => (
                    <tr key={intern.id} className="hover:bg-secondary/10 hover:text-foreground transition-colors duration-150">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-sm">{intern.fullName}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{intern.internId || intern.id} • {intern.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{intern.department}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            Mentored by: {intern.supervisor?.fullName || "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-2.5">
                          {REQUIRED_DOCS.map((docType) => {
                            const state = getDocStatus(intern, docType.type);
                            return (
                              <div
                                key={docType.type}
                                title={`${docType.label}: ${state.status.toUpperCase()}`}
                                className={cn(
                                  "flex flex-col items-center space-y-1.5 p-2 bg-secondary/5 border rounded-lg select-none shrink-0 min-w-16 transition-all duration-200 hover:bg-secondary/10 hover:border-border",
                                  state.status === "verified"
                                    ? "border-emerald-500/20"
                                    : state.status === "pending"
                                    ? "border-amber-500/20"
                                    : "border-border/40"
                                )}
                              >
                                <span className="text-[8px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                                  {docType.type.split("_")[0]}
                                </span>
                                {state.element ? (
                                  state.element
                                ) : (
                                  <div className="text-[9px] text-muted-foreground font-bold bg-secondary/20 px-2 py-0.5 rounded border border-border/10">
                                    Missing
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
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
                  ))
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
                                ? "border-emerald-500/20"
                                : state.status === "pending"
                                ? "border-amber-500/20"
                                : "border-border/20"
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
                                <span className="text-[7.5px] text-muted-foreground/60 font-bold block uppercase">Missing</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allGeneratedDocuments.length === 0 ? (
                <div className="py-12 text-center col-span-full text-sm font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2">
                  <FolderOpen className="h-10 w-10 text-muted-foreground/35 animate-bounce" />
                  <span>No dynamic document drafts generated inside the system yet.</span>
                </div>
              ) : (
                allGeneratedDocuments.map((doc) => {
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
                })
              )}
            </div>
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

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 transition-opacity animate-fadeIn overflow-y-auto select-none print:p-0 print:bg-white print:backdrop-blur-none">
        <div className="w-full max-w-4xl flex flex-col md:flex-row bg-card border border-border shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] md:max-h-[85vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
          {/* Close button inside modal */}
          <button
            onClick={() => setSelectedGeneratedDoc(null)}
            className="absolute top-4.5 right-4.5 text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer z-20 print:hidden"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Left Column: Premium Preview Element */}
          <div className="flex-1 p-6 md:p-10 flex items-center justify-center bg-secondary/10 overflow-y-auto select-text print:bg-white print:p-0">
            {isIdCard ? (
              /* Sleek Vertical Digital ID Card Preview */
              <div id="aims-id-card-print" className="w-[300px] h-[480px] bg-gradient-to-b from-[#050811] via-[#0b132b] to-[#1c2541] border border-cyan-500/30 rounded-2xl relative shadow-2xl overflow-hidden p-6 flex flex-col items-center justify-between text-white border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)] select-none print:shadow-none print:border print:border-cyan-500/40">
                {/* Hologram Gradient background overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
                
                {/* Header */}
                <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-1.5">
                    {/* Holograph Logo SVG */}
                    <svg className="h-5 w-5 text-cyan-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#logoGrad)" />
                      <path d="M2 17L12 22L22 17M2 12L17L22 12" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <defs>
                        <linearGradient id="logoGrad" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#3b82f6" />
                          <stop offset="1" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="font-heading font-extrabold text-xs tracking-widest text-cyan-400 uppercase">
                      {content.companyName || "AURXON"}
                    </span>
                  </div>
                  <span className="text-[7.5px] font-heading font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                    Official Pass
                  </span>
                </div>

                {/* Photo / Initial SVG */}
                <div className="my-3.5 relative flex flex-col items-center">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                      {content.avatarUrl ? (
                        <img src={content.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-heading font-extrabold text-3xl text-cyan-400 tracking-tight select-none">
                          {content.fullName ? content.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : "AX"}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Holographic Security Overlay Seal */}
                  <div className="absolute -bottom-1 -right-1 p-1 bg-[#0b132b] rounded-full border border-cyan-500/30">
                    <ShieldCheck className="h-4.5 w-4.5 text-cyan-400" />
                  </div>
                </div>

                {/* Info block */}
                <div className="text-center space-y-1 w-full">
                  <h3 className="font-heading font-extrabold text-lg text-white tracking-tight leading-snug">
                    {content.fullName}
                  </h3>
                  <span className="text-[10px] font-heading font-bold text-cyan-400 uppercase tracking-widest block">
                    {content.role || "Engineering Intern"}
                  </span>
                  <p className="text-[9px] text-gray-400 font-semibold">{content.department} Department</p>
                </div>

                {/* ID & Dates Grid */}
                <div className="grid grid-cols-2 gap-3 w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-left my-2">
                  <div>
                    <span className="text-[7.5px] text-gray-500 font-bold uppercase tracking-wider block">Program ID</span>
                    <span className="text-[10px] font-bold font-mono text-white tracking-wide">{content.internId}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] text-gray-500 font-bold uppercase tracking-wider block">Valid Until</span>
                    <span className="text-[10px] font-bold font-mono text-white tracking-wide">{content.validUntil || "PERMANENT"}</span>
                  </div>
                </div>

                {/* Footer security features */}
                <div className="w-full flex flex-col items-center space-y-2 border-t border-white/5 pt-3">
                  {/* Barcode SVG */}
                  <div className="w-full flex justify-center py-1 bg-white/5 border border-white/10 rounded-lg select-none">
                    <svg className="h-6 w-44 text-gray-300" viewBox="0 0 100 20" fill="currentColor">
                      <rect x="5" y="2" width="2" height="16" />
                      <rect x="9" y="2" width="1" height="16" />
                      <rect x="12" y="2" width="3" height="16" />
                      <rect x="17" y="2" width="1" height="16" />
                      <rect x="20" y="2" width="2" height="16" />
                      <rect x="24" y="2" width="1" height="16" />
                      <rect x="27" y="2" width="4" height="16" />
                      <rect x="33" y="2" width="1" height="16" />
                      <rect x="36" y="2" width="2" height="16" />
                      <rect x="40" y="2" width="1" height="16" />
                      <rect x="43" y="2" width="3" height="16" />
                      <rect x="48" y="2" width="1" height="16" />
                      <rect x="51" y="2" width="2" height="16" />
                      <rect x="55" y="2" width="1" height="16" />
                      <rect x="58" y="2" width="4" height="16" />
                      <rect x="64" y="2" width="1" height="16" />
                      <rect x="67" y="2" width="2" height="16" />
                      <rect x="71" y="2" width="1" height="16" />
                      <rect x="74" y="2" width="3" height="16" />
                      <rect x="79" y="2" width="1" height="16" />
                      <rect x="82" y="2" width="2" height="16" />
                      <rect x="86" y="2" width="4" height="16" />
                      <rect x="92" y="2" width="2" height="16" />
                    </svg>
                  </div>

                  {/* Verification SHA256 string stamp */}
                  {doc.signature ? (
                    <div className="w-full text-center">
                      <span className="text-[6.5px] font-mono text-cyan-400 break-all select-all block leading-tight">
                        {doc.signature}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[7px] text-amber-400 font-bold uppercase tracking-widest animate-pulse">
                      Awaiting Digital Signature
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* High-Fidelity Professional Letter / NDA / Experience Letter */
              <div id="aims-document-print" className="w-full max-w-xl min-h-[720px] bg-white border border-gray-200 shadow-2xl p-8 sm:p-12 flex flex-col justify-between text-slate-800 relative font-sans leading-relaxed text-sm select-text rounded-xl print:shadow-none print:border-none print:p-0">
                
                {/* Background Watermark */}
                {isApproved && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none z-0">
                    <svg className="h-[350px] w-[350px] text-cyan-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
                    </svg>
                  </div>
                )}

                <div className="space-y-6 z-10 relative">
                  {/* Company Letterhead */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-heading">
                        {content.companyName || "AURXON DB & SOFTWARE SYSTEMS"}
                      </h2>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                        Enterprise Databases • API Orchestrations • Automated Operations
                      </p>
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

                  {/* Recipient / Body content */}
                  {doc.type === "OFFER_LETTER" && (
                    <div className="space-y-4 text-xs text-slate-700">
                      <p className="font-bold">{content.salutation}</p>
                      <p>{content.introduction}</p>
                      
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 space-y-2.5 my-3">
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
                        <div className="space-y-2 pt-2">
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
                        <div key={i} className="space-y-1">
                          <h4 className="font-bold text-slate-900">{c.title}</h4>
                          <p className="leading-relaxed pl-2.5 text-[11px] text-slate-600">{c.text}</p>
                        </div>
                      ))}

                      <div className="pt-2 text-[10px]">
                        <span className="font-bold text-slate-900 block">Governing Jurisdiction:</span>
                        <p>{content.governingLaw}</p>
                      </div>
                    </div>
                  )}

                  {doc.type === "EXPERIENCE_LETTER" && (
                    <div className="space-y-4 text-xs text-slate-700">
                      <p className="font-heading font-extrabold text-slate-900 py-1">{content.salutation}</p>
                      <p className="leading-relaxed">{content.body}</p>
                      
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 space-y-2.5 my-3">
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

                {/* Bottom Signature Section */}
                <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 z-10 relative">
                  <div className="text-[10px] text-slate-500">
                    <span className="font-bold block uppercase tracking-wider text-slate-700">Audit Compliance Guard</span>
                    <span>AURXON AIMS document generation node.</span>
                  </div>
                  
                  {isApproved ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 w-full sm:max-w-xs space-y-1 text-left select-text">
                      <div className="flex items-center space-x-1 text-emerald-700 font-heading font-extrabold text-[8px] uppercase tracking-wider">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>AURXON SECURE SEAL VERIFIED</span>
                      </div>
                      <p className="text-[9px] text-slate-600 leading-tight">
                        Signed & authorized under SUPER-ADMIN credentials
                      </p>
                      <span className="block text-[7.5px] font-mono text-cyan-700 dark:text-cyan-600 break-all select-all leading-none mt-1.5">
                        {doc.signature}
                      </span>
                    </div>
                  ) : (
                    <div className="text-amber-500 font-bold uppercase tracking-widest text-[9px] border border-dashed border-amber-300 rounded px-2.5 py-1.5 animate-pulse bg-amber-50/50">
                      Unsigned Draft Copy
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Credentials Metadata Panel */}
          <div className="w-full md:w-80 bg-card p-6 md:p-8 border-t md:border-t-0 md:border-l border-border/40 flex flex-col justify-between shrink-0 max-h-[45vh] md:max-h-none overflow-y-auto select-none print:hidden">
            <div className="space-y-6">
              <div>
                <span className="text-[9px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                  Metadata & Audit Log
                </span>
                <h4 className="text-base font-extrabold text-foreground mt-1.5">Document Audit Panel</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Secure verification parameters tracked by AIMS blockchain-style log.</p>
              </div>

              <div className="space-y-3">
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
                          <span className="text-emerald-500">Approved & Cryptographically Signed</span>
                        </>
                      ) : doc.status === "REJECTED" ? (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="text-rose-500">Rejected & Locked</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 animate-pulse" />
                          <span className="text-amber-500">Draft Awaiting Verification</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {isApproved && (
                  <div className="p-3.5 bg-emerald-500/[0.02] border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-heading font-extrabold text-[9px] uppercase tracking-wider">
                      <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
                      <span>Security Stamps verified</span>
                    </div>
                    
                    <div className="space-y-1.5 text-[10px]">
                      <div>
                        <span className="text-muted-foreground font-semibold block">Signed On:</span>
                        <span className="font-bold text-foreground">{formatDate(doc.approvedAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-semibold block">Signed By:</span>
                        <span className="font-bold text-foreground">{doc.approvedBy?.fullName || "AIMS Founder"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-border/40 select-none">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="w-full h-10 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-1.5 border-border/40 hover:bg-secondary/15"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official Badge</span>
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
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      <span>Sign & Authorize</span>
                    </Button>
                  ) : (
                    <div className="flex-1 text-center bg-secondary border border-border/30 rounded-xl py-2 text-xs font-bold text-muted-foreground uppercase">
                      Lock Signature
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
