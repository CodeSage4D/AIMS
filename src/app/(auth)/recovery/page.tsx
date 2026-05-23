"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lock, Mail, AlertTriangle, ChevronLeft, CheckCircle, Sun, Moon, Copy, Check } from "lucide-react";

export default function FounderRecoveryPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Theme support
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const currentTheme = mounted ? theme : "dark";

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setTempPassword(null);
    setLoading(true);
    setCopied(false);

    if (!email || !recoveryKey) {
      setError("Please fill in all recovery fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, recoveryKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Founder recovery authentication failed.");
      } else {
        setSuccess(data.message || "Founder recovery completed successfully.");
        setTempPassword(data.tempPassword);
        // Clear fields
        setEmail("");
        setRecoveryKey("");
      }
    } catch (err) {
      setError("Failed to communicate with authentication services.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className={`relative min-h-screen flex items-center justify-center p-4 overflow-hidden select-none transition-colors duration-500 ${
      currentTheme === "dark" ? "bg-[#030712]" : "bg-[#f1f5f9]"
    }`}>
      {/* Dynamic Ambient Glowing Orbs */}
      <div className={`absolute top-[-10%] left-[-20%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-10000 transition-colors ${
        currentTheme === "dark" ? "bg-amber-600/10" : "bg-amber-400/10"
      }`} />
      <div className={`absolute bottom-[-15%] right-[-10%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-7000 transition-colors ${
        currentTheme === "dark" ? "bg-red-500/10" : "bg-rose-400/10"
      }`} />

      {/* Theme Selector */}
      {mounted && (
        <div className="absolute top-5 right-5 z-20">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all duration-300 shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
              currentTheme === "dark"
                ? "bg-[#0d1222]/80 border-white/10 text-amber-400 hover:bg-[#0d1222] hover:border-white/20 shadow-black/40"
                : "bg-white/80 border-slate-200 text-amber-600 hover:bg-white hover:border-slate-300 shadow-slate-200/50"
            }`}
            aria-label="Toggle visual theme"
          >
            {currentTheme === "dark" ? (
              <Sun className="h-4.5 w-4.5" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-amber-600" />
            )}
          </button>
        </div>
      )}

      {/* Main Glass Container */}
      <div className="relative z-10 w-full max-w-[92%] sm:max-w-md transition-all duration-300">
        <Card className={`transition-all duration-300 border backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl ${
          currentTheme === "dark"
            ? "border-amber-500/20 bg-[#0b0f19]/85 shadow-black/60"
            : "border-amber-200 bg-white/90 shadow-slate-200/80"
        }`}>
          <CardHeader className="text-center space-y-3 pb-4 pt-8 px-5 sm:px-8">
            <div className="flex justify-center mb-1">
              <div className={`relative group flex items-center justify-center p-0.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-red-500 shadow-lg ${
                currentTheme === "dark" ? "shadow-amber-500/20" : "shadow-amber-600/10"
              }`}>
                <div className={`px-4.5 py-1.5 rounded-[10px] transition-all ${
                  currentTheme === "dark" ? "bg-[#0b0f19]" : "bg-white"
                }`}>
                  <span className={`text-2xl font-heading font-extrabold tracking-widest bg-clip-text text-transparent drop-shadow-sm bg-gradient-to-r ${
                    currentTheme === "dark" 
                      ? "from-amber-400 via-yellow-300 to-red-400 drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]" 
                      : "from-amber-600 via-yellow-600 to-red-600"
                  }`}>
                    RECOVERY
                  </span>
                </div>
              </div>
            </div>
            <CardTitle className={`text-lg sm:text-xl font-heading font-bold tracking-wide transition-colors ${
              currentTheme === "dark" ? "text-white" : "text-slate-900"
            }`}>
              Founder Administrative Console
            </CardTitle>
            <CardDescription className={`text-xs sm:text-sm font-medium transition-colors ${
              currentTheme === "dark" ? "text-gray-400/90" : "text-slate-600"
            }`}>
              Regenerate emergency credentials for Founder rescue access
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-5 sm:px-8 pb-8 pt-2">
            <form onSubmit={handleRecoverySubmit} className="space-y-5">
              {/* Alert Indicators */}
              {error && (
                <div className={`flex items-center space-x-3 p-3.5 rounded-xl border text-xs animate-shake ${
                  currentTheme === "dark"
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-red-50 border-red-200 text-red-600"
                }`}>
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                  <span className="font-semibold leading-normal">{error}</span>
                </div>
              )}

              {success && (
                <div className={`flex items-center space-x-3 p-3.5 rounded-xl border text-xs ${
                  currentTheme === "dark"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-emerald-50 border-emerald-200 text-emerald-600"
                }`}>
                  <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                  <span className="font-semibold leading-normal">{success}</span>
                </div>
              )}

              {/* Temporary Password Reveal block */}
              {tempPassword && (
                <div className={`p-4.5 rounded-xl border flex flex-col items-center space-y-3 ${
                  currentTheme === "dark"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}>
                  <span className="text-xs uppercase font-extrabold tracking-wider">Temporary Credentials Generated:</span>
                  <div className="flex items-center space-x-3 bg-black/20 dark:bg-black/40 px-4 py-2 rounded-lg border border-white/5 w-full justify-between">
                    <code className="text-base font-mono font-bold tracking-wider select-all">{tempPassword}</code>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors text-amber-500 hover:text-amber-400"
                      title="Copy Passcode"
                    >
                      {copied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-center font-medium leading-relaxed opacity-80">
                    IMPORTANT: Copy this credentials code. It will force a password change immediately upon `/login`.
                  </p>
                </div>
              )}

              {/* Email Entry */}
              <div className="relative group flex flex-col">
                <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                  currentTheme === "dark"
                    ? "text-gray-400 group-focus-within:text-amber-400"
                    : "text-slate-400 group-focus-within:text-amber-600"
                }`}>
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <Input
                  label="Founder Corporate Email"
                  type="email"
                  placeholder="founder@aurxon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-11 h-12 text-sm rounded-xl transition-all duration-200 ${
                    currentTheme === "dark"
                      ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-amber-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-amber-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                  }`}
                  disabled={loading}
                  required
                />
              </div>

              {/* Founder Recovery Key */}
              <div className="relative group flex flex-col">
                <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                  currentTheme === "dark"
                    ? "text-gray-400 group-focus-within:text-amber-400"
                    : "text-slate-400 group-focus-within:text-amber-600"
                }`}>
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <Input
                  label="Founder Recovery Key"
                  type="password"
                  placeholder="••••••••"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  className={`pl-11 h-12 text-sm rounded-xl transition-all duration-200 ${
                    currentTheme === "dark"
                      ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-amber-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-amber-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                  }`}
                  disabled={loading}
                  required
                />
              </div>

              <div className="flex justify-between items-center mt-2">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className={`flex items-center space-x-1 text-xs transition-colors font-semibold cursor-pointer ${
                    currentTheme === "dark" ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Back to Login</span>
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2 h-12.5 text-sm font-semibold tracking-wide font-heading bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 hover:from-amber-500 hover:to-yellow-500 shadow-md shadow-amber-600/10 hover:shadow-amber-600/20 text-white rounded-xl transition-all duration-300 scale-active-98 active:scale-98 cursor-pointer"
                isLoading={loading}
              >
                Verify & Regenerate
              </Button>
            </form>
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
