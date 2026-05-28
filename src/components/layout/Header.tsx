"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, User, Sun, Moon, LogOut, Search, Loader2, Briefcase, MessageSquare } from "lucide-react";
import { useCurrency } from "@/lib/useCurrency";
import ChatDrawer from "./ChatDrawer";

interface HeaderProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    pictureUrl?: string | null;
  };
  onMenuToggle: () => void;
}

export default function Header({ user, onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Currency Hook
  const { currency, setCurrency } = useCurrency();

// Global Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ interns: any[]; tasks: any[] }>({ interns: [], tasks: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const renderSearchResults = () => {
    if (!isSearchOpen || searchQuery.trim() === "") return null;
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setIsSearchOpen(false)}
        />
        <div className="absolute left-0 mt-2 w-full max-h-80 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl shadow-2xl z-50 p-2 select-none animate-fadeIn">
          {searchResults.interns.length === 0 && searchResults.tasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground font-medium">
              No matching interns or tasks found.
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.interns.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-heading font-extrabold text-primary tracking-wider uppercase border-b border-border/50 pb-1">
                    Interns & Employees
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {searchResults.interns.map((intern) => (
                      <Link
                        key={intern.id}
                        href={`/interns/${intern.id}`}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setIsMobileSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-secondary transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {intern.fullName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {intern.internId} • {intern.roleDomain}
                          </div>
                        </div>
                        <span className="text-[9px] ml-2 px-1.5 py-0.5 rounded font-heading font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                           {intern.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.tasks.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-heading font-extrabold text-indigo-500 tracking-wider uppercase border-b border-border/50 pb-1">
                    Tasks
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {searchResults.tasks.map((task) => (
                      <Link
                        key={task.id}
                        href="/tasks"
                        onClick={() => {
                          setIsSearchOpen(false);
                          setIsMobileSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-secondary transition-all"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {task.title}
                          </div>
                          {task.intern?.fullName && (
                            <div className="text-[10px] text-muted-foreground">
                              Assignee: {task.intern.fullName}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-heading font-bold bg-secondary border border-border uppercase">
                           {task.status.replace("_", " ")}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

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

  // Debounced search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ interns: [], tasks: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search query execution failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

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
    if (path.startsWith("/interns")) return "Internal Directory";
    if (path.startsWith("/attendance")) return "Daily Attendance Roll";
    if (path.startsWith("/tasks")) return "Task Queue Board";
    if (path.startsWith("/documents")) return "Document Compliance Center";
    if (path.startsWith("/permissions")) return "Roles & Permissions Hub";
    if (path.startsWith("/logs")) return "System Audit Logs";
    if (path.startsWith("/calendar")) return "Company Calendar & Schedule";
    return "AURXON Portal";
  };

  return (
    <header className="h-16 bg-card border-b border-border/60 flex items-center justify-between px-6 shrink-0 select-none relative">
      {isMobileSearchOpen ? (
        <div className="flex-1 flex items-center space-x-3 w-full animate-fadeIn relative">
          <Search className="h-4.5 w-4.5 text-muted-foreground shrink-0 animate-pulse" />
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search interns, tasks, domains..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              autoFocus
              className="w-full h-9 bg-secondary/60 focus:bg-background border border-border/80 focus:border-primary/50 rounded-lg text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all px-3"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            )}
            {renderSearchResults()}
          </div>
          <button
            onClick={() => {
              setIsMobileSearchOpen(false);
              setSearchQuery("");
            }}
            className="text-xs font-semibold text-destructive hover:text-destructive/80 px-2 py-1.5 rounded hover:bg-destructive/10 transition-all cursor-pointer shrink-0"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Left: Mobile Toggle, Logo & Page Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="h-5.5 w-5.5" />
            </button>
            
            {/* Mobile-Only Corporate Branding Row */}
            <Link href="/" className="flex items-center space-x-2 lg:hidden shrink-0">
              <img src="/Logo-AIMS/Light-Mode-Logo.png" alt="AIMS Logo" className="h-5.5 w-auto object-contain dark:hidden shrink-0" />
              <img src="/Logo-AIMS/Dark-Mode-Logo.png" alt="AIMS Logo" className="h-5.5 w-auto object-contain hidden dark:block shrink-0" />
              <span className="text-sm font-heading font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                AURXON
              </span>
            </Link>

            <h1 className="hidden lg:block text-md font-heading font-bold text-foreground">
              {getPageTitle(pathname)}
            </h1>
          </div>

          {/* Middle: Global Search Input */}
          <div className="flex-1 max-w-xs md:max-w-md mx-6 hidden sm:block relative">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search interns, tasks, domains..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full h-9 pl-9 pr-8 bg-secondary/60 hover:bg-secondary/80 focus:bg-background border border-border/80 focus:border-primary/50 rounded-lg text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>
            {renderSearchResults()}
          </div>
        </>
      )}

      {/* Right: Active Status Badge, Theme Toggle & Mini Profile */}
      <div className="flex items-center space-x-3.5">
        {/* Search Icon Button for Mobile */}
        {!isMobileSearchOpen && (
          <button
            onClick={() => {
              setIsMobileSearchOpen(true);
              setIsSearchOpen(true);
            }}
            className="sm:hidden h-9 w-9 rounded-md bg-secondary border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-all cursor-pointer"
            title="Open Search"
          >
            <Search className="h-4.5 w-4.5 text-cyan-400" />
          </button>
        )}

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

        {/* Messaging Icon Button */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="h-9 w-9 rounded-md bg-secondary border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-all cursor-pointer"
          title="Open Messaging Center"
        >
          <MessageSquare className="h-4.5 w-4.5 text-indigo-400 hover:scale-105 transition-transform" />
        </button>
        
        <div className="hidden md:flex flex-col text-right">
          <span className="text-xs font-semibold text-foreground">{user.name || "AURXON User"}</span>
          <span className="text-[9px] font-heading font-bold text-primary tracking-wider uppercase">
            {user.role === "FOUNDER"
              ? "FOUNDER ELITE WORKSPACE"
              : user.role === "SUPER_ADMIN"
              ? "SUPER ADMIN WORKSPACE"
              : user.role === "ADMIN"
              ? "ADMIN WORKSPACE"
              : user.role === "HR"
              ? "HR MANAGEMENT SUITE"
              : user.role === "TEAM_LEAD"
              ? "TEAM LEAD CONSOLE"
              : user.role === "INTERN"
              ? "EMPLOYEE PLATFORM"
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
            {(user as any).pictureUrl ? (
              <img src={(user as any).pictureUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-heading font-extrabold text-primary hover:bg-primary/20 transition-all select-none">
                {user.name ? user.name[0].toUpperCase() : "A"}
              </div>
            )}
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
      {user.id && (
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUser={{
            id: user.id,
            name: user.name,
            role: user.role
          }}
        />
      )}
    </header>
  );
}
