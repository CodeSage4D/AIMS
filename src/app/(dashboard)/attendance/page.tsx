import React from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import AttendanceRoll from "@/components/layout/AttendanceRoll";
import AccessDeniedShield from "@/components/layout/AccessDeniedShield";

export default async function AttendancePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any).role || "INTERN";
  const userId = (session.user as any).id;

  const hasAccess = await hasPermission(userId, userRole, "attendanceAccess");
  if (!hasAccess) {
    return <AccessDeniedShield requiredRole="Attendance Control" currentRole={userRole} />;
  }

  let interns: any[] = [];

  try {
    // Retrieves only active interns to populate the daily attendance log sheet
    interns = await db.intern.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        internId: true,
        fullName: true,
        department: true,
      },
      orderBy: {
        id: "asc",
      },
    });
  } catch (err) {
    // Mock fallbacks for early local layout testing
    interns = [
      { id: "uuid-ananya", internId: "AXN-PED-UX-2605-AI01", fullName: "Ananya Iyer", department: "Design" },
    ];
  }

  return (
    <div className="space-y-6">
      <AttendanceRoll initialInterns={interns} />
    </div>
  );
}
