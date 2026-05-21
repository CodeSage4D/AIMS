"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface DashboardLayoutProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  children: React.ReactNode;
}

export default function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
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
  );
}
