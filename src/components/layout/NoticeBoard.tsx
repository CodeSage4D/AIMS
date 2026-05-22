"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Megaphone, Award, Gift, Calendar, Bell, ExternalLink } from "lucide-react";

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
}

interface NoticeBoardProps {
  announcements: NoticeItem[];
  anniversaries: AnniversaryItem[];
}

export default function NoticeBoard({ announcements, anniversaries }: NoticeBoardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      
      {/* 1. Notice Board Announcements Widget (2/3 width) */}
      <Card className="lg:col-span-2 border-border/60 bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center space-x-2">
          <Megaphone className="h-5 w-5 text-indigo-400 shrink-0" />
          <div>
            <CardTitle>AIMS Notice Board</CardTitle>
            <CardDescription className="text-[11px]">Official company announcements, upcoming updates, and alerts.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {announcements.length === 0 ? (
            <div className="py-10 text-center text-xs font-semibold text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <Bell className="h-6 w-6 text-muted-foreground/40" />
              <span>No active company notices. Check back later for announcements.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((notice) => (
                <div
                  key={notice.id}
                  className="p-4 rounded-xl border border-border/40 bg-secondary/10 hover:border-indigo-500/20 transition-all flex items-start space-x-3.5"
                >
                  <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                    <Megaphone className="h-4.5 w-4.5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-extrabold text-white truncate">{notice.title}</h4>
                      <span className="text-[9px] text-muted-foreground font-semibold flex items-center space-x-1 shrink-0">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(notice.date).toLocaleDateString()}</span>
                      </span>
                    </div>
                    {notice.description && (
                      <p className="text-xs text-gray-300 font-medium mt-1 leading-relaxed">
                        {notice.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
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
              {anniversaries.map((anniv, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/10 hover:border-amber-500/25 rounded-xl text-center space-y-2 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-10 w-10 bg-amber-500/10 rounded-full blur-md pointer-events-none" />
                  
                  <Gift className="h-6 w-6 text-amber-400 mx-auto" />
                  
                  <div>
                    <h4 className="text-xs font-extrabold text-white">{anniv.fullName}</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{anniv.roleDomain}</p>
                  </div>
                  
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-heading font-extrabold uppercase select-none">
                    <Award className="h-3.5 w-3.5 text-amber-400" />
                    <span>{anniv.years === 0 ? "Joining Cheers! 🚀" : `${anniv.years} Yr Anniversary 👑`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
}
