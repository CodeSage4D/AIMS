import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * Retrieves all attendance records logged in the system with their linked intern details.
 * Accessible only by Founder, HR, and Admins.
 * GET /api/attendance/all
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

    // Verify administrative status (Founder, HR, Super Admin, Admin)
    const isAdmin =
      userRole === "FOUNDER" ||
      userRole === "SUPER_ADMIN" ||
      userRole === "ADMIN" ||
      userRole === "HR";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. Only administrative roles are permitted to view global attendance." },
        { status: 403 }
      );
    }

    // 2. Fetch all attendance logs ordered by date desc with intern info
    const logs = await db.attendance.findMany({
      orderBy: {
        date: "desc",
      },
      include: {
        intern: {
          select: {
            internId: true,
            fullName: true,
            department: true,
            roleDomain: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        date: log.date.toISOString(),
        status: log.status,
        checkIn: log.checkIn ? log.checkIn.toISOString() : null,
        checkOut: log.checkOut ? log.checkOut.toISOString() : null,
        remarks: log.remarks,
        intern: {
          internId: log.intern.internId,
          fullName: log.intern.fullName,
          department: log.intern.department,
          roleDomain: log.intern.roleDomain,
        },
      })),
    });
  } catch (error: any) {
    console.error("Global Attendance Retrieval Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during attendance retrieval." },
      { status: 500 }
    );
  }
}
