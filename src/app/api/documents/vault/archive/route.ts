import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getSafeUserId } from "@/lib/safeUser";

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
 * PUT /api/documents/vault/archive
 * Toggles the 'archived' status of a secure document
 */
export async function PUT(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Only Admin / HR / Super Admin / Founder can archive
    const hasDocAccess = await hasPermission(user.id, user.role, "documentAccess");
    if (!hasDocAccess || user.role === "INTERN" || user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden. Administrative access is required to archive vault items." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json({ error: "Validation failed. Missing documentId parameter." }, { status: 400 });
    }

    // Verify secure document exists
    const doc = await db.secureDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "Validation failed. Document does not exist or has been soft-deleted." }, { status: 404 });
    }

    // Check direct supervisor boundaries for Team Lead / Admin
    if (user.role === "TEAM_LEAD" || user.role === "ADMIN") {
      const owner = await db.intern.findUnique({
        where: { id: doc.ownerId },
      });
      if (owner?.supervisorId !== user.id) {
        return NextResponse.json({ error: "Forbidden. You can only archive files of enrollees under your direct supervision." }, { status: 403 });
      }
    }

    const updatedDoc = await db.$transaction(async (tx) => {
      const newDoc = await tx.secureDocument.update({
        where: { id: documentId },
        data: { archived: !doc.archived },
      });

      await tx.activityLog.create({
        data: {
          userId: await getSafeUserId(user.id, tx),
          action: "ARCHIVE_SECURE_DOCUMENT",
          description: `${newDoc.archived ? "Archived" : "Restored"} secure document "${doc.fileName}" (Version ${doc.version}) in the enterprise vault.`,
        },
      });

      return newDoc;
    });

    return NextResponse.json(updatedDoc, { status: 200 });
  } catch (err: any) {
    console.error("Vault document archiving failed:", err);
    return NextResponse.json({ error: "Internal server error during archiving toggle." }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/vault/archive
 * Performs a high-security soft-delete on a secure document (FOUNDER / SUPER_ADMIN ONLY)
 */
export async function DELETE(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Soft delete requires Founder or Super Admin role
    const hasDocAccess = await hasPermission(user.id, user.role, "documentAccess");
    const isAuthorized = user.role === "FOUNDER" || (user.role === "SUPER_ADMIN" && hasDocAccess);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden. Only AIMS Founders or Super Admins can remove vault items." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Validation failed. Missing document ID in search parameters." }, { status: 400 });
    }

    const doc = await db.secureDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "Validation failed. Target document does not exist." }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      // Perform soft-delete
      await tx.secureDocument.update({
        where: { id: documentId },
        data: { deletedAt: new Date() },
      });

      await tx.activityLog.create({
        data: {
          userId: await getSafeUserId(user.id, tx),
          action: "SOFT_DELETE_SECURE_DOCUMENT",
          description: `Soft-deleted secure document "${doc.fileName}" (Version ${doc.version}, Path: ${doc.storagePath}) from the vault.`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Document soft-deleted successfully." }, { status: 200 });
  } catch (err: any) {
    console.error("Vault document soft-deletion failed:", err);
    return NextResponse.json({ error: "Internal server error during soft-deletion." }, { status: 500 });
  }
}
