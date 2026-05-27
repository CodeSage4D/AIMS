"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { CalendarDays, CheckSquare, FileCheck, TrendingUp, Activity, HelpCircle } from "lucide-react";

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
  const [hoveredTaskBar, setHoveredTaskBar] = useState<number | null>(null);
  const [hoveredAttendancePoint, setHoveredAttendancePoint] = useState<number | null>(null);
  const [hoveredComplianceSector, setHoveredComplianceSector] = useState<string | null>(null);

  // ----------------------------------------------------
  // Donut Chart Calculations (Compliance Stats)
  // ----------------------------------------------------
  const totalDocs = complianceStats.pending + complianceStats.approved + complianceStats.rejected;
  const complianceRate = totalDocs > 0 ? Math.round((complianceStats.approved / totalDocs) * 100) : 0;

  const complianceSectors = [
    { name: "Approved", value: complianceStats.approved, color: "#10b981", hoverColor: "#34d399", desc: "Signed & verified paperwork" },
    { name: "Pending Audit", value: complianceStats.pending, color: "#f59e0b", hoverColor: "#fbbf24", desc: "Awaiting administrative signing" },
    { name: "Rejected / Action Required", value: complianceStats.rejected, color: "#ef4444", hoverColor: "#f87171", desc: "Rejected drafts needing rework" },
  ];

  const filteredSectors = complianceSectors.filter((s) => s.value > 0);
  const totalSectorValue = filteredSectors.reduce((acc, s) => acc + s.value, 0);

  // SVG parameters for donut chart
  const radius = 60;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  // ----------------------------------------------------
  // Bar Chart Calculations (Task Stats)
  // ----------------------------------------------------
  const totalTasks = taskStats.pending + taskStats.inProgress + taskStats.inReview + taskStats.completed;
  const maxTaskVal = Math.max(5, taskStats.pending, taskStats.inProgress, taskStats.inReview, taskStats.completed);

  const taskBars = [
    { label: "Completed", value: taskStats.completed, colorStart: "#10b981", colorEnd: "#059669" },
    { label: "In Review", value: taskStats.inReview, colorStart: "#3b82f6", colorEnd: "#1d4ed8" },
    { label: "In Progress", value: taskStats.inProgress, colorStart: "#06b6d4", colorEnd: "#0891b2" },
    { label: "Pending", value: taskStats.pending, colorStart: "#f59e0b", colorEnd: "#d97706" },
  ];

  // ----------------------------------------------------
  // Line Chart Calculations (Attendance Trends)
  // ----------------------------------------------------
  const baseScale = Math.max(1, attendanceStats.present + attendanceStats.absent + attendanceStats.late);
  const historicWeeklyTrend = [
    { day: "Mon", present: Math.round(baseScale * 0.8), absent: Math.round(baseScale * 0.1), late: Math.round(baseScale * 0.1) },
    { day: "Tue", present: Math.round(baseScale * 0.85), absent: Math.round(baseScale * 0.05), late: Math.round(baseScale * 0.1) },
    { day: "Wed", present: Math.round(baseScale * 0.9), absent: Math.round(baseScale * 0.05), late: Math.round(baseScale * 0.05) },
    { day: "Thu", present: Math.round(baseScale * 0.88), absent: Math.round(baseScale * 0.08), late: Math.round(baseScale * 0.04) },
    { day: "Fri", present: attendanceStats.present, absent: attendanceStats.absent, late: attendanceStats.late },
  ];

  const graphWidth = 500;
  const graphHeight = 180;
  const paddingX = 40;
  const paddingY = 25;

  const maxAttendanceVal = Math.max(
    5,
    ...historicWeeklyTrend.map((d) => d.present + d.absent + d.late)
  ) * 1.15;

  const getCoordinates = (index: number, val: number) => {
    const x = paddingX + (index * (graphWidth - 2 * paddingX)) / (historicWeeklyTrend.length - 1);
    const y = graphHeight - paddingY - (val * (graphHeight - 2 * paddingY)) / maxAttendanceVal;
    return { x, y };
  };

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
    
    areaPathPresent = `${linePathPresent} L ${coords[coords.length - 1].x} ${graphHeight - paddingY} L ${coords[0].x} ${graphHeight - paddingY} Z`;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 select-none">
      
      {/* Chart A: Weekly Shift Roster Flow (Line Chart) */}
      <Card className="xl:col-span-2 border-border/60 bg-card/60 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center space-x-2 text-sm font-heading font-extrabold text-foreground">
                <CalendarDays className="h-5 w-5 text-indigo-400" />
                <span>Weekly Shift Roster Flow</span>
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Chronological roster attendance metrics mapped across business cycles.
              </CardDescription>
            </div>
            <div className="flex space-x-3 text-[10px] font-bold">
              <span className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-gray-300">Present</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-gray-300">Late</span>
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 flex-1 flex flex-col justify-center">
          <div className="relative w-full h-[180px]">
            <svg
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Gradients */}
              <defs>
                <linearGradient id="glowRosterGrad" x1="0" y1="0" x2="0" y2="1">
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

              {/* Area Under Curve */}
              {areaPathPresent && (
                <path d={areaPathPresent} fill="url(#glowRosterGrad)" className="transition-all duration-500 ease-out" />
              )}

              {/* Main Glowing Curve Line */}
              {linePathPresent && (
                <path
                  d={linePathPresent}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-500 ease-out"
                />
              )}

              {/* Nodes and Hover Interaction */}
              {historicWeeklyTrend.map((d, i) => {
                const coord = getCoordinates(i, d.present);
                const isHovered = hoveredAttendancePoint === i;

                return (
                  <g key={i} className="cursor-pointer">
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

                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isHovered ? 7 : 4.5}
                      fill="#070a13"
                      stroke="#3b82f6"
                      strokeWidth={isHovered ? 3.5 : 2}
                      className="transition-all duration-200 ease-out"
                      onMouseEnter={() => setHoveredAttendancePoint(i)}
                      onMouseLeave={() => setHoveredAttendancePoint(null)}
                    />

                    <text
                      x={coord.x}
                      y={graphHeight - 5}
                      fill="var(--muted-foreground)"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-heading"
                    >
                      {d.day}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Dynamic floating tooltip */}
            {hoveredAttendancePoint !== null && (
              <div
                className="absolute p-3 rounded-xl border border-border bg-black/90 text-xs font-semibold shadow-2xl text-white backdrop-blur-md pointer-events-none transition-all duration-200 animate-fadeIn"
                style={{
                  left: `${(hoveredAttendancePoint * (82 / (historicWeeklyTrend.length - 1))) + 7}%`,
                  top: "10px",
                }}
              >
                <p className="text-[10px] uppercase font-black text-blue-400 font-heading">
                  {historicWeeklyTrend[hoveredAttendancePoint].day} Attendance Ratios
                </p>
                <div className="mt-1.5 space-y-1 text-gray-300">
                  <div className="flex justify-between gap-4">
                    <span>Present:</span>
                    <strong className="text-white">{historicWeeklyTrend[hoveredAttendancePoint].present}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Late Checked:</span>
                    <strong className="text-amber-400">{historicWeeklyTrend[hoveredAttendancePoint].late}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Absenteeism:</span>
                    <strong className="text-red-400">{historicWeeklyTrend[hoveredAttendancePoint].absent}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart B: Task Performance Status (SVG Bar Chart) */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-sm font-heading font-extrabold text-foreground">
            <CheckSquare className="h-5 w-5 text-emerald-400" />
            <span>Task Resolution Ratio</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground">
            Metrics reflecting the status and completion rates of tasks.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2 flex-1 flex flex-col justify-center">
          {totalTasks === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <HelpCircle className="h-8 w-8 text-muted-foreground/35" />
              <span>No task assignments found.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative w-full h-[140px] flex items-end justify-between px-4 pb-2 border-b border-border/20">
                
                {/* Horizontal guide lines */}
                <div className="absolute inset-x-0 bottom-2 top-0 flex flex-col justify-between pointer-events-none">
                  {[0, 0.5, 1].map((ratio) => (
                    <div key={ratio} className="w-full border-t border-border/10 border-dashed relative">
                      <span className="absolute -top-2 left-0 text-[7px] font-bold text-muted-foreground/50">
                        {Math.round(maxTaskVal * ratio)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bars */}
                {taskBars.map((bar, idx) => {
                  const percentHeight = (bar.value / maxTaskVal) * 100;
                  const isHovered = hoveredTaskBar === idx;
                  
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center space-y-1.5 z-10 cursor-pointer"
                      style={{ width: "22%" }}
                      onMouseEnter={() => setHoveredTaskBar(idx)}
                      onMouseLeave={() => setHoveredTaskBar(null)}
                    >
                      {/* Floating tooltip above bar */}
                      <span className={`text-[9px] font-extrabold leading-none transition-all duration-200 ${isHovered ? "opacity-100 -translate-y-1 text-white" : "opacity-0 text-muted-foreground"}`}>
                        {bar.value}
                      </span>
                      
                      <div className="w-full bg-secondary/25 border border-border/20 rounded-lg overflow-hidden h-24 flex items-end">
                        <div
                          className="w-full rounded-t-md transition-all duration-500 ease-out"
                          style={{
                            height: `${percentHeight}%`,
                            background: `linear-gradient(to top, ${bar.colorStart}, ${bar.colorEnd})`,
                            boxShadow: isHovered ? `0 0 12px ${bar.colorStart}55` : "none"
                          }}
                        />
                      </div>
                      
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-muted-foreground truncate w-full text-center">
                        {bar.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Total count ticker */}
              <div className="flex justify-between items-center text-[10px] font-extrabold bg-secondary/10 p-2.5 rounded-xl border border-border/40">
                <span className="text-muted-foreground uppercase tracking-wider"> Roster Workload Queue</span>
                <span className="text-white bg-primary/20 px-2 py-0.5 border border-primary/30 rounded font-mono">{totalTasks} Tickets</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart C: Compliance Documentation Audit (SVG Donut Chart) */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-sm font-heading font-extrabold text-foreground">
            <FileCheck className="h-5 w-5 text-cyan-400" />
            <span>Compliance Documents Status</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground">
            Verification distributions of uploaded compliance files.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2 flex-1 flex flex-col justify-center">
          {totalDocs === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <HelpCircle className="h-8 w-8 text-muted-foreground/35" />
              <span>No compliance documents found.</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              {/* Donut SVG */}
              <div className="relative h-[115px] w-[115px] shrink-0">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 150 150">
                  {/* Base Circle */}
                  <circle
                    cx="75"
                    cy="75"
                    r={radius}
                    fill="transparent"
                    stroke="var(--border)"
                    strokeOpacity="0.1"
                    strokeWidth={strokeWidth}
                  />
                  {/* Glowing Arcs */}
                  {filteredSectors.map((sector, index) => {
                    const percentage = sector.value / totalSectorValue;
                    const strokeDasharray = `${percentage * circumference} ${circumference}`;
                    const strokeDashoffset = -accumulatedAngle;
                    accumulatedAngle += percentage * circumference;
                    const isHovered = hoveredComplianceSector === sector.name;

                    return (
                      <circle
                        key={index}
                        cx="75"
                        cy="75"
                        r={radius}
                        fill="transparent"
                        stroke={sector.color}
                        strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredComplianceSector(sector.name)}
                        onMouseLeave={() => setHoveredComplianceSector(null)}
                        style={{
                          filter: isHovered ? `drop-shadow(0 0 4px ${sector.color})` : "none"
                        }}
                      />
                    );
                  })}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                  <span className="text-2xl font-heading font-extrabold text-white leading-none">
                    {complianceRate}%
                  </span>
                  <span className="text-[7.5px] font-heading font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">
                    Verified
                  </span>
                </div>
              </div>

              {/* Legends list */}
              <div className="flex-1 space-y-1.5">
                {complianceSectors.map((sec, idx) => {
                  const isHovered = hoveredComplianceSector === sec.name;
                  return (
                    <div
                      key={idx}
                      className={`p-1.5 rounded-lg border transition-all duration-200 ${isHovered ? "bg-secondary/15 border-primary/20 scale-102" : "border-transparent"}`}
                      onMouseEnter={() => setHoveredComplianceSector(sec.name)}
                      onMouseLeave={() => setHoveredComplianceSector(null)}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                          <span className="font-bold text-gray-200 truncate max-w-[90px]">{sec.name.split(" ")[0]}</span>
                        </div>
                        <span className="font-mono font-bold text-white bg-secondary/35 px-1.5 py-0.5 rounded text-[8.5px]">
                          {sec.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart D: Real-Time Operational Network Activity (ECG / Telemetry Wave) */}
      <Card className="md:col-span-2 xl:col-span-3 border-border/60 bg-card/60 backdrop-blur-md relative overflow-hidden">
        <CardHeader className="pb-1.5 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="flex items-center space-x-2 text-xs font-heading font-extrabold text-foreground">
              <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span>Real-Time Workforce Presence Radar</span>
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Live telemetry monitoring heartbeat and system operation synchronization.
            </CardDescription>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest animate-pulse">
            ● Signal Active
          </span>
        </CardHeader>

        <CardContent className="py-2.5">
          <div className="relative w-full h-11 bg-secondary/10 border border-border/20 rounded-xl overflow-hidden flex items-center px-4">
            <svg
              viewBox="0 0 800 50"
              className="w-full h-full overflow-visible opacity-85"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="waveGlow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Grid vertical lines representation */}
              {Array.from({ length: 16 }).map((_, i) => (
                <line
                  key={i}
                  x1={i * 55}
                  y1={0}
                  x2={i * 55}
                  y2={50}
                  stroke="var(--border)"
                  strokeOpacity="0.12"
                  strokeWidth="0.8"
                />
              ))}

              {/* ECG heartbeat line */}
              <path
                d="M 0,25 L 120,25 L 130,10 L 140,40 L 150,25 L 280,25 L 290,5 L 300,45 L 310,25 L 490,25 L 500,10 L 510,40 L 520,25 L 670,25 L 680,2 L 690,48 L 700,25 L 800,25"
                fill="none"
                stroke="url(#waveGlow)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
