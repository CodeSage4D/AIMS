"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, User, Sun, Moon, LogOut } from "lucide-react";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  onMenuToggle: () => void;
}

export default function Header({ user, onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // Retrieve persisted user theme preference on mount
    const savedTheme = localStorage.getItem("aims-theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const activeTheme = savedTheme === "dark" || (savedTheme === null && systemPrefersDark) ? "dark" : "light";
    
    setTheme(activeTheme);
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("aims-theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Resolves the current URL path into a sleek human-readable display header
  const getPageTitle = (path: string) => {
    if (path === "/") return "Overview Dashboard";
    if (path.startsWith("/interns/add")) return "Onboard New Intern";
    if (path.startsWith("/interns/")) return "Intern Profile File";
    if (path.startsWith("/interns")) return "Intern Directory";
    if (path.startsWith("/attendance")) return "Daily Attendance Roll";
    if (path.startsWith("/tasks")) return "Task Queue Board";
    if (path.startsWith("/documents")) return "Document Compliance Center";
    if (path.startsWith("/logs")) return "System Audit Logs";
    return "AURXON Portal";
  };

  return (
    <header className="h-16 bg-card border-b border-border/60 flex items-center justify-between px-6 shrink-0 select-none">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
        >
          <Menu className="h-5.5 w-5.5" />
        </button>
        <h1 className="text-md font-heading font-bold text-foreground">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Right: Active Status Badge, Theme Toggle & Mini Profile */}
      <div className="flex items-center space-x-3.5">
        <button
          onClick={toggleTheme}
          className="h-9 w-9 rounded-md bg-secondary border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-all cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-blue-500" />
          )}
        </button>
        
        <div className="hidden md:flex flex-col text-right">
          <span className="text-xs font-semibold text-foreground">{user.name || "AURXON User"}</span>
          <span className="text-[9px] font-heading font-bold text-primary tracking-wider uppercase">
            {user.role === "FOUNDER"
              ? "FOUNDER ELITE WORKSPACE"
              : user.role === "HR"
              ? "HR MANAGEMENT SUITE"
              : user.role === "TEAM_LEAD"
              ? "TEAM LEAD CONSOLE"
              : user.role === "INTERN"
              ? "INTERN PORTAL"
              : `${user.role || "USER"} WORKSPACE`}
          </span>
        </div>
        
        {/* Dynamic Profile Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="h-9 w-9 rounded-full bg-secondary border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer overflow-hidden"
            title="Account Menu"
          >
            <div className="h-full w-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-heading font-extrabold text-primary hover:bg-primary/20 transition-all select-none">
              {user.name ? user.name[0].toUpperCase() : "A"}
            </div>
          </button>

          {isDropdownOpen && (
            <>
              {/* Invisible Click-away Closer Backdrop Overlay */}
              <div
                onClick={() => setIsDropdownOpen(false)}
                className="fixed inset-0 z-40 bg-transparent"
              />
              
              <div className="absolute right-0 mt-2.5 w-56 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl shadow-2xl z-50 p-1.5 select-none animate-fadeIn">
                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-white/[0.06] mb-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.name || "AIMS User"}</p>
                  <p className="text-[9px] font-heading font-bold text-slate-500 dark:text-gray-400 mt-0.5 tracking-wider uppercase">
                    {user.role}
                  </p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-gray-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/5 transition-all"
                >
                  <User className="h-4 w-4 text-primary" />
                  <span>View Profile</span>
                </Link>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 transition-all text-left cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Exit Workspace</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
