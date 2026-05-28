"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Search,
  UserPlus,
  Trash2,
  Check,
  X,
  Loader2,
  Lock,
  Unlock,
  Key,
  Shield,
  Layers,
  FileText,
  Calendar,
  CheckSquare,
  Settings,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Copy
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import AccessDeniedShield from "@/components/layout/AccessDeniedShield";

interface UserPermission {
  id: string;
  userId: string;
  dashboardAccess: boolean;
  attendanceAccess: boolean;
  taskAccess: boolean;
  documentAccess: boolean;
  approvalAccess: boolean;
  settingsAccess: boolean;
  analyticsAccess: boolean;
  onboardingAccess: boolean;
}

interface User {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
  permission: UserPermission | null;
  internProfile: {
    id: string;
    internId: string;
    status: string;
    roleDomain: string;
    department: string;
    phoneNumber: string;
    employmentType?: string;
  } | null;
}

export default function PermissionsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Core state
  const [users, setUsers] = useState<User[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [previewRole, setPreviewRole] = useState<string>("FOUNDER");
  const [isDenied, setIsDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPreviewRole(localStorage.getItem("aims-preview-role") || "FOUNDER");
    }
  }, []);
  
  // Create / Onboard User Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardFullName, setOnboardFullName] = useState("");
  const [onboardPassword, setOnboardPassword] = useState("");
  const [onboardRole, setOnboardRole] = useState("ADMIN");
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardError, setOnboardError] = useState("");

  // Review Onboarding Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewUser, setReviewUser] = useState<User | null>(null);
  const [reviewRole, setReviewRole] = useState("INTERN");
  const [officialId, setOfficialId] = useState("");
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewCopied, setReviewCopied] = useState(false);
  
  // Custom permissions presets per role creation
  const [customPerms, setCustomPerms] = useState({
    dashboardAccess: true,
    attendanceAccess: true,
    taskAccess: true,
    documentAccess: true,
    approvalAccess: false,
    settingsAccess: false,
    analyticsAccess: true,
    onboardingAccess: false,
  });

  // Action feedback states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Retrieve user session info
  const currentUser = session?.user as any;

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!session) {
      router.push("/");
      return;
    }

    fetchUsers();
  }, [session, sessionStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/permissions");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsers(data.users);
          setChangeLogs(data.changeLogs || []);
        }
      } else {
        if (res.status === 403 || res.status === 401) {
          setIsDenied(true);
        } else {
          setErrorMessage("Failed to load users list from AIMS central handlers.");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("An unexpected network error occurred while querying permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewRoleChange = (role: string) => {
    setPreviewRole(role);
    if (role === "FOUNDER") {
      localStorage.removeItem("aims-preview-role");
    } else {
      localStorage.setItem("aims-preview-role", role);
    }
    // Trigger window event to sync with DashboardLayout
    window.dispatchEvent(new Event("aims-preview-role-change"));
    setSuccessMessage(`Preview Mode updated! You are now viewing the workspace as: ${role}`);
  };

  // Preset permissions automatically when creating different roles
  const handleRolePreset = (role: string) => {
    setOnboardRole(role);
    if (role === "SUPER_ADMIN") {
      setCustomPerms({
        dashboardAccess: true,
        attendanceAccess: true,
        taskAccess: true,
        documentAccess: true,
        approvalAccess: true,
        settingsAccess: true,
        analyticsAccess: true,
        onboardingAccess: true,
      });
    } else if (role === "ADMIN") {
      setCustomPerms({
        dashboardAccess: true,
        attendanceAccess: true,
        taskAccess: true,
        documentAccess: true,
        approvalAccess: false,
        settingsAccess: false,
        analyticsAccess: true,
        onboardingAccess: false,
      });
    } else if (role === "HR") {
      setCustomPerms({
        dashboardAccess: true,
        attendanceAccess: true,
        taskAccess: true,
        documentAccess: true,
        approvalAccess: true,
        settingsAccess: false,
        analyticsAccess: true,
        onboardingAccess: true,
      });
    } else if (role === "TEAM_LEAD") {
      setCustomPerms({
        dashboardAccess: true,
        attendanceAccess: true,
        taskAccess: true,
        documentAccess: false,
        approvalAccess: false,
        settingsAccess: false,
        analyticsAccess: true,
        onboardingAccess: false,
      });
    }
  };

  // Submit User Onboarding
  const handleOnboardUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError("");
    setOnboardingLoading(true);

    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: onboardEmail,
          password: onboardPassword,
          fullName: onboardFullName,
          role: onboardRole,
          permissions: customPerms,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Successfully onboarded administrative ${onboardRole} account!`);
        setShowCreateModal(false);
        // Reset inputs
        setOnboardEmail("");
        setOnboardFullName("");
        setOnboardPassword("");
        fetchUsers();
      } else {
        setOnboardError(data.error || "Failed to onboard administrative account.");
      }
    } catch (err) {
      setOnboardError("An unexpected network error occurred.");
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Toggle dynamic permission settings
  const handleTogglePermission = async (user: User, key: keyof UserPermission) => {
    if (user.role === "FOUNDER") return; // Hard lock
    if (user.role === "SUPER_ADMIN" && currentUser?.role !== "FOUNDER") return; // Super admin lock

    const currentPerm = user.permission || {
      dashboardAccess: true,
      attendanceAccess: true,
      taskAccess: true,
      documentAccess: true,
      approvalAccess: false,
      settingsAccess: false,
      analyticsAccess: true,
      onboardingAccess: false,
    } as any;

    const nextPerms = {
      ...currentPerm,
      [key]: !currentPerm[key],
    };

    setActionLoading(`${user.id}-${key}`);
    try {
      const res = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          permissions: nextPerms,
        }),
      });

      if (res.ok) {
        const updatedPermission = { ...currentPerm, [key]: nextPerms[key] };
        // Optimistic UI state sync
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === user.id ? { ...u, permission: updatedPermission } : u
          )
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) =>
            prev ? { ...prev, permission: updatedPermission } : null
          );
        }
        setSuccessMessage(`Updated permission settings for ${user.fullName} successfully.`);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Forbidden. Failed to update permission override.");
      }
    } catch (err) {
      setErrorMessage("Network issue occurred while toggling settings.");
    } finally {
      setActionLoading(null);
    }
  };

  // Update Administrative Role
  const handleUpdateRole = async (user: User, newRole: string) => {
    if (user.role === "FOUNDER") return;
    if (newRole === "SUPER_ADMIN" && currentUser?.role !== "FOUNDER") {
      setErrorMessage("Forbidden. Only the Founder can promote users to Super Admin.");
      return;
    }

    setActionLoading(`${user.id}-role`);
    try {
      const res = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: newRole,
        }),
      });

      if (res.ok) {
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => prev ? { ...prev, role: newRole } : null);
        }
        setSuccessMessage(`Promoted ${user.fullName} to ${newRole} role successfully.`);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to update role category.");
      }
    } catch (err) {
      setErrorMessage("Network error updating role details.");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete User Account
  const handleDeleteUser = async (user: User) => {
    if (user.role === "FOUNDER") return;
    if (user.id === currentUser?.id) {
      setErrorMessage("Forbidden. You cannot wipe your own active administrative workspace account.");
      return;
    }
    if (user.role === "SUPER_ADMIN" && currentUser?.role !== "FOUNDER") {
      setErrorMessage("Forbidden. Only the Founder can delete Super Admin accounts.");
      return;
    }

    if (!confirm(`Are you absolutely sure you want to permanently delete ${user.fullName}'s account? This action is irreversible.`)) {
      return;
    }

    setActionLoading(`${user.id}-delete`);
    try {
      const res = await fetch(`/api/permissions?userId=${user.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        if (selectedUser?.id === user.id) {
          setSelectedUser(null);
        }
        setSuccessMessage(`Permanently purged user account details for ${user.fullName}.`);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Purge failed. Safe guard handlers intercepted action.");
      }
    } catch (err) {
      setErrorMessage("Network issue purged database transaction.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenReviewModal = (user: User) => {
    setReviewUser(user);
    const isInternType = user.internProfile?.employmentType === "INTERN";
    setReviewRole(isInternType ? "INTERN" : "EMPLOYEE");
    setActivationCode(null);
    setReviewError("");
    setReviewCopied(false);
    
    // Generate a smart, professional default ID format: AXN-[DEPT-PREFIX]-2605-[RandomHex]
    const dept = user.internProfile?.department || "General";
    let prefix = "GEN";
    if (dept.toLowerCase().includes("software")) prefix = "SWE";
    else if (dept.toLowerCase().includes("resource")) prefix = "HR";
    else if (dept.toLowerCase().includes("product")) prefix = "PM";
    else if (dept.toLowerCase().includes("data")) prefix = "DA";
    else if (dept.toLowerCase().includes("operation")) prefix = "OPS";
    else if (dept.toLowerCase().includes("marketing")) prefix = "MKT";
    
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const defaultOfficialId = `AXN-${prefix}-2605-${randomSuffix}`;
    setOfficialId(defaultOfficialId);
    
    setShowReviewModal(true);
  };

  const handleReviewAction = async (status: "APPROVED" | "REJECTED") => {
    if (!reviewUser) return;
    setReviewError("");
    setReviewLoading(true);

    try {
      const res = await fetch("/api/permissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: reviewUser.id,
          role: reviewRole,
          internId: officialId,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Failed to process verification transaction.");
      } else {
        if (status === "APPROVED") {
          setActivationCode(data.tempPassword);
          setSuccessMessage(`Approved and activated workspace for ${reviewUser.fullName}!`);
        } else {
          setSuccessMessage(`Enrollment request for ${reviewUser.fullName} has been rejected.`);
          setShowReviewModal(false);
          fetchUsers();
        }
      }
    } catch (err) {
      setReviewError("An unexpected communication error occurred.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReviewCopy = () => {
    if (activationCode) {
      navigator.clipboard.writeText(activationCode);
      setReviewCopied(true);
      setTimeout(() => setReviewCopied(false), 3000);
    }
  };

  const pendingUsers = users.filter((u) => u.status === "PENDING");
  const activeUsers = users.filter((u) => u.status !== "PENDING");

  // Filter active users by search box query
  const filteredUsers = activeUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || sessionStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-semibold text-gray-400 mt-4 tracking-wider">
          Retrieving Security Authorization Matrices...
        </p>
      </div>
    );
  }

  // Categories helper
  const getPermissionLabel = (key: string) => {
    switch (key) {
      case "dashboardAccess": return "Dashboard Access";
      case "attendanceAccess": return "Attendance Controls";
      case "taskAccess": return "Tasks Controls";
      case "documentAccess": return "Documents Controls";
      case "approvalAccess": return "Approvals Controls";
      case "settingsAccess": return "Settings Access";
      case "analyticsAccess": return "Analytics Access";
      case "onboardingAccess": return "Onboarding Access";
      default: return key;
    }
  };

  const getPermissionIcon = (key: string) => {
    const classStyle = "h-3.5 w-3.5 shrink-0";
    switch (key) {
      case "dashboardAccess": return <Layers className={`${classStyle} text-blue-400`} />;
      case "attendanceAccess": return <Calendar className={`${classStyle} text-cyan-400`} />;
      case "taskAccess": return <CheckSquare className={`${classStyle} text-indigo-400`} />;
      case "documentAccess": return <FileText className={`${classStyle} text-emerald-400`} />;
      case "approvalAccess": return <UserCheck className={`${classStyle} text-amber-400`} />;
      case "settingsAccess": return <Settings className={`${classStyle} text-slate-400`} />;
      case "analyticsAccess": return <TrendingUp className={`${classStyle} text-violet-400`} />;
      case "onboardingAccess": return <UserPlus className={`${classStyle} text-pink-400`} />;
        default: return <Lock className={classStyle} />;
    }
  };

  if (isDenied) {
    return <AccessDeniedShield requiredRole="Security Settings" currentRole={currentUser?.role} />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 select-none text-slate-800 dark:text-white max-w-6xl mx-auto pb-12">
      
      {/* Dynamic Feedback Toasts */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl border border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 backdrop-blur-xl text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center space-x-3.5 animate-fadeIn shadow-lg">
          <Check className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="hover:text-slate-800 dark:hover:text-white ml-2">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl border border-red-500/25 bg-red-50 dark:bg-red-500/10 backdrop-blur-xl text-red-600 dark:text-red-400 font-semibold text-xs flex items-center space-x-3.5 animate-fadeIn shadow-lg">
          <AlertCircle className="h-4.5 w-4.5 text-red-500 dark:text-red-400" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="hover:text-slate-800 dark:hover:text-white ml-2">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-gradient-to-br from-white via-slate-50/80 to-indigo-50/20 dark:from-[#0c1220] dark:via-[#0d1629] dark:to-[#050b18] p-6 sm:p-8 shadow-md dark:shadow-2xl backdrop-blur-md">
        <div className="absolute -right-20 -top-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[60px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-violet-400/5 dark:bg-violet-500/10 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
              <Key className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
                Security Administration
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Roles & Permissions Control Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 font-medium leading-relaxed max-w-3xl">
              Founders and Super Admins define access presets, manage account creations, modify interactive role hierarchies, and configure custom permission overrides.
            </p>
          </div>
          
          <div className="shrink-0">
            <Button
              onClick={() => {
                handleRolePreset("ADMIN");
                setShowCreateModal(true);
              }}
              variant="primary"
              className="h-11 text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl px-5 border border-white/10 dark:border-white/5 shadow-md hover:shadow-lg transition-all duration-300 text-white"
            >
              <UserPlus className="h-4 w-4" />
              <span>Onboard Administrator</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 1.5 Founder Interactive Role Preview (Founder Only) */}
      {currentUser?.role === "FOUNDER" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-yellow-500/5 dark:bg-yellow-500/10 border border-yellow-500/15 dark:border-yellow-500/20 rounded-2xl animate-fadeIn">
          <div className="flex items-center space-x-2 shrink-0">
            <ShieldAlert className="h-4.5 w-4.5 text-yellow-600 dark:text-yellow-400 animate-pulse" />
            <span className="text-xs font-bold text-yellow-800 dark:text-yellow-400">Founder Role Preview Console:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { role: "FOUNDER", label: "Elite Founder" },
              { role: "SUPER_ADMIN", label: "Super Admin" },
              { role: "HR", label: "HR Admin" },
              { role: "ADMIN", label: "Admin Manager" },
              { role: "TEAM_LEAD", label: "Supervisor" },
              { role: "INTERN", label: "Active Intern" },
              { role: "EMPLOYEE", label: "Employee" },
            ].map((btn) => (
              <button
                key={btn.role}
                onClick={() => handlePreviewRoleChange(btn.role)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-heading font-extrabold uppercase border tracking-wider transition-all cursor-pointer ${
                  previewRole === btn.role
                    ? "bg-yellow-500 border-yellow-600 text-slate-950 shadow-md shadow-yellow-500/10"
                    : "bg-transparent border-slate-200 dark:border-white/[0.08] hover:border-yellow-500/50 text-slate-650 dark:text-gray-400"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pending Registrations Queue */}
      {pendingUsers.length > 0 && (
        <Card className="border-amber-550/25 bg-amber-500/5 dark:bg-amber-500/10 border backdrop-blur-md p-5 sm:p-6 shadow-md dark:shadow-2xl rounded-2xl animate-fadeIn">
          <CardHeader className="p-0 pb-3 border-b border-amber-500/10 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-heading font-extrabold text-amber-850 dark:text-amber-400 flex items-center space-x-2">
                <UserCheck className="h-4.5 w-4.5 animate-pulse text-amber-600 dark:text-amber-450" />
                <span>Pending Enrollment Verification Queue</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                New registrants awaiting profile verification, role designation, and workspace activation.
              </CardDescription>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider self-start sm:self-center">
              {pendingUsers.length} enrollees
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-amber-500/10 text-[9px] font-bold text-amber-800/70 dark:text-amber-400/70 uppercase tracking-widest bg-amber-500/5">
                    <th className="py-2.5 px-3">Registrant Name</th>
                    <th className="py-2.5 px-3">Corporate Email / User</th>
                    <th className="py-2.5 px-3">Phone Number</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Requested Position</th>
                    <th className="py-2.5 px-3 text-center">Verify Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10 text-slate-800 dark:text-gray-300">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-amber-500/5">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {user.fullName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="block font-medium">{user.email}</span>
                        <span className="text-[9px] text-slate-400 dark:text-gray-500 block font-mono">@{user.username}</span>
                      </td>
                      <td className="py-3 px-3 font-semibold font-mono text-[10px] text-slate-650 dark:text-gray-400">
                        {user.internProfile?.phoneNumber || "N/A"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-bold uppercase text-[9px]">
                          {user.internProfile?.department || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-650 dark:text-gray-400">
                        {user.internProfile?.roleDomain || "Intern"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          onClick={() => handleOpenReviewModal(user)}
                          variant="secondary"
                          className="h-8 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 border border-amber-600/30 text-slate-950 rounded-lg px-3 cursor-pointer shadow-sm active:scale-95 transition-all"
                        >
                          Review Request
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Management Workspace Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Directory Listing Panel (2/3 width) */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-white/[0.08] bg-white/75 dark:bg-[#0b0f19]/60 backdrop-blur-md flex flex-col justify-between shadow-sm dark:shadow-2xl">
          <CardHeader className="border-b border-slate-200 dark:border-white/[0.06] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-slate-900 dark:text-white">Security Permission Matrix</CardTitle>
              <CardDescription className="text-slate-500 dark:text-gray-400">Chronological access mapping matrix. Toggle access points (✅ / ❌) instantly.</CardDescription>
            </div>
            
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] focus:bg-white dark:focus:bg-[#0b0f19] border border-slate-200 dark:border-white/[0.08] focus:border-indigo-500/40 rounded-lg text-xs font-medium focus:outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:ring-1 focus:ring-indigo-500/10"
              />
            </div>
          </CardHeader>
          
          <CardContent className="p-0 overflow-y-auto max-h-[60vh] divide-y divide-slate-100 dark:divide-white/[0.04]">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-gray-400 font-medium">
                No matching accounts or system profiles found.
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.01] text-[9px] font-heading font-bold text-slate-500 dark:text-gray-450 uppercase tracking-widest">
                      <th className="py-3.5 px-4">User Profile</th>
                      <th className="py-3.5 px-3">Role</th>
                      <th className="py-3.5 px-3 text-center">Dashboard</th>
                      <th className="py-3.5 px-3 text-center">Attendance</th>
                      <th className="py-3.5 px-3 text-center">Tasks</th>
                      <th className="py-3.5 px-3 text-center">Documents</th>
                      <th className="py-3.5 px-3 text-center">Settings</th>
                      <th className="py-3.5 px-3 text-center">Onboard</th>
                      <th className="py-3.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-white/[0.04]">
                    {filteredUsers.map((user) => {
                      const isFounder = user.role === "FOUNDER";
                      const isSuperAdmin = user.role === "SUPER_ADMIN";
                      const isSelf = user.id === currentUser?.id;
                      
                      const userPerms = user.permission || {
                        dashboardAccess: true,
                        attendanceAccess: true,
                        taskAccess: true,
                        documentAccess: true,
                        approvalAccess: false,
                        settingsAccess: false,
                        analyticsAccess: true,
                        onboardingAccess: false,
                      } as any;

                      const renderToggle = (key: keyof UserPermission) => {
                        const isGranted = !!userPerms[key];
                        const isDisabled = isFounder || (isSuperAdmin && currentUser?.role !== "FOUNDER") || actionLoading === `${user.id}-${key}`;
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isDisabled) handleTogglePermission(user, key);
                            }}
                            disabled={isDisabled}
                            className={`p-1.5 rounded-lg border transition-all inline-flex items-center justify-center cursor-pointer ${
                              isGranted 
                                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-250 dark:border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:scale-105 shadow-sm"
                                : "bg-red-50 dark:bg-red-500/10 border-red-250 dark:border-red-500/25 text-red-600 dark:text-red-400 hover:scale-105 shadow-sm"
                            } ${isDisabled ? "opacity-45 cursor-not-allowed hover:scale-100 shadow-none" : ""}`}
                            title={`Toggle ${key} override`}
                          >
                            {actionLoading === `${user.id}-${key}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isGranted ? (
                              <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                            ) : (
                              <X className="h-3 w-3 text-red-550 dark:text-red-400" />
                            )}
                          </button>
                        );
                      };

                      return (
                        <tr 
                          key={user.id} 
                          onClick={() => setSelectedUser(user)}
                          className={`hover:bg-slate-55/60 dark:hover:bg-white/[0.01] transition-all cursor-pointer ${selectedUser?.id === user.id ? "bg-indigo-50/20 dark:bg-white/[0.02]" : ""}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3.5 min-w-0">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-heading font-extrabold select-none shrink-0 border text-xs ${isFounder ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400" : isSuperAdmin ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"}`}>
                                {(user.fullName?.[0] || user.email?.[0] || "?").toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate block max-w-[110px]">{user.fullName}</span>
                                  {isSelf && (
                                    <span className="text-[7px] font-mono bg-indigo-150 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded font-extrabold uppercase">YOU</span>
                                  )}
                                </div>
                                <span className="text-[9px] text-slate-400 dark:text-gray-450 truncate block max-w-[130px]">{user.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-heading font-extrabold uppercase border tracking-wider select-none ${isFounder ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" : isSuperAdmin ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" : user.role === "HR" ? "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" : user.role === "ADMIN" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"}`}>
                              {user.role}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">{isFounder ? <Check className="h-3 w-3 text-yellow-500 mx-auto" /> : renderToggle("dashboardAccess")}</td>
                          <td className="py-3 px-3 text-center">{isFounder ? <Check className="h-3 w-3 text-yellow-500 mx-auto" /> : renderToggle("attendanceAccess")}</td>
                          <td className="py-3 px-3 text-center">{isFounder ? <Check className="h-3 w-3 text-yellow-500 mx-auto" /> : renderToggle("taskAccess")}</td>
                          <td className="py-3 px-3 text-center">{isFounder ? <Check className="h-3 w-3 text-yellow-500 mx-auto" /> : renderToggle("documentAccess")}</td>
                          <td className="py-3 px-3 text-center">{isFounder ? <Check className="h-3 w-3 text-yellow-500 mx-auto" /> : renderToggle("settingsAccess")}</td>
                          <td className="py-3 px-3 text-center">{isFounder ? <Check className="h-3 w-3 text-yellow-500 mx-auto" /> : renderToggle("onboardingAccess")}</td>

                          <td className="py-3 px-3 text-center">
                            {!isFounder && (currentUser?.role === "FOUNDER" || (currentUser?.role === "SUPER_ADMIN" && !isSuperAdmin)) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(user);
                                }}
                                disabled={actionLoading === `${user.id}-delete`}
                                className="p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:text-red-650 dark:hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Delete user"
                              >
                                {actionLoading === `${user.id}-delete` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Edit Override Drawer Card (1/3 width) */}
        <Card className="border-slate-200 dark:border-white/[0.08] bg-white/75 dark:bg-[#0b0f19]/60 backdrop-blur-md p-5 sm:p-6 flex flex-col space-y-5 shadow-sm dark:shadow-2xl">
          {selectedUser ? (
            <>
              {/* Profile card summary */}
              <div className="border-b border-slate-200 dark:border-white/[0.06] pb-4 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-heading font-extrabold text-slate-900 dark:text-white">
                      Permission Inspector
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-gray-400">Configure fine-grained access override channels</p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/[0.04]">
                  <div className="h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-500 dark:text-indigo-400 shrink-0">
                    {(selectedUser.fullName?.[0] || selectedUser.email?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">{selectedUser.fullName}</span>
                    <span className="text-[9px] text-slate-400 dark:text-gray-450 block truncate">{selectedUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Role promotion console */}
              {selectedUser.role !== "FOUNDER" && (currentUser?.role === "FOUNDER" || (currentUser?.role === "SUPER_ADMIN" && selectedUser.role !== "SUPER_ADMIN")) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-heading font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                    Administrative Designation Role
                  </label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => handleUpdateRole(selectedUser, e.target.value)}
                    disabled={actionLoading === `${selectedUser.id}-role`}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] focus:border-indigo-500/40 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer text-slate-800 dark:text-white"
                  >
                    <option value="INTERN" className="bg-white dark:bg-[#0b0f19] text-slate-800 dark:text-white">Intern</option>
                    <option value="EMPLOYEE" className="bg-white dark:bg-[#0b0f19] text-slate-800 dark:text-white">Employee</option>
                    <option value="TEAM_LEAD" className="bg-white dark:bg-[#0b0f19] text-slate-800 dark:text-white">Team Lead / supervisor</option>
                    <option value="ADMIN" className="bg-white dark:bg-[#0b0f19] text-slate-800 dark:text-white">Admin Manager</option>
                    <option value="HR" className="bg-white dark:bg-[#0b0f19] text-slate-800 dark:text-white">HR Administrator</option>
                    {currentUser?.role === "FOUNDER" && <option value="SUPER_ADMIN" className="bg-white dark:bg-[#0b0f19] text-slate-800 dark:text-white">Super Admin Director</option>}
                  </select>
                </div>
              )}

              {/* Interactive Switches list */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-heading font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                    Fine-Grained Permissions
                  </span>
                  
                  {selectedUser.role === "FOUNDER" && (
                    <span className="text-[9px] font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded flex items-center space-x-1">
                      <Lock className="h-3 w-3" />
                      <span>FOUNDER UNRESTRICTED</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
                  {Object.keys(selectedUser.permission || {
                    dashboardAccess: true,
                    attendanceAccess: true,
                    taskAccess: true,
                    documentAccess: true,
                    approvalAccess: false,
                    settingsAccess: false,
                    analyticsAccess: true,
                    onboardingAccess: false,
                  }).filter(k => k !== "id" && k !== "userId" && k !== "createdAt" && k !== "updatedAt").map((key) => {
                    const typedKey = key as keyof UserPermission;
                    const isGranted = selectedUser.permission ? !!selectedUser.permission[typedKey] : false;
                    const isFounder = selectedUser.role === "FOUNDER";
                    const isSuperAdminEditLocked = selectedUser.role === "SUPER_ADMIN" && currentUser?.role !== "FOUNDER";
                    
                    const isTogglingDisabled = isFounder || isSuperAdminEditLocked || actionLoading === `${selectedUser.id}-${key}`;
                    
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isGranted ? "bg-indigo-50/30 dark:bg-white/[0.02] border-indigo-100 dark:border-white/[0.04]" : "bg-transparent border-transparent opacity-65 text-slate-400 dark:text-gray-400"}`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {getPermissionIcon(key)}
                          <span className="text-xs font-semibold text-slate-700 dark:text-gray-300 truncate">
                            {getPermissionLabel(key)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleTogglePermission(selectedUser, typedKey)}
                          disabled={isTogglingDisabled}
                          className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 outline-none flex ${isGranted ? "bg-indigo-600 justify-end" : "bg-slate-200 dark:bg-white/10 justify-start"} ${isTogglingDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 text-slate-400 dark:text-gray-500 select-none">
              <Shield className="h-12 w-12 text-slate-200 dark:text-white/10" />
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-gray-400">No Account Selected</h4>
                <p className="text-[10px] text-slate-450 dark:text-gray-500 mt-1 max-w-[200px] leading-relaxed">
                  Select any administrative user or active intern from the directory to review their permission settings and custom overrides.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 3. Security Audit Trail Logs (Full Width) */}
      <Card className="border-slate-200 dark:border-white/[0.08] bg-white/75 dark:bg-[#0b0f19]/60 backdrop-blur-md p-5 sm:p-6 shadow-sm dark:shadow-2xl">
        <CardHeader className="p-0 pb-3 border-b border-slate-200 dark:border-white/[0.06] mb-4">
          <CardTitle className="text-sm font-heading font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldAlert className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />
            <span>Security Permissions Audit Trail</span>
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-500 dark:text-gray-400">
            Immutable, chronological system ledger capturing permission overrides and designation promotions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            {changeLogs.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-gray-500 py-6 text-center font-medium">No permission modifications recorded in AIMS ledger.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.04] text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest bg-slate-50 dark:bg-white/[0.01]">
                    <th className="py-2.5 px-3">Authorized Operator</th>
                    <th className="py-2.5 px-3">Target Profile</th>
                    <th className="py-2.5 px-3">Transition</th>
                    <th className="py-2.5 px-3">Modification Details</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-slate-700 dark:text-gray-300">
                  {changeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{log.changedBy?.fullName}</span>
                        <span className="text-[9px] text-slate-400 dark:text-gray-500 block uppercase font-mono">{log.changedBy?.role}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{log.target?.fullName}</span>
                        <span className="text-[9px] text-slate-400 dark:text-gray-500 block uppercase font-mono">{log.target?.role}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-gray-300 px-2 py-0.5 rounded font-mono">
                          {log.previousRole} → {log.newRole}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold font-mono text-[10px] text-indigo-650 dark:text-indigo-400 whitespace-pre-wrap max-w-sm">
                        {log.details}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-400 dark:text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Onboard / Create Modal Dialog Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-[#050b18]/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-6 shadow-2xl space-y-6 animate-scaleIn select-none text-slate-800 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] pb-4">
              <div>
                <h3 className="text-md font-heading font-extrabold text-slate-900 dark:text-white">
                  Create Administrative Manager Account
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-gray-450">Onboard project leaders, HR personnel, and Super Admin assistants.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {onboardError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            <form onSubmit={handleOnboardUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-heading font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={onboardFullName}
                    onChange={(e) => setOnboardFullName(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] focus:border-indigo-500/40 focus:outline-none rounded-lg text-xs font-semibold text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-heading font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. manager@aurxon.com"
                    value={onboardEmail}
                    onChange={(e) => setOnboardEmail(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] focus:border-indigo-500/40 focus:outline-none rounded-lg text-xs font-semibold text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-heading font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                    Temp Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={onboardPassword}
                    onChange={(e) => setOnboardPassword(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] focus:border-indigo-500/40 focus:outline-none rounded-lg text-xs font-semibold text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-heading font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                    Designation Role
                  </label>
                  <select
                    value={onboardRole}
                    onChange={(e) => handleRolePreset(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500/40 rounded-lg text-xs font-semibold cursor-pointer text-slate-800 dark:text-white"
                  >
                    <option value="ADMIN" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">Admin Manager</option>
                    <option value="HR" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">HR Administrator</option>
                    <option value="TEAM_LEAD" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">Team Lead / Supervisor</option>
                    {currentUser?.role === "FOUNDER" && <option value="SUPER_ADMIN" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">Super Admin Director</option>}
                  </select>
                </div>
              </div>

              {/* Toggles inside form */}
              <div className="space-y-2 border-t border-slate-200 dark:border-white/[0.06] pt-4">
                <span className="text-[10px] font-heading font-extrabold text-slate-500 dark:text-gray-450 uppercase tracking-wider block mb-2">
                  Permissions Preset overrides
                </span>

                <div className="grid grid-cols-2 gap-3.5">
                  {Object.keys(customPerms).map((key) => {
                    const typedKey = key as keyof typeof customPerms;
                    const isVal = customPerms[typedKey];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-150 dark:border-white/[0.04]"
                      >
                        <span className="text-[10px] font-semibold text-slate-550 dark:text-gray-400 truncate">
                          {getPermissionLabel(key)}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setCustomPerms(prev => ({ ...prev, [typedKey]: !isVal }))}
                          className={`w-8 h-4 rounded-full p-0.5 transition-all duration-300 outline-none flex ${isVal ? "bg-indigo-600 justify-end" : "bg-slate-200 dark:bg-white/10 justify-start"}`}
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  variant="secondary"
                  className="h-10 text-xs font-semibold rounded-lg px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:hover:border-white/20 transition-all dark:text-white"
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={onboardingLoading}
                  variant="primary"
                  className="h-10 text-xs font-bold rounded-lg px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 transition-all text-white flex items-center justify-center space-x-2"
                >
                  {onboardingLoading ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <span>Onboard administrative user</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Enrollment Modal Dialog Overlay */}
      {showReviewModal && reviewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-[#050b18]/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-6 shadow-2xl space-y-5 animate-scaleIn select-none text-slate-800 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] pb-4">
              <div>
                <h3 className="text-md font-heading font-extrabold text-slate-900 dark:text-white">
                  Review Workforce Registration
                </h3>
                <p className="text-[10px] text-slate-455 dark:text-gray-450">
                  Verify profile credentials, assign corporate role, and activate user workspace.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  fetchUsers();
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {reviewError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {activationCode ? (
              <div className="space-y-5 text-center py-4">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <UserCheck className="h-10 w-10 text-emerald-555 animate-bounce" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Account Activated!</h4>
                  <p className="text-[11px] text-gray-550 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                    Corporate profile activated under ID <span className="font-bold text-slate-800 dark:text-slate-200">{officialId}</span>. The temporary password has been transactionally saved:
                  </p>
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-xl flex flex-col items-center space-y-2">
                  <span className="text-[8px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">Temporary Onboarding Credentials</span>
                  <div className="flex items-center space-x-3 bg-black/20 dark:bg-black/40 px-4 py-2 rounded-lg border border-white/5 w-full justify-between">
                    <code className="text-base font-mono font-bold tracking-wider text-emerald-500 select-all">{activationCode}</code>
                    <button
                      onClick={handleReviewCopy}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors text-emerald-500 hover:text-emerald-400 cursor-pointer"
                    >
                      {reviewCopied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5 text-emerald-500" />}
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-405">Provide this temporary code to the enrolee to complete onboarding.</span>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      setShowReviewModal(false);
                      fetchUsers();
                    }}
                    variant="primary"
                    className="h-10 text-xs font-bold px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl cursor-pointer"
                  >
                    Complete Review
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-150 dark:border-white/[0.04] text-xs leading-normal">
                  <div>
                    <span className="text-[9px] text-slate-450 dark:text-gray-555 block font-bold uppercase tracking-wider">Full Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">{reviewUser.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 dark:text-gray-555 block font-bold uppercase tracking-wider">Requested Position</span>
                    <span className="font-bold text-indigo-550 dark:text-indigo-400">{reviewUser.internProfile?.roleDomain}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 dark:text-gray-555 block font-bold uppercase tracking-wider">Corporate Email</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block max-w-[170px]">{reviewUser.email}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 dark:text-gray-555 block font-bold uppercase tracking-wider">Phone / User</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {reviewUser.internProfile?.phoneNumber || "N/A"} <span className="text-[10px] text-slate-400 font-normal">(@{reviewUser.username})</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-heading font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                      Official Intern / Employee ID Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AXN-SWE-2605-AS01"
                      value={officialId}
                      onChange={(e) => setOfficialId(e.target.value)}
                      disabled={reviewLoading}
                      className="w-full h-10 px-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] focus:border-indigo-500/40 focus:outline-none rounded-lg text-xs font-semibold text-slate-800 dark:text-white transition-all uppercase placeholder:text-slate-400 dark:placeholder:text-gray-550"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-heading font-extrabold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                      Assigned Workspace Corporate Role
                    </label>
                    <select
                      value={reviewRole}
                      onChange={(e) => setReviewRole(e.target.value)}
                      disabled={reviewLoading}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500/40 rounded-lg text-xs font-semibold cursor-pointer text-slate-800 dark:text-white"
                    >
                      <option value="INTERN" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">Intern</option>
                      <option value="EMPLOYEE" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">Employee</option>
                      <option value="TEAM_LEAD" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">Team Lead / Supervisor</option>
                      <option value="ADMIN" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">Admin Manager</option>
                      <option value="HR" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">HR Administrator</option>
                      {currentUser?.role === "FOUNDER" && <option value="SUPER_ADMIN" className="bg-white dark:bg-[#0c1220] text-slate-800 dark:text-white">Super Admin Director</option>}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/[0.06]">
                  <Button
                    onClick={() => handleReviewAction("REJECTED")}
                    disabled={reviewLoading}
                    variant="secondary"
                    className="h-10 text-xs font-bold rounded-lg px-4 border border-red-500/20 hover:border-red-500/35 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-all cursor-pointer"
                  >
                    Reject Registration
                  </Button>

                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => {
                        setShowReviewModal(false);
                        fetchUsers();
                      }}
                      disabled={reviewLoading}
                      variant="secondary"
                      className="h-10 text-xs font-semibold rounded-lg px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:hover:border-white/20 transition-all dark:text-white cursor-pointer"
                    >
                      Cancel
                    </Button>

                    <Button
                      onClick={() => handleReviewAction("APPROVED")}
                      disabled={reviewLoading}
                      variant="primary"
                      className="h-10 text-xs font-bold rounded-lg px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-white/5 transition-all text-white flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {reviewLoading ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <span>Verify & Approve</span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
