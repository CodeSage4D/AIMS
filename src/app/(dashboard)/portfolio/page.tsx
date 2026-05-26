import React from "react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import PortfolioClient from "@/components/layout/PortfolioClient";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user) {
    return notFound();
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role || "INTERN";
  const isOwner = userRole === "INTERN";

  let currentIntern = null;
  let internsList: any[] = [];
  let initialProjects: any[] = [];

  if (isOwner) {
    // Fetch logged-in intern's record
    currentIntern = await db.intern.findUnique({
      where: { userId },
    });
    if (currentIntern) {
      initialProjects = await db.projectRecord.findMany({
        where: { internId: currentIntern.id },
        orderBy: { createdAt: "desc" },
      });
    }
  } else {
    // Admin/Founder/HR/Lead: Fetch all active/completed interns to review
    internsList = await db.intern.findMany({
      where: {
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
      select: {
        id: true,
        internId: true,
        fullName: true,
        roleDomain: true,
        department: true,
      },
      orderBy: { fullName: "asc" },
    });
  }

  return (
    <PortfolioClient
      user={{
        id: userId,
        role: userRole,
        fullName: session.user.name || "AURXON User",
      }}
      currentIntern={currentIntern}
      initialInterns={internsList}
      initialProjects={initialProjects}
    />
  );
}
