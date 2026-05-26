import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/projects -> Fetch all projects
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // Founders can see all projects. Other roles can see if they are in allowedUsers or if they are admins/HR.
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    let projects;
    if (userRole === "FOUNDER" || userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "HR") {
      projects = await db.project.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Intern / employee: only projects they are assigned to
      projects = await db.project.findMany({
        where: {
          allowedUsers: {
            has: userId,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    console.error("GET projects error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// POST /api/projects -> Create a new project (Founder/Admin only)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "FOUNDER" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access Denied. Founders/Super-Admins only." }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, status, details, allowedUsers } = body;

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Missing required parameters: title and description." }, { status: 400 });
    }

    // Auto-generate project ID like: AXN-PRJ-2605-01
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `AXN-PRJ-${yy}${mm}-`;

    const count = await db.project.count({
      where: {
        projectId: {
          startsWith: prefix,
        },
      },
    });

    const seq = String(count + 1).padStart(2, "0");
    const projectId = `${prefix}${seq}`;

    const project = await db.project.create({
      data: {
        projectId,
        title: title.trim(),
        description: description.trim(),
        status: status || "ACTIVE",
        details: details?.trim() || "",
        allowedUsers: Array.isArray(allowedUsers) ? allowedUsers : [],
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error("POST project error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// PATCH /api/projects -> Update project details & access permissions (Founder/Admin only)
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "FOUNDER" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access Denied. Founders/Super-Admins only." }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, description, status, details, allowedUsers } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing parameter: id." }, { status: 400 });
    }

    const existing = await db.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const updated = await db.project.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(details !== undefined ? { details: details.trim() } : {}),
        ...(allowedUsers !== undefined ? { allowedUsers: Array.isArray(allowedUsers) ? allowedUsers : [] } : {}),
      },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    console.error("PATCH project error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// DELETE /api/projects -> Delete a project (Founder/Admin only)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "FOUNDER" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access Denied. Founders/Super-Admins only." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing parameter: id." }, { status: 400 });
    }

    const existing = await db.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    await db.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Project deleted successfully." });
  } catch (error: any) {
    console.error("DELETE project error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
