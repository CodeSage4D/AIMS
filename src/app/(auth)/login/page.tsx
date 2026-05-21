"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lock, Mail, AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Operational States
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all authentication fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email credentials or password hash.");
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected network handshake error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#070a13] p-4 overflow-hidden select-none">
      {/* 1. Ambient Background Glowing Radials (Sleek startup design) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />
      
      {/* 2. Unified Container Wrapper */}
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-border/60 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="flex justify-center mb-1">
              <span className="text-3xl font-heading font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
                AURXON
              </span>
            </div>
            <CardTitle className="text-xl font-heading">Internal Portal</CardTitle>
            <CardDescription className="text-muted-foreground/80">
              AIMS - Intern Management System
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5.5">
              {/* Alert Indicator */}
              {error && (
                <div className="flex items-center space-x-3 p-3 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-xs animate-pulse">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Email Form Entry */}
              <div className="relative group">
                <div className="absolute left-3.5 top-[39px] text-muted-foreground group-focus-within:text-primary transition-colors duration-300 pointer-events-none z-10">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  label="Corporate Email Address"
                  type="email"
                  placeholder="name@aurxon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10.5"
                  disabled={loading}
                  required
                />
              </div>

              {/* Password Form Entry */}
              <div className="relative group">
                <div className="absolute left-3.5 top-[39px] text-muted-foreground group-focus-within:text-primary transition-colors duration-300 pointer-events-none z-10">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10.5"
                  disabled={loading}
                  required
                />
              </div>

              {/* Authentication Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-4 h-11.5 text-sm font-semibold tracking-wide font-heading"
                isLoading={loading}
              >
                Authenticate & Access
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Footer Trademark */}
        <p className="text-center text-[10px] text-muted-foreground/60 mt-8 tracking-widest uppercase">
          © 2026 AURXON Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
