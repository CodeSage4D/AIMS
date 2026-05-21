"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar, CheckCircle2, ShieldCheck, AlertTriangle, Users, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

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
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred during database save." });
    } finally {
      setLoading(false);
    }
  };

  // Status badges schemas
  const statuses = [
    { value: "PRESENT", label: "Present", activeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", defaultColor: "bg-white/5 border-white/5 text-gray-400 hover:bg-emerald-500/5 hover:text-emerald-400" },
    { value: "ABSENT", label: "Absent", activeColor: "bg-red-500/10 text-red-400 border-red-500/25", defaultColor: "bg-white/5 border-white/5 text-gray-400 hover:bg-red-500/5 hover:text-red-400" },
    { value: "LATE", label: "Late", activeColor: "bg-amber-500/10 text-amber-400 border-amber-500/25", defaultColor: "bg-white/5 border-white/5 text-gray-400 hover:bg-amber-500/5 hover:text-amber-400" },
    { value: "LEAVE", label: "Leave", activeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25", defaultColor: "bg-white/5 border-white/5 text-gray-400 hover:bg-indigo-500/5 hover:text-indigo-400" },
  ];

  return (
    <Card className="border-white/[0.08] max-w-5xl mx-auto shadow-2xl select-none bg-[#0b0f19]/70 backdrop-blur-xl text-white rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-white/[0.06] p-6 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-heading font-extrabold text-white">Daily Attendance Roster</CardTitle>
          <CardDescription className="text-xs text-gray-400">Log, update, and audit daily attendance codes for active interns.</CardDescription>
        </div>
        {/* Date Selector input widget */}
        <div className="flex items-center space-x-3 shrink-0 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
          <Calendar className="h-4.5 w-4.5 text-cyan-400 shrink-0 pointer-events-none" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={loading || fetching}
            className="bg-transparent border-0 text-sm text-white focus:outline-none focus:ring-0 font-medium cursor-pointer"
          />
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
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

        {/* Dynamic Bulk Action shortcuts */}
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
          {/* DESKTOP TABLE VIEW (Visible on md and larger) */}
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

          {/* MOBILE CARD VIEW (Visible on smaller than md) */}
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

                  {/* Mobile Large Touchable Selection Triggers */}
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
                className="w-full sm:w-auto font-semibold flex items-center justify-center space-x-2 h-11.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5"
                isLoading={loading}
              >
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                <span>Save Attendance Roster</span>
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
