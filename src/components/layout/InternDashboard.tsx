"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getRoleMeta } from "@/lib/roles";
import {
  CalendarDays,
  CheckSquare,
  FileCheck,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  PlusCircle,
  Activity,
  User,
  ShieldCheck,
  Send,
  XCircle,
  FileText,
  TrendingUp,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ArrowRight,
  Eye
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import NoticeBoard from "@/components/layout/NoticeBoard";
import TodoWidget from "@/components/layout/TodoWidget";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE" | "EMERGENCY_LEAVE" | "HALF_DAY_1ST_HALF" | "HALF_DAY_2ND_HALF" | "WORK_PAUSED" | "WORK_RESUMED";
  checkIn?: string | null;
  checkOut?: string | null;
  remarks?: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: "PENDING" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED";
  remarks?: string | null;
  assigner?: { fullName: string } | null;
}

interface DocumentItem {
  id: string;
  type: string; // DocType enum (extended) — use string to allow new employment doc types
  fileName: string;
  fileUrl: string;
  verified: boolean;
  createdAt: string;
}

interface InternProfile {
  id: string;
  internId: string;
  fullName: string;
  department: string;
  roleDomain: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  supervisor?: { fullName: string; email: string } | null;
}

interface InternDashboardProps {
  internProfile: InternProfile;
  initialAttendance: AttendanceRecord[];
  initialTasks: TaskItem[];
  initialDocuments: DocumentItem[];
  announcements: any[];
  anniversaries: any[];
}

const REQUIRED_DOCS = [
  { type: "OFFER_LETTER", label: "Offer Letter" },
  { type: "RESUME", label: "Resume" },
  { type: "ID_PROOF", label: "ID Proof / SSN" },
  { type: "AGREEMENT", label: "Signed Agreement" },
  { type: "CERTIFICATE", label: "Program Certificate" },
  { type: "NDA", label: "NDA (Non-Disclosure Agreement)" },
  { type: "EXPERIENCE_LETTER", label: "Experience Letter" },
  { type: "APPOINTMENT_LETTER", label: "Appointment Letter" },
  { type: "JOINING_DOCUMENTS", label: "Joining Documents" },
  { type: "OTHER_FILES", label: "Other Files / Addenda" }
];

