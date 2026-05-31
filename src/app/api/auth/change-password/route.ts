import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

import { validatePassword } from "@/lib/passwordValidator";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newPassword, skipTokenInvalidation } = await request.json();
    if (!newPassword || !validatePassword(newPassword)) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    // 1. Fetch the last 3 password hashes from history to prevent reuse
    const recentHashes = await db.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    const isReused = recentHashes.some((ph) =>
      bcrypt.compareSync(newPassword, ph.passwordHash)
    );

    if (isReused) {
      return NextResponse.json(
        { error: "Security Violation: Password matches one of your last 3 passwords. Please choose a fresh credentials password." },
        { status: 400 }
      );
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);

    const updateData: any = {
      passwordHash,
      changePasswordRequired: false,
      passwordUpdatedAt: new Date(),
    };

    if (!skipTokenInvalidation) {
      updateData.tokenVersion = { increment: 1 };
    }

    // 2. Transactionally update user, insert history record, and record audit log
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      await tx.passwordHistory.create({
        data: {
          userId,
          passwordHash,
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          action: "PASSWORD_CHANGED",
          description: "User successfully updated their password and registered a fresh history hash.",
        },
      });
    });

    return NextResponse.json({ message: "Password updated successfully." }, { status: 200 });
  } catch (error) {
    console.error("Change password API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating your password." },
      { status: 500 }
    );
  }
}
