import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

import { rateLimit } from "@/lib/rateLimit";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "FOUNDER" && role !== "HR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await db.passwordResetRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    console.error("Get reset requests API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching reset requests." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const limiter = rateLimit(ip, 5, 15 * 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { internId, internName, internEmail } = await request.json();

    if (!internId || !internName || !internEmail) {
      return NextResponse.json(
        { error: "All fields (Intern ID, Full Name, Email) are required." },
        { status: 400 }
      );
    }

    const trimmedId = String(internId).trim();
    const trimmedEmail = String(internEmail).trim().toLowerCase();
    const trimmedName = String(internName).trim();

    // 1. Verify that the intern actually exists in the database
    const intern = await db.intern.findFirst({
      where: {
        internId: trimmedId,
        email: trimmedEmail,
      },
    });

    if (!intern) {
      return NextResponse.json(
        { message: "Reset request successfully filed. Please contact the Founder for approval." },
        { status: 200 }
      );
    }

    // 2. Check if a request already exists for this intern in PENDING state
    const existing = await db.passwordResetRequest.findFirst({
      where: {
        internId: trimmedId,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "A password reset request is already pending with the Administrator." },
        { status: 200 }
      );
    }

    // 3. Create the password reset request
    await db.passwordResetRequest.create({
      data: {
        internId: trimmedId,
        internName: trimmedName,
        internEmail: trimmedEmail,
        status: "PENDING",
      },
    });

    // 4. Log this in activity logs
    await db.activityLog.create({
      data: {
        action: "PASSWORD_RESET_REQ",
        description: `Intern ${trimmedName} (${trimmedId}) submitted a password reset request.`,
      },
    });

    return NextResponse.json(
      { message: "Reset request successfully filed. Please contact the Founder for approval." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your request." },
      { status: 500 }
    );
  }
}
