import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/diaries -> Fetch all diaries for the logged-in user
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const diaries = await db.diary.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, diaries });
  } catch (error: any) {
    console.error("GET diaries error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// POST /api/diaries -> Create a new diary note
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { title, content } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Missing required parameters: title and content." }, { status: 400 });
    }

    const diary = await db.diary.create({
      data: {
        userId,
        title: title.trim(),
        content: content.trim(),
      },
    });

    return NextResponse.json({ success: true, diary });
  } catch (error: any) {
    console.error("POST diary error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// PATCH /api/diaries -> Edit a diary note
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { id, title, content } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing parameter: id." }, { status: 400 });
    }

    const existing = await db.diary.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Diary note not found." }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. Ownership mismatch." }, { status: 403 });
    }

    const updated = await db.diary.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(content !== undefined ? { content: content.trim() } : {}),
      },
    });

    return NextResponse.json({ success: true, diary: updated });
  } catch (error: any) {
    console.error("PATCH diary error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// DELETE /api/diaries -> Remove a diary note
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing parameter: id." }, { status: 400 });
    }

    const existing = await db.diary.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Diary note not found." }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. Ownership mismatch." }, { status: 403 });
    }

    await db.diary.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Diary note deleted successfully." });
  } catch (error: any) {
    console.error("DELETE diary error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
