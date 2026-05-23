import React from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getRoleMeta } from "@/lib/roles";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import {
  Users,
  ShieldAlert,
  User,
  Mail,
  FolderOpen,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu
} from "lucide-react";
import Link from "next/link";

interface Member {
  id: string;
  internId: string;
  fullName: string;
  email: string;
  department: string;
  roleDomain: string;
  status: string;
  supervisor: {
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user) {
    return notFound();
  }

  // 1. Fetch active interns with supervisor details
  const interns = await db.intern.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      supervisor: {
        select: {
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      fullName: "asc",
    },
  });

  // Fetch overall administrators for supervisor context
  const admins = await db.user.findMany({
    where: {
      role: { in: ["FOUNDER", "SUPER_ADMIN", "ADMIN", "HR"] },
    },
    select: {
      fullName: true,
      email: true,
      role: true,
    },
    orderBy: { fullName: "asc" },
  });

  // 2. Group interns by department dynamically
  const teamsMap: Record<string, Member[]> = {};
  interns.forEach((intern) => {
    const dept = intern.department || "General";
    if (!teamsMap[dept]) {
      teamsMap[dept] = [];
    }
    teamsMap[dept].push({
      id: intern.id,
      internId: intern.internId,
      fullName: intern.fullName,
      email: intern.email,
      department: intern.department,
      roleDomain: intern.roleDomain,
      status: intern.status,
      supervisor: intern.supervisor
        ? {
            fullName: intern.supervisor.fullName,
            email: intern.supervisor.email,
            role: intern.supervisor.role,
          }
        : null,
    });
  });

  const teamKeys = Object.keys(teamsMap).sort();

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn text-white max-w-6xl mx-auto">
      
      {/* 1. Header Hero Panel */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0c1220] via-[#0d1629] to-[#050b18] p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-20 -top-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-blue-600/15 blur-[60px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-blue-300">
              Company Structure
            </span>
          </div>
          
          <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight leading-tight">
            Teams & Members Directory
          </h2>
          
          <p className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed max-w-3xl">
            Explore company departments, active workspaces, assigned domains, and supervisor details.
            Our dynamic structure maps enrollees directly to mentors and functional units.
          </p>
        </div>
      </div>

      {/* 2. Top-Level Administrators/Leads Banner */}
      <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-5 sm:p-6">
        <CardHeader className="p-0 pb-3 border-b border-white/[0.06] mb-4">
          <CardTitle className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
            <Award className="h-4.5 w-4.5 text-yellow-400" />
            <span>Portal Supervisors & Founders</span>
          </CardTitle>
          <CardDescription className="text-[10px] text-gray-400">Overall directory oversight and program leads</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {admins.map((admin, idx) => (
              <div
                key={`admin-${idx}`}
                className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center space-x-3.5 hover:bg-white/[0.04] transition-all"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-500 p-0.5 shadow-md">
                  <div className="h-full w-full rounded-full bg-[#0b0f19] flex items-center justify-center text-xs font-bold text-yellow-400">
                    {admin.fullName[0].toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-xs font-bold text-white block truncate">{admin.fullName}</span>
                  <span className="text-[9px] font-heading font-bold text-yellow-400 tracking-wider block uppercase font-mono">
                    {admin.role === "FOUNDER" 
                      ? "Founder / Lead Architect" 
                      : admin.role === "SUPER_ADMIN" 
                      ? "Super Admin Director"
                      : admin.role === "ADMIN"
                      ? "Admin Project Manager"
                      : "HR Management Director"}
                  </span>
                  <a
                    href={`mailto:${admin.email}`}
                    className="text-[9px] text-gray-400 hover:text-white flex items-center space-x-1.5 transition-all w-fit mt-0.5"
                  >
                    <Mail className="h-3 w-3 text-gray-500 shrink-0" />
                    <span className="truncate">{admin.email}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Dynamic Departments/Teams Listing */}
      <div className="space-y-6">
        {teamKeys.length === 0 ? (
          <Card className="p-8 text-center border-white/[0.08] bg-[#0b0f19]/60">
            <ShieldAlert className="h-10 w-10 text-gray-500 mx-auto mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-white">No Active Teams Resolved</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
              No enrollees are currently registered with "ACTIVE" portal onboarding states to map company departments.
            </p>
          </Card>
        ) : (
          teamKeys.map((deptName) => {
            const members = teamsMap[deptName];
            const deptId = `TEAM-${deptName.substring(0, 3).toUpperCase()}`;

            // Resolve unique team leads (supervisors) inside this department
            const deptLeadsMap: Record<string, { fullName: string; email: string }> = {};
            members.forEach((m) => {
              if (m.supervisor) {
                deptLeadsMap[m.supervisor.fullName] = {
                  fullName: m.supervisor.fullName,
                  email: m.supervisor.email,
                };
              }
            });
            const deptLeads = Object.values(deptLeadsMap);

            return (
              <Card
                key={deptName}
                className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md overflow-hidden"
              >
                {/* Team Header Panel */}
                <div className="border-b border-white/[0.06] bg-white/[0.01] p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4.5 w-4.5 text-cyan-400" />
                      <span className="text-[10px] font-mono font-extrabold text-cyan-400 uppercase tracking-widest">
                        {deptId}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold px-2 py-0.5 rounded bg-white/5 border border-white/5">
                        {members.length} {members.length === 1 ? "Member" : "Members"}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-heading font-extrabold text-white">
                      {deptName} Team
                    </h3>
                  </div>

                  {/* Team Leads/Mentors */}
                  {deptLeads.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-heading font-bold text-gray-400 uppercase tracking-wider block mr-1">
                        Team Mentors:
                      </span>
                      {deptLeads.map((lead, idx) => (
                        <div
                          key={`lead-${idx}`}
                          className="px-2.5 py-1 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-400 text-xs font-semibold flex items-center space-x-1.5"
                          title={lead.email}
                        >
                          <User className="h-3 w-3" />
                          <span>{lead.fullName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Members Grid */}
                <CardContent className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between space-y-4 hover:border-cyan-500/35 hover:bg-white/[0.04] transition-all group"
                      >
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-wide block">
                              {member.internId}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[8px] font-heading font-extrabold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ACTIVE
                            </span>
                          </div>

                          {(() => {
                            const roleMeta = getRoleMeta(member.roleDomain);
                            return (
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors leading-snug">
                                  {member.fullName}
                                </h4>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-gray-300 flex items-center gap-1 font-bold">
                                    <Cpu className="h-3 w-3 text-cyan-400 shrink-0" />
                                    <span>{roleMeta.roleName} ({roleMeta.shortCode})</span>
                                  </p>
                                  <span className={`inline-block text-[8px] font-heading font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 border border-white/5 ${
                                    roleMeta.appointmentSource === "Founder-appointed" ? "text-amber-450" : roleMeta.appointmentSource === "HR-appointed" ? "text-cyan-400" : "text-emerald-450"
                                  }`}>{roleMeta.appointmentSource}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="pt-3 border-t border-white/[0.04] space-y-2 text-[10px]">
                          <div className="flex justify-between text-gray-400">
                            <span>Email</span>
                            <a
                              href={`mailto:${member.email}`}
                              className="text-white hover:text-cyan-400 truncate max-w-[150px] font-semibold"
                            >
                              {member.email}
                            </a>
                          </div>
                          <div className="flex justify-between text-gray-400">
                            <span>Mentor</span>
                            <span className="text-white font-semibold">
                              {member.supervisor?.fullName || "Founder/HR"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

    </div>
  );
}
