"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
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
    { value: "PRESENT", label: "Present", color: "peer-checked:bg-emerald-500/10 peer-checked:text-emerald-400 peer-checked:border-emerald-500/30 text-emerald-500/70 border-emerald-500/10 hover:bg-emerald-500/5" },
    { value: "ABSENT", label: "Absent", color: "peer-checked:bg-red-500/10 peer-checked:text-red-400 peer-checked:border-red-500/30 text-red-500/70 border-red-500/10 hover:bg-red-500/5" },
    { value: "LATE", label: "Late Log", color: "peer-checked:bg-amber-500/10 peer-checked:text-amber-400 peer-checked:border-amber-500/30 text-amber-500/70 border-amber-500/10 hover:bg-amber-500/5" },
    { value: "LEAVE", label: "On Leave", color: "peer-checked:bg-blue-500/10 peer-checked:text-blue-400 peer-checked:border-blue-500/30 text-blue-500/70 border-blue-500/10 hover:bg-blue-500/5" },
  ];

  return (
    <Card className="border-border/60 max-w-5xl mx-auto shadow-2xl select-none">
      <CardHeader className="border-b border-border/40 p-6 bg-secondary/10 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <CardTitle>Daily Attendance Roster</CardTitle>
          <CardDescription>Log, update, and audit daily attendance codes for active interns.</CardDescription>
        </div>
        {/* Date Selector input widget */}
        <div className="flex items-center space-x-3.5 shrink-0 bg-input border border-border px-3 py-1.5 rounded-md">
          <Calendar className="h-4.5 w-4.5 text-primary shrink-0 pointer-events-none" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={loading || fetching}
            className="bg-transparent border-0 text-sm text-foreground focus:outline-none focus:ring-0 font-medium cursor-pointer"
          />
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Alerts Message */}
        {message && (
          <div
            className={cn(
              "flex items-center space-x-3 p-3.5 rounded-md border text-xs font-semibold select-none",
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-destructive/10 border-destructive/25 text-destructive animate-pulse"
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
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-secondary/15 rounded-md border border-border/40">
          <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Bulk Operations Selector
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleBulkSet("PRESENT")}
              disabled={loading || fetching || initialInterns.length === 0}
              className="text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/20 text-[10px] h-8"
            >
              All Present
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleBulkSet("ABSENT")}
              disabled={loading || fetching || initialInterns.length === 0}
              className="text-red-400 hover:bg-red-500/5 hover:border-red-500/20 text-[10px] h-8"
            >
              All Absent
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="overflow-x-auto border border-border/40 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/15 text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest select-none">
                  <th className="py-3 px-6">ID File</th>
                  <th className="py-3 px-6">Intern Name</th>
                  <th className="py-3 px-6">Department</th>
                  <th className="py-3 px-6 text-center">Status Logging Marker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-xs font-semibold text-muted-foreground">
                {fetching ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm font-semibold text-muted-foreground select-none animate-pulse">
                      Hydrating daily attendance roll...
                    </td>
                  </tr>
                ) : initialInterns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm font-semibold text-muted-foreground select-none">
                      No active interns currently enrolled in the roster system.
                    </td>
                  </tr>
                ) : (
                  initialInterns.map((intern) => (
                    <tr key={intern.id} className="hover:bg-secondary/5 hover:text-foreground transition-colors duration-150">
                      <td className="py-4.5 px-6 font-heading font-bold text-foreground">
                        {intern.internId || intern.id}
                      </td>
                      <td className="py-4.5 px-6 text-foreground font-bold">
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
                                "inline-flex items-center px-3 py-1.5 rounded border text-[10px] font-heading font-bold tracking-wide transition-all select-none uppercase",
                                s.color
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

          {/* Submission Button */}
          {initialInterns.length > 0 && !fetching && (
            <div className="flex justify-end select-none">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="font-semibold flex items-center space-x-1.5 h-11"
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
