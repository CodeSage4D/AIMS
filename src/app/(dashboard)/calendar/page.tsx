"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Video,
  Clock,
  Trash2,
  AlertTriangle,
  Sparkles,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  type: string; // MEETING, DEADLINE, ONBOARDING, REMINDER, EVENT
  targetRole?: string | null;
  intern?: { fullName: string; internId: string } | null;
  creator?: { fullName: string } | null;
}

interface HolidayItem {
  id: string;
  title: string;
  date: string;
  isCustom: boolean;
}

interface LeaveItem {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: string;
  intern?: { fullName: string; internId: string } | null;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "INTERN";

  // Data States
  const [events, setEvents] = useState<EventItem[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // New Event Form State
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("MEETING");
  const [eventTargetRole, setEventTargetRole] = useState("ALL");

  // New Holiday Form State
  const [holidayTitle, setHolidayTitle] = useState("");
  const [holidayDate, setHolidayDate] = useState("");

  // Notification Alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calendar Traversals
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const [eventsRes, holidaysRes, leavesRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/holidays"),
        fetch("/api/leave"),
      ]);

      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (holidaysRes.ok) setHolidays(await holidaysRes.json());
      if (leavesRes.ok) {
        const leavesData = await leavesRes.json();
        // Only display approved leaves on the calendar
        setLeaves(leavesData.filter((l: LeaveItem) => l.status === "APPROVED"));
      }
    } catch (err) {
      console.error("Failed to fetch calendar data stream:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const getHolidaysForDay = (day: number) => {
    return holidays.filter((h) => {
      const hDate = new Date(h.date);
      return hDate.getUTCFullYear() === year && hDate.getUTCMonth() === month && hDate.getUTCDate() === day;
    });
  };

  const getEventsForDay = (day: number) => {
    return events.filter((e) => {
      const eDate = new Date(e.date);
      return eDate.getUTCFullYear() === year && eDate.getUTCMonth() === month && eDate.getUTCDate() === day;
    });
  };

  const getLeavesForDay = (day: number) => {
    return leaves.filter((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      
      // Zero out hours to compare accurately
      const targetDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
      
      const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0));
      const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));
      
      return targetDate >= startUTC && targetDate <= endUTC;
    });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitLoading(true);

    if (!eventTitle || !eventDate) {
      setError("Event title and date are required.");
      setSubmitLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDesc,
          date: eventDate,
          type: eventType,
          targetRole: eventTargetRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create event.");
      }

      setSuccess("Event scheduled successfully!");
      setIsEventModalOpen(false);
      setEventTitle("");
      setEventDesc("");
      setEventDate("");
      setEventType("MEETING");
      setEventTargetRole("ALL");
      await fetchCalendarData();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitLoading(true);

    if (!holidayTitle || !holidayDate) {
      setError("Holiday title and date are required.");
      setSubmitLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: holidayTitle,
          date: holidayDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create holiday.");
      }

      setSuccess("Official holiday registered successfully!");
      setIsHolidayModalOpen(false);
      setHolidayTitle("");
      setHolidayDate("");
      await fetchCalendarData();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/events?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCalendarData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete event.");
      }
    } catch (err) {
      console.error("Delete event failed:", err);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      const res = await fetch(`/api/holidays?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCalendarData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete holiday.");
      }
    } catch (err) {
      console.error("Delete holiday failed:", err);
    }
  };

  const getEventClass = (type: string) => {
    switch (type) {
      case "MEETING":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
      case "DEADLINE":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse";
      case "ONBOARDING":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      default:
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      
      {/* Notifications overlay */}
      {(success || error) && (
        <div className="fixed top-20 right-6 z-50 max-w-sm space-y-2 animate-fadeIn">
          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold shadow-2xl backdrop-blur-md">
              {success}
            </div>
          )}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold shadow-2xl backdrop-blur-md">
              {error}
            </div>
          )}
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-slate-950/90 p-5 sm:p-7 shadow-xl">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-[50px]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white flex items-center space-x-2">
              <CalendarDays className="h-6 w-6 text-indigo-400" />
              <span>Company Calendar & Scheduling</span>
            </h2>
            <p className="text-xs text-gray-300 font-medium">
              Synchronize upcoming client meetings, intern evaluation deadlines, national holidays, and active leaves. Bypasses absent checks on weekly offs automatically.
            </p>
          </div>
          
          {(userRole === "FOUNDER" || userRole === "HR") && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={() => setIsEventModalOpen(true)}
                variant="primary"
                size="sm"
                className="h-10 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl px-4 flex items-center space-x-1.5"
              >
                <PlusCircle className="h-4.5 w-4.5" />
                <span>Schedule Event</span>
              </Button>
              <Button
                onClick={() => setIsHolidayModalOpen(true)}
                variant="secondary"
                size="sm"
                className="h-10 text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-4 text-white flex items-center space-x-1.5"
              >
                <Sparkles className="h-4.5 w-4.5 text-amber-400" />
                <span>Declare Holiday</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive month calendar view & Sidebar events queue split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Calendar View Grid (2/3 width) */}
        <Card className="xl:col-span-2 border-border/60 bg-card/60 backdrop-blur-md p-0 overflow-hidden shadow-xl">
          <CardHeader className="border-b border-border/40 p-5 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-lg">Monthly Shift & Planning Board</CardTitle>
              <CardDescription className="text-[11px]">Hover over dates to review enrollees' leaves or meetings.</CardDescription>
            </div>
            
            <div className="flex items-center space-x-2 bg-secondary/40 border border-border/80 rounded-lg p-1">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-secondary rounded-md transition-all cursor-pointer">
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <span className="text-xs font-bold px-3 uppercase tracking-wider min-w-[120px] text-center text-foreground select-none">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-secondary rounded-md transition-all cursor-pointer">
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-1 sm:gap-2.5 text-center text-xs font-semibold select-none">
              {/* Day Headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dName) => (
                <div key={dName} className="text-muted-foreground text-[10px] uppercase font-bold py-2 tracking-wider">
                  {dName}
                </div>
              ))}

              {/* Pad Offset days */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`offset-${idx}`} className="h-16 sm:h-20 rounded-xl bg-secondary/10 border border-border/20 opacity-20" />
              ))}

              {/* Calendar Days loop */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dailyEvents = getEventsForDay(day);
                const dailyHolidays = getHolidaysForDay(day);
                const dailyLeaves = getLeavesForDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                return (
                  <div
                    key={`day-${day}`}
                    className={cn(
                      "h-16 sm:h-20 rounded-xl p-1.5 sm:p-2.5 flex flex-col justify-between items-start border bg-card/40 transition-all hover:bg-secondary/20",
                      isToday ? "border-indigo-500 bg-indigo-500/5 shadow-inner" : "border-border/60"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] sm:text-xs font-bold rounded-md h-5 w-5 flex items-center justify-center",
                      isToday ? "bg-indigo-500 text-white" : "text-foreground"
                    )}>
                      {day}
                    </span>
                    
                    <div className="w-full space-y-0.5 mt-1 overflow-hidden">
                      {/* 1. Holidays Block */}
                      {dailyHolidays.map((h) => (
                        <div
                          key={h.id}
                          className="bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[6.5px] sm:text-[7.5px] px-1 py-0.5 rounded truncate font-heading font-extrabold uppercase"
                          title={`Holiday: ${h.title}`}
                        >
                          🎉 {h.title}
                        </div>
                      ))}

                      {/* 2. Leaves Block */}
                      {dailyLeaves.map((l) => (
                        <div
                          key={l.id}
                          className="bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[6.5px] sm:text-[7.5px] px-1 py-0.5 rounded truncate font-bold font-heading uppercase"
                          title={`Leave: ${l.intern?.fullName || "Intern"}`}
                        >
                          🌴 {l.intern?.fullName || "Leave"}
                        </div>
                      ))}

                      {/* 3. Meetings & Deadlines Block */}
                      {dailyEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className={cn(
                            "text-[6.5px] sm:text-[7.5px] px-1 py-0.5 rounded truncate font-semibold font-heading uppercase",
                            ev.type === "MEETING" ? "bg-blue-500/15 border border-blue-500/20 text-blue-500" : "bg-rose-500/15 border border-rose-500/20 text-rose-500 animate-pulse"
                          )}
                          title={`${ev.type}: ${ev.title}`}
                        >
                          {ev.type === "MEETING" ? "📞" : "🚨"} {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Informative Info Banner */}
            <div className="mt-6 p-4 rounded-xl border border-border/80 bg-secondary/20 text-muted-foreground text-xs leading-relaxed flex items-start space-x-2">
              <Info className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Attendance Note:</strong> AIMS auto-absent schedulers run dynamic checks daily at **10:00 AM IST**. Approved Leaves, custom designated holidays, and weekend offs are completely skipped to prevent erroneous penalties.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Events Queue (1/3 width) */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-xl">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center space-x-2">
                <Video className="h-5 w-5 text-indigo-400" />
                <span>Scheduled Events Stream</span>
              </CardTitle>
              <CardDescription className="text-[11px]">List of all active calendar assemblies.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="py-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                  Querying scheduled streams...
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-muted-foreground">
                  No upcoming meetings or deadline sweeps scheduled.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[28rem] overflow-y-auto pr-1">
                  {events.map((eItem) => (
                    <div
                      key={eItem.id}
                      className="p-3 bg-secondary/15 rounded-xl border border-border/40 flex flex-col justify-between gap-2.5 hover:border-indigo-500/35 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn("text-[8px] font-heading font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-lg", getEventClass(eItem.type))}>
                          {eItem.type}
                        </span>
                        
                        {(userRole === "FOUNDER" || userRole === "HR") && (
                          <button
                            onClick={() => handleDeleteEvent(eItem.id)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="Cancel Event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-xs font-extrabold text-foreground">{eItem.title}</h4>
                        {eItem.description && (
                          <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                            {eItem.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-indigo-400" />
                          <span>{new Date(eItem.date).toLocaleDateString()}</span>
                        </span>
                        <span>By: {eItem.creator?.fullName || "Supervisor"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick list of declared custom holidays */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-xl">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm">Official Holidays List</CardTitle>
              <CardDescription className="text-[10px]">Declared dates skipped by absent sweeper.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {holidays.length === 0 ? (
                <p className="text-[10px] text-muted-foreground font-semibold text-center py-4">No custom holidays declared.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {holidays.map((hItem) => (
                    <div key={hItem.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/10 border border-border/40 text-xs">
                      <div>
                        <span className="font-bold text-foreground">{hItem.title}</span>
                        <p className="text-[9px] text-muted-foreground font-semibold">{new Date(hItem.date).toLocaleDateString()}</p>
                      </div>
                      
                      {(userRole === "FOUNDER" || userRole === "HR") && (
                        <button
                          onClick={() => handleDeleteHoliday(hItem.id)}
                          className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Event Scheduling Overlay Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-md">
            <Card className="border-white/10 bg-[#0b0f19]/85 backdrop-blur-xl shadow-2xl relative">
              <CardHeader className="pb-4">
                <CardTitle>Schedule Calendar Event</CardTitle>
                <CardDescription>Configure upcoming meeting sessions or important task deadlines.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Event Title
                    </label>
                    <Input
                      type="text"
                      required
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. Weekly Standup, Code Review"
                      className="bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Description / Agenda
                    </label>
                    <textarea
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      placeholder="Enter details, video links, or preparation notes..."
                      rows={2.5}
                      className="flex w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                        Date & Time
                      </label>
                      <Input
                        type="datetime-local"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="bg-white/5 border-white/10 text-white rounded-xl"
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                        Event Category
                      </label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        required
                        className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
                      >
                        <option value="MEETING" className="bg-[#0b0f19]">Meeting (📞)</option>
                        <option value="DEADLINE" className="bg-[#0b0f19]">Deadline (🚨)</option>
                        <option value="ONBOARDING" className="bg-[#0b0f19]">Onboarding (🌱)</option>
                        <option value="EVENT" className="bg-[#0b0f19]">General Event (📢)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Target Audience
                    </label>
                    <select
                      value={eventTargetRole}
                      onChange={(e) => setEventTargetRole(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
                    >
                      <option value="ALL" className="bg-[#0b0f19]">All Platform Members</option>
                      <option value="INTERN" className="bg-[#0b0f19]">Intern Roles Only</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.08]">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsEventModalOpen(false)}
                      disabled={submitLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      isLoading={submitLoading}
                    >
                      Schedule Event
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 4. Holiday Declarations Overlay Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-md">
            <Card className="border-white/10 bg-[#0b0f19]/85 backdrop-blur-xl shadow-2xl relative">
              <CardHeader className="pb-4">
                <CardTitle>Declare Official Holiday</CardTitle>
                <CardDescription>Specify calendar dates that are exempted from active shift/attendance audits.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateHoliday} className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Holiday Title
                    </label>
                    <Input
                      type="text"
                      required
                      value={holidayTitle}
                      onChange={(e) => setHolidayTitle(e.target.value)}
                      placeholder="e.g. Independence Day, Diwali Break"
                      className="bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Calendar Date
                    </label>
                    <Input
                      type="date"
                      required
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.08]">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsHolidayModalOpen(false)}
                      disabled={submitLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      isLoading={submitLoading}
                    >
                      Register Holiday
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
}
