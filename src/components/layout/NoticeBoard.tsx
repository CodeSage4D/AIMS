"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Megaphone, Award, Gift, Calendar, Bell, Plus, X } from "lucide-react";

interface NoticeItem {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  type: string;
}

interface AnniversaryItem {
  internId: string;
  fullName: string;
  roleDomain: string;
  years: number;
  milestoneType?: "ANNIVERSARY" | "BIRTHDAY";
}

interface NoticeBoardProps {
  announcements: NoticeItem[];
  anniversaries: AnniversaryItem[];
  userRole?: string;
}

export default function NoticeBoard({ announcements, anniversaries, userRole }: NoticeBoardProps) {
  const router = useRouter();
  
  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("EVENT");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthorized = userRole === "FOUNDER" || userRole === "HR" || userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Please complete all required fields.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          date: new Date().toISOString(),
          type: type, // EVENT or REMINDER
          targetRole: "ALL",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish notice.");
      }

      setIsOpen(false);
      setTitle("");
      setDescription("");
      router.refresh(); // Fetch fresh data and reload
    } catch (err: any) {
      setError(err.message || "An error occurred while posting announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none relative">
      
      {/* 1. Notice Board Announcements Widget (2/3 width) */}
      <Card className="lg:col-span-2 border-border/60 bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Megaphone className="h-5 w-5 text-indigo-400 shrink-0" />
            <div>
              <CardTitle>AIMS Notice Board</CardTitle>
              <CardDescription className="text-[11px]">Official company announcements, upcoming updates, and alerts.</CardDescription>
            </div>
          </div>
          {isAuthorized && (
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all select-none cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Post Announcement</span>
            </button>
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {announcements.length === 0 ? (
            <div className="py-10 text-center text-xs font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <Bell className="h-6 w-6 text-muted-foreground/40" />
              <span>No active company notices. Check back later for announcements.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((notice) => {
                const isWelcome = notice.type === "WELCOME";
                const isBirthday = notice.type === "BIRTHDAY_ALERT";
                
                let cardClass = "p-4 rounded-xl border border-border/40 bg-secondary/10 hover:border-indigo-500/20 transition-all flex items-start space-x-3.5";
                let iconClass = "p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0";
                let IconComponent = Megaphone;

                if (isWelcome) {
                  cardClass = "p-4 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent hover:border-emerald-500/40 transition-all flex items-start space-x-3.5";
                  iconClass = "p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0";
                  IconComponent = Award;
                } else if (isBirthday) {
                  cardClass = "p-4 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent hover:border-amber-500/40 transition-all flex items-start space-x-3.5";
                  iconClass = "p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0";
                  IconComponent = Gift;
                }

                return (
                  <div key={notice.id} className={cardClass}>
                    <div className={iconClass}>
                      <IconComponent className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start sm:items-center justify-between gap-2">
                        <h4 className="text-xs font-extrabold text-foreground dark:text-white whitespace-normal break-words flex-1 leading-normal">
                          {notice.title}
                        </h4>
                        <span className="text-[9px] text-muted-foreground font-semibold flex items-center space-x-1 shrink-0 mt-0.5 sm:mt-0">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(notice.date).toLocaleDateString()}</span>
                        </span>
                      </div>
                      {notice.description && (
                        <p className="text-xs text-muted-foreground dark:text-gray-300 font-medium mt-1 leading-relaxed">
                          {notice.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Birthday & Work Anniversary greetings widget (1/3 width) */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center space-x-2">
          <Gift className="h-5 w-5 text-amber-400 shrink-0 animate-bounce" />
          <div>
            <CardTitle>Milestones & Cheers</CardTitle>
            <CardDescription className="text-[11px]">Celebrating enrollees' professional steps.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {anniversaries.length === 0 ? (
            <div className="py-10 text-center text-xs font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <Award className="h-6 w-6 text-muted-foreground/40" />
              <span>No milestones or work anniversaries occurring today.</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[16rem] overflow-y-auto pr-1">
              {anniversaries.map((anniv, idx) => {
                const isBirthdayMilestone = anniv.milestoneType === "BIRTHDAY";
                
                let containerClass = "p-3.5 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/10 hover:border-amber-500/25 rounded-xl text-center space-y-2 relative overflow-hidden";
                let ringClass = "absolute top-0 right-0 h-10 w-10 bg-amber-500/10 rounded-full blur-md pointer-events-none";
                
                if (isBirthdayMilestone) {
                  containerClass = "p-3.5 bg-gradient-to-r from-pink-500/5 to-purple-500/5 border border-pink-500/10 hover:border-pink-500/25 rounded-xl text-center space-y-2 relative overflow-hidden";
                  ringClass = "absolute top-0 right-0 h-10 w-10 bg-pink-500/10 rounded-full blur-md pointer-events-none";
                }

                return (
                  <div key={idx} className={containerClass}>
                    <div className={ringClass} />
                    
                    {isBirthdayMilestone ? (
                      <span className="text-2xl block select-none">🎈</span>
                    ) : (
                      <span className="text-2xl block select-none">🍰</span>
                    )}
                    
                    <div>
                      <h4 className="text-xs font-extrabold text-foreground dark:text-white">{anniv.fullName}</h4>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{anniv.roleDomain}</p>
                    </div>
                    
                    {isBirthdayMilestone ? (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-400 text-[10px] font-heading font-extrabold uppercase select-none">
                        <span>{anniv.years}th Birthday! 🎂</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-heading font-extrabold uppercase select-none">
                        <Award className="h-3.5 w-3.5 text-amber-400" />
                        <span>{anniv.years === 0 ? "Joining Cheers! 🚀" : `${anniv.years} Yr Anniversary 👑`}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border dark:border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-fadeIn text-foreground">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-md font-heading font-extrabold text-foreground dark:text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                <span>Post New Announcement</span>
              </h3>
              <p className="text-[10px] text-muted-foreground dark:text-gray-400">
                Broadcast an official system event or reminder notice instantly to the notice board.
              </p>
            </div>

            {error && (
              <div className="p-2.5 bg-red-550/10 border border-red-550/20 text-red-500 dark:text-red-400 text-xs font-semibold rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handlePostNotice} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground dark:text-gray-400 uppercase">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q2 Performance Reviews Schedule"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-secondary/40 dark:bg-[#121826] border border-border dark:border-white/10 rounded-lg p-2.5 text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-muted-foreground dark:placeholder-gray-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground dark:text-gray-400 uppercase">Notice Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-secondary/40 dark:bg-[#121826] border border-border dark:border-white/10 rounded-lg p-2.5 text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="EVENT" className="bg-card text-foreground">Event Banner</option>
                  <option value="REMINDER" className="bg-card text-foreground">Reminder Alert</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground dark:text-gray-400 uppercase">Description / Details</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Write a clear and comprehensive notice description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-secondary/40 dark:bg-[#121826] border border-border dark:border-white/10 rounded-lg p-2.5 text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-muted-foreground dark:placeholder-gray-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg bg-secondary/80 dark:bg-white/5 hover:bg-secondary dark:hover:bg-white/10 text-foreground/80 dark:text-gray-300 font-semibold cursor-pointer border border-border dark:border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Publishing..." : "Publish Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}
