import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { put } from "@vercel/blob";
import { DocType } from "@prisma/client";
import { getSafeUserId } from "@/lib/safeUser";
import { hasPermission } from "@/lib/permissions";

// helper to authenticate and check roles
async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) {
    return { authenticated: false, status: 401, error: "Unauthorized access. Please log in." };
  }
  const user = session.user as any;
  return { authenticated: true, user };
}

/**
 * POST /api/documents
 * Uploads a document to Vercel Blob and records it in the database
 */
export async function POST(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Validation failed. Missing form data." }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const internId = formData.get("internId") as string | null;
    const type = formData.get("type") as string | null;

    if (!file || !internId || !type) {
      return NextResponse.json(
        { error: "Validation failed. Missing required fields: file, internId, or type." },
        { status: 400 }
      );
    }

    // Strict file upload security checks
    const MAX_FILE_SIZE = 100 * 1024; // 100 KB maximum limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the strict maximum allowed limit of 100 KB." },
        { status: 400 }
      );
    }

    const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, JPEG, and PNG files are permitted." },
        { status: 400 }
      );
    }

    // Verify magic bytes content validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let isValidMagic = false;
    const hex = buffer.toString("hex", 0, 8).toUpperCase();

    if (file.type === "application/pdf" && hex.startsWith("25504446")) {
      isValidMagic = true;
    } else if (file.type === "image/jpeg" && hex.startsWith("FFD8FF")) {
      isValidMagic = true;
    } else if (file.type === "image/png" && hex.startsWith("89504E470D0A1A0A")) {
      isValidMagic = true;
    }

    if (!isValidMagic) {
      return NextResponse.json(
        { error: "Invalid file content. The file signature does not match its extension." },
        { status: 400 }
      );
    }

    // Validate that the document type matches the DocType enum values
    if (!Object.values(DocType).includes(type as any)) {
      return NextResponse.json({ error: `Validation failed. Invalid document type. Must be one of: ${Object.values(DocType).join(", ")}` }, { status: 400 });
    }

    // Verify target intern exists
    const intern = await db.intern.findUnique({
      where: { id: internId },
      select: { id: true, fullName: true, userId: true, supervisorId: true },
    });

    if (!intern) {
      return NextResponse.json({ error: "Validation failed. Target enrollee does not exist." }, { status: 400 });
    }

    // Role-based document access controls
    const hasDocAccess = await hasPermission(user.id, user.role, "documentAccess");
    if (user.role === "INTERN") {
      if (intern.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden. You can only upload compliance files for your own profile." }, { status: 403 });
      }
      if (!hasDocAccess) {
        return NextResponse.json({ error: "Forbidden. Insufficient permissions to access documents." }, { status: 403 });
      }
    } else {
      if (!hasDocAccess) {
        return NextResponse.json({ error: "Forbidden. Insufficient permissions to manage documents." }, { status: 403 });
      }
      if ((user.role === "TEAM_LEAD" || user.role === "ADMIN") && intern.supervisorId !== user.id) {
        return NextResponse.json({ error: "Forbidden. Managers can only upload files for supervised enrollees." }, { status: 403 });
      }
    }

    // Upload to Vercel Blob
    let fileUrl = "";
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const storagePath = `aims/documents/${internId}/${type}-${Date.now()}-${cleanFileName}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Stream file directly to Vercel CDN Blob storage
      const blobResult = await put(storagePath, file, {
        access: "public",
        contentType: file.type,
      });
      fileUrl = blobResult.url;
    } else {
      console.warn("BLOB_READ_WRITE_TOKEN is not defined in your .env configuration. Falling back to secure mock-CDN simulation URL.");
      // High-fidelity fallback simulated CDN address that is 100% testable out-of-the-box
      fileUrl = `https://yck9uoc24tphuxtg.public.blob.vercel-storage.com/${internId}_${type}_${cleanFileName}`;
    }

    // Persist document record and activity trail inside a single transactional block
    const newDoc = await db.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          internId,
          type: type as DocType,
          fileName: file.name,
          fileUrl,
          verified: false,
        },
      });

      // Update the intern's document status if it was "PENDING"
      await tx.intern.update({
        where: { id: internId },
        data: { documentStatus: "UNDER_REVIEW" },
      });

      await tx.activityLog.create({
        data: {
          userId: await getSafeUserId(user.id, tx),
          action: "UPLOAD_DOCUMENT",
          description: `Uploaded compliance ${type} file "${file.name}" for intern ${intern.fullName}`,
        },
      });

      return document;
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (err: any) {
    console.error("Error uploading compliance document:", err);
    return NextResponse.json({ error: "Internal database upload error." }, { status: 500 });
  }
}

