"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { 
  Activity, 
  Search, 
  RefreshCw, 
  Clock, 
  User, 
  Briefcase, 
  Coffee,
  CircleDot
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EnrolleePresence {
  id: string;
  internId: string;
  fullName: string;
  roleDomain: string;
  department: string;
  supervisorName: string;
  presenceState: "ACTIVE" | "IDLE" | "PAUSED" | "OFFLINE";
  lastActive: string | null;
}

export default function RealTimePresenceMonitor() {
  const [roster, setRoster] = useState<EnrolleePresence[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTelemetry = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/attendance/telemetry/active");
      if (!res.ok) throw new Error("Failed to query live telemetry stream.");
      const data = await res.json();
      if (data.success) {
        setRoster(data.roster);
        setError(null);
      } else {
        throw new Error(data.error || "Failed to parse telemetry data.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load presence monitors.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    // Auto-refresh presence telemetry stream every 30 seconds
    const interval = setInterval(() => {
      fetchTelemetry();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredRoster = roster.filter(
    (intern) =>
      intern.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.internId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = roster.reduce(
    (acc, curr) => {
      acc[curr.presenceState]++;
      return acc;
    },
    { ACTIVE: 0, IDLE: 0, PAUSED: 0, OFFLINE: 0 }
  );

  const formatLastActive = (isoString: string | null) => {
    if (!isoString) return "No shifts today";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Offline";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md shadow-2xl">
      <CardHeader className="border-b border-white/[0.06] pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="flex items-center space-x-2.5">
            <Activity className="h-5 w-5 text-indigo-400 animate-pulse" />
            <span>Active Workforce Presence Telemetry</span>
          </CardTitle>
          <CardDescription className="text-xs text-gray-400 mt-0.5">
            Live telemetric radar monitoring keyboard/mouse shifts activity heartbeat checkpoints.
          </CardDescription>
        </div>

        <button
          onClick={() => fetchTelemetry(true)}
          disabled={refreshing}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-xs font-bold transition-all shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-indigo-400", refreshing && "animate-spin")} />
          <span>{refreshing ? "Refreshing..." : "Force Sync"}</span>
        </button>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Presence Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-emerald-450 block">Active Status</span>
              <span className="text-2xl font-heading font-extrabold text-emerald-400">{stats.ACTIVE}</span>
            </div>
            <span className="relative flex h-3 w-3 mr-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-amber-450 block">Idle State</span>
              <span className="text-2xl font-heading font-extrabold text-amber-400">{stats.IDLE}</span>
            </div>
            <span className="relative flex h-3 w-3 mr-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/[0.02] flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-blue-450 block">On Break</span>
              <span className="text-2xl font-heading font-extrabold text-blue-400">{stats.PAUSED}</span>
            </div>
            <span className="relative flex h-3 w-3 mr-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-gray-450 block">Offline Roster</span>
              <span className="text-2xl font-heading font-extrabold text-gray-400">{stats.OFFLINE}</span>
            </div>
            <span className="h-3 w-3 rounded-full bg-gray-600 mr-1 shrink-0" />
          </div>
        </div>

        {/* Telemetry Filter Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search active personnel by name, department signature, or immutable ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white rounded-xl focus:border-indigo-500/70 text-xs h-11"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-semibold text-gray-500 uppercase tracking-widest flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
            <span>Engaging Live Telemetry Radars...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-xs font-semibold text-rose-400 border border-rose-500/20 bg-rose-500/5 rounded-xl">
            {error}
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="py-16 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
            No active enrollees match the search filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoster.map((intern) => {
              const isActive = intern.presenceState === "ACTIVE";
              const isIdle = intern.presenceState === "IDLE";
              const isPaused = intern.presenceState === "PAUSED";
              const isOffline = intern.presenceState === "OFFLINE";

              return (
                <div
                  key={intern.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 hover:translate-y-[-1px]",
                    isActive
                      ? "bg-emerald-500/[0.02] border-emerald-500/20 hover:border-emerald-500/35 hover:bg-emerald-500/[0.04]"
                      : isIdle
                      ? "bg-amber-500/[0.02] border-amber-500/20 hover:border-amber-500/35 hover:bg-amber-500/[0.04]"
                      : isPaused
                      ? "bg-blue-500/[0.02] border-blue-500/20 hover:border-blue-500/35 hover:bg-blue-500/[0.04]"
                      : "bg-white/[0.01] border-white/[0.06] hover:border-white/15"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white tracking-tight truncate">
                          {intern.fullName}
                        </h4>
                        <span className="font-mono text-[9px] text-cyan-400 font-bold">
                          {intern.internId}
                        </span>
                      </div>
                      
                      <div className="shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[8.5px] font-heading font-extrabold uppercase border bg-white/5">
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          isActive && "bg-emerald-400 animate-pulse",
                          isIdle && "bg-amber-400 animate-pulse",
                          isPaused && "bg-blue-400 animate-pulse",
                          isOffline && "bg-gray-600"
                        )} />
                        <span className={cn(
                          isActive && "text-emerald-400",
                          isIdle && "text-amber-400",
                          isPaused && "text-blue-400",
                          isOffline && "text-gray-400"
                        )}>
                          {intern.presenceState}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-400 leading-relaxed font-semibold space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span>{intern.department} Division</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <User className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span>Mentor: {intern.supervisorName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Last Seen</span>
                    </div>
                    <span className={cn("font-mono font-bold text-xs select-all", isOffline ? "text-gray-500" : "text-indigo-300")}>
                      {formatLastActive(intern.lastActive)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
