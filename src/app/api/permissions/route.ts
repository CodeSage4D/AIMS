import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getSafeUserId } from "@/lib/safeUser";

// Helper to authenticate and check roles
async function getAdminUser() {
  const session = await auth();
  if (!session?.user) {
    return { authenticated: false, status: 401, error: "Unauthorized access. Please log in." };
  }
  const user = session.user as any;
  if (user.role !== Role.FOUNDER && user.role !== Role.SUPER_ADMIN) {
    return { authenticated: false, status: 403, error: "Forbidden. Administrative privileges required." };
  }
  return { authenticated: true, user };
}

/**
 * GET /api/permissions
 * Lists all users with their roles and permission status
 */
export async function GET(req: Request) {
  try {
    const authResult = await getAdminUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        permission: true,
        internProfile: {
          select: {
            id: true,
            internId: true,
            status: true,
            roleDomain: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching permissions:", err);
    return NextResponse.json({ error: "Internal database query error." }, { status: 500 });
  }
}

/**
 * POST /api/permissions
 * Creates a new administrative user (Super Admin, Admin, HR)
 */
export async function POST(req: Request) {
  try {
    const authResult = await getAdminUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user: currentUser } = authResult;

    const body = await req.json().catch(() => ({}));
    const { email, password, fullName, role, permissions } = body;

    if (!email?.trim() || !password?.trim() || !fullName?.trim() || !role) {
      return NextResponse.json({ error: "Validation failed. Missing required fields: email, password, fullName, or role." }, { status: 400 });
    }

    // Role restrictions
    const targetRole = role as Role;
    if (!Object.values(Role).includes(targetRole)) {
      return NextResponse.json({ error: "Validation failed. Invalid role value." }, { status: 400 });
    }

    if (targetRole === Role.FOUNDER) {
      return NextResponse.json({ error: "Forbidden. Cannot create multiple Founder accounts." }, { status: 403 });
    }

    // Only Founder can create Super Admins
    if (targetRole === Role.SUPER_ADMIN && currentUser.role !== Role.FOUNDER) {
      return NextResponse.json({ error: "Forbidden. Only the Founder can create Super Admin accounts." }, { status: 403 });
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email address already exists." }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const newUser = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          fullName: fullName.trim(),
          role: targetRole,
          changePasswordRequired: true,
        },
      });

      // Default permissions based on role if none provided
      const defaultPerms = permissions || {
        dashboardAccess: true,
        attendanceAccess: targetRole !== Role.INTERN,
        taskAccess: targetRole !== Role.INTERN,
        documentAccess: targetRole !== Role.INTERN,
        approvalAccess: targetRole === Role.SUPER_ADMIN || targetRole === Role.HR,
        settingsAccess: targetRole === Role.SUPER_ADMIN,
        analyticsAccess: targetRole !== Role.INTERN,
        onboardingAccess: targetRole === Role.SUPER_ADMIN || targetRole === Role.HR,
      };

      await tx.userPermission.create({
        data: {
          userId: user.id,
          ...defaultPerms,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: await getSafeUserId(currentUser.id, tx),
          action: "CREATE_ADMIN_ACCOUNT",
          description: `Created administrative account for ${fullName} with role ${targetRole}`,
        },
      });

      return user;
    });

    return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating administrative user:", err);
    return NextResponse.json({ error: "Internal database write error." }, { status: 500 });
  }
}

/**
 * PUT /api/permissions
 * Updates a user's role and permission limits. Protects Founder accounts from edit.
 */
