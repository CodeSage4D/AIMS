import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email, recoveryKey } = await req.json();

    if (!email || !recoveryKey) {
      return NextResponse.json(
        { error: "Email and recovery key are required." },
        { status: 400 }
      );
    }

    const envRecoveryKey = process.env.FOUNDER_RECOVERY_KEY;
    if (!envRecoveryKey || recoveryKey !== envRecoveryKey) {
      return NextResponse.json(
        { error: "Invalid founder recovery credentials." },
        { status: 401 }
      );
    }

    // Lookup user in DB
    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found matching this corporate email." },
        { status: 404 }
      );
    }

    if (user.role !== "FOUNDER") {
      return NextResponse.json(
        { error: "Access Denied: Account is not designated as Founder." },
        { status: 403 }
      );
    }

    // Generate secure randomized temporary password
    const rawTempPassword = `AXN-REC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(rawTempPassword, salt);

    // Transactionally update user credentials and log the action
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          changePasswordRequired: true,
          status: "APPROVED", // Auto-approved if somehow pending/rejected
        },
      });

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "FOUNDER_RECOVERY",
          description: "Founder emergency recovery key verified. Regenerated temporary access credentials under account rescue scenario.",
        },
      });
    });

    return NextResponse.json({
      message: "Founder recovery authenticated successfully.",
      tempPassword: rawTempPassword,
    });
  } catch (error: any) {
    console.error("Founder Recovery Error:", error);
    return NextResponse.json(
      { error: "Internal authentication server failure." },
      { status: 500 }
    );
  }
}
