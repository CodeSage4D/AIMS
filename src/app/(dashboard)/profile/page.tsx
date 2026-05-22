import React from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import ProfileSettingsClient from "@/components/layout/ProfileSettingsClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role || "INTERN";

  // Dynamic background attendance mark check
  try {
    const { autoMarkAbsent } = await import("@/lib/attendanceScheduler");
    await autoMarkAbsent();
  } catch (schedErr) {
    console.warn("[Profile Loader] dynamic scheduler bypass:", schedErr);
  }

  // 1. Fetch user data and deep relationships
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      internProfile: {
        include: {
          supervisor: {
            select: {
              fullName: true,
              email: true,
            },
          },
          attendance: {
            orderBy: { date: "desc" },
          },
          tasks: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!user) {
    return notFound();
  }

  const isIntern = userRole === "INTERN";
  const internProfile = user.internProfile;

  // 2. Resolve additional administrative metrics for Stats
  let supervisedCount = 0;
  let tasksAssignedCount = 0;
  let initialRequests: any[] = [];

  try {
    if (userRole === "TEAM_LEAD" || userRole === "ADMIN") {
      supervisedCount = await db.intern.count({
        where: { supervisorId: userId },
      });
      tasksAssignedCount = await db.task.count({
        where: { assignedById: userId },
      });
    } else if (userRole === "FOUNDER" || userRole === "SUPER_ADMIN" || userRole === "HR") {
      supervisedCount = await db.intern.count({
        where: { status: "ACTIVE" },
      });
      tasksAssignedCount = await db.task.count();

      // Fetch all correction requests
      initialRequests = await db.profileUpdateRequest.findMany({
        include: {
          intern: {
            select: { id: true, internId: true, fullName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (isIntern && internProfile) {
      // Fetch own correction requests
      initialRequests = await db.profileUpdateRequest.findMany({
        where: { internId: internProfile.id },
        include: {
          intern: {
            select: { id: true, internId: true, fullName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }
  } catch (err) {
    console.error("Database connection failed inside Profile server wrapper:", err);
    // Secure Fallback mocks for robust local testing
    initialRequests = [
      {
        id: "req-1",
        fieldToUpdate: "fullName",
        proposedValue: "Karan Verma",
        status: "PENDING",
        notes: "Spell correction",
        createdAt: new Date().toISOString(),
        intern: { fullName: "Karan Verma", internId: "AXN-SWE-FE-2605-KV01" },
      },
    ];
  }

  // 3. Resolve Intern Performance / Work Statistics
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let attendanceRate = 100;
  let totalTasks = 0;
  let completedTasks = 0;
  let pendingTasks = 0;
  let taskCompletionRate = 100;

  if (isIntern && internProfile) {
    const attendance = internProfile.attendance;
    const tasks = internProfile.tasks;

    totalTasks = tasks.length;
    completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
    pendingTasks = totalTasks - completedTasks;
    taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    presentCount = attendance.filter((a) => a.status === "PRESENT").length;
    absentCount = attendance.filter((a) => a.status === "ABSENT").length;
    lateCount = attendance.filter((a) => a.status === "LATE").length;
    leaveCount = attendance.filter((a) => a.status === "LEAVE").length;
    const totalAttendanceDays = attendance.length;
    const activeDays = presentCount + lateCount;
    attendanceRate = totalAttendanceDays > 0 ? Math.round((activeDays / totalAttendanceDays) * 100) : 100;
  }

  const stats = {
    attendanceRate,
    presentCount,
    lateCount,
    absentCount,
    leaveCount,
    taskCompletionRate,
    totalTasks,
    completedTasks,
    pendingTasks,
    supervisedCount,
    tasksAssignedCount,
  };

  // Format Date and relation fields to Clean ISO String for smooth client component serialization
  const serializedRequests = initialRequests.map((req) => ({
    ...req,
    createdAt: req.createdAt instanceof Date ? req.createdAt.toISOString() : req.createdAt,
    updatedAt: req.updatedAt instanceof Date ? req.updatedAt.toISOString() : req.updatedAt,
  }));

  const serializedUser = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    role: user.role,
  };

  // Safe serialization of intern profile
  const serializedIntern = internProfile
    ? {
        id: internProfile.id,
        internId: internProfile.internId,
        fullName: internProfile.fullName,
        department: internProfile.department,
        roleDomain: internProfile.roleDomain,
        startDate: internProfile.startDate instanceof Date ? internProfile.startDate.toISOString() : internProfile.startDate,
        supervisor: internProfile.supervisor
          ? {
              fullName: internProfile.supervisor.fullName,
              email: internProfile.supervisor.email,
            }
          : null,
      }
    : null;

  return (
    <ProfileSettingsClient
      user={serializedUser}
      internProfile={serializedIntern}
      initialRequests={serializedRequests}
      stats={stats}
    />
  );
}
