"use client";

import React, { useState } from "react";
import {
  FileText,
  FileCheck,
  Award,
  Key,
  CreditCard,
  Download,
  Eye,
  Search,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import IdCardGenerator from "@/components/layout/IdCardGenerator";
import { parseInternNotes } from "@/lib/roles";

interface InternProfile {
  id: string;
  fullName: string;
  internId: string;
  department: string;
  roleDomain: string;
  employmentType: string;
  startDate: string;
  status: string;
  reportingManager: string;
  notes: string | null;
}

interface GeneratedDoc {
  id: string;
  internId: string;
  type: string;
  content: any;
  version: number;
  lifecycleStatus: string;
  watermarkStatus: string;
  status: string;
  signature: string | null;
  candidateSigned: boolean;
  founderSigned: boolean;
  founderSignatory: string | null;
  fileUrl: string | null;
  gcsFileId: string | null;
  verificationHash: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}

interface SecureDoc {
  id: string;
  fileId: string;
  fileName: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  ownerId: string;
  uploadedById: string;
  uploadDate: string;
  sha256Hash: string;
  documentCategory: string;
  version: number;
  bucketUsed: string;
  archived: boolean;
}

interface MyDocumentsClientProps {
  internProfile: InternProfile;
  generatedDocs: GeneratedDoc[];
  secureDocs: SecureDoc[];
  isDemoMode?: boolean;
}

export default function MyDocumentsClient({
  internProfile,
  generatedDocs,
  secureDocs,
  isDemoMode = false
}: MyDocumentsClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "offer" | "agreement" | "nda" | "certificates" | "uploads" | "verification">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ type: "generated" | "secure"; doc: any } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Helper to copy text to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Maps database document types to user-friendly titles
  const getDocumentLabel = (type: string) => {
    switch (type) {
      case "OFFER_LETTER":
        return "Internship Offer Letter";
      case "AGREEMENT":
        return "Internship Agreement";
      case "NDA":
        return "Mutual Non-Disclosure Agreement";
      case "EMPLOYEE_OFFER_LETTER":
        return "Employee Employment Offer";
      case "EMPLOYEE_AGREEMENT":
        return "Employment Agreement";
      case "EMPLOYEE_NDA":
        return "Employee Proprietary NDA";
      case "CONTRACT_OFFER_LETTER":
        return "Independent Contractor Offer";
      case "CONTRACT_AGREEMENT":
        return "Service Execution Agreement";
      case "CONTRACT_NDA":
        return "Contractor Non-Disclosure Covenant";
      case "EXPERIENCE_LETTER":
        return "Official Experience Certificate";
      case "COMPLETION_CERTIFICATE":
        return "Program Completion Certificate";
      case "ID_CARD":
        return "Digital ID Credential Card";
      default:
        return type.replace(/_/g, " ");
    }
  };

  // Maps categories to appropriate icons
  const getDocumentIcon = (type: string) => {
    if (type.includes("OFFER")) return FileText;
    if (type.includes("AGREEMENT")) return FileCheck;
    if (type.includes("NDA")) return Key;
    if (type.includes("CERTIFICATE") || type.includes("EXPERIENCE")) return Award;
    if (type.includes("ID_CARD")) return CreditCard;
    return FileText;
  };

  // Group and filter items
  const filteredGenerated = generatedDocs.filter((doc) => {
    const label = getDocumentLabel(doc.type).toLowerCase();
    const searchMatch = label.includes(searchQuery.toLowerCase()) || doc.id.includes(searchQuery);
    
    if (!searchMatch) return false;
    if (activeTab === "all") return true;
    if (activeTab === "offer" && doc.type.includes("OFFER")) return true;
    if (activeTab === "agreement" && doc.type.includes("AGREEMENT")) return true;
    if (activeTab === "nda" && doc.type.includes("NDA")) return true;
    if (activeTab === "certificates" && (doc.type.includes("CERTIFICATE") || doc.type.includes("EXPERIENCE") || doc.type.includes("ID_CARD"))) return true;
    return false;
  });

  const filteredSecure = secureDocs.filter((doc) => {
    const label = doc.fileName.toLowerCase();
    const searchMatch = label.includes(searchQuery.toLowerCase()) || doc.documentCategory.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!searchMatch) return false;
    if (activeTab === "all" || activeTab === "uploads") return true;
    return false;
  });

  const totalCount = filteredGenerated.length + filteredSecure.length;

  return (
    <div className="space-y-8 select-none font-sans text-slate-200 antialiased">
      {/* Top Header Card */}
      <div className="relative overflow-hidden bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] font-heading font-extrabold bg-gradient-to-r from-orange-400 to-amber-500 text-slate-950 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {internProfile.employmentType}
            </span>
            <span className="text-xs text-slate-400 font-medium">AURXON Vault Integration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight leading-tight">
            User Document Center
          </h1>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            Welcome, <span className="text-white font-semibold">{internProfile.fullName}</span>. Access, view, and securely verify all official employment contracts, NDAs, credentials, and uploaded compliance items.
          </p>
        </div>

        {isDemoMode && (
          <div className="flex items-center space-x-2.5 bg-amber-500/10 border border-amber-500/25 px-4 py-2.5 rounded-2xl text-amber-400 text-xs font-semibold relative z-10 shrink-0">
            <Info className="h-4 w-4 shrink-0" />
            <span>Administrator Preview Mode</span>
          </div>
        )}
      </div>

      {/* 2. Employment Profile Summary Panel */}
      <div className="relative overflow-hidden bg-slate-900/25 border border-white/[0.08] backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none" />
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2 pb-2.5 border-b border-white/[0.05]">
            <Sparkles className="h-4 w-4 text-orange-400 shrink-0" />
            <h2 className="text-xs uppercase font-heading font-black tracking-widest text-white">Employment Profile Summary</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-xs select-text">
            <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
              <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider">Employee ID</span>
              <span className="text-white font-mono font-bold text-xs select-all">{internProfile.internId}</span>
            </div>
            <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
              <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider">Department</span>
              <span className="text-white font-semibold text-xs">{internProfile.department}</span>
            </div>
            <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
              <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider">Designated Role</span>
              <span className="text-white font-semibold text-xs">{internProfile.roleDomain}</span>
            </div>
            <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
              <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider">Joining Date</span>
              <span className="text-white font-semibold text-xs">
                {new Date(internProfile.startDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
              <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider">Reporting Manager</span>
              <span className="text-white font-semibold text-xs">{internProfile.reportingManager}</span>
            </div>
            <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
              <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider">Employment Type</span>
              <span className="text-orange-400 font-bold text-xs uppercase tracking-wider">{internProfile.employmentType}</span>
            </div>
            <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl col-span-2">
              <span className="text-slate-500 block uppercase font-bold text-[8.5px] tracking-wider">Current Status</span>
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mt-0.5",
                internProfile.status === "ACTIVE" || internProfile.status === "ONBOARDED"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-400"
              )}>
                ● {internProfile.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Search Roster */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/60 border border-white/[0.05] rounded-2xl scrollbar-none max-w-full overflow-x-auto">
          {[
            { id: "all", label: "All Documents", icon: Layers },
            { id: "offer", label: "Offer Letters", icon: FileText },
            { id: "agreement", label: "Agreements", icon: FileCheck },
            { id: "nda", label: "NDAs", icon: Key },
            { id: "certificates", label: "Certificates & ID", icon: Award },
            { id: "uploads", label: "Compliance Uploads", icon: Download },
            { id: "verification", label: "My Verification Center", icon: ShieldCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 shrink-0",
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-lg shadow-orange-500/10 active:scale-98"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar Input */}
        <div className="relative flex items-center min-w-[280px]">
          <Search className="absolute left-4.5 h-4.5 w-4.5 text-slate-500 shrink-0 pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-12 pr-4 bg-slate-950/60 border border-white/[0.08] focus:border-orange-500/50 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all font-medium"
          />
        </div>
      </div>

      {/* Roster Grid View */}
      {activeTab === "certificates" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start select-text animate-fadeIn">
          {/* Left Side: Certificates list */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/10 border border-white/[0.05] p-5 rounded-2xl space-y-2">
              <h3 className="text-xs uppercase font-heading font-black tracking-widest text-white">Verifiable Roster Certificates</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Review and download your official Experience Letters and Completion Certificates issued by AURXON corporate registry.
              </p>
            </div>
            
            {filteredGenerated
              .filter((doc) => doc.type.includes("CERTIFICATE") || doc.type.includes("EXPERIENCE"))
              .map((doc) => {
                const dateObj = new Date(doc.createdAt);
                const formattedDate = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
                return (
                  <div key={doc.id} className="relative overflow-hidden bg-slate-900/20 border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4.5 flex flex-col justify-between space-y-4 shadow transition-all duration-300">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-heading font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded uppercase">
                          {doc.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Ver {doc.version}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">{getDocumentLabel(doc.type)}</h4>
                      <p className="text-[10px] text-slate-500">Issued Date: {formattedDate} • Downloads: {doc.content?.downloadCount || 0}</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-2.5 border-t border-white/[0.04]">
                      <button
                        onClick={() => setPreviewDoc({ type: "generated", doc })}
                        className="h-8 flex-1 flex items-center justify-center space-x-1 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] rounded-lg text-[10.5px] font-bold text-slate-350 hover:text-white transition-all cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        <span>Preview</span>
                      </button>
                      <a
                        href={`/api/documents/view?id=${doc.id}`}
                        className="h-8 flex-1 flex items-center justify-center space-x-1 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-slate-950 border border-orange-500/20 hover:border-transparent rounded-lg text-[10.5px] font-bold transition-all cursor-pointer text-center"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                );
              })}
              {filteredGenerated.filter((doc) => doc.type.includes("CERTIFICATE") || doc.type.includes("EXPERIENCE")).length === 0 && (
                <div className="p-8 text-center bg-slate-900/10 border border-dashed border-white/[0.05] rounded-2xl text-slate-500 text-xs">
                  No experience certificates or completion credentials have been generated for your profile yet.
                </div>
              )}
          </div>

          {/* Right Side: IdCardGenerator */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/10 border border-white/[0.05] p-5 rounded-2xl space-y-2">
              <h3 className="text-xs uppercase font-heading font-black tracking-widest text-white">Workforce Digital ID Credential</h3>
              <p className="text-[11px] text-slate-450 leading-relaxed">
                Attach your portrait photo, configure corporate theme styles, and export high-fidelity credentials in PNG or PDF.
              </p>
            </div>
            
            <div className="bg-[#0b101d]/60 border border-white/[0.06] backdrop-blur-md p-6 rounded-3xl shadow-xl">
              <IdCardGenerator
                fullName={internProfile.fullName}
                internId={internProfile.internId}
                department={internProfile.department}
                roleDomain={internProfile.roleDomain}
                status={internProfile.status === "ACTIVE" ? "ACTIVE" : "INTERN"}
                dbInternId={internProfile.id}
                employmentType={internProfile.employmentType}
                defaultPhotoUrl={parseInternNotes(internProfile.notes).pictureUrl}
                linkedIn={parseInternNotes(internProfile.notes).linkedIn}
                gitHub={parseInternNotes(internProfile.notes).gitHub}
                instagram={parseInternNotes(internProfile.notes).instagram}
              />
            </div>
          </div>
        </div>
      ) : activeTab === "verification" ? (
        <div className="space-y-6 select-text animate-fadeIn">
          <div className="bg-slate-900/10 border border-white/[0.05] p-6 rounded-3xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-orange-400" />
              <span>My Authenticated Verification Roster</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              AURXON implements advanced SHA-256 cryptographic fingerprints on all generated contracts and certificates. Use the options below to review verification credentials or copy public verification links to showcase your achievements to third parties.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generatedDocs.map((doc) => {
              const verificationUrl = typeof window !== "undefined"
                ? `${window.location.origin}/verify/${doc.id}`
                : `https://aims.aurxon.com/verify/${doc.id}`;
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;
              const isApproved = doc.lifecycleStatus === "APPROVED" || doc.status === "APPROVED" || doc.watermarkStatus === "OFFICIAL";
              
              return (
                <div
                  key={doc.id}
                  className="relative overflow-hidden bg-slate-900/25 border border-white/[0.08] backdrop-blur-md rounded-2xl p-5.5 flex flex-col justify-between space-y-5 shadow-lg"
                >
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500/20 to-teal-500/20" />
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <span className="text-[9px] font-heading font-extrabold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded uppercase tracking-wider block w-fit">
                        {doc.type.replace(/_/g, " ")}
                      </span>
                      <h3 className="text-sm font-semibold text-white truncate">
                        {getDocumentLabel(doc.type)}
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Verification Number</span>
                          <span className="text-white font-mono font-bold">{doc.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Verification Status</span>
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider mt-0.5 border",
                            isApproved
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                              : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          )}>
                            ● {isApproved ? "VERIFIED & SIGNED" : "AWAITING SIGNOFF"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">SHA-256 Hash Fingerprint</span>
                          <button
                            onClick={() => handleCopyText(doc.verificationHash || doc.id)}
                            className="flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 font-mono text-[10.5px] font-bold text-left select-all bg-white/[0.02] px-2 py-1 rounded border border-white/[0.04] mt-0.5"
                          >
                            <span className="truncate max-w-[150px] inline-block font-bold">
                              {doc.verificationHash || "N/A"}
                            </span>
                            {copiedHash === (doc.verificationHash || doc.id) ? (
                              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* QR Verification Block */}
                    <div className="flex flex-col items-center space-y-1.5 shrink-0 bg-white p-2 rounded-xl shadow-md border border-white/10 select-none">
                      <img
                        src={qrCodeUrl}
                        alt="QR Verification"
                        className="h-20 w-20 object-contain select-none"
                        loading="lazy"
                      />
                      <span className="text-[7.5px] text-slate-800 font-black uppercase tracking-wider">SCAN TO VERIFY</span>
                    </div>
                  </div>

                  <div className="pt-3.5 border-t border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                      URL: <span className="font-mono">{verificationUrl}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleCopyText(verificationUrl);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      }}
                      className="h-8 flex items-center justify-center space-x-1.5 px-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/[0.1] rounded-xl text-[10.5px] font-bold text-slate-350 hover:text-white transition-all select-none active:scale-98 cursor-pointer"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>URL Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : totalCount > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fadeIn">
          {/* 1. Generated Documents */}
          {filteredGenerated.map((doc) => {
            const Icon = getDocumentIcon(doc.type);
            const isApproved = doc.lifecycleStatus === "APPROVED" || doc.status === "APPROVED";
            const dateObj = new Date(doc.createdAt);
            const formattedDate = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

            return (
              <div
                key={doc.id}
                className="group relative overflow-hidden bg-slate-900/25 border border-white/[0.08] hover:border-white/[0.15] backdrop-blur-md rounded-2xl p-5.5 flex flex-col justify-between h-[230px] shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                {/* Visual Accent Glow */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-orange-500/20 to-amber-500/20 group-hover:from-orange-500/60 group-hover:to-amber-500/60 transition-all duration-300" />
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/[0.02] group-hover:bg-orange-500/[0.05] rounded-full blur-xl transition-all duration-300" />

                {/* Top Section */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-orange-400 group-hover:scale-105 transition-transform duration-300 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col items-end space-y-1.5">
                      {/* Watermark badge */}
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider block",
                        doc.watermarkStatus === "OFFICIAL"
                          ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
                          : doc.watermarkStatus === "PENDING"
                          ? "bg-amber-500/10 border border-amber-500/25 text-amber-400"
                          : "bg-slate-500/10 border border-slate-500/25 text-slate-400"
                      )}>
                        {doc.watermarkStatus === "OFFICIAL" ? "✓ OFFICIAL"
                          : doc.watermarkStatus === "PENDING" ? "⏳ PENDING"
                          : "◎ DRAFT"}
                      </span>
                      {/* Version identifier */}
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        Ver {doc.version}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                      {getDocumentLabel(doc.type)}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Issued {formattedDate}</span>
                    </p>
                    <div className="flex items-center space-x-2.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1 select-text">
                      <span>Downloads: {doc.content?.downloadCount || 0}</span>
                      <span>•</span>
                      <span>Last: {doc.content?.lastDownloaded ? new Date(doc.content.lastDownloaded).toLocaleDateString() : "Never"}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Section */}
                <div className="space-y-3.5 pt-3.5 border-t border-white/[0.05]">
                  {/* Cryptographic hash preview */}
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                    <span className="font-sans font-bold uppercase tracking-wider">SHA-256 ID</span>
                    <button
                      onClick={() => handleCopyText(doc.verificationHash || doc.id)}
                      className="flex items-center space-x-1 text-orange-400/80 hover:text-orange-400 transition-colors select-text"
                    >
                      <span className="truncate max-w-[120px] inline-block font-bold">
                        {doc.verificationHash ? doc.verificationHash.substring(0, 16) : doc.id.substring(0, 16)}...
                      </span>
                      {copiedHash === (doc.verificationHash || doc.id) ? (
                        <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="h-3 w-3 shrink-0" />
                      )}
                    </button>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setPreviewDoc({ type: "generated", doc })}
                      className="h-9 w-full flex items-center justify-center space-x-1.5 px-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/[0.1] rounded-xl text-xs font-bold text-slate-350 hover:text-white transition-all select-none active:scale-98 cursor-pointer"
                    >
                      <Eye className="h-4.5 w-4.5 shrink-0" />
                      <span>Preview</span>
                    </button>

                    <a
                      href={`/api/documents/view?id=${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 w-full flex items-center justify-center space-x-1.5 px-3 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-slate-950 border border-orange-500/20 hover:border-transparent rounded-xl text-xs font-bold transition-all select-none active:scale-98 text-center"
                    >
                      <Download className="h-4.5 w-4.5 shrink-0" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 2. Secure Uploaded Documents */}
          {filteredSecure.map((doc) => {
            const dateObj = new Date(doc.uploadDate);
            const formattedDate = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
            const sizeKB = (doc.fileSize / 1024).toFixed(1);

            return (
              <div
                key={doc.id}
                className="group relative overflow-hidden bg-slate-900/25 border border-white/[0.08] hover:border-white/[0.15] backdrop-blur-md rounded-2xl p-5.5 flex flex-col justify-between h-[230px] shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                {/* Visual Accent Glow */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500/20 to-cyan-500/20 group-hover:from-blue-500/60 group-hover:to-cyan-500/60 transition-all duration-300" />
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/[0.02] group-hover:bg-blue-500/[0.05] rounded-full blur-xl transition-all duration-300" />

                {/* Top Section */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-blue-400 group-hover:scale-105 transition-transform duration-300 shrink-0">
                      <Download className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col items-end space-y-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-blue-500/10 border border-blue-500/25 text-blue-400 uppercase tracking-wider block">
                        COMPLIANCE FILE
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        Ver {doc.version} · {sizeKB} KB
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                      {doc.fileName}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Uploaded {formattedDate}</span>
                    </p>
                  </div>
                </div>

                {/* Bottom Section */}
                <div className="space-y-3.5 pt-3.5 border-t border-white/[0.05]">
                  {/* Cryptographic hash preview */}
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                    <span className="font-sans font-bold uppercase tracking-wider">SHA-256 HASH</span>
                    <button
                      onClick={() => handleCopyText(doc.sha256Hash)}
                      className="flex items-center space-x-1 text-blue-400/80 hover:text-blue-400 transition-colors select-text"
                    >
                      <span className="truncate max-w-[120px] inline-block font-bold">
                        {doc.sha256Hash.substring(0, 16)}...
                      </span>
                      {copiedHash === doc.sha256Hash ? (
                        <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="h-3 w-3 shrink-0" />
                      )}
                    </button>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setPreviewDoc({ type: "secure", doc })}
                      className="h-9 w-full flex items-center justify-center space-x-1.5 px-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/[0.1] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all select-none active:scale-98 cursor-pointer"
                    >
                      <Eye className="h-4.5 w-4.5 shrink-0" />
                      <span>Details</span>
                    </button>

                    <a
                      href={`/api/documents/view?id=${doc.id}&vault=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 w-full flex items-center justify-center space-x-1.5 px-3 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-slate-950 border border-blue-500/20 hover:border-transparent rounded-xl text-xs font-bold transition-all select-none active:scale-98 text-center"
                    >
                      <Download className="h-4.5 w-4.5 shrink-0" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/10 border border-white/[0.05] rounded-3xl text-center space-y-4 animate-fadeIn">
          <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-full text-slate-500">
            <FileText className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-300">No matching files identified</h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              We couldn't identify any generated or secure documents matching the current tab category or search term.
            </p>
          </div>
        </div>
      )}

      {/* Visual Document Detail & Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          {/* Modal Overlay Close backdrop */}
          <div className="absolute inset-0" onClick={() => setPreviewDoc(null)} />

          <div className="relative w-full max-w-3xl bg-slate-900 border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5.5 border-b border-white/[0.08] flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-heading font-extrabold text-orange-400 tracking-widest uppercase block">
                  {previewDoc.type === "generated" ? "Generated Vault Document" : "Secure Upload Metadata"}
                </span>
                <h2 className="text-base font-extrabold text-white truncate max-w-[400px]">
                  {previewDoc.type === "generated"
                    ? getDocumentLabel(previewDoc.doc.type)
                    : previewDoc.doc.fileName}
                </h2>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="h-8.5 w-8.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-slate-400 hover:text-white flex items-center justify-center transition-all select-none active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-thin">
              {previewDoc.type === "generated" ? (
                /* Generated Document Preview details representation */
                <div className="space-y-6">
                  {/* Clean corporate preview sheet */}
                  <div className="bg-white text-slate-800 p-8 sm:p-12 border border-slate-200 rounded-2xl relative select-text shadow-inner">
                    {/* Watermark Diagonal Overlay inside Preview */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                      <span className={cn(
                        "text-[100px] font-heading font-extrabold tracking-widest rotate-[-35deg] opacity-[0.03] select-none block",
                        previewDoc.doc.watermarkStatus === "OFFICIAL"
                          ? "text-emerald-600"
                          : previewDoc.doc.watermarkStatus === "PENDING"
                          ? "text-amber-500"
                          : "text-red-500"
                      )}>
                        {previewDoc.doc.watermarkStatus || "DRAFT"}
                      </span>
                    </div>

                    <div className="relative z-10 space-y-6 text-left text-xs leading-relaxed">
                      {/* Logo and reference header */}
                      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                        <div className="flex items-center space-x-2.5">
                          <img src="/Logo-AIMS/AurxonLogo.png" alt="Logo" className="h-7 w-auto object-contain shrink-0" />
                          <div>
                            <h3 className="text-xs font-extrabold tracking-tight text-slate-900">AURXON</h3>
                            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-0.5">INTERNAL MANAGEMENT SYSTEM</p>
                          </div>
                        </div>
                        <div className="text-right text-[7px] text-slate-400 font-bold uppercase leading-normal">
                          <div>REF: AXN-DOC-{internProfile.internId}</div>
                          <div>VER: {previewDoc.doc.version} · STATUS: {previewDoc.doc.watermarkStatus}</div>
                        </div>
                      </div>

                      {/* Content block representing actual narrative fields */}
                      <div className="space-y-4">
                        <div className="text-center font-heading font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wide">
                          {getDocumentLabel(previewDoc.doc.type)}
                        </div>

                        {/* Candidate summary rows */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px]">
                          <div>
                            <span className="text-slate-400 block font-bold">NAME OF ENGAGEE</span>
                            <span className="font-semibold text-slate-800">{internProfile.fullName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold">ID CREDENTIAL</span>
                            <span className="font-mono text-slate-800">{internProfile.internId}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold">DEPARTMENT</span>
                            <span className="font-semibold text-slate-800">{internProfile.department}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold">DESIGNATION</span>
                            <span className="font-semibold text-slate-800">{internProfile.roleDomain}</span>
                          </div>
                        </div>

                        {/* Interactive dynamic visual mock for contracts / offer letters / ndas */}
                        <div className="text-slate-600 space-y-3 pt-2 text-[10.5px]">
                          <p>
                            This official transaction record serves as the corporate digital representation of the <span className="font-semibold text-slate-800">{getDocumentLabel(previewDoc.doc.type)}</span> issued on <span className="font-semibold text-slate-800">{new Date(previewDoc.doc.createdAt).toLocaleDateString()}</span>.
                          </p>
                          <p>
                            All parameters and binding clauses, including intellectual property assignment, confidentiality covenants, notice terms, and codes of execution, are digitally locked, timestamped, and stored inside the central AURXON secure network registry.
                          </p>
                          {previewDoc.doc.type.includes("OFFER") && previewDoc.doc.content?.compensation && (
                            <div className="border border-slate-200 rounded-lg overflow-hidden my-3">
                              <table className="w-full text-[9px] border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-400 uppercase font-bold text-center border-b border-slate-200">
                                    <th className="p-1.5 text-left border-r border-slate-200">Salary Component</th>
                                    <th className="p-1.5 border-r border-slate-200">Monthly Amount</th>
                                    <th className="p-1.5">Annual Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-slate-200">
                                    <td className="p-1.5 font-medium border-r border-slate-200">Basic Salary (50%)</td>
                                    <td className="p-1.5 text-center border-r border-slate-200">INR {Math.round(previewDoc.doc.content.compensation.monthly?.basic || 0).toLocaleString()}</td>
                                    <td className="p-1.5 text-center">INR {Math.round(previewDoc.doc.content.compensation.annual?.basic || 0).toLocaleString()}</td>
                                  </tr>
                                  <tr className="border-b border-slate-200">
                                    <td className="p-1.5 font-medium border-r border-slate-200">HRA (40% of Basic)</td>
                                    <td className="p-1.5 text-center border-r border-slate-200">INR {Math.round(previewDoc.doc.content.compensation.monthly?.hra || 0).toLocaleString()}</td>
                                    <td className="p-1.5 text-center">INR {Math.round(previewDoc.doc.content.compensation.annual?.hra || 0).toLocaleString()}</td>
                                  </tr>
                                  <tr className="border-b border-slate-200">
                                    <td className="p-1.5 font-medium border-r border-slate-200">Conveyance / TA</td>
                                    <td className="p-1.5 text-center border-r border-slate-200">INR {Math.round(previewDoc.doc.content.compensation.monthly?.ta || 0).toLocaleString()}</td>
                                    <td className="p-1.5 text-center">INR {Math.round(previewDoc.doc.content.compensation.annual?.ta || 0).toLocaleString()}</td>
                                  </tr>
                                  <tr className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800">
                                    <td className="p-1.5 border-r border-slate-200 text-left">Monthly Net / Annual CTC</td>
                                    <td className="p-1.5 text-center border-r border-slate-200">INR {Math.round(previewDoc.doc.content.compensation.monthly?.netTakeHome || 0).toLocaleString()}</td>
                                    <td className="p-1.5 text-center">INR {Math.round(previewDoc.doc.content.compensation.annual?.totalCTC || 0).toLocaleString()}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                          <p className="italic text-[9.5px] text-slate-400">
                            * Note: For the fully compiled, legal-binding print PDF format including page numbers, full terms, and the exact signature stamp overlays, trigger a "Download PDF" operation.
                          </p>
                        </div>
                      </div>

                      {/* Dual Signature stamps section representation */}
                      <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                        <div className="p-3 border border-dashed border-slate-200 rounded-lg text-center space-y-1 relative overflow-hidden bg-slate-50/50">
                          <span className="text-[7.5px] text-slate-400 block font-bold uppercase tracking-wider">CANDIDATE SIGNATURE</span>
                          {previewDoc.doc.candidateSigned ? (
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-emerald-600 block">✓ DIGITALLY SIGNED</span>
                              <span className="text-[7px] text-slate-400 font-mono block select-all break-all">
                                AXN-CSIG-{previewDoc.doc.signature ? previewDoc.doc.signature.substring(0, 16) : "PENDING_STAMP"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[8.5px] font-bold text-slate-400 italic block py-1.5">AWAITING CANDIDATE SIGN</span>
                          )}
                        </div>

                        <div className="p-3 border border-dashed border-slate-200 rounded-lg text-center space-y-1 relative overflow-hidden bg-slate-50/50">
                          <span className="text-[7.5px] text-slate-400 block font-bold uppercase tracking-wider">AURXON EXECUTIVE BOARD</span>
                          {previewDoc.doc.founderSigned ? (
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-emerald-600 block">✓ SECURED BY CEO</span>
                              <span className="text-[8px] font-bold text-slate-800 block">
                                {previewDoc.doc.founderSignatory || "CEO Authority"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[8.5px] font-bold text-slate-400 italic block py-1.5">AWAITING EXECUTIVE APPROVAL</span>
                          )}
                        </div>
                      </div>

                      {/* Digital compliance footer registry details */}
                      <div className="pt-6 border-t border-slate-900 flex justify-between items-center text-[7px] text-slate-400 leading-normal font-medium">
                        <div className="space-y-0.5">
                          <div>FINGERPRINT: {previewDoc.doc.verificationHash || previewDoc.doc.id}</div>
                          <div>REGISTRY ROUTE: aims.aurxon.com/verify/{(previewDoc.doc.verificationHash || previewDoc.doc.id).substring(0, 8)}...</div>
                        </div>
                        <div className="shrink-0 flex items-center space-x-1.5">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-extrabold">AURXON TRUSTED</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Audit Lifecycle Timeline */}
                  <div className="bg-slate-950/60 border border-white/[0.05] p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs uppercase font-extrabold text-orange-400 tracking-widest flex items-center space-x-2">
                      <Layers className="h-4 w-4 text-orange-400" />
                      <span>Verifiable Document Lifecycle Audit Trail</span>
                    </h4>
                    
                    <div className="relative flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-0 pt-2 select-none">
                      {/* Connector Line */}
                      <div className="absolute left-[15px] md:left-[10%] right-auto md:right-[10%] top-0 md:top-[16px] bottom-0 md:bottom-auto w-[2px] md:w-[80%] h-auto md:h-[2px] bg-white/10 -z-0 pointer-events-none hidden md:block" />

                      {[
                        { id: "GENERATED", label: "Generated", desc: "Initialized in vault", done: true },
                        { id: "REVIEW", label: "Sent For Review", desc: "Awaiting board audit", done: previewDoc.doc.lifecycleStatus !== "DRAFT" },
                        { id: "APPROVED", label: "Approved", desc: "Board sign-off granted", done: previewDoc.doc.lifecycleStatus === "APPROVED" || previewDoc.doc.lifecycleStatus === "SIGNED" },
                        { id: "SIGNED", label: "Signed", desc: "Both parties executed", done: previewDoc.doc.candidateSigned && previewDoc.doc.founderSigned },
                        { id: "ARCHIVED", label: "Archived", desc: "Safely filed in GCS", done: previewDoc.doc.lifecycleStatus === "ARCHIVED" || previewDoc.doc.gcsFileId !== null }
                      ].map((step, idx) => {
                        return (
                          <div key={step.id} className="relative z-10 flex flex-row md:flex-col items-center text-left md:text-center space-x-4 md:space-x-0 space-y-0 md:space-y-2.5 flex-1 min-w-0">
                            <div className={cn(
                              "h-8 w-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all shrink-0 shadow-lg",
                              step.done
                                ? "bg-emerald-500 border-transparent text-slate-950 shadow-emerald-500/10"
                                : "bg-slate-900 border-white/10 text-slate-500"
                            )}>
                              {step.done ? "✓" : idx + 1}
                            </div>
                            
                            <div className="space-y-0.5 min-w-0">
                              <span className={cn(
                                "block text-[11px] font-black uppercase tracking-wider",
                                step.done ? "text-white font-black" : "text-slate-500"
                              )}>
                                {step.label}
                              </span>
                              <span className="block text-[8.5px] text-slate-500 truncate max-w-[120px] font-medium">
                                {step.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Document Download & Audit Roster */}
                  <div className="bg-slate-950/60 border border-white/[0.05] p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs uppercase font-extrabold text-orange-400 tracking-widest flex items-center space-x-2">
                      <Download className="h-4 w-4 text-orange-400" />
                      <span>Document Download & Revision Auditing</span>
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                        <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Version Number</span>
                        <span className="text-white font-mono font-bold">v{previewDoc.doc.version}</span>
                      </div>
                      <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                        <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Total Downloads</span>
                        <span className="text-white font-bold">{previewDoc.doc.content?.downloadCount || 0} times</span>
                      </div>
                      <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                        <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Last Downloaded</span>
                        <span className="text-white font-semibold">
                          {previewDoc.doc.content?.lastDownloaded
                            ? new Date(previewDoc.doc.content.lastDownloaded).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "Never"}
                        </span>
                      </div>
                      <div className="space-y-1 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                        <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Last Updated</span>
                        <span className="text-white font-semibold">
                          {new Date(previewDoc.doc.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cryptographic info card */}
                  <div className="bg-slate-950/60 border border-white/[0.05] p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs uppercase font-extrabold text-orange-400 tracking-widest flex items-center space-x-2">
                      <ShieldCheck className="h-4 w-4 text-orange-400" />
                      <span>Dynamic Credential Authenticity Data</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Registry Document ID</span>
                        <code className="text-white font-mono block select-all bg-white/2 px-2.5 py-1.5 rounded-lg border border-white/[0.05] truncate">{previewDoc.doc.id}</code>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Cryptographic Hash (SHA-256)</span>
                        <code className="text-emerald-400 font-mono block select-all bg-white/2 px-2.5 py-1.5 rounded-lg border border-white/[0.05] truncate">
                          {previewDoc.doc.verificationHash || "Pending Official Stamp"}
                        </code>
                      </div>
                    </div>

                    <div className="pt-2 text-[10px] text-slate-400 flex items-center space-x-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                      <span>This document was generated dynamically by the AURXON AIMS engine version 2.0.0 and verified on transaction registry.</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Secure Document Metadata details */
                <div className="space-y-6">
                  <div className="bg-slate-950/60 border border-white/[0.05] p-6 rounded-2xl space-y-6">
                    <div className="flex items-center space-x-3.5">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{previewDoc.doc.fileName}</h4>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-0.5">Category: {previewDoc.doc.documentCategory}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5 text-xs border-y border-white/[0.05] py-5">
                      <div className="space-y-1">
                        <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Secure GCS File ID</span>
                        <span className="text-white block font-semibold">{previewDoc.doc.fileId}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Storage Path</span>
                        <span className="text-white block font-semibold truncate">{previewDoc.doc.storagePath}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">File Size</span>
                        <span className="text-white block font-semibold">{(previewDoc.doc.fileSize / 1024).toFixed(2)} KB ({previewDoc.doc.fileSize.toLocaleString()} Bytes)</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Upload Timestamp</span>
                        <span className="text-white block font-semibold">{new Date(previewDoc.doc.uploadDate).toLocaleString()}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Vault Bucket Location</span>
                        <span className="text-white block font-semibold font-mono">{previewDoc.doc.bucketUsed || "aurxon-vault-primary"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Vault Version</span>
                        <span className="text-white block font-semibold font-mono">v{previewDoc.doc.version} (Active Edition)</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">Tamper-Proof File Integrity Hash (SHA-256)</span>
                      <div className="flex items-center justify-between bg-white/2 px-3 py-2 border border-white/[0.05] rounded-xl text-xs font-mono">
                        <code className="text-blue-400 select-all break-all max-w-[90%] truncate">{previewDoc.doc.sha256Hash}</code>
                        <button
                          onClick={() => handleCopyText(previewDoc.doc.sha256Hash)}
                          className="text-slate-500 hover:text-white transition-colors p-1"
                        >
                          {copiedHash === previewDoc.doc.sha256Hash ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-5.5 border-t border-white/[0.08] flex items-center justify-end space-x-3 shrink-0">
              <button
                onClick={() => setPreviewDoc(null)}
                className="h-10 px-5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-2xl text-xs font-bold text-slate-300 hover:text-white transition-all select-none active:scale-98"
              >
                Close View
              </button>

              <a
                href={
                  previewDoc.type === "generated"
                    ? `/api/documents/view?id=${previewDoc.doc.id}`
                    : `/api/documents/view?id=${previewDoc.doc.id}&vault=true`
                }
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "h-10 px-5 rounded-2xl text-xs font-bold text-slate-950 flex items-center justify-center space-x-1.5 shadow-lg transition-all select-none active:scale-98",
                  previewDoc.type === "generated"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-orange-500/10"
                    : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 shadow-blue-500/10"
                )}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span>Download Official Copy</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
