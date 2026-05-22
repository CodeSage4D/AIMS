import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Retrieves the authenticated intern's personal historic daily attendance list.
 * GET /api/attendance/history
 */
export async function GET() {
  try {
    // 1. Session verification
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "INTERN") {
      return NextResponse.json({ error: "Only interns can view personal attendance history." }, { status: 403 });
    }

    // 2. Fetch the linked Intern profile
    const intern = await db.intern.findUnique({
      where: { userId },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
    }

    // 3. Fetch all attendance logs ordered chronologically by descending dates
    const history = await db.attendance.findMany({
      where: {
        internId: intern.id,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      history: history.map((h) => ({
        id: h.id,
        date: h.date.toISOString(),
        status: h.status,
        checkIn: h.checkIn ? h.checkIn.toISOString() : null,
        checkOut: h.checkOut ? h.checkOut.toISOString() : null,
        remarks: h.remarks,
      })),
    });
  } catch (error: any) {
    console.error("Attendance History Retrieval Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during attendance retrieval." },
      { status: 500 }
    );
  }
}
