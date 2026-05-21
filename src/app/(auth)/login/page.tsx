"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lock, Mail, AlertTriangle, User, ChevronLeft, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  // Views: 'login' | 'forgot'
  const [view, setView] = useState<"login" | "forgot">("login");
  
  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot Password Form States
  const [forgotInternId, setForgotInternId] = useState("");
  const [forgotName, setForgotName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

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
    <div className="relative min-h-screen flex items-center justify-center bg-[#030712] p-4 overflow-hidden select-none">
      {/* 1. Futuristic Ambient Glowing Orbs (Mobile-optimized visual elements) */}
      <div className="absolute top-[-10%] left-[-20%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-violet-600/15 blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-10000" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-cyan-500/15 blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-7000" />
      <div className="absolute top-[40%] left-[30%] w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] rounded-full bg-blue-500/10 blur-[60px] sm:blur-[120px] pointer-events-none" />

      {/* 2. Main Glass Container */}
      <div className="relative z-10 w-full max-w-[92%] sm:max-w-md transition-all duration-300">
        <Card className="border-white/10 bg-[#0b0f19]/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden">
          <CardHeader className="text-center space-y-3 pb-4 pt-8 px-5 sm:px-8">
            <div className="flex justify-center mb-1">
              <div className="relative group flex items-center justify-center p-0.5 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
                <div className="bg-[#0b0f19] px-4.5 py-1.5 rounded-[10px] transition-all group-hover:bg-[#0b0f19]/80">
                  <span className="text-2xl font-heading font-extrabold tracking-widest bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]">
                    AURXON
                  </span>
                </div>
              </div>
            </div>
            <CardTitle className="text-lg sm:text-xl font-heading font-bold text-white tracking-wide">
              {view === "login" ? "Internal Portal" : "Reset Password"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-400/90 font-medium">
              {view === "login"
                ? "AIMS - Intern Management System"
                : "Submit password reset request to Founder"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-5 sm:px-8 pb-8 pt-2">
            {view === "login" ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Alert Indicator */}
                {loginError && (
                  <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-shake">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                    <span className="font-semibold leading-normal">{loginError}</span>
                  </div>
                )}

                {/* Email/Username Form Entry */}
                <div className="relative group">
                  <div className="absolute left-4 top-[39px] text-gray-400 group-focus-within:text-blue-400 transition-colors duration-300 pointer-events-none z-10">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Corporate Email Address / Username"
                    type="text"
                    placeholder="name@aurxon.com or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 text-sm bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500 rounded-xl transition-all duration-200"
                    disabled={loginLoading}
                    required
                  />
                </div>

                {/* Password Form Entry */}
                <div className="relative group">
                  <div className="absolute left-4 top-[39px] text-gray-400 group-focus-within:text-blue-400 transition-colors duration-300 pointer-events-none z-10">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 text-sm bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500 rounded-xl transition-all duration-200"
                    disabled={loginLoading}
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot");
                      setLoginError(null);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Authentication Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2 h-12.5 text-sm font-semibold tracking-wide font-heading bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 text-white rounded-xl transition-all duration-300 scale-active-98 active:scale-98"
                  isLoading={loginLoading}
                >
                  Authenticate & Access
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-5">
                {/* Alert Indicators */}
                {forgotError && (
                  <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-shake">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                    <span className="font-semibold leading-normal">{forgotError}</span>
                  </div>
                )}
                {forgotSuccess && (
                  <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                    <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                    <span className="font-semibold leading-normal">{forgotSuccess}</span>
                  </div>
                )}

                {/* Intern ID Entry */}
                <div className="relative group">
                  <div className="absolute left-4 top-[39px] text-gray-400 group-focus-within:text-indigo-400 transition-colors duration-300 pointer-events-none z-10">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Intern ID"
                    type="text"
                    placeholder="e.g. AXN-SWE-2605-AS01"
                    value={forgotInternId}
                    onChange={(e) => setForgotInternId(e.target.value)}
                    className="pl-11 h-12 text-sm bg-white/5 border-white/10 hover:border-white/20 focus:border-indigo-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500 rounded-xl transition-all duration-200"
                    disabled={forgotLoading}
                    required
                  />
                </div>

                {/* Full Name Entry */}
                <div className="relative group">
                  <div className="absolute left-4 top-[39px] text-gray-400 group-focus-within:text-indigo-400 transition-colors duration-300 pointer-events-none z-10">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="Aarav Sharma"
                    value={forgotName}
                    onChange={(e) => setForgotName(e.target.value)}
                    className="pl-11 h-12 text-sm bg-white/5 border-white/10 hover:border-white/20 focus:border-indigo-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500 rounded-xl transition-all duration-200"
                    disabled={forgotLoading}
                    required
                  />
                </div>

                {/* Corporate Email Entry */}
                <div className="relative group">
                  <div className="absolute left-4 top-[39px] text-gray-400 group-focus-within:text-indigo-400 transition-colors duration-300 pointer-events-none z-10">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <Input
                    label="Corporate Email Address"
                    type="email"
                    placeholder="aarav@aurxon.demo"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-11 h-12 text-sm bg-white/5 border-white/10 hover:border-white/20 focus:border-indigo-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500 rounded-xl transition-all duration-200"
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
                    className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors font-medium cursor-pointer"
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
                  className="w-full mt-2 h-12.5 text-sm font-semibold tracking-wide font-heading bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 text-white rounded-xl transition-all duration-300 scale-active-98 active:scale-98"
                  isLoading={forgotLoading}
                >
                  Submit Reset Request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        
        {/* Footer Trademark */}
        <p className="text-center text-[9px] sm:text-[10px] text-gray-500/80 mt-8 tracking-widest uppercase font-medium">
          © 2026 AURXON Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
