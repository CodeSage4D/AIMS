"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock, Timer, CheckCircle, AlertTriangle, Play, Pause, ShieldCheck, Unlock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ExecutiveClockStation() {
  const [time, setTime] = useState("");
  const [sessionTime, setSessionTime] = useState("00:00:00");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sessionSeconds = useRef(0);

  // 1. Real-time clock with seconds
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }) +
          " • " +
          now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Active Session Time tracking
  useEffect(() => {
    const interval = setInterval(() => {
      sessionSeconds.current += 1;
      const hrs = Math.floor(sessionSeconds.current / 3600)
        .toString()
        .padStart(2, "0");
      const mins = Math.floor((sessionSeconds.current % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const secs = (sessionSeconds.current % 60).toString().padStart(2, "0");
      setSessionTime(`${hrs}:${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 3. Fetch history/state
  const fetchState = async () => {
    try {
      const res = await fetch("/api/attendance/history");
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.history || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const getTodayRecord = () => {
    const today = new Date();
    const offsetIST = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(today.getTime() + offsetIST);
    const dateStr = `${todayIST.getUTCFullYear()}-${(todayIST.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}-${todayIST.getUTCDate().toString().padStart(2, "0")}`;

    return attendance.find((att) => {
      const attDate = new Date(att.date);
      const attStr = `${attDate.getUTCFullYear()}-${(attDate.getUTCMonth() + 1)
        .toString()
        .padStart(2, "0")}-${attDate.getUTCDate().toString().padStart(2, "0")}`;
      return attStr === dateStr;
    });
  };

  const todayRecord = getTodayRecord();

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/attendance/check-in", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check-in.");
      setSuccess("Checked in successfully!");
      fetchState();
    } catch (err: any) {
      setError(err.message || "Check-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/attendance/check-out", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check-out.");
      setSuccess("Checked out successfully!");
      fetchState();
    } catch (err: any) {
      setError(err.message || "Check-out failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    const reason = prompt("Enter break reason:", "Lunch Break");
    if (reason === null) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/attendance/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to pause.");
      setSuccess("Session paused successfully!");
      fetchState();
    } catch (err: any) {
      setError(err.message || "Pause failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/attendance/resume", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resume.");
      setSuccess("Session resumed successfully!");
      fetchState();
    } catch (err: any) {
      setError(err.message || "Resume failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1220] via-[#0d1629] to-[#050b18] p-5 shadow-2xl backdrop-blur-md">
      <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none" />
      <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-[60px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <Clock className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-cyan-300">
              Live Office Clock & Attendance
            </span>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-300 font-mono tracking-tight">
              {time || "Loading time..."}
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-gray-400 font-medium font-mono">
              <Timer className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Active Session Time: <span className="text-white font-bold">{sessionTime}</span></span>
            </div>
          </div>

          {(success || error) && (
            <div className="mt-1">
              {success && (
                <p className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 shrink-0" />
                  <span>{success}</span>
                </p>
              )}
              {error && (
                <p className="text-[10px] font-bold text-rose-400 flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="flex flex-col space-y-1">
            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Shift Status</span>
            {!todayRecord ? (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <AlertTriangle className="h-4 w-4" />
                <span>Not Checked In</span>
              </div>
            ) : todayRecord.status === "ABSENT" ? (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <AlertTriangle className="h-4 w-4" />
                <span>Absent</span>
              </div>
            ) : todayRecord.status === "WORK_PAUSED" ? (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <AlertTriangle className="h-4 w-4 animate-pulse" />
                <span>Break</span>
              </div>
            ) : todayRecord.checkOut ? (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <ShieldCheck className="h-4 w-4" />
                <span>Shift Ended</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold w-fit shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <CheckCircle className="h-4 w-4" />
                <span>Active Shift {todayRecord.status === "LATE" && "(Late)"}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!todayRecord || todayRecord.status === "ABSENT" ? (
              <Button
                onClick={handleCheckIn}
                disabled={loading}
                type="button"
                variant="primary"
                className="h-10 px-5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-white/5 shadow-md shadow-emerald-600/15"
              >
                <Play className="h-3.5 w-3.5 shrink-0" />
                <span>Clock In</span>
              </Button>
            ) : todayRecord.checkOut ? (
              <div className="flex items-center space-x-1 text-xs text-gray-400 font-bold px-3 py-2 border border-white/10 bg-white/5 rounded-xl select-none">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Logged</span>
              </div>
            ) : todayRecord.status === "WORK_PAUSED" ? (
              <Button
                onClick={handleResume}
                disabled={loading}
                type="button"
                variant="primary"
                className="h-10 px-5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-white/5 shadow-md shadow-emerald-600/15"
              >
                <Unlock className="h-3.5 w-3.5 shrink-0" />
                <span>Resume</span>
              </Button>
            ) : (
              <>
                <Button
                  onClick={handlePause}
                  disabled={loading}
                  type="button"
                  variant="secondary"
                  className="h-10 px-4 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-1.5 bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/30 text-amber-400"
                >
                  <Pause className="h-3.5 w-3.5 shrink-0" />
                  <span>Break</span>
                </Button>

                <Button
                  onClick={handleCheckOut}
                  disabled={loading}
                  type="button"
                  variant="primary"
                  className="h-10 px-5 rounded-xl text-xs font-bold font-heading flex items-center justify-center space-x-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-white/5 shadow-md shadow-cyan-600/15"
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>Clock Out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
