import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Handles fetching list of holidays.
 * GET /api/holidays
 */
export async function GET() {
  try {
    const holidays = await db.holiday.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json(holidays);
  } catch (error: any) {
    console.error("Fetch Holidays Error:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching holidays." },
      { status: 500 }
    );
  }
}

/**
 * Handles creating a holiday (Founder / HR only).
 * POST /api/holidays
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
      return NextResponse.json({ error: "Only the Founder and HR managers can add holidays." }, { status: 403 });
    }

    const { title, date } = await req.json();

    if (!title || !date) {
      return NextResponse.json({ error: "Title and date are required." }, { status: 400 });
    }

    const holidayDate = new Date(date);
    // Ensure uniqueness
    const existing = await db.holiday.findUnique({
      where: { date: holidayDate },
    });

    if (existing) {
      return NextResponse.json({ error: "A holiday is already scheduled on this date." }, { status: 400 });
    }

    const holiday = await db.holiday.create({
      data: {
        title: String(title).trim(),
        date: holidayDate,
        isCustom: true,
      },
    });

    // Audit log
    await db.activityLog.create({
      data: {
        userId,
        action: "HOLIDAY_CREATED",
        description: `Added custom holiday: "${holiday.title}" on ${holidayDate.toLocaleDateString()}`,
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error: any) {
    console.error("Create Holiday Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error while creating holiday." },
      { status: 500 }
    );
  }
}

/**
 * Handles deleting a holiday (Founder / HR only).
 * DELETE /api/holidays?id=holidayId
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
      return NextResponse.json({ error: "Only the Founder and HR managers can delete holidays." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Holiday ID is required." }, { status: 400 });
    }

    const holiday = await db.holiday.findUnique({
      where: { id },
    });

    if (!holiday) {
      return NextResponse.json({ error: "Holiday not found." }, { status: 404 });
    }

    await db.holiday.delete({
      where: { id },
    });

    // Audit log
    await db.activityLog.create({
      data: {
        userId,
        action: "HOLIDAY_DELETED",
        description: `Deleted holiday: "${holiday.title}"`,
      },
    });

    return NextResponse.json({ success: true, message: "Holiday deleted successfully." });
  } catch (error: any) {
    console.error("Delete Holiday Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error while deleting holiday." },
      { status: 500 }
    );
  }
}
