import React from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getRoleMeta, isExecutiveRole } from "@/lib/roles";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import {
  Users,
  ShieldAlert,
  User,
  Mail,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
  Award,
  Crown,
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink
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

  // 2. Classify personnel dynamically
  const executives: Member[] = [];
  const coreLeadership: Member[] = [];
  const departmentTeams: Record<string, Member[]> = {};

  interns.forEach((intern) => {
    const member: Member = {
      id: intern.id,
      internId: intern.internId,
      fullName: intern.fullName,
      email: intern.email,
      department: intern.department || "General",
      roleDomain: intern.roleDomain,
      status: intern.status,
      supervisor: intern.supervisor
        ? {
            fullName: intern.supervisor.fullName,
            email: intern.supervisor.email,
            role: intern.supervisor.role,
          }
        : null,
    };

    const roleNameLower = intern.roleDomain.toLowerCase();
    
    if (isExecutiveRole(intern.roleDomain)) {
      executives.push(member);
    } else if (
      roleNameLower.includes("head") ||
      roleNameLower.includes("manager") ||
      roleNameLower.includes("lead") ||
      roleNameLower.includes("director") ||
      roleNameLower.includes("coordinator")
    ) {
      coreLeadership.push(member);
    } else {
      const dept = intern.department || "General";
      if (!departmentTeams[dept]) {
        departmentTeams[dept] = [];
      }
      departmentTeams[dept].push(member);
    }
  });

  // 3. Supplement missing administrators (e.g. mock session accounts or live admins without intern profiles)
  admins.forEach((admin) => {
    const alreadyIncluded = interns.some((i) => i.email.toLowerCase() === admin.email.toLowerCase());
    if (!alreadyIncluded) {
      const isExec = admin.role === "FOUNDER" || admin.role === "SUPER_ADMIN";
      const member: Member = {
        id: admin.email,
        internId: admin.role === "FOUNDER" ? "AXN-FND-00" : "AXN-ADM-00",
        fullName: admin.fullName,
        email: admin.email,
        department: isExec ? "Management" : "Administration",
        roleDomain: admin.role === "FOUNDER" ? "Founder" : admin.role === "SUPER_ADMIN" ? "Super Admin" : admin.role === "HR" ? "HR Manager" : "Admin Manager",
        status: "ACTIVE",
        supervisor: null,
      };

      if (isExec) {
        executives.push(member);
      } else {
        coreLeadership.push(member);
      }
    }
  });

  const departmentNames = Object.keys(departmentTeams).sort();

  return (
    <div className="space-y-8 sm:space-y-12 animate-fadeIn text-white max-w-6xl mx-auto pb-12">
      
      {/* 1. Header Hero Panel */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0c1220] via-[#0d1629] to-[#050b18] p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-20 -top-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-blue-600/15 blur-[60px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Users className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
            <span className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-blue-300">
              AURXON ORG HIERARCHY
            </span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-white tracking-tight leading-tight">
            Corporate Roster & Hierarchy
          </h2>
          
          <p className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed max-w-3xl">
            Explore the startup structural hierarchy at AURXON. From executive leadership oversight to dynamic
            department reporting lines, our unified org schema empowers mentors, leads, and engineers to build in sync.
          </p>
        </div>
      </div>

      {/* 2. Executive Leadership Section */}
      {executives.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-white/[0.06] pb-3">
            <div className="p-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Crown className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-extrabold text-white">Executive Leadership</h3>
              <p className="text-[10px] text-gray-400">Chief corporate board officers and startup co-founders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {executives.map((member) => {
              const roleMeta = getRoleMeta(member.roleDomain);
              return (
                <div
                  key={member.id}
                  className="relative overflow-hidden p-5 rounded-2xl border border-yellow-500/15 bg-gradient-to-b from-yellow-500/[0.02] via-[#0b0f19]/70 to-[#0b0f19] shadow-lg hover:border-yellow-500/30 hover:scale-[1.01] transition-all group duration-300"
                >
                  <div className="absolute right-0 top-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-yellow-500/10 transition-all duration-300" />
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase tracking-wider font-mono">
                        {member.internId}
                      </span>
                      <h4 className="text-base font-extrabold text-white truncate group-hover:text-yellow-400 transition-colors">
                        {member.fullName}
                      </h4>
                      <p className="text-xs font-bold text-gray-300 flex items-center space-x-1.5 uppercase font-mono">
                        <Award className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        <span>{roleMeta.roleName} ({roleMeta.shortCode})</span>
                      </p>
                    </div>

                    <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-500 p-0.5 shadow-md flex-shrink-0">
                      <div className="h-full w-full rounded-xl bg-[#0b0f19] flex items-center justify-center text-sm font-extrabold text-yellow-400">
                        {member.fullName[0].toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/[0.04] space-y-2.5 text-xs text-gray-400">
                    <div className="flex justify-between items-center gap-2">
                      <span>Corporate Email</span>
                      <a
                        href={`mailto:${member.email}`}
                        className="text-white hover:text-yellow-400 font-semibold truncate hover:underline flex items-center space-x-1"
                      >
                        <Mail className="h-3 w-3 shrink-0 text-gray-500" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Scope Control</span>
                      <span className="text-[9px] font-heading font-extrabold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/10 uppercase tracking-widest">
                        Owner Board Control
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Core Leadership Section */}
      {coreLeadership.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-white/[0.06] pb-3">
            <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Award className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-extrabold text-white">Core Leadership Team</h3>
              <p className="text-[10px] text-gray-400">Department heads, engineering managers, and team leads</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreLeadership.map((member) => {
              const roleMeta = getRoleMeta(member.roleDomain);
              return (
                <div
                  key={member.id}
                  className="p-5 rounded-2xl border border-cyan-500/10 bg-[#0b0f19]/80 shadow-md hover:border-cyan-500/25 hover:scale-[1.01] transition-all group duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider font-mono">
                        {member.internId}
                      </span>
                      <h4 className="text-sm font-extrabold text-white truncate group-hover:text-cyan-400 transition-colors">
                        {member.fullName}
                      </h4>
                      <p className="text-xs font-bold text-gray-300 flex items-center space-x-1.5 uppercase font-mono">
                        <Cpu className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span>{roleMeta.roleName} ({roleMeta.shortCode})</span>
                      </p>
                    </div>

                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 p-0.5 shadow flex-shrink-0">
                      <div className="h-full w-full rounded-xl bg-[#0b0f19] flex items-center justify-center text-xs font-extrabold text-cyan-400">
                        {member.fullName[0].toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/[0.04] space-y-2.5 text-xs text-gray-400">
                    <div className="flex justify-between items-center gap-2">
                      <span>Department</span>
                      <span className="text-white font-bold">{member.department}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span>Roster Email</span>
                      <a
                        href={`mailto:${member.email}`}
                        className="text-white hover:text-cyan-400 font-semibold truncate hover:underline flex items-center space-x-1"
                      >
                        <Mail className="h-3 w-3 shrink-0 text-gray-500" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Departments / Roster Directory Hierarchies */}
      <div className="space-y-8">
        <div className="flex items-center space-x-3 border-b border-white/[0.06] pb-3">
          <div className="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Layers className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-extrabold text-white">Department Teams & Reporting Structure</h3>
            <p className="text-[10px] text-gray-400">Engineering, design, operations, and HR staff grouped by department reporting lines</p>
          </div>
        </div>

        {departmentNames.length === 0 ? (
          <Card className="p-10 text-center border-white/[0.08] bg-[#0b0f19]/60">
            <ShieldAlert className="h-10 w-10 text-gray-500 mx-auto mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-white">No Department Staff Roster Found</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
              No staff members or interns are currently assigned to active departments.
            </p>
          </Card>
        ) : (
          departmentNames.map((deptName) => {
            const members = departmentTeams[deptName];
            const deptId = `TEAM-${deptName.substring(0, 3).toUpperCase()}`;

            return (
              <Card
                key={deptName}
                className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md overflow-hidden shadow-lg"
              >
                {/* Department Header */}
                <div className="border-b border-white/[0.06] bg-white/[0.01] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-mono font-extrabold text-cyan-400 uppercase tracking-widest">
                        {deptId}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold px-2 py-0.5 rounded bg-white/5 border border-white/5">
                        {members.length} {members.length === 1 ? "Member" : "Members"}
                      </span>
                    </div>
                    <h3 className="text-base font-heading font-extrabold text-white">
                      {deptName} Department
                    </h3>
                  </div>
                </div>

                {/* Team Members Grid showing Reporting Lines */}
                <CardContent className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {members.map((member) => {
                      const roleMeta = getRoleMeta(member.roleDomain);
                      return (
                        <div
                          key={member.id}
                          className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between space-y-4 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all group"
                        >
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-wide block">
                                {member.internId}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[8px] font-heading font-extrabold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ACTIVE
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors leading-snug">
                                {member.fullName}
                              </h4>
                              <p className="text-[10px] text-gray-300 flex items-center gap-1 font-bold">
                                <Briefcase className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                <span>{roleMeta.roleName} ({roleMeta.shortCode})</span>
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-white/[0.04] space-y-2 text-[10px]">
                            <div className="flex justify-between text-gray-400">
                              <span>Department Scope</span>
                              <span className="text-white font-semibold">{member.department}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                              <span>Reporting Line</span>
                              <span className="text-white font-semibold flex items-center space-x-1">
                                <User className="h-3 w-3 text-cyan-400" />
                                <span>{member.supervisor?.fullName || "Founder/HR"}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. Hiring Core Team (Interactive Growth Showcase) */}
      <div className="space-y-6 bg-gradient-to-r from-blue-900/10 via-[#0d1629]/80 to-cyan-900/10 border border-white/[0.08] p-6 sm:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
            </div>
            <h3 className="text-base font-heading font-extrabold text-white">Hiring Core Team</h3>
          </div>
          
          <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-2xl">
            We are actively expanding our foundational and leadership vectors. Our corporate team is on the lookout
            for experienced technical and product architects to lead engineering sprints.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0b0f19]/70 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider block font-mono">HR-ADMIN-04</span>
                <span className="text-[8px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
                  OPEN POSITION
                </span>
              </div>
              <h4 className="text-xs font-bold text-white">Chief Strategy Officer (CSO)</h4>
              <div className="flex items-center space-x-3 text-[10px] text-gray-400 pt-1">
                <span className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span>Remote / Delhi HQ</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span>Full-Time</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0b0f19]/70 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider block font-mono">ENG-AI-09</span>
                <span className="text-[8px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
                  OPEN POSITION
                </span>
              </div>
              <h4 className="text-xs font-bold text-white">Principal AI & ML Researcher</h4>
              <div className="flex items-center space-x-3 text-[10px] text-gray-400 pt-1">
                <span className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span>Delhi HQ</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span>Full-Time</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0b0f19]/70 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider block font-mono">OPS-SEC-01</span>
                <span className="text-[8px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
                  OPEN POSITION
                </span>
              </div>
              <h4 className="text-xs font-bold text-white">Lead Cybersecurity Architect</h4>
              <div className="flex items-center space-x-3 text-[10px] text-gray-400 pt-1">
                <span className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span>Hybrid</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span>Full-Time</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
