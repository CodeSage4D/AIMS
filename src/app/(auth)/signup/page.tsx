"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lock, Mail, AlertTriangle, User, Phone, Briefcase, Layers, ChevronLeft, CheckCircle, Sun, Moon } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // Signup Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [department, setDepartment] = useState("Software Engineering");
  const [requestedPosition, setRequestedPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);

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

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!fullName || !email || !phone || !username || !department || !requestedPosition) {
      setError("Please fill in all enrollment fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          username,
          department,
          requestedPosition,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to process enrollment.");
      } else {
        setSuccessCode(data.referenceId);
        // Clear fields
        setFullName("");
        setEmail("");
        setPhone("");
        setUsername("");
        setRequestedPosition("");
      }
    } catch (err) {
      setError("Failed to communicate with enrollment services.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen flex items-center justify-center p-4 overflow-hidden select-none transition-colors duration-500 ${
      currentTheme === "dark" ? "bg-[#030712]" : "bg-[#f1f5f9]"
    }`}>
      {/* Ambient Glowing Orbs */}
      <div className={`absolute top-[-10%] left-[-20%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-10000 transition-colors ${
        currentTheme === "dark" ? "bg-blue-600/10" : "bg-blue-400/15"
      }`} />
      <div className={`absolute bottom-[-15%] right-[-10%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-7000 transition-colors ${
        currentTheme === "dark" ? "bg-cyan-500/10" : "bg-sky-400/20"
      }`} />

      {/* Elegant Theme Selector */}
      {mounted && (
        <div className="absolute top-5 right-5 z-20">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all duration-300 shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
              currentTheme === "dark"
                ? "bg-[#0d1222]/80 border-white/10 text-amber-400 hover:bg-[#0d1222] hover:border-white/20 shadow-black/40"
                : "bg-white/80 border-slate-200 text-indigo-600 hover:bg-white hover:border-slate-300 shadow-slate-200/50"
            }`}
            aria-label="Toggle theme"
          >
            {currentTheme === "dark" ? (
              <Sun className="h-4.5 w-4.5 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-600" />
            )}
          </button>
        </div>
      )}

      {/* Registration Card */}
      <div className="relative z-10 w-full max-w-[92%] sm:max-w-md transition-all duration-300">
        <Card className={`transition-all duration-300 border backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl ${
          currentTheme === "dark"
            ? "border-white/10 bg-[#0b0f19]/70 shadow-black/60"
            : "border-slate-200/80 bg-white/80 shadow-slate-200/80"
        }`}>
          <CardHeader className="text-center space-y-3 pb-4 pt-8 px-5 sm:px-8">
            <div className="flex justify-center mb-1">
              <div className={`relative group flex items-center justify-center p-0.5 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 shadow-lg ${
                currentTheme === "dark" ? "shadow-indigo-500/20" : "shadow-indigo-600/10"
              }`}>
                <div className={`px-4.5 py-1.5 rounded-[10px] transition-all ${
                  currentTheme === "dark" ? "bg-[#0b0f19]" : "bg-white"
                }`}>
                  <span className={`text-2xl font-heading font-extrabold tracking-widest bg-clip-text text-transparent drop-shadow-sm bg-gradient-to-r ${
                    currentTheme === "dark" 
                      ? "from-blue-400 via-indigo-300 to-cyan-400 drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]" 
                      : "from-blue-600 via-indigo-600 to-cyan-600"
                  }`}>
                    REGISTER
                  </span>
                </div>
              </div>
            </div>
            <CardTitle className={`text-lg sm:text-xl font-heading font-bold tracking-wide transition-colors ${
              currentTheme === "dark" ? "text-white" : "text-slate-900"
            }`}>
              Workforce Onboarding
            </CardTitle>
            <CardDescription className={`text-xs sm:text-sm font-medium transition-colors ${
              currentTheme === "dark" ? "text-gray-400/90" : "text-slate-600"
            }`}>
              Submit credentials to request corporate workspace activation
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-5 sm:px-8 pb-8 pt-2">
            {successCode ? (
              <div className="space-y-6 text-center py-4">
                <div className="flex justify-center">
                  <div className={`p-4.5 rounded-full border ${
                    currentTheme === "dark" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}>
                    <CheckCircle className="h-10 w-10 animate-bounce" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className={`text-base font-bold transition-colors ${currentTheme === "dark" ? "text-white" : "text-slate-900"}`}>
                    Registration Successful!
                  </h3>
                  <p className={`text-xs leading-relaxed transition-colors ${currentTheme === "dark" ? "text-gray-400" : "text-slate-600"}`}>
                    Your onboarding profile has been registered in the administration queue. Please record your temporary reference token below:
                  </p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-1.5 ${
                  currentTheme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500">Reference Token</span>
                  <span className={`text-lg font-mono font-extrabold tracking-wider ${currentTheme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                    {successCode}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed text-gray-500 max-w-xs mx-auto">
                  Administrators will review your credentials, assign your role domain, and trigger a secure activation email containing your temporary passcode instructions.
                </p>
                <Button
                  onClick={() => router.push("/login")}
                  variant="primary"
                  className="w-full h-11 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow cursor-pointer"
                >
                  Return to Portal Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
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

                {/* Full Name Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="Aarav Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Email Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                  }`}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    label="Corporate Email Address"
                    type="email"
                    placeholder="name@aurxon.demo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Phone & Username Row */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="relative group flex flex-col">
                    <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                      currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                    }`}>
                      <Phone className="h-4 w-4" />
                    </div>
                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="+91 XXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                        currentTheme === "dark"
                          ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                      }`}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="relative group flex flex-col">
                    <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                      currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                    }`}>
                      <User className="h-4 w-4" />
                    </div>
                    <Input
                      label="Username"
                      type="text"
                      placeholder="e.g. aarav12"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                        currentTheme === "dark"
                          ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                      }`}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Department Dropdown */}
                <div className="relative flex flex-col">
                  <label className={`text-xs font-semibold mb-1.5 transition-colors ${
                    currentTheme === "dark" ? "text-gray-300" : "text-slate-700"
                  }`}>
                    Assigned Corporate Department
                  </label>
                  <div className="relative">
                    <div className={`absolute left-4 top-3.5 transition-colors duration-300 pointer-events-none z-10 ${
                      currentTheme === "dark" ? "text-gray-400" : "text-slate-400"
                    }`}>
                      <Layers className="h-4 w-4" />
                    </div>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={`pl-11 pr-4 h-11 w-full text-xs rounded-xl border appearance-none transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        currentTheme === "dark"
                          ? "bg-[#0f172a] border-white/10 text-white hover:border-white/20"
                          : "bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300"
                      }`}
                      disabled={loading}
                      required
                    >
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Product Management">Product Management</option>
                      <option value="Data Analytics">Data Analytics</option>
                      <option value="Operations">Operations</option>
                      <option value="Marketing & Growth">Marketing & Growth</option>
                    </select>
                  </div>
                </div>

                {/* Requested Position Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                  }`}>
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <Input
                    label="Requested Workspace Role Domain"
                    type="text"
                    placeholder="e.g. Software Engineer Intern"
                    value={requestedPosition}
                    onChange={(e) => setRequestedPosition(e.target.value)}
                    className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Submit & Navigation Row */}
                <div className="flex justify-between items-center pt-2">
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

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full h-12 text-xs font-semibold tracking-wide font-heading bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 text-white rounded-xl transition-all duration-300 scale-active-98 active:scale-98 cursor-pointer"
                  isLoading={loading}
                >
                  Submit Enrollment Request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        
        {/* Trademark */}
        <p className={`text-center text-[9px] sm:text-[10px] mt-8 tracking-widest uppercase font-semibold transition-colors ${
          currentTheme === "dark" ? "text-gray-500/80" : "text-slate-500"
        }`}>
          © 2026 AURXON Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
