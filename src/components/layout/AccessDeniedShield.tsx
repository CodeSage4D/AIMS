"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShieldAlert, ArrowLeft, ShieldX, Lock } from "lucide-react";

interface AccessDeniedShieldProps {
  requiredRole?: string;
  currentRole?: string;
}

export default function AccessDeniedShield({
  requiredRole = "ADMIN",
  currentRole = "MENTOR"
}: AccessDeniedShieldProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 select-none animate-fadeIn">
      <Card className="w-full max-w-lg border-destructive/25 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden bg-card/65 backdrop-blur-md">
        {/* Glow Radial Accents */}
        <div className="absolute top-0 right-0 h-40 w-40 bg-destructive/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-40 w-40 bg-destructive/5 rounded-full filter blur-3xl pointer-events-none" />

        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
          {/* Neon Locked Hexagon Shield */}
          <div className="h-16 w-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive animate-pulse relative shrink-0">
            <ShieldX className="h-8 w-8 relative z-10" />
            <div className="absolute inset-0 rounded-full bg-destructive/2 pointer-events-none animate-ping opacity-75" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-extrabold text-foreground tracking-tight uppercase">
              Access Restricted
            </h2>
            <p className="text-xs text-muted-foreground/80 font-heading tracking-wide">
              SECURITY SHIELD ENGAGED • PROTOCOL AIMS-403
            </p>
          </div>

          <div className="w-full bg-secondary/20 p-4 rounded-md border border-border/40 text-xs font-semibold text-muted-foreground/90 space-y-2.5 max-w-sm mx-auto">
            <div className="flex items-center justify-between">
              <span>Required Credentials:</span>
              <span className="text-primary font-bold tracking-wider">{requiredRole}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/25 pt-2.5">
              <span>Your Assigned Role:</span>
              <span className="text-destructive font-bold tracking-wider">{currentRole}</span>
            </div>
          </div>

          <div className="space-y-4 max-w-md mx-auto">
            <p className="text-xs text-muted-foreground leading-relaxed">
              You do not possess the clearance level required to access AIMS administrative audit logs. Under company operational standards, all access attempts to security modules are chronologically compiled.
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3.5 pt-4 border-t border-border/30 w-full select-none">
            <Link href="/">
              <Button
                variant="primary"
                size="sm"
                className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Dashboard</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
