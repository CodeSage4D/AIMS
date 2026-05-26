"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getRoleMeta, parseInternNotes } from "@/lib/roles";
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
  UserCheck,
  Contact,
  Globe,
  Plus,
  Cpu,
  Check
} from "lucide-react";
import IdCardGenerator from "@/components/layout/IdCardGenerator";
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
    pictureUrl?: string | null;
    employeeId?: string | null;
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
  allowBankUpdates?: boolean;
}

export default function ProfileSettingsClient({
  user,
  internProfile,
  initialRequests,
  stats,
  allowBankUpdates = false,
}: ProfileSettingsClientProps) {
  const router = useRouter();
  const isIntern = user.role === "INTERN";
  const roleMeta = internProfile ? getRoleMeta(internProfile.roleDomain) : null;
  const isManager = user.role === "FOUNDER" || user.role === "HR";

  const isProfileOwner = internProfile ? internProfile.userId === user.id : true;
  const canViewBankDetails = user.role === "FOUNDER" || user.role === "HR" || isProfileOwner;

  // Parse notes JSON properties (from intern or founder profile)
  const customProfile = internProfile ? parseInternNotes(internProfile.notes) : {};

  // Initialize photoPreview from user.pictureUrl (Founders) or intern notes (Interns)
  const initialPicture = user.pictureUrl || (customProfile as any).pictureUrl || null;

  // Form states for direct permitted updates
  const [directLinkedIn, setDirectLinkedIn] = useState(customProfile.linkedIn || "");
  const [directGitHub, setDirectGitHub] = useState(customProfile.gitHub || "");
  const [directBloodGroup, setDirectBloodGroup] = useState(customProfile.bloodGroup || "");
  const [directPinCode, setDirectPinCode] = useState(internProfile?.pinCode || "");
  const [directPictureUrl, setDirectPictureUrl] = useState((customProfile as any).pictureUrl || user.pictureUrl || "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPicture);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoUploadError(null);
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024) {
      setPhotoUploadError("Image size must be strictly under 20KB. Please compress the file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const base64 = event.target.result as string;
        setDirectPictureUrl(base64);
        setPhotoPreview(base64);
        
        setLoading(true);
        try {
          const res = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pictureUrl: base64
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to update profile image.");
          setSuccess("Profile picture successfully updated!");
          router.refresh();
        } catch (err: any) {
          setError(err.message || "Failed to save profile picture.");
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const [directAccountHolder, setDirectAccountHolder] = useState(customProfile.accountHolderName || "");
  const [directBankName, setDirectBankName] = useState(internProfile?.bankName || "");
  const [directAccountNumber, setDirectAccountNumber] = useState(internProfile?.accountNumber || "");
  const [directIfscCode, setDirectIfscCode] = useState(internProfile?.ifscCode || "");
  const [directBranchName, setDirectBranchName] = useState(internProfile?.branchName || "");
  const [directUpiId, setDirectUpiId] = useState(internProfile?.upiId || "");
  const [directPaymentPref, setDirectPaymentPref] = useState(customProfile.paymentPreference || "BANK_TRANSFER");

  // System controls administrative states
  const [sysAllowBank, setSysAllowBank] = useState(allowBankUpdates);
  const [sysEnableAnnouncements, setSysEnableAnnouncements] = useState(true);
  const [roleCodes, setRoleCodes] = useState<Record<string, string>>({});
  const [customizerSearch, setCustomizerSearch] = useState("");

  const DEFAULT_ROLES_TO_CUSTOMIZE = [
    "Founder",
    "Co-Founder",
    "Director",
    "Managing Director",
    "Chief Executive Officer (CEO)",
    "Chief Operating Officer (COO)",
    "Chief Technology Officer (CTO)",
    "Chief Product Officer (CPO)",
    "Chief Strategy Officer (CSO)",
    "Chief Financial Officer (CFO)",
    "Chief Marketing Officer (CMO)",
    "Chief Human Resources Officer (CHRO)",
    "Head of Operations",
    "Head of Talent Acquisition",
    "Head of Engineering",
    "Head of Product Design",
    "Engineering Manager",
    "Product Manager",
    "Operations Manager",
    "HR Manager",
    "Technical Lead",
    "Team Lead",
    "Project Coordinator",
    "Department Manager",
    "Compliance Manager",
    "Software Engineer",
    "Full Stack Engineer",
    "Frontend Engineer",
    "Backend Engineer",
    "DevOps Engineer",
    "Cloud Engineer",
    "AI Engineer",
    "Cybersecurity Engineer",
    "UI/UX Designer",
    "Product Designer",
    "QA Engineer"
  ];

  // Load dynamic role codes overrides on mount
  React.useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const roleCodesSetting = data.find((s) => s.key === "role_codes");
          if (roleCodesSetting) {
            const parsedCodes = JSON.parse(roleCodesSetting.value);
            setRoleCodes(parsedCodes);
            import("@/lib/roles").then(({ registerRoleCodeOverrides }) => {
              registerRoleCodeOverrides(parsedCodes);
            });
          }
        }
      })
      .catch((err) => console.error("Error loading initial settings:", err));
  }, []);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "corrections" | "idcard" | "syscontrols">("overview");

  // Fetch settings when activeTab changes to syscontrols
  React.useEffect(() => {
    if (activeTab === "syscontrols" && (user.role === "FOUNDER" || user.role === "HR")) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const bankSetting = data.find((s) => s.key === "allow_intern_bank_updates");
            const welcomeSetting = data.find((s) => s.key === "enable_welcome_announcements");
            const roleCodesSetting = data.find((s) => s.key === "role_codes");
            if (bankSetting) {
              setSysAllowBank(JSON.parse(bankSetting.value));
            }
            if (welcomeSetting) {
              setSysEnableAnnouncements(JSON.parse(welcomeSetting.value));
            }
            if (roleCodesSetting) {
              const parsedCodes = JSON.parse(roleCodesSetting.value);
              setRoleCodes(parsedCodes);
              import("@/lib/roles").then(({ registerRoleCodeOverrides }) => {
                registerRoleCodeOverrides(parsedCodes);
              });
            }
          }
        })
        .catch((err) => console.error("Error loading settings:", err));
    }
  }, [activeTab, user.role]);

  const handleSaveRoleCodes = async (updatedCodes: Record<string, string>) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "role_codes", value: updatedCodes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to customize role codes.");
      
      setRoleCodes(updatedCodes);
      
      const { registerRoleCodeOverrides } = await import("@/lib/roles");
      registerRoleCodeOverrides(updatedCodes);

      setSuccess("Startup role code overrides successfully customized and synchronized!");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to customize role codes.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSetting = async (key: string, currentValue: boolean, setter: (val: boolean) => void) => {
    const newValue = !currentValue;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update setting.");
      setter(newValue);
      setSuccess(`System setting [${key}] successfully updated to ${newValue ? "ENABLED" : "DISABLED"}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update setting.");
    }
  };

  const handleDirectProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (directLinkedIn && (!directLinkedIn.startsWith("https://") || !directLinkedIn.includes("linkedin.com/"))) {
      setError("LinkedIn link must be a valid https://linkedin.com URL.");
      setLoading(false);
      return;
    }
    if (directGitHub && (!directGitHub.startsWith("https://") || !directGitHub.includes("github.com/"))) {
      setError("GitHub link must be a valid https://github.com URL.");
      setLoading(false);
      return;
    }

    if (directPinCode) {
      const clean = directPinCode.trim();
      const userCountry = internProfile?.country || "India";
      if (userCountry.toLowerCase() === "india") {
        if (!/^\d{6}$/.test(clean)) {
          setError("Indian PIN code must be exactly 6 digits.");
          setLoading(false);
          return;
        }
      } else {
        if (!/^[a-zA-Z0-9\s-]{3,10}$/.test(clean)) {
          setError("International postal code must be alphanumeric (3-10 characters).");
          setLoading(false);
          return;
        }
      }
    }

    if (directAccountNumber) {
      if (!/^\d{9,18}$/.test(directAccountNumber.trim())) {
        setError("Bank account numbers must contain only digits and be between 9 and 18 digits long.");
        setLoading(false);
        return;
      }
    }

    if (directIfscCode) {
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(directIfscCode.trim())) {
        setError("Indian IFSC codes must be exactly 11 characters (first 4 uppercase letters, 5th character '0', last 6 alphanumeric).");
        setLoading(false);
        return;
      }
    }

    if (directUpiId) {
      if (!/^[\w.-]+@[\w.-]+$/.test(directUpiId.trim())) {
        setError("UPI ID must be in a valid format (e.g. handle@bank).");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedIn: directLinkedIn.trim(),
          gitHub: directGitHub.trim(),
          bloodGroup: directBloodGroup.trim(),
          pinCode: directPinCode.trim(),
          accountHolderName: directAccountHolder.trim(),
          bankName: directBankName.trim(),
          accountNumber: directAccountNumber.trim(),
          ifscCode: directIfscCode.trim(),
          branchName: directBranchName.trim(),
          upiId: directUpiId.trim(),
          paymentPreference: directPaymentPref,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile details.");

      setSuccess("Profile and banking details successfully updated!");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update profile details.");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="space-y-6 sm:space-y-8 text-foreground animate-fadeIn max-w-5xl mx-auto">
      {/* 1. Cover Card Component */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-gradient-to-br from-card/85 via-card/75 to-card/60 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-20 -top-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-indigo-500/5 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
            {/* User Avatar Circle */}
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 p-0.5 shadow-2xl shrink-0 overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="Avatar" className="h-full w-full rounded-full object-cover bg-card" />
              ) : (
                <div className="h-full w-full rounded-full bg-card flex items-center justify-center text-4xl font-heading font-extrabold text-foreground">
                  {user.fullName[0].toUpperCase()}
                </div>
              )}
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
              
              {user.role === "FOUNDER" && (
                <div className="text-[10px] font-heading font-extrabold tracking-wider text-indigo-550 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-md inline-block uppercase select-none">
                  ✦ Aurxon Elite Founder
                </div>
              )}
              
              <p className="text-xs text-muted-foreground font-medium">
                Email: <span className="text-foreground font-bold">{user.email}</span>
                {user.username && (
                  <> • Username: <span className="text-foreground font-mono font-bold">{user.username}</span></>
                )}
              </p>

              {isIntern && internProfile && roleMeta ? (
                <div className="text-xs text-muted-foreground font-medium space-y-1.5">
                  <p>
                    Intern ID: <span className="font-mono text-primary font-bold">{internProfile.internId}</span> • Department: <span className="text-foreground font-bold">{internProfile.department}</span>
                  </p>
                  <div className="flex items-center space-x-2">
                    <span>Designation: <span className="text-foreground font-bold">{roleMeta.roleName} ({roleMeta.shortCode})</span></span>
                    <span className={`text-[8.5px] font-heading font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary border border-border/40 ${
                      roleMeta.appointmentSource === "Founder-appointed" ? "text-amber-500" : roleMeta.appointmentSource === "HR-appointed" ? "text-sky-500" : "text-emerald-500"
                    }`}>{roleMeta.appointmentSource}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-medium">
                  Administrative Access • Department: <span className="text-foreground font-bold">Founder & Leadership</span>
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
        {/* ID Card tab: show for interns AND for Founders (digital badge) */}
        {(internProfile || user.role === "FOUNDER" || user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "HR") && (
          <button
            onClick={() => setActiveTab("idcard")}
            className={cn(
              "px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border border-transparent",
              activeTab === "idcard"
                ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            )}
          >
            <Contact className="h-4 w-4 shrink-0" />
            <span>{internProfile ? "Digital ID Card" : "Digital Badge"}</span>
          </button>
        )}
        {isManager && (
          <button
            onClick={() => setActiveTab("syscontrols")}
            className={cn(
              "px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border border-transparent",
              activeTab === "syscontrols"
                ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            )}
          >
            <Globe className="h-4 w-4 shrink-0 text-indigo-400 animate-pulse" />
            <span>System Controls</span>
          </button>
        )}
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
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>LinkedIn Profile</span>
                      {customProfile.linkedIn ? (
                        <a href={customProfile.linkedIn} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline truncate max-w-[180px]">{customProfile.linkedIn.replace("https://", "")}</a>
                      ) : (
                        <span className="text-foreground/50 italic">Not Provided</span>
                      )}
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>GitHub Profile</span>
                      {customProfile.gitHub ? (
                        <a href={customProfile.gitHub} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline truncate max-w-[180px]">{customProfile.gitHub.replace("https://", "")}</a>
                      ) : (
                        <span className="text-foreground/50 italic">Not Provided</span>
                      )}
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span>Blood Group</span>
                      <span className="text-foreground font-bold uppercase">{customProfile.bloodGroup || "Not Provided"}</span>
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
          {internProfile && canViewBankDetails && (
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
                    <span>Account Holder Name</span>
                    <span className="text-foreground font-bold">{customProfile.accountHolderName || "Not Provided"}</span>
                  </div>
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
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span>Payment Preference</span>
                    <span className="text-foreground font-bold uppercase">{customProfile.paymentPreference ? customProfile.paymentPreference.replace("_", " ") : "Not Provided"}</span>
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
            {/* Profile Picture Upload Card - for ALL roles */}
            <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
              <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4">
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <User className="h-4.5 w-4.5 text-primary" />
                  <span>Profile Display Photo</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">Upload your workspace avatar photo (max 20KB).</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-secondary border border-border/80 flex items-center justify-center overflow-hidden shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-heading font-extrabold text-primary select-none">
                        {user.fullName[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold text-foreground">Upload Portrait Photo</p>
                    <p className="text-[9px] text-muted-foreground leading-normal">
                      Select a square portrait image. STRICT limit: <strong>20KB</strong>. Formats: JPG/PNG.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="relative border border-dashed border-border rounded-xl p-3 bg-secondary/15 hover:bg-secondary/25 transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-1">
                    <span className="text-[11px] font-bold text-primary">Click to select photo file</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  {photoUploadError && (
                    <p className="text-[10px] font-semibold text-destructive">{photoUploadError}</p>
                  )}
                </div>
              </CardContent>
            </Card>

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

            {/* Update Permitted Profile & Bank Details Card */}
            {internProfile && (
              <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground col-span-1 md:col-span-2">
                <CardHeader className="p-0 pb-4 border-b border-border/40 mb-4">
                  <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                    <Contact className="h-4.5 w-4.5 text-primary" />
                    <span>Personal Profile & Secure Banking Updates</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground">
                    Directly modify allowed metadata fields and registered disbursement banking profiles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <form onSubmit={handleDirectProfileUpdate} className="space-y-6">
                    <div className="space-y-4">
                      <span className="text-[11px] font-heading font-bold text-foreground uppercase tracking-widest block border-b border-border/20 pb-1">
                        1. Personal Details
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="LinkedIn Profile URL"
                          placeholder="https://linkedin.com/in/username"
                          value={directLinkedIn}
                          onChange={(e) => setDirectLinkedIn(e.target.value)}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                        <Input
                          label="GitHub Profile URL"
                          placeholder="https://github.com/username"
                          value={directGitHub}
                          onChange={(e) => setDirectGitHub(e.target.value)}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                        <Input
                          label="Blood Group"
                          placeholder="e.g. O+, A-, B+, AB+"
                          value={directBloodGroup}
                          onChange={(e) => setDirectBloodGroup(e.target.value)}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                        <Input
                          label="Mailing PIN Code"
                          placeholder="6-digit PIN code (e.g. 110001)"
                          value={directPinCode}
                          onChange={(e) => setDirectPinCode(e.target.value)}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-border/40 pt-4">
                      <div className="flex items-center justify-between border-b border-border/20 pb-1">
                        <span className="text-[11px] font-heading font-bold text-foreground uppercase tracking-widest block">
                          2. Disbursement Bank Details
                        </span>
                        {!allowBankUpdates && isIntern && (
                          <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Locked by Administration
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Account Holder Name"
                          placeholder="Enter name exactly as in bank record..."
                          value={directAccountHolder}
                          onChange={(e) => setDirectAccountHolder(e.target.value)}
                          disabled={!allowBankUpdates && isIntern}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                        <Input
                          label="Bank Name"
                          placeholder="e.g. State Bank of India..."
                          value={directBankName}
                          onChange={(e) => setDirectBankName(e.target.value)}
                          disabled={!allowBankUpdates && isIntern}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                        <Input
                          label="Bank Account Number"
                          placeholder="Enter account number..."
                          value={directAccountNumber}
                          onChange={(e) => setDirectAccountNumber(e.target.value)}
                          disabled={!allowBankUpdates && isIntern}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                        <Input
                          label="IFSC Code"
                          placeholder="11-character IFSC (e.g. SBIN0001234)..."
                          value={directIfscCode}
                          onChange={(e) => setDirectIfscCode(e.target.value)}
                          disabled={!allowBankUpdates && isIntern}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                        <Input
                          label="Branch Name"
                          placeholder="e.g. Connaught Place..."
                          value={directBranchName}
                          onChange={(e) => setDirectBranchName(e.target.value)}
                          disabled={!allowBankUpdates && isIntern}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                        <Input
                          label="UPI ID (Optional)"
                          placeholder="e.g. username@okaxis"
                          value={directUpiId}
                          onChange={(e) => setDirectUpiId(e.target.value)}
                          disabled={!allowBankUpdates && isIntern}
                          className="bg-background border-border text-foreground rounded-xl"
                        />
                        <div className="flex flex-col space-y-1.5 w-full">
                          <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                            Payment Method Preference
                          </label>
                          <select
                            value={directPaymentPref}
                            onChange={(e) => setDirectPaymentPref(e.target.value)}
                            disabled={!allowBankUpdates && isIntern}
                            className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer disabled:opacity-60"
                          >
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="UPI">UPI / Instant Pay</option>
                            <option value="CASH">Direct Cash</option>
                          </select>
                        </div>
                      </div>
                      {!allowBankUpdates && isIntern && (
                        <p className="text-[10px] text-muted-foreground leading-normal bg-secondary/15 p-2.5 rounded-lg border border-border/40 mt-2">
                          <span className="font-bold text-amber-500">Notice:</span> Disbursement banking updates are locked. If you need to make changes, please request correction or ask Founder/HR.
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="h-10 text-xs font-semibold bg-primary hover:bg-primary/95 text-white rounded-xl shadow w-full mt-2"
                      isLoading={loading}
                    >
                      Save Profile & Banking Changes
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
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

        {/* TAB 4: DIGITAL ID CARD */}
        {activeTab === "idcard" && internProfile && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
              <CardHeader className="p-0 pb-4 border-b border-border/40 mb-6">
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <Contact className="h-4.5 w-4.5 text-primary" />
                  <span>Official Corporate Digital ID Badge</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Your certified digital badge with real-time themes and photo attachment.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <IdCardGenerator
                  fullName={internProfile.fullName}
                  internId={internProfile.internId || "AXN-REF-PENDING"}
                  department={internProfile.department}
                  roleDomain={internProfile.roleDomain}
                  status={user.role === "INTERN" ? "INTERN" : "ACTIVE"}
                  dbInternId={internProfile.id}
                  employmentType={internProfile.employmentType}
                  defaultPhotoUrl={customProfile.pictureUrl}
                  linkedIn={customProfile.linkedIn}
                  gitHub={customProfile.gitHub}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB: SYSTEM CONTROLS (FOUNDER/HR ONLY) */}
        {activeTab === "syscontrols" && (user.role === "FOUNDER" || user.role === "HR") && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
              <CardHeader className="p-0 pb-4 border-b border-border/40 mb-6">
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <Globe className="h-4.5 w-4.5 text-primary animate-spin-slow" />
                  <span>Administrative System Toggles</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Configure global workspace settings, permissions overrides, and onboarding rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-6">
                
                {/* Toggle 1: allow_intern_bank_updates */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-2xl border border-border bg-secondary/15 hover:bg-secondary/20 transition-all gap-4">
                  <div className="space-y-1">
                    <span className="font-extrabold text-sm text-foreground block">Allow Intern Bank Updates</span>
                    <span className="text-[11px] text-muted-foreground block leading-relaxed max-w-xl">
                      When enabled, interns are allowed to directly self-modify their registered payment bank details and UPI IDs in their profile settings. When locked, details can only be changed via formal correction request approval.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSetting("allow_intern_bank_updates", sysAllowBank, setSysAllowBank)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      sysAllowBank ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        sysAllowBank ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Toggle 2: enable_welcome_announcements */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-2xl border border-border bg-secondary/15 hover:bg-secondary/20 transition-all gap-4">
                  <div className="space-y-1">
                    <span className="font-extrabold text-sm text-foreground block">Broadcast New Hire Announcements</span>
                    <span className="text-[11px] text-muted-foreground block leading-relaxed max-w-xl">
                      When enabled, the system automatically posts welcoming announcements to the Notice Board when a pending self-registration is approved.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSetting("enable_welcome_announcements", sysEnableAnnouncements, setSysEnableAnnouncements)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      sysEnableAnnouncements ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        sysEnableAnnouncements ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

              </CardContent>
            </Card>

            {user.role === "FOUNDER" && (
              <Card className="border-border/60 bg-card/65 backdrop-blur-md p-6 text-card-foreground">
                <CardHeader className="p-0 pb-4 border-b border-border/40 mb-6 flex flex-row items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                      <Cpu className="h-4.5 w-4.5 text-primary animate-pulse" />
                      <span>Startup Role Code Customizer</span>
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground">
                      Define, customize, and override visual short codes for corporate and engineering designations.
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={customizerSearch}
                      onChange={(e) => setCustomizerSearch(e.target.value)}
                      className="bg-[#0b0f19]/80 border border-border px-3 py-1.5 rounded-xl text-xs text-foreground placeholder:text-muted-foreground w-40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {DEFAULT_ROLES_TO_CUSTOMIZE
                      .filter((r) => r.toLowerCase().includes(customizerSearch.toLowerCase()))
                      .map((roleName) => {
                        const { ROLE_CODES } = require("@/lib/roles");
                        const currentCode = roleCodes[roleName] || ROLE_CODES[roleName] || "";
                        
                        const duplicateExists = Object.entries(roleCodes).some(
                          ([k, v]) => k !== roleName && String(v).toUpperCase() === currentCode.toUpperCase() && currentCode !== ""
                        ) || Object.entries(ROLE_CODES).some(
                          ([k, v]) => !roleCodes[k] && k !== roleName && String(v).toUpperCase() === currentCode.toUpperCase() && currentCode !== ""
                        );

                        return (
                          <div
                            key={roleName}
                            className={cn(
                              "p-3 rounded-xl border bg-secondary/10 flex flex-col justify-between gap-2.5 transition-all duration-300",
                              duplicateExists ? "border-amber-500/30 bg-amber-500/5" : "border-border/40 hover:border-primary/20"
                            )}
                          >
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-foreground block truncate" title={roleName}>
                                {roleName}
                              </span>
                              {duplicateExists && (
                                <span className="text-[9px] text-amber-500 font-bold block">
                                  Duplicate code warning!
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 justify-between">
                              <input
                                type="text"
                                maxLength={8}
                                placeholder={ROLE_CODES[roleName] || "CODE"}
                                value={roleCodes[roleName] || ""}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                                  setRoleCodes((prev) => ({ ...prev, [roleName]: val }));
                                }}
                                className="bg-[#0b0f19] border border-border/60 rounded-lg px-2.5 py-1 text-xs text-white font-mono w-24 text-center focus:outline-none focus:border-primary"
                              />
                              <span className="text-[10px] text-muted-foreground font-mono">
                                (Default: {ROLE_CODES[roleName]})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/40">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (confirm("Are you sure you want to reset all role code overrides to corporate defaults?")) {
                          handleSaveRoleCodes({});
                        }
                      }}
                      className="bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border border-border/60 text-xs font-semibold h-9.5 rounded-xl px-4"
                    >
                      Reset All to Default
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleSaveRoleCodes(roleCodes)}
                      className="bg-primary hover:bg-primary/95 text-white text-xs font-semibold h-9.5 rounded-xl px-5 shadow flex items-center space-x-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Save Customized Codes</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
