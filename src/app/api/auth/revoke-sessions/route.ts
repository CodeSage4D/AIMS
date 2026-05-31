import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Transactionally increment tokenVersion to revoke all active JWT tokens globally
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 },
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          action: "SESSIONS_REVOKED",
          description: `User successfully revoked all active logged-in sessions.`,
        },
      });
    });

    return NextResponse.json(
      { success: true, message: "All active sessions have been successfully revoked." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Revoke sessions API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while revoking sessions." },
      { status: 500 }
    );
  }
}
