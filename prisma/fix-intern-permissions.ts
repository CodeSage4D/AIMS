/**
 * ============================================================
 * AIMS — Safe Data Fix Script: Intern Dashboard Permissions
 * ============================================================
 * Run with: npx tsx prisma/fix-intern-permissions.ts
 *
 * What this script does (READ-ONLY on intern/employee data):
 *  1. Finds all INTERN users whose UserPermission row has
 *     dashboardAccess = false (incorrectly locked out).
 *  2. Updates ONLY the four core intern permission flags
 *     (dashboard/attendance/task/document) to true.
 *     All other data (intern profiles, tasks, logs, etc.) is UNTOUCHED.
 *  3. Creates a missing UserPermission row for any INTERN user
 *     who has no row at all (direct-onboarded interns).
 *  4. Prints a detailed, colour-coded audit log of every change.
 *
 * This script is SAFE to run multiple times (idempotent).
 * No data is deleted. No intern/employee profile fields are changed.
 * ============================================================
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ANSI colour helpers for the terminal output
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  grey: "\x1b[90m",
  magenta: "\x1b[35m",
};

function log(msg: string) { process.stdout.write(msg + "\n"); }
function ok(msg: string)  { log(`${c.green}  ✓${c.reset} ${msg}`); }
function warn(msg: string) { log(`${c.yellow}  ⚠${c.reset} ${msg}`); }
function info(msg: string) { log(`${c.cyan}  →${c.reset} ${msg}`); }
function skip(msg: string) { log(`${c.grey}  ─${c.reset} ${msg}`); }

async function main() {
  log("");
  log(`${c.bold}${c.magenta}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  log(`${c.bold}${c.magenta}║   AIMS — Intern Dashboard Permission Safe Fix Script         ║${c.reset}`);
  log(`${c.bold}${c.magenta}╚══════════════════════════════════════════════════════════════╝${c.reset}`);
  log("");

  // ─────────────────────────────────────────────────────────────────
  // Step 1: Fetch all INTERN users with their permission rows
  // ─────────────────────────────────────────────────────────────────
  info("Querying all INTERN users from the database...");

  const internUsers = await db.user.findMany({
    where: {
      role: "INTERN",
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
      permission: true,
      internProfile: {
        select: {
          internId: true,
          fullName: true,
          status: true,
          roleDomain: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  log(`  Found ${c.bold}${internUsers.length}${c.reset} INTERN user accounts.\n`);

  // ─────────────────────────────────────────────────────────────────
  // Counters
  // ─────────────────────────────────────────────────────────────────
  let totalFixed = 0;
  let totalCreated = 0;
  let totalAlreadyOk = 0;
  let totalSkipped = 0;

  // ─────────────────────────────────────────────────────────────────
  // Step 2: Process each intern user
  // ─────────────────────────────────────────────────────────────────
  for (const user of internUsers) {
    const displayName = user.internProfile?.fullName || user.fullName || user.email;
    const internId    = user.internProfile?.internId  || "no-id";
    const label       = `${displayName} [${internId}] (${user.email})`;

    // Skip PENDING/REJECTED users — they can't log in anyway
    if (user.status === "PENDING" || user.status === "REJECTED") {
      skip(`SKIPPED (account ${user.status}): ${label}`);
      totalSkipped++;
      continue;
    }

    const perm = user.permission;

    // ── Case A: No UserPermission row at all ──────────────────────
    if (!perm) {
      await db.userPermission.create({
        data: {
          userId:           user.id,
          dashboardAccess:  true,
          attendanceAccess: true,
          taskAccess:       true,
          documentAccess:   true,
          approvalAccess:   false,
          settingsAccess:   false,
          analyticsAccess:  false,
          onboardingAccess: false,
        },
      });
      ok(`CREATED permission row: ${label}`);
      totalCreated++;
      continue;
    }

    // ── Case B: Row exists — check if any core permission is wrong ──
    const needsFix =
      !perm.dashboardAccess  ||
      !perm.attendanceAccess ||
      !perm.taskAccess       ||
      !perm.documentAccess;

    if (!needsFix) {
      skip(`Already OK:           ${label}`);
      totalAlreadyOk++;
      continue;
    }

    // ── Case C: Row exists but core permissions are false — fix them ─
    const before = {
      dashboardAccess:  perm.dashboardAccess,
      attendanceAccess: perm.attendanceAccess,
      taskAccess:       perm.taskAccess,
      documentAccess:   perm.documentAccess,
    };

    await db.userPermission.update({
      where: { userId: user.id },
      data: {
        // Only fix core intern permissions — leave approvalAccess,
        // settingsAccess, analyticsAccess, onboardingAccess untouched.
        dashboardAccess:  true,
        attendanceAccess: true,
        taskAccess:       true,
        documentAccess:   true,
      },
    });

    const changes = Object.entries(before)
      .filter(([, v]) => !v)
      .map(([k]) => k)
      .join(", ");

    warn(`FIXED (${changes}): ${label}`);
    totalFixed++;
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 3: Summary
  // ─────────────────────────────────────────────────────────────────
  log("");
  log(`${c.bold}${c.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  log(`${c.bold}  Fix Summary${c.reset}`);
  log(`${c.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  log(`  ${c.green}✓ Fixed  (permissions corrected):${c.reset}   ${totalFixed}`);
  log(`  ${c.green}✓ Created (new permission rows):${c.reset}    ${totalCreated}`);
  log(`  ${c.grey}─ Already OK (no change needed):${c.reset}    ${totalAlreadyOk}`);
  log(`  ${c.yellow}⚠ Skipped (PENDING/REJECTED):${c.reset}      ${totalSkipped}`);
  log(`  ${c.cyan}  Total users processed:${c.reset}            ${internUsers.length}`);
  log(`${c.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);

  if (totalFixed === 0 && totalCreated === 0) {
    log(`\n  ${c.green}${c.bold}All intern permissions are already correctly configured. No changes were needed.${c.reset}\n`);
  } else {
    log(`\n  ${c.green}${c.bold}Done! ${totalFixed + totalCreated} intern account(s) have been repaired.${c.reset}`);
    log(`  ${c.grey}All intern/employee profile data remains untouched.${c.reset}\n`);
  }
}

main()
  .catch((e) => {
    process.stderr.write(`\n${c.red}ERROR: ${e.message}${c.reset}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
