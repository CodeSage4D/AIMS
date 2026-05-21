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
  CalendarCheck
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "AURXON User";
  
  // Dynamic Metric Variables (With default try-catch mock values to prevent early database crashes)
  let totalInterns = 0;
  let activeInterns = 0;
  let onboardingInterns = 0;
  let recentLogs: any[] = [];

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
      title: "Pending System Audits",
      value: recentLogs.length,
      description: "Security trails captured today",
      icon: ShieldCheck,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* 1. Header Hero Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">
            Welcome back, {userName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Operational dashboard review for AURXON Internship Programs.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/interns/add">
            <Button variant="primary" size="sm" className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5">
              <PlusCircle className="h-4 w-4" />
              <span>Onboard Intern</span>
            </Button>
          </Link>
          <Link href="/attendance">
            <Button variant="secondary" size="sm" className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5">
              <CalendarCheck className="h-4 w-4" />
              <span>Bulk Attendance</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Analytical Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="border-border/60 hover:translate-y-[-2px]">
              <div className="flex items-center justify-between pb-4">
                <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-md border shrink-0 ${stat.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-heading font-extrabold tracking-tight text-foreground">
                  {stat.value}
                </span>
                <p className="text-xs text-muted-foreground mt-1.5">{stat.description}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 3. Operational Split Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Audit Activity Ticker (2/3 width) */}
        <Card className="lg:col-span-2 border-border/60">
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
                        <p className="text-xs font-bold text-foreground truncate">{log.user?.fullName || "System Admin"}</p>
                        <span className="text-[9px] font-heading font-semibold bg-secondary text-primary border border-border px-1.5 py-0.5 rounded select-none uppercase tracking-wider shrink-0">
                          {log.user?.role || "ADMIN"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground mt-1 leading-relaxed">
                        {log.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground/80 font-medium tracking-wide shrink-0">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Quick Launch Card (1/3 width) */}
        <Card className="border-border/60">
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
                <span className="text-xs font-semibold text-foreground">Query Directory</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
            </Link>

            <Link
              href="/tasks"
              className="flex items-center justify-between p-4 bg-secondary/20 rounded-md border border-border/40 hover:bg-secondary/35 hover:border-primary/40 transition-all duration-300 group"
            >
              <div className="flex items-center space-x-3">
                <CheckSquare className="h-4.5 w-4.5 text-cyan-400 group-hover:scale-105 transition-transform" />
                <span className="text-xs font-semibold text-foreground">Task Assignments</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-cyan-400 transition-all" />
            </Link>

            <Link
              href="/documents"
              className="flex items-center justify-between p-4 bg-secondary/20 rounded-md border border-border/40 hover:bg-secondary/35 hover:border-primary/40 transition-all duration-300 group"
            >
              <div className="flex items-center space-x-3">
                <FileCheck className="h-4.5 w-4.5 text-emerald-400 group-hover:scale-105 transition-transform" />
                <span className="text-xs font-semibold text-foreground">Document Vault</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-emerald-400 transition-all" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
