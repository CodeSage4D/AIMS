import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import WorkspaceHeaderActions from "@/components/layout/WorkspaceHeaderActions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  User,
  Calendar,
  CheckSquare,
  FileText,
  Activity,
  Briefcase,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InternWorkspacePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    return notFound();
  }

  const userRole = (session?.user as any)?.role || "INTERN";
  const isFounder = userRole === "FOUNDER";
  const isHr = userRole === "HR";
  const isAdmin = isFounder || isHr;

  // Fetch supervisors/mentors list for the update profile dropdown list
  const mentors = await db.user.findMany({
    select: {
      id: true,
      fullName: true,
      role: true,
    },
    orderBy: { fullName: "asc" },
  });

  const resolvedParams = await params;
  const id = resolvedParams.id;

  // 1. Fetch deep intern files and relations
  const intern = await db.intern.findUnique({
    where: { id },
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
      documents: {
        orderBy: { createdAt: "desc" },
      },
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!intern) {
    notFound();
  }

  // 2. Scope access verification for standard mentors
  if (!isAdmin && intern.supervisorId !== (session?.user as any)?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center select-none animate-fadeIn">
        <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="h-10 w-10 animate-pulse" />
        </div>
        <h3 className="text-sm font-heading font-extrabold text-foreground tracking-tight">Access Denied</h3>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          You do not have permission to access this intern's workspace dashboard.
          Mentor views are strictly restricted to assigned enrollees.
        </p>
        <Link href="/interns">
          <Button variant="secondary" size="sm" className="h-9 font-semibold text-xs border border-border/40 hover:bg-secondary/40 mt-2">
            Return to Directory
          </Button>
        </Link>
      </div>
    );
  }

  // 2. Compute Operational Analytics
  const totalTasks = intern.tasks.length;
  const completedTasks = intern.tasks.filter((t) => t.status === "COMPLETED").length;
  const inProgressTasks = intern.tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW").length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalAttendance = intern.attendance.length;
  const presentDays = intern.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 100;

  const totalDocs = intern.documents.length;
  const verifiedDocs = intern.documents.filter((d) => d.verified).length;

  const formattedStipend = Number(intern.stipendAmount).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });

  // Maps statuses to glowing premium badge classes
  const getStatusBadge = (s: string) => {
    switch (s) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "ONBOARDING":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "COMPLETED":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "TERMINATED":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "ARCHIVED":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      {/* 1. Header with Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Link href="/interns">
            <Button
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0 rounded-md shrink-0 border border-border/40 hover:bg-secondary/40"
              title="Return to Intern Roster"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-heading font-extrabold text-foreground tracking-tight">
                {intern.fullName}
              </h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-heading font-semibold border ${getStatusBadge(intern.status)}`}>
                {intern.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Workspace Profile Dashboard &bull; ID: <span className="font-mono text-cyan-400 font-bold">{intern.internId}</span>
            </p>
          </div>
        </div>

        <WorkspaceHeaderActions
          intern={intern as any}
          mentors={mentors}
          isAdmin={isAdmin}
          isFounder={isFounder}
        />
      </div>

      {/* 2. Analytical Statistics Ribbons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border-border/60 p-4.5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest block">
              Attendance Health
            </span>
            <span className="text-2xl font-heading font-extrabold text-foreground tracking-tight">
              {attendanceRate}%
            </span>
            <p className="text-[10px] text-muted-foreground font-medium">
              {presentDays} / {totalAttendance} Days Present
            </p>
          </div>
          <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
        </Card>

        <Card className="border-border/60 p-4.5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest block">
              Task Completion Rate
            </span>
            <span className="text-2xl font-heading font-extrabold text-foreground tracking-tight">
              {taskCompletionRate}%
            </span>
            <p className="text-[10px] text-muted-foreground font-medium">
              {completedTasks} Completed &bull; {inProgressTasks} In Progress
            </p>
          </div>
          <div className="p-2.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
        </Card>

        <Card className="border-border/60 p-4.5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest block">
              Compliance Vault
            </span>
            <span className="text-2xl font-heading font-extrabold text-foreground tracking-tight">
              {verifiedDocs} / {totalDocs}
            </span>
            <p className="text-[10px] text-muted-foreground font-medium">
              Verified Compliance Files
            </p>
          </div>
          <div className="p-2.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* 3. Primary Structured Split Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hand: Core Demographics, Contacts & Performance (1/3 Width) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card A: Profile Details */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                <User className="h-4.5 w-4.5 text-primary" />
                <span>Onboarding Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Department & Domain</span>
                <p className="text-xs font-semibold text-foreground">{intern.roleDomain}</p>
                <div className="flex items-center justify-between mt-1 text-[11px] font-medium">
                  <span className="text-muted-foreground">{intern.department} Division</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-heading font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                    {intern.employmentType || "INTERN"}
                  </span>
                </div>
              </div>

              <div className="space-y-1 border-t border-border/40 pt-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tenure / Joining Period</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    {formatDate(intern.startDate)}
                    {intern.endDate ? ` — ${formatDate(intern.endDate)}` : " — Present (Permanent)"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Gender</span>
                  <p className="text-xs font-semibold text-foreground">{intern.gender}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Date of Birth</span>
                  <p className="text-xs font-semibold text-foreground">{formatDate(intern.dateOfBirth)}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">Contact Files</span>
                <div className="flex items-center space-x-2 text-xs font-medium text-foreground/80">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${intern.email}`} className="hover:text-primary hover:underline truncate select-all">{intern.email}</a>
                </div>
                <div className="flex items-center space-x-2 text-xs font-medium text-foreground/80">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="select-all">{intern.phoneNumber}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">Residency Address</span>
                <div className="flex items-start space-x-2 text-xs font-medium text-foreground/80 leading-relaxed">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span>
                    {intern.address ? `${intern.address}, ` : ""}
                    {intern.city && `${intern.city}, `}
                    {intern.state && `${intern.state}, `}
                    {intern.country}
                  </span>
                </div>
              </div>

              <div className="space-y-1 border-t border-border/40 pt-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">University & Academic Course</span>
                <p className="text-xs font-semibold text-foreground">{intern.degree}</p>
                <p className="text-[11px] text-muted-foreground/80 font-medium">{intern.university}</p>
                {intern.batchSemester && (
                  <span className="inline-block text-[9px] font-heading font-semibold bg-secondary/80 text-muted-foreground px-1.5 py-0.5 rounded mt-1 border border-border/60">
                    {intern.batchSemester}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">SSIDN</span>
                  <p className="text-xs font-mono font-bold text-cyan-400 select-all">
                    {intern.ssidn
                      ? isAdmin
                        ? intern.ssidn
                        : intern.ssidn.length > 4
                        ? `***-**-${intern.ssidn.slice(-4)}`
                        : "****"
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Stipend Status</span>
                  <p className="text-xs font-semibold text-foreground">{formattedStipend}/mo</p>
                  <span className={`inline-block text-[8px] font-heading font-extrabold tracking-widest px-1.5 py-0.5 rounded uppercase mt-1 border ${intern.paymentStatus === "PAID" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                    {intern.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-1 border-t border-border/40 pt-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Supervisor & Mentor</span>
                <p className="text-xs font-semibold text-foreground">{intern.supervisor?.fullName || "Unassigned"}</p>
                {intern.supervisor?.email && (
                  <p className="text-[10px] text-muted-foreground font-medium select-all truncate">{intern.supervisor.email}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card B: Performance & Compliance Ratings */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                <Award className="h-4.5 w-4.5 text-cyan-400" />
                <span>Performance & Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
                  Evaluation Rating Score
                </span>
                {intern.performanceScore ? (
                  <div className="flex items-center space-x-1.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center text-[10px] font-heading font-bold select-none transition-all ${
                          idx < (intern.performanceScore || 0)
                            ? "bg-primary/20 text-primary border-primary/30"
                            : "bg-secondary text-muted-foreground/45 border-transparent"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground font-bold ml-1.5">
                      ({intern.performanceScore} / 5 Score)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-muted-foreground/60 italic text-xs py-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Evaluation rating pending.</span>
                  </div>
                )}
              </div>

              {intern.performanceNotes && (
                <div className="space-y-1.5 border-t border-border/40 pt-4">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">Evaluator Assessment remarks</span>
                  <p className="text-xs text-foreground/80 leading-relaxed font-medium bg-secondary/15 p-2.5 rounded border border-border/40 italic">
                    &ldquo;{intern.performanceNotes}&rdquo;
                  </p>
                </div>
              )}

              <div className="space-y-1.5 border-t border-border/40 pt-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">Compliance Emergency contact</span>
                <div className="p-3 bg-secondary/15 rounded-md border border-border/40 text-xs font-semibold text-foreground leading-relaxed space-y-1">
                  <p className="font-heading font-extrabold text-foreground">{intern.emergencyContactName}</p>
                  <p className="text-[11px] text-muted-foreground font-medium font-mono select-all flex items-center space-x-1.5">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{intern.emergencyContactNumber}</span>
                  </p>
                </div>
              </div>

              {intern.notes && (
                <div className="space-y-1 border-t border-border/40 pt-4">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">Internal Admin remarks</span>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium select-text whitespace-pre-line">
                    {intern.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Hand: Workspace Assignments & Attendance Logs (2/3 Width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card C: Tasks Assigned Queue */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <CheckSquare className="h-4.5 w-4.5 text-blue-400" />
                  <span>Assigned Tasks Queue</span>
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                  Tasks assigned directly to this intern profile.
                </CardDescription>
              </div>
              <span className="text-[10px] font-heading font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                {completedTasks} / {totalTasks} COMPLETED
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              {intern.tasks.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2.5 select-none">
                  <CheckSquare className="h-8 w-8 text-muted-foreground/35" />
                  <span>No tasks have been assigned to this intern workspace yet.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {intern.tasks.map((task) => {
                    const isCompleted = task.status === "COMPLETED";
                    const isPending = task.status === "PENDING";
                    const isProgress = task.status === "IN_PROGRESS";
                    const isReview = task.status === "IN_REVIEW";

                    return (
                      <div
                        key={task.id}
                        className="p-4 bg-secondary/10 hover:bg-secondary/20 border border-border/40 hover:border-border/80 transition-all rounded-md space-y-3"
                      >
                        <div className="flex items-start justify-between space-x-4">
                          <div className="space-y-1 min-w-0">
                            <p className="text-xs font-heading font-extrabold text-foreground tracking-tight truncate">
                              {task.title}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed select-text">
                              {task.description}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-heading font-extrabold uppercase tracking-widest border shrink-0 ${
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : isReview
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                : isProgress
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground font-semibold">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>Deadline: {formatDate(task.deadline)}</span>
                          </div>

                          {task.remarks && (
                            <div className="w-full text-foreground/80 bg-secondary/30 p-2 rounded text-[11px] font-medium leading-relaxed italic mt-1 border-l-2 border-border select-text">
                              Remarks: &ldquo;{task.remarks}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card D: Attendance Logs */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <Calendar className="h-4.5 w-4.5 text-emerald-400" />
                  <span>Attendance Register Logs</span>
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                  Daily register timestamps captured dynamically.
                </CardDescription>
              </div>
              <span className="text-[10px] font-heading font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                {attendanceRate}% PRESENT RATE
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              {intern.attendance.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2.5 select-none">
                  <Calendar className="h-8 w-8 text-muted-foreground/35" />
                  <span>No daily attendance registers logged for this profile yet.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-secondary/15 text-[9px] font-heading font-bold text-muted-foreground uppercase tracking-widest select-none">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Check-In</th>
                        <th className="py-3 px-4">Check-Out</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-muted-foreground font-semibold">
                      {intern.attendance.map((att) => {
                        const isPresent = att.status === "PRESENT";
                        const isLate = att.status === "LATE";
                        const isLeave = att.status === "LEAVE";

                        return (
                          <tr key={att.id} className="hover:bg-secondary/10 hover:text-foreground">
                            <td className="py-3 px-4 font-medium text-foreground">
                              {formatDate(att.date)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-heading font-extrabold uppercase tracking-widest border ${
                                  isPresent
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : isLate
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : isLeave
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}
                              >
                                {att.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] font-bold text-foreground/80">
                              {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] font-bold text-foreground/80">
                              {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                            </td>
                            <td className="py-3 px-4 italic text-muted-foreground font-medium select-text max-w-xs truncate" title={att.remarks || ""}>
                              {att.remarks || "No remarks"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card E: Compliance Documents */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <FileText className="h-4.5 w-4.5 text-cyan-400" />
                  <span>Compliance & Onboarding Files</span>
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                  Uploaded documentation files verified by admins.
                </CardDescription>
              </div>
              <span className="text-[10px] font-heading font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                {verifiedDocs} / {totalDocs} VERIFIED
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              {intern.documents.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2.5 select-none">
                  <FileText className="h-8 w-8 text-muted-foreground/35" />
                  <span>No documentation files uploaded for this profile yet.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {intern.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-secondary/15 rounded-md border border-border/40 hover:border-border/80 flex items-center justify-between space-x-4 transition-all"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded shrink-0">
                          <FileSpreadsheet className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-heading font-extrabold text-foreground truncate">
                            {doc.fileName}
                          </p>
                          <p className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-widest">
                            {doc.type.replace("_", " ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-heading font-extrabold uppercase tracking-widest border ${
                            doc.verified
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {doc.verified ? "VERIFIED" : "PENDING AUDIT"}
                        </span>
                        
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md bg-secondary border border-border/60 hover:border-primary/40 hover:text-primary transition-all"
                          title="Open Document File"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
