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
  User
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface DocumentItem {
  id: string;
  type: "OFFER_LETTER" | "RESUME" | "ID_PROOF" | "AGREEMENT" | "CERTIFICATE";
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
}

interface DocumentVaultClientProps {
  initialInterns: InternRecord[];
  role: string;
}

const REQUIRED_DOCS = [
  { type: "OFFER_LETTER", label: "Offer Letter" },
  { type: "RESUME", label: "Resume" },
  { type: "ID_PROOF", label: "ID Proof" },
  { type: "AGREEMENT", label: "NDA Agreement" },
  { type: "CERTIFICATE", label: "Certificate" }
];

export default function DocumentVaultClient({ initialInterns, role }: DocumentVaultClientProps) {
  const router = useRouter();
  const isSuperUser = role === "FOUNDER" || role === "HR";

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

  // Global Compliance Statistics
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

  // Document Upload Action
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

      setSuccess("Document file persisted successfully into Vercel Blob!");
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

  // Helper: check document status inside enrollee record
  const getDocStatus = (intern: InternRecord, type: string) => {
    const doc = intern.documents.find((d) => d.type === type);
    if (!doc) return { status: "missing", element: null };
    if (doc.verified) {
      return {
        status: "verified",
        element: (
          <div className="flex items-center space-x-1 text-emerald-400 select-none bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 shrink-0 text-[10px]">
            <CheckCircle className="h-3 w-3 shrink-0" />
            <span>Verified</span>
          </div>
        )
      };
    }
    return {
      status: "pending",
      element: (
        <div className="flex items-center space-x-1 text-amber-400 select-none bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25 shrink-0 text-[10px]">
          <Clock className="h-3 w-3 shrink-0 animate-pulse" />
          <span>Review</span>
        </div>
      )
    };
  };

  return (
    <div className="space-y-6 select-none relative animate-fadeIn text-white">
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-white tracking-tight">
            AURXON Compliance Document Vault
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Audit offer letters, NDAs, identity records, and release compliance certificates.
          </p>
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

      {/* Notifications */}
      {error && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs animate-pulse">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs">
          <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* 2. Analytical compliance meter header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md flex flex-col justify-between p-5 md:col-span-2 rounded-2xl shadow-xl">
          <div>
            <span className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
              Overall Compliance Ratio
            </span>
            <div className="flex items-end justify-between mt-3">
              <span className="text-4xl font-heading font-extrabold tracking-tight text-white">
                {complianceRate}%
              </span>
              <span className="text-[10px] text-gray-400 font-bold">
                {totalVerified} of {totalRequired} documents verified
              </span>
            </div>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full mt-4.5 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </Card>

        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between pb-3.5">
            <span className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
              Total Uploaded
            </span>
            <div className="p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-heading font-extrabold text-white">{totalUploaded}</span>
          <p className="text-[10px] text-gray-400 mt-1 font-semibold">Pending and verified file logs</p>
        </Card>

        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between pb-3.5">
            <span className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
              Audit Pending Review
            </span>
            <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-heading font-extrabold text-white">{totalUploaded - totalVerified}</span>
          <p className="text-[10px] text-gray-400 mt-1 font-semibold">Awaiting admin verifications</p>
        </Card>
      </div>

      {/* 3. Search and interactive folder roster */}
      <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-0 overflow-hidden shadow-lg rounded-2xl">
        {/* Search controls */}
        <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center space-x-3.5">
          <Search className="h-4.5 w-4.5 text-gray-400 shrink-0" />
          <Input
            placeholder="Search enrollee name, university, or program ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-none bg-transparent p-0 h-auto focus:ring-0 focus:border-none focus:outline-none placeholder-gray-500 text-white"
          />
        </div>

        {/* Desktop View: Table (md and larger) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                <th className="py-4 px-6">Enrollee Profile</th>
                <th className="py-4 px-6">Department / Supervisor</th>
                <th className="py-4 px-6 text-center">Compliance Roster</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs font-medium text-gray-300">
              {filteredInterns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm font-semibold text-gray-500">
                    <div className="flex flex-col items-center space-y-2.5">
                      <FolderOpen className="h-8 w-8 text-gray-600" />
                      <span>No enrollees match your search criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInterns.map((intern) => (
                  <tr key={intern.id} className="hover:bg-white/[0.02] hover:text-white transition-colors duration-150">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">{intern.fullName}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{intern.internId || intern.id} • {intern.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{intern.department}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">
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
                                "flex flex-col items-center space-y-1.5 p-2 bg-white/[0.02] border rounded-lg select-none shrink-0 min-w-16 transition-all duration-200 hover:bg-white/[0.04] hover:border-white/20",
                                state.status === "verified"
                                  ? "border-emerald-500/20"
                                  : state.status === "pending"
                                  ? "border-amber-500/20"
                                  : "border-white/[0.06]"
                              )}
                            >
                              <span className="text-[8px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                                {docType.type.split("_")[0]}
                              </span>
                              {state.element ? (
                                state.element
                              ) : (
                                <div className="text-[9px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/[0.04]">
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
                        onClick={() => setSelectedIntern(intern)}
                        variant="outline"
                        size="sm"
                        className="h-8.5 text-[10px] font-bold border-white/[0.08] hover:bg-white/[0.04]"
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0 mr-1.5 text-cyan-400" />
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
            <div className="py-12 text-center text-xs font-semibold text-gray-500">
              No enrollees match your search criteria.
            </div>
          ) : (
            filteredInterns.map((intern) => {
              const uploadedCount = intern.documents.length;
              const verifiedCount = intern.documents.filter(d => d.verified).length;
              return (
                <div
                  key={`vault-${intern.id}`}
                  className="p-4 rounded-xl border border-white/[0.08] bg-[#0b0f19]/70 space-y-3.5"
                >
                  {/* Mobile Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{intern.fullName}</h4>
                      <span className="text-[9px] font-mono text-cyan-400 block tracking-wide">
                        {intern.internId || intern.id}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">{intern.department} • Mentor: {intern.supervisor?.fullName || "Unassigned"}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                        {verifiedCount}/{REQUIRED_DOCS.length} Verified
                      </span>
                    </div>
                  </div>

                  {/* Micro compliance progress bar */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
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
                            "flex flex-col items-center justify-between p-1.5 rounded-lg border bg-white/[0.01] min-h-12 justify-center",
                            state.status === "verified"
                              ? "border-emerald-500/20"
                              : state.status === "pending"
                              ? "border-amber-500/20"
                              : "border-white/[0.04]"
                          )}
                        >
                          <span className="text-[7.5px] font-bold text-gray-400 uppercase tracking-wide">
                            {docType.type.split("_")[0]}
                          </span>
                          <div className="mt-1">
                            {state.status === "verified" ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            ) : state.status === "pending" ? (
                              <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                            ) : (
                              <span className="text-[7.5px] text-gray-500 font-bold block uppercase">Missing</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action launcher */}
                  <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-end">
                    <Button
                      onClick={() => setSelectedIntern(intern)}
                      variant="outline"
                      size="sm"
                      className="w-full py-2.5 rounded-xl text-xs font-bold border-white/[0.08] hover:bg-white/[0.04] flex items-center justify-center space-x-1.5"
                    >
                      <Eye className="h-4 w-4 text-cyan-400" />
                      <span>Manage Compliance Vault</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* 4. Sliding Manage Document Vault Overlay */}
      {selectedIntern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-2xl">
            <Card className="border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl relative rounded-2xl overflow-hidden text-white">
              <button
                onClick={() => setSelectedIntern(null)}
                className="absolute top-4.5 right-4.5 text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <FileCheck className="h-5 w-5 text-cyan-400" />
                  <span>Compliance Roster: {selectedIntern.fullName}</span>
                </CardTitle>
                <CardDescription className="text-gray-400">ID: {selectedIntern.internId || selectedIntern.id} • Department: {selectedIntern.department}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Documents List */}
                <div className="space-y-3">
                  <span className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                    Uploaded File Inventory
                  </span>
                  {selectedIntern.documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-white/[0.01] border border-white/[0.06] rounded-xl text-xs font-semibold text-gray-400 space-y-2">
                      <AlertTriangle className="h-6 w-6 text-gray-500 shrink-0" />
                      <span>No files uploaded under this profile yet.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {selectedIntern.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.06] hover:border-white/20 transition-all gap-3"
                        >
                          <div className="flex space-x-3.5 min-w-0">
                            <div className="h-8.5 w-8.5 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400 shrink-0 border border-cyan-500/20">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-white truncate">{doc.fileName}</span>
                                <span className="text-[8px] font-heading font-extrabold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-lg select-none uppercase tracking-wider shrink-0">
                                  {doc.type}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">Uploaded {formatDate(doc.createdAt)}</p>
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
                                  className="h-7.5 px-2.5 text-[9px] font-bold text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/5 hover:border-emerald-500/30 rounded-lg"
                                >
                                  Verify File
                                </Button>
                              ) : (
                                <div className="flex items-center space-x-1 text-amber-400 select-none bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-[9px] font-bold uppercase tracking-wide">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span>Awaiting review</span>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center space-x-1 text-emerald-400 select-none bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wide">
                                <CheckCircle className="h-3 w-3 shrink-0" />
                                <span>Verified</span>
                              </div>
                            )}

                            {/* View File link */}
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center h-7.5 px-2.5 text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all select-none"
                            >
                              Open File
                            </a>

                            {/* Delete File action (Admin Only) */}
                            {isSuperUser && (
                              <Button
                                onClick={() => handleDelete(doc.id)}
                                variant="outline"
                                size="sm"
                                className="h-7.5 w-7.5 p-0 text-red-400 border-red-500/25 hover:bg-red-500/10 rounded-lg"
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

                <div className="flex justify-end pt-3 border-t border-white/[0.08] select-none">
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
            <Card className="border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl relative rounded-2xl overflow-hidden text-white">
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setSelectedFile(null);
                }}
                className="absolute top-4.5 right-4.5 text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <CardHeader className="pb-4">
                <CardTitle>Vault File Upload</CardTitle>
                <CardDescription className="text-gray-400">Register compliance forms directly to Vercel CDN storage.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpload} className="space-y-4.5">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Target Enrollee Profile
                    </label>
                    <select
                      value={targetInternId}
                      onChange={(e) => setTargetInternId(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0b0f19] text-white">Select Enrollee Profile...</option>
                      {initialInterns.map((i) => (
                        <option key={i.id} value={i.id} className="bg-[#0b0f19] text-white">
                          {i.fullName} ({i.internId || i.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Compliance Category
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all cursor-pointer"
                    >
                      {REQUIRED_DOCS.map((doc) => (
                        <option key={doc.type} value={doc.type} className="bg-[#0b0f19] text-white">
                          {doc.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Document File Attachment
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      required
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="flex w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-heading file:font-bold file:bg-cyan-500/10 file:text-cyan-400 file:cursor-pointer hover:file:bg-cyan-500/20 border border-white/10 rounded-xl p-1 bg-white/5"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.08] select-none">
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
    </div>
  );
}
