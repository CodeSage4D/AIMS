import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  User,
  Calendar,
  CheckSquare,
  FileText,
  Activity,
  Briefcase,
  Mail,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  ShieldCheck,
  Building
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    return notFound();
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role || "INTERN";

  // Dynamic background sweep to keep data synchronized
  try {
    const { autoMarkAbsent } = await import("@/lib/attendanceScheduler");
    await autoMarkAbsent();
  } catch (schedErr) {
    console.warn("[Profile Loader] dynamic scheduler bypass:", schedErr);
  }

  // 1. Fetch user data and deep relationships
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      internProfile: {
        include: {
          supervisor: {
            select: {
              fullName: true,
              email: true,
            },
          },
          attendance: {
            orderBy: { date: "desc" },
          },
          tasks: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!user) {
    return notFound();
  }

  const isIntern = userRole === "INTERN";
  const internProfile = user.internProfile;

  // 2. Resolve additional administrative metrics
  let supervisedCount = 0;
  let tasksAssignedCount = 0;

  if (userRole === "TEAM_LEAD") {
    supervisedCount = await db.intern.count({
      where: { supervisorId: userId },
    });
    tasksAssignedCount = await db.task.count({
      where: { assignedById: userId },
    });
  } else if (userRole === "FOUNDER" || userRole === "HR") {
    supervisedCount = await db.intern.count({
      where: { status: "ACTIVE" },
    });
    tasksAssignedCount = await db.task.count();
  }

  // 3. Resolve Intern Performance / Work Statistics
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let attendanceRate = 100;
  let totalTasks = 0;
  let completedTasks = 0;
  let pendingTasks = 0;
  let taskCompletionRate = 100;

  if (isIntern && internProfile) {
    const attendance = internProfile.attendance;
    const tasks = internProfile.tasks;

    totalTasks = tasks.length;
    completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
    pendingTasks = totalTasks - completedTasks;
    taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    presentCount = attendance.filter((a) => a.status === "PRESENT").length;
    absentCount = attendance.filter((a) => a.status === "ABSENT").length;
    lateCount = attendance.filter((a) => a.status === "LATE").length;
    leaveCount = attendance.filter((a) => a.status === "LEAVE").length;
    const totalAttendanceDays = attendance.length;
    const activeDays = presentCount + lateCount;
    attendanceRate = totalAttendanceDays > 0 ? Math.round((activeDays / totalAttendanceDays) * 100) : 100;
  }

  // Maps roles to badges
  const getRoleBadge = (r: string) => {
    switch (r) {
      case "FOUNDER":
        return "bg-violet-500/10 text-violet-400 border border-violet-500/20";
      case "HR":
        return "bg-pink-500/10 text-pink-400 border border-pink-500/20";
      case "TEAM_LEAD":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "INTERN":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fadeIn text-white max-w-5xl mx-auto">
      
      {/* 1. Glassmorphic Cover Header Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0c1220] via-[#0d1629] to-[#050b18] p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-20 -top-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-violet-600/15 blur-[60px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
            {/* User Avatar Circle */}
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 p-0.5 shadow-2xl shrink-0">
              <div className="h-full w-full rounded-full bg-[#0b0f19] flex items-center justify-center text-4xl font-heading font-extrabold text-white">
                {user.fullName[0].toUpperCase()}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
                  {user.fullName}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-widest ${getRoleBadge(userRole)}`}>
                  {userRole.replace("_", " ")} Badge
                </span>
              </div>
              
              <p className="text-xs text-gray-400 font-medium">
                Email: <span className="text-gray-300 font-bold">{user.email}</span>
                {user.username && (
                  <> • Username: <span className="text-gray-300 font-mono font-bold">{user.username}</span></>
                )}
              </p>

              {isIntern && internProfile ? (
                <div className="text-xs text-gray-400 font-medium space-y-1">
                  <p>
                    Intern ID: <span className="font-mono text-cyan-400 font-bold">{internProfile.internId}</span> • Department: <span className="text-white font-bold">{internProfile.department}</span>
                  </p>
                  <p>
                    Role Domain: <span className="text-white font-bold">{internProfile.roleDomain}</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 font-medium">
                  Administrative Access • Department: <span className="text-white font-bold">System Administration</span>
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <Link href="/">
              <Button variant="outline" size="sm" className="h-10 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 transition-all">
                Dashboard Overview
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Analytical Summary Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Details */}
        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-6">
          <CardHeader className="p-0 pb-4 border-b border-white/[0.06] mb-4">
            <CardTitle className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
              <User className="h-4.5 w-4.5 text-cyan-400" />
              <span>Personal Metadata</span>
            </CardTitle>
            <CardDescription className="text-[10px] text-gray-400">Database values currently logged</CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-3.5 text-xs text-gray-400">
            <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
              <span>Official Full Name</span>
              <span className="text-white font-bold">{user.fullName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
              <span>Primary Email</span>
              <span className="text-white font-bold truncate max-w-[200px]">{user.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
              <span>System Role</span>
              <span className="text-white font-bold uppercase">{userRole.replace("_", " ")}</span>
            </div>
            
            {isIntern && internProfile ? (
              <>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span>Intern Serial ID</span>
                  <span className="text-cyan-400 font-mono font-bold">{internProfile.internId}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span>Official Joining Date</span>
                  <span className="text-white font-bold">{formatDate(internProfile.startDate)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Direct Supervisor</span>
                  <span className="text-white font-bold">
                    {internProfile.supervisor?.fullName || "Founder/HR"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span>AIMS Account ID</span>
                  <span className="text-cyan-400 font-mono font-bold">{user.id.substring(0, 18)}...</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                  <span>Creation Date</span>
                  <span className="text-white font-bold">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Scope Control</span>
                  <span className="text-white font-bold">FULL SYSTEM ACCESS</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Attendance Summary */}
        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-6">
          <CardHeader className="p-0 pb-4 border-b border-white/[0.06] mb-4">
            <CardTitle className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
              <Activity className="h-4.5 w-4.5 text-emerald-400" />
              <span>Attendance Roster Logs</span>
            </CardTitle>
            <CardDescription className="text-[10px] text-gray-400">Cumulative roll summaries</CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            {isIntern && internProfile ? (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-xs text-gray-400 font-medium">Compliance Rate</span>
                  <span className="text-2xl font-heading font-extrabold text-white">{attendanceRate}%</span>
                </div>
                
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-gray-400">
                  <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Present</span>
                    <span className="text-lg font-heading font-extrabold text-white">{presentCount}</span>
                    <span className="text-[10px] ml-1">days</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-wide">Late</span>
                    <span className="text-lg font-heading font-extrabold text-white">{lateCount}</span>
                    <span className="text-[10px] ml-1">days</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/10">
                    <span className="block text-[10px] font-bold text-red-400 uppercase tracking-wide">Absent</span>
                    <span className="text-lg font-heading font-extrabold text-white">{absentCount}</span>
                    <span className="text-[10px] ml-1">days</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Leave</span>
                    <span className="text-lg font-heading font-extrabold text-white">{leaveCount}</span>
                    <span className="text-[10px] ml-1">days</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 space-y-3">
                <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto opacity-60" />
                <p className="font-semibold leading-relaxed">
                  Daily check-in rosters are gated exclusively for Intern accounts.
                </p>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left text-gray-400 mt-2 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider block">Supervised Capacity</span>
                  <span className="text-white font-extrabold text-sm">{supervisedCount} Active Interns</span>
                  <p className="text-[10px]">Under system monitoring scope.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Task Checklist */}
        <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-6">
          <CardHeader className="p-0 pb-4 border-b border-white/[0.06] mb-4">
            <CardTitle className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
              <CheckSquare className="h-4.5 w-4.5 text-indigo-400" />
              <span>Assigned Task Checklist</span>
            </CardTitle>
            <CardDescription className="text-[10px] text-gray-400">Assigned task status records</CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            {isIntern && internProfile ? (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-xs text-gray-400 font-medium">Completion Rate</span>
                  <span className="text-2xl font-heading font-extrabold text-white">{taskCompletionRate}%</span>
                </div>
                
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${taskCompletionRate}%` }}
                  />
                </div>

                <div className="space-y-3 pt-1 text-xs text-gray-400">
                  <div className="flex justify-between py-2 border-b border-white/[0.04]">
                    <span>Total Tasks Assigned</span>
                    <span className="text-white font-bold">{totalTasks}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/[0.04] text-emerald-400">
                    <span>Completed Tasks</span>
                    <span className="font-bold">{completedTasks}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/[0.04] text-amber-400">
                    <span>Pending / In Progress</span>
                    <span className="font-bold">{pendingTasks}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 space-y-3">
                <Briefcase className="h-10 w-10 text-indigo-400 mx-auto opacity-60" />
                <p className="font-semibold leading-relaxed">
                  Goal assignments checks are loaded inside the Intern Workspace.
                </p>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left text-gray-400 mt-2 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider block">Assigned / Managed Tasks</span>
                  <span className="text-white font-extrabold text-sm">{tasksAssignedCount} Assigned Tasks</span>
                  <p className="text-[10px]">Logged in active goal boards.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
