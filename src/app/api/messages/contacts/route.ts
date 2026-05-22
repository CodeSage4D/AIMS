import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch all admins / supervisors (User accounts)
    const admins = await db.user.findMany({
      where: {
        role: { in: ["FOUNDER", "SUPER_ADMIN", "ADMIN", "HR", "TEAM_LEAD"] },
        NOT: { id: userId }
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        email: true
      }
    });

    // 2. Fetch all active interns with linked User accounts
    const interns = await db.intern.findMany({
      where: {
        status: "ACTIVE",
        userId: { not: null },
        NOT: { userId: userId }
      },
      select: {
        userId: true,
        fullName: true,
        roleDomain: true,
        email: true
      }
    });

    // Map interns to a unified contacts list format
    const internContacts = interns.map(i => ({
      id: i.userId as string,
      fullName: i.fullName,
      role: "INTERN",
      email: i.email,
      roleDomain: i.roleDomain
    }));

    return NextResponse.json([...admins, ...internContacts]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
