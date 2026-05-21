import React from "react";
import { db } from "@/lib/db";
import AttendanceRoll from "@/components/layout/AttendanceRoll";

export default async function AttendancePage() {
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
      { id: "uuid-aarav", internId: "AXN-SWE-BE-2605-AS01", fullName: "Aarav Sharma", department: "Engineering" },
      { id: "uuid-ananya", internId: "AXN-PED-UX-2605-AI01", fullName: "Ananya Iyer", department: "Design" },
    ];
  }

  return (
    <div className="space-y-6">
      <AttendanceRoll initialInterns={interns} />
    </div>
  );
}
