import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "FOUNDER" && role !== "HR") {
      return NextResponse.json({ error: "Only the Founder and HR managers can resolve password reset requests." }, { status: 403 });
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

    // Find the intern profile to locate user
    const intern = await db.intern.findFirst({
      where: { internId: reqRecord.internId },
      include: { user: true }
    });

    if (!intern || !intern.userId) {
      return NextResponse.json({ error: "No matching user found for this intern." }, { status: 404 });
    }

    // HR cannot reset Founder accounts
    if (intern.user?.role === "FOUNDER" && role !== "FOUNDER") {
      return NextResponse.json({ error: "Access Denied. HR cannot resolve password resets for Founder accounts." }, { status: 403 });
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

    // Generate a cryptographically secure temporary password (e.g. AXN-TMP-3F8C4A12)
    const { generateSecureTempPassword } = require("@/lib/tempPassword");
    const tempPassword = generateSecureTempPassword();
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(tempPassword, salt);

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
