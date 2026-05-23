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
    const userName = session.user.name || "AIMS User";
    const userEmail = session.user.email || "";

    // Fetch or create profile dynamically
    const { getOrCreateInternProfile } = await import("@/lib/safeUser");
    const intern = await getOrCreateInternProfile(userId, userRole, userName, userEmail);

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
