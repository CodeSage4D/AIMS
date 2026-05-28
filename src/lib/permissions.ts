import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

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
  if (role === "FOUNDER") {
    return true;
  }

  // Core intern permissions that must always be granted for INTERN role.
  // This is a safety net: even if a UserPermission row is misconfigured,
  // interns should always have access to their own basic portal areas.
  const INTERN_CORE_PERMISSIONS = ["dashboardAccess", "attendanceAccess", "taskAccess", "documentAccess"];
  const isInternCorePermission = (role === "INTERN" || role === "EMPLOYEE") && INTERN_CORE_PERMISSIONS.includes(permission);

  try {
    // 2. Query custom user permissions override from the database
    const userPerm = await db.userPermission.findUnique({
      where: { userId },
    });

    if (userPerm) {
      const permValue = !!userPerm[permission];
      // Safety net: never deny core intern permissions even if row says false
      if (isInternCorePermission && !permValue) {
        console.warn(`[hasPermission] UserPermission row has ${permission}=false for INTERN user ${userId}. Overriding to true.`);
        return true;
      }
      return permValue;
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
    case "SUPER_ADMIN":
      // Super admin gets everything by default
      return true;

    case "ADMIN":
    case "TEAM_LEAD":
    case "HR":
      // Admins, Team Leads, and HR get everything except Settings access by default
      return permission !== "settingsAccess";

    case "INTERN":
    case "EMPLOYEE":
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
