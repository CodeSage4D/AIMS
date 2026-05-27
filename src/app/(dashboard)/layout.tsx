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
    include: {
      generatedDocuments: true,
      documents: true,
    },
  });

  let pictureUrl = null;
  let onboardingSkipped = false;
  if (intern) {
    const { parseInternNotes } = await import("@/lib/roles");
    const customFields = parseInternNotes(intern.notes);
    pictureUrl = customFields.pictureUrl || null;
    onboardingSkipped = !!customFields.onboardingSkipped;
  }

  // 5. Fallback default metadata object to prevent TypeScript signatures errors
  const safeUser = {
    id: (session.user as any).id || "",
    name: session.user.name || "AURXON User",
    email: session.user.email || "",
    role: (session.user as any).role || "INTERN",
    pictureUrl,
  };

  if (intern && intern.status === "ONBOARDING" && !onboardingSkipped) {
    const OnboardingFlow = (await import("@/components/layout/OnboardingFlow")).default;
    const serializedIntern = {
      id: intern.id,
      internId: intern.internId,
      fullName: intern.fullName,
      email: intern.email,
      phoneNumber: intern.phoneNumber,
      address: intern.address,
      city: intern.city,
      state: intern.state,
      country: intern.country,
      pinCode: intern.pinCode,
      citizenship: intern.citizenship,
      region: intern.region,
      university: intern.university,
      degree: intern.degree,
      department: intern.department,
      roleDomain: intern.roleDomain,
      batchSemester: intern.batchSemester,
      startDate: intern.startDate.toISOString(),
      endDate: intern.endDate ? intern.endDate.toISOString() : null,
      emergencyContactName: intern.emergencyContactName,
      emergencyContactNumber: intern.emergencyContactNumber,
      skills: intern.skills,
      bankName: intern.bankName,
      accountNumber: intern.accountNumber,
      ifscCode: intern.ifscCode,
      upiId: intern.upiId,
      branchName: intern.branchName,
      panCard: intern.panCard,
      notes: intern.notes,
      documents: intern.documents.map(d => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        fileUrl: `/api/documents/view?id=${d.id}`,
        verified: d.verified,
      })),
      generatedDocuments: intern.generatedDocuments.map(gd => ({
        id: gd.id,
        type: gd.type,
        status: gd.status,
        content: gd.content,
        signature: gd.signature,
      })),
    };
    return <OnboardingFlow user={safeUser} intern={serializedIntern} />;
  }

  return (
    <DashboardLayout user={safeUser}>
      {children}
    </DashboardLayout>
  );
}
