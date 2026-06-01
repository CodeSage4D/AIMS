import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import MyDocumentsClient from "@/components/layout/MyDocumentsClient";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MyDocumentsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user as any;

  // 1. Fetch the user's corresponding Intern/Employee profile
  let intern = await db.intern.findUnique({
    where: { userId: user.id },
  });

  // Admin/Founder preview fallback: let admin see first intern's documents for full system inspection
  let isAdministratorPreview = false;
  if (!intern && (user.role === "FOUNDER" || user.role === "SUPER_ADMIN" || user.role === "HR" || user.role === "ADMIN")) {
    intern = await db.intern.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    isAdministratorPreview = true;
  }

  if (!intern) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4 select-none">
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-heading font-extrabold text-white">Profile Record Missing</h2>
        <p className="text-sm text-gray-400 max-w-md leading-relaxed font-medium">
          We could not identify an active employee or intern record associated with your user account. Please contact your AURXON Administrator to initialize your credential records.
        </p>
      </div>
    );
  }

  // 2. Fetch all generated documents (Offer letters, NDAs, agreements, certificates, ID cards)
  const generatedDocs = await db.generatedDocument.findMany({
    where: { internId: intern.id },
    orderBy: { createdAt: "desc" },
  });

  // 3. Fetch all uploaded secure vault documents (Resumes, ID Proofs, other compliance uploads)
  const secureDocs = await db.secureDocument.findMany({
    where: { ownerId: intern.id, deletedAt: null },
    orderBy: { uploadDate: "desc" },
  });

  // 4. Safely serialize documents for the Client Component (Dates to string)
  const serializedGeneratedDocs = generatedDocs.map((doc) => ({
    id: doc.id,
    internId: doc.internId,
    type: doc.type,
    content: doc.content as any,
    version: doc.version,
    lifecycleStatus: doc.lifecycleStatus,
    watermarkStatus: doc.watermarkStatus,
    status: doc.status,
    signature: doc.signature,
    candidateSigned: doc.candidateSigned,
    founderSigned: doc.founderSigned,
    founderSignatory: doc.founderSignatory,
    fileUrl: doc.fileUrl,
    gcsFileId: doc.gcsFileId,
    verificationHash: doc.verificationHash,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
  }));

  const serializedSecureDocs = secureDocs.map((doc) => ({
    id: doc.id,
    fileId: doc.fileId,
    fileName: doc.fileName,
    storagePath: doc.storagePath,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    ownerId: doc.ownerId,
    uploadedById: doc.uploadedById,
    uploadDate: doc.uploadDate.toISOString(),
    sha256Hash: doc.sha256Hash,
    documentCategory: doc.documentCategory,
    version: doc.version,
    bucketUsed: doc.bucketUsed,
    archived: doc.archived,
  }));

  return (
    <MyDocumentsClient
      internProfile={{
        id: intern.id,
        fullName: intern.fullName,
        internId: intern.internId,
        department: intern.department,
        roleDomain: intern.roleDomain,
        employmentType: intern.employmentType,
        startDate: intern.startDate.toISOString(),
      }}
      generatedDocs={serializedGeneratedDocs}
      secureDocs={serializedSecureDocs}
      isDemoMode={isAdministratorPreview}
    />
  );
}
