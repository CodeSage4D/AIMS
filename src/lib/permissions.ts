import { db } from "@/lib/db";
import { Role } from "@prisma/client";

/**
 * Checks if a given user has permission to perform a specific action category.
 * - Founder always returns true.
 * - If user has custom permissions in UserPermission table, it respects the overrides.
 * - Otherwise, falls back to role-based system defaults.
 */
export async function hasPermission(
  userId: string | null | undefined,
  role: string | null | undefined,
  permission:
    | "dashboardAccess"
    | "attendanceAccess"
    | "taskAccess"
    | "documentAccess"
    | "approvalAccess"
    | "settingsAccess"
    | "analyticsAccess"
    | "onboardingAccess"
): Promise<boolean> {
  if (!userId) return false;

  // 1. Founder is the supreme authority - unrestricted access
  if (role === Role.FOUNDER) {
    return true;
  }

  try {
    // 2. Query custom user permissions override from the database
    const userPerm = await db.userPermission.findUnique({
      where: { userId },
    });

    if (userPerm) {
      return !!userPerm[permission];
    }
  } catch (err) {
    console.warn(`[hasPermission] Database check failed for user ${userId}, falling back to defaults:`, err);
  }

  // 3. Try to query the specific startup roleDomain to resolve automated permissions mapping
  try {
    const intern = await db.intern.findUnique({
      where: { userId },
      select: { roleDomain: true },
    });

    if (intern?.roleDomain) {
      const { getDefaultPermissionsForRoleDomain } = await import("@/lib/roles");
      const defaultPerms = getDefaultPermissionsForRoleDomain(intern.roleDomain);
      if (defaultPerms[permission] !== undefined) {
        return defaultPerms[permission];
      }
    }
  } catch (err) {
    console.warn(`[hasPermission] roleDomain default mapping check failed for user ${userId}:`, err);
  }

  // 4. Fallback to structural defaults based on high-level user role
  switch (role) {
    case Role.SUPER_ADMIN:
      // Super admin gets everything by default
      return true;

    case Role.ADMIN:
    case Role.TEAM_LEAD:
    case Role.HR:
      // Admins, Team Leads, and HR get everything except Settings access by default
      return permission !== "settingsAccess";

    case Role.INTERN:
      // Interns/Employees get minimal access (Dashboard, checking standard attendance/tasks/own documents)
      return (
        permission === "dashboardAccess" ||
        permission === "attendanceAccess" ||
        permission === "taskAccess" ||
        permission === "documentAccess"
      );

    default:
      return false;
  }
}
