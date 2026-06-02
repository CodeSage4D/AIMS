"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Info, BellRing, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "warning" | "info" | "success" | "danger";
  message: string;
  link?: string;
  actionText?: string;
}

export default function NotificationBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for previously dismissed alerts
    const saved = localStorage.getItem("aims-dismissed-banners");
    if (saved) {
      try {
        setDismissedAlerts(JSON.parse(saved));
      } catch {}
    }

    // Fetch active banner alerts
    fetch("/api/notifications/banner")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      })
      .catch((err) => console.error("Failed to load banner notifications:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = (id: string) => {
    const nextDismissed = [...dismissedAlerts, id];
    setDismissedAlerts(nextDismissed);
    localStorage.setItem("aims-dismissed-banners", JSON.stringify(nextDismissed));
  };

  const activeAlerts = alerts.filter((alert) => !dismissedAlerts.includes(alert.id));

  if (loading || activeAlerts.length === 0) {
    return null;
  }

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return {
          wrapper: "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400 shadow-amber-500/5",
          icon: AlertTriangle,
          btn: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 border-amber-500/20",
        };
      case "info":
        return {
          wrapper: "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400 shadow-sky-500/5",
          icon: Info,
          btn: "bg-sky-500/20 hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border-sky-500/20",
        };
      case "danger":
        return {
          wrapper: "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400 shadow-rose-500/5",
          icon: AlertTriangle,
          btn: "bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 border-rose-500/20",
        };
      case "success":
      default:
        return {
          wrapper: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/5",
          icon: Sparkles,
          btn: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        };
    }
  };

  return (
    <div className="w-full space-y-3 mb-6 select-none animate-fadeIn">
      {activeAlerts.map((alert) => {
        const styles = getAlertStyles(alert.type);
        const Icon = styles.icon;

        return (
          <div
            key={alert.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4.5 shadow-lg backdrop-blur-md transition-all duration-300 flex items-center justify-between gap-4",
              styles.wrapper
            )}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-current opacity-[0.03] blur-[40px] pointer-events-none" />

            <div className="flex items-center space-x-3.5 flex-1 min-w-0">
              <div className="p-2 rounded-xl bg-current/[0.08] shrink-0">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white leading-relaxed">
                  {alert.message}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {alert.link && alert.actionText && (
                <Link href={alert.link}>
                  <button
                    type="button"
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-heading font-extrabold uppercase tracking-wider border transition-all duration-300 hover:scale-[1.02] shadow-sm",
                      styles.btn
                    )}
                  >
                    {alert.actionText}
                  </button>
                </Link>
              )}
              <button
                type="button"
                onClick={() => handleDismiss(alert.id)}
                className="p-1 rounded-lg hover:bg-current/[0.08] text-muted-foreground hover:text-foreground transition-all shrink-0"
                aria-label="Dismiss Alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
