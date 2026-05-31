import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/passwordValidator";

export async function POST(req: Request) {
  try {
    const { email, recoveryToken, newPassword } = await req.json();

    if (!email || !recoveryToken || !newPassword) {
      return NextResponse.json(
        { error: "Email, recovery token, and new password are required." },
        { status: 400 }
      );
    }

    // 1. Validate the secret Founder Recovery token from the environment configuration
    const envToken = process.env.FOUNDER_RECOVERY_TOKEN;
    if (!envToken || envToken.length < 16) {
      return NextResponse.json(
        { error: "Founder emergency recovery is not configured on the server." },
        { status: 501 }
      );
    }

    if (recoveryToken !== envToken) {
      // Return a generic error to prevent brute-forcing information leakage
      return NextResponse.json(
        { error: "Invalid credentials or recovery token." },
        { status: 401 }
      );
    }

    // 2. Validate password strength
    if (!validatePassword(newPassword)) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." },
        { status: 400 }
      );
    }

    // 3. Retrieve the Founder account
    const founderUser = await db.user.findFirst({
      where: {
        email: { equals: email.trim(), mode: "insensitive" },
        role: "FOUNDER",
        deletedAt: null,
      },
    });

    if (!founderUser) {
      return NextResponse.json(
        { error: "Invalid credentials or recovery token." },
        { status: 401 }
      );
    }

    // 4. Check password history to prevent reuse
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    const recentHashes = await db.passwordHistory.findMany({
      where: { userId: founderUser.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    const isReused = recentHashes.some((ph) =>
      bcrypt.compareSync(newPassword, ph.passwordHash)
    );

    if (isReused) {
      return NextResponse.json(
        { error: "Security Violation: Password matches one of your last 3 passwords." },
        { status: 400 }
      );
    }

    // 5. Transactionally update password, add password history, and log emergency recovery
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: founderUser.id },
        data: {
          passwordHash,
          changePasswordRequired: false,
          passwordUpdatedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
          tokenVersion: { increment: 1 }, // Terminate all existing sessions!
        },
      });

      await tx.passwordHistory.create({
        data: {
          userId: founderUser.id,
          passwordHash,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: founderUser.id,
          action: "FOUNDER_EMERGENCY_RECOVERY",
          description: `EMERGENCY ACTION: Founder successfully recovered account access and reset credentials using environment recovery token.`,
        },
      });
    });

    return NextResponse.json(
      { success: true, message: "Founder emergency recovery executed successfully. All existing sessions revoked." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Founder recovery API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during emergency recovery." },
      { status: 500 }
    );
  }
}
