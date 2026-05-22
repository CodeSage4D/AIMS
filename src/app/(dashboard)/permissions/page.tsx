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
  AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
  fullName: string;
  role: string;
  createdAt: string;
  permission: UserPermission | null;
  internProfile: {
    id: string;
    internId: string;
    status: string;
    roleDomain: string;
    department: string;
  } | null;
}

export default function PermissionsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Core state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Create / Onboard User Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardFullName, setOnboardFullName] = useState("");
  const [onboardPassword, setOnboardPassword] = useState("");
  const [onboardRole, setOnboardRole] = useState("ADMIN");
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardError, setOnboardError] = useState("");
  
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
  const isAuthorized = currentUser?.role === "FOUNDER" || currentUser?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!session || !isAuthorized) {
      router.push("/");
      return;
    }

    fetchUsers();
  }, [session, sessionStatus, isAuthorized]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/permissions");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsers(data.users);
        }
      } else {
        setErrorMessage("Failed to load users list from AIMS central handlers.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("An unexpected network error occurred while querying permissions.");
    } finally {
      setLoading(false);
    }
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
    if (user.role === "SUPER_ADMIN" && currentUser.role !== "FOUNDER") return; // Super admin lock

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
        // Optimistic UI state sync
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === user.id ? { ...u, permission: { ...currentPerm, [key]: nextPerms[key] } } : u
          )
        );
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
    if (newRole === "SUPER_ADMIN" && currentUser.role !== "FOUNDER") {
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
    if (user.id === currentUser.id) {
      setErrorMessage("Forbidden. You cannot wipe your own active administrative workspace account.");
      return;
    }
    if (user.role === "SUPER_ADMIN" && currentUser.role !== "FOUNDER") {
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

  // Filter users by search box query
  const filteredUsers = users.filter(
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

  return (
    <div className="space-y-6 sm:space-y-8 select-none text-white max-w-6xl mx-auto pb-12">
      
      {/* Dynamic Feedback Toasts */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-xl text-emerald-400 font-semibold text-xs flex items-center space-x-3.5 animate-fadeIn shadow-lg">
          <Check className="h-4.5 w-4.5 text-emerald-400" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="hover:text-white ml-2">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl border border-red-500/20 bg-red-500/10 backdrop-blur-xl text-red-400 font-semibold text-xs flex items-center space-x-3.5 animate-fadeIn shadow-lg">
          <AlertCircle className="h-4.5 w-4.5 text-red-400" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="hover:text-white ml-2">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0c1220] via-[#0d1629] to-[#050b18] p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-20 -top-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-indigo-600/15 blur-[60px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-violet-500/10 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <Key className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-indigo-300">
                Security Administration
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight leading-tight">
              Roles & Permissions Control Hub
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed max-w-3xl">
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
              className="h-11 text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl px-5 border border-white/5 shadow-md transition-all duration-300"
            >
              <UserPlus className="h-4 w-4" />
              <span>Onboard Administrator</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Management Workspace Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Directory Listing Panel (2/3 width) */}
        <Card className="lg:col-span-2 border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md flex flex-col justify-between">
          <CardHeader className="border-b border-white/[0.06] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>User Security Directory</CardTitle>
              <CardDescription>Comprehensive directory of all system participants, admins, and active interns.</CardDescription>
            </div>
            
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#0b0f19] border border-white/[0.08] focus:border-indigo-500/40 rounded-lg text-xs font-medium focus:outline-none transition-all placeholder:text-gray-500"
              />
            </div>
          </CardHeader>
          
          <CardContent className="p-0 overflow-y-auto max-h-[60vh] divide-y divide-white/[0.04]">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 font-medium">
                No matching accounts or system profiles found.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isFounder = user.role === "FOUNDER";
                const isSuperAdmin = user.role === "SUPER_ADMIN";
                const isSelf = user.id === currentUser.id;
                
                return (
                  <div
                    key={user.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-white/[0.01] transition-all cursor-pointer ${selectedUser?.id === user.id ? "bg-white/[0.02]" : ""}`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-heading font-extrabold select-none shrink-0 border ${isFounder ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 text-sm" : isSuperAdmin ? "bg-purple-500/10 border-purple-500/20 text-purple-400 text-xs" : user.role === "HR" ? "bg-pink-500/10 border-pink-500/20 text-pink-400 text-xs" : "bg-primary/10 border-primary/20 text-primary text-xs"}`}>
                        {user.fullName[0].toUpperCase()}
                      </div>
                      
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white truncate">{user.fullName}</span>
                          {isSelf && (
                            <span className="text-[8px] font-mono bg-indigo-500/20 text-indigo-400 px-1 py-0.5 rounded font-extrabold uppercase">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 truncate block">{user.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-4 shrink-0">
                      <div className="text-right sm:text-right flex flex-col items-end">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-heading font-extrabold uppercase border tracking-wider select-none ${isFounder ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : isSuperAdmin ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : user.role === "HR" ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : user.role === "ADMIN" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                          {user.role}
                        </span>
                        
                        {user.internProfile?.status && (
                          <span className="text-[8px] text-gray-400 font-medium mt-1 uppercase">
                            Intern Status: {user.internProfile.status}
                          </span>
                        )}
                      </div>
                      
                      {/* Purple Shield Indicator */}
                      <div className="flex items-center space-x-1.5">
                        {!isFounder && (currentUser.role === "FOUNDER" || (currentUser.role === "SUPER_ADMIN" && !isSuperAdmin)) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user);
                            }}
                            disabled={actionLoading === `${user.id}-delete`}
                            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            title="Delete administrative account permanently"
                          >
                            {actionLoading === `${user.id}-delete` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Dynamic Edit Override Drawer Card (1/3 width) */}
        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-5 sm:p-6 flex flex-col space-y-5">
          {selectedUser ? (
            <>
              {/* Profile card summary */}
              <div className="border-b border-white/[0.06] pb-4 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-heading font-extrabold text-white">
                      Permission Inspector
                    </h3>
                    <p className="text-[10px] text-gray-400">Configure fine-grained access override channels</p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                  <div className="h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
                    {selectedUser.fullName[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{selectedUser.fullName}</span>
                    <span className="text-[9px] text-gray-400 block truncate">{selectedUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Role promotion console */}
              {selectedUser.role !== "FOUNDER" && (currentUser.role === "FOUNDER" || (currentUser.role === "SUPER_ADMIN" && selectedUser.role !== "SUPER_ADMIN")) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-heading font-extrabold text-gray-400 uppercase tracking-wider block">
                    Administrative Designation Role
                  </label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => handleUpdateRole(selectedUser, e.target.value)}
                    disabled={actionLoading === `${selectedUser.id}-role`}
                    className="w-full h-10 px-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/40 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="INTERN">Intern / Employee</option>
                    <option value="TEAM_LEAD">Team Lead / supervisor</option>
                    <option value="ADMIN">Admin Manager</option>
                    <option value="HR">HR Administrator</option>
                    {currentUser.role === "FOUNDER" && <option value="SUPER_ADMIN">Super Admin Director</option>}
                  </select>
                </div>
              )}

              {/* Interactive Switches list */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-heading font-extrabold text-gray-400 uppercase tracking-wider">
                    Fine-Grained Permissions
                  </span>
                  
                  {selectedUser.role === "FOUNDER" && (
                    <span className="text-[9px] font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded flex items-center space-x-1">
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
                    const isSuperAdminEditLocked = selectedUser.role === "SUPER_ADMIN" && currentUser.role !== "FOUNDER";
                    
                    const isTogglingDisabled = isFounder || isSuperAdminEditLocked || actionLoading === `${selectedUser.id}-${key}`;
                    
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isGranted ? "bg-white/[0.02] border-white/[0.04]" : "bg-transparent border-transparent opacity-65"}`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {getPermissionIcon(key)}
                          <span className="text-xs font-semibold text-gray-300 truncate">
                            {getPermissionLabel(key)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleTogglePermission(selectedUser, typedKey)}
                          disabled={isTogglingDisabled}
                          className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 outline-none flex ${isGranted ? "bg-indigo-600 justify-end" : "bg-white/10 justify-start"} ${isTogglingDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 text-gray-500 select-none">
              <Shield className="h-12 w-12 text-white/10" />
              <div>
                <h4 className="text-xs font-bold text-gray-400">No Account Selected</h4>
                <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-relaxed">
                  Select any administrative user or active intern from the directory to review their permission settings and custom overrides.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Onboard / Create Modal Dialog Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050b18]/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0c1220] p-6 shadow-2xl space-y-6 animate-scaleIn select-none">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h3 className="text-md font-heading font-extrabold text-white">
                  Create Administrative Manager Account
                </h3>
                <p className="text-[10px] text-gray-400">Onboard project leaders, HR personnel, and Super Admin assistants.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {onboardError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            <form onSubmit={handleOnboardUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-heading font-extrabold text-gray-400 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={onboardFullName}
                    onChange={(e) => setOnboardFullName(e.target.value)}
                    className="w-full h-10 px-3.5 bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500/40 focus:outline-none rounded-lg text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-heading font-extrabold text-gray-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. manager@aurxon.com"
                    value={onboardEmail}
                    onChange={(e) => setOnboardEmail(e.target.value)}
                    className="w-full h-10 px-3.5 bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500/40 focus:outline-none rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-heading font-extrabold text-gray-400 uppercase tracking-wider block">
                    Temp Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={onboardPassword}
                    onChange={(e) => setOnboardPassword(e.target.value)}
                    className="w-full h-10 px-3.5 bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500/40 focus:outline-none rounded-lg text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-heading font-extrabold text-gray-400 uppercase tracking-wider block">
                    Designation Role
                  </label>
                  <select
                    value={onboardRole}
                    onChange={(e) => handleRolePreset(e.target.value)}
                    className="w-full h-10 px-3 bg-white/[0.02] border border-white/[0.08] focus:outline-none focus:border-indigo-500/40 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <option value="ADMIN">Admin Manager</option>
                    <option value="HR">HR Administrator</option>
                    <option value="TEAM_LEAD">Team Lead / Supervisor</option>
                    {currentUser.role === "FOUNDER" && <option value="SUPER_ADMIN">Super Admin Director</option>}
                  </select>
                </div>
              </div>

              {/* Toggles inside form */}
              <div className="space-y-2 border-t border-white/[0.06] pt-4">
                <span className="text-[10px] font-heading font-extrabold text-gray-400 uppercase tracking-wider block mb-2">
                  Permissions Preset overrides
                </span>

                <div className="grid grid-cols-2 gap-3.5">
                  {Object.keys(customPerms).map((key) => {
                    const typedKey = key as keyof typeof customPerms;
                    const isVal = customPerms[typedKey];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/[0.04]"
                      >
                        <span className="text-[10px] font-semibold text-gray-400 truncate">
                          {getPermissionLabel(key)}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setCustomPerms(prev => ({ ...prev, [typedKey]: !isVal }))}
                          className={`w-8 h-4 rounded-full p-0.5 transition-all duration-300 outline-none flex ${isVal ? "bg-indigo-600 justify-end" : "bg-white/10 justify-start"}`}
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.06]">
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  variant="secondary"
                  className="h-10 text-xs font-semibold rounded-lg px-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white"
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

    </div>
  );
}
