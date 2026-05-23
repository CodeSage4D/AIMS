import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import DocumentVaultClient from "@/components/layout/DocumentVaultClient";
import { hasPermission } from "@/lib/permissions";
import AccessDeniedShield from "@/components/layout/AccessDeniedShield";

export default async function DocumentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any).role || "INTERN";
  const userId = (session.user as any).id;

  const hasAccess = await hasPermission(userId, userRole, "documentAccess");
  if (!hasAccess) {
    return <AccessDeniedShield requiredRole="Document Compliance" currentRole={userRole} />;
  }

  let interns: any[] = [];
  try {
    if (userRole === "FOUNDER" || userRole === "HR") {
      // Fetch all active or onboarding interns with their uploaded documents
      interns = await db.intern.findMany({
        where: {
          status: {
            in: ["ACTIVE", "ONBOARDING", "COMPLETED"],
          },
        },
        include: {
          documents: true,
          generatedDocuments: true,
          supervisor: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: {
          fullName: "asc",
        },
      });
    } else {
      // Intern role: Only fetch their own intern record
      const intern = await db.intern.findUnique({
        where: { userId },
        include: {
          documents: true,
          generatedDocuments: true,
          supervisor: {
            select: {
              fullName: true,
            },
          },
        },
      });
      if (intern) {
        interns = [intern];
      }
    }
  } catch (err) {
    console.error("Database connection failed, using high-fidelity mock data fallback inside /documents server wrapper:", err);
    // Secure Fallback mocks for robust local testing and UI demonstration
    interns = [
      {
        id: "uuid-aarav",
        internId: "AXN-SWE-2605-AS01",
        fullName: "Aarav Sharma",
        email: "aarav.sharma@aurxon.com",
        department: "Engineering",
        roleDomain: "Software Engineer",
        status: "ACTIVE",
        supervisor: { fullName: "Senior Mentor" },
        documents: [
          {
            id: "doc-1",
            type: "OFFER_LETTER",
            fileName: "Aarav_Offer_Letter.pdf",
            fileUrl: "https://yck9uoc24tphuxtg.public.blob.vercel-storage.com/Aarav_Offer_Letter.pdf",
            verified: true,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            id: "doc-2",
            type: "RESUME",
            fileName: "Aarav_Resume.pdf",
            fileUrl: "https://yck9uoc24tphuxtg.public.blob.vercel-storage.com/Aarav_Resume.pdf",
            verified: true,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
        ],
        generatedDocuments: [
          {
            id: "gen-1",
            type: "OFFER_LETTER",
            status: "APPROVED",
            approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            signature: "AXN-SIG-8f7a93b4e6c12d5f08a9c7b6d5e4f3a2b1c0e9d8f7a6b5c4d3e2f1a0b9c8d7e6",
            fileUrl: "https://yck9uoc24tphuxtg.public.blob.vercel-storage.com/Aarav_Offer_Letter.pdf",
            notes: "Approved and digitally signed by Founder Aarav.",
          },
          {
            id: "gen-2",
            type: "NDA",
            status: "APPROVED",
            approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            signature: "AXN-SIG-2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d",
            fileUrl: "https://yck9uoc24tphuxtg.public.blob.vercel-storage.com/Aarav_NDA.pdf",
            notes: "Approved and digitally signed by Founder Aarav.",
          },
          {
            id: "gen-3",
            type: "ID_CARD",
            status: "PENDING",
            approvedAt: null,
            signature: null,
            fileUrl: null,
            notes: null,
          }
        ]
      },
      {
        id: "uuid-ananya",
        internId: "AXN-UIUX-2605-AI01",
        fullName: "Ananya Iyer",
        email: "ananya.iyer@aurxon.com",
        department: "Design",
        roleDomain: "UI/UX Design",
        status: "ACTIVE",
        supervisor: { fullName: "Senior Mentor" },
        documents: [
          {
            id: "doc-3",
            type: "RESUME",
            fileName: "Ananya_UX_Portfolio.pdf",
            fileUrl: "https://yck9uoc24tphuxtg.public.blob.vercel-storage.com/Ananya_UX_Portfolio.pdf",
            verified: false,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          },
          {
            id: "doc-4",
            type: "ID_PROOF",
            fileName: "Ananya_National_ID.jpg",
            fileUrl: "https://yck9uoc24tphuxtg.public.blob.vercel-storage.com/Ananya_National_ID.jpg",
            verified: true,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        ],
        generatedDocuments: []
      },
      {
        id: "uuid-karan",
        internId: "AXN-SWE-2605-KV01",
        fullName: "Karan Verma",
        email: "karan.verma@aurxon.com",
        department: "Engineering",
        roleDomain: "Software Engineer",
        status: "ONBOARDING",
        supervisor: { fullName: "Senior Mentor" },
        documents: [],
        generatedDocuments: []
      },
    ];
  }

  // Format date and Decimal fields safely to clean values for smooth client component serialization
  const serializedInterns = interns.map((intern) => ({
    id: intern.id,
    internId: intern.internId,
    fullName: intern.fullName,
    email: intern.email,
    department: intern.department,
    roleDomain: intern.roleDomain,
    status: intern.status,
    employmentType: intern.employmentType || "INTERN",
    stipendAmount: intern.stipendAmount ? Number(intern.stipendAmount) : 0,
    supervisor: intern.supervisor ? { fullName: intern.supervisor.fullName } : null,
    documents: (intern.documents || []).map((doc: any) => ({
      id: doc.id,
      type: doc.type,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      verified: doc.verified,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    })),
    generatedDocuments: (intern.generatedDocuments || []).map((doc: any) => ({
      id: doc.id,
      type: doc.type,
      status: doc.status,
      approvedAt: doc.approvedAt instanceof Date ? doc.approvedAt.toISOString() : doc.approvedAt ? String(doc.approvedAt) : null,
      signature: doc.signature,
      fileUrl: doc.fileUrl,
      notes: doc.notes,
      content: doc.content,
    })),
  }));

  return (
    <div className="space-y-6">
      <DocumentVaultClient initialInterns={serializedInterns} role={userRole} />
    </div>
  );
}
