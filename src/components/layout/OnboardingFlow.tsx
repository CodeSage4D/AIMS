"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  User,
  ShieldCheck,
  FileCheck,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Clock,
  Briefcase,
  HelpCircle,
  Fingerprint,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdvancedLocationSelector from "@/components/ui/AdvancedLocationSelector";

interface OnboardingFlowProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  intern: any; // Serialized intern record
}

export default function OnboardingFlow({ user, intern }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    gender: intern.gender || "Male",
    dateOfBirth: intern.dateOfBirth ? intern.dateOfBirth.split("T")[0] : "",
    phoneNumber: intern.phoneNumber || "",
    address: intern.address || "",
    city: intern.city || "",
    state: intern.state || "",
    country: intern.country || "India",
    pinCode: intern.pinCode || "",
    citizenship: intern.citizenship || "India",
    region: intern.region || "Asia-Pacific",
    university: intern.university || "",
    degree: intern.degree || "",
    batchSemester: intern.batchSemester || "",
    emergencyContactName: intern.emergencyContactName || "",
    emergencyContactNumber: intern.emergencyContactNumber || "",
    skillsInput: intern.skills?.join(", ") || "",

    // Bank Details
    bankName: intern.bankName || "",
    accountNumber: intern.accountNumber || "",
    ifscCode: intern.ifscCode || "",
    upiId: intern.upiId || "",
    branchName: intern.branchName || "",
    panCard: intern.panCard || "",
    accountHolderName: intern.fullName || "",
    paymentPreference: "BANK_TRANSFER",

    // Social Links
    linkedIn: "",
    gitHub: "",
    bloodGroup: "O+",
  });

  const [unifiedSignatureName, setUnifiedSignatureName] = useState("");

  // Resume Upload State
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploadLoading, setResumeUploadLoading] = useState(false);
  const [resumeUploadedUrl, setResumeUploadedUrl] = useState<string | null>(
    intern.documents.find((d: any) => d.type === "RESUME")?.fileUrl || null
  );
  const [resumeWarning, setResumeWarning] = useState<string | null>(null);

  // Document Signatures States
  const [signedDocs, setSignedDocs] = useState<{ [key: string]: string }>({});
  const [activeSignDoc, setActiveSignDoc] = useState<any | null>(null);
  const [sigName, setSigName] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResumeWarning(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict Size Validations (Warning at 90KB, Hard Block at 100KB)
    if (file.size > 100 * 1024) {
      setError("Rejected: Selected resume exceeds the 100 KB maximum hard limit. Please compress the file.");
      setResumeFile(null);
      return;
    }

    if (file.size > 90 * 1024) {
      setResumeWarning("Warning: File size is over 90 KB. While it meets the 100 KB hard limit, we highly recommend compressing it under 90 KB.");
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Rejected: Only PDF, JPEG, and PNG files are permitted.");
      setResumeFile(null);
      return;
    }

    setResumeFile(file);
  };

  const uploadResume = async () => {
    if (!resumeFile) return;
    setError(null);
    setResumeUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", resumeFile);
      fd.append("internId", intern.id);
      fd.append("type", "RESUME");

      const res = await fetch("/api/documents", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload resume.");

      setResumeUploadedUrl(data.fileUrl);
      setSuccess("Resume uploaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to upload resume.");
    } finally {
      setResumeUploadLoading(false);
    }
  };

  const handleSignDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSignDoc || !sigName.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/documents/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: activeSignDoc.id, signatureName: sigName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sign document.");

      setSignedDocs((prev) => ({ ...prev, [activeSignDoc.type]: sigName }));
      setSuccess(`${activeSignDoc.type.replace(/_/g, " ")} signed successfully!`);
      setActiveSignDoc(null);
      setSigName("");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to sign document.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOnboarding = async () => {
    setError(null);
    setLoading(true);

    // Final checks
    if (!resumeUploadedUrl) {
      setError("Please upload your resume before submitting.");
      setLoading(false);
      return;
    }

    if (!unifiedSignatureName.trim()) {
      setError("Please type your name in the electronic signature panel to sign and authorize all onboarding documents.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          signatureName: unifiedSignatureName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onboarding submission failed.");

      setSuccess("Congratulations! Onboarding completed successfully. Welcome to AURXON!");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Onboarding failed.");
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    setError(null);
    if (currentStep === 1) {
      // Validate Step 1 fields
      if (
        !formData.phoneNumber ||
        !formData.address ||
        !formData.city ||
        !formData.state ||
        !formData.country ||
        !formData.pinCode ||
        !formData.university ||
        !formData.degree ||
        !formData.emergencyContactName ||
        !formData.emergencyContactNumber
      ) {
        setError("Please fill in all required personal, academic, and emergency fields.");
        return;
      }
    } else if (currentStep === 2) {
      // Validate Step 2 fields
      const isPanRequired = Number(intern.stipendAmount || 0) > 50000;
      if (!formData.bankName || !formData.accountNumber || !formData.ifscCode || (isPanRequired && !formData.panCard)) {
        setError("Please complete all banking and compliance details.");
        return;
      }
      if (!resumeUploadedUrl) {
        setError("Please upload your resume to continue.");
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-white flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950/60 to-[#070a13] pointer-events-none z-0" />

      {/* Main Container */}
      <Card className="w-full max-w-4xl border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-xl shadow-2xl relative z-10 p-0 overflow-hidden rounded-3xl animate-fadeIn">
        {/* Header */}
        <div className="border-b border-white/[0.08] p-6 sm:p-8 bg-gradient-to-br from-indigo-950/20 via-blue-950/10 to-transparent flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <img src="/Logo-AIMS/AurxonLogo.png" alt="Aurxon Logo" className="h-7 object-contain" />
              <h2 className="text-lg font-heading font-extrabold tracking-widest text-white">AURXON AIMS</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Official Enrollee Onboarding & Compliance Portal
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5" />
            <span>Setup Active</span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 sm:px-8 py-4 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between text-xs font-bold text-gray-400">
          <div className="flex items-center space-x-6 sm:space-x-8">
            <span className={cn("pb-2 border-b-2 transition-all", currentStep === 1 ? "border-primary text-white" : "border-transparent")}>
              1. Profile Info
            </span>
            <span className={cn("pb-2 border-b-2 transition-all", currentStep === 2 ? "border-primary text-white" : "border-transparent")}>
              2. Banking & Resume
            </span>
            <span className={cn("pb-2 border-b-2 transition-all", currentStep === 3 ? "border-primary text-white" : "border-transparent")}>
              3. Document Signings
            </span>
          </div>
          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">
            Step {currentStep} of 3
          </span>
        </div>

        {/* Form Body */}
        <CardContent className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-start space-x-2">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-start space-x-2">
              <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* STEP 1: Personal & University Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
                  <User className="h-4.5 w-4.5 text-primary" />
                  <span>Personal Roster Information</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Specify details exactly matching your legal identity documents.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <span>Gender</span>
                    <Sparkles className="h-3 w-3 text-indigo-500 fill-indigo-500/20 shrink-0" />
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Decline to State</option>
                  </select>
                </div>
                <Input
                  label="Date of Birth *"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Citizenship *"
                  name="citizenship"
                  value={formData.citizenship}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Street Address *"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Advanced Location Selector */}
              <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                <h4 className="text-[10px] font-heading font-extrabold text-muted-foreground uppercase tracking-widest">
                  Location & Contact Details
                </h4>
                <AdvancedLocationSelector
                  country={formData.country}
                  state={formData.state}
                  city={formData.city}
                  region={formData.region}
                  phoneNumber={formData.phoneNumber}
                  onChange={(fields) => {
                    setFormData((prev) => ({
                      ...prev,
                      country: fields.country,
                      state: fields.state,
                      city: fields.city,
                      region: fields.region,
                      phoneNumber: fields.phoneNumber,
                    }));
                  }}
                  disabled={loading}
                />
                <Input
                  label="PIN Code *"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                <h4 className="text-[10px] font-heading font-extrabold text-muted-foreground uppercase tracking-widest">
                  Academic & Technical Detail
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="University / College *" name="university" value={formData.university} onChange={handleChange} required />
                  <Input label="Degree / Course *" name="degree" value={formData.degree} onChange={handleChange} required />
                  <Input label="Batch / Semester" name="batchSemester" value={formData.batchSemester} onChange={handleChange} placeholder="e.g. Semester 8" />
                </div>
                <Input
                  label="Technical Skills (Separated by Commas)"
                  name="skillsInput"
                  value={formData.skillsInput}
                  onChange={handleChange}
                  placeholder="e.g. React, Next.js, Node.js, PostgreSQL"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                <h4 className="text-[10px] font-heading font-extrabold text-muted-foreground uppercase tracking-widest text-amber-400">
                  Emergency Compliance Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Contact Person Name *" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} required />
                  <Input label="Contact Person Phone *" name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleChange} placeholder="+91 XXXXX XXXXX" required />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Banking & Compliance Resume */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
                  <Fingerprint className="h-4.5 w-4.5 text-primary" />
                  <span>Banking & SSN Compliance</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Required secure credentials for payroll disbursements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Bank Account Holder Name *"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label={Number(intern.stipendAmount || 0) > 50000 ? "Permanent Account Number (PAN Card) *" : "Permanent Account Number (PAN Card) (Optional)"}
                  name="panCard"
                  value={formData.panCard}
                  onChange={handleChange}
                  placeholder="ABCDE1234F"
                  required={Number(intern.stipendAmount || 0) > 50000}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Bank Name *" name="bankName" value={formData.bankName} onChange={handleChange} required />
                <Input label="Account Number *" name="accountNumber" value={formData.accountNumber} onChange={handleChange} required />
                <Input label="IFSC Code *" name="ifscCode" value={formData.ifscCode} onChange={handleChange} placeholder="SBIN0001234" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Branch Name" name="branchName" value={formData.branchName} onChange={handleChange} />
                <Input label="UPI ID" name="upiId" value={formData.upiId} onChange={handleChange} placeholder="handle@bank" />
              </div>

              <div className="space-y-3 pt-4 border-t border-white/[0.04]">
                <h4 className="text-[10px] font-heading font-extrabold text-muted-foreground uppercase tracking-widest text-primary flex items-center space-x-1.5">
                  <UploadCloud className="h-4 w-4 shrink-0" />
                  <span className="flex items-center gap-1">Resume Compliance Upload <Sparkles className="h-3 w-3 text-indigo-500 fill-indigo-500/20 shrink-0" /></span>
                </h4>
                
                <div className="p-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.02] flex flex-col items-center justify-center text-center space-y-3 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleResumeChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={resumeUploadLoading}
                  />
                  <UploadCloud className="h-10 w-10 text-muted-foreground/60 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">
                      {resumeFile ? resumeFile.name : "Attach Resume File"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Supports PDF, JPEG, and PNG. Recommended size: under 90 KB. Hard limit: 100 KB.
                    </p>
                  </div>

                  {resumeWarning && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                      {resumeWarning}
                    </div>
                  )}

                  {resumeFile && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        uploadResume();
                      }}
                      isLoading={resumeUploadLoading}
                      variant="primary"
                      size="sm"
                      className="h-8 text-[10px] relative z-25 font-bold"
                    >
                      Upload Selected File
                    </Button>
                  )}
                </div>

                {resumeUploadedUrl && (
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-xl">
                    <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                    <span className="truncate">Resume verified in vault file server!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Document Signing */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
                  <FileCheck className="h-4.5 w-4.5 text-primary" />
                  <span>Review & Digitally Accept Agreements</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Type your signature to digitally sign each legal instrument below.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {intern.generatedDocuments
                  .filter((d: any) => ["OFFER_LETTER", "NDA", "AGREEMENT"].includes(d.type))
                  .map((doc: any) => {
                    const isSigned = unifiedSignatureName.trim() || signedDocs[doc.type] || doc.content?.candidateSignature;
                    return (
                      <Card
                        key={doc.id}
                        className={cn(
                          "border-white/[0.08] p-4.5 hover:border-indigo-500/20 transition-all text-left space-y-4",
                          isSigned ? "bg-emerald-500/5 border-emerald-500/10" : "bg-secondary/15"
                        )}
                      >
                        <div className="space-y-1">
                          <span className="text-[8px] font-heading font-extrabold text-primary uppercase tracking-widest block">
                            Document Type
                          </span>
                          <h4 className="text-xs font-extrabold text-white truncate">
                            {doc.type.replace(/_/g, " ")}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between text-[10px]">
                          <span className={cn("font-bold", isSigned ? "text-emerald-400" : "text-amber-500")}>
                            {isSigned ? "✓ ACCEPTED & SIGNED" : "⏱ AWAITING SIGNATURE"}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => setActiveSignDoc(doc)}
                            variant="secondary"
                            size="sm"
                            className="w-full h-8 text-[10px] font-bold"
                          >
                            Review Document
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
              </div>

              {/* Unified One-Click electronic signature panel */}
              <div className="border border-indigo-500/20 bg-[#0b0f19]/40 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="space-y-1 text-left">
                  <h4 className="text-xs font-heading font-extrabold text-white flex items-center gap-1.5">
                    <Fingerprint className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Unified "One-Click Accept & Sign All" Agreement Panel</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    By typing your name below, you digitally authorize, accept, and execute all three onboarding instruments (<strong className="text-white">Offer Letter, NDA, and Internship Agreement</strong>) atomically.
                  </p>
                </div>
                
                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-heading font-semibold text-muted-foreground uppercase tracking-wider block">
                    Type Your Full Legal Name to Digitally Authorize
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                      <input
                        type="text"
                        required
                        value={unifiedSignatureName}
                        onChange={(e) => setUnifiedSignatureName(e.target.value)}
                        placeholder={formData.accountHolderName}
                        className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>
                    
                    {/* Premium script-style signature live visualizer */}
                    {unifiedSignatureName.trim() && (
                      <div className="h-10 w-full sm:w-48 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center font-mono italic text-xs text-indigo-400 font-bold select-none px-4 truncate shadow-[0_0_15px_rgba(129,140,248,0.06)] bg-black/40">
                        {unifiedSignatureName.trim()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Sign modal drawer */}
              {activeSignDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
                  <div className="bg-[#0b0f19]/90 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col justify-between max-h-[85vh] text-left animate-fadeIn">
                    <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-heading font-extrabold text-white uppercase tracking-wider">
                            Review {activeSignDoc.type.replace(/_/g, " ")}
                          </h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Read terms carefully before applying your digital authorization.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveSignDoc(null);
                            setSigName("");
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Document terms content details */}
                      <div className="bg-white text-slate-800 p-5 sm:p-8 rounded-xl text-xs space-y-4 max-h-[45vh] overflow-y-auto leading-relaxed select-text font-serif">
                        {/* Company Letterhead in Onboarding Preview */}
                        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <img 
                              src="/Logo-AIMS/AurxonLogo.png" 
                              alt="Aurxon Logo" 
                              className="h-8 w-auto object-contain shrink-0" 
                            />
                            <div>
                              <h2 className="text-xs font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
                                {activeSignDoc.content.companyName || "AURXON DB & SOFTWARE SYSTEMS"}
                              </h2>
                              <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-0.5">
                                Enterprise Databases • API Orchestrations • Automated Operations
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-[7px] text-slate-400 font-bold uppercase">
                            <span>Ref: AXN-DOC-{intern.internId || "DRAFT"}</span>
                          </div>
                        </div>

                        <div className="text-center font-bold text-xs tracking-wide border-b border-slate-200 pb-2 mb-2 font-sans uppercase">
                          {activeSignDoc.content.title || activeSignDoc.type.replace(/_/g, " ")}
                        </div>

                        {activeSignDoc.type === "OFFER_LETTER" && (
                          <div className="space-y-3">
                            <p className="font-bold">{activeSignDoc.content.salutation}</p>
                            <p>{activeSignDoc.content.introduction}</p>
                            <div className="bg-slate-50 border border-slate-100 rounded p-3 space-y-1 font-sans">
                              <div><strong>Role:</strong> {activeSignDoc.content.role}</div>
                              <div><strong>Department:</strong> {activeSignDoc.content.department}</div>
                              <div><strong>Start Date:</strong> {activeSignDoc.content.startDate}</div>
                              <div><strong>End Date:</strong> {activeSignDoc.content.endDate}</div>
                              <div><strong>Stipend:</strong> {activeSignDoc.content.stipend}</div>
                            </div>
                            <div>
                              <strong>Terms:</strong>
                              <ul className="list-disc pl-5 mt-1.5 space-y-1">
                                {activeSignDoc.content.terms?.map((t: string, i: number) => (
                                  <li key={i}>{t}</li>
                                ))}
                              </ul>
                            </div>
                            <p>{activeSignDoc.content.closing}</p>
                          </div>
                        )}

                        {activeSignDoc.type === "NDA" && (
                          <div className="space-y-3">
                            <p>This Mutual NDA is effective as of {activeSignDoc.content.effectiveDate} between {activeSignDoc.content.partyA} and {activeSignDoc.content.partyB}.</p>
                            {activeSignDoc.content.clauses?.map((c: any, i: number) => (
                              <div key={i}>
                                <strong className="block">{c.title}</strong>
                                <p className="text-[11px] text-slate-600 pl-2.5 mt-0.5">{c.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {activeSignDoc.type === "AGREEMENT" && (
                          <div className="space-y-3">
                            <p>This Internship Agreement is made effective {activeSignDoc.content.effectiveDate} between {activeSignDoc.content.partyA} and {activeSignDoc.content.partyB}.</p>
                            <div>
                              <strong>Engagement Terms:</strong>
                              <ul className="list-decimal pl-5 mt-1.5 space-y-1">
                                {activeSignDoc.content.terms?.map((t: string, i: number) => (
                                  <li key={i}>{t}</li>
                                ))}
                              </ul>
                            </div>
                            <p>{activeSignDoc.content.closing}</p>
                          </div>
                        )}

                        {/* Monospace signature stamp overlays */}
                        <div className="border-t border-slate-200 pt-3 mt-4 text-[10px] text-slate-500 font-sans">
                          {activeSignDoc.content.candidateSignature ? (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-2.5 rounded">
                              {activeSignDoc.content.candidateSignatureStamp}
                            </div>
                          ) : (
                            <span className="italic">Awaiting Candidate Digital Signature.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/[0.08] flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setActiveSignDoc(null);
                          setSigName("");
                        }}
                        className="h-10 px-6 font-bold text-xs"
                      >
                        Close Preview
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Footer Navigation */}
        <div className="border-t border-white/[0.08] p-5 bg-secondary/5 flex items-center justify-between shrink-0 select-none">
          <div className="flex space-x-2">
            {currentStep > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBackStep}
                disabled={loading}
                className="h-9 font-semibold text-xs text-white"
              >
                Back Step
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch("/api/onboarding/skip", { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to skip onboarding.");
                  window.location.reload();
                } catch (err: any) {
                  setError(err.message || "Failed to skip onboarding.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="h-9 font-semibold text-xs border border-white/10 hover:bg-white/5 text-white"
            >
              Skip & Complete Later
            </Button>
          </div>

          {currentStep < 3 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNextStep}
              className="h-9 font-semibold text-xs"
            >
              Continue Onboarding
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitOnboarding}
              isLoading={loading}
              className="h-9 font-extrabold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/10 border-0"
            >
              Submit Onboarding Profile
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