export default function InternDashboard({
  internProfile,
  initialAttendance,
  initialTasks,
  initialDocuments,
  announcements,
  anniversaries
}: InternDashboardProps) {
  const router = useRouter();
  const [resumeLoading, setResumeLoading] = useState(false);
  const onboardingSkipped = (() => {
    try {
      if (!internProfile.notes) return false;
      const notesObj = JSON.parse(internProfile.notes);
      return !!notesObj.onboardingSkipped;
    } catch {
      return false;
    }
  })();

  // Core Data States
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialAttendance);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [leaves, setLeaves] = useState<any[]>([]);

  // Portfolio & Tabs States
  const [activeTab, setActiveTab] = useState<"dashboard" | "portfolio">("dashboard");
  const [projects, setProjects] = useState<any[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectRole, setProjectRole] = useState("");
  const [projectTech, setProjectTech] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [projectStatus, setProjectStatus] = useState("IN_PROGRESS");
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Interactive UI States
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  
  // Notification states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Leave Form States
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveType, setLeaveType] = useState("FULL_DAY");
  const [leaveReason, setLeaveReason] = useState("");

  // Document Upload States
  const [uploadType, setUploadType] = useState("OFFER_LETTER");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Calendar Date Traversal
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Self-Service Attendance States
  const [actionLoading, setActionLoading] = useState(false);

  // Dynamic Indian Standard Time (IST = UTC + 5.5 Hours) check-in helper
  const getTodayRecord = () => {
    const today = new Date();
    const offsetIST = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(today.getTime() + offsetIST);
    
    // YYYY-MM-DD IST signature
    const dateStringIST = `${todayIST.getUTCFullYear()}-${(todayIST.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}-${todayIST.getUTCDate().toString().padStart(2, "0")}`;

    return attendance.find((att) => {
      const attDate = new Date(att.date);
      // Prisma DateTime objects are returned in UTC. Align their date signature.
      const attYear = attDate.getUTCFullYear();
      const attMonth = attDate.getUTCMonth() + 1;
      const attDay = attDate.getUTCDate();
      const attString = `${attYear}-${attMonth.toString().padStart(2, "0")}-${attDay
        .toString()
        .padStart(2, "0")}`;
      return attString === dateStringIST;
    });
  };

  const todayRecord = getTodayRecord();

  // Refreshes client-side logs without complete page reloads
  const refreshAttendanceLogs = async () => {
    try {
      const res = await fetch("/api/attendance/history");
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.history);
      }
    } catch (err) {
      console.error("Failed to refresh client attendance logs:", err);
    }
  };

  const handleSelfCheckIn = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log check-in.");
      }
      setSuccess(data.message || "Checked in successfully!");
      await refreshAttendanceLogs();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during check-in.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelfCheckOut = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log check-out.");
      }
      setSuccess(data.message || "Checked out successfully!");
      await refreshAttendanceLogs();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during check-out.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseWork = async (reason: string = "Break") => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/attendance/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to pause work session.");
      }
      setSuccess(data.message || "Work session paused successfully!");
      await refreshAttendanceLogs();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during work pause.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeWork = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/attendance/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resume work session.");
      }
      setSuccess(data.message || "Work session resumed successfully!");
      await refreshAttendanceLogs();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during work resume.");
    } finally {
      setActionLoading(false);
    }
  };

  // Keyboard and mouse tracking activity telemetry (restricted strictly to keydown and mousemove only)
  const lastTelemetrySent = React.useRef<number>(0);

  useEffect(() => {
    if (!todayRecord || todayRecord.checkOut || todayRecord.status === "WORK_PAUSED") {
      return;
    }

    const sendTelemetry = async () => {
      const now = Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;
      if (now - lastTelemetrySent.current < fiveMinutesMs) {
        return;
      }
      
      lastTelemetrySent.current = now;
      try {
        await fetch("/api/attendance/telemetry", { method: "POST" });
      } catch (err) {
        console.error("Low-overhead telemetry heartbeat dispatch failed:", err);
      }
    };

    const handleUserActivity = () => {
      sendTelemetry();
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [todayRecord]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to load portfolio projects:", err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPortfolioLoading(true);

    if (!projectTitle || !projectDesc || !projectRole) {
      setError("Please fill out the project title, description, and role.");
      setPortfolioLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDesc,
          roleInProject: projectRole,
          technologies: projectTech,
          deliverableUrl: projectUrl,
          status: projectStatus,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project record.");
      }

      setSuccess("Portfolio project logged successfully!");
      setProjectTitle("");
      setProjectDesc("");
      setProjectRole("");
      setProjectTech("");
      setProjectUrl("");
      setProjectStatus("IN_PROGRESS");
      await fetchProjects();
    } catch (err: any) {
      setError(err.message || "Failed to log portfolio project.");
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this portfolio project log?")) {
      return;
    }
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/portfolio?id=${projectId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete project record.");
      }

      setSuccess("Portfolio project deleted successfully.");
      await fetchProjects();
    } catch (err: any) {
      setError(err.message || "Failed to delete portfolio project.");
    }
  };

  // Fetch Leaves and refresh data on mount
  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leave");
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (err) {
      console.error("Failed to load leaves:", err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchProjects();
  }, []);

  // Calendar Helpers
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getAttendanceForDay = (day: number) => {
    return attendance.find((att) => {
      const attDate = new Date(att.date);
      // Prisma seed date uses UTC. Compare safely.
      const attYear = attDate.getUTCFullYear();
      const attMonth = attDate.getUTCMonth();
      const attDay = attDate.getUTCDate();
      return attYear === year && attMonth === month && attDay === day;
    });
  };

  // Submit Leave Action
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!leaveStart || !leaveEnd || !leaveReason) {
      setError("Please fill out all leave dates and provide a detailed reason.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: leaveStart,
          endDate: leaveEnd,
          type: leaveType,
          reason: leaveReason
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit leave application.");
      }

      setSuccess("Leave request submitted successfully. Founder approval pending!");
      setIsLeaveOpen(false);
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      
      // Refresh state
      await fetchLeaves();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Task Status Update Action
  const handleUpdateTaskStatus = async (taskId: string, currentStatus: string) => {
    setError(null);
    setSuccess(null);

    // Progression: PENDING -> IN_PROGRESS -> IN_REVIEW
    if (currentStatus === "IN_REVIEW" || currentStatus === "COMPLETED") {
      setError("This task is locked and cannot be updated.");
      return;
    }

    let nextStatus = "IN_PROGRESS";
    if (currentStatus === "IN_PROGRESS") nextStatus = "IN_REVIEW";

    let submissionComment = "";
    if (nextStatus === "IN_REVIEW") {
      const userInput = prompt("Please enter a submission comment detailing your work (required):");
      if (userInput === null) {
        // User cancelled the prompt
        return;
      }
      if (!userInput.trim()) {
        setError("A submission comment is required to submit this task for review.");
        return;
      }
      submissionComment = userInput.trim();
    }

    setUpdatingTaskId(taskId);

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: nextStatus, submissionComment })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update task status.");
      }

      setSuccess(`Task progress updated to ${nextStatus.replace("_", " ")}!`);
      
      // Update local state
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: nextStatus as any } : t));
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to progress task state.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Upload Document Action
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!attachedFile) {
      setError("Please attach a document file to upload.");
      setLoading(false);
      return;
    }

    if (attachedFile.size > 100 * 1024) {
      setError("Rejected: Selected file exceeds the strict maximum limit of 100 KB. Please compress the file.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", attachedFile);
      formData.append("internId", internProfile.id);
      formData.append("type", uploadType);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document.");
      }

      setSuccess(`${uploadType.replace("_", " ")} uploaded successfully!`);
      setIsUploadOpen(false);
      setAttachedFile(null);

      // Refresh documents
      router.refresh();
      // Re-map documents from updated initialDocuments if component re-renders
    } catch (err: any) {
      setError(err.message || "Failed to upload file.");
    } finally {
      setLoading(false);
    }
  };

  // Sync state if props update
  useEffect(() => {
    setAttendance(initialAttendance);
    setTasks(initialTasks);
    setDocuments(initialDocuments);
  }, [initialAttendance, initialTasks, initialDocuments]);

  // Attendance Status Color Maps
  const getStatusClasses = (status?: string) => {
    if (!status) return "bg-secondary/40 dark:bg-white/[0.02] border border-border dark:border-white/[0.05] hover:bg-secondary dark:hover:bg-white/[0.05] text-muted-foreground dark:text-gray-500";
    switch (status) {
      case "PRESENT":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.05)]";
      case "ABSENT":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/25 shadow-[0_0_10px_rgba(239,68,68,0.05)]";
      case "LATE":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.05)]";
      case "LEAVE":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.05)]";
      case "HALF_DAY_1ST_HALF":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.05)]";
      case "HALF_DAY_2ND_HALF":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 shadow-[0_0_10px_rgba(59,130,246,0.05)]";
      case "EMERGENCY_LEAVE":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 shadow-[0_0_10px_rgba(244,63,94,0.05)]";
      case "WORK_PAUSED":
        return "bg-amber-600/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.05)]";
      case "WORK_RESUMED":
        return "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.05)]";
      default:
        return "bg-secondary/40 dark:bg-white/[0.02] border border-border dark:border-white/[0.05] text-muted-foreground dark:text-gray-500";
    }
  };

  const getTaskStatusClasses = (s: string) => {
    switch (s) {
      case "PENDING":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";
      case "IN_PROGRESS":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20";
      case "IN_REVIEW":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 animate-pulse";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-650 dark:text-slate-400 border border-slate-500/20";
    }
  };

  // Metric computations
  const totalVerifiedDocs = documents.filter((d) => d.verified).length;
  const complianceRate = Math.round((totalVerifiedDocs / REQUIRED_DOCS.length) * 100);

  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 100;
  const presentDays = attendance.filter((a) => a.status === "PRESENT").length;
  const leaveDays = attendance.filter((a) => a.status === "LEAVE").length;
  const lateDays = attendance.filter((a) => a.status === "LATE").length;

  const isNewHire = (() => {
    if (internProfile.status === "ONBOARDING" || internProfile.status === "PENDING_VERIFICATION") {
      return true;
    }
    const start = new Date(internProfile.startDate);
    const diffTime = Math.abs(Date.now() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  })();

  const milestones = [
    {
      id: "identity",
      title: "Security & Mentorship Setup",
      description: internProfile.supervisor 
        ? `Mentor assigned: ${internProfile.supervisor.fullName}`
        : "Pending mentor allocation by HR/Founder",
      isCompleted: !!internProfile.supervisor,
    },
    {
      id: "attendance",
      title: "Log First Shift Clock-In",
      description: todayRecord 
        ? "First attendance footprint logged in systems!"
        : "Clock-in from the Daily Station below to start your shift",
      isCompleted: !!todayRecord,
    },
    {
      id: "compliance",
      title: `Compliance Docs (${totalVerifiedDocs}/${REQUIRED_DOCS.length})`,
      description: totalVerifiedDocs === REQUIRED_DOCS.length
        ? "All compliance vault credentials fully verified!"
        : "Upload and obtain verification for required documents",
      isCompleted: totalVerifiedDocs === REQUIRED_DOCS.length,
    },
    {
      id: "portfolio",
      title: "Log Your First Portfolio Project",
      description: projects.length > 0
        ? `Logged ${projects.length} work project record(s)!`
        : "Navigate to the Work Portfolio tab to register your first log",
      isCompleted: projects.length > 0,
    }
  ];

  const completedMilestones = milestones.filter(m => m.isCompleted).length;
  const onboardingProgress = Math.round((completedMilestones / milestones.length) * 100);

  return (
    <div className="space-y-6 sm:space-y-8 relative animate-fadeIn text-foreground">
      
      {/* Notifications banner */}
      {error && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-pulse z-40">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          <span className="font-semibold leading-normal">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs z-40">
          <CheckCircle className="h-4.5 w-4.5 shrink-0" />
          <span className="font-semibold leading-normal">{success}</span>
        </div>
      )}

      {/* 0. Glowing Onboarding Welcome Card */}
      {isNewHire && (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/30 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/60 via-card to-background dark:from-[#1c160c] dark:via-[#0f111a] dark:to-[#060814] p-6 shadow-xl shadow-amber-500/[0.02] backdrop-blur-md animate-fadeIn text-foreground dark:text-white">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/20 dark:bg-amber-500/10 blur-[50px] pointer-events-none" />
          
          <div className="relative z-10 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                    <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                      Personal Onboarding Roadmap
                    </span>
                  </div>
                  {onboardingSkipped && (
                    <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                      <span className="text-[9px] font-heading font-bold uppercase tracking-wider">
                        Setup Deferred
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-heading font-extrabold text-foreground dark:text-white mt-1">
                  Welcome to AURXON! Let's get you set up.
                </h3>
                <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium leading-relaxed max-w-2xl">
                  Complete these essential milestone targets to finalize your enrolee setup and activate your full learning dashboard parameters.
                </p>
              </div>
              <div className="flex items-center space-x-3 bg-secondary/50 dark:bg-white/5 border border-border dark:border-white/5 px-4 py-2.5 rounded-xl self-start md:self-auto">
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground dark:text-gray-400 block tracking-widest">Progress</span>
                  <span className="text-lg font-heading font-extrabold text-amber-600 dark:text-amber-400">{onboardingProgress}%</span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 flex items-center justify-center relative shrink-0">
                  <svg className="w-8 h-8 transform -rotate-90">
                    <circle cx="16" cy="16" r="14" fill="transparent" stroke="rgba(245, 158, 11, 0.1)" strokeWidth="2" />
                    <circle cx="16" cy="16" r="14" fill="transparent" stroke="#f59e0b" strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (1 - onboardingProgress / 100)}`}
                      className="transition-all duration-500"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {onboardingSkipped && (
              <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fadeIn">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-650 dark:text-rose-400">Onboarding Process Postponed</h4>
                  <p className="text-[10px] text-muted-foreground dark:text-gray-400 leading-normal max-w-xl">
                    You chose to skip the onboarding wizard for now. Please complete the setup at your earliest convenience to sign agreements, verify compliance files, and issue your official active identity credential.
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    setResumeLoading(true);
                    try {
                      const res = await fetch("/api/onboarding/skip", { method: "DELETE" });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to resume onboarding.");
                      window.location.reload();
                    } catch (err: any) {
                      setError(err.message || "Failed to resume onboarding.");
                    } finally {
                      setResumeLoading(false);
                    }
                  }}
                  isLoading={resumeLoading}
                  variant="primary"
                  className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white rounded-xl shadow-md border-0 self-start sm:self-auto"
                >
                  Complete Onboarding Setup
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {milestones.map((m) => (
                <div 
                  key={m.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between space-y-3",
                    m.isCompleted
                      ? "bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/35 text-emerald-700 dark:text-emerald-400"
                      : "bg-secondary/40 border-border hover:border-border/80 text-foreground dark:bg-white/[0.02] dark:border-white/[0.06] dark:hover:border-white/10 dark:text-white"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-heading font-extrabold tracking-widest uppercase text-muted-foreground block truncate">
                      {m.id.toUpperCase()} TARGET
                    </span>
                    {m.isCompleted ? (
                      <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-3 w-3 text-emerald-650 dark:text-emerald-400" />
                      </div>
                    ) : (
                      <div className="h-4.5 w-4.5 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center animate-pulse shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className={cn("text-xs font-bold", m.isCompleted ? "text-emerald-800 dark:text-emerald-300" : "text-foreground dark:text-white")}>{m.title}</h4>
                    <p className="text-[10px] text-muted-foreground dark:text-gray-400 leading-normal line-clamp-2">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. Header Greeting with Neon Glows */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/40 dark:border-white/[0.08] bg-gradient-to-br from-card via-card to-background dark:from-[#0b0f19] dark:via-[#0d1527] dark:to-[#040814] p-5 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-10 -top-10 h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-violet-600/15 blur-[50px] sm:blur-[70px] pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-cyan-500/10 blur-[50px] sm:blur-[70px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <TrendingUp className="h-3 w-3 text-cyan-500 dark:text-cyan-400" />
              <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-300">
                Intern Workspace Secure Sandbox
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-foreground dark:text-white tracking-tight leading-tight">
              Hello, <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{internProfile.fullName}</span>
            </h2>
            {(() => {
              const roleMeta = getRoleMeta(internProfile.roleDomain);
              return (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground dark:text-gray-300 leading-relaxed font-medium">
                  <p>
                    ID: <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{internProfile.internId}</span> • Department: <span className="font-bold text-foreground dark:text-white">{internProfile.department}</span>
                  </p>
                  <span className="hidden sm:inline text-border/60 dark:text-white/20">•</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-foreground dark:text-white font-bold">{roleMeta.roleName} ({roleMeta.shortCode})</span>
                    <span className={`text-[8.5px] font-heading font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary dark:bg-white/5 border border-border/40 dark:border-white/5 ${
                      roleMeta.appointmentSource === "Founder-appointed" ? "text-amber-600 dark:text-amber-400" : roleMeta.appointmentSource === "HR-appointed" ? "text-cyan-600 dark:text-cyan-400" : "text-emerald-600 dark:text-emerald-450"
                    }`}>{roleMeta.appointmentSource}</span>
                  </div>
                </div>
              );
            })()}
            {internProfile.supervisor && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground dark:text-gray-400 bg-secondary/50 dark:bg-white/5 border border-border/40 dark:border-white/5 rounded-lg px-3 py-1.5 w-fit">
                <User className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Mentor: <strong className="text-foreground dark:text-white">{internProfile.supervisor.fullName}</strong></span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => setIsLeaveOpen(true)}
              variant="primary"
              size="sm"
              className="w-full sm:w-auto h-11 text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl px-5 border border-white/5 shadow-md shadow-indigo-600/10 transition-all duration-300 text-white"
            >
              <PlusCircle className="h-4.5 w-4.5" />
              <span>Apply for Leave</span>
            </Button>
            
            <Button
              onClick={() => setIsUploadOpen(true)}
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto h-11 text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-secondary/80 dark:bg-white/5 border border-border dark:border-white/10 hover:border-indigo-500 dark:hover:border-white/20 hover:bg-secondary dark:hover:bg-white/10 rounded-xl px-5 transition-all duration-300 text-foreground dark:text-white"
            >
              <FileCheck className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-400" />
              <span>Upload Document</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Premium Tab Switcher */}
      <div className="flex items-center space-x-2 bg-card/60 dark:bg-[#0b0f19]/60 border border-border/40 dark:border-white/[0.08] rounded-xl p-1.5 w-fit select-none backdrop-blur-md">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={cn(
            "px-5 py-2 text-xs font-heading font-extrabold uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer",
            activeTab === "dashboard"
              ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/10 border border-white/5"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/20 dark:hover:bg-white/5"
          )}
        >
          Workspace Dashboard
        </button>
        <button
          onClick={() => setActiveTab("portfolio")}
          className={cn(
            "px-5 py-2 text-xs font-heading font-extrabold uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center space-x-1.5 cursor-pointer",
            activeTab === "portfolio"
              ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/10 border border-white/5"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/20 dark:hover:bg-white/5"
          )}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Work Portfolio</span>
          {projects.length > 0 && (
            <span className="bg-secondary dark:bg-white/10 border border-border/40 dark:border-white/10 text-[9px] font-mono px-1.5 py-0.2 rounded-full text-cyan-650 dark:text-cyan-300">
              {projects.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "dashboard" ? (
        <>
          {/* Self-Service Check-In Widget */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/40 dark:border-white/[0.08] bg-gradient-to-br from-card via-card to-background dark:from-[#0c1220] dark:via-[#0d1629] dark:to-[#050b18] p-5 sm:p-6 shadow-2xl backdrop-blur-md select-none text-foreground">
            <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none" />
            <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-[60px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2.5">
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-300">
                    Daily Check-In Station
                  </span>
                </div>
                <h3 className="text-lg font-heading font-extrabold text-foreground dark:text-white">
                  Self-Service Attendance Portal
                </h3>
                <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium leading-relaxed max-w-xl">
                  Log your daily attendance directly from your portal. The daily check-in window closes at <span className="text-cyan-600 dark:text-cyan-400 font-bold">11:00 AM IST</span>. Checks-in after <span className="text-amber-600 dark:text-amber-400 font-bold">9:30 AM IST</span> are logged as <span className="text-amber-600 dark:text-amber-400 font-bold">LATE</span>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                {/* Status Indicator */}
                <div className="flex flex-col space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground dark:text-gray-400">Current Status</span>
                  {!todayRecord ? (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Not Checked In</span>
                    </div>
                  ) : todayRecord.status === "ABSENT" ? (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Absent (Overridable)</span>
                    </div>
                  ) : todayRecord.status === "WORK_PAUSED" ? (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                      <AlertTriangle className="h-4 w-4 animate-pulse" />
                      <span>Work Paused (Break)</span>
                    </div>
                  ) : todayRecord.checkOut ? (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Checked Out</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                      <CheckCircle className="h-4 w-4 animate-bounce" />
                      <span>Checked In {todayRecord.status === "LATE" && "(Late)"}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-3">
                  {!todayRecord || todayRecord.status === "ABSENT" ? (
                    <Button
                      onClick={handleSelfCheckIn}
                      disabled={actionLoading}
                      variant="primary"
                      className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-white/5 shadow-md shadow-emerald-600/15"
                    >
                      {actionLoading ? (
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 shrink-0" />
                      )}
                      <span>Clock In Now</span>
                    </Button>
                  ) : todayRecord.checkOut ? (
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground font-bold px-4 py-2.5 border border-border dark:border-white/10 bg-secondary/50 dark:bg-white/5 rounded-xl select-none">
                      <CheckCircle className="h-4 w-4 text-emerald-650 dark:text-emerald-400" />
                      <span>Attendance Complete</span>
                    </div>
                  ) : todayRecord.status === "WORK_PAUSED" ? (
                    <Button
                      onClick={handleResumeWork}
                      disabled={actionLoading}
                      variant="primary"
                      className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-white/5 shadow-md shadow-emerald-600/15"
                    >
                      {actionLoading ? (
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <Unlock className="h-4 w-4 shrink-0" />
                      )}
                      <span>Resume Work</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          const reason = prompt("Enter pause reason (e.g. Lunch Break, Meeting):", "Break");
                          if (reason !== null) handlePauseWork(reason);
                        }}
                        disabled={actionLoading}
                        variant="secondary"
                        className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-amber-500/10 dark:bg-amber-600/20 hover:bg-amber-500/20 dark:hover:bg-amber-600/35 border border-amber-500/30 text-amber-700 dark:text-amber-400 shadow-md shadow-amber-600/15"
                      >
                        {actionLoading ? (
                          <span className="h-4 w-4 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <Lock className="h-4 w-4 shrink-0" />
                        )}
                        <span>Pause Work</span>
                      </Button>

                      <Button
                        onClick={handleSelfCheckOut}
                        disabled={actionLoading}
                        variant="primary"
                        className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-white/5 shadow-md shadow-cyan-600/15"
                      >
                        {actionLoading ? (
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 shrink-0" />
                        )}
                        <span>Clock Out Now</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Interactive Analytical Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Attendance Counter */}
            <Card className="border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 backdrop-blur-md p-5 flex flex-col justify-between shadow-md text-foreground">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                  Present Attendance
                </span>
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-heading font-extrabold tracking-tight text-foreground dark:text-white">{presentDays}</span>
                <span className="text-xs text-muted-foreground font-semibold ml-2">Days Logged</span>
                <p className="text-[10px] text-muted-foreground mt-2 flex gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{leaveDays} Leaves</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{lateDays} Lates</span>
                </p>
              </div>
            </Card>

            {/* Task Completion Rate */}
            <Card className="border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 backdrop-blur-md p-5 flex flex-col justify-between shadow-md text-foreground">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                  Task Checklist Completion
                </span>
                <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 shrink-0">
                  <CheckSquare className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-heading font-extrabold tracking-tight text-foreground dark:text-white">{taskCompletionRate}%</span>
                  <span className="text-[10px] text-muted-foreground font-bold">{completedTasks} of {tasks.length} Completed</span>
                </div>
                <div className="w-full bg-secondary/80 dark:bg-white/5 h-2 rounded-full mt-3 overflow-hidden border border-border dark:border-white/5">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${taskCompletionRate}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Compliance vault percentage */}
            <Card className="border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 backdrop-blur-md p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all group shadow-md text-foreground">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                  Compliance Vault
                </span>
                <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:bg-indigo-500/20 transition-all">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-heading font-extrabold tracking-tight text-foreground dark:text-white">{complianceRate}%</span>
                  <span className="text-[10px] text-muted-foreground font-bold">{totalVerifiedDocs} of {REQUIRED_DOCS.length} Verified</span>
                </div>
                <div className="w-full bg-secondary/80 dark:bg-white/5 h-2 rounded-full mt-3 overflow-hidden border border-border dark:border-white/5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${complianceRate}%` }}
                  />
                </div>
                <div className="flex justify-end mt-2.5">
                  <a
                    href="/documents"
                    className="text-[9px] font-heading font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 transition-all"
                  >
                    <span>Go to Vault</span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </Card>

            {/* Start Date / Onboarding status */}
            <Card className="border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 backdrop-blur-md p-5 flex flex-col justify-between shadow-md text-foreground">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                  Portal Onboarding State
                </span>
                <div className="p-2 rounded bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-lg font-heading font-extrabold text-foreground dark:text-white">
                  {internProfile.status === "ACTIVE" ? "FULLY ACTIVE" : "ONBOARDING READY"}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Started {new Date(internProfile.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </Card>

          </div>

          {/* Announcements & Cheers + Personal Planner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <NoticeBoard announcements={announcements} anniversaries={anniversaries} />
            </div>
            <div className="lg:col-span-1">
              <TodoWidget />
            </div>
          </div>

          {/* 3. Leave Calendar & Tasks split screen */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Leave Calendar self service (2/3 width) */}
        <Card className="lg:col-span-2 border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 backdrop-blur-md p-0 overflow-hidden shadow-xl text-foreground">
          <CardHeader className="border-b border-border/40 dark:border-white/[0.06] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CalendarDays className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                <span>Attendance Leave Calendar</span>
              </CardTitle>
              <CardDescription>Track check-ins and verify leave blocks seamlessly.</CardDescription>
            </div>
            
            <div className="flex items-center space-x-2 self-start sm:self-auto bg-secondary/80 dark:bg-white/5 border border-border dark:border-white/10 rounded-lg p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-secondary dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-foreground dark:text-white" />
              </button>
              <span className="text-xs font-bold px-3 uppercase tracking-wider select-none min-w-[110px] text-center text-foreground dark:text-white">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-secondary dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-foreground dark:text-white" />
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="p-3.5 sm:p-5">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2.5 text-center text-xs font-semibold select-none">
              
              {/* Day Titles */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div key={dayName} className="text-muted-foreground dark:text-gray-400/90 text-[9px] sm:text-[10px] uppercase font-bold py-1.5 sm:py-2 tracking-wider sm:tracking-widest">
                  {dayName}
                </div>
              ))}

              {/* Offset Days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-11 sm:h-16 rounded-lg sm:rounded-xl border border-border/10 dark:border-white/[0.02] bg-secondary/10 dark:bg-white/[0.01]/20 pointer-events-none opacity-20" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNumber = i + 1;
                const record = getAttendanceForDay(dayNumber);
                
                return (
                  <div
                    key={`day-${dayNumber}`}
                    className={cn(
                      "h-11 sm:h-16 rounded-lg sm:rounded-xl p-1 sm:p-2.5 flex flex-col justify-between items-start transition-all duration-200 cursor-pointer border group hover:border-indigo-500/20 dark:hover:border-white/20 select-none",
                      getStatusClasses(record?.status)
                    )}
                  >
                    <span className="text-[10px] sm:text-xs font-bold text-foreground dark:text-white">{dayNumber}</span>
                    {record ? (
                      <div className="w-full text-left">
                        <span className="text-[6px] sm:text-[7.5px] uppercase font-heading font-extrabold tracking-wide block truncate">
                          {record.status.replace(/_/g, " ")}
                        </span>
                        {record.checkIn && (
                          <span className="text-[5.5px] sm:text-[7.5px] text-muted-foreground dark:text-gray-400 block font-mono mt-0.5 leading-none">
                            {new Date(record.checkIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[6px] sm:text-[7.5px] text-muted-foreground dark:text-gray-500 uppercase font-heading font-semibold tracking-wide">
                        No roll
                      </span>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Calendar Status Legend */}
            <div className="mt-6 pt-5 border-t border-border/40 dark:border-white/[0.06] flex flex-wrap gap-4 items-center justify-center text-[10px] font-bold tracking-wider uppercase text-muted-foreground dark:text-gray-400">
              <div className="flex items-center space-x-1.5">
                <div className="h-3.5 w-3.5 rounded bg-emerald-500/10 border border-emerald-500/25 shrink-0" />
                <span>Present</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="h-3.5 w-3.5 rounded bg-red-500/10 border border-red-500/25 shrink-0" />
                <span>Absent</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="h-3.5 w-3.5 rounded bg-amber-500/10 border border-amber-500/25 shrink-0" />
                <span>Late</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="h-3.5 w-3.5 rounded bg-indigo-500/10 border border-indigo-500/25 shrink-0" />
                <span>Leave</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="h-3.5 w-3.5 rounded bg-cyan-500/10 border border-cyan-500/25 shrink-0" />
                <span>Half Day (1st)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="h-3.5 w-3.5 rounded bg-blue-500/10 border border-blue-500/25 shrink-0" />
                <span>Half Day (2nd)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Document checklist locker & leave requests (1/3 width) */}
        <div className="space-y-6">
          
          {/* Document Locker */}
          <Card className="border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 backdrop-blur-md text-foreground">
            <CardHeader className="pb-3 border-b border-border/40 dark:border-white/[0.06]">
              <CardTitle className="flex items-center space-x-2 text-base text-foreground dark:text-white">
                <FileCheck className="h-4.5 w-4.5 text-cyan-500 dark:text-cyan-400" />
                <span>Compliance Document Locker</span>
              </CardTitle>
              <CardDescription className="text-[11px]">Upload compliance documentation required for certification.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {REQUIRED_DOCS.map((req) => {
                const doc = documents.find((d) => d.type === req.type);
                
                return (
                  <div
                    key={req.type}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/35 dark:bg-white/[0.02] border border-border dark:border-white/[0.06] hover:bg-secondary/50 dark:hover:bg-white/[0.04] transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-xs font-bold text-foreground dark:text-white block truncate">{req.label}</span>
                      {doc ? (
                        <p className="text-[9px] text-muted-foreground dark:text-gray-400 flex items-center gap-1">
                          <span>{doc.fileName.substring(0, 18)}...</span>
                        </p>
                      ) : (
                        <span className="text-[9px] text-muted-foreground dark:text-gray-400 font-medium block">Not Uploaded</span>
                      )}
                    </div>

                    <div className="shrink-0 ml-3 flex items-center gap-2">
                      {doc && doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-secondary dark:bg-white/5 border border-border dark:border-white/10 hover:bg-secondary/80 dark:hover:bg-white/10 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 text-[9px] font-bold uppercase tracking-wide transition-all select-none"
                        >
                          <Eye className="h-3 w-3 shrink-0" />
                          <span>Open</span>
                        </a>
                      )}
                      {doc ? (
                        doc.verified ? (
                          <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wide">
                            <CheckCircle className="h-3 w-3 shrink-0" />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-[9px] font-bold uppercase tracking-wide">
                            <Clock className="h-3 w-3 shrink-0 animate-pulse" />
                            <span>Review</span>
                          </div>
                        )
                      ) : (
                        <Button
                          onClick={() => {
                            setUploadType(req.type);
                            setIsUploadOpen(true);
                          }}
                          size="sm"
                          className="h-7 px-2 text-[9px] font-extrabold uppercase bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400"
                        >
                          Upload
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Leaves Submitted Ticker */}
          <Card className="border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 backdrop-blur-md text-foreground">
            <CardHeader className="pb-3 border-b border-border/40 dark:border-white/[0.06]">
              <CardTitle className="text-base text-foreground dark:text-white">Leave Applications Queue</CardTitle>
              <CardDescription className="text-[11px]">Chronological stream of leave submissions.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {leaves.length === 0 ? (
                <div className="py-6 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  No leaves submitted
                </div>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {leaves.map((l) => (
                    <div
                      key={l.id}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col justify-between gap-1.5",
                        l.status === "APPROVED"
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : l.status === "REJECTED"
                          ? "bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400"
                          : "bg-secondary/35 dark:bg-white/[0.02] border-border dark:border-white/[0.06] text-foreground dark:text-white"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase font-extrabold tracking-widest font-heading">
                          {l.type.replace(/_/g, " ")}
                        </span>
                        <span
                          className={cn(
                            "text-[8px] font-extrabold tracking-wide uppercase px-2 py-0.5 rounded",
                            l.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : l.status === "REJECTED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          )}
                        >
                          {l.status}
                        </span>
                      </div>
                      
                      <div className="text-[11px]">
                        <p className="font-bold">
                          {new Date(l.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(l.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-[10px] opacity-75 mt-0.5 italic truncate">"{l.reason}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 4. Assigned Tasks Queue Section */}
      <Card className="border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 backdrop-blur-md text-foreground">
        <CardHeader className="border-b border-border/40 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                <CheckSquare className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                <span>Assigned Tasks Checklist</span>
              </CardTitle>
              <CardDescription>Track goals assigned by mentors. Tap a task to advance its operational status.</CardDescription>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              {tasks.filter((t) => t.status !== "COMPLETED").length} Active Tasks
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-gray-500">
              Zero assigned tasks found. Enjoy your learning seat today!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4.5 rounded-2xl bg-secondary/35 dark:bg-white/[0.02] border border-border dark:border-white/[0.06] hover:border-cyan-500/30 hover:bg-secondary/50 dark:hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <span
                        className={cn(
                          "text-[9px] font-heading font-extrabold tracking-wider border px-2 py-0.5 rounded-lg select-none shrink-0",
                          getTaskStatusClasses(task.status)
                        )}
                      >
                        {task.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground dark:text-gray-400 font-mono font-medium">
                        Due {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h4 className="text-sm font-bold text-foreground dark:text-white">{task.title}</h4>
                    <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium leading-relaxed mt-1">
                      {task.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/40 dark:border-white/[0.05] flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground dark:text-gray-400">
                      By: <strong className="text-foreground/80 dark:text-gray-300">{task.assigner?.fullName || "Supervisor"}</strong>
                    </span>

                    <Button
                      size="sm"
                      onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                      disabled={updatingTaskId === task.id || task.status === "IN_REVIEW" || task.status === "COMPLETED"}
                      className={cn(
                        "h-8.5 rounded-xl text-[10px] font-extrabold uppercase px-3 flex items-center justify-center space-x-1.5 transition-all select-none border",
                        task.status === "COMPLETED"
                          ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10 cursor-not-allowed"
                          : task.status === "IN_REVIEW"
                          ? "bg-blue-500/5 text-blue-500 border-blue-500/10 cursor-not-allowed animate-none"
                          : task.status === "IN_PROGRESS"
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                      )}
                    >
                      {updatingTaskId === task.id ? (
                        <div className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin" />
                      ) : task.status === "COMPLETED" ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Completed</span>
                        </>
                      ) : task.status === "IN_REVIEW" ? (
                        <>
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Under Review</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 shrink-0" />
                          <span>Advance</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  ) : (
    <div className="space-y-6 animate-fadeIn">
      {/* Work Portfolio tab */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 1/3: Add New Portfolio Project Log */}
        <Card className="border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 backdrop-blur-md text-foreground">
          <CardHeader className="pb-3 border-b border-border/40 dark:border-white/[0.06]">
            <CardTitle className="flex items-center space-x-2 text-base text-foreground dark:text-white">
              <PlusCircle className="h-4.5 w-4.5 text-cyan-500 dark:text-cyan-400" />
              <span>Log Portfolio Project</span>
            </CardTitle>
            <CardDescription className="text-[11px]">
              Register a project record to showcase your skills and deliverables to supervisors.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                  Project Title *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g., Compliance System Refactor"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="bg-secondary/40 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white rounded-xl focus:border-cyan-500/70 focus:outline-none placeholder-muted-foreground dark:placeholder-gray-500"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                  Your Role / Contribution *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g., Lead QA Architect / Fullstack Developer"
                  value={projectRole}
                  onChange={(e) => setProjectRole(e.target.value)}
                  className="bg-secondary/40 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white rounded-xl focus:border-cyan-500/70 focus:outline-none placeholder-muted-foreground dark:placeholder-gray-500"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                  Deliverable URL (Github, Live App)
                </label>
                <Input
                  type="url"
                  placeholder="e.g., https://github.com/..."
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  className="bg-secondary/40 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white rounded-xl focus:border-cyan-500/70 focus:outline-none placeholder-muted-foreground dark:placeholder-gray-500"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                  Technologies Used (Comma-separated)
                </label>
                <Input
                  type="text"
                  placeholder="e.g., React, Next.js, Prisma, TailwindCSS"
                  value={projectTech}
                  onChange={(e) => setProjectTech(e.target.value)}
                  className="bg-secondary/40 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white rounded-xl focus:border-cyan-500/70 focus:outline-none placeholder-muted-foreground dark:placeholder-gray-500"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                  Project Status
                </label>
                <select
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-border dark:border-white/10 bg-secondary/40 dark:bg-white/5 px-3.5 py-2 text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/70 focus:border-cyan-500/70 transition-all cursor-pointer"
                >
                  <option value="IN_PROGRESS" className="bg-card text-foreground">In Progress</option>
                  <option value="COMPLETED" className="bg-card text-foreground">Completed</option>
                  <option value="ARCHIVED" className="bg-card text-foreground">Archived</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                  Description & Scope *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the project scope, milestones achieved, obstacles bypassed, and your primary deliverables..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="flex w-full rounded-xl border border-border dark:border-white/10 bg-secondary/40 dark:bg-white/5 px-3.5 py-2 text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/70 focus:border-cyan-500/70 transition-all placeholder-muted-foreground dark:placeholder-gray-500"
                />
              </div>

              <Button
                type="submit"
                disabled={portfolioLoading}
                className="w-full h-11 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold"
              >
                {portfolioLoading ? "Saving Log..." : "Submit Portfolio Log"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right 2/3: Logged Project Showcase */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-heading font-extrabold text-foreground dark:text-white">Logged Project Roster</h3>
          
          {projects.length === 0 ? (
            <div className="border border-border/40 dark:border-white/[0.08] bg-secondary/10 dark:bg-[#0b0f19]/40 rounded-2xl p-12 text-center select-none space-y-4">
              <FolderOpen className="h-10 w-10 text-muted-foreground dark:text-gray-500 mx-auto animate-pulse" />
              <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium">
                No work portfolio project logs registered in the database yet. 
                Fill in the form on the left to start compiling your portfolio record.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <Card key={proj.id} className="border-border/40 dark:border-white/[0.08] bg-card/60 dark:bg-[#0b0f19]/60 hover:border-cyan-500/35 transition-all duration-300 p-5 flex flex-col justify-between space-y-4 text-foreground shadow-md">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <span className={cn(
                        "text-[8.5px] font-heading font-extrabold uppercase px-2 py-0.5 rounded tracking-wider border",
                        proj.status === "COMPLETED" 
                          ? "bg-emerald-500/10 text-emerald-750 dark:text-emerald-450 border-emerald-500/20"
                          : proj.status === "IN_PROGRESS"
                          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                          : "bg-gray-500/10 text-gray-650 dark:text-gray-400 border-gray-500/20"
                      )}>
                        {proj.status.replace(/_/g, " ")}
                      </span>
                      
                      <button
                        onClick={() => handleDeleteProject(proj.id)}
                        className="text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 cursor-pointer"
                        title="Delete project log"
                      >
                        <XCircle className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-foreground dark:text-white tracking-tight">{proj.title}</h4>
                    <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold font-heading">Role: {proj.roleInProject}</p>
                    <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium leading-relaxed line-clamp-4 mt-2">
                      {proj.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/40 dark:border-white/[0.05] space-y-3">
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {proj.technologies.map((tech: string, tIdx: number) => (
                          <span key={tIdx} className="text-[8px] font-semibold text-indigo-650 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/15 px-1.5 py-0.2 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {proj.deliverableUrl && (
                      <a
                        href={proj.deliverableUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        <span>Open Deliverable URL</span>
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )}

  {/* 5. Leave Application Overlay Modal */}
      {isLeaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-md">
            <Card className="border-border dark:border-white/10 bg-card/95 dark:bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl relative text-foreground">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground dark:text-white">Leave Application Portal</CardTitle>
                <CardDescription>Submit formal leave request. System auto-populates calendar roll upon Founder approval.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleApplyLeave} className="space-y-4.5">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        required
                        value={leaveStart}
                        onChange={(e) => setLeaveStart(e.target.value)}
                        className="bg-secondary/40 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white placeholder-muted-foreground dark:placeholder-gray-500 rounded-xl focus:border-indigo-500/70 focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                        End Date
                      </label>
                      <Input
                        type="date"
                        required
                        value={leaveEnd}
                        onChange={(e) => setLeaveEnd(e.target.value)}
                        className="bg-secondary/40 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white placeholder-muted-foreground dark:placeholder-gray-500 rounded-xl focus:border-indigo-500/70 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                      Leave Range Type
                    </label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-border dark:border-white/10 bg-secondary/40 dark:bg-white/5 px-3.5 py-2 text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all cursor-pointer"
                    >
                      <option value="FULL_DAY" className="bg-card text-foreground">Full Day Leave</option>
                      <option value="HALF_DAY_1ST_HALF" className="bg-card text-foreground">Half Day (1st Half)</option>
                      <option value="HALF_DAY_2ND_HALF" className="bg-card text-foreground">Half Day (2nd Half)</option>
                      <option value="URGENT_LEAVE" className="bg-card text-foreground">Urgent Leave</option>
                      <option value="EMERGENCY_LEAVE" className="bg-card text-foreground">Emergency Leave</option>
                      <option value="WORK_PAUSE" className="bg-card text-foreground">Temporary Work Pause</option>
                      <option value="WORK_RESUME" className="bg-card text-foreground">Work Resume Request</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                      Detailed Reason / Remarks
                    </label>
                    <textarea
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="Explain the purpose of your leave request..."
                      required
                      rows={3}
                      className="flex w-full rounded-xl border border-border dark:border-white/10 bg-secondary/40 dark:bg-white/5 px-3.5 py-2 text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all placeholder-muted-foreground dark:placeholder-gray-500"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-border dark:border-white/[0.08] select-none">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsLeaveOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      isLoading={loading}
                    >
                      Submit Application
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 6. Document Upload Overlay Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-md">
            <Card className="border-border dark:border-white/10 bg-card/95 dark:bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl relative text-foreground">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground dark:text-white">Upload Vault Document</CardTitle>
                <CardDescription>Upload compliance files. Preferred: &lt; 10 KB. Strict Limit: 100 KB. Formats: PDF, JPG, PNG.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUploadDocument} className="space-y-4.5">
                  
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                      Compliance Category
                    </label>
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-border dark:border-white/10 bg-secondary/40 dark:bg-white/5 px-3.5 py-2 text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all cursor-pointer"
                    >
                      {REQUIRED_DOCS.map((doc) => (
                        <option key={doc.type} value={doc.type} className="bg-card text-foreground">
                          {doc.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground dark:text-gray-400 uppercase tracking-widest">
                      Select Attachment File
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                      required
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="flex w-full text-sm text-muted-foreground dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-heading file:font-bold file:bg-cyan-500/10 file:text-cyan-600 dark:file:text-cyan-400 file:cursor-pointer hover:file:bg-cyan-500/20 border border-border dark:border-white/10 rounded-xl p-1 bg-secondary/40 dark:bg-white/5"
                    />
                  </div>

                  {attachedFile && (
                    <div className="p-3.5 rounded-xl border bg-secondary/35 dark:bg-white/[0.02] border-border dark:border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-semibold truncate">Selected Size:</span>
                        <span className={cn(
                          "font-bold font-mono",
                          attachedFile.size > 100 * 1024
                            ? "text-rose-600 dark:text-rose-400 animate-pulse"
                            : attachedFile.size > 10 * 1024
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {(attachedFile.size / 1024).toFixed(2)} KB
                        </span>
                      </div>
                      
                      {attachedFile.size > 100 * 1024 && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold leading-tight flex items-start space-x-1 mt-1.5 animate-pulse">
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>REJECTED: File size exceeds the strict 100 KB hard limit.</span>
                        </p>
                      )}
                      
                      {attachedFile.size <= 100 * 1024 && attachedFile.size > 10 * 1024 && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold leading-tight flex items-start space-x-1 mt-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>WARNING: File is heavier than the preferred 10 KB size. We recommend optimization.</span>
                        </p>
                      )}

                      {attachedFile.size <= 10 * 1024 && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold leading-tight flex items-start space-x-1 mt-1.5">
                          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-650 dark:text-emerald-400" />
                          <span>EXCELLENT: File size is perfectly optimized under 10 KB.</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-border dark:border-white/[0.08] select-none">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsUploadOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
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
