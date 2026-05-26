import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/todos -> Fetch all todos for the logged-in user
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // Optional filter by YYYY-MM-DD

    const todos = await db.todo.findMany({
      where: {
        userId,
        ...(date ? { date } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, todos });
  } catch (error: any) {
    console.error("GET todos error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// POST /api/todos -> Create a new todo
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { title, description, date, type } = body;

    if (!title?.trim() || !date?.trim()) {
      return NextResponse.json({ error: "Missing required parameters: title and date." }, { status: 400 });
    }

    const todo = await db.todo.create({
      data: {
        userId,
        title: title.trim(),
        description: description?.trim() || null,
        date: date.trim(),
        type: type || "TODO",
      },
    });

    return NextResponse.json({ success: true, todo });
  } catch (error: any) {
    console.error("POST todo error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// PATCH /api/todos -> Update a todo (e.g. toggle completed, edit text)
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { id, title, description, completed, date, type } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing parameter: id." }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.todo.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Todo not found." }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. Ownership mismatch." }, { status: 403 });
    }

    const updated = await db.todo.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(completed !== undefined ? { completed: Boolean(completed) } : {}),
        ...(date !== undefined ? { date: date.trim() } : {}),
        ...(type !== undefined ? { type } : {}),
      },
    });

    return NextResponse.json({ success: true, todo: updated });
  } catch (error: any) {
    console.error("PATCH todo error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// DELETE /api/todos -> Remove a todo
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

    // Verify ownership
    const existing = await db.todo.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Todo not found." }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. Ownership mismatch." }, { status: 403 });
    }

    await db.todo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Todo deleted successfully." });
  } catch (error: any) {
    console.error("DELETE todo error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
