import React from "react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import AccessDeniedShield from "@/components/layout/AccessDeniedShield";
import FounderPanel from "@/components/layout/FounderPanel";
import { ArrowLeft, LayoutDashboard, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function FounderPage() {
  const session = await auth();
  if (!session || !session.user) {
    return notFound();
  }

  const userRole = (session.user as any).role;
  if (userRole !== "FOUNDER") {
    return (
      <AccessDeniedShield 
        requiredRole="FOUNDER ELITE ACCESS" 
        currentRole={userRole} 
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-2">
        <div className="flex items-center space-x-3.5">
          <Link href="/">
            <Button
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0 rounded-md shrink-0 border border-border/40 hover:bg-secondary/40"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-heading font-extrabold text-foreground tracking-tight">
                Founder Console Dashboard
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-heading font-extrabold bg-yellow-500/10 text-yellow-450 border border-yellow-500/20 uppercase tracking-widest shrink-0">
                Elite Admin
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secure private database planner, corporate repository directory, and diary notes vault.
            </p>
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <FounderPanel />
    </div>
  );
}
