"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lock, AlertTriangle, CheckCircle, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { signOut } from "next-auth/react";

export default function ForcePasswordChange() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-transparent", textClass: "text-gray-400" };
    
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (pass.length < 8) {
      return { score: 1, label: "Too Weak (Min 8 characters)", color: "bg-red-500 w-1/3", textClass: "text-red-500 font-bold" };
    }
    if (score <= 2) {
      return { score: 1, label: "Weak Quality (Red)", color: "bg-red-500 w-1/3", textClass: "text-red-400 font-bold" };
    } else if (score <= 4) {
      return { score: 2, label: "Medium Quality (Yellow)", color: "bg-yellow-500 w-2/3", textClass: "text-yellow-450 font-bold" };
    } else {
      return { score: 3, label: "Strong Quality (Green)", color: "bg-emerald-500 w-full", textClass: "text-emerald-400 font-bold" };
    }
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update password.");
      } else {
        setSuccess("Password updated successfully! Redirecting to login...");
        setTimeout(() => {
          signOut({ callbackUrl: "/login" });
        }, 1500);
      }
    } catch (err) {
      setError("An unexpected error occurred during password update.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#030712] p-4 overflow-hidden select-none">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-20%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-violet-600/15 blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-10000" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-cyan-500/15 blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-7000" />

      <div className="relative z-10 w-full max-w-[92%] sm:max-w-md transition-all duration-300">
        <Card className="border-white/10 bg-[#0b0f19]/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden">
          <CardHeader className="text-center space-y-3 pb-4 pt-8 px-5 sm:px-8">
            <div className="flex justify-center mb-1">
              <div className="flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-bounce">
                <ShieldAlert className="h-7 w-7" />
              </div>
            </div>
            <CardTitle className="text-lg sm:text-xl font-heading font-bold text-white tracking-wide">
              First Login Security Setup
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-400/90 font-medium">
              You are logging in with a temporary credentials block. You must establish a strong, unique password to access AIMS.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-5 sm:px-8 pb-8 pt-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Alert Indicators */}
              {error && (
                <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                  <span className="font-semibold leading-normal">{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                  <span className="font-semibold leading-normal">{success}</span>
                </div>
              )}

              {/* New Password Entry */}
              <div className="relative group flex flex-col">
                <div className="absolute left-4 top-[39px] text-gray-400 group-focus-within:text-violet-400 transition-colors duration-300 pointer-events-none z-10">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <Input
                  label="New Password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 text-sm bg-white/5 border-white/10 hover:border-white/20 focus:border-violet-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500 rounded-xl transition-all duration-200"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-[39px] text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer z-10"
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="space-y-1.5 pt-1 animate-fadeIn">
                  <div className="flex justify-between items-center text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
                    <span className="text-gray-400">Password Complexity Quality:</span>
                    <span className={strength.textClass}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full transition-all duration-300 ${strength.color}`} />
                  </div>
                </div>
              )}

              {/* Confirm Password Entry */}
              <div className="relative group flex flex-col">
                <div className="absolute left-4 top-[39px] text-gray-400 group-focus-within:text-violet-400 transition-colors duration-300 pointer-events-none z-10">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 text-sm bg-white/5 border-white/10 hover:border-white/20 focus:border-violet-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500 rounded-xl transition-all duration-200"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-[39px] text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer z-10"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex justify-between items-center mt-2">
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs text-gray-400 hover:text-white transition-colors font-medium cursor-pointer"
                >
                  Cancel & Sign Out
                </button>
              </div>

              {/* Action Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2 h-12.5 text-sm font-semibold tracking-wide font-heading bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 shadow-md shadow-orange-600/10 hover:shadow-orange-600/20 text-white rounded-xl transition-all duration-300 scale-active-98 active:scale-98"
                isLoading={loading}
              >
                Establish Secure Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
