import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/auth/check-username?username=...
 * Real-time username check and suggestions endpoint.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUsername = searchParams.get("username");

    if (!rawUsername) {
      return NextResponse.json({ available: false, error: "Username is required." }, { status: 400 });
    }

    const cleanUsername = rawUsername.trim().toLowerCase();

    // 1. Strict format check: Alphanumeric, hyphens, underscores only. No spaces or special characters!
    const usernameRegex = /^[a-z0-9_-]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      return NextResponse.json({
        available: false,
        valid: false,
        error: "Username must contain only lowercase letters, numbers, hyphens (-), and underscores (_)."
      }, { status: 200 });
    }

    // 2. Check if username is already taken in the database
    const existingUser = await db.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: "insensitive"
        }
      }
    });

    if (!existingUser) {
      return NextResponse.json({ available: true, valid: true });
    }

    // 3. Username is taken. Automatically compute 3 available alternatives based on input
    const suggestions: string[] = [];

    // Suggestions recipes
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const dateSuffix = `${day}${month}`; // e.g. 2605

    const candidates = [
      `${cleanUsername}_axn`,
      `${cleanUsername}${dateSuffix}`,
      `${cleanUsername}_ped`,
      `${cleanUsername}_swe`,
      `${cleanUsername}${Math.floor(100 + Math.random() * 900)}`
    ];

    for (const candidate of candidates) {
      if (suggestions.length >= 3) break;

      // Check if candidate is taken
      const isTaken = await db.user.findFirst({
        where: {
          username: {
            equals: candidate,
            mode: "insensitive"
          }
        }
      });

      if (!isTaken && !suggestions.includes(candidate)) {
        suggestions.push(candidate);
      }
    }

    // Fallback in case candidates are somehow all taken
    let counter = 1;
    while (suggestions.length < 3) {
      const fallbackCandidate = `${cleanUsername}${counter}`;
      const isTaken = await db.user.findFirst({
        where: {
          username: {
            equals: fallbackCandidate,
            mode: "insensitive"
          }
        }
      });
      if (!isTaken && !suggestions.includes(fallbackCandidate)) {
        suggestions.push(fallbackCandidate);
      }
      counter++;
    }

    return NextResponse.json({
      available: false,
      valid: true,
      suggestions,
      error: `Username "${cleanUsername}" is already taken.`
    }, { status: 200 });

  } catch (error: any) {
    console.error("Check Username API Error:", error);
    return NextResponse.json({ available: false, error: "Internal server error." }, { status: 500 });
  }
}
