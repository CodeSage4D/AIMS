"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  User,
  KeyRound,
  ShieldAlert,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Send,
  Eye,
  Inbox,
  UserCheck
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface RequestItem {
  id: string;
  fieldToUpdate: string;
  proposedValue: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes?: string | null;
  createdAt: string;
  intern: {
    fullName: string;
    internId: string;
  };
}

interface ProfileSettingsClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    username: string | null;
    role: string;
  };
  internProfile?: any | null;
  initialRequests: RequestItem[];
  stats: {
    attendanceRate: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    leaveCount: number;
    taskCompletionRate: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    supervisedCount: number;
    tasksAssignedCount: number;
  };
}

export default function ProfileSettingsClient({
  user,
  internProfile,
  initialRequests,
  stats,
}: ProfileSettingsClientProps) {
  const router = useRouter();
  const isIntern = user.role === "INTERN";
  const isManager = user.role === "FOUNDER" || user.role === "HR";

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "corrections">("overview");

  // Requests List State
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form 1: Username State
  const [username, setUsername] = useState(user.username || "");
  // Form 2: Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Form 3: Correction Request State
  const [fieldToUpdate, setFieldToUpdate] = useState("fullName");
  const [proposedValue, setProposedValue] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");

  // Form 4: Resolution Notes State
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!username.trim()) {
      setError("Username cannot be empty.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update username.");

      setSuccess("Your username has been updated successfully.");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not update username.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all password fields.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");

      setSuccess("Your account password has been successfully updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Password update failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!proposedValue.trim()) {
      setError("Proposed field value cannot be empty.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldToUpdate,
          proposedValue: proposedValue.trim(),
          notes: correctionNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit correction request.");

      setSuccess("Your data correction request was successfully submitted for administrative review.");
      setProposedValue("");
      setCorrectionNotes("");

      // Refresh list
      const listRes = await fetch("/api/profile");
      if (listRes.ok) {
        const freshReqs = await listRes.json();
        setRequests(freshReqs);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to submit correction request.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveRequest = async (requestId: string, action: "APPROVE" | "REJECT") => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    const notes = resolutionNotes[requestId] || "";

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, notes: notes.trim() || null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve correction request.");

      setSuccess(`Correction request successfully ${action === "APPROVE" ? "approved and applied" : "rejected"}.`);
      
      // Update local state
      const listRes = await fetch("/api/profile");
      if (listRes.ok) {
        const freshReqs = await listRes.json();
        setRequests(freshReqs);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Resolution error.");
    } finally {
      setLoading(false);
    }
  };

  const formatFieldName = (f: string) => {
    const maps: Record<string, string> = {
      fullName: "Full Name",
      gender: "Gender",
      dateOfBirth: "Date of Birth",
      phoneNumber: "Phone Number",
      address: "Mailing Address",
      city: "City",
      state: "State",
      country: "Country",
      pinCode: "PIN Code",
      citizenship: "Citizenship",
      region: "Region / Origin",
      university: "University / College Name",
      degree: "Degree / Course",
      department: "Program Department",
      roleDomain: "Assigned Role Domain",
      batchSemester: "Batch / Semester",
      bankName: "Bank Name",
      accountNumber: "Bank Account Number",
      ifscCode: "IFSC Code",
      upiId: "UPI ID",
      branchName: "Branch Name",
      panCard: "PAN Card",
    };
    return maps[f] || f;
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "PENDING":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20 dark:text-amber-400";
      case "APPROVED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400";
      case "REJECTED":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20 dark:text-rose-400";
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-500/20 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none text-foreground animate-fadeIn max-w-5xl mx-auto">
      {/* 1. Cover Card Component */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-gradient-to-br from-card/85 via-card/75 to-card/60 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-20 -top-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-indigo-500/5 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
            {/* User Avatar Circle */}
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 p-0.5 shadow-2xl shrink-0">
              <div className="h-full w-full rounded-full bg-card flex items-center justify-center text-4xl font-heading font-extrabold text-foreground">
                {user.fullName[0].toUpperCase()}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground tracking-tight">
                  {user.fullName}
                </h2>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-widest border",
                  isIntern ? "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400" : "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400"
                )}>
                  {user.role.replace("_", " ")} Badge
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground font-medium">
                Email: <span className="text-foreground font-bold">{user.email}</span>
                {user.username && (
                  <> • Username: <span className="text-foreground font-mono font-bold">{user.username}</span></>
                )}
              </p>

              {isIntern && internProfile ? (
                <div className="text-xs text-muted-foreground font-medium space-y-1">
                  <p>
                    Intern ID: <span className="font-mono text-primary font-bold">{internProfile.internId}</span> • Department: <span className="text-foreground font-bold">{internProfile.department}</span>
                  </p>
                  <p>
                    Role Domain: <span className="text-foreground font-bold">{internProfile.roleDomain}</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-medium">
                  Administrative Access • Department: <span className="text-foreground font-bold">System Administration</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Card */}
      <div className="flex items-center space-x-2 border-b border-border/60 pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border border-transparent",
            activeTab === "overview"
              ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          )}
        >
          <User className="h-4 w-4 shrink-0" />
          <span>Profile Overview</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border border-transparent",
            activeTab === "settings"
              ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          )}
        >
          <KeyRound className="h-4 w-4 shrink-0" />
          <span>Account Settings</span>
        </button>
        <button
          onClick={() => setActiveTab("corrections")}
          className={cn(
            "px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border border-transparent",
            activeTab === "corrections"
              ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          )}
        >
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Correction Requests</span>
          {isManager && requests.filter(r => r.status === "PENDING").length > 0 && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white animate-pulse">
              {requests.filter(r => r.status === "PENDING").length}
            </span>
          )}
        </button>
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">
        {/* Status Alerts Block */}
        {error && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs animate-pulse font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Details */}
            <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
              <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4">
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <User className="h-4.5 w-4.5 text-primary" />
                  <span>Personal Metadata</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">Logged system details</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-3 text-xs text-muted-foreground">
                <div className="flex justify-between py-1.5 border-b border-border/30">
                  <span>Official Full Name</span>
                  <span className="text-foreground font-bold">{user.fullName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/30">
                  <span>Primary Email</span>
                  <span className="text-foreground font-bold truncate max-w-[180px]">{user.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/30">
                  <span>System Role</span>
                  <span className="text-foreground font-bold uppercase">{user.role.replace("_", " ")}</span>
                </div>
                
                {isIntern && internProfile ? (
                  <>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>Intern Serial ID</span>
                      <span className="text-primary font-mono font-bold">{internProfile.internId}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>Joining Date</span>
                      <span className="text-foreground font-bold">{formatDate(internProfile.startDate)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>PIN Code</span>
                      <span className="text-foreground font-bold font-mono">{internProfile.pinCode || "Not Provided"}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>Citizenship</span>
                      <span className="text-foreground font-bold">{internProfile.citizenship || "Not Provided"}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>Region / Origin</span>
                      <span className="text-foreground font-bold">{internProfile.region || "Not Provided"}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span>Direct Supervisor</span>
                      <span className="text-foreground font-bold">
                        {internProfile.supervisor?.fullName || "Founder/HR"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>AIMS Account ID</span>
                      <span className="text-primary font-mono font-bold">{user.id.substring(0, 18)}...</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>Scope Control</span>
                      <span className="text-foreground font-bold">FULL SYSTEM ACCESS</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Attendance Logs */}
            <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
              <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4">
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <ClipboardList className="h-4.5 w-4.5 text-emerald-500" />
                  <span>Attendance Roster Logs</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">Cumulative summaries</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                {isIntern && internProfile ? (
                  <>
                    <div className="flex items-end justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Compliance Rate</span>
                      <span className="text-2xl font-heading font-extrabold text-foreground">{stats.attendanceRate}%</span>
                    </div>
                    
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/20">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.attendanceRate}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
                      <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Present</span>
                        <span className="text-base font-heading font-extrabold text-foreground">{stats.presentCount} days</span>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wide">Late</span>
                        <span className="text-base font-heading font-extrabold text-foreground">{stats.lateCount} days</span>
                      </div>
                      <div className="p-2 rounded-xl bg-red-500/5 border border-red-500/10">
                        <span className="block text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Absent</span>
                        <span className="text-base font-heading font-extrabold text-foreground">{stats.absentCount} days</span>
                      </div>
                      <div className="p-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                        <span className="block text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Leave</span>
                        <span className="text-base font-heading font-extrabold text-foreground">{stats.leaveCount} days</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground space-y-3">
                    <UserCheck className="h-8 w-8 text-emerald-500 mx-auto opacity-70" />
                    <p className="font-semibold leading-relaxed">
                      Roster calculations are scoped exclusively to Intern enrollees.
                    </p>
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-left text-muted-foreground mt-2 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider block">Supervised Capacity</span>
                      <span className="text-foreground font-extrabold text-sm">{stats.supervisedCount} Active Interns</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Tasks Checklist */}
            <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
              <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4">
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Assigned Task Checklist</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">Goal completion summaries</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                {isIntern && internProfile ? (
                  <>
                    <div className="flex items-end justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Completion Rate</span>
                      <span className="text-2xl font-heading font-extrabold text-foreground">{stats.taskCompletionRate}%</span>
                    </div>
                    
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/20">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.taskCompletionRate}%` }}
                      />
                    </div>

                    <div className="space-y-2 pt-1 text-xs text-muted-foreground">
                      <div className="flex justify-between py-1.5 border-b border-border/30">
                        <span>Total Assigned Tasks</span>
                        <span className="text-foreground font-bold">{stats.totalTasks}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/30 text-emerald-600 dark:text-emerald-400">
                        <span>Completed Tasks</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.completedTasks}</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-amber-500">
                        <span>Pending Goals</span>
                        <span className="font-bold">{stats.pendingTasks}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground space-y-3">
                    <History className="h-8 w-8 text-indigo-500 mx-auto opacity-70" />
                    <p className="font-semibold leading-relaxed">
                      Tasks audits are handled dynamically inside the Intern board.
                    </p>
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-left text-muted-foreground mt-2 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider block">Managed Workspace Goals</span>
                      <span className="text-foreground font-extrabold text-sm">{stats.tasksAssignedCount} Assigned Tasks</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Corporate Bank Account Details Card */}
          {internProfile && (
            <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground mt-6">
              <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4">
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <User className="h-4.5 w-4.5 text-primary" />
                  <span>Corporate Bank Account Details</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Your registered corporate disbursement bank account metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-muted-foreground">
                <div className="space-y-3">
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span>Bank Name</span>
                    <span className="text-foreground font-bold">{internProfile.bankName || "Not Provided"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span>Account Number</span>
                    <span className="text-foreground font-bold font-mono select-all">{internProfile.accountNumber || "Not Provided"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span>IFSC Code</span>
                    <span className="text-foreground font-bold font-mono select-all">{internProfile.ifscCode || "Not Provided"}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span>UPI ID</span>
                    <span className="text-foreground font-bold select-all">{internProfile.upiId || "Not Provided"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span>Branch Name</span>
                    <span className="text-foreground font-bold">{internProfile.branchName || "Not Provided"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span>PAN Card</span>
                    <span className="text-foreground font-bold font-mono select-all">{internProfile.panCard || "Not Provided"}</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-3.5 rounded-xl bg-secondary/15 border border-border/40 text-[10px] leading-relaxed text-muted-foreground mt-4">
                <span className="font-bold text-primary block mb-0.5">Need to update bank or onboarding details?</span>
                Submit a Correction Request under the **Correction Requests** tab. The administration team will transactionally review, verify, and apply authorized corrections.
              </div>
            </Card>
          )}
        </div>
      )}

        {/* TAB 2: ACCOUNT SETTINGS */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Change Username Card */}
            <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
              <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4">
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <User className="h-4.5 w-4.5 text-primary" />
                  <span>Update Account Username</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">Manage your custom system handle identifier.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleUpdateUsername} className="space-y-4">
                  <Input
                    label="Current / New Username"
                    placeholder="Enter alphanumeric handle..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-background border-border text-foreground rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground leading-normal bg-secondary/15 p-2.5 rounded-lg border border-border/40">
                    <span className="font-bold text-primary">Rules:</span> Alphanumeric lowercase characters and hyphens only (e.g. <span className="font-mono font-bold">karan-verma-26</span>). No spaces or special symbols allowed.
                  </p>
                  <Button
                    type="submit"
                    variant="primary"
                    className="h-10 text-xs font-semibold bg-primary hover:bg-primary/95 text-white rounded-xl shadow w-full"
                    isLoading={loading}
                  >
                    Update Username
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
              <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4">
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <KeyRound className="h-4.5 w-4.5 text-primary" />
                  <span>Change Password</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">Update your account credentials password.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                  <Input
                    label="Current Password"
                    placeholder="Enter current password..."
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-background border-border text-foreground rounded-xl"
                  />
                  <Input
                    label="New Password"
                    placeholder="Min 8 characters..."
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-background border-border text-foreground rounded-xl"
                  />
                  <Input
                    label="Confirm New Password"
                    placeholder="Re-enter new password..."
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-background border-border text-foreground rounded-xl"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    className="h-10 text-xs font-semibold bg-primary hover:bg-primary/95 text-white rounded-xl shadow w-full mt-2"
                    isLoading={loading}
                  >
                    Change Account Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: CORRECTION REQUESTS */}
        {activeTab === "corrections" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Submit Correction Form (Interns Only) */}
            {isIntern && (
              <div className="lg:col-span-5">
                <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
                  <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4">
                    <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                      <Send className="h-4.5 w-4.5 text-primary" />
                      <span>Submit Correction Request</span>
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground">Request admin updates to locked profile metrics.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <form onSubmit={handleSubmitCorrection} className="space-y-4">
                      <div className="flex flex-col space-y-1.5 w-full">
                        <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                          Target Metric Field
                        </label>
                        <select
                          value={fieldToUpdate}
                          onChange={(e) => setFieldToUpdate(e.target.value)}
                          className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                        >
                          <option value="fullName" className="bg-card text-foreground">Official Full Name</option>
                          <option value="dateOfBirth" className="bg-card text-foreground">Date of Birth</option>
                          <option value="gender" className="bg-card text-foreground">Gender</option>
                          <option value="phoneNumber" className="bg-card text-foreground">Phone Number</option>
                          <option value="address" className="bg-card text-foreground">Mailing Address</option>
                          <option value="city" className="bg-card text-foreground">City</option>
                          <option value="state" className="bg-card text-foreground">State</option>
                          <option value="country" className="bg-card text-foreground">Country</option>
                          <option value="pinCode" className="bg-card text-foreground">PIN Code</option>
                          <option value="citizenship" className="bg-card text-foreground">Citizenship</option>
                          <option value="region" className="bg-card text-foreground">Region / Origin</option>
                          <option value="university" className="bg-card text-foreground">University / College</option>
                          <option value="degree" className="bg-card text-foreground">Degree / Course</option>
                          <option value="batchSemester" className="bg-card text-foreground">Batch / Semester</option>
                          <option value="department" className="bg-card text-foreground">Department Program</option>
                          <option value="roleDomain" className="bg-card text-foreground">Role Domain</option>
                          <option value="bankName" className="bg-card text-foreground">Bank Name</option>
                          <option value="accountNumber" className="bg-card text-foreground">Bank Account Number</option>
                          <option value="ifscCode" className="bg-card text-foreground">IFSC Code</option>
                          <option value="upiId" className="bg-card text-foreground">UPI ID</option>
                          <option value="branchName" className="bg-card text-foreground">Branch Name</option>
                          <option value="panCard" className="bg-card text-foreground">PAN Card</option>
                        </select>
                      </div>

                      <Input
                        label="Proposed Value"
                        placeholder="Enter corrected value (e.g. Aarav Sharma)..."
                        value={proposedValue}
                        onChange={(e) => setProposedValue(e.target.value)}
                        required
                        className="bg-background border-border text-foreground rounded-xl"
                      />

                      <div className="flex flex-col space-y-1.5 w-full">
                        <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                          Justification Notes / Description
                        </label>
                        <textarea
                          placeholder="Provide details or reasoning for the correction request..."
                          value={correctionNotes}
                          onChange={(e) => setCorrectionNotes(e.target.value)}
                          rows={3}
                          className="flex w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted-foreground"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        className="h-10 text-xs font-semibold bg-primary hover:bg-primary/95 text-white rounded-xl shadow w-full"
                        isLoading={loading}
                      >
                        Submit Correction Request
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Right Col: Timeline History for Interns OR Resolution Console for Admins */}
            <div className={cn("space-y-4", isIntern ? "lg:col-span-7" : "lg:col-span-12")}>
              {/* Timeline Card Wrapper */}
              <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
                <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                      <History className="h-4.5 w-4.5 text-primary" />
                      <span>{isManager ? "Administrative Correction Queue" : "Correction Requests Log"}</span>
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground">
                      {isManager ? "Approve or reject data corrections from enrollees." : "Track status of submitted corrections."}
                    </CardDescription>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/40 border border-border/40">
                    {requests.length} Requests
                  </span>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  {requests.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground select-none">
                      <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="font-semibold">No profile correction requests registered.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 rounded-xl border border-border bg-secondary/10 hover:border-primary/20 transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-sm text-foreground">{req.intern.fullName}</span>
                                <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded">
                                  {req.intern.internId}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground font-semibold">
                                Target Field: <span className="text-primary font-bold">{formatFieldName(req.fieldToUpdate)}</span>
                              </p>
                              <div className="text-xs text-muted-foreground space-y-0.5 pt-1.5">
                                <p className="leading-relaxed">Proposed Value: <span className="text-foreground font-bold bg-secondary/40 px-1.5 py-0.5 rounded border border-border/40 select-all font-mono">{req.proposedValue}</span></p>
                                {req.notes && <p className="italic leading-normal">Intern Reason: "{req.notes}"</p>}
                                <p className="text-[9px] text-muted-foreground/60 pt-1">Submitted: {formatDate(req.createdAt)}</p>
                              </div>
                            </div>

                            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                              <span className={`self-start sm:self-auto inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(req.status)}`}>
                                {req.status}
                              </span>

                              {/* Manager Resolution buttons */}
                              {isManager && req.status === "PENDING" && (
                                <div className="flex flex-col gap-2 pt-2 self-stretch sm:self-auto w-full sm:w-48">
                                  <textarea
                                    placeholder="Optional resolution remarks..."
                                    value={resolutionNotes[req.id] || ""}
                                    onChange={(e) => setResolutionNotes({ ...resolutionNotes, [req.id]: e.target.value })}
                                    rows={1}
                                    className="w-full text-[10px] rounded-lg border border-border bg-background px-2.5 py-1 text-foreground focus:outline-none placeholder-muted-foreground"
                                  />
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleResolveRequest(req.id, "APPROVE")}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] h-7 w-full p-0"
                                      disabled={loading}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleResolveRequest(req.id, "REJECT")}
                                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold text-[10px] h-7 w-full p-0 border border-rose-500/25"
                                      disabled={loading}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