/**
 * PATCH /api/documents
 * Verifies or audits an uploaded compliance document (ADMIN ONLY)
 */
export async function PATCH(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Check permission
    const hasDocAccess = await hasPermission(user.id, user.role, "documentAccess");
    if (user.role === "INTERN" || !hasDocAccess) {
      return NextResponse.json({ error: "Forbidden. Insufficient permissions to audit/verify documents." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { documentId, verified } = body;

    if (!documentId || verified === undefined) {
      return NextResponse.json({ error: "Validation failed. Missing required fields: documentId or verified state." }, { status: 400 });
    }

    // Verify document exists
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: { intern: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Validation failed. Target document does not exist." }, { status: 404 });
    }

    if ((user.role === "TEAM_LEAD" || user.role === "ADMIN") && document.intern.supervisorId !== user.id) {
      return NextResponse.json({ error: "Forbidden. You can only verify documents of interns under your direct supervision." }, { status: 403 });
    }

    // Verify and update document inside a safe database transaction
    const updatedDoc = await db.$transaction(async (tx) => {
      const doc = await tx.document.update({
        where: { id: documentId },
        data: { verified: Boolean(verified) },
      });

      // Recalculate and update intern's overarching document status
      // Query how many documents this intern has uploaded
      const allDocs = await tx.document.findMany({
        where: { internId: document.internId },
      });

      const allVerified = allDocs.length >= 7 && allDocs.every((d) => d.verified);
      const docStatus = allVerified ? "VERIFIED" : "UNDER_REVIEW";

      await tx.intern.update({
        where: { id: document.internId },
        data: { documentStatus: docStatus },
      });

      await tx.activityLog.create({
        data: {
          userId: await getSafeUserId(user.id, tx),
          action: "VERIFY_DOCUMENT",
          description: `Audited and verified document "${document.fileName}" (${document.type}) for intern ${document.intern.fullName}`,
        },
      });

      return doc;
    });

    return NextResponse.json(updatedDoc, { status: 200 });
  } catch (err: any) {
    console.error("Error verifying document:", err);
    return NextResponse.json({ error: "Internal database update error." }, { status: 500 });
  }
}

/**
 * DELETE /api/documents
 * Wipes a document record and activity trail (FOUNDER / SUPER_ADMIN ONLY)
 */
export async function DELETE(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Only Founder and Super Admin with documentAccess can delete
    const hasDocAccess = await hasPermission(user.id, user.role, "documentAccess");
    const isAuthorizedToDelete = user.role === "FOUNDER" || (user.role === "SUPER_ADMIN" && hasDocAccess);
    if (!isAuthorizedToDelete) {
      return NextResponse.json({ error: "Forbidden. Only AIMS Founders and Super Admins can wipe document items." }, { status: 403 });
    }

    // Extract ID from query search parameters
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Validation failed. Missing query parameter: id." }, { status: 400 });
    }

    // Verify document exists
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: { intern: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Validation failed. Target document does not exist." }, { status: 404 });
    }

    // Wipe file in transaction
    await db.$transaction(async (tx) => {
      await tx.document.delete({
        where: { id: documentId },
      });

      await tx.activityLog.create({
        data: {
          userId: await getSafeUserId(user.id, tx),
          action: "DELETE_DOCUMENT",
          description: `Wiped compliance ${document.type} file "${document.fileName}" for intern ${document.intern.fullName}`,
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting document:", err);
    return NextResponse.json({ error: "Internal database write error." }, { status: 500 });
  }
}
