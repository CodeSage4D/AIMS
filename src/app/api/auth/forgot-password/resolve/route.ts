import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "FOUNDER" && role !== "HR") {
      return NextResponse.json({ error: "Only the Founder or HR can resolve password reset requests." }, { status: 403 });
    }

    const { requestId, action } = await request.json();
    if (!requestId || !action) {
      return NextResponse.json({ error: "Request ID and action are required." }, { status: 400 });
    }

    const reqRecord = await db.passwordResetRequest.findUnique({
      where: { id: requestId },
    });

    if (!reqRecord) {
      return NextResponse.json({ error: "Reset request not found." }, { status: 404 });
    }

    if (action === "REJECT") {
      await db.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          resolvedAt: new Date(),
        },
      });

      return NextResponse.json({ message: "Password reset request rejected." }, { status: 200 });
    }

    // Generate a beautiful, secure temporary password (e.g. AXN-TEMP-9382)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `AXN-TEMP-${randomNum}`;
    const passwordHash = bcrypt.hashSync(tempPassword, 10);

    // Find the intern profile to locate user
    const intern = await db.intern.findFirst({
      where: { internId: reqRecord.internId },
    });

    if (!intern || !intern.userId) {
      return NextResponse.json({ error: "No matching user found for this intern." }, { status: 404 });
    }

    // Transactionally update the user's password and change requirement, and update reset request
    await db.$transaction([
      db.user.update({
        where: { id: intern.userId },
        data: {
          passwordHash,
          changePasswordRequired: true, // Forces first-login password change!
        },
      }),
      db.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: "RESOLVED",
          tempPassword,
          resolvedAt: new Date(),
        },
      }),
      db.activityLog.create({
        data: {
          userId: (session.user as any).id,
          action: "PASSWORD_RESET_APPROVE",
          description: `Approved password reset for intern ${reqRecord.internName} (${reqRecord.internId}). Temp password generated.`,
        },
      }),
    ]);

    return NextResponse.json({
      message: "Password reset approved successfully.",
      tempPassword,
    }, { status: 200 });
  } catch (error) {
    console.error("Resolve reset request API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while resolving the request." },
      { status: 500 }
    );
  }
}
