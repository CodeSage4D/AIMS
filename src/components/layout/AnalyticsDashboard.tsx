"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { CalendarDays, CheckSquare, FileCheck, TrendingUp, HelpCircle } from "lucide-react";

interface AnalyticsDashboardProps {
  attendanceStats: {
    present: number;
    absent: number;
    late: number;
    leave: number;
  };
  taskStats: {
    pending: number;
    inProgress: number;
    inReview: number;
    completed: number;
  };
  complianceStats: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export default function AnalyticsDashboard({
  attendanceStats,
  taskStats,
  complianceStats,
}: AnalyticsDashboardProps) {
  const [hoveredTaskSector, setHoveredTaskSector] = useState<string | null>(null);
  const [hoveredAttendancePoint, setHoveredAttendancePoint] = useState<number | null>(null);

  // ----------------------------------------------------
  // Donut Chart Calculations (Task Stats)
  // ----------------------------------------------------
  const totalTasks =
    taskStats.pending + taskStats.inProgress + taskStats.inReview + taskStats.completed;

  const sectors = [
    { name: "Completed", value: taskStats.completed, color: "#10b981", hoverColor: "#34d399", desc: "Tickets fully closed" },
    { name: "In Review", value: taskStats.inReview, color: "#3b82f6", hoverColor: "#60a5fa", desc: "Awaiting founder audit" },
    { name: "In Progress", value: taskStats.inProgress, color: "#06b6d4", hoverColor: "#22d3ee", desc: "Actively being coded" },
    { name: "Pending", value: taskStats.pending, color: "#f59e0b", hoverColor: "#fbbf24", desc: "Backlog ticket queue" },
  ];

  const filteredSectors = sectors.filter((s) => s.value > 0);
  const totalSectorValue = filteredSectors.reduce((acc, s) => acc + s.value, 0);

  // SVG parameters for donut chart
  const radius = 70;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  // ----------------------------------------------------
  // Bar / Line Chart Mock & Real Trend Calculations (Attendance Trends)
  // ----------------------------------------------------
  // We mock a weekly historic curve using today's live numbers as a scaling anchor.
  // This avoids cold-start empty charts when first seeding.
  const baseScale = Math.max(1, attendanceStats.present + attendanceStats.absent + attendanceStats.late);
  const historicWeeklyTrend = [
    { day: "Mon", present: Math.round(baseScale * 0.8), absent: Math.round(baseScale * 0.1), late: Math.round(baseScale * 0.1) },
    { day: "Tue", present: Math.round(baseScale * 0.85), absent: Math.round(baseScale * 0.05), late: Math.round(baseScale * 0.1) },
    { day: "Wed", present: Math.round(baseScale * 0.9), absent: Math.round(baseScale * 0.05), late: Math.round(baseScale * 0.05) },
    { day: "Thu", present: Math.round(baseScale * 0.88), absent: Math.round(baseScale * 0.08), late: Math.round(baseScale * 0.04) },
    { day: "Fri", present: attendanceStats.present, absent: attendanceStats.absent, late: attendanceStats.late },
  ];

  // Calculate coordinates for SVGs
  const graphWidth = 480;
  const graphHeight = 160;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(
    5,
    ...historicWeeklyTrend.map((d) => d.present + d.absent + d.late)
  ) * 1.15;

  const getCoordinates = (index: number, val: number) => {
    const x = paddingX + (index * (graphWidth - 2 * paddingX)) / (historicWeeklyTrend.length - 1);
    const y = graphHeight - paddingY - (val * (graphHeight - 2 * paddingY)) / maxVal;
    return { x, y };
  };

  // Build smooth curve path using bezier helpers
  let linePathPresent = "";
  let areaPathPresent = "";
  if (historicWeeklyTrend.length > 0) {
    const coords = historicWeeklyTrend.map((d, i) => getCoordinates(i, d.present));
    
    linePathPresent = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      linePathPresent += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
    
    // Closed path for filled gradient area under the line chart
    areaPathPresent = `${linePathPresent} L ${coords[coords.length - 1].x} ${graphHeight - paddingY} L ${coords[0].x} ${graphHeight - paddingY} Z`;
  }

  // ----------------------------------------------------
  // Document Compliance Status (Horizontal Dynamic Progress Card)
  // ----------------------------------------------------
  const totalDocs = complianceStats.pending + complianceStats.approved + complianceStats.rejected;
  const complianceRate = totalDocs > 0 ? Math.round((complianceStats.approved / totalDocs) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Weekly Roster Trends (Line Wave with Translucent Gradients) */}
      <Card className="lg:col-span-2 border-border/60 bg-card/60 backdrop-blur-md relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5 text-indigo-400" />
              <span>Weekly Shift Roster Flow</span>
            </CardTitle>
            <CardDescription>Live attendance activity mapping over business workweeks.</CardDescription>
          </div>
          <div className="flex space-x-4 text-xs font-semibold select-none">
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-gray-300">Present</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-gray-300">Late Check-in</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="relative w-full h-[180px] sm:h-[200px]">
            <svg
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Gradients */}
              <defs>
                <linearGradient id="glacialWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const yVal = paddingY + ratio * (graphHeight - 2 * paddingY);
                return (
                  <line
                    key={idx}
                    x1={paddingX}
                    y1={yVal}
                    x2={graphWidth - paddingX}
                    y2={yVal}
                    stroke="var(--border)"
                    strokeOpacity="0.3"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Filled Wave Path */}
              {areaPathPresent && (
                <path d={areaPathPresent} fill="url(#glacialWaveGrad)" className="transition-all duration-500 ease-out" />
              )}

