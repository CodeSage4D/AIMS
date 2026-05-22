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

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const receiverId = searchParams.get("receiverId");

    // Task Comments Flow
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

    // Direct Messages Flow
    if (receiverId) {
      const messages = await db.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId },
            { senderId: receiverId, receiverId: userId }
          ]
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

    // General Channel Messages Flow
    const generalMessages = await db.message.findMany({
      where: {
        receiverId: null,
        taskId: null
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
    const { content, receiverId, taskId } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const message = await db.message.create({
      data: {
        content: content.trim(),
        senderId: userId,
        receiverId: receiverId || null,
        taskId: taskId || null
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
