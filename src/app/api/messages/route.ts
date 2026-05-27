import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const receiverId = searchParams.get("receiverId");
    const groupId = searchParams.get("groupId");

    // 1. Task Comments Flow
    if (taskId) {
      const messages = await db.message.findMany({
        where: { taskId },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, fullName: true, role: true }
          }
        }
      });
      return NextResponse.json(messages);
    }

    // 2. Group Chat Messages Flow (Isolated and Protected)
    if (groupId) {
      const member = await db.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId
          }
        }
      });
      if (!member) {
        return NextResponse.json({ error: "Forbidden. You are not a member of this chat group." }, { status: 403 });
      }

      const messages = await db.message.findMany({
        where: { groupId },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, fullName: true, role: true }
          }
        }
      });

      return NextResponse.json(messages);
    }

    // 3. Direct Messages Flow (Isolated and Protected)
    if (receiverId) {
      const messages = await db.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId },
            { senderId: receiverId, receiverId: userId }
          ],
          groupId: null,
          taskId: null
        },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, fullName: true, role: true }
          }
        }
      });

      // Mark fetched messages sent to us as read
      await db.message.updateMany({
        where: {
          senderId: receiverId,
          receiverId: userId,
          isRead: false
        },
        data: { isRead: true }
      });

      return NextResponse.json(messages);
    }

    // 4. General Channel Messages Flow (Announcements Board)
    const generalMessages = await db.message.findMany({
      where: {
        receiverId: null,
        taskId: null,
        groupId: null
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true }
        }
      }
    });

    return NextResponse.json(generalMessages);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, receiverId, taskId, groupId } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // 1. Announcements General Board Lock
    if (!receiverId && !taskId && !groupId) {
      const userRole = (session?.user as any)?.role;
      if (userRole === "INTERN" || userRole === "TEAM_LEAD") {
        return NextResponse.json({ error: "Forbidden. Only Founders and Admins can publish announcements to the General Board." }, { status: 403 });
      }
    }

    // 2. Private Group Membership Verification Lock
    if (groupId) {
      const member = await db.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId
          }
        }
      });
      if (!member) {
        return NextResponse.json({ error: "Forbidden. You are not a member of this chat group." }, { status: 403 });
      }
    }

    const message = await db.message.create({
      data: {
        content: content.trim(),
        senderId: userId,
        receiverId: receiverId || null,
        taskId: taskId || null,
        groupId: groupId || null
      },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true }
        }
      }
    });

    return NextResponse.json(message);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
