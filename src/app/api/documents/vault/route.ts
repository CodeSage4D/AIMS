import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getSafeUserId } from "@/lib/safeUser";
import { scanFileBuffer } from "@/lib/scanner";
import { uploadToGcs } from "@/lib/gcs";

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
 * POST /api/documents/vault
 * Secure upload pipeline to the Google Cloud Storage vault
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
      return NextResponse.json({ error: "Validation failed. Missing upload form data." }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const internId = formData.get("internId") as string | null;
    const category = formData.get("category") as string | null;

    if (!file || !internId || !category) {
      return NextResponse.json(
        { error: "Validation failed. Missing required fields: file, internId, or category." },
        { status: 400 }
      );
    }

    // 1. Strict Size limit (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the enterprise vault limit of 10 MB." },
        { status: 400 }
      );
    }

    // 2. Strict MIME check
    const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Rejected: Only PDF, JPEG, and PNG files are permitted for secure upload." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Magic Byte signature check
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
        { error: "Upload rejected: File signature does not match its extension (Spoofing attempt)." },
        { status: 400 }
      );
    }

    // 4. Malware Scan Hook
    const scanResult = await scanFileBuffer(buffer, file.name, file.type);
    if (!scanResult.clean) {
      // Secure fallback: log high-priority threat alert and block upload
      await db.activityLog.create({
        data: {
          userId: await getSafeUserId(user.id, db),
          action: "SECURITY_THREAT_DETECTED",
          description: `ALERT: Blocked malware upload attempt of "${file.name}" for intern ${internId}. Threat name: ${scanResult.threatName}. Details: ${scanResult.details}`,
        },
      });

      return NextResponse.json(
        { error: `Security Scan Threat Found: File is infected with ${scanResult.threatName}. Upload aborted.` },
        { status: 400 }
      );
    }

    // 5. Verify enrollee exists
    const intern = await db.intern.findUnique({
      where: { id: internId },
      select: { id: true, fullName: true, userId: true, supervisorId: true },
    });

    if (!intern) {
      return NextResponse.json({ error: "Validation failed. Target enrollee does not exist." }, { status: 400 });
    }

    // 6. Role Barrier Checks
    const hasDocAccess = await hasPermission(user.id, user.role, "documentAccess");
    if (user.role === "INTERN" || user.role === "EMPLOYEE") {
      if (intern.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden. You can only upload vault files for your own profile." }, { status: 403 });
      }
      if (!hasDocAccess) {
        return NextResponse.json({ error: "Forbidden. Insufficient permissions to access the vault." }, { status: 403 });
      }
    } else {
      if (!hasDocAccess) {
        return NextResponse.json({ error: "Forbidden. Administrative vault access is required." }, { status: 403 });
      }
      if ((user.role === "TEAM_LEAD" || user.role === "ADMIN") && intern.supervisorId !== user.id) {
        return NextResponse.json({ error: "Forbidden. Managers can only upload vault files for supervised enrollees." }, { status: 403 });
      }
    }

    // 7. Calculate Document Versioning (Auto-increment if category already exists)
    const lastDoc = await db.secureDocument.findFirst({
      where: { ownerId: internId, documentCategory: category, archived: false },
      orderBy: { version: "desc" },
    });
    const nextVersion = lastDoc ? lastDoc.version + 1 : 1;

    // 8. Stream buffer to GCS Primary (or Backup)
    const uploadResult = await uploadToGcs(buffer, file.name, file.type, internId, category);

    // 9. Persist metadata & audit compliance in single transaction
    const newVaultDoc = await db.$transaction(async (tx) => {
      const doc = await tx.secureDocument.create({
        data: {
          fileId: uploadResult.fileId,
          fileName: file.name,
          storagePath: uploadResult.storagePath,
          fileType: file.type,
          fileSize: uploadResult.fileSize,
          ownerId: internId,
          uploadedById: user.id,
          sha256Hash: uploadResult.sha256Hash,
          documentCategory: category,
          version: nextVersion,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: await getSafeUserId(user.id, tx),
          action: "UPLOAD_SECURE_DOCUMENT",
          description: `Uploaded secure document "${file.name}" (Cat: ${category}, Ver: ${nextVersion}, Size: ${(uploadResult.fileSize / 1024).toFixed(1)} KB) to ${uploadResult.bucketUsed}. Integrity: SHA-256 PASSED.`,
        },
      });

      return doc;
    });

    return NextResponse.json(newVaultDoc, { status: 201 });
  } catch (err: any) {
    console.error("Vault document upload failed:", err);
    return NextResponse.json({ error: "Internal server error during secure vault upload." }, { status: 500 });
  }
}

/**
 * GET /api/documents/vault
 * Retrieves list of secure versioned document metadata based on role barriers
 */
export async function GET(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const { searchParams } = new URL(req.url);
    const internIdParam = searchParams.get("internId");

    const hasDocAccess = await hasPermission(user.id, user.role, "documentAccess");
    if (!hasDocAccess) {
      return NextResponse.json({ error: "Forbidden. Insufficient access to document vault." }, { status: 403 });
    }

    let documents = [];

    if (user.role === "INTERN" || user.role === "EMPLOYEE") {
      // Find the corresponding intern profile
      const intern = await db.intern.findUnique({
        where: { userId: user.id },
      });
      if (!intern) {
        return NextResponse.json([], { status: 200 });
      }
      documents = await db.secureDocument.findMany({
        where: { ownerId: intern.id, deletedAt: null },
        orderBy: [{ uploadDate: "desc" }, { version: "desc" }],
      });
    } else {
      // Admin / Founder / TL Role
      if (internIdParam) {
        // Retrieve for specific intern, check supervision barriers for Team Lead / Admin
        const intern = await db.intern.findUnique({
          where: { id: internIdParam },
        });
        if (!intern) {
          return NextResponse.json({ error: "Target enrollee not found." }, { status: 404 });
        }

        if ((user.role === "TEAM_LEAD" || user.role === "ADMIN") && intern.supervisorId !== user.id) {
          return NextResponse.json({ error: "Forbidden. You can only view vault items of supervised enrollees." }, { status: 403 });
        }

        documents = await db.secureDocument.findMany({
          where: { ownerId: internIdParam, deletedAt: null },
          orderBy: [{ uploadDate: "desc" }, { version: "desc" }],
        });
      } else {
        // Admin/Founder querying the entire list
        if (user.role !== "FOUNDER" && user.role !== "SUPER_ADMIN" && user.role !== "HR") {
          // Team Leads / Admins can only query supervised enrollees, so filter by supervisorId
          documents = await db.secureDocument.findMany({
            where: {
              deletedAt: null,
              uploadedBy: {
                interns: {
                  some: {
                    supervisorId: user.id,
                  },
                },
              },
            },
            orderBy: [{ uploadDate: "desc" }],
          });
        } else {
          // Founders get full visibility
          documents = await db.secureDocument.findMany({
            where: { deletedAt: null },
            orderBy: [{ uploadDate: "desc" }],
          });
        }
      }
    }

    return NextResponse.json(documents, { status: 200 });
  } catch (err: any) {
    console.error("Vault retrieval failed:", err);
    return NextResponse.json({ error: "Internal server error during metadata retrieval." }, { status: 500 });
  }
}
