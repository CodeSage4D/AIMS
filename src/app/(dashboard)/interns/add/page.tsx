import React from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AddInternForm from "@/components/layout/AddInternForm";
import AccessDeniedShield from "@/components/layout/AccessDeniedShield";

export default async function AddInternPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any).role || "INTERN";

  // Strict Security Check: FOUNDER or HR ONLY!
  if (userRole !== "FOUNDER" && userRole !== "HR") {
    return <AccessDeniedShield requiredRole="FOUNDER / HR" currentRole={userRole} />;
  }

  let mentors: any[] = [];

  try {
    // Queries all users ordered alphabetically to populate the supervisor select options
    mentors = await db.user.findMany({
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        role: true,
      },
    });
  } catch (err) {
    // Mock supervisors fallback for early local testing states
    mentors = [
      { id: "mock-1", fullName: "Karan Patel", role: "FOUNDER" },
      { id: "mock-2", fullName: "Sarah Connor", role: "TEAM_LEAD" },
    ];
  }

  return (
    <div className="space-y-6">
      <AddInternForm mentors={mentors} />
    </div>
  );
}

