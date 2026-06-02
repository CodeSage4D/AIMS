"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { signOut, useSession } from "next-auth/react";
import { CurrencyProvider } from "@/lib/useCurrency";
import { useRouter } from "next/navigation";
import NotificationBanner from "./NotificationBanner";

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
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(user);

  // Redirect unauthenticated sessions instantly to login page (safeguards back button cache states)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const syncUser = () => {
      if (user.role === "FOUNDER") {
        const previewRole = localStorage.getItem("aims-preview-role");
        if (previewRole && previewRole !== "FOUNDER") {
          setActiveUser({
            ...user,
            role: previewRole,
          });
          return;
        }
      }
      setActiveUser(user);
    };

    syncUser();
    window.addEventListener("aims-preview-role-change", syncUser);
    return () => window.removeEventListener("aims-preview-role-change", syncUser);
  }, [user]);

  // Automatic session timeouts are managed natively by NextAuth configuration (8-hour JWT window).

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col items-center justify-center space-y-5 select-none">
        <div className="relative flex items-center justify-center shrink-0">
          {/* Pulsing Glow Ring */}
          <div className="absolute h-24 w-24 rounded-full border border-indigo-500/20 animate-ping duration-3000 pointer-events-none" />
          <img
            src="/Logo-AIMS/Dark-Mode-Logo.png"
            alt="AIMS Enterprise"
            className="h-16 w-auto object-contain relative z-10 animate-pulse duration-2000 drop-shadow-[0_0_25px_rgba(99,102,241,0.3)]"
          />
        </div>
        <div className="flex items-center space-x-2 animate-fadeIn">
          <div className="h-3.5 w-3.5 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin shrink-0" />
          <p className="text-[10px] text-gray-400/90 font-heading font-extrabold tracking-widest uppercase animate-pulse">
            Authenticating Session...
          </p>
        </div>
      </div>
    );
  }

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
        <Sidebar user={activeUser} isOpen={isSidebarOpen} onClose={closeSidebar} />

        {/* 3. Right Hand Main Viewport Column */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Top Header bar */}
          <Header user={activeUser} onMenuToggle={toggleSidebar} />
          {/* Scrollable Content Workspace */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 relative">
            <NotificationBanner />
            {children}
          </main>
        </div>
      </div>
    </CurrencyProvider>
  );
}
