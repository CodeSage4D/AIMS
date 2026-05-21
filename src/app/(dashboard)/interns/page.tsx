import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlusCircle, ShieldAlert, BadgeAlert } from "lucide-react";
import InternsFilter from "@/components/layout/InternsFilter";
import RosterActions from "@/components/layout/RosterActions";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    department?: string;
  }>;
}

export default async function InternsPage({ searchParams }: PageProps) {
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  // Resolve asynchronous Next.js 16 SearchParams safely
  const resolvedParams = await searchParams;
  const search = resolvedParams.search || "";
  const status = resolvedParams.status || "";
  const department = resolvedParams.department || "";

  let interns: any[] = [];
  let isDbConnected = true;

  try {
    interns = await db.intern.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { fullName: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { internId: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          status
            ? { status: status as any }
            : { status: { not: "ARCHIVED" } }, // Hide archived enrollees by default for clean operation
          department ? { department: { contains: department, mode: "insensitive" } } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        supervisor: {
          select: { fullName: true },
        },
      },
    });
  } catch (err) {
    isDbConnected = false;
    // Premium fallback mock data for testing layout without direct active migrations
    interns = [
      {
        id: "uuid-aarav",
        internId: "AXN-SWE-2605-AS01",
        fullName: "Aarav Sharma",
        email: "aarav@aurxon.com",
        department: "Engineering",
        roleDomain: "Software Engineer",
        startDate: new Date("2026-05-01"),
        status: "ACTIVE",
        supervisor: { fullName: "Karan Patel" },
      },
      {
        id: "uuid-ananya",
        internId: "AXN-UIUX-2605-AI01",
        fullName: "Ananya Iyer",
        email: "ananya@aurxon.com",
        department: "Design",
        roleDomain: "UI/UX Design",
        startDate: new Date("2026-05-15"),
        status: "ONBOARDING",
        supervisor: { fullName: "Sarah Connor" },
      },
    ];
  }

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
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-foreground tracking-tight">
            Intern Roster Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Query, manage, onboard, and verify AURXON intern files.
          </p>
        </div>
        <Link href="/interns/add">
          <Button variant="primary" size="sm" className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5">
            <PlusCircle className="h-4.5 w-4.5" />
            <span>Onboard New Intern</span>
          </Button>
        </Link>
      </div>

      {/* Database Warning indicator */}
      {!isDbConnected && (
        <div className="flex items-center space-x-3 p-3.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
          <span>Notice: Database not connected or migrated yet. Displaying layout-ready sample enrollees.</span>
        </div>
      )}

      {/* 2. Client Side Filters Panel */}
      <InternsFilter />

      {/* 3. Main Data Table Card */}
      <Card className="border-border/60 overflow-hidden shadow-lg p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/15 text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest select-none">
                <th className="py-4.5 px-6">Intern ID</th>
                <th className="py-4.5 px-6">Intern Name</th>
                <th className="py-4.5 px-6">Role & Department</th>
                <th className="py-4.5 px-6">Onboarding Date</th>
                <th className="py-4.5 px-6">SSIDN</th>
                <th className="py-4.5 px-6">Mapped Mentor</th>
                <th className="py-4.5 px-6">Status</th>
                <th className="py-4.5 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs font-medium text-muted-foreground">
              {interns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-semibold text-muted-foreground select-none">
                    <div className="flex flex-col items-center space-y-2.5">
                      <BadgeAlert className="h-8 w-8 text-muted-foreground/50" />
                      <span>No enrollees match your active search filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                interns.map((intern) => (
                  <tr
                    key={intern.id}
                    className="hover:bg-secondary/10 hover:text-foreground transition-colors duration-150"
                  >
                    <td className="py-4 px-6 font-heading font-bold text-foreground">
                      {intern.internId}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{intern.fullName}</span>
                        <span className="text-[10px] text-muted-foreground/80 mt-0.5">{intern.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-foreground">{intern.roleDomain}</span>
                        <span className="text-[10px] text-muted-foreground/80 mt-0.5">{intern.department}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium">
                      {formatDate(intern.startDate)}
                    </td>
                    <td className="py-4 px-6 font-mono text-[11px] font-semibold text-foreground/80">
                      {intern.ssidn ? (
                        <span className="bg-secondary/40 border border-border/40 px-2 py-0.5 rounded text-xs select-text">
                          {intern.ssidn}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-semibold text-foreground">
                      {intern.supervisor?.fullName || "Unassigned"}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-heading font-semibold border ${getStatusBadge(intern.status)}`}>
                        {intern.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <RosterActions
                        internId={intern.id}
                        internName={intern.fullName}
                        internDisplayId={intern.internId}
                        isAdmin={isAdmin}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
