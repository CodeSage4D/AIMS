"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { KeyRound, CalendarDays, CheckCircle2, XCircle, Clock, Copy, ShieldAlert, Check } from "lucide-react";

interface ResetRequest {
  id: string;
  internId: string;
  internName: string;
  internEmail: string;
  status: string;
  tempPassword?: string | null;
  createdAt: string;
}

interface LeaveRequest {
  id: string;
  internId: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: string;
  createdAt: string;
  intern: {
    fullName: string;
    internId: string;
    department: string;
  };
}

export default function FounderDashboardQueues() {
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loadingResets, setLoadingResets] = useState(false);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch all requests
  const fetchData = async () => {
    setLoadingResets(true);
    setLoadingLeaves(true);
    try {
      // 1. Fetch password reset requests
      const resetsRes = await fetch("/api/auth/forgot-password");
      if (resetsRes.ok) {
        const resetsData = await resetsRes.json();
        setResets(resetsData.filter((r: ResetRequest) => r.status === "PENDING" || r.tempPassword));
      }

      // 2. Fetch leave applications
      const leavesRes = await fetch("/api/leave");
      if (leavesRes.ok) {
        const leavesData = await leavesRes.json();
        setLeaves(leavesData.filter((l: LeaveRequest) => l.status === "PENDING"));
      }
    } catch (err) {
      console.error("Error fetching Founder queues:", err);
    } finally {
      setLoadingResets(false);
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolveReset = async (requestId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch("/api/auth/forgot-password/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        // Refresh requests data
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to resolve reset request:", err);
    }
  };

  const handleResolveLeave = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        // Refresh requests data
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to resolve leave request:", err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatLeaveType = (type: string) => {
    if (type === "FULL_DAY") return "Full Day Leave";
    if (type === "HALF_DAY_1ST_HALF") return "Half Day (1st Half)";
    if (type === "HALF_DAY_2ND_HALF") return "Half Day (2nd Half)";
    return type;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
      {/* 1. Password Reset Requests Queue */}
      <Card className="border-border/60 shadow-xl overflow-hidden bg-card/60 backdrop-blur-md">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <KeyRound className="h-5 w-5 text-indigo-400" />
              <CardTitle>Intern Password Reset Requests</CardTitle>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {resets.filter(r => r.status === "PENDING").length} Pending
            </span>
          </div>
          <CardDescription>Authorize password override and supply system-generated temporary credentials block.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loadingResets ? (
            <div className="py-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
              Querying security credentials stream...
            </div>
          ) : resets.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-muted-foreground">
              No pending password resets. System is fully operational and compliant.
            </div>
          ) : (
            <div className="space-y-4">
              {resets.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-secondary/15 rounded-xl border border-border/40 hover:border-indigo-500/30 transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-foreground">{req.internName}</span>
                        <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                          {req.internId}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{req.internEmail}</p>
                      <p className="text-[10px] text-muted-foreground/60 flex items-center space-x-1 mt-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(req.createdAt).toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {req.status === "PENDING" ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleResolveReset(req.id, "APPROVE")}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9.5 rounded-lg px-4"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleResolveReset(req.id, "REJECT")}
                            className="bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border-border/60 text-xs h-9.5 rounded-lg px-3"
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-emerald-400 font-medium">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-bold tracking-wider">RESOLVED</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {req.tempPassword && (
                    <div className="mt-4 pt-3.5 border-t border-border/30 flex items-center justify-between bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Generated Temp Password:</span>
                        <p className="text-sm font-mono font-extrabold text-white mt-0.5 select-all">{req.tempPassword}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopy(req.tempPassword!, req.id)}
                        className="h-8.5 w-8.5 rounded-md p-0 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                        title="Copy to clipboard"
                      >
                        {copiedId === req.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Leave Applications Approval Queue */}
      <Card className="border-border/60 shadow-xl overflow-hidden bg-card/60 backdrop-blur-md">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5 text-emerald-400" />
              <CardTitle>Intern Leave Requests</CardTitle>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {leaves.length} Pending
            </span>
          </div>
          <CardDescription>Inspect enrollees' leave dates and reason logs, and auto-update attendance rolls on approval.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loadingLeaves ? (
            <div className="py-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
              Querying leaves stream...
            </div>
          ) : leaves.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-muted-foreground">
              No leave requests require immediate resolution. Daily attendance runs cleanly.
            </div>
          ) : (
            <div className="space-y-4">
              {leaves.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-secondary/15 rounded-xl border border-border/40 hover:border-emerald-500/30 transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white">{req.intern.fullName}</span>
                          <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                            {req.intern.internId}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/80 mt-0.5">{req.intern.department} Department</p>
                      </div>
                      
                      <div className="text-xs text-foreground bg-white/5 rounded-lg p-2.5 border border-border/40 font-medium">
                        <div className="flex items-center space-x-1.5 text-primary text-[10px] uppercase font-bold tracking-wider mb-1">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          <span>{formatLeaveType(req.type)}</span>
                        </div>
                        <p className="font-bold text-white">
                          {new Date(req.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(req.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed italic">
                          " {req.reason} "
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-start">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleResolveLeave(req.id, "APPROVED")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9.5 rounded-lg px-4 flex items-center justify-center space-x-1"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResolveLeave(req.id, "REJECTED")}
                        className="bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border-border/60 hover:border-red-500/25 text-xs h-9.5 rounded-lg px-4 flex items-center justify-center space-x-1"
                      >
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span>Reject</span>
                      </Button>
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
