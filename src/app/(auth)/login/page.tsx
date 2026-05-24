"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lock, Mail, AlertTriangle, User, ChevronLeft, CheckCircle, Sun, Moon, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  // Views: 'login' | 'forgot'
  const [view, setView] = useState<"login" | "forgot">("login");
  
  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Form States
  const [forgotInternId, setForgotInternId] = useState("");
  const [forgotName, setForgotName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Theme support
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  // Safe theme evaluation for Server-Client hydration matching
  const currentTheme = mounted ? theme : "dark";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    if (!email || !password) {
      setLoginError("Please fill in all authentication fields.");
      setLoginLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setLoginError("Invalid credentials or password.");
        setLoginLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setLoginError("An unexpected network handshake error occurred.");
      setLoginLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);

    if (!forgotInternId || !forgotName || !forgotEmail) {
      setForgotError("Please fill in all request fields.");
      setForgotLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internId: forgotInternId,
          internName: forgotName,
          internEmail: forgotEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || "Failed to submit reset request.");
      } else {
        setForgotSuccess(data.message || "Reset request submitted successfully.");
        setForgotInternId("");
        setForgotName("");
        setForgotEmail("");
      }
    } catch (err) {
      setForgotError("Failed to communicate with authentication services.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen flex items-center justify-center p-4 overflow-hidden select-none transition-colors duration-500 ${
      currentTheme === "dark" ? "bg-[#030712]" : "bg-[#f1f5f9]"
    }`}>
      {/* Dynamic Ambient Glowing Orbs */}
      <div className={`absolute top-[-10%] left-[-20%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-10000 transition-colors ${
        currentTheme === "dark" ? "bg-violet-600/15" : "bg-blue-400/20"
      }`} />
      <div className={`absolute bottom-[-15%] right-[-10%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-7000 transition-colors ${
        currentTheme === "dark" ? "bg-cyan-500/15" : "bg-sky-400/25"
      }`} />
      <div className={`absolute top-[40%] left-[30%] w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] rounded-full blur-[60px] sm:blur-[120px] pointer-events-none transition-colors ${
        currentTheme === "dark" ? "bg-blue-500/10" : "bg-indigo-400/15"
      }`} />

      {/* Elegant Floating Theme Selector */}
      {mounted && (
        <div className="absolute top-5 right-5 z-20">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all duration-300 shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
              currentTheme === "dark"
                ? "bg-[#0d1222]/80 border-white/10 text-amber-400 hover:bg-[#0d1222] hover:border-white/20 shadow-black/40"
                : "bg-white/80 border-slate-200 text-indigo-600 hover:bg-white hover:border-slate-300 shadow-slate-200/50"
            }`}
            aria-label="Toggle visual theme"
          >
            {currentTheme === "dark" ? (
              <Sun className="h-4.5 w-4.5 animate-spin-slow" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-600" />
            )}
          </button>
        </div>
      )}

      {/* Main Glass Container */}
      <div className="relative z-10 w-full max-w-[92%] sm:max-w-md transition-all duration-300 flex flex-col items-center">
        {/* Large Floating Corporate Logo Branding */}
        <div className="mb-6 flex flex-col items-center space-y-2.5 select-none pointer-events-none animate-fadeIn shrink-0">
          <div className="relative flex items-center justify-center p-2.5 rounded-2xl bg-white/5 dark:bg-white/[0.02] border border-slate-200/30 dark:border-white/[0.06] backdrop-blur-md shadow-xl">
            <img
              src={currentTheme === "dark" ? "/Logo-AIMS/Dark-Mode-Logo.png" : "/Logo-AIMS/Light-Mode-Logo.png"}
              alt="AIMS Enterprise Logo"
              className="h-14 w-auto object-contain drop-shadow-[0_4px_15px_rgba(99,102,241,0.25)] hover:scale-105 transition-transform duration-500"
            />
          </div>
          <span className={`text-[9.5px] font-heading font-extrabold uppercase tracking-[0.25em] ${
            currentTheme === "dark" ? "text-indigo-400/90" : "text-indigo-600"
          }`}>
            AURXON WORKSPACE CONSOLE
          </span>
        </div>

        <Card className={`w-full transition-all duration-300 border backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl ${
          currentTheme === "dark"
            ? "border-white/10 bg-[#0b0f19]/70 shadow-black/60"
            : "border-slate-200/80 bg-white/80 shadow-slate-200/80"
        }`}>
          <CardHeader className="text-center space-y-3 pb-4 pt-8 px-5 sm:px-8">
            <div className="flex justify-center mb-1">
              <div className={`relative group flex items-center justify-center p-0.5 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 shadow-lg ${
                currentTheme === "dark" ? "shadow-indigo-500/20" : "shadow-indigo-600/10"
              }`}>
                <div className={`px-4.5 py-1.5 rounded-[10px] transition-all flex items-center space-x-2.5 ${
                  currentTheme === "dark" ? "bg-[#0b0f19] group-hover:bg-[#0b0f19]/80" : "bg-white group-hover:bg-white/90"
                }`}>
                  <img
                    src={currentTheme === "dark" ? "/Logo-AIMS/Dark-Mode-Logo.png" : "/Logo-AIMS/Light-Mode-Logo.png"}
                    alt="AIMS Logo"
                    className="h-5.5 w-auto object-contain shrink-0"
                  />
                  <span className={`text-2xl font-heading font-extrabold tracking-widest bg-clip-text text-transparent drop-shadow-sm bg-gradient-to-r ${
                    currentTheme === "dark" 
                      ? "from-blue-400 via-indigo-300 to-cyan-400 drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]" 
                      : "from-blue-600 via-indigo-600 to-cyan-600"
                  }`}>
                    AURXON
                  </span>
                </div>
              </div>
            </div>
            <CardTitle className={`text-lg sm:text-xl font-heading font-bold tracking-wide transition-colors ${
              currentTheme === "dark" ? "text-white" : "text-slate-900"
            }`}>
              {view === "login" ? "Internal Portal" : "Reset Password"}
            </CardTitle>
            <CardDescription className={`text-xs sm:text-sm font-medium transition-colors ${
              currentTheme === "dark" ? "text-gray-400/90" : "text-slate-600"
            }`}>
              {view === "login"
                ? "AIMS - Internal Management System"
                : "Submit password reset request to Founder"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-5 sm:px-8 pb-8 pt-2">
            {view === "login" ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Alert Indicator */}
                {loginError && (
                  <div className={`flex items-center space-x-3 p-3.5 rounded-xl border text-xs animate-shake ${
                    currentTheme === "dark"
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "bg-red-50 border-red-200 text-red-600"
                  }`}>
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                    <span className="font-semibold leading-normal">{loginError}</span>
                  </div>
                )}

                {/* Email/Username Form Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark"
                      ? "text-gray-400 group-focus-within:text-blue-400"
                      : "text-slate-400 group-focus-within:text-blue-600"
                  }`}>
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Corporate Email Address / Username"
                    type="text"
                    placeholder="name@aurxon.com or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-11 h-12 text-sm rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={loginLoading}
                    required
                  />
                </div>

                {/* Password Form Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark"
                      ? "text-gray-400 group-focus-within:text-blue-400"
                      : "text-slate-400 group-focus-within:text-blue-600"
                  }`}>
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-11 pr-11 h-12 text-sm rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={loginLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-[39px] transition-colors duration-200 cursor-pointer ${
                      currentTheme === "dark" ? "text-gray-400 hover:text-white" : "text-slate-400 hover:text-slate-700"
                    }`}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <Link
                    href="/signup"
                    className={`transition-colors cursor-pointer ${
                      currentTheme === "dark" 
                        ? "text-indigo-400 hover:text-indigo-300" 
                        : "text-indigo-600 hover:text-indigo-700"
                    }`}
                  >
                    Onboard / Register Account
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot");
                      setLoginError(null);
                    }}
                    className={`transition-colors cursor-pointer ${
                      currentTheme === "dark" 
                        ? "text-indigo-400 hover:text-indigo-300" 
                        : "text-indigo-600 hover:text-indigo-700"
                    }`}
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="flex justify-center text-[10px] sm:text-[11px] font-semibold pt-2 border-t border-slate-200 dark:border-white/5">
                  <Link
                    href="/recovery"
                    className={`transition-colors cursor-pointer ${
                      currentTheme === "dark" 
                        ? "text-amber-500 hover:text-amber-400" 
                        : "text-amber-600 hover:text-amber-700"
                    }`}
                  >
                    Founder Administrative Recovery Console
                  </Link>
                </div>

                {/* Authentication Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2 h-12.5 text-sm font-semibold tracking-wide font-heading bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 text-white rounded-xl transition-all duration-300 scale-active-98 active:scale-98 cursor-pointer"
                  isLoading={loginLoading}
                >
                  Authenticate & Access
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-5">
                {/* Alert Indicators */}
                {forgotError && (
                  <div className={`flex items-center space-x-3 p-3.5 rounded-xl border text-xs animate-shake ${
                    currentTheme === "dark"
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "bg-red-50 border-red-200 text-red-600"
                  }`}>
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                    <span className="font-semibold leading-normal">{forgotError}</span>
                  </div>
                )}
                {forgotSuccess && (
                  <div className={`flex items-center space-x-3 p-3.5 rounded-xl border text-xs ${
                    currentTheme === "dark"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}>
                    <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                    <span className="font-semibold leading-normal">{forgotSuccess}</span>
                  </div>
                )}

                {/* Intern ID Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark"
                      ? "text-gray-400 group-focus-within:text-indigo-400"
                      : "text-slate-400 group-focus-within:text-indigo-600"
                  }`}>
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Intern ID"
                    type="text"
                    placeholder="e.g. AXN-SWE-2605-AS01"
                    value={forgotInternId}
                    onChange={(e) => setForgotInternId(e.target.value)}
                    className={`pl-11 h-12 text-sm rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-indigo-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-indigo-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={forgotLoading}
                    required
                  />
                </div>

                {/* Full Name Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark"
                      ? "text-gray-400 group-focus-within:text-indigo-400"
                      : "text-slate-400 group-focus-within:text-indigo-600"
                  }`}>
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="Aarav Sharma"
                    value={forgotName}
                    onChange={(e) => setForgotName(e.target.value)}
                    className={`pl-11 h-12 text-sm rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-indigo-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-indigo-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={forgotLoading}
                    required
                  />
                </div>

                {/* Corporate Email Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark"
                      ? "text-gray-400 group-focus-within:text-indigo-400"
                      : "text-slate-400 group-focus-within:text-indigo-600"
                  }`}>
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Corporate Email Address"
                    type="email"
                    placeholder="aarav@aurxon.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={`pl-11 h-12 text-sm rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-indigo-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-indigo-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={forgotLoading}
                    required
                  />
                </div>

                <div className="flex justify-between items-center mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setForgotError(null);
                      setForgotSuccess(null);
                    }}
                    className={`flex items-center space-x-1 text-xs transition-colors font-semibold cursor-pointer ${
                      currentTheme === "dark" ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Back to Login</span>
                  </button>
                </div>

                {/* Request Button */}
                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  className="w-full mt-2 h-12.5 text-sm font-semibold tracking-wide font-heading bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 text-white rounded-xl transition-all duration-300 scale-active-98 active:scale-98 cursor-pointer"
                  isLoading={forgotLoading}
                >
                  Submit Reset Request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        
        {/* Footer Trademark */}
        <p className={`text-center text-[9px] sm:text-[10px] mt-8 tracking-widest uppercase font-semibold transition-colors ${
          currentTheme === "dark" ? "text-gray-500/80" : "text-slate-500"
        }`}>
          © 2026 AURXON Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
