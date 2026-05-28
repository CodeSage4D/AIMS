import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

/**
 * Checks if a given user has permission to perform a specific action category.
 * - Founder always returns true (supreme authority).
 * - SUPER_ADMIN always returns true.
 * - ADMIN/HR/TEAM_LEAD return true for everything except settingsAccess.
 * - If user has custom permissions in UserPermission table, it respects overrides
 *   ONLY for INTERN and EMPLOYEE roles.
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

  // ── Elevated role short-circuits (no DB check needed) ───────────────────
  // These roles must NEVER be blocked by stale UserPermission rows.

  // 1. Founder is the supreme authority — full unrestricted access
  if (role === "FOUNDER") return true;

  // 2. Super Admin — full access, same as Founder
  if (role === "SUPER_ADMIN") return true;

  // 3. Admin, HR, Team Lead — full access except settings
  if (role === "ADMIN" || role === "HR" || role === "TEAM_LEAD") {
    return permission !== "settingsAccess";
  }

  // ── INTERN / EMPLOYEE: check DB overrides with safety net ───────────────
  const INTERN_CORE_PERMISSIONS = ["dashboardAccess", "attendanceAccess", "taskAccess", "documentAccess"];
  const isInternCorePermission =
    (role === "INTERN" || role === "EMPLOYEE") && INTERN_CORE_PERMISSIONS.includes(permission);

  try {
    // Query custom user permissions override from the database
    const userPerm = await db.userPermission.findUnique({
      where: { userId },
    });

    if (userPerm) {
      const permValue = !!userPerm[permission as keyof typeof userPerm];
      // Safety net: never deny core intern permissions even if row says false
      if (isInternCorePermission && !permValue) {
        console.warn(
          `[hasPermission] UserPermission row has ${permission}=false for INTERN user ${userId}. Overriding to true.`
        );
        return true;
      }
      return permValue;
    }
  } catch (err) {
    console.warn(
      `[hasPermission] Database check failed for user ${userId}, falling back to defaults:`,
      err
    );
  }

  // Try to query the specific roleDomain to resolve automated permissions mapping
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
    console.warn(
      `[hasPermission] roleDomain default mapping check failed for user ${userId}:`,
      err
    );
  }

  // Final fallback for INTERN / EMPLOYEE
  if (role === "INTERN" || role === "EMPLOYEE") {
    return (
      permission === "dashboardAccess" ||
      permission === "attendanceAccess" ||
      permission === "taskAccess" ||
      permission === "documentAccess"
    );
  }

  return false;
}
