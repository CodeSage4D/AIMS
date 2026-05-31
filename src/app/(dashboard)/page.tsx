import React from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Users,
  Activity,
  CheckSquare,
  FileCheck,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  CalendarCheck,
  AlertTriangle,
  FolderOpen
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import FounderDashboardQueues from "@/components/layout/FounderDashboardQueues";
import InternDashboard from "@/components/layout/InternDashboard";
import AnalyticsDashboard from "@/components/layout/AnalyticsDashboard";
import NoticeBoard from "@/components/layout/NoticeBoard";
import ExecutiveClockStation from "@/components/layout/ExecutiveClockStation";
import RealTimePresenceMonitor from "@/components/layout/RealTimePresenceMonitor";
import TodoWidget from "@/components/layout/TodoWidget";

export default async function DashboardPage() {
  // Dynamic background sweep to mark absent active interns on daily shifts
  try {
    const { autoMarkAbsent } = await import("@/lib/attendanceScheduler");
    await autoMarkAbsent();
  } catch (schedErr) {
    console.warn("[Dashboard Page Loader] Dynamic auto-absent sweep skipped:", schedErr);
  }

  const session = await auth();
  const userRole = (session?.user as any)?.role || "INTERN";
  const userId = (session?.user as any)?.id;
  
  if (!session || !userId) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  const userName = session?.user?.name || "AURXON User";

  // Check Dashboard Access Permission
  const { hasPermission } = await import("@/lib/permissions");
  let canAccessDashboard = await hasPermission(userId, userRole, "dashboardAccess");

  // Safe fallback: Any recognized intern/employee role should never be suspended from their own basic dashboard
  if (userRole === "INTERN" || userRole === "EMPLOYEE") {
    canAccessDashboard = true;
  }

  if (!canAccessDashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4 select-none">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full text-red-400">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-heading font-extrabold text-white">Dashboard Access Suspended</h2>
        <p className="text-sm text-gray-400 max-w-md leading-relaxed font-medium">
          Your account currently does not have active dashboard access privileges. Please contact your AIMS System Founder or Super Admin to restore access.
        </p>
      </div>
    );
  }

  const canAccessAnalytics = await hasPermission(userId, userRole, "analyticsAccess");
  const canAccessApprovals = await hasPermission(userId, userRole, "approvalAccess");

  // Fetch Announcements and Milestones for Notice Board
  let announcements: any[] = [];
  let anniversaries: any[] = [];
  try {
    const events = await db.event.findMany({
      where: {
        type: { in: ["EVENT", "REMINDER"] }
      },
      orderBy: {
        date: "desc"
      },
      take: 5
    });

    const dbAnnouncements = events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date.toISOString(),
      type: e.type
    }));

    const interns = await db.intern.findMany({
      where: {
        status: { in: ["ACTIVE", "COMPLETED", "ONBOARDING"] }
      },
      select: {
        id: true,
        fullName: true,
        roleDomain: true,
        startDate: true,
        dateOfBirth: true,
      }
    });

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDateVal = today.getDate();

    // 1. Dynamic Same-Day Birthday Query & Highlights
    const sameDayBirthdays = interns.filter(intern => {
      if (!intern.dateOfBirth) return false;
      const dob = new Date(intern.dateOfBirth);
      return dob.getMonth() === currentMonth && dob.getDate() === currentDateVal;
    });

    const birthdayAlerts = sameDayBirthdays.map(intern => {
      const dob = new Date(intern.dateOfBirth!);
      const age = today.getFullYear() - dob.getFullYear();
      return {
        id: `birthday-${intern.id}`,
        title: `🎂 Happy Birthday, ${intern.fullName}! 🎈`,
        description: `Please join us in celebrating ${intern.fullName} on their special ${age}th birthday milestone today! Warmest greetings from the AURXON team! 🎉🍰`,
        date: today.toISOString(),
        type: "BIRTHDAY_ALERT"
      };
    });

    const birthdayMilestones = sameDayBirthdays.map(intern => {
      const dob = new Date(intern.dateOfBirth!);
      const age = today.getFullYear() - dob.getFullYear();
      return {
        internId: intern.id,
        fullName: intern.fullName,
        roleDomain: intern.roleDomain,
        years: age,
        milestoneType: "BIRTHDAY"
      };
    });

    // 2. Dynamic New Enrollees Joined in Last 7 Days Query & Welcome Alerts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const newEnrollees = interns.filter(intern => {
      const start = new Date(intern.startDate);
      return start >= sevenDaysAgo && start <= today;
    });

    const welcomeAlerts = newEnrollees.map(intern => ({
      id: `welcome-${intern.id}`,
      title: `🎉 Welcome to AURXON!`,
      description: `Please give a warm workforce welcome to ${intern.fullName}, who recently joined our team as a ${intern.roleDomain.toUpperCase()}! Excited to collaborate! 🚀`,
      date: intern.startDate.toISOString(),
      type: "WELCOME"
    }));

    // Check if welcome announcements are disabled in settings
    let enableWelcomeAnnouncements = true;
    try {
      const welcomeSetting = await db.systemSetting.findUnique({
        where: { key: "enable_welcome_announcements" }
      });
      if (welcomeSetting) {
        const parsed = JSON.parse(welcomeSetting.value);
        enableWelcomeAnnouncements = typeof parsed === "object" ? parsed.allowed : !!parsed;
      }
    } catch (err) {
      console.warn("Failed to read enable_welcome_announcements setting, defaulting to true:", err);
    }

    // Merge dynamic compliance alerts directly into Notice stream (birthdays first, then welcomes, then calendar events)
    announcements = enableWelcomeAnnouncements
      ? [...birthdayAlerts, ...welcomeAlerts, ...dbAnnouncements]
      : [...birthdayAlerts, ...dbAnnouncements];

    // Query standard work anniversaries
    const workAnniversaries = interns
      .filter(intern => {
        const start = new Date(intern.startDate);
        // Anniversary only for people who have been here >= 1 year
        const years = today.getFullYear() - start.getFullYear();
        return start.getMonth() === currentMonth && start.getDate() === currentDateVal && years > 0;
      })
      .map(intern => {
        const start = new Date(intern.startDate);
        const years = today.getFullYear() - start.getFullYear();
        return {
          internId: intern.id,
          fullName: intern.fullName,
          roleDomain: intern.roleDomain,
          years: years,
          milestoneType: "ANNIVERSARY"
        };
      });

    anniversaries = [...workAnniversaries, ...birthdayMilestones];
  } catch (err) {
    console.error("Failed to query notices and milestones:", err);
  }

  // ----------------------------------------------------
  // INTERN DASHBOARD RENDER PATH
  // ----------------------------------------------------
  if (userRole === "INTERN" || userRole === "EMPLOYEE") {
    if (!userId) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] text-center p-6">
          <Card className="border-red-500/20 bg-red-500/5 max-w-md p-6 space-y-4">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-white">Access Violation</h3>
            <p className="text-xs text-gray-400">
              No authenticated user ID was resolved from your session credentials. Please sign out and log in again.
            </p>
          </Card>
        </div>
      );
    }

    const intern = await db.intern.findUnique({
      where: { userId },
      include: {
        supervisor: {
          select: { fullName: true, email: true }
        },
        documents: true,
        generatedDocuments: true,
      }
    });

    if (!intern) {
      // User logged in but profile not linked yet — show a clean welcome screen
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/80 via-blue-950/70 to-slate-950/90 p-6 sm:p-10 shadow-2xl backdrop-blur-md text-center">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-[60px] pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <ShieldCheck className="h-10 w-10" />
                </div>
              </div>
              <h2 className="text-2xl font-heading font-extrabold text-white tracking-tight">
                Welcome to AURXON AIMS! 🎉
              </h2>
              <p className="text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
                Hi <strong className="text-white">{userName}</strong>! Your account is active. Your admin or HR team is setting up your profile. You will have full access shortly — please check back in a moment.
              </p>
              <div className="flex justify-center">
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                  <span>Profile Setup Pending — Contact Admin</span>
                </div>
              </div>
            </div>
          </div>

          <NoticeBoard announcements={announcements} anniversaries={anniversaries} userRole={userRole} />
        </div>
      );
    }

    // Check if they need to do onboarding and haven't skipped it
    const { parseInternNotes } = await import("@/lib/roles");
    const customFields = parseInternNotes(intern.notes);
    const onboardingSkipped = !!customFields.onboardingSkipped;

    if (intern.status === "ONBOARDING" && !onboardingSkipped) {
      const OnboardingFlow = (await import("@/components/layout/OnboardingFlow")).default;
      const safeUser = {
        id: userId,
        name: userName,
        email: session?.user?.email || "",
        role: userRole,
      };

      const serializedInternForOnboarding = {
        id: intern.id,
        internId: intern.internId,
        fullName: intern.fullName,
        email: intern.email,
        phoneNumber: intern.phoneNumber,
        address: intern.address,
        city: intern.city,
        state: intern.state,
        country: intern.country,
        pinCode: intern.pinCode,
        citizenship: intern.citizenship,
        region: intern.region,
        university: intern.university,
        degree: intern.degree,
        department: intern.department,
        roleDomain: intern.roleDomain,
        batchSemester: intern.batchSemester,
        startDate: intern.startDate.toISOString(),
        endDate: intern.endDate ? intern.endDate.toISOString() : null,
        emergencyContactName: intern.emergencyContactName,
        emergencyContactNumber: intern.emergencyContactNumber,
        skills: intern.skills,
        stipendAmount: Number(intern.stipendAmount),
        bankName: intern.bankName,
        accountNumber: intern.accountNumber,
        ifscCode: intern.ifscCode,
        upiId: intern.upiId,
        branchName: intern.branchName,
        panCard: intern.panCard,
        notes: intern.notes,
        documents: intern.documents.map(d => ({
          id: d.id,
          type: d.type,
          fileName: d.fileName,
          fileUrl: `/api/documents/view?id=${d.id}`,
          verified: d.verified,
        })),
        generatedDocuments: intern.generatedDocuments.map(gd => ({
          id: gd.id,
          type: gd.type,
          status: gd.status,
          content: gd.content,
          signature: gd.signature,
        })),
      };

      return <OnboardingFlow user={safeUser} intern={serializedInternForOnboarding} />;
    }

    // Fetch related records for the linked Intern
    const attendance = await db.attendance.findMany({
      where: { internId: intern.id },
      orderBy: { date: "desc" }
    });

    const tasks = await db.task.findMany({
      where: { internId: intern.id },
      orderBy: { createdAt: "desc" },
      include: {
        assigner: {
          select: { fullName: true }
        }
      }
    });

    const documents = await db.document.findMany({
      where: { internId: intern.id },
      orderBy: { createdAt: "desc" }
    });

    // Adapt objects safely for Client Component
    const serializedIntern = {
      id: intern.id,
      internId: intern.internId,
      fullName: intern.fullName,
      department: intern.department,
      roleDomain: intern.roleDomain,
      status: intern.status,
      startDate: intern.startDate.toISOString(),
      endDate: intern.endDate ? intern.endDate.toISOString() : null,
      notes: intern.notes,
      supervisor: intern.supervisor
        ? { fullName: intern.supervisor.fullName, email: intern.supervisor.email }
        : null
    };

    const serializedAttendance = attendance.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      status: a.status,
      checkIn: a.checkIn ? a.checkIn.toISOString() : null,
      checkOut: a.checkOut ? a.checkOut.toISOString() : null,
      remarks: a.remarks
    }));

    const serializedTasks = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      deadline: t.deadline.toISOString(),
      status: t.status,
      remarks: t.remarks,
      assigner: t.assigner ? { fullName: t.assigner.fullName } : null
    }));

    const serializedDocuments = documents.map((d) => ({
      id: d.id,
      type: d.type as string,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      verified: d.verified,
      createdAt: d.createdAt.toISOString()
    }));

    return (
      <InternDashboard
        internProfile={serializedIntern}
        initialAttendance={serializedAttendance}
        initialTasks={serializedTasks}
        initialDocuments={serializedDocuments}
        announcements={announcements}
        anniversaries={anniversaries}
      />
    );
  }

  // ----------------------------------------------------
  // FOUNDER / HR / TEAM LEAD DASHBOARD RENDERS
  // ----------------------------------------------------
  let totalInterns = 0;
  let activeInterns = 0;
  let onboardingInterns = 0;
  let recentLogs: any[] = [];
  let leaveRequestsCount = 0;
  let passwordRequestsCount = 0;

  let attendanceStats = { present: 0, absent: 0, late: 0, leave: 0 };
  let taskStats = { pending: 0, inProgress: 0, inReview: 0, completed: 0 };
  let complianceStats = { pending: 0, approved: 0, rejected: 0 };

  try {
    totalInterns = await db.intern.count();
    activeInterns = await db.intern.count({ where: { status: "ACTIVE" } });
    onboardingInterns = await db.intern.count({ where: { status: "ONBOARDING" } });
    
    recentLogs = await db.activityLog.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { fullName: true, role: true }
        }
      }
    });

    leaveRequestsCount = await db.leaveApplication.count({
      where: { status: "PENDING" }
    });

    passwordRequestsCount = await db.passwordResetRequest.count({
      where: { status: "PENDING" }
    });

    // Fetch dynamic analytics metrics
    const presentCount = await db.attendance.count({ where: { status: "PRESENT" } });
    const absentCount = await db.attendance.count({ where: { status: "ABSENT" } });
    const lateCount = await db.attendance.count({ where: { status: "LATE" } });
    const leaveCount = await db.attendance.count({ where: { status: "LEAVE" } });
    attendanceStats = { present: presentCount, absent: absentCount, late: lateCount, leave: leaveCount };

    const pendingTasks = await db.task.count({ where: { status: "PENDING" } });
    const inProgressTasks = await db.task.count({ where: { status: "IN_PROGRESS" } });
    const inReviewTasks = await db.task.count({ where: { status: "IN_REVIEW" } });
    const completedTasks = await db.task.count({ where: { status: "COMPLETED" } });
    taskStats = { pending: pendingTasks, inProgress: inProgressTasks, inReview: inReviewTasks, completed: completedTasks };

    const pendingDocs = await db.generatedDocument.count({ where: { status: "PENDING" } });
    const approvedDocs = await db.generatedDocument.count({ where: { status: "APPROVED" } });
    const rejectedDocs = await db.generatedDocument.count({ where: { status: "REJECTED" } });
    complianceStats = { pending: pendingDocs, approved: approvedDocs, rejected: rejectedDocs };
  } catch (err) {
    // Elegant fallback mocks for early development state
    recentLogs = [
      {
        id: "1",
        action: "PORTAL_INIT",
        description: "Welcome to AIMS! Database migration pending. Run prisma seed to load real metrics.",
        createdAt: new Date(),
        user: { fullName: "System Auto Engine", role: "ADMIN" }
      }
    ];
  }

  // Cards Schema
  const stats = [
    {
      title: "Total Registered Roster",
      value: totalInterns,
      description: "Total historic interns enrolled",
      icon: Users,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Active Learning Seats",
      value: activeInterns,
      description: "Interns currently in active departments",
      icon: Activity,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Incoming Onboarding",
      value: onboardingInterns,
      description: "Interns completing initial setups",
      icon: PlusCircle,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      title: "Pending Founder Audits",
      value: leaveRequestsCount + passwordRequestsCount,
      description: `${leaveRequestsCount} Leaves • ${passwordRequestsCount} Password Resets`,
      icon: ShieldCheck,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      
      {/* 1. Header Hero Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/80 via-blue-950/70 to-slate-950/90 p-5 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-10 -top-10 h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-indigo-500/20 blur-[50px] sm:blur-[70px] pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-cyan-500/10 blur-[50px] sm:blur-[70px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <TrendingUp className="h-3 w-3 text-indigo-400" />
              <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-indigo-300">
                {userRole === "FOUNDER" ? "FOUNDER ELITE WORKSPACE" : `${userRole.replace("_", " ")} Workspace`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight leading-tight">
              Welcome back, <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">{userName}</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-medium">
              Operational dashboard review for AURXON Internship Programs. Manage resources, track daily rosters, and run audit actions from any device.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {(userRole === "FOUNDER" || userRole === "HR") && (
              <Link href="/interns/add" className="w-full sm:w-auto">
                <Button variant="primary" size="sm" className="w-full h-11 text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl px-5 border border-white/5 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all duration-300">
                  <PlusCircle className="h-4 w-4" />
                  <span>Onboard Intern</span>
                </Button>
              </Link>
            )}
            <Link href="/attendance" className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full h-11 text-xs font-bold font-heading flex items-center justify-center space-x-2 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 rounded-xl px-5 text-white transition-all duration-300">
                <CalendarCheck className="h-4 w-4 text-cyan-400" />
                <span>Bulk Attendance</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 1.5 Real-Time Clock & Attendance Session Station */}
      <ExecutiveClockStation />

      {/* 1.7 Real-Time Active Workforce Presence Radar */}
      {(userRole === "FOUNDER" || userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "HR" || userRole === "TEAM_LEAD") && (
        <RealTimePresenceMonitor />
      )}

      {/* 2. Analytical Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="border-border/60 hover:translate-y-[-2px] bg-card/60 backdrop-blur-md">
              <div className="flex items-center justify-between pb-4">
                <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className={`p-2 rounded border shrink-0 ${stat.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-heading font-extrabold tracking-tight text-white">
                  {stat.value}
                </span>
                <p className="text-xs text-muted-foreground mt-1.5 font-semibold">{stat.description}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 2.5 Dynamic SVG Analytics Charts Dashboard */}
      {canAccessAnalytics && (userRole === "FOUNDER" || userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "HR" || userRole === "TEAM_LEAD") && (
        <AnalyticsDashboard
          attendanceStats={attendanceStats}
          taskStats={taskStats}
          complianceStats={complianceStats}
        />
      )}

      {/* 3. Founder Operations Queue (Rendered for Authorized Admins to resolve requests) */}
      {canAccessApprovals && (userRole === "FOUNDER" || userRole === "SUPER_ADMIN" || userRole === "HR") && (
        <div className="space-y-6">
          <div className="border-t border-border/40 my-8" />
          <h3 className="text-lg font-heading font-extrabold text-white tracking-tight">
            Security & Operations Resolution Desk
          </h3>
          <FounderDashboardQueues />
        </div>
      )}

      {/* 3.5 Notice Board announcements & milestones */}
      <NoticeBoard announcements={announcements} anniversaries={anniversaries} userRole={userRole} />

      {/* 4. Operational Split Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Audit Activity Ticker (2/3 width) */}
        <Card className="lg:col-span-2 border-border/60 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Recent Activity Stream</CardTitle>
            <CardDescription>Live chronological operational trails captured by AIMS security handlers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3.5 bg-secondary/15 rounded-md border border-border/40 hover:border-border/80 transition-colors duration-200"
                >
                  <div className="flex space-x-3.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-heading font-bold select-none shrink-0 text-xs">
                      {log.user?.fullName ? log.user.fullName[0].toUpperCase() : "A"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-bold text-white truncate">{log.user?.fullName || "System Admin"}</p>
                        <span className="text-[9px] font-heading font-semibold bg-secondary text-primary border border-border px-1.5 py-0.5 rounded select-none uppercase tracking-wider shrink-0">
                          {log.user?.role || "ADMIN"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-300 mt-1 leading-relaxed">
                        {log.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium tracking-wide shrink-0">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Quick Launch Card (1/3 width) */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle>AIMS Access Launcher</CardTitle>
              <CardDescription>Instant launch controllers to operational units.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link
                href="/interns"
                className="flex items-center justify-between p-4 bg-secondary/20 rounded-md border border-border/40 hover:bg-secondary/35 hover:border-primary/40 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-4.5 w-4.5 text-primary group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-semibold text-white">Query Directory</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 group-hover:text-primary transition-all" />
              </Link>

              <Link
                href="/tasks"
                className="flex items-center justify-between p-4 bg-secondary/20 rounded-md border border-border/40 hover:bg-secondary/35 hover:border-primary/40 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-3">
                  <CheckSquare className="h-4.5 w-4.5 text-cyan-400 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-semibold text-white">Task Assignments</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all" />
              </Link>

              <Link
                href="/documents"
                className="flex items-center justify-between p-4 bg-secondary/20 rounded-md border border-border/40 hover:bg-secondary/35 hover:border-primary/40 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-3">
                  <FileCheck className="h-4.5 w-4.5 text-emerald-400 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-semibold text-white">Document Vault</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 group-hover:text-emerald-400 transition-all" />
              </Link>
            </CardContent>
          </Card>
          <TodoWidget />
        </div>
      </div>
    </div>
  );
}
