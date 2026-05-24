import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";

/**
 * GET /api/settings
 * Retrieves system settings block for workspace enrollees.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const settings = await db.systemSetting.findMany();
    return NextResponse.json(settings, { status: 200 });
  } catch (error: any) {
    console.error("GET Settings API Error:", error);
    return NextResponse.json({ error: "Internal database retrieval error." }, { status: 500 });
  }
}

/**
 * PATCH /api/settings
 * Updates/Upserts a particular system setting (Founder and HR only).
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "FOUNDER" && userRole !== "HR" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access Denied. Insufficient administrative privileges." }, { status: 403 });
    }

    const { key, value } = await req.json().catch(() => ({}));

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Validation failed. Missing setting key or value." }, { status: 400 });
    }

    // Restrict key names to secure fields only
    const permittedKeys = ["allow_intern_bank_updates", "enable_welcome_announcements"];
    if (!permittedKeys.includes(key)) {
      return NextResponse.json({ error: `Rejected: Key '${key}' is not an authorized system setting.` }, { status: 400 });
    }

    const safeUserId = await getSafeUserId(userId);

    const setting = await db.$transaction(async (tx) => {
      const record = await tx.systemSetting.upsert({
        where: { key },
        update: {
          value: JSON.stringify(value),
          updatedById: safeUserId,
        },
        create: {
          key,
          value: JSON.stringify(value),
          updatedById: safeUserId,
        },
      });

      // Audit Log
      await tx.activityLog.create({
        data: {
          userId: safeUserId,
          action: "UPDATE_SYSTEM_SETTING",
          description: `Updated system setting [${key}] to value: ${JSON.stringify(value)}`,
        },
      });

      return record;
    });

    return NextResponse.json({ success: true, setting }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH Settings API Error:", error);
    return NextResponse.json({ error: "Failed to update system setting." }, { status: 500 });
  }
}
