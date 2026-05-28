"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  KeyRound, 
  CalendarDays, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Copy, 
  ShieldAlert, 
  Check, 
  UserPlus, 
  Trash2, 
  RotateCcw, 
  Edit3,
  Layers,
  Inbox,
  UserCheck,
  Loader2,
  X
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { ROLE_CODES } from "@/lib/roles";

const sortedRoles = Object.keys(ROLE_CODES).sort();

interface ResetRequest {
  id: string;
  internId: string;
  internName: string;
  internEmail: string;
  status: string;
  tempPassword?: string | null;
  createdAt: string;
}

interface LeaveRequest {
  id: string;
  internId: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: string;
  createdAt: string;
  intern: {
    fullName: string;
    internId: string;
    department: string;
  };
}

interface PendingOnboarding {
  id: string;
  internId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  roleDomain: string;
  startDate: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode?: string | null;
  citizenship?: string | null;
  region?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  branchName?: string | null;
  notes?: string | null;
}

interface DeletedIntern {
  id: string;
  internId: string;
  fullName: string;
  email: string;
  department: string;
  roleDomain: string;
  deletedAt: string;
  deletedBy?: string | null;
}

export default function FounderDashboardQueues() {
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pendings, setPendings] = useState<PendingOnboarding[]>([]);
  const [deleteds, setDeleteds] = useState<DeletedIntern[]>([]);

  const [loadingResets, setLoadingResets] = useState(false);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [loadingPendings, setLoadingPendings] = useState(false);
  const [loadingDeleteds, setLoadingDeleteds] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tempPasswordToShow, setTempPasswordToShow] = useState<string | null>(null);

  // Onboarding details verification modal and fields editing states
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedRegistrant, setSelectedRegistrant] = useState<PendingOnboarding | null>(null);
  const [previewId, setPreviewId] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [adjFullName, setAdjFullName] = useState("");
  const [adjEmail, setAdjEmail] = useState("");
  const [adjPhoneNumber, setAdjPhoneNumber] = useState("");
  const [adjDepartment, setAdjDepartment] = useState("Engineering");
  const [adjRoleDomain, setAdjRoleDomain] = useState("Software Engineer");
  const [adjStartDate, setAdjStartDate] = useState("");
  const [adjCountry, setAdjCountry] = useState("India");
  const [adjState, setAdjState] = useState("");
  const [adjCity, setAdjCity] = useState("");
  const [adjAddress, setAdjAddress] = useState("");
  const [adjPinCode, setAdjPinCode] = useState("");
  const [adjCitizenship, setAdjCitizenship] = useState("");
  const [adjRegion, setAdjRegion] = useState("");
  const [adjBankName, setAdjBankName] = useState("");
  const [adjAccountNumber, setAdjAccountNumber] = useState("");
  const [adjIfscCode, setAdjIfscCode] = useState("");
  const [adjBranchName, setAdjBranchName] = useState("");
  const [adjUpiId, setAdjUpiId] = useState("");
  const [adjNotes, setAdjNotes] = useState("");

  const fetchData = async () => {
    setLoadingResets(true);
    setLoadingLeaves(true);
    setLoadingPendings(true);
    setLoadingDeleteds(true);
    setError(null);
    setShowVerificationModal(false);
    setSelectedRegistrant(null);

    try {
      // 1. Fetch password resets (PENDING + recently RESOLVED with a tempPassword)
      const resetsRes = await fetch("/api/auth/forgot-password");
      if (resetsRes.ok) {
        const resetsData = await resetsRes.json();
        setResets(resetsData.filter((r: ResetRequest) => r.status === "PENDING" || (r.status === "RESOLVED" && r.tempPassword)));
      }

      // 2. Fetch leave applications
      const leavesRes = await fetch("/api/leave");
      if (leavesRes.ok) {
        const leavesData = await leavesRes.json();
        setLeaves(leavesData.filter((l: LeaveRequest) => l.status === "PENDING"));
      }

      // 3. Fetch pending self-registrations
      const pendingsRes = await fetch("/api/interns?filter=pending");
      if (pendingsRes.ok) {
        const pendingsData = await pendingsRes.json();
        setPendings(pendingsData);
      }

      // 4. Fetch soft-deleted enrollees
      const deletedsRes = await fetch("/api/interns?filter=deleted");
      if (deletedsRes.ok) {
        const deletedsData = await deletedsRes.json();
        setDeleteds(deletedsData);
      }
    } catch (err) {
      console.error("Error fetching admin queues:", err);
      setError("Failed to query full administrator queues stream.");
    } finally {
      setLoadingResets(false);
      setLoadingLeaves(false);
      setLoadingPendings(false);
      setLoadingDeleteds(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolveReset = async (requestId: string, action: "APPROVE" | "REJECT") => {
    setError(null);
    setSuccess(null);
    setTempPasswordToShow(null);
    try {
      const res = await fetch("/api/auth/forgot-password/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Password request successfully ${action === "APPROVE" ? "approved" : "rejected"}.`);
        if (action === "APPROVE" && data.tempPassword) {
          setTempPasswordToShow(data.tempPassword);
        }
        await fetchData();
      } else {
        setError(data.error || "Failed to resolve reset request.");
      }
    } catch (err) {
      setError("Network failure communicating with recovery service.");
    }
  };

  const handleResolveLeave = async (id: string, status: "APPROVED" | "REJECTED") => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setSuccess(`Leave request successfully ${status === "APPROVED" ? "approved" : "rejected"}.`);
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to resolve leave request.");
      }
    } catch (err) {
      setError("Network failure communicating with leave service.");
    }
  };

  // Onboarding approval handlers
  const openVerificationModal = (item: PendingOnboarding) => {
    setSelectedRegistrant(item);
    setTempPasswordToShow(null);
    setAdjFullName(item.fullName || "");
    setAdjEmail(item.email || "");
    setAdjPhoneNumber(item.phoneNumber || "");
    setAdjDepartment(item.department || "Engineering");
    setAdjRoleDomain(item.roleDomain || "Software Engineer");
    setAdjStartDate(item.startDate ? item.startDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setAdjCountry(item.country || "India");
    setAdjState(item.state || "");
    setAdjCity(item.city || "");
    setAdjAddress(item.address || "");
    setAdjPinCode(item.pinCode || "");
    setAdjCitizenship(item.citizenship || "");
    setAdjRegion(item.region || "");
    setAdjBankName(item.bankName || "");
    setAdjAccountNumber(item.accountNumber || "");
    setAdjIfscCode(item.ifscCode || "");
    setAdjBranchName(item.branchName || "");
    setAdjUpiId(item.upiId || "");
    setAdjNotes(item.notes || "");
    setPreviewId("");
    setShowVerificationModal(true);
  };

  const handleResolveOnboarding = async (id: string, action: "APPROVE" | "REJECT") => {
    setError(null);
    setSuccess(null);
    setTempPasswordToShow(null);
    setLoadingPendings(true);

    try {
      const payload: any = { id, action };
      if (action === "APPROVE") {
        payload.fullName = adjFullName.trim();
        payload.department = adjDepartment;
        payload.roleDomain = adjRoleDomain;
        payload.startDate = adjStartDate;
        payload.email = adjEmail.trim();
        payload.phoneNumber = adjPhoneNumber.trim();
        payload.country = adjCountry;
        payload.state = adjState;
        payload.city = adjCity;
        payload.address = adjAddress;
        payload.pinCode = adjPinCode;
        payload.citizenship = adjCitizenship;
        payload.region = adjRegion;
        payload.bankName = adjBankName;
        payload.accountNumber = adjAccountNumber;
        payload.ifscCode = adjIfscCode;
        payload.branchName = adjBranchName;
        payload.upiId = adjUpiId;
        payload.notes = adjNotes;
      }

      const res = await fetch("/api/interns/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resolve onboarding approval.");
      } else {
        setSuccess(`Self-registration successfully ${action === "APPROVE" ? "approved and sequence ID generated" : "rejected"}.`);
        if (action === "APPROVE" && data.tempPassword) {
          setTempPasswordToShow(data.tempPassword);
        }
        setShowVerificationModal(false);
        setSelectedRegistrant(null);
        await fetchData();
      }
    } catch (err) {
      setError("Failed to communicate with onboarding approval endpoint.");
    } finally {
      setLoadingPendings(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedRegistrant) return;
    setError(null);
    setSuccess(null);
    setLoadingPendings(true);

    try {
      const res = await fetch("/api/interns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRegistrant.id,
          fullName: adjFullName.trim(),
          email: adjEmail.trim(),
          phoneNumber: adjPhoneNumber.trim(),
          department: adjDepartment,
          roleDomain: adjRoleDomain,
          startDate: adjStartDate,
          country: adjCountry,
          state: adjState,
          city: adjCity,
          address: adjAddress,
          pinCode: adjPinCode,
          citizenship: adjCitizenship,
          region: adjRegion,
          bankName: adjBankName,
          accountNumber: adjAccountNumber,
          ifscCode: adjIfscCode,
          branchName: adjBranchName,
          upiId: adjUpiId,
          notes: adjNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save profile corrections.");
      } else {
        setSuccess("Profile corrections saved successfully.");
        await fetchData();
        if (selectedRegistrant) {
          const updated = {
            ...selectedRegistrant,
            fullName: adjFullName.trim(),
            email: adjEmail.trim(),
            phoneNumber: adjPhoneNumber.trim(),
            department: adjDepartment,
            roleDomain: adjRoleDomain,
            startDate: adjStartDate,
            country: adjCountry,
            state: adjState,
            city: adjCity,
            address: adjAddress,
            pinCode: adjPinCode,
            citizenship: adjCitizenship,
            region: adjRegion,
            bankName: adjBankName,
            accountNumber: adjAccountNumber,
            ifscCode: adjIfscCode,
            branchName: adjBranchName,
            upiId: adjUpiId,
            notes: adjNotes,
          };
          setSelectedRegistrant(updated);
        }
      }
    } catch (err) {
      setError("Failed to communicate with profile update services.");
    } finally {
      setLoadingPendings(false);
    }
  };

  useEffect(() => {
    if (!showVerificationModal || !selectedRegistrant) return;

    const fetchPreviewId = async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/interns/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedRegistrant.id,
            action: "PREVIEW",
            fullName: adjFullName,
            department: adjDepartment,
            roleDomain: adjRoleDomain,
            startDate: adjStartDate,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.previewId) {
            setPreviewId(data.previewId);
          }
        }
      } catch (err) {
        console.error("Failed to query ID preview:", err);
      } finally {
        setPreviewLoading(false);
      }
    };

    const debounceFn = setTimeout(fetchPreviewId, 400);
    return () => clearTimeout(debounceFn);
  }, [showVerificationModal, selectedRegistrant, adjFullName, adjDepartment, adjRoleDomain, adjStartDate]);

  // Recovery Bin handlers
  const handleRestoreIntern = async (id: string) => {
    setError(null);
    setSuccess(null);
    setLoadingDeleteds(true);

    try {
      const res = await fetch(`/api/interns?id=${id}&action=restore`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to restore intern.");
      } else {
        setSuccess("Intern account successfully restored to active directory roster!");
        await fetchData();
      }
    } catch (err) {
      setError("Failed to communicate with restore endpoint.");
    } finally {
      setLoadingDeleteds(false);
    }
  };

  const handlePurgeIntern = async (id: string) => {
    if (!confirm("Are you absolutely sure you want to permanently purge this record? This action CANNOT be undone and will delete all files, documents, and credentials!")) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoadingDeleteds(true);

    try {
      const res = await fetch(`/api/interns?id=${id}&action=permanent`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to purge intern record.");
      } else {
        setSuccess("Intern record permanently purged from database.");
        await fetchData();
      }
    } catch (err) {
      setError("Failed to communicate with purge endpoint.");
    } finally {
      setLoadingDeleteds(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatLeaveType = (type: string) => {
    if (type === "FULL_DAY") return "Full Day Leave";
    if (type === "HALF_DAY_1ST_HALF") return "Half Day (1st Half)";
    if (type === "HALF_DAY_2ND_HALF") return "Half Day (2nd Half)";
    return type;
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none text-white">
      {/* Alert Notices */}
      {error && (
        <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold animate-shake">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-fadeIn">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            <span>{success}</span>
          </div>
          {tempPasswordToShow && (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Temporary Password Generated</span>
                <p className="text-xs text-gray-305">Share this password with the user so they can log in and change it.</p>
              </div>
              <div className="flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 shrink-0">
                <code className="text-sm font-mono font-bold text-emerald-400 select-all">{tempPasswordToShow}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tempPasswordToShow);
                    setCopiedId("temp-onboard-pw");
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-emerald-450 cursor-pointer"
                >
                  {copiedId === "temp-onboard-pw" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Pending Workspace Self-Registrations Queue */}
        <Card className="border-border/60 shadow-xl overflow-hidden bg-[#0b0f19]/60 backdrop-blur-md lg:col-span-2">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                <CardTitle>Pending Self-Registration approvals</CardTitle>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {pendings.length} Pending Approval
              </span>
            </div>
            <CardDescription>
              Review, edit parameters, appoint roles, override options, and transactionally generate permanent sequential IDs for workspace enrollees.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loadingPendings ? (
              <div className="py-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                Loading enrollees queue...
              </div>
            ) : pendings.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-muted-foreground">
                No pending registrations. Onboarding queue is completely cleared.
              </div>
            ) : (
              <div className="space-y-4">
                {pendings.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-secondary/15 rounded-xl border border-border/40 hover:border-cyan-500/25 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-white">{item.fullName}</span>
                        <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                          Pending Verification
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">({item.country})</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.email} • {item.phoneNumber}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Requested: <strong className="text-primary">{item.department}</strong> department as <strong className="text-white">{item.roleDomain}</strong>.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openVerificationModal(item)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs h-9 rounded-lg px-4 flex items-center space-x-1.5"
                      >
                        <UserCheck className="h-4 w-4 shrink-0" />
                        <span>Inspect & Verify</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResolveOnboarding(item.id, "REJECT")}
                        className="bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border-border/60 text-xs h-9 rounded-lg px-3 flex items-center space-x-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Password Reset Requests Queue */}
        <Card className="border-border/60 shadow-xl overflow-hidden bg-[#0b0f19]/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="h-5 w-5 text-indigo-400" />
                <CardTitle>Intern Password Reset Requests</CardTitle>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {resets.filter(r => r.status === "PENDING").length} Pending
              </span>
            </div>
            <CardDescription>Authorize password override and supply system-generated temporary credentials block.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loadingResets ? (
              <div className="py-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                Querying security credentials stream...
              </div>
            ) : resets.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-muted-foreground">
                No pending password resets. System is fully operational and compliant.
              </div>
            ) : (
              <div className="space-y-4">
                {resets.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-secondary/15 rounded-xl border border-border/40 hover:border-indigo-500/30 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-foreground">{req.internName}</span>
                          <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                            {req.internId}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{req.internEmail}</p>
                        <p className="text-[10px] text-muted-foreground/60 flex items-center space-x-1 mt-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{new Date(req.createdAt).toLocaleString()}</span>
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {req.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleResolveReset(req.id, "APPROVE")}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9.5 rounded-lg px-4"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResolveReset(req.id, "REJECT")}
                              className="bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border-border/60 text-xs h-9.5 rounded-lg px-3"
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-emerald-400 font-medium">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-bold tracking-wider">RESOLVED</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Show persisted temp password for RESOLVED requests so admin can copy it even after page reload */}
                    {req.status === "RESOLVED" && req.tempPassword && (
                      <div className="mt-3 pt-3 border-t border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">Temp Password — Share with Intern</span>
                          <p className="text-[11px] text-muted-foreground/60">Intern must log in and set a new password immediately.</p>
                        </div>
                        <div className="flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-lg border border-amber-500/20 shrink-0">
                          <code className="text-sm font-mono font-bold text-amber-400 select-all">{req.tempPassword}</code>
                          <button
                            onClick={() => handleCopy(req.tempPassword!, `reset-pw-${req.id}`)}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-amber-400 cursor-pointer"
                          >
                            {copiedId === `reset-pw-${req.id}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Leave Applications Approval Queue */}
        <Card className="border-border/60 shadow-xl overflow-hidden bg-[#0b0f19]/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarDays className="h-5 w-5 text-emerald-400" />
                <CardTitle>Intern Leave Requests</CardTitle>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {leaves.length} Pending
              </span>
            </div>
            <CardDescription>Inspect enrollees' leave dates and reason logs, and auto-update attendance rolls on approval.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loadingLeaves ? (
              <div className="py-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                Querying leaves stream...
              </div>
            ) : leaves.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-muted-foreground">
                No leave requests require immediate resolution. Daily attendance runs cleanly.
              </div>
            ) : (
              <div className="space-y-4">
                {leaves.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-secondary/15 rounded-xl border border-border/40 hover:border-emerald-500/30 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-white">{req.intern.fullName}</span>
                            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                              {req.intern.internId}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground/80 mt-0.5">{req.intern.department} Department</p>
                        </div>
                        
                        <div className="text-xs text-foreground bg-white/5 rounded-lg p-2.5 border border-border/40 font-medium">
                          <div className="flex items-center space-x-1.5 text-primary text-[10px] uppercase font-bold tracking-wider mb-1">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatLeaveType(req.type)}</span>
                          </div>
                          <p className="font-bold text-white">
                            {new Date(req.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(req.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed italic">
                            " {req.reason} "
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-start">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleResolveLeave(req.id, "APPROVED")}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9.5 rounded-lg px-4 flex items-center justify-center space-x-1"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResolveLeave(req.id, "REJECTED")}
                          className="bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border-border/60 hover:border-red-500/25 text-xs h-9.5 rounded-lg px-4 flex items-center justify-center space-x-1"
                        >
                          <XCircle className="h-4 w-4 shrink-0" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Soft-Deleted Accounts Recovery Bin */}
        <Card className="border-border/60 shadow-xl overflow-hidden bg-[#0b0f19]/60 backdrop-blur-md lg:col-span-2">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="h-5 w-5 text-indigo-400 animate-pulse" />
                <CardTitle>Onboarding Cooling Recovery Trash</CardTitle>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {deleteds.length} Soft-Deleted
              </span>
            </div>
            <CardDescription>
              Retrieve enrollees inside their 7-day grace cooling period. Restore them safely to active operations or permanently cascade purge their files from AIMS.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loadingDeleteds ? (
              <div className="py-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                Querying cooling trash records...
              </div>
            ) : deleteds.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-muted-foreground select-none">
                <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p>Cooling bin is currently empty. No soft-deleted records registered.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deleteds.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-border bg-secondary/10 hover:border-indigo-500/20 transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-foreground">{item.fullName}</span>
                        <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-550/20 px-2 py-0.5 rounded">
                          {item.internId}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.email}</p>
                      <p className="text-[11px] text-muted-foreground font-semibold">
                        Role: <span className="text-primary font-bold">{item.roleDomain}</span> ({item.department})
                      </p>
                      <div className="text-[9.5px] leading-relaxed text-muted-foreground/75 bg-[#0b0f19] p-2 rounded-lg border border-white/5 space-y-0.5">
                        <p>Deleted At: <span className="text-white font-bold">{new Date(item.deletedAt).toLocaleDateString()}</span></p>
                        {item.deletedBy && <p>Deleted By: <span className="text-white font-bold">{item.deletedBy}</span></p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleRestoreIntern(item.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] h-8 rounded-lg flex items-center justify-center space-x-1"
                      >
                        <RotateCcw className="h-3 w-3 shrink-0" />
                        <span>Restore Account</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePurgeIntern(item.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-[10px] h-8 rounded-lg border border-red-500/25 flex items-center justify-center space-x-1"
                      >
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span>Purge File</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
      </div>

      {/* 5. Premium Onboarding Verification details Popup Modal */}
      {showVerificationModal && selectedRegistrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto select-none">
          <div className="w-full max-w-4xl rounded-2xl border border-white/[0.08] bg-[#0c1220] shadow-2xl overflow-hidden flex flex-col justify-between max-h-[90vh] animate-scaleIn text-white">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] p-5 sm:p-6 shrink-0 bg-[#0d1629]">
              <div>
                <h3 className="text-md sm:text-lg font-heading font-extrabold text-white flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-cyan-400" />
                  <span>Onboarding Verification details Popup Modal</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Verify profile credentials, banking disbursement setups, and correct any formatting errors.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setSelectedRegistrant(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-6 overflow-y-auto">
              
              {/* Top Section: Live sequential ID preview & Reference ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-center space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400">Temporary Reference Token</span>
                  <code className="text-base font-mono font-extrabold text-cyan-400">{selectedRegistrant.internId}</code>
                </div>
                <div className="p-4 rounded-xl border border-cyan-500/25 bg-cyan-500/5 flex flex-col justify-center space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400">Transaction ID Preview Forecast</span>
                  <div className="flex items-center space-x-2">
                    {previewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    ) : (
                      <code className="text-base font-mono font-extrabold text-white">{previewId || "AXN-PED-..."}</code>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Column 1: Personal, Contact & Onboarding details */}
                <div className="space-y-4">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 block border-b border-white/5 pb-1">
                    Personal & Contact Profiles
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Applicant Full Name"
                      value={adjFullName}
                      onChange={(e) => setAdjFullName(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                    <Input
                      label="Corporate Email"
                      type="email"
                      value={adjEmail}
                      onChange={(e) => setAdjEmail(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      value={adjPhoneNumber}
                      onChange={(e) => setAdjPhoneNumber(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                    <Input
                      label="Official Joining Date"
                      type="date"
                      value={adjStartDate}
                      onChange={(e) => setAdjStartDate(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                        Assigned Department
                      </label>
                      <select
                        value={adjDepartment}
                        onChange={(e) => setAdjDepartment(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-[#0b0f19] px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                      >
                        <option value="Software Engineering">Software Engineering</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Product Management">Product Management</option>
                        <option value="Data Analytics">Data Analytics</option>
                        <option value="Operations">Operations</option>
                        <option value="Marketing & Growth">Marketing & Growth</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                        Assigned Position/Role
                      </label>
                      <select
                        value={adjRoleDomain}
                        onChange={(e) => setAdjRoleDomain(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-[#0b0f19] px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                      >
                        {sortedRoles.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Country"
                      value={adjCountry}
                      onChange={(e) => setAdjCountry(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                    <Input
                      label="State"
                      value={adjState}
                      onChange={(e) => setAdjState(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="City"
                        value={adjCity}
                        onChange={(e) => setAdjCity(e.target.value)}
                        className="bg-[#0b0f19] border-white/[0.08]"
                      />
                    </div>
                    <Input
                      label="PIN Code"
                      value={adjPinCode}
                      onChange={(e) => setAdjPinCode(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Citizenship"
                      value={adjCitizenship}
                      onChange={(e) => setAdjCitizenship(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                    <Input
                      label="Region / State"
                      value={adjRegion}
                      onChange={(e) => setAdjRegion(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                  </div>

                  <Input
                    label="Mailing Address"
                    value={adjAddress}
                    onChange={(e) => setAdjAddress(e.target.value)}
                    className="bg-[#0b0f19] border-white/[0.08]"
                  />
                </div>

                {/* Column 2: Disbursement Bank details, remarks & documents */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block border-b border-white/5 pb-1">
                      Disbursement Banking Setup
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Bank Name"
                        value={adjBankName}
                        onChange={(e) => setAdjBankName(e.target.value)}
                        className="bg-[#0b0f19] border-white/[0.08]"
                      />
                      <Input
                        label="Account Number"
                        value={adjAccountNumber}
                        onChange={(e) => setAdjAccountNumber(e.target.value)}
                        className="bg-[#0b0f19] border-white/[0.08]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="IFSC Code"
                        value={adjIfscCode}
                        onChange={(e) => setAdjIfscCode(e.target.value.toUpperCase())}
                        className="bg-[#0b0f19] border-white/[0.08]"
                      />
                      <Input
                        label="Branch Name"
                        value={adjBranchName}
                        onChange={(e) => setAdjBranchName(e.target.value)}
                        className="bg-[#0b0f19] border-white/[0.08]"
                      />
                    </div>

                    <Input
                      label="UPI ID"
                      value={adjUpiId}
                      onChange={(e) => setAdjUpiId(e.target.value)}
                      className="bg-[#0b0f19] border-white/[0.08]"
                    />
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block border-b border-white/5 pb-1">
                      Candidate Remarks & Notes
                    </span>
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                        Remarks Note
                      </label>
                      <textarea
                        value={adjNotes}
                        onChange={(e) => setAdjNotes(e.target.value)}
                        rows={3}
                        className="flex w-full rounded-xl border border-white/[0.08] bg-[#0f172a] px-3.5 py-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block border-b border-white/5 pb-1">
                      Submitted Documents Checklist
                    </span>
                    <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-450 shrink-0" />
                      <span>Onboarding offer letter, NDA, and digital ID card drafts are automatically enqueued.</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] p-5 sm:p-6 shrink-0 bg-[#0d1629]">
              
              {/* Left footer buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleSaveChanges}
                  variant="secondary"
                  className="h-10 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border-white/10 text-white cursor-pointer px-4 flex items-center space-x-1.5"
                >
                  <RotateCcw className="h-4 w-4 shrink-0 text-indigo-400" />
                  <span>Inspect & Save Changes</span>
                </Button>
                
                <Button
                  onClick={() => handleResolveOnboarding(selectedRegistrant.id, "REJECT")}
                  className="h-10 text-xs font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 cursor-pointer px-4"
                >
                  Reject Registration
                </Button>
              </div>

              {/* Right footer button */}
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => {
                    setShowVerificationModal(false);
                    setSelectedRegistrant(null);
                  }}
                  variant="secondary"
                  className="h-10 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 cursor-pointer px-4"
                >
                  Close
                </Button>

                <Button
                  onClick={() => handleResolveOnboarding(selectedRegistrant.id, "APPROVE")}
                  variant="primary"
                  className="h-10 text-xs font-extrabold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer px-5 flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
                >
                  <span>Generate ID & Approve</span>
                </Button>
              </div>

            </div>

          </div>
        </div>
      )}
        
    </div>
  );
}
