"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  FileText,
  PlusCircle,
  CheckCircle2,
  Activity,
  Search,
  Briefcase,
  Notebook,
  HelpCircle,
  Inbox
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface LogItem {
  id: string;
  workCompleted: string;
  blockers?: string | null;
  hoursWorked: number;
  notes?: string | null;
  createdAt: string;
  intern: { id: string; fullName: string; internId?: string; department?: string };
  task?: { id: string; title: string } | null;
}

interface ActiveTaskItem {
  id: string;
  title: string;
}

interface DailyLogsClientProps {
  initialLogs: LogItem[];
  activeTasks: ActiveTaskItem[];
  userRole?: string;
}

export default function DailyLogsClient({ initialLogs, activeTasks, userRole = "INTERN" }: DailyLogsClientProps) {
  const router = useRouter();
  const isIntern = userRole === "INTERN";
  const isManager = userRole === "FOUNDER" || userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "HR" || userRole === "TEAM_LEAD";

  // State Management
  const [logs, setLogs] = useState<LogItem[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBlocker, setFilterBlocker] = useState("ALL"); // ALL, BLOCKERS, CLEAR

  // Form State
  const [workCompleted, setWorkCompleted] = useState("");
  const [blockers, setBlockers] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [notes, setNotes] = useState("");
  const [taskId, setTaskId] = useState("");

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!workCompleted.trim() || !hoursWorked) {
      setError("Please fill in the hours worked and describe the completed work.");
      setLoading(false);
      return;
    }

    const hours = parseFloat(hoursWorked);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setError("Hours worked must be a valid number between 0.1 and 24.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workCompleted,
          blockers: blockers.trim() || null,
          hoursWorked: hours,
          notes: notes.trim() || null,
          taskId: taskId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit daily activity log.");

      setSuccess("Your daily activity log was successfully recorded and submitted!");
      setWorkCompleted("");
      setBlockers("");
      setHoursWorked("");
      setNotes("");
      setTaskId("");

      // Refetch logs on success
      const fetchRes = await fetch("/api/daily-logs");
      if (fetchRes.ok) {
        const freshLogs = await fetchRes.json();
        setLogs(freshLogs);
      }
      
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during saving.");
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.intern.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.workCompleted.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.blockers && log.blockers.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.task && log.task.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesBlocker =
      filterBlocker === "ALL" ||
      (filterBlocker === "BLOCKERS" && log.blockers) ||
      (filterBlocker === "CLEAR" && !log.blockers);

    return matchesSearch && matchesBlocker;
  });

  return (
    <div className="space-y-6 select-none animate-fadeIn text-foreground">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-heading font-extrabold text-foreground tracking-tight flex items-center space-x-2">
          <Activity className="h-5 w-5 text-primary" />
          <span>Daily Progress logs</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isIntern
            ? "Record your hours, link active milestones, and log achievements or roadblocks."
            : "Review real-time enrollees activity streams, log times, and roadblock diagnostics."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Submit Log Form (Interns Only) */}
        {isIntern && (
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/60 bg-card/65 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden text-card-foreground">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-foreground flex items-center space-x-2">
                  <Notebook className="h-4.5 w-4.5 text-primary" />
                  <span>Submit Today's Log</span>
                </CardTitle>
                <CardDescription>Document completed tasks, logged hours, and any blockers.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={handleSubmitLog} className="space-y-4">
                  {/* Status Banner Messages */}
                  {error && (
                    <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-pulse font-semibold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  {/* Hours & Task linkage in single row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Hours Logged Today"
                      placeholder="e.g. 7.5"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="24"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                      required
                      className="bg-background border-border text-foreground rounded-xl"
                    />

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                        Link Task / Goal
                      </label>
                      <select
                        value={taskId}
                        onChange={(e) => setTaskId(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                      >
                        <option value="" className="bg-card text-foreground">General Workspace (None)</option>
                        {activeTasks.map((t) => (
                          <option key={t.id} value={t.id} className="bg-card text-foreground">
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Work Description */}
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                      Work Completed Today
                    </label>
                    <textarea
                      placeholder="Explain in detail what models, UI modules, APIs, or docs you resolved today..."
                      value={workCompleted}
                      onChange={(e) => setWorkCompleted(e.target.value)}
                      required
                      rows={4}
                      className="flex w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted-foreground"
                    />
                  </div>

                  {/* Blockers */}
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest flex items-center space-x-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <span>Blockers / Roadblocks (Optional)</span>
                    </label>
                    <textarea
                      placeholder="Document any technical blockers, environment variables mismatch, or key help required..."
                      value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                      rows={2}
                      className="flex w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted-foreground"
                    />
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      placeholder="Any notes or remarks to share with your supervisor..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={1}
                      className="flex w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted-foreground"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full h-11 text-xs font-semibold font-heading bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 rounded-xl text-white shadow-md flex items-center justify-center space-x-2"
                    isLoading={loading}
                  >
                    <PlusCircle className="h-4.5 w-4.5" />
                    <span>Submit Work Log</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* RIGHT COLUMN: Audit Stream Timeline */}
        <div className={cn("space-y-4", isIntern ? "lg:col-span-7" : "lg:col-span-12")}>
          {/* Filters Bar Card */}
          <Card className="border-border/60 bg-card/65 backdrop-blur-md shadow-md rounded-xl p-4 text-card-foreground flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={isManager ? "Search intern, task, work text..." : "Search my logs..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 rounded-xl pl-10 pr-4 text-sm bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Selector filter for blockers */}
            <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-end">
              <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest hidden sm:inline">Filter:</span>
              <div className="flex items-center bg-background border border-border rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setFilterBlocker("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    filterBlocker === "ALL" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Logs
                </button>
                <button
                  onClick={() => setFilterBlocker("BLOCKERS")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1",
                    filterBlocker === "BLOCKERS" ? "bg-amber-600 text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>Blockers</span>
                </button>
                <button
                  onClick={() => setFilterBlocker("CLEAR")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    filterBlocker === "CLEAR" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Clear Logs
                </button>
              </div>
            </div>
          </Card>

          {/* Timeline List */}
          <div className="space-y-4">
            {filteredLogs.length === 0 ? (
              <Card className="border-border bg-card/65 backdrop-blur-md p-12 text-center text-muted-foreground select-none">
                <Inbox className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-xs font-semibold">No daily activity logs found matching the filter criteria.</p>
              </Card>
            ) : (
              <div className="relative border-l border-border/40 pl-5 ml-3 space-y-6">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="relative group select-text">
                    {/* Timeline Dot Indicator */}
                    <div className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary ring-4 ring-primary/10 group-hover:scale-125 transition-transform duration-200" />
                    
                    <Card className="border-border/60 bg-card/65 backdrop-blur-md hover:border-primary/30 transition-all duration-300 shadow-md rounded-xl p-4 sm:p-5 text-card-foreground">
                      {/* Timeline Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 pb-3 border-b border-border/40 mb-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-sm text-foreground flex items-center space-x-1.5">
                              <User className="h-4 w-4 text-indigo-500 shrink-0" />
                              <span>{log.intern.fullName}</span>
                            </span>
                            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded">
                              {log.intern.internId}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{log.intern.department} Program</p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto text-[10px] font-semibold text-muted-foreground shrink-0 mt-0.5">
                          <div className="flex items-center space-x-1 py-1 px-2.5 bg-cyan-500/10 text-cyan-600 rounded-full border border-cyan-500/20">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{log.hoursWorked} hrs logged</span>
                          </div>
                          <div className="flex items-center space-x-1 py-1 px-2 bg-secondary/20 rounded border border-border/40">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(log.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Work completed description */}
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Completed Work:</span>
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">{log.workCompleted}</p>
                        </div>

                        {/* Blockers element */}
                        {log.blockers && (
                          <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-500 tracking-wider block">Log Blockers & Roadmap Impediments:</span>
                              <p className="text-xs text-foreground font-semibold leading-relaxed mt-0.5">{log.blockers}</p>
                            </div>
                          </div>
                        )}

                        {/* Linked task */}
                        {log.task && (
                          <div className="flex items-center space-x-1.5 text-[10px] text-primary font-bold">
                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                            <span>Linked Task:</span>
                            <span className="hover:underline cursor-pointer">{log.task.title}</span>
                          </div>
                        )}

                        {/* Optional notes */}
                        {log.notes && (
                          <div className="text-[11px] text-muted-foreground italic border-t border-border/30 pt-2 flex items-center space-x-1">
                            <Notebook className="h-3 w-3 shrink-0" />
                            <span>Notes: {log.notes}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