export async function PUT(req: Request) {
  try {
    const authResult = await getAdminUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user: currentUser } = authResult;

    const body = await req.json().catch(() => ({}));
    const { userId, role, permissions } = body;

    if (!userId) {
      return NextResponse.json({ error: "Validation failed. Missing required field: userId." }, { status: 400 });
    }

    // Retrieve target user
    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    // 🔒 FOUNDER PROTECTION: Never modify founder profile
    if (targetUser.role === Role.FOUNDER) {
      return NextResponse.json({ error: "Forbidden. The Founder account is supreme and its roles or permissions cannot be modified." }, { status: 403 });
    }

    // Only Founder can promote to SUPER_ADMIN or modify SUPER_ADMIN users
    if ((role === Role.SUPER_ADMIN || targetUser.role === Role.SUPER_ADMIN) && currentUser.role !== Role.FOUNDER) {
      return NextResponse.json({ error: "Forbidden. Only the Founder can manage Super Admin roles and permissions." }, { status: 403 });
    }

    const updatedUser = await db.$transaction(async (tx) => {
      // Update role if supplied
      let nextRole = targetUser.role;
      if (role && Object.values(Role).includes(role as Role)) {
        nextRole = role as Role;
        await tx.user.update({
          where: { id: userId },
          data: { role: nextRole },
        });
      }

      // Upsert UserPermission overrides
      if (permissions) {
        await tx.userPermission.upsert({
          where: { userId },
          update: {
            dashboardAccess: permissions.dashboardAccess ?? undefined,
            attendanceAccess: permissions.attendanceAccess ?? undefined,
            taskAccess: permissions.taskAccess ?? undefined,
            documentAccess: permissions.documentAccess ?? undefined,
            approvalAccess: permissions.approvalAccess ?? undefined,
            settingsAccess: permissions.settingsAccess ?? undefined,
            analyticsAccess: permissions.analyticsAccess ?? undefined,
            onboardingAccess: permissions.onboardingAccess ?? undefined,
          },
          create: {
            userId,
            dashboardAccess: permissions.dashboardAccess ?? true,
            attendanceAccess: permissions.attendanceAccess ?? true,
            taskAccess: permissions.taskAccess ?? true,
            documentAccess: permissions.documentAccess ?? true,
            approvalAccess: permissions.approvalAccess ?? true,
            settingsAccess: permissions.settingsAccess ?? true,
            analyticsAccess: permissions.analyticsAccess ?? true,
            onboardingAccess: permissions.onboardingAccess ?? true,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: await getSafeUserId(currentUser.id, tx),
          action: "UPDATE_PERMISSIONS",
          description: `Updated roles and permission limits for user ${targetUser.fullName} (ID: ${userId})`,
        },
      });

      return { id: userId, role: nextRole };
    });

    return NextResponse.json({ success: true, user: updatedUser }, { status: 200 });
  } catch (err: any) {
    console.error("Error updating permissions:", err);
    return NextResponse.json({ error: "Internal database write error." }, { status: 500 });
  }
}

/**
 * DELETE /api/permissions
 * Deletes a user account. Protects Founders from being deleted.
 */
export async function DELETE(req: Request) {
  try {
    const authResult = await getAdminUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user: currentUser } = authResult;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Validation failed. Missing query parameter: userId." }, { status: 400 });
    }

    // Retrieve target user
    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    // 🔒 FOUNDER PROTECTION: Never delete founder
    if (targetUser.role === Role.FOUNDER) {
      return NextResponse.json({ error: "Forbidden. The Founder account is supreme and cannot be deleted from the system." }, { status: 403 });
    }

    // Self-deletion check
    if (targetUser.id === currentUser.id) {
      return NextResponse.json({ error: "Forbidden. You cannot delete your own active administrative session account." }, { status: 400 });
    }

    // Only Founder can delete Super Admin
    if (targetUser.role === Role.SUPER_ADMIN && currentUser.role !== Role.FOUNDER) {
      return NextResponse.json({ error: "Forbidden. Only the Founder can delete Super Admin accounts." }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      await tx.user.delete({
        where: { id: userId },
      });

      await tx.activityLog.create({
        data: {
          userId: await getSafeUserId(currentUser.id, tx),
          action: "DELETE_USER_ACCOUNT",
          description: `Permanently deleted user account for ${targetUser.fullName} (${targetUser.email})`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "User account deleted successfully." }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting user account:", err);
    return NextResponse.json({ error: "Internal database write error." }, { status: 500 });
  }
}
