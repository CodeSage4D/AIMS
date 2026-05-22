import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Handles fetching schedule events, meetings, and deadlines.
 * GET /api/events
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    if (role === "FOUNDER" || role === "HR") {
      // Founders/HR see all events
      const events = await db.event.findMany({
        include: {
          intern: {
            select: { fullName: true, internId: true },
          },
          creator: {
            select: { fullName: true },
          },
        },
        orderBy: { date: "asc" },
      });
      return NextResponse.json(events);
    } else {
      // Interns see events designated for them or "ALL"
      const intern = await db.intern.findUnique({
        where: { userId },
      });

      if (!intern) {
        return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
      }

      const events = await db.event.findMany({
        where: {
          OR: [
            { targetRole: "ALL" },
            { targetRole: "INTERN" },
            { internId: intern.id },
          ],
        },
        include: {
          creator: {
            select: { fullName: true },
          },
        },
        orderBy: { date: "asc" },
      });

      return NextResponse.json(events);
    }
  } catch (error: any) {
    console.error("Fetch Events Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error while fetching events." },
      { status: 500 }
    );
  }
}

/**
 * Handles creating a new event (Founder / HR only).
 * POST /api/events
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    if (role !== "FOUNDER" && role !== "HR") {
      return NextResponse.json({ error: "Only the Founder and HR managers can schedule events." }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, date, type, targetRole, internId } = body;

    if (!title || !date) {
      return NextResponse.json({ error: "Title and date are required." }, { status: 400 });
    }

    const event = await db.event.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        date: new Date(date),
        type: type || "MEETING",
        targetRole: targetRole || "ALL",
        internId: internId || null,
        createdById: userId,
      },
    });

    // Create system activity log
    await db.activityLog.create({
      data: {
        userId,
        action: "EVENT_CREATED",
        description: `Scheduled a new ${event.type}: "${event.title}" on ${new Date(event.date).toLocaleDateString()}`,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error("Create Event Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error while scheduling event." },
      { status: 500 }
    );
  }
}

/**
 * Handles deleting an event (Founder / HR only).
 * DELETE /api/events?id=eventId
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    if (role !== "FOUNDER" && role !== "HR") {
      return NextResponse.json({ error: "Only the Founder and HR managers can delete events." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
    }

    const event = await db.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    await db.event.delete({
      where: { id },
    });

    // Log action
    await db.activityLog.create({
      data: {
        userId,
        action: "EVENT_DELETED",
        description: `Deleted scheduled event: "${event.title}"`,
      },
    });

    return NextResponse.json({ success: true, message: "Event deleted successfully." });
  } catch (error: any) {
    console.error("Delete Event Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error while deleting event." },
      { status: 500 }
    );
  }
}
