import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

/**
 * GET /api/messages/groups
 * Lists all chat groups that the logged-in user belongs to
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            members: {
              include: {
                user: {
                  select: { id: true, fullName: true, role: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const groups = memberships.map(m => m.group);
    return NextResponse.json(groups);
  } catch (err: any) {
    console.error("Failed to fetch chat groups:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/messages/groups
 * Creates a new official Chat Group. Restricted to Founders, Admins, and HR.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;
    if (!userId || !role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Restriction: Only Founder, Super Admin, Admin, and HR can create groups
    if (role === Role.INTERN || role === Role.TEAM_LEAD) {
      return NextResponse.json({ error: "Forbidden. Interns and Supervisors cannot create official groups." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, description, memberIds } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Check unique group name
    const existingGroup = await db.chatGroup.findUnique({
      where: { name: name.trim() }
    });
    if (existingGroup) {
      return NextResponse.json({ error: "A chat group with this name already exists" }, { status: 400 });
    }

    // Standardize members list to include creator
    const uniqueMemberIds = Array.from(new Set([userId, ...(memberIds || [])]));

    const group = await db.$transaction(async (tx) => {
      // 1. Create group
      const newGroup = await tx.chatGroup.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          createdById: userId
        }
      });

      // 2. Add members
      const memberData = uniqueMemberIds.map(mId => ({
        groupId: newGroup.id,
        userId: mId as string,
        role: mId === userId ? "ADMIN" : "MEMBER"
      }));

      await tx.groupMember.createMany({
        data: memberData
      });

      return newGroup;
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err: any) {
    console.error("Failed to create chat group:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
