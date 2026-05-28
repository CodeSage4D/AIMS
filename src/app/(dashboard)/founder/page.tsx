import React from "react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AccessDeniedShield from "@/components/layout/AccessDeniedShield";
import FounderPanel from "@/components/layout/FounderPanel";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function FounderPage() {
  const session = await auth();
  if (!session || !session.user) {
    return notFound();
  }

  const userRole = (session.user as any).role;
  const allowedRoles = ["FOUNDER", "SUPER_ADMIN", "ADMIN", "HR"];
  
  if (!allowedRoles.includes(userRole)) {
    return (
      <AccessDeniedShield 
        requiredRole="OPERATIONS ELITE ACCESS" 
        currentRole={userRole} 
      />
    );
  }

  // Fetch telemetry counts
  const totalInterns = await db.intern.count();
  const activeInterns = await db.intern.count({ where: { status: "ACTIVE" } });
  const pendingVerification = await db.intern.count({ where: { status: "PENDING_VERIFICATION" } });
  const totalTasks = await db.task.count();
  const completedTasks = await db.task.count({ where: { status: "COMPLETED" } });
  const pendingTasks = totalTasks - completedTasks;

  // Fetch recent activity logs
  const logs = await db.activityLog.findMany({
    take: 15,
    include: {
      user: {
        select: {
          fullName: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const serializedLogs = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  // Read backup files from folder
  const fs = await import("fs");
  const path = await import("path");
  const backupsDir = path.join(process.cwd(), "backups");
  let backupFiles: any[] = [];
  if (fs.existsSync(backupsDir)) {
    backupFiles = fs.readdirSync(backupsDir)
      .filter((f) => f.endsWith(".enc"))
      .map((f) => {
        const filePath = path.join(backupsDir, f);
        const stat = fs.statSync(filePath);
        return {
          name: f,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const systemStats = {
    totalInterns,
    activeInterns,
    pendingVerification,
    totalTasks,
    completedTasks,
    pendingTasks,
    dbProvider: "PostgreSQL (Neon Cloud)",
    dbStatus: "OPERATIONAL",
    latency: "24ms"
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-2">
        <div className="flex items-center space-x-3.5">
          <Link href="/">
            <Button
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0 rounded-md shrink-0 border border-border/40 hover:bg-secondary/40"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-heading font-extrabold text-foreground tracking-tight text-white">
                Operations & Founder Console
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-heading font-extrabold bg-yellow-500/10 text-yellow-450 border border-yellow-500/20 uppercase tracking-widest shrink-0">
                Elite Ops
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secure private database planner, corporate repository directory, and diary notes vault.
            </p>
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <FounderPanel 
        initialLogs={serializedLogs}
        backupFiles={backupFiles}
        systemStats={systemStats}
      />
    </div>
  );
}
