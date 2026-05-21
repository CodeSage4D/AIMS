import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayoutWrapper({ children }: LayoutProps) {
  // 1. Fetch Session on the Server (Zero hydration flicker, absolute security)
  const session = await auth();

  // 2. Strict Session Guard redirect
  if (!session || !session.user) {
    redirect("/login");
  }

  // 3. Fallback default metadata object to prevent TypeScript signatures errors
  const safeUser = {
    name: session.user.name || "AURXON User",
    email: session.user.email || "",
    role: (session.user as any).role || "MENTOR",
  };

  return (
    <DashboardLayout user={safeUser}>
      {children}
    </DashboardLayout>
  );
}
