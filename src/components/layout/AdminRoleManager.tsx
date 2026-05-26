"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  Key,
  Settings2,
  Crown,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit,
  Save,
  History,
  Fingerprint,
  Globe,
  Layers,
  Plus,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────────

const SYSTEM_ROLES = [
  { id: "FOUNDER", label: "Founder", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", description: "Full system access. Owner of the organisation." },
  { id: "SUPER_ADMIN", label: "Super Admin", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", description: "Platform-level admin with near-founder privileges." },
  { id: "ADMIN", label: "Admin", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", description: "Can manage interns, documents and daily operations." },
  { id: "HR", label: "HR Manager", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", description: "Manages people ops, corrections, and documents." },
  { id: "TEAM_LEAD", label: "Team Lead", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", description: "Supervises a team of interns with limited admin access." },
  { id: "INTERN", label: "Intern", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", description: "Standard enrollee with read-only and self-management access." },
];

const PERMISSION_MODULES = [
  { key: "view_dashboard", label: "View Dashboard", icon: "🏠" },
  { key: "manage_interns", label: "Manage Interns", icon: "👥" },
  { key: "manage_attendance", label: "Manage Attendance", icon: "📅" },
  { key: "manage_tasks", label: "Manage Tasks", icon: "✅" },
  { key: "manage_documents", label: "Document Vault", icon: "📁" },
  { key: "manage_roles", label: "Roles & Permissions", icon: "🔑" },
  { key: "system_settings", label: "System Settings", icon: "⚙️" },
  { key: "view_logs", label: "View Activity Logs", icon: "📜" },
  { key: "founder_panel", label: "Founder Panel", icon: "👑" },
  { key: "manage_bank_details", label: "Manage Bank Details", icon: "🏦" },
  { key: "approve_registrations", label: "Approve Registrations", icon: "✔️" },
  { key: "administration", label: "Administration", icon: "🛡️" },
];

// Default role-to-module access matrix
const DEFAULT_ROLE_ACCESS: Record<string, string[]> = {
  FOUNDER: PERMISSION_MODULES.map((m) => m.key),
  SUPER_ADMIN: PERMISSION_MODULES.filter((m) => m.key !== "founder_panel").map((m) => m.key),
  ADMIN: ["view_dashboard", "manage_interns", "manage_attendance", "manage_tasks", "manage_documents", "view_logs", "approve_registrations"],
  HR: ["view_dashboard", "manage_interns", "manage_attendance", "manage_documents", "manage_bank_details", "approve_registrations", "view_logs"],
  TEAM_LEAD: ["view_dashboard", "manage_attendance", "manage_tasks", "view_logs"],
  INTERN: ["view_dashboard"],
};

interface AdminRoleManagerProps {
  users: any[];
  permissions: any[];
  changeLogs: any[];
  roleCodes: Record<string, string>;
  currentUserRole: string;
}

export default function AdminRoleManager({
  users,
  permissions,
  changeLogs,
  roleCodes: initialRoleCodes,
  currentUserRole,
}: AdminRoleManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"roles" | "users" | "matrix" | "logs" | "codes">("roles");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User management
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Permission matrix
  const [roleAccess, setRoleAccess] = useState<Record<string, string[]>>(DEFAULT_ROLE_ACCESS);
  const [matrixDirty, setMatrixDirty] = useState(false);

  // Role codes
  const [roleCodes, setRoleCodes] = useState<Record<string, string>>(initialRoleCodes);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editCodeValue, setEditCodeValue] = useState("");

  // ─── Filter users ──────────────────────────────────────────────────────────
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.internProfile?.internId || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // ─── Update user role/status ───────────────────────────────────────────────
  const handleRoleUpdate = async (userId: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: editRole, status: editStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role.");
      setSuccess(`Role and status updated successfully.`);
      setEditingUser(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // ─── Toggle permission matrix cell ────────────────────────────────────────
  const toggleModule = (role: string, moduleKey: string) => {
    if (currentUserRole !== "FOUNDER" && currentUserRole !== "SUPER_ADMIN") return;
    setRoleAccess((prev) => {
      const current = prev[role] || [];
      const updated = current.includes(moduleKey)
        ? current.filter((k) => k !== moduleKey)
        : [...current, moduleKey];
      return { ...prev, [role]: updated };
    });
    setMatrixDirty(true);
  };

  // ─── Save permission matrix ────────────────────────────────────────────────
  const handleSaveMatrix = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "role_permission_matrix", value: roleAccess }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save permission matrix.");
      setSuccess("Permission matrix saved and synchronized across all modules.");
      setMatrixDirty(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Save role code ────────────────────────────────────────────────────────
  const handleSaveCode = async (role: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const updated = { ...roleCodes, [role]: editCodeValue.toUpperCase().trim() };
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "role_codes", value: updated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role code.");
      setRoleCodes(updated);
      setSuccess(`Role code for "${role}" updated to "${editCodeValue.toUpperCase()}".`);
      setEditingCode(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleMeta = (role: string) => SYSTEM_ROLES.find((r) => r.id === role);

  const tabs = [
    { id: "roles", label: "Role Registry", icon: Crown },
    { id: "users", label: "User Management", icon: Users },
    { id: "matrix", label: "Permission Matrix", icon: Layers },
    { id: "codes", label: "Role Code Config", icon: Cpu },
    { id: "logs", label: "Change Audit Log", icon: History },
  ] as const;

  return (
    <div className="space-y-6 text-foreground animate-fadeIn max-w-7xl mx-auto">
      {/* ─── Header Banner ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-violet-950/60 via-card/80 to-indigo-950/50 p-6 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-violet-500/15 border border-violet-500/25 shadow-lg">
              <ShieldCheck className="h-7 w-7 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Administration & Role Management
                <span className="text-[10px] font-heading font-extrabold tracking-widest uppercase bg-violet-500/15 text-violet-400 border border-violet-500/25 px-2 py-0.5 rounded-md">
                  {currentUserRole}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Centralized system for role assignment, access permissions and module control.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-4 w-4 text-violet-400 animate-pulse" />
            <span className="font-semibold">{users.length} registered accounts</span>
          </div>
        </div>
      </div>

      {/* ─── Status Alerts ──────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs font-semibold animate-pulse">
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

      {/* ─── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-border/60 pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border",
              activeTab === id
                ? "bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border-transparent"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: ROLE REGISTRY */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground font-medium">
            System role definitions. These are the built-in roles for AIMS. Roles can be assigned per user in the User Management tab.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYSTEM_ROLES.map((role) => {
              const count = users.filter((u) => u.role === role.id).length;
              return (
                <div
                  key={role.id}
                  className={cn(
                    "p-5 rounded-2xl border bg-card/70 backdrop-blur-sm space-y-3 hover:shadow-lg transition-all",
                    role.bg
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Crown className={cn("h-5 w-5", role.color)} />
                      <span className={cn("text-sm font-heading font-extrabold", role.color)}>{role.label}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-secondary/40 px-2 py-0.5 rounded border border-border/40 text-muted-foreground">
                      {role.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{role.description}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/20">
                    <span className="text-[10px] text-muted-foreground font-medium">Assigned Users</span>
                    <span className={cn("text-base font-heading font-extrabold", role.color)}>{count}</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground/70 font-mono">
                    Modules: {(DEFAULT_ROLE_ACCESS[role.id] || []).length}/{PERMISSION_MODULES.length} accessible
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground">
            <p className="font-bold text-amber-500 mb-1">📌 Adding New Roles</p>
            <p>
              To add a new custom role, update the <code className="font-mono bg-secondary/40 px-1 rounded">Role</code> enum in{" "}
              <code className="font-mono bg-secondary/40 px-1 rounded">prisma/schema.prisma</code> and run{" "}
              <code className="font-mono bg-secondary/40 px-1 rounded">npx prisma migrate dev</code>. Then add the role to{" "}
              <code className="font-mono bg-secondary/40 px-1 rounded">SYSTEM_ROLES</code> in AdminRoleManager.tsx and update{" "}
              <code className="font-mono bg-secondary/40 px-1 rounded">DEFAULT_ROLE_ACCESS</code> with its permission set.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: USER MANAGEMENT */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, username or intern ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              {SYSTEM_ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
              {filteredUsers.length} of {users.length} users
            </span>
          </div>

          {/* User Table */}
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/40">
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">Employee ID</th>
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">Current Role</th>
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">Account Status</th>
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">Department</th>
                    {(currentUserRole === "FOUNDER" || currentUserRole === "SUPER_ADMIN") && (
                      <th className="text-right px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredUsers.map((u) => {
                    const roleMeta = getRoleMeta(u.role);
                    const isEditing = editingUser === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-xs font-extrabold text-white shrink-0">
                              {u.fullName[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{u.fullName}</p>
                              <p className="text-muted-foreground font-mono text-[10px]">{u.email}</p>
                              {u.username && (
                                <p className="text-primary font-mono text-[10px]">@{u.username}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-cyan-400 font-bold">
                          {u.internProfile?.internId || <span className="text-muted-foreground italic text-[10px]">N/A</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="h-8 px-2 rounded-lg border border-violet-500/40 bg-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              {SYSTEM_ROLES.map((r) => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={cn("text-[10px] font-heading font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border", roleMeta?.bg, roleMeta?.color)}>
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="h-8 px-2 rounded-lg border border-border bg-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              <option value="APPROVED">APPROVED (Active)</option>
                              <option value="PENDING">PENDING (Review)</option>
                              <option value="REJECTED">REJECTED (Disabled)</option>
                            </select>
                          ) : (
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                              u.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : u.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                              {u.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.internProfile?.department || <span className="italic text-[10px]">Leadership</span>}
                        </td>
                        {(currentUserRole === "FOUNDER" || currentUserRole === "SUPER_ADMIN") && (
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleRoleUpdate(u.id)}
                                  disabled={loading}
                                  className="h-7 px-3 rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[10px] font-bold hover:bg-violet-500/30 transition-all flex items-center gap-1"
                                >
                                  <Save className="h-3 w-3" /> Save
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="h-7 px-3 rounded-lg bg-secondary/40 text-muted-foreground border border-border/40 text-[10px] font-bold hover:bg-secondary transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingUser(u.id);
                                  setEditRole(u.role);
                                  setEditStatus(u.status);
                                  setError(null);
                                  setSuccess(null);
                                }}
                                className="h-7 px-3 rounded-lg bg-secondary/40 text-muted-foreground border border-border/40 text-[10px] font-bold hover:bg-secondary hover:text-foreground transition-all flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" /> Edit Role
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No users match the current filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: PERMISSION MATRIX */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-heading font-extrabold text-foreground">Access Permission Matrix</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Toggle which roles can access which modules. Changes take effect system-wide.
              </p>
            </div>
            {matrixDirty && (
              <button
                onClick={handleSaveMatrix}
                disabled={loading}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-violet-500 text-white text-xs font-bold hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/25"
              >
                <Save className="h-3.5 w-3.5" />
                Save Matrix
              </button>
            )}
          </div>

          {/* Matrix Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">✓</span>
              Access granted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded bg-secondary/40 border border-border/40 flex items-center justify-center text-muted-foreground/40">✕</span>
              No access
            </span>
            {currentUserRole !== "FOUNDER" && currentUserRole !== "SUPER_ADMIN" && (
              <span className="text-amber-500 font-bold">🔒 View only — Founder/Super Admin required to edit</span>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/40">
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider w-48">Module</th>
                    {SYSTEM_ROLES.map((role) => (
                      <th key={role.id} className="text-center px-3 py-3 font-heading font-bold uppercase tracking-wider min-w-[80px]">
                        <span className={cn("text-[10px]", role.color)}>{role.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {PERMISSION_MODULES.map((module) => (
                    <tr key={module.key} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <span className="mr-2">{module.icon}</span>
                        {module.label}
                      </td>
                      {SYSTEM_ROLES.map((role) => {
                        const hasAccess = (roleAccess[role.id] || []).includes(module.key);
                        const canEdit = currentUserRole === "FOUNDER" || currentUserRole === "SUPER_ADMIN";
                        return (
                          <td key={role.id} className="text-center px-3 py-3">
                            <button
                              onClick={() => canEdit && toggleModule(role.id, module.key)}
                              className={cn(
                                "h-7 w-7 rounded-lg border mx-auto flex items-center justify-center transition-all",
                                hasAccess
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
                                  : "bg-secondary/40 border-border/40 text-muted-foreground/30 hover:bg-secondary/60",
                                !canEdit && "cursor-not-allowed opacity-60"
                              )}
                              title={`${hasAccess ? "Revoke" : "Grant"} ${role.label} access to ${module.label}`}
                            >
                              {hasAccess ? "✓" : "✕"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {matrixDirty && (
            <div className="flex justify-end">
              <button
                onClick={handleSaveMatrix}
                disabled={loading}
                className="flex items-center gap-1.5 h-10 px-6 rounded-xl bg-violet-500 text-white text-xs font-bold hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/25"
              >
                <Save className="h-4 w-4" />
                Save Permission Matrix
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: ROLE CODE CONFIGURATION */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "codes" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-heading font-extrabold text-foreground">Role Code Configuration</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Customize the 2–5 character codes used in intern ID generation (e.g. AXN-<strong>SWE</strong>-FE-2605-KV01).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(roleCodes).length > 0
              ? Object.entries(roleCodes).map(([role, code]) => (
                  <div key={role} className="p-4 rounded-xl border border-border/60 bg-card/70 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-foreground">{role}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">Current code: <span className="text-cyan-400 font-extrabold">{code}</span></p>
                    </div>
                    {editingCode === role ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editCodeValue}
                          onChange={(e) => setEditCodeValue(e.target.value.toUpperCase())}
                          maxLength={5}
                          className="w-20 h-8 px-2 rounded-lg border border-violet-500/40 bg-input text-xs font-mono font-bold text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <button
                          onClick={() => handleSaveCode(role)}
                          disabled={loading}
                          className="h-8 px-3 rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[10px] font-bold hover:bg-violet-500/30 transition-all"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCode(null)}
                          className="h-8 px-2 rounded-lg bg-secondary/40 text-muted-foreground border border-border/40 text-[10px] font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingCode(role);
                          setEditCodeValue(code);
                          setError(null);
                          setSuccess(null);
                        }}
                        className="h-8 px-3 rounded-lg bg-secondary/40 text-muted-foreground border border-border/40 text-[10px] font-bold hover:bg-secondary hover:text-foreground transition-all flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </button>
                    )}
                  </div>
                ))
              : (
                <div className="col-span-2 py-8 text-center text-xs text-muted-foreground">
                  <Cpu className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  <p>No role codes configured yet.</p>
                  <p className="text-[10px] mt-1">Role codes are configured from System Controls in your Profile settings.</p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: CHANGE AUDIT LOG */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-heading font-extrabold text-foreground">Permission Change Audit Log</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Full immutable record of all role and permission changes made across the system.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/40">
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">Changed By</th>
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">Previous Role</th>
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">New Role</th>
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">Details</th>
                    <th className="text-left px-4 py-3 font-heading font-bold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {changeLogs.length > 0
                    ? changeLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-secondary/10 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-foreground">{log.changedBy?.fullName || "System"}</p>
                            <p className="text-muted-foreground text-[10px]">{log.changedBy?.role}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-amber-400">{log.previousRole || "—"}</td>
                          <td className="px-4 py-3 font-mono text-emerald-400">{log.newRole || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{log.details || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-[10px]">
                            {new Date(log.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                          </td>
                        </tr>
                      ))
                    : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          <History className="h-8 w-8 mx-auto opacity-50 mb-2" />
                          No permission changes recorded yet.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
