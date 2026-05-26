"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  FileText,
  ShieldAlert,
  LogOut,
  X,
  Layers,
  ClipboardList,
  Fingerprint
} from "lucide-react";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Dynamic Navigation Links Schema based on roles
  const menuItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    ...(user.role === "FOUNDER" ? [{ label: "Founder Panel", href: "/founder", icon: ClipboardList }] : []),
    ...(user.role !== "INTERN" ? [{ label: "Intern Directory", href: "/interns", icon: Users }] : []),
    ...(user.role !== "INTERN" ? [{ label: "Attendance Roll", href: "/attendance", icon: Calendar }] : []),
    { label: "Task Queue", href: "/tasks", icon: CheckSquare },
    { label: "Daily Logs", href: "/daily-logs", icon: ClipboardList },
    { label: "Teams & Members", href: "/teams", icon: Layers },
    ...(user.role === "FOUNDER" || user.role === "SUPER_ADMIN" || user.role === "HR" || user.role === "ADMIN" ? [{ label: "Document Vault", href: "/documents", icon: FileText }] : []),
    ...(user.role === "FOUNDER" || user.role === "SUPER_ADMIN" ? [{ label: "Roles & Permissions", href: "/permissions", icon: Fingerprint }] : []),
  ];


  // Secure super-admin / administrative log view (Founder-Only)
  const isLogAllowed = user.role === "FOUNDER";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border/80 flex flex-col justify-between transform lg:translate-x-0 lg:static lg:h-screen transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* 1. Sidebar Header (Sticky) */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border/60 shrink-0">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="relative shrink-0 flex items-center">
            <img src="/Logo-AIMS/Light-Mode-Logo.png" alt="AIMS Logo" className="h-6 w-auto object-contain dark:hidden shrink-0" />
            <img src="/Logo-AIMS/Dark-Mode-Logo.png" alt="AIMS Logo" className="h-6 w-auto object-contain hidden dark:block shrink-0" />
          </div>
          <span className="text-xl font-heading font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(59,130,246,0.2)]">
            AURXON
          </span>
          <span className="text-[9px] font-heading font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 tracking-wider">
            AIMS
          </span>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/40 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 2. Navigation Menu Links (Scrollable) */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 select-none group",
                  isActive
                    ? "bg-primary/10 text-primary border-l-3 border-primary shadow-[inset_4px_0_12px_rgba(59,130,246,0.05)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Secure Administrative-Only Activity Log View */}
          {isLogAllowed && (
            <Link
              href="/logs"
              onClick={onClose}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 select-none group",
                pathname === "/logs"
                  ? "bg-primary/10 text-primary border-l-3 border-primary shadow-[inset_4px_0_12px_rgba(59,130,246,0.05)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              )}
            >
              <ShieldAlert className={cn("h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105", pathname === "/logs" ? "text-primary" : "text-muted-foreground")} />
              <span>System Logs</span>
            </Link>
          )}
        </nav>
      </div>

      {/* 3. Sidebar Profile & Logout Footer (Sticky) */}
      <div className="p-4 border-t border-border/60 shrink-0">
        <div className="flex items-center space-x-3 p-2 mb-3 bg-secondary/20 rounded-md border border-border/40">
          <div className="h-8.5 w-8.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-heading font-bold select-none shrink-0">
            {user.name ? user.name[0].toUpperCase() : "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{user.name || "User"}</p>
            <p className="text-[10px] text-muted-foreground font-medium truncate uppercase tracking-wide">
              {user.role}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all duration-300"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Exit Workspace</span>
        </button>
      </div>
    </aside>
  );
}
