"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lock, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { signOut } from "next-auth/react";

export default function ForcePasswordChange() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        setSuccess("Password updated successfully! Reloading portal...");
        setTimeout(() => {
          window.location.href = "/";
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
              <div className="relative group">
                <div className="absolute left-4 top-[39px] text-gray-400 group-focus-within:text-violet-400 transition-colors duration-300 pointer-events-none z-10">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-11 h-12 text-sm bg-white/5 border-white/10 hover:border-white/20 focus:border-violet-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500 rounded-xl transition-all duration-200"
                  disabled={loading}
                  required
                />
              </div>

              {/* Confirm Password Entry */}
              <div className="relative group">
                <div className="absolute left-4 top-[39px] text-gray-400 group-focus-within:text-violet-400 transition-colors duration-300 pointer-events-none z-10">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-11 h-12 text-sm bg-white/5 border-white/10 hover:border-white/20 focus:border-violet-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500 rounded-xl transition-all duration-200"
                  disabled={loading}
                  required
                />
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
