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

    const { newPassword } = await request.json();
    if (!newPassword || !validatePassword(newPassword)) {
      return NextResponse.json(
        { error: "Password must be at least 10 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const passwordHash = bcrypt.hashSync(newPassword, 10);

    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        changePasswordRequired: false,
        tokenVersion: { increment: 1 },
      },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "PASSWORD_CHANGED",
        description: "User successfully updated their password.",
      },
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
