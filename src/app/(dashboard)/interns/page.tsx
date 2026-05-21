import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlusCircle, ShieldAlert, BadgeAlert, Mail, MapPin, Calendar, UserCheck } from "lucide-react";
import InternsFilter from "@/components/layout/InternsFilter";
import RosterActions from "@/components/layout/RosterActions";
import AccessDeniedShield from "@/components/layout/AccessDeniedShield";
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
  const userRole = (session?.user as any)?.role || "INTERN";
  
  // Guard access. Only FOUNDER, HR, and TEAM_LEAD can view directories
  if (userRole === "INTERN") {
    return <AccessDeniedShield requiredRole="TEAM_LEAD / HR / FOUNDER" currentRole={userRole} />;
  }

  const isSuperUser = userRole === "FOUNDER" || userRole === "HR";
  
  // Resolve Next.js 16 SearchParams safely
  const resolvedParams = await searchParams;
  const search = resolvedParams.search || "";
  const status = resolvedParams.status || "";
  const department = resolvedParams.department || "";

  let interns: any[] = [];
  let isDbConnected = true;

  try {
    const whereClause: any = {
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
    };

    // If not a super user (e.g. is TEAM_LEAD), restrict view to only supervised enrollees
    if (!isSuperUser) {
      whereClause.AND.push({ supervisorId: (session?.user as any)?.id || "" });
    }

    interns = await db.intern.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        supervisor: {
          select: { fullName: true },
        },
      },
    });
  } catch (err) {
    isDbConnected = false;
    // Fallback mock data for local testing
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
        employmentType: "PERMANENT",
        supervisor: { fullName: "Founder Admin" },
        ssidn: "987-65-4321"
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
        employmentType: "INTERN",
        supervisor: { fullName: "Founder Admin" },
        ssidn: "123-45-6789"
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
    <div className="space-y-6 sm:space-y-8 select-none animate-fadeIn text-white">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-foreground tracking-tight">
            Workspace Roster Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Query, manage, onboard, and verify AURXON employee and intern records.
          </p>
        </div>
        {isSuperUser && (
          <Link href="/interns/add">
            <Button variant="primary" size="sm" className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 rounded-xl px-4 transition-all">
              <PlusCircle className="h-4.5 w-4.5" />
              <span>Onboard New Roster File</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Database Warning indicator */}
      {!isDbConnected && (
        <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 animate-pulse" />
          <span>Notice: Database not connected or migrated yet. Displaying layout-ready sample enrollees.</span>
        </div>
      )}

      {/* 2. Client Side Filters Panel */}
      <InternsFilter />

      {/* 3. Main Responsive Directory container */}
      <div>
        {/* DESKTOP VIEW: HTML Table (Visible on md and larger screens) */}
        <div className="hidden md:block">
          <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md overflow-hidden shadow-lg p-0 rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest select-none">
                    <th className="py-4.5 px-6">ID</th>
                    <th className="py-4.5 px-6">Name</th>
                    <th className="py-4.5 px-6">Role & Department</th>
                    <th className="py-4.5 px-6">Type</th>
                    <th className="py-4.5 px-6">Joining Date</th>
                    <th className="py-4.5 px-6">SSIDN / ID Proof</th>
                    <th className="py-4.5 px-6">Supervisor</th>
                    <th className="py-4.5 px-6">Status</th>
                    <th className="py-4.5 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs font-medium text-gray-300">
                  {interns.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-sm font-semibold text-muted-foreground select-none">
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
                        className="hover:bg-white/[0.02] hover:text-white transition-colors duration-150"
                      >
                        <td className="py-4 px-6 font-heading font-bold text-white">
                          {intern.internId}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-sm">{intern.fullName}</span>
                            <span className="text-[10px] text-gray-400 mt-0.5">{intern.email}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-white font-semibold">{intern.roleDomain}</span>
                            <span className="text-[10px] text-gray-400 mt-0.5">{intern.department}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-heading font-semibold bg-white/5 text-gray-300 border border-white/[0.08] uppercase tracking-wider">
                            {intern.employmentType || "INTERN"}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-300">
                          {formatDate(intern.startDate)}
                        </td>
                        <td className="py-4 px-6 font-mono text-[11px] font-semibold text-gray-300">
                          {intern.ssidn ? (
                            <span className="bg-white/5 border border-white/[0.08] px-2 py-0.5 rounded text-xs select-text">
                              {isSuperUser
                                ? intern.ssidn
                                : intern.ssidn.length > 4
                                ? `***-**-${intern.ssidn.slice(-4)}`
                                : "****"}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">N/A</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-semibold text-white">
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
                            isAdmin={isSuperUser}
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

        {/* MOBILE VIEW: Card stack (Visible on screens smaller than md) */}
        <div className="block md:hidden space-y-4">
          {interns.length === 0 ? (
            <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-8 text-center text-gray-400 select-none">
              <BadgeAlert className="h-8 w-8 text-gray-500 mx-auto mb-2 animate-pulse" />
              <p className="text-xs font-semibold">No enrollees match your filters.</p>
            </Card>
          ) : (
            interns.map((intern) => (
              <Card
                key={intern.id}
                className="border-white/[0.08] bg-[#0b0f19]/70 backdrop-blur-md p-4 rounded-xl space-y-4 shadow-lg"
              >
                {/* Mobile Card Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 block tracking-wide">
                      {intern.internId}
                    </span>
                    <h3 className="text-sm font-bold text-white">{intern.fullName}</h3>
                    <div className="flex items-center space-x-1 text-[10px] text-gray-400">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{intern.email}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${getStatusBadge(intern.status)}`}>
                    {intern.status}
                  </span>
                </div>

                {/* Mobile Card details */}
                <div className="grid grid-cols-2 gap-3 text-[11px] bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg font-medium text-gray-300">
                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Role & Dept</span>
                    <span className="font-bold text-white block truncate">{intern.roleDomain}</span>
                    <span className="text-[10px] block truncate">{intern.department}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Employment</span>
                    <span className="font-bold text-white block uppercase tracking-wider">{intern.employmentType || "INTERN"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Joining Date</span>
                    <span className="font-semibold block">{formatDate(intern.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">SSIDN / Proof</span>
                    <span className="font-mono block truncate">
                      {intern.ssidn ? (
                        isSuperUser
                          ? intern.ssidn
                          : intern.ssidn.length > 4
                          ? `***-**-${intern.ssidn.slice(-4)}`
                          : "****"
                      ) : (
                        <span className="italic text-gray-500">N/A</span>
                      )}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <UserCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span>Mentor: <strong className="text-white">{intern.supervisor?.fullName || "Unassigned"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Mobile Card actions */}
                <div className="flex items-center justify-end pt-2 border-t border-white/[0.04] gap-2">
                  <RosterActions
                    internId={intern.id}
                    internName={intern.fullName}
                    internDisplayId={intern.internId}
                    isAdmin={isSuperUser}
                  />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
