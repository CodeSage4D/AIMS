import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import { parseInternNotes, serializeInternNotes } from "@/lib/roles";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch the intern profile
    const intern = await db.intern.findUnique({
      where: { userId },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
    }

    const currentNotes = parseInternNotes(intern.notes);
    currentNotes.onboardingSkipped = true;

    await db.intern.update({
      where: { id: intern.id },
      data: {
        notes: serializeInternNotes(currentNotes),
      },
    });

    // Audit log
    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "ONBOARDING_SKIPPED",
        description: `Enrollee ${intern.fullName} skipped onboarding process to complete later.`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Onboarding Skip Error:", error);
    return NextResponse.json({ error: error.message || "Failed to skip onboarding." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch the intern profile
    const intern = await db.intern.findUnique({
      where: { userId },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
    }

    const currentNotes = parseInternNotes(intern.notes);
    currentNotes.onboardingSkipped = false;

    await db.intern.update({
      where: { id: intern.id },
      data: {
        notes: serializeInternNotes(currentNotes),
      },
    });

    // Audit log
    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "ONBOARDING_RESUMED",
        description: `Enrollee ${intern.fullName} resumed onboarding process setup.`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Onboarding Resume Error:", error);
    return NextResponse.json({ error: error.message || "Failed to resume onboarding." }, { status: 500 });
  }
}
