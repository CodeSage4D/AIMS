"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  ChevronRight
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE" | "HALF_DAY_1ST_HALF" | "HALF_DAY_2ND_HALF";
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
  type: "OFFER_LETTER" | "RESUME" | "ID_PROOF" | "AGREEMENT" | "CERTIFICATE";
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
  supervisor?: { fullName: string; email: string } | null;
}

interface InternDashboardProps {
  internProfile: InternProfile;
  initialAttendance: AttendanceRecord[];
  initialTasks: TaskItem[];
  initialDocuments: DocumentItem[];
}

const REQUIRED_DOCS = [
  { type: "OFFER_LETTER", label: "Offer Letter" },
  { type: "RESUME", label: "Resume" },
  { type: "ID_PROOF", label: "ID Proof / SSN" },
  { type: "AGREEMENT", label: "NDA Agreement" },
  { type: "CERTIFICATE", label: "Program Certificate" }
];

export default function InternDashboard({
  internProfile,
  initialAttendance,
  initialTasks,
  initialDocuments
}: InternDashboardProps) {
  const router = useRouter();

  // Core Data States
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialAttendance);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [leaves, setLeaves] = useState<any[]>([]);

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
    setUpdatingTaskId(taskId);

    // Progression: PENDING -> IN_PROGRESS -> IN_REVIEW -> COMPLETED
    let nextStatus = "IN_PROGRESS";
    if (currentStatus === "IN_PROGRESS") nextStatus = "IN_REVIEW";
    if (currentStatus === "IN_REVIEW") nextStatus = "COMPLETED";
    if (currentStatus === "COMPLETED") nextStatus = "PENDING"; // Wrap around / Reset

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: nextStatus })
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
    if (!status) return "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] text-gray-500";
    switch (status) {
      case "PRESENT":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.05)]";
      case "ABSENT":
        return "bg-red-500/10 text-red-400 border border-red-500/25 shadow-[0_0_10px_rgba(239,68,68,0.05)]";
      case "LATE":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.05)]";
      case "LEAVE":
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.05)]";
      case "HALF_DAY_1ST_HALF":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.05)]";
      case "HALF_DAY_2ND_HALF":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/25 shadow-[0_0_10px_rgba(59,130,246,0.05)]";
      default:
        return "bg-white/[0.02] border-white/[0.05] text-gray-500";
    }
  };

  const getTaskStatusClasses = (s: string) => {
    switch (s) {
      case "PENDING":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "IN_PROGRESS":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
      case "IN_REVIEW":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
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

  return (
    <div className="space-y-6 sm:space-y-8 select-none relative animate-fadeIn text-white">
      
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

      {/* 1. Header Greeting with Neon Glows */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0b0f19] via-[#0d1527] to-[#040814] p-5 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-10 -top-10 h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-violet-600/15 blur-[50px] sm:blur-[70px] pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-cyan-500/10 blur-[50px] sm:blur-[70px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <TrendingUp className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-cyan-300">
                Intern Workspace Secure Sandbox
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight leading-tight">
              Hello, <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">{internProfile.fullName}</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-medium">
              Intern ID: <span className="font-mono text-cyan-400 font-bold">{internProfile.internId}</span> • Department: <span className="font-bold text-white">{internProfile.department}</span> ({internProfile.roleDomain})
            </p>
            {internProfile.supervisor && (
              <div className="flex items-center space-x-2 text-xs text-gray-400 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 w-fit">
                <User className="h-3.5 w-3.5 text-indigo-400" />
                <span>Mentor: <strong className="text-white">{internProfile.supervisor.fullName}</strong></span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => setIsLeaveOpen(true)}
              variant="primary"
              size="sm"
              className="w-full sm:w-auto h-11 text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl px-5 border border-white/5 shadow-md shadow-indigo-600/10 transition-all duration-300"
            >
              <PlusCircle className="h-4.5 w-4.5" />
              <span>Apply for Leave</span>
            </Button>
            
            <Button
              onClick={() => setIsUploadOpen(true)}
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto h-11 text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 rounded-xl px-5 transition-all duration-300"
            >
              <FileCheck className="h-4.5 w-4.5 text-cyan-400" />
              <span>Upload Document</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Analytical Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Attendance Counter */}
        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Present Attendance
            </span>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-heading font-extrabold tracking-tight text-white">{presentDays}</span>
            <span className="text-xs text-muted-foreground font-semibold ml-2">Days Logged</span>
            <p className="text-[10px] text-muted-foreground mt-2 flex gap-2">
              <span className="text-indigo-400 font-bold">{leaveDays} Leaves</span>
              <span className="text-amber-400 font-bold">{lateDays} Lates</span>
            </p>
          </div>
        </Card>

        {/* Task Completion Rate */}
        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Task Checklist Completion
            </span>
            <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-heading font-extrabold tracking-tight text-white">{taskCompletionRate}%</span>
              <span className="text-[10px] text-muted-foreground font-bold">{completedTasks} of {tasks.length} Completed</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full mt-3 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Compliance vault percentage */}
        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Compliance Vault
            </span>
            <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-heading font-extrabold tracking-tight text-white">{complianceRate}%</span>
              <span className="text-[10px] text-muted-foreground font-bold">{totalVerifiedDocs} of {REQUIRED_DOCS.length} Verified</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full mt-3 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${complianceRate}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Start Date / Onboarding status */}
        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Portal Onboarding State
            </span>
            <div className="p-2 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-lg font-heading font-extrabold text-white">
              {internProfile.status === "ACTIVE" ? "FULLY ACTIVE" : "ONBOARDING READY"}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">
              Started {new Date(internProfile.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </Card>

      </div>

      {/* 3. Leave Calendar & Tasks split screen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Leave Calendar self service (2/3 width) */}
        <Card className="lg:col-span-2 border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-0 overflow-hidden shadow-xl">
          <CardHeader className="border-b border-white/[0.06] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CalendarDays className="h-5 w-5 text-indigo-400" />
                <span>Attendance Leave Calendar</span>
              </CardTitle>
              <CardDescription>Track check-ins and verify leave blocks seamlessly.</CardDescription>
            </div>
            
            <div className="flex items-center space-x-2 self-start sm:self-auto bg-white/5 border border-white/10 rounded-lg p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
              <span className="text-xs font-bold px-3 uppercase tracking-wider select-none min-w-[110px] text-center">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="p-3.5 sm:p-5">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2.5 text-center text-xs font-semibold select-none">
              
              {/* Day Titles */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div key={dayName} className="text-gray-400/90 text-[9px] sm:text-[10px] uppercase font-bold py-1.5 sm:py-2 tracking-wider sm:tracking-widest">
                  {dayName}
                </div>
              ))}

              {/* Offset Days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-11 sm:h-16 rounded-lg sm:rounded-xl border border-white/[0.02] bg-white/[0.01]/20 pointer-events-none opacity-20" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNumber = i + 1;
                const record = getAttendanceForDay(dayNumber);
                
                return (
                  <div
                    key={`day-${dayNumber}`}
                    className={cn(
                      "h-11 sm:h-16 rounded-lg sm:rounded-xl p-1 sm:p-2.5 flex flex-col justify-between items-start transition-all duration-200 cursor-pointer border group hover:border-white/20 select-none",
                      getStatusClasses(record?.status)
                    )}
                  >
                    <span className="text-[10px] sm:text-xs font-bold">{dayNumber}</span>
                    {record ? (
                      <div className="w-full text-left">
                        <span className="text-[6px] sm:text-[7.5px] uppercase font-heading font-extrabold tracking-wide block truncate">
                          {record.status.replace(/_/g, " ")}
                        </span>
                        {record.checkIn && (
                          <span className="text-[5.5px] sm:text-[7.5px] text-gray-400 block font-mono mt-0.5 leading-none">
                            {new Date(record.checkIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[6px] sm:text-[7.5px] text-gray-500 uppercase font-heading font-semibold tracking-wide">
                        No roll
                      </span>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Calendar Status Legend */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap gap-4 items-center justify-center text-[10px] font-bold tracking-wider uppercase text-gray-400">
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
          <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <CardTitle className="flex items-center space-x-2 text-base">
                <FileCheck className="h-4.5 w-4.5 text-cyan-400" />
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
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{req.label}</span>
                      {doc ? (
                        <p className="text-[9px] text-gray-400 flex items-center gap-1">
                          <span>{doc.fileName.substring(0, 18)}...</span>
                        </p>
                      ) : (
                        <span className="text-[9px] text-gray-500 font-bold block">Missing Document File</span>
                      )}
                    </div>

                    <div className="shrink-0 ml-3">
                      {doc ? (
                        doc.verified ? (
                          <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wide">
                            <CheckCircle className="h-3 w-3 shrink-0" />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-[9px] font-bold uppercase tracking-wide">
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
                          className="h-7 px-2 text-[9px] font-extrabold uppercase bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/30 text-cyan-400"
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
          <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <CardTitle className="text-base">Leave Applications Queue</CardTitle>
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
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                          : l.status === "REJECTED"
                          ? "bg-red-500/5 border-red-500/20 text-red-400"
                          : "bg-white/[0.02] border-white/[0.06] text-white"
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
      <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-cyan-400" />
                <span>Assigned Tasks Checklist</span>
              </CardTitle>
              <CardDescription>Track goals assigned by mentors. Tap a task to advance its operational status.</CardDescription>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
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
                  className="p-4.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between space-y-4"
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
                      <span className="text-[10px] text-gray-400 font-mono font-medium">
                        Due {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h4 className="text-sm font-bold text-white">{task.title}</h4>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">
                      {task.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      By: <strong className="text-gray-300">{task.assigner?.fullName || "Supervisor"}</strong>
                    </span>

                    <Button
                      size="sm"
                      onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                      disabled={updatingTaskId === task.id}
                      className={cn(
                        "h-8.5 rounded-xl text-[10px] font-extrabold uppercase px-3 flex items-center justify-center space-x-1.5 transition-all select-none border",
                        task.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                          : task.status === "IN_REVIEW"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
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
                          <span>Restart</span>
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

      {/* 5. Leave Application Overlay Modal */}
      {isLeaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-md">
            <Card className="border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl relative">
              <CardHeader className="pb-4">
                <CardTitle>Leave Application Portal</CardTitle>
                <CardDescription>Submit formal leave request. System auto-populates calendar roll upon Founder approval.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleApplyLeave} className="space-y-4.5">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        required
                        value={leaveStart}
                        onChange={(e) => setLeaveStart(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder-gray-500 rounded-xl focus:border-indigo-500/70"
                      />
                    </div>
                    
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                        End Date
                      </label>
                      <Input
                        type="date"
                        required
                        value={leaveEnd}
                        onChange={(e) => setLeaveEnd(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder-gray-500 rounded-xl focus:border-indigo-500/70"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Leave Range Type
                    </label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all cursor-pointer"
                    >
                      <option value="FULL_DAY" className="bg-[#0b0f19] text-white">Full Day Leave</option>
                      <option value="HALF_DAY_1ST_HALF" className="bg-[#0b0f19] text-white">Half Day (1st Half)</option>
                      <option value="HALF_DAY_2ND_HALF" className="bg-[#0b0f19] text-white">Half Day (2nd Half)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Detailed Reason / Remarks
                    </label>
                    <textarea
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="Explain the purpose of your leave request..."
                      required
                      rows={3}
                      className="flex w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all placeholder-gray-500"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.08] select-none">
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
            <Card className="border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl relative">
              <CardHeader className="pb-4">
                <CardTitle>Upload Vault Document</CardTitle>
                <CardDescription>Upload compliance files. Maximum size: 10MB. Formats accepted: PDF, JPG, PNG.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUploadDocument} className="space-y-4.5">
                  
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Compliance Category
                    </label>
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all cursor-pointer"
                    >
                      {REQUIRED_DOCS.map((doc) => (
                        <option key={doc.type} value={doc.type} className="bg-[#0b0f19] text-white">
                          {doc.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Select Attachment File
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="flex w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-heading file:font-bold file:bg-cyan-500/10 file:text-cyan-400 file:cursor-pointer hover:file:bg-cyan-500/20 border border-white/10 rounded-xl p-1 bg-white/5"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.08] select-none">
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