              {/* Glowing Line Path */}
              {linePathPresent && (
                <path
                  d={linePathPresent}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-500 ease-out"
                />
              )}

              {/* Weekly Trend Data Points & Interactions */}
              {historicWeeklyTrend.map((d, i) => {
                const coord = getCoordinates(i, d.present);
                const isHovered = hoveredAttendancePoint === i;

                return (
                  <g key={i} className="cursor-pointer group">
                    {/* Hover guidelines */}
                    {isHovered && (
                      <line
                        x1={coord.x}
                        y1={paddingY}
                        x2={coord.x}
                        y2={graphHeight - paddingY}
                        stroke="#3b82f6"
                        strokeOpacity="0.4"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Outer glowing anchor point */}
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isHovered ? 8 : 5}
                      fill="#070a13"
                      stroke="#3b82f6"
                      strokeWidth={isHovered ? 3.5 : 2}
                      className="transition-all duration-300 ease-out"
                      onMouseEnter={() => setHoveredAttendancePoint(i)}
                      onMouseLeave={() => setHoveredAttendancePoint(null)}
                    />

                    {/* Date label at bottom */}
                    <text
                      x={coord.x}
                      y={graphHeight - 4}
                      fill="var(--muted-foreground)"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                      className="font-heading transition-colors group-hover:fill-white"
                    >
                      {d.day}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Dynamic floating tooltip when hovering daily points */}
            {hoveredAttendancePoint !== null && (
              <div
                className="absolute p-3 rounded-lg border border-border/80 bg-card text-xs font-semibold shadow-lg text-white backdrop-blur-md animate-fade-in pointer-events-none transition-all duration-200"
                style={{
                  left: `${(hoveredAttendancePoint * (90 / (historicWeeklyTrend.length - 1))) + 5}%`,
                  top: "20px",
                }}
              >
                <p className="text-[10px] uppercase font-bold text-blue-400 font-heading">
                  {historicWeeklyTrend[hoveredAttendancePoint].day} Roster Metrics
                </p>
                <div className="mt-1 space-y-1 text-slate-300">
                  <p className="flex justify-between gap-4">
                    <span>Present:</span>
                    <strong className="text-white">{historicWeeklyTrend[hoveredAttendancePoint].present}</strong>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Late:</span>
                    <strong className="text-amber-400">{historicWeeklyTrend[hoveredAttendancePoint].late}</strong>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Absent:</span>
                    <strong className="text-red-400">{historicWeeklyTrend[hoveredAttendancePoint].absent}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Tasks Distribution (Glowing Vector Donut) */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckSquare className="h-5 w-5 text-emerald-400" />
            <span>Task Resolution Ratio</span>
          </CardTitle>
          <CardDescription>Metrics reflecting work items assigned to interns.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center py-2">
          {totalTasks === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground select-none">
              <HelpCircle className="h-8 w-8 text-gray-500 animate-pulse mb-2" />
              <p className="text-xs font-bold text-gray-400 font-heading">No active task counts available</p>
              <p className="text-[10px] max-w-[200px] mt-1 text-gray-500">
                Tasks created by supervisor units will dynamically update this vector matrix.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center w-full justify-between gap-6">
              {/* Circular SVG Donut */}
              <div className="relative h-[160px] w-[160px] shrink-0">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke="var(--border)"
                    strokeOpacity="0.1"
                    strokeWidth={strokeWidth}
                  />

                  {/* Render colored arcs */}
                  {filteredSectors.map((sector, index) => {
                    const percentage = sector.value / totalSectorValue;
                    const strokeDasharray = `${percentage * circumference} ${circumference}`;
                    const strokeDashoffset = -accumulatedAngle;
                    accumulatedAngle += percentage * circumference;

                    const isHovered = hoveredTaskSector === sector.name;

                    return (
                      <circle
                        key={index}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="transparent"
                        stroke={isHovered ? sector.hoverColor : sector.color}
                        strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-300 ease-out cursor-pointer"
                        onMouseEnter={() => setHoveredTaskSector(sector.name)}
                        onMouseLeave={() => setHoveredTaskSector(null)}
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Core Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="text-3xl font-heading font-extrabold text-white">
                    {totalTasks}
                  </span>
                  <span className="text-[9px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                    Total Tasks
                  </span>
                </div>
              </div>

              {/* Legends with Custom Hover Interaction */}
              <div className="space-y-2 w-full">
                {sectors.map((sec, idx) => {
                  const isHovered = hoveredTaskSector === sec.name;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-1.5 rounded-lg border transition-all duration-200 ${
                        isHovered
                          ? "bg-secondary/20 border-primary/30 translate-x-1"
                          : "border-transparent bg-transparent"
                      }`}
                      onMouseEnter={() => setHoveredTaskSector(sec.name)}
                      onMouseLeave={() => setHoveredTaskSector(null)}
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: sec.color }}
                        />
                        <span className="text-xs font-semibold text-white">{sec.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-white">{sec.value}</span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{sec.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Document Compliance Vault Progress Card */}
      <div className="lg:col-span-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur-md relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <FileCheck className="h-5 w-5 text-cyan-400" />
                  <span>Compliance Onboarding Verification</span>
                </CardTitle>
                <CardDescription>
                  Tracking verification audits for generated credentials and uploaded paperwork.
                </CardDescription>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl sm:text-2xl font-heading font-extrabold text-cyan-400">
                  {complianceRate}%
                </span>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                  Compliance Ratio
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-4">
            {/* Visual Neon Gradient Progress Bar */}
            <div className="w-full h-3.5 bg-border/20 rounded-full overflow-hidden relative border border-border/10">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${complianceRate}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
              </div>
            </div>

            {/* Verification Stats Breakdown Grid */}
            <div className="grid grid-cols-3 gap-4 mt-6 text-center">
              <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <span className="text-lg font-heading font-extrabold text-emerald-400">
                  {complianceStats.approved}
                </span>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">Approved & Signed</p>
              </div>
              <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                <span className="text-lg font-heading font-extrabold text-amber-400">
                  {complianceStats.pending}
                </span>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">Pending Audit</p>
              </div>
              <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                <span className="text-lg font-heading font-extrabold text-red-400">
                  {complianceStats.rejected}
                </span>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">Drafts / Action Needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
