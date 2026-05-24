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
  Sparkles,
  Inbox,
  UserCheck
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
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  roleDomain: string;
  startDate: string;
  pinCode?: string | null;
  country: string;
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

  // Onboarding adjustment editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjFullName, setAdjFullName] = useState("");
  const [adjDepartment, setAdjDepartment] = useState("Engineering");
  const [adjRoleDomain, setAdjRoleDomain] = useState("Software Engineer");
  const [adjStartDate, setAdjStartDate] = useState("");

  const fetchData = async () => {
    setLoadingResets(true);
    setLoadingLeaves(true);
    setLoadingPendings(true);
    setLoadingDeleteds(true);
    setError(null);

    try {
      // 1. Fetch password resets
      const resetsRes = await fetch("/api/auth/forgot-password");
      if (resetsRes.ok) {
        const resetsData = await resetsRes.json();
        setResets(resetsData.filter((r: ResetRequest) => r.status === "PENDING" || r.tempPassword));
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
    try {
      const res = await fetch("/api/auth/forgot-password/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setSuccess(`Password request successfully ${action === "APPROVE" ? "approved" : "rejected"}.`);
        await fetchData();
      } else {
        const data = await res.json();
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
  const startEditingOnboarding = (item: PendingOnboarding) => {
    setEditingId(item.id);
    setAdjFullName(item.fullName);
    setAdjDepartment(item.department === "Software Engineering" ? "Engineering" : item.department);
    setAdjRoleDomain(item.roleDomain);
    setAdjStartDate(item.startDate ? item.startDate.split("T")[0] : new Date().toISOString().split("T")[0]);
  };

  const handleResolveOnboarding = async (id: string, action: "APPROVE" | "REJECT") => {
    setError(null);
    setSuccess(null);
    setLoadingPendings(true);

    try {
      const payload: any = { id, action };
      if (action === "APPROVE") {
        payload.fullName = adjFullName.trim();
        payload.department = adjDepartment;
        payload.roleDomain = adjRoleDomain;
        payload.startDate = adjStartDate;
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
        setEditingId(null);
        await fetchData();
      }
    } catch (err) {
      setError("Failed to communicate with onboarding approval endpoint.");
    } finally {
      setLoadingPendings(false);
    }
  };

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
        <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          <span>{success}</span>
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
              <div className="space-y-6">
                {pendings.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="p-5 bg-secondary/15 rounded-xl border border-border/40 hover:border-cyan-500/25 transition-all duration-300 space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base text-white">{item.fullName}</span>
                            <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                              Self-Enrolled Request
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">({item.country})</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.email} • {item.phoneNumber}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Requested: <strong className="text-primary">{item.department}</strong> department as <strong className="text-white">{item.roleDomain}</strong>.
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 self-end md:self-start">
                          {!isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => startEditingOnboarding(item)}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs h-9 rounded-lg px-3 flex items-center space-x-1"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Inspect & Edit</span>
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
                            </>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleResolveOnboarding(item.id, "APPROVE")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 rounded-lg px-3 flex items-center space-x-1"
                              >
                                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                                <span>Generate ID & Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingId(null)}
                                className="bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border-border/60 text-xs h-9 rounded-lg px-3"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Adjust Onboarding Data Dialog/Form */}
                      {isEditing && (
                        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-slideDown">
                          <Input
                            label="Appointed Full Name"
                            value={adjFullName}
                            onChange={(e) => setAdjFullName(e.target.value)}
                            className="bg-[#0b0f19] border-border/60 text-white"
                          />
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10px] font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                              Appointed Department
                            </label>
                            <select
                              value={adjDepartment}
                              onChange={(e) => setAdjDepartment(e.target.value)}
                              className="flex h-11 w-full rounded-xl border border-border bg-[#0b0f19] px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                            >
                              <option value="Engineering">Engineering</option>
                              <option value="Design">Design</option>
                              <option value="Product">Product</option>
                              <option value="Marketing">Marketing</option>
                              <option value="Operations">Operations</option>
                            </select>
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10px] font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                              Designated Role Domain
                            </label>
                            <select
                              value={adjRoleDomain}
                              onChange={(e) => setAdjRoleDomain(e.target.value)}
                              className="flex h-11 w-full rounded-xl border border-border bg-[#0b0f19] px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                            >
                              {sortedRoles.map((role) => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>
                          <Input
                            label="Official Joining Date"
                            type="date"
                            value={adjStartDate}
                            onChange={(e) => setAdjStartDate(e.target.value)}
                            className="bg-[#0b0f19] border-border/60 text-white text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
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

                    {req.tempPassword && (
                      <div className="mt-4 pt-3.5 border-t border-border/30 flex items-center justify-between bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Generated Temp Password:</span>
                          <p className="text-sm font-mono font-extrabold text-white mt-0.5 select-all">{req.tempPassword}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCopy(req.tempPassword!, req.id)}
                          className="h-8.5 w-8.5 rounded-md p-0 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                          title="Copy to clipboard"
                        >
                          {copiedId === req.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
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
    </div>
  );
}
