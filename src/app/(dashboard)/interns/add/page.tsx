import React from "react";
import { db } from "@/lib/db";
import AddInternForm from "@/components/layout/AddInternForm";

export default async function AddInternPage() {
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
      { id: "mock-1", fullName: "Karan Patel", role: "ADMIN" },
      { id: "mock-2", fullName: "Sarah Connor", role: "MENTOR" },
    ];
  }

  return (
    <div className="space-y-6">
      <AddInternForm mentors={mentors} />
    </div>
  );
}
