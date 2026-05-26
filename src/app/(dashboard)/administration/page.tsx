import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminRoleManager from "@/components/layout/AdminRoleManager";

export const dynamic = "force-dynamic";

export default async function AdministrationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any).role;
  if (userRole !== "FOUNDER" && userRole !== "SUPER_ADMIN" && userRole !== "HR" && userRole !== "ADMIN") {
    redirect("/");
  }

  // Fetch all users for role management
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

  // Fetch all system permissions
  let permissions: any[] = [];
  try {
    permissions = await db.userPermission.findMany({
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
  } catch {}

  // Fetch permission change logs
  let changeLogs: any[] = [];
  try {
    changeLogs = await db.permissionChangeLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        changedBy: { select: { fullName: true, role: true } },
      },
    });
  } catch {}

  // Fetch system settings for role codes
  let roleCodes: Record<string, string> = {};
  try {
    const roleCodesSetting = await db.systemSetting.findUnique({
      where: { key: "role_codes" },
    });
    if (roleCodesSetting) {
      roleCodes = JSON.parse(roleCodesSetting.value);
    }
  } catch {}

  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  const serializedLogs = changeLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <AdminRoleManager
      users={serializedUsers}
      permissions={permissions}
      changeLogs={serializedLogs}
      roleCodes={roleCodes}
      currentUserRole={userRole}
    />
  );
}
