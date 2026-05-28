import React from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import ProfileSettingsClient from "@/components/layout/ProfileSettingsClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let session: any = null;
  try {
    session = await auth();
  } catch (authErr) {
    console.error("[Profile] Auth error:", authErr);
    redirect("/login");
  }

  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role || "INTERN";

  // Background attendance check — never crash the page
  try {
    const { autoMarkAbsent } = await import("@/lib/attendanceScheduler");
    await autoMarkAbsent();
  } catch (schedErr) {
    // Silently bypass — non-critical
  }

  // ── Fetch User + Intern Profile ──────────────────────────────────────────
  let user: any = null;
  try {
    user = await db.user.findUnique({
      where: { id: userId },
      include: {
        internProfile: {
          include: {
            supervisor: {
              select: { fullName: true, email: true },
            },
            attendance: { orderBy: { date: "desc" }, take: 200 },
            tasks: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });
  } catch (dbErr) {
    console.error("[Profile] DB fetch error:", dbErr);
    // Return minimal profile with session data so the page always renders
    user = null;
  }

  // If user not found in DB (stale session after DB recovery), show minimal profile
  const isStaleSession = !user;

  const isIntern = userRole === "INTERN" || userRole === "EMPLOYEE";
  const internProfile = user?.internProfile || null;

  // ── Stats ────────────────────────────────────────────────────────────────
  let supervisedCount = 0;
  let tasksAssignedCount = 0;
  let initialRequests: any[] = [];

  if (!isStaleSession) {
    try {
      if (userRole === "TEAM_LEAD" || userRole === "ADMIN") {
        supervisedCount = await db.intern.count({ where: { supervisorId: userId } });
        tasksAssignedCount = await db.task.count({ where: { assignedById: userId } });
      } else if (userRole === "FOUNDER" || userRole === "SUPER_ADMIN" || userRole === "HR") {
        supervisedCount = await db.intern.count({ where: { status: "ACTIVE" } });
        tasksAssignedCount = await db.task.count();
        initialRequests = await db.profileUpdateRequest.findMany({
          include: { intern: { select: { id: true, internId: true, fullName: true } } },
          orderBy: { createdAt: "desc" },
        });
      }

      if (isIntern && internProfile) {
        initialRequests = await db.profileUpdateRequest.findMany({
          where: { internId: internProfile.id },
          include: { intern: { select: { id: true, internId: true, fullName: true } } },
          orderBy: { createdAt: "desc" },
        });
      }
    } catch (statsErr) {
      console.warn("[Profile] Stats fetch error:", statsErr);
      initialRequests = [];
    }
  }

  // ── Attendance & Task Stats ──────────────────────────────────────────────
  let presentCount = 0, absentCount = 0, lateCount = 0, leaveCount = 0;
  let attendanceRate = 100, totalTasks = 0, completedTasks = 0;
  let pendingTasks = 0, taskCompletionRate = 100;

  if (isIntern && internProfile) {
    const attendance = internProfile.attendance || [];
    const tasks = internProfile.tasks || [];
    totalTasks = tasks.length;
    completedTasks = tasks.filter((t: any) => t.status === "COMPLETED").length;
    pendingTasks = totalTasks - completedTasks;
    taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
    presentCount = attendance.filter((a: any) => a.status === "PRESENT").length;
    absentCount = attendance.filter((a: any) => a.status === "ABSENT").length;
    lateCount = attendance.filter((a: any) => a.status === "LATE").length;
    leaveCount = attendance.filter((a: any) => a.status === "LEAVE").length;
    const totalDays = attendance.length;
    attendanceRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;
  }

  const stats = {
    attendanceRate, presentCount, lateCount, absentCount, leaveCount,
    taskCompletionRate, totalTasks, completedTasks, pendingTasks,
    supervisedCount, tasksAssignedCount,
  };

  // ── Serialize requests ───────────────────────────────────────────────────
  const serializedRequests = initialRequests.map((req: any) => ({
    ...req,
    createdAt: req.createdAt instanceof Date ? req.createdAt.toISOString() : req.createdAt,
    updatedAt: req.updatedAt instanceof Date ? req.updatedAt.toISOString() : req.updatedAt,
  }));

  // ── Bank update setting ──────────────────────────────────────────────────
  let allowBankUpdates = false;
  try {
    const bankSetting = await db.systemSetting.findUnique({ where: { key: "allow_intern_bank_updates" } });
    if (bankSetting) {
      const parsed = JSON.parse(bankSetting.value);
      allowBankUpdates = typeof parsed === "object" && parsed !== null ? (parsed.allowed || false) : !!parsed;
    }
  } catch {}

  // ── Picture URL resolution ───────────────────────────────────────────────
  let resolvedPictureUrl: string | null = null;
  try {
    const { parseInternNotes } = await import("@/lib/roles");
    if (internProfile?.notes) {
      const customFields = parseInternNotes(internProfile.notes);
      resolvedPictureUrl = (customFields as any).pictureUrl || null;
    } else if (user?.notes) {
      const userNotes = parseInternNotes(user.notes);
      resolvedPictureUrl = (userNotes as any).pictureUrl || null;
    }
  } catch {}

  // ── Build serialized user ────────────────────────────────────────────────
  // Always render — even if DB failed, use session data as fallback
  const serializedUser = {
    id: userId,
    fullName: user?.fullName || (session.user as any).name || "AIMS User",
    email: user?.email || session.user.email || "",
    username: user?.username || null,
    role: userRole,
    pictureUrl: resolvedPictureUrl,
    employeeId: null,
  };

  // ── Serialize intern profile ─────────────────────────────────────────────
  const serializedIntern = internProfile
    ? {
        id: internProfile.id,
        internId: internProfile.internId,
        fullName: internProfile.fullName,
        department: internProfile.department,
        roleDomain: internProfile.roleDomain,
        startDate:
          internProfile.startDate instanceof Date
            ? internProfile.startDate.toISOString()
            : internProfile.startDate,
        pinCode: internProfile.pinCode,
        citizenship: internProfile.citizenship,
        region: internProfile.region,
        bankName: internProfile.bankName,
        accountNumber: internProfile.accountNumber,
        ifscCode: internProfile.ifscCode,
        upiId: internProfile.upiId,
        branchName: internProfile.branchName,
        panCard: internProfile.panCard,
        notes: internProfile.notes,
        supervisor: internProfile.supervisor
          ? { fullName: internProfile.supervisor.fullName, email: internProfile.supervisor.email }
          : null,
      }
    : null;

  // ── Fetch All Active Interns for Peer Card Selection (Intern role only) ──
  let allActiveInterns: any[] = [];
  try {
    allActiveInterns = await db.intern.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        internId: true,
        fullName: true,
        department: true,
        roleDomain: true,
        notes: true,
        employmentType: true,
      },
      orderBy: {
        fullName: "asc",
      },
    });
  } catch (err) {
    console.error("[Profile] Failed to fetch active interns:", err);
  }

  return (
    <ProfileSettingsClient
      user={serializedUser}
      internProfile={serializedIntern}
      initialRequests={serializedRequests}
      stats={stats}
      allowBankUpdates={allowBankUpdates}
      allActiveInterns={allActiveInterns}
    />
  );
}
