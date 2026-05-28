import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/portfolio
 * Retrieves project portfolio records:
 * - Interns: Self project history
 * - Admins/Founders: Scoped by query parameter 'internId'
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "INTERN";

    const { searchParams } = new URL(req.url);
    const queryInternId = searchParams.get("internId");

    let internId = "";

    if (userRole === "INTERN" || userRole === "EMPLOYEE") {
      const intern = await db.intern.findUnique({
        where: { userId }
      });
      if (!intern) {
        return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
      }
      internId = intern.id;
    } else {
      if (!queryInternId) {
        return NextResponse.json({ error: "Missing required query parameter: internId." }, { status: 400 });
      }
      internId = queryInternId;
    }

    const projects = await db.projectRecord.findMany({
      where: { internId },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(projects, { status: 200 });

  } catch (error: any) {
    console.error("GET Portfolio API Error:", error);
    return NextResponse.json({ error: "Failed to retrieve project records." }, { status: 500 });
  }
}

/**
 * POST /api/portfolio
 * Creates a new project portfolio record (Interns only).
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "INTERN";

    if (userRole !== "INTERN" && userRole !== "EMPLOYEE") {
      return NextResponse.json({ error: "Access Denied. Only enrollees can modify portfolios." }, { status: 403 });
    }

    const intern = await db.intern.findUnique({
      where: { userId }
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, description, technologies, roleInProject, documentName, deliverableUrl, status } = body;

    if (!title || !description || !roleInProject) {
      return NextResponse.json({ error: "Validation failed. Missing title, description, or project role." }, { status: 400 });
    }

    const parsedTech = Array.isArray(technologies) 
      ? technologies 
      : typeof technologies === "string" 
      ? technologies.split(",").map(t => t.trim()).filter(Boolean)
      : [];

    const project = await db.projectRecord.create({
      data: {
        internId: intern.id,
        title: title.trim(),
        description: description.trim(),
        technologies: parsedTech,
        roleInProject: roleInProject.trim(),
        documentName: documentName?.trim() || null,
        deliverableUrl: deliverableUrl?.trim() || null,
        status: status || "IN_PROGRESS"
      }
    });

    return NextResponse.json(project, { status: 201 });

  } catch (error: any) {
    console.error("POST Portfolio API Error:", error);
    return NextResponse.json({ error: "Failed to create project record." }, { status: 500 });
  }
}

/**
 * PATCH /api/portfolio
 * Modifies an existing project portfolio record (Interns only).
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "INTERN";

    if (userRole !== "INTERN" && userRole !== "EMPLOYEE") {
      return NextResponse.json({ error: "Access Denied. Only enrollees can modify portfolios." }, { status: 403 });
    }

    const intern = await db.intern.findUnique({
      where: { userId }
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, title, description, technologies, roleInProject, documentName, deliverableUrl, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required parameter: id." }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.projectRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Project record not found." }, { status: 404 });
    }

    if (existing.internId !== intern.id) {
      return NextResponse.json({ error: "Access Denied. Ownership conflict." }, { status: 403 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (roleInProject !== undefined) updateData.roleInProject = roleInProject.trim();
    if (documentName !== undefined) updateData.documentName = documentName.trim() || null;
    if (deliverableUrl !== undefined) updateData.deliverableUrl = deliverableUrl.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (technologies !== undefined) {
      updateData.technologies = Array.isArray(technologies) 
        ? technologies 
        : typeof technologies === "string" 
        ? technologies.split(",").map(t => t.trim()).filter(Boolean)
        : [];
    }

    const updated = await db.projectRecord.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated, { status: 200 });

  } catch (error: any) {
    console.error("PATCH Portfolio API Error:", error);
    return NextResponse.json({ error: "Failed to update project record." }, { status: 500 });
  }
}

/**
 * PUT /api/portfolio
 * Allows Admins/Founders/Team Leads to assign work, review submissions, and add internal summaries.
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "INTERN";

    // Validate permission (must not be INTERN)
    if (userRole === "INTERN" || userRole === "EMPLOYEE") {
      return NextResponse.json({ error: "Access Denied. Administrative access required." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, title, description, technologies, roleInProject, documentName, deliverableUrl, status, reviewNotes, internId } = body;

    // 1. If creating a new assigned project/work deliverable
    if (!id) {
      if (!internId || !title || !roleInProject) {
        return NextResponse.json({ error: "Validation failed. Missing internId, title, or roleInProject." }, { status: 400 });
      }

      const parsedTech = Array.isArray(technologies) 
        ? technologies 
        : typeof technologies === "string" 
        ? technologies.split(",").map(t => t.trim()).filter(Boolean)
        : [];

      const newProject = await db.projectRecord.create({
        data: {
          internId,
          title: title.trim(),
          description: description?.trim() || "",
          technologies: parsedTech,
          roleInProject: roleInProject.trim(),
          documentName: documentName?.trim() || null,
          deliverableUrl: deliverableUrl?.trim() || null,
          status: status || "IN_PROGRESS",
          assignedById: userId,
          reviewNotes: reviewNotes?.trim() || null,
        }
      });

      return NextResponse.json(newProject, { status: 201 });
    }

    // 2. If reviewing/updating an existing project record
    const existing = await db.projectRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Project record not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (roleInProject !== undefined) updateData.roleInProject = roleInProject.trim();
    if (documentName !== undefined) updateData.documentName = documentName.trim() || null;
    if (deliverableUrl !== undefined) updateData.deliverableUrl = deliverableUrl.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes.trim() || null;
    if (technologies !== undefined) {
      updateData.technologies = Array.isArray(technologies) 
        ? technologies 
        : typeof technologies === "string" 
        ? technologies.split(",").map(t => t.trim()).filter(Boolean)
        : [];
    }

    const updated = await db.projectRecord.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated, { status: 200 });

  } catch (error: any) {
    console.error("PUT Portfolio API Error:", error);
    return NextResponse.json({ error: "Failed to process project assignment/review." }, { status: 500 });
  }
}


/**
 * DELETE /api/portfolio
 * Deletes a project record (Interns only).
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "INTERN";

    if (userRole !== "INTERN" && userRole !== "EMPLOYEE") {
      return NextResponse.json({ error: "Access Denied. Only enrollees can modify portfolios." }, { status: 403 });
    }

    const intern = await db.intern.findUnique({
      where: { userId }
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing required query parameter: id." }, { status: 400 });
    }

    const existing = await db.projectRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Project record not found." }, { status: 404 });
    }

    if (existing.internId !== intern.id) {
      return NextResponse.json({ error: "Access Denied. Ownership conflict." }, { status: 403 });
    }

    await db.projectRecord.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Project record deleted successfully." }, { status: 200 });

  } catch (error: any) {
    console.error("DELETE Portfolio API Error:", error);
    return NextResponse.json({ error: "Failed to delete project record." }, { status: 500 });
  }
}
