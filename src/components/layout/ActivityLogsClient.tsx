"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  ShieldAlert,
  Search,
  Calendar,
  User,
  Tag,
  RefreshCw,
  FolderOpen,
  ArrowDownRight,
  TrendingDown,
  Activity,
  Filter
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface LogUser {
  fullName: string;
  role: string;
}

interface LogItem {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user?: LogUser | null;
}

interface ActivityLogsClientProps {
  initialLogs: LogItem[];
}

const ACTION_PILLS = [
  { label: "All Audits", val: "ALL" },
  { label: "Onboardings", val: "ONBOARD_INTERN" },
  { label: "Attendance", val: "ATTENDANCE_SUBMIT" },
  { label: "Tasks", val: "ASSIGN_TASK" },
  { label: "Verifications", val: "VERIFY_DOCUMENT" }
];

export default function ActivityLogsClient({ initialLogs }: ActivityLogsClientProps) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  // Filtering Logic
  const filteredLogs = initialLogs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.user?.fullName && log.user.fullName.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = actionFilter === "ALL" || log.action === actionFilter;

    return matchesSearch && matchesCategory;
  });

  // Unique styling based on log action categories
  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "ONBOARD_INTERN":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "ATTENDANCE_SUBMIT":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "ASSIGN_TASK":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "VERIFY_DOCUMENT":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "DELETE_DOCUMENT":
      case "TERMINATE_INTERN":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getActionLabel = (action: string) => {
    return action.replace(/_/g, " ");
  };

  return (
    <div className="space-y-6 select-none relative animate-fadeIn">
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-foreground tracking-tight flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
            <span>AIMS Security Audit Trail</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable chronological logging of all intern creations, attendance locks, task items, and compliance overrides.
          </p>
        </div>
      </div>

      {/* 2. Analytical summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-border/60 p-4 bg-secondary/5">
          <div className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Total Audited Records
          </div>
          <div className="text-2xl font-heading font-extrabold text-foreground mt-1.5">
            {initialLogs.length}
          </div>
        </Card>
        <Card className="border-border/60 p-4 bg-secondary/5">
          <div className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Results Found
          </div>
          <div className="text-2xl font-heading font-extrabold text-primary mt-1.5">
            {filteredLogs.length}
          </div>
        </Card>
        <Card className="border-border/60 p-4 bg-secondary/5">
          <div className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Audit Level Status
          </div>
          <div className="text-2xl font-heading font-extrabold text-emerald-400 mt-1.5 flex items-center space-x-1.5">
            <Activity className="h-4.5 w-4.5 animate-pulse text-emerald-400" />
            <span>LIVE MONITOR</span>
          </div>
        </Card>
      </div>

      {/* 3. Main Timeline Frame */}
      <Card className="border-border/60 overflow-hidden shadow-lg p-0">
        {/* Search & Filter header */}
        <div className="p-4 border-b border-border/40 bg-secondary/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3 bg-input border border-border px-3.5 h-11 rounded-md max-w-md w-full focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              placeholder="Search audit trail for actions, enrollees, users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none bg-transparent p-0 w-full h-full text-sm text-foreground focus:ring-0 focus:outline-none placeholder-muted-foreground/80"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
            {ACTION_PILLS.map((pill) => (
              <button
                key={pill.val}
                onClick={() => setActionFilter(pill.val)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-heading font-bold rounded border uppercase tracking-wider shrink-0 transition-all select-none",
                  actionFilter === pill.val
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                    : "bg-secondary/20 text-muted-foreground border-border/65 hover:text-foreground hover:bg-secondary/40"
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chronological Timeline scrolling view */}
        <CardContent className="p-6 relative">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-2.5">
              <FolderOpen className="h-8 w-8 text-muted-foreground/50 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground/80">No audit events match your parameters.</span>
            </div>
          ) : (
            <div className="relative border-l border-border/60 pl-6.5 space-y-6">
              {filteredLogs.map((log) => (
                <div key={log.id} className="relative group select-none">
                  {/* Timeline Dot Indicator */}
                  <span className="absolute -left-[32.5px] top-1.5 h-4 w-4 rounded-full bg-card border-2 border-primary/50 flex items-center justify-center group-hover:border-primary transition-all shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  </span>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2.5 sm:space-y-0 p-4 bg-secondary/10 rounded-md border border-border/40 hover:border-border/80 hover:bg-secondary/15 transition-all duration-200">
                    <div className="space-y-2 min-w-0 pr-4">
                      {/* Meta information tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center space-x-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                          <span className="text-foreground font-bold">{log.user?.fullName || "System Admin"}</span>
                        </span>
                        <span className="text-[8px] font-heading font-extrabold bg-secondary text-primary border border-border px-1.5 py-0.5 rounded select-none uppercase tracking-wider">
                          {log.user?.role || "ADMIN"}
                        </span>
                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-heading font-extrabold border uppercase tracking-wider", getActionBadgeColor(log.action))}>
                          {getActionLabel(log.action)}
                        </span>
                      </div>

                      {/* Detailed Description */}
                      <p className="text-xs font-medium text-foreground leading-relaxed">
                        {log.description}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center space-x-1.5 shrink-0 select-none text-[10px] text-muted-foreground/80 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
