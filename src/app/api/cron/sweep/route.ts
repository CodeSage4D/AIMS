import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  return handleSweep(req);
}

export async function GET(req: Request) {
  return handleSweep(req);
}

async function handleSweep(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secretParam = searchParams.get("secret");

    const authHeader = req.headers.get("authorization");
    const secretHeader = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const cronSecret = process.env.CRON_SECRET || "AURXON_CRON_SECRET_2026_HARDENED";
    
    // 1. Enforce strict token-based authentication for background scheduled triggers
    if (secretParam !== cronSecret && secretHeader !== cronSecret) {
      return NextResponse.json(
        { error: "Forbidden. Secure background cron authentication token required." },
        { status: 403 }
      );
    }

    // 2. Fetch the configurable retention threshold (default 7 days)
    let retentionDays = 7;
    try {
      const setting = await db.systemSetting.findUnique({
        where: { key: "deleted_retention_days" },
      });
      if (setting && !isNaN(Number(setting.value))) {
        retentionDays = Number(setting.value);
      }
    } catch (e) {
      console.warn("[Cron Sweeper] Error querying deleted_retention_days setting, falling back to 7:", e);
    }

    // 3. Compute expiration threshold timestamp
    const thresholdDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // 4. Retrieve soft-deleted enrollees exceeding the cooling period
    const expiredInterns = await db.intern.findMany({
      where: {
        deletedAt: {
          lte: thresholdDate,
        },
      },
      select: {
        id: true,
        fullName: true,
        internId: true,
        userId: true,
      },
    });

    const purgedCount = expiredInterns.length;

    if (purgedCount > 0) {
      // 5. Transactionally purge all expired records and cascade associations
      await db.$transaction(async (tx) => {
        for (const intern of expiredInterns) {
          if (intern.userId) {
            await tx.user.delete({
              where: { id: intern.userId },
            });
          } else {
            await tx.intern.delete({
              where: { id: intern.id },
            });
          }

          // Register write-only audit sweeper action
          await tx.activityLog.create({
            data: {
              action: "AUTO_PURGE_SOFT_DELETE",
              description: `System auto-sweeper permanently purged soft-deleted record: ${intern.fullName} (ID: ${intern.internId || intern.id}) after exceeding ${retentionDays}-day retention cooling window.`,
            },
          });
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Cron sweeper executed successfully. Permanent cleanups executed: ${purgedCount} enrollees purged.`,
        purgedCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Cron sweeper execution error:", error);
    return NextResponse.json(
      { error: "Internal sweeper database transaction failure." },
      { status: 500 }
    );
  }
}
