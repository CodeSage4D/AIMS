"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { signOut } from "next-auth/react";
import { CurrencyProvider } from "@/lib/useCurrency";

interface DashboardLayoutProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  children: React.ReactNode;
}

export default function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Automatic Idle Inactivity & Tab Background Timeout Listener
  useEffect(() => {
    // 10 minutes of complete inactivity idle timeout
    const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
    // 3 minutes background / hidden tab limit
    const BACKGROUND_TIMEOUT_MS = 3 * 60 * 1000;

    let idleTimer: NodeJS.Timeout;
    let intervalTimer: NodeJS.Timeout;

    const performLogout = async () => {
      // Clear timers to prevent double triggers
      clearTimeout(idleTimer);
      clearInterval(intervalTimer);
      localStorage.removeItem("aims-last-active");
      localStorage.removeItem("aims-hidden-time");
      // Trigger a clean signOut redirecting to login page
      await signOut({ callbackUrl: "/login" });
    };

    const checkTimeout = () => {
      const now = Date.now();
      const lastActiveStr = localStorage.getItem("aims-last-active");
      const hiddenTimeStr = localStorage.getItem("aims-hidden-time");

      // 1. Check absolute idle inactivity
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        if (now - lastActive > IDLE_TIMEOUT_MS) {
          performLogout();
          return true;
        }
      }

      // 2. Check tab hidden background duration
      if (hiddenTimeStr && !document.hidden) {
        const hiddenTime = parseInt(hiddenTimeStr, 10);
        if (now - hiddenTime > BACKGROUND_TIMEOUT_MS) {
          performLogout();
          return true;
        }
      }
      return false;
    };

    const resetIdleTimer = () => {
      const now = Date.now();
      localStorage.setItem("aims-last-active", now.toString());
      
      // If the tab is visible, clear any hidden time
      if (!document.hidden) {
        localStorage.removeItem("aims-hidden-time");
      }

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        performLogout();
      }, IDLE_TIMEOUT_MS);
    };

    // User activity events to listen to
    const activityEvents = ["mousemove", "mousedown", "keypress", "scroll", "click", "touchstart"];
    
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });

    // Handle tab visibility change
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        // Tab became hidden, save current time to localStorage if not already set
        if (!localStorage.getItem("aims-hidden-time")) {
          localStorage.setItem("aims-hidden-time", now.toString());
        }
      } else {
        // Tab became active again (returned to main work)
        // First check if we exceeded the background tab timeout (3 min) or total idle timeout (10 min)
        const loggedOut = checkTimeout();
        if (!loggedOut) {
          // If we are back and not logged out, clear hidden time and update last active
          localStorage.removeItem("aims-hidden-time");
          localStorage.setItem("aims-last-active", now.toString());
          resetIdleTimer();
        }
      }
    };

    // Listen to visibility and focus events
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // Persist current active time on load
    const currentActive = localStorage.getItem("aims-last-active");
    if (!currentActive) {
      localStorage.setItem("aims-last-active", Date.now().toString());
    }

    // Initial check on mount
    const loggedOut = checkTimeout();
    if (!loggedOut) {
      resetIdleTimer();
    }

    // Periodic cross-tab check every 5 seconds
    intervalTimer = setInterval(() => {
      checkTimeout();
    }, 5000);

    // Clean up on component unmount
    return () => {
      clearTimeout(idleTimer);
      clearInterval(intervalTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <CurrencyProvider>
      <div className="min-h-screen flex bg-background">
        {/* 1. Backdrop Overlay for Mobile Sidebar */}
        {isSidebarOpen && (
          <div
            onClick={closeSidebar}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          />
        )}

        {/* 2. Navigation Sidebar Column */}
        <Sidebar user={user} isOpen={isSidebarOpen} onClose={closeSidebar} />

        {/* 3. Right Hand Main Viewport Column */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Top Header bar */}
          <Header user={user} onMenuToggle={toggleSidebar} />

          {/* Scrollable Content Workspace */}
          <main className="flex-1 overflow-y-auto px-6 py-8 relative">
            {children}
          </main>
        </div>
      </div>
    </CurrencyProvider>
  );
}
