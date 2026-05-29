import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ForcePasswordChange from "@/components/layout/ForcePasswordChange";

export const dynamic = "force-dynamic";

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

  // 3. First Login Force Password Reset Interceptor
  if ((session.user as any).changePasswordRequired) {
    return <ForcePasswordChange />;
  }

  // 4. Fetch intern details & profile picture URL if they are an intern
  const intern = await db.intern.findUnique({
    where: { userId: (session.user as any).id || "" },
  });

  let pictureUrl = null;
  if (intern) {
    const { parseInternNotes } = await import("@/lib/roles");
    const customFields = parseInternNotes(intern.notes);
    pictureUrl = customFields.pictureUrl || null;
  }

  // 5. Fallback default metadata object to prevent TypeScript signatures errors
  const safeUser = {
    id: (session.user as any).id || "",
    name: session.user.name || "AURXON User",
    email: session.user.email || "",
    role: (session.user as any).role || "INTERN",
    pictureUrl,
  };

  return (
    <DashboardLayout user={safeUser}>
      {children}
    </DashboardLayout>
  );
}
