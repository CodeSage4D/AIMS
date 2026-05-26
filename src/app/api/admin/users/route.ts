import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";

/**
 * PATCH /api/admin/users
 * Allows Founders and Super Admins to update a user's role and account status.
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const currentRole = (session.user as any).role;
    const currentId = (session.user as any).id;

    if (currentRole !== "FOUNDER" && currentRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Only Founder and Super Admin can change user roles." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { userId, role, status } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    // Prevent changing own role
    if (userId === currentId && role && role !== currentRole) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 400 }
      );
    }

    // Only FOUNDER can assign FOUNDER role
    if (role === "FOUNDER" && currentRole !== "FOUNDER") {
      return NextResponse.json(
        { error: "Only the Founder can assign the Founder role." },
        { status: 403 }
      );
    }

    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No update fields provided." }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      const safeUserId = await getSafeUserId(currentId, tx);

      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      await tx.permissionChangeLog.create({
        data: {
          changedById: currentId,
          targetId: userId,
          previousRole: target.role,
          newRole: role || target.role,
          details: `Admin role/status update: role=${role || "unchanged"}, status=${status || "unchanged"}`,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: safeUserId,
          action: "ADMIN_ROLE_UPDATE",
          description: `Updated user "${target.fullName}" role to "${role || target.role}" and status to "${status || target.status}".`,
        },
      });
    });

    return NextResponse.json(
      { success: true, message: "User role/status updated successfully." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Admin Users PATCH]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * GET /api/admin/users
 * Returns all users with their roles, status, and intern profile info.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const currentRole = (session.user as any).role;
    if (
      currentRole !== "FOUNDER" &&
      currentRole !== "SUPER_ADMIN" &&
      currentRole !== "HR" &&
      currentRole !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        internProfile: {
          select: {
            internId: true,
            department: true,
            roleDomain: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (err: any) {
    console.error("[Admin Users GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
