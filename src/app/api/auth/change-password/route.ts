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

    const { newPassword } = await request.json();
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
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
