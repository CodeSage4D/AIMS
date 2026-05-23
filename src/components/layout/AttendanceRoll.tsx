"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar, CheckCircle2, ShieldCheck, AlertTriangle, Users, Clock, Lock, Unlock, CheckCircle, Search, List, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface InternOption {
  id: string;
  internId?: string;
  fullName: string;
  department: string;
}

interface AttendanceRollProps {
  initialInterns: InternOption[];
}

export default function AttendanceRoll({ initialInterns }: AttendanceRollProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "INTERN";
  const userId = (session?.user as any)?.id;

  const isAdminRole =
    userRole === "FOUNDER" ||
    userRole === "HR" ||
    userRole === "SUPER_ADMIN" ||
    userRole === "ADMIN";

  // Tab State: standard users see only personal history logs
  const [activeTab, setActiveTab] = useState<"roster" | "global" | "personal">(
    isAdminRole ? "roster" : "personal"
  );

  // Sync role-based default tab when session hydrates
  useEffect(() => {
    if (isAdminRole) {
      setActiveTab("roster");
    } else {
      setActiveTab("personal");
    }
  }, [userRole]);

  // Self Attendance states
  const [selfAttendance, setSelfAttendance] = useState<any[]>([]);
  const [selfActionLoading, setSelfActionLoading] = useState(false);
  const [selfError, setSelfError] = useState<string | null>(null);
  const [selfSuccess, setSelfSuccess] = useState<string | null>(null);

  // Global administrative logs states
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [globalLogsLoading, setGlobalLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchSelfAttendanceLogs = async () => {
    try {
      const res = await fetch("/api/attendance/history");
      if (res.ok) {
        const data = await res.json();
        setSelfAttendance(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch self attendance logs:", err);
    }
  };

  const fetchGlobalLogs = async () => {
    if (!isAdminRole) return;
    setGlobalLogsLoading(true);
    try {
      const res = await fetch("/api/attendance/all");
      if (res.ok) {
        const data = await res.json();
        setGlobalLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch global attendance logs:", err);
    } finally {
      setGlobalLogsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchSelfAttendanceLogs();
      if (isAdminRole) {
        fetchGlobalLogs();
      }
    }
  }, [session, userRole]);

  const getSelfTodayRecord = () => {
    const today = new Date();
    const offsetIST = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(today.getTime() + offsetIST);
    
    const dateStringIST = `${todayIST.getUTCFullYear()}-${(todayIST.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}-${todayIST.getUTCDate().toString().padStart(2, "0")}`;

    return selfAttendance.find((att) => {
      const attDate = new Date(att.date);
      const attYear = attDate.getUTCFullYear();
      const attMonth = attDate.getUTCMonth() + 1;
      const attDay = attDate.getUTCDate();
      const attString = `${attYear}-${attMonth.toString().padStart(2, "0")}-${attDay
        .toString()
        .padStart(2, "0")}`;
      return attString === dateStringIST;
    });
  };

  const selfTodayRecord = getSelfTodayRecord();

  const handleSelfCheckIn = async () => {
    setSelfActionLoading(true);
    setSelfError(null);
    setSelfSuccess(null);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log check-in.");
      setSelfSuccess(data.message || "Checked in successfully!");
      await fetchSelfAttendanceLogs();
      if (isAdminRole) fetchGlobalLogs();
    } catch (err: any) {
      setSelfError(err.message || "Check-in failed.");
    } finally {
      setSelfActionLoading(false);
    }
  };

  const handleSelfCheckOut = async () => {
    setSelfActionLoading(true);
    setSelfError(null);
    setSelfSuccess(null);
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log check-out.");
      setSelfSuccess(data.message || "Checked out successfully!");
      await fetchSelfAttendanceLogs();
      if (isAdminRole) fetchGlobalLogs();
    } catch (err: any) {
      setSelfError(err.message || "Check-out failed.");
    } finally {
      setSelfActionLoading(false);
    }
  };

  const handleSelfPauseWork = async (reason: string = "Break") => {
    setSelfActionLoading(true);
    setSelfError(null);
    setSelfSuccess(null);
    try {
      const res = await fetch("/api/attendance/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to pause session.");
      setSelfSuccess(data.message || "Work session paused successfully!");
      await fetchSelfAttendanceLogs();
      if (isAdminRole) fetchGlobalLogs();
    } catch (err: any) {
      setSelfError(err.message || "Work pause failed.");
    } finally {
      setSelfActionLoading(false);
    }
  };

  const handleSelfResumeWork = async () => {
    setSelfActionLoading(true);
    setSelfError(null);
    setSelfSuccess(null);
    try {
      const res = await fetch("/api/attendance/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resume session.");
      setSelfSuccess(data.message || "Work session resumed successfully!");
      await fetchSelfAttendanceLogs();
      if (isAdminRole) fetchGlobalLogs();
    } catch (err: any) {
      setSelfError(err.message || "Work resume failed.");
    } finally {
      setSelfActionLoading(false);
    }
  };

  const lastTelemetrySent = React.useRef<number>(0);

  useEffect(() => {
    if (!selfTodayRecord || selfTodayRecord.checkOut || selfTodayRecord.status === "WORK_PAUSED") {
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
        console.error("Telemetry heartbeat dispatch failed:", err);
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
  }, [selfTodayRecord]);

  // Selected Date state (Defaults to today in YYYY-MM-DD local format)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().split("T")[0];
  });

  // Attendance Mapping state: { [internId]: "PRESENT" | "ABSENT" | "LATE" | "LEAVE" }
  const [records, setRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dynamic Fetcher: Pulls any pre-existing attendance records logged for the selected date
  useEffect(() => {
    async function fetchAttendance() {
      setFetching(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/attendance?date=${selectedDate}`);
        const data = await res.json();
        
        if (res.ok && data.attendance) {
          const mapped: Record<string, string> = {};
          data.attendance.forEach((rec: any) => {
            mapped[rec.internId] = rec.status;
          });
          
          // Hydrate records mapping with existing entries
          const finalRecords: Record<string, string> = {};
          initialInterns.forEach((intern) => {
            finalRecords[intern.id] = mapped[intern.id] || "PRESENT"; // Default to PRESENT if unrecorded
          });
          setRecords(finalRecords);
        }
      } catch (err) {
        // Fallback defaults on failure
        const defaults: Record<string, string> = {};
        initialInterns.forEach((intern) => {
          defaults[intern.id] = "PRESENT";
        });
        setRecords(defaults);
      } finally {
        setFetching(false);
      }
    }

    fetchAttendance();
  }, [selectedDate, initialInterns]);

  const handleStatusChange = (internId: string, status: string) => {
    setRecords((prev) => ({ ...prev, [internId]: status }));
  };

  const handleBulkSet = (status: string) => {
    const updated = { ...records };
    initialInterns.forEach((intern) => {
      updated[intern.id] = status;
    });
    setRecords(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        date: selectedDate,
        records: Object.keys(records).map((internId) => ({
          internId,
          status: records[internId],
        })),
      };

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to commit attendance sheets.");
      }

      setMessage({ type: "success", text: "Attendance sheet successfully committed for this date!" });
      router.refresh();
      if (isAdminRole) fetchGlobalLogs();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred during database save." });
    } finally {
      setLoading(false);
    }
  };

  // Filter global logs by search parameters
  const filteredGlobalLogs = globalLogs.filter((log) => {
    const nameMatch = log.intern?.fullName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const idMatch = log.intern?.internId
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === "ALL" || log.status === statusFilter;
    return (nameMatch || idMatch) && statusMatch;
  });

  // Status badges schemas
  const statuses = [
    { value: "PRESENT", label: "Present", activeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", defaultColor: "bg-white/5 border-white/5 text-gray-400 hover:bg-emerald-500/5 hover:text-emerald-400" },
    { value: "ABSENT", label: "Absent", activeColor: "bg-red-500/10 text-red-400 border-red-500/25", defaultColor: "bg-white/5 border-white/5 text-gray-400 hover:bg-red-500/5 hover:text-red-400" },
    { value: "LATE", label: "Late", activeColor: "bg-amber-500/10 text-amber-400 border-amber-500/25", defaultColor: "bg-white/5 border-white/5 text-gray-400 hover:bg-amber-500/5 hover:text-amber-400" },
    { value: "LEAVE", label: "Leave", activeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25", defaultColor: "bg-white/5 border-white/5 text-gray-400 hover:bg-indigo-500/5 hover:text-indigo-400" },
  ];

  return (
    <Card className="border-white/[0.08] max-w-5xl mx-auto shadow-2xl select-none bg-[#0b0f19]/70 backdrop-blur-xl text-white rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-white/[0.06] p-6 bg-white/[0.02] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-heading font-extrabold text-white flex items-center space-x-2">
            <ClipboardList className="h-5 w-5 text-cyan-400 shrink-0" />
            <span>Attendance Logbook Portal</span>
          </CardTitle>
          <CardDescription className="text-xs text-gray-400">
            {isAdminRole 
              ? "Track, manage, and verify chronological check-ins and session details."
              : "Review your personal attendance logging history and telemetry trails."}
          </CardDescription>
        </div>

        {/* Tab Controls for Admins / Founder */}
        {isAdminRole && (
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setActiveTab("roster")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold font-heading rounded-lg flex items-center space-x-1.5 transition-all select-none",
                activeTab === "roster"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/15"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Roster Sheet</span>
            </button>
            
            <button
              onClick={() => setActiveTab("global")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold font-heading rounded-lg flex items-center space-x-1.5 transition-all select-none",
                activeTab === "global"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/15"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span>Everyone's Logs</span>
            </button>

            <button
              onClick={() => setActiveTab("personal")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold font-heading rounded-lg flex items-center space-x-1.5 transition-all select-none",
                activeTab === "personal"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/15"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>My Station</span>
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        
        {/* ========================================== */}
        {/* TAB 1: ROSTER BULK MANAGEMENT (ADMIN ONLY) */}
        {/* ========================================== */}
        {activeTab === "roster" && isAdminRole && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <div>
                <span className="text-[10px] font-heading font-extrabold text-cyan-400 uppercase tracking-widest block mb-1">
                  Calendar Date Target
                </span>
                <p className="text-xs text-gray-400 font-medium">Select a working calendar date to record bulk enrollees status.</p>
              </div>
              <div className="flex items-center space-x-3 bg-[#0f1424] border border-white/10 px-3 py-1.5 rounded-xl shrink-0">
                <Calendar className="h-4.5 w-4.5 text-cyan-400 shrink-0 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={loading || fetching}
                  className="bg-transparent border-0 text-sm text-white focus:outline-none focus:ring-0 font-medium cursor-pointer"
                />
              </div>
            </div>

            {/* Alerts Message */}
            {message && (
              <div
                className={cn(
                  "flex items-center space-x-3 p-4 rounded-xl border text-xs font-semibold select-none",
                  message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse"
                )}
              >
                {message.type === "success" ? (
                  <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Bulk Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <span className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                Bulk Operations Selector
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkSet("PRESENT")}
                  disabled={loading || fetching || initialInterns.length === 0}
                  className="text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/20 text-[10px] h-8.5 rounded-lg border-white/[0.08]"
                >
                  All Present
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkSet("ABSENT")}
                  disabled={loading || fetching || initialInterns.length === 0}
                  className="text-red-400 hover:bg-red-500/5 hover:border-red-500/20 text-[10px] h-8.5 rounded-lg border-white/[0.08]"
                >
                  All Absent
                </Button>
              </div>
            </div>

            {/* Data Table */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto border border-white/[0.06] rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest select-none">
                      <th className="py-3 px-6">ID File</th>
                      <th className="py-3 px-6">Intern Name</th>
                      <th className="py-3 px-6">Department</th>
                      <th className="py-3 px-6 text-center">Status Logging Marker</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs font-semibold text-gray-300">
                    {fetching ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-sm font-semibold text-gray-500 select-none animate-pulse">
                          Hydrating daily attendance roll...
                        </td>
                      </tr>
                    ) : initialInterns.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-sm font-semibold text-gray-500 select-none">
                          No active interns currently enrolled in the roster system.
                        </td>
                      </tr>
                    ) : (
                      initialInterns.map((intern) => (
                        <tr key={intern.id} className="hover:bg-white/[0.02] hover:text-white transition-colors duration-150">
                          <td className="py-4.5 px-6 font-heading font-bold text-white">
                            {intern.internId || intern.id}
                          </td>
                          <td className="py-4.5 px-6 text-white font-bold">
                            {intern.fullName}
                          </td>
                          <td className="py-4.5 px-6 font-medium">
                            {intern.department}
                          </td>
                          <td className="py-4.5 px-6">
                            <div className="flex items-center justify-center space-x-2">
                              {statuses.map((s) => (
                                <label key={s.value} className="relative cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={`status-${intern.id}`}
                                    value={s.value}
                                    checked={records[intern.id] === s.value}
                                    onChange={() => handleStatusChange(intern.id, s.value)}
                                    disabled={loading}
                                    className="peer sr-only"
                                  />
                                  <span className={cn(
                                    "inline-flex items-center px-3 py-1.5 rounded-lg border text-[10px] font-heading font-bold tracking-wide transition-all select-none uppercase",
                                    records[intern.id] === s.value ? s.activeColor : s.defaultColor
                                  )}>
                                    {s.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW */}
              <div className="block md:hidden space-y-4">
                {fetching ? (
                  <div className="py-12 text-center text-xs font-semibold text-gray-500 animate-pulse">
                    Hydrating daily attendance roll...
                  </div>
                ) : initialInterns.length === 0 ? (
                  <div className="py-12 text-center text-xs font-semibold text-gray-500">
                    No active interns enrolled in AIMS.
                  </div>
                ) : (
                  initialInterns.map((intern) => (
                    <div
                      key={`card-${intern.id}`}
                      className="p-4 rounded-xl border border-white/[0.08] bg-[#0b0f19]/70 space-y-3.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-cyan-400 block tracking-wide">
                            {intern.internId || intern.id}
                          </span>
                          <h4 className="text-sm font-bold text-white">{intern.fullName}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">{intern.department} Department</p>
                        </div>
                      </div>

                      {/* Mobile Selection Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {statuses.map((s) => {
                          const isActive = records[intern.id] === s.value;
                          return (
                            <button
                              key={`btn-${intern.id}-${s.value}`}
                              type="button"
                              onClick={() => handleStatusChange(intern.id, s.value)}
                              disabled={loading}
                              className={cn(
                                "py-3 px-4 rounded-xl border text-xs font-bold tracking-wide transition-all duration-200 select-none uppercase flex items-center justify-center space-x-1.5 active:scale-95",
                                isActive ? s.activeColor : s.defaultColor
                              )}
                            >
                              {isActive && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                              <span>{s.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Submission Button */}
              {initialInterns.length > 0 && !fetching && (
                <div className="flex justify-end select-none">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto font-semibold flex items-center justify-center space-x-2 h-11.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 shadow-md"
                    isLoading={loading}
                  >
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                    <span>Save Attendance Roster</span>
                  </Button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: EVERYONE'S DAILY LOGS (ADMIN ONLY) */}
        {/* ========================================== */}
        {activeTab === "global" && isAdminRole && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
              
              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#0f1424] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/40 font-semibold cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="LEAVE">Leave</option>
                  <option value="WORK_PAUSED">Break</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-white/[0.06] rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest select-none">
                    <th className="py-3 px-6">Personnel/Staff</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Check In</th>
                    <th className="py-3 px-6">Check Out</th>
                    <th className="py-3 px-6">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs font-semibold text-gray-300">
                  {globalLogsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm font-semibold text-gray-500 animate-pulse">
                        Retrieving system-wide attendance logbook...
                      </td>
                    </tr>
                  ) : filteredGlobalLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm font-semibold text-gray-500">
                        No attendance logs matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredGlobalLogs.map((log) => {
                      const dateObj = new Date(log.date);
                      const formattedDate = dateObj.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{log.intern.fullName}</span>
                              <span className="text-[10px] text-gray-400 font-medium tracking-wide font-mono mt-0.5">
                                {log.intern.internId || "Staff / Exec"} • {log.intern.roleDomain}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 font-medium">{formattedDate}</td>
                          <td className="py-3.5 px-6">
                            <span className={cn(
                              "inline-flex items-center px-2 py-1 rounded-md text-[10px] font-heading font-bold tracking-wide uppercase",
                              log.status === "PRESENT" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                              log.status === "ABSENT" && "bg-red-500/10 text-red-400 border border-red-500/20",
                              log.status === "LATE" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                              log.status === "LEAVE" && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                              log.status === "WORK_PAUSED" && "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                            )}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-mono text-gray-400">
                            {log.checkIn ? new Date(log.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                          </td>
                          <td className="py-3.5 px-6 font-mono text-gray-400">
                            {log.checkOut ? new Date(log.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                          </td>
                          <td className="py-3.5 px-6 text-gray-400 font-medium truncate max-w-xs">{log.remarks || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3 / GLOBAL DEFAULT: PERSONAL MY STATION*/}
        {/* ========================================== */}
        {activeTab === "personal" && (
          <div className="space-y-6">
            
            {/* Self-Service Clock Station */}
            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#0c1220] via-[#0d1629] to-[#050b18] p-5 shadow-2xl backdrop-blur-md">
              <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none" />
              <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-[60px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25">
                    <Clock className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-indigo-300">
                      My Shift Station
                    </span>
                  </div>
                  <h3 className="text-md font-heading font-extrabold text-white">
                    Self-Service Time Card
                  </h3>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-xl">
                    Log check-ins, record pauses for breaks, and clock out here. Automated heartbeat telemetry tracks active sessions.
                  </p>
                  
                  {(selfSuccess || selfError) && (
                    <div className="mt-2.5">
                      {selfSuccess && (
                        <p className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1.5">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{selfSuccess}</span>
                        </p>
                      )}
                      {selfError && (
                        <p className="text-[11px] font-semibold text-rose-400 flex items-center space-x-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{selfError}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Shift Status</span>
                    {!selfTodayRecord ? (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Not Checked In</span>
                      </div>
                    ) : selfTodayRecord.status === "ABSENT" ? (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Absent</span>
                      </div>
                    ) : selfTodayRecord.status === "WORK_PAUSED" ? (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <AlertTriangle className="h-4 w-4 animate-pulse" />
                        <span>Paused (Break)</span>
                      </div>
                    ) : selfTodayRecord.checkOut ? (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Checked Out</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <CheckCircle className="h-4 w-4" />
                        <span>Active Shift {selfTodayRecord.status === "LATE" && "(Late)"}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {!selfTodayRecord || selfTodayRecord.status === "ABSENT" ? (
                      <Button
                        onClick={handleSelfCheckIn}
                        disabled={selfActionLoading}
                        type="button"
                        variant="primary"
                        className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-white/5 shadow-md shadow-emerald-600/15"
                      >
                        {selfActionLoading ? (
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 shrink-0" />
                        )}
                        <span>Clock In</span>
                      </Button>
                    ) : selfTodayRecord.checkOut ? (
                      <div className="flex items-center space-x-2 text-xs text-gray-400 font-bold px-4 py-2.5 border border-white/10 bg-white/5 rounded-xl select-none">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span>Shift Logged</span>
                      </div>
                    ) : selfTodayRecord.status === "WORK_PAUSED" ? (
                      <Button
                        onClick={handleSelfResumeWork}
                        disabled={selfActionLoading}
                        type="button"
                        variant="primary"
                        className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-white/5 shadow-md shadow-emerald-600/15"
                      >
                        {selfActionLoading ? (
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <Unlock className="h-4 w-4 shrink-0" />
                        )}
                        <span>Resume</span>
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            const reason = prompt("Enter pause reason (e.g. Lunch Break, Client Call):", "Break");
                            if (reason !== null) handleSelfPauseWork(reason);
                          }}
                          disabled={selfActionLoading}
                          type="button"
                          variant="secondary"
                          className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/30 text-amber-400 shadow-md shadow-amber-600/15"
                        >
                          {selfActionLoading ? (
                            <span className="h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                          ) : (
                            <Lock className="h-4 w-4 shrink-0" />
                          )}
                          <span>Break</span>
                        </Button>

                        <Button
                          onClick={handleSelfCheckOut}
                          disabled={selfActionLoading}
                          type="button"
                          variant="primary"
                          className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-white/5 shadow-md shadow-cyan-600/15"
                        >
                          {selfActionLoading ? (
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 shrink-0" />
                          )}
                          <span>Clock Out</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* My Personal Daily Logs */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-heading font-extrabold text-white flex items-center space-x-2 select-none uppercase tracking-wider">
                <Clock className="h-4.5 w-4.5 text-cyan-400" />
                <span>My Attendance Records Log</span>
              </h3>
              <div className="overflow-x-auto border border-white/[0.06] rounded-xl bg-[#0b0f19]/30">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest select-none">
                      <th className="py-3 px-6">Calendar Date</th>
                      <th className="py-3 px-6">Roster Status</th>
                      <th className="py-3 px-6">Shift Checked In</th>
                      <th className="py-3 px-6">Shift Checked Out</th>
                      <th className="py-3 px-6">Audit Trail / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs font-semibold text-gray-300">
                    {selfAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-sm font-semibold text-gray-500">
                          No history logs recorded in AIMS. Check in to begin tracking!
                        </td>
                      </tr>
                    ) : (
                      selfAttendance.map((log) => {
                        const dateObj = new Date(log.date);
                        const formattedDate = dateObj.toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                        return (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-6 font-bold text-white">{formattedDate}</td>
                            <td className="py-3.5 px-6">
                              <span className={cn(
                                "inline-flex items-center px-2 py-1 rounded-md text-[10px] font-heading font-bold tracking-wide uppercase",
                                log.status === "PRESENT" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                log.status === "ABSENT" && "bg-red-500/10 text-red-400 border border-red-500/20",
                                log.status === "LATE" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                                log.status === "LEAVE" && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                                log.status === "WORK_PAUSED" && "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                              )}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 font-mono text-gray-400">
                              {log.checkIn ? new Date(log.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                            </td>
                            <td className="py-3.5 px-6 font-mono text-gray-400">
                              {log.checkOut ? new Date(log.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                            </td>
                            <td className="py-3.5 px-6 text-gray-400 font-medium truncate max-w-xs">{log.remarks || "-"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </CardContent>
    </Card>
  );
}
