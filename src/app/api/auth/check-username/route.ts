import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { rateLimit } from "@/lib/rateLimit";

/**
 * GET /api/auth/check-username?username=...
 * Real-time username check and suggestions endpoint.
 */
export async function GET(req: Request) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    
    const isLocal = ip === "127.0.0.1" || 
                    ip === "::1" || 
                    ip === "localhost" || 
                    ip.startsWith("::ffff:127.0.0.1") ||
                    ip.startsWith("192.168.") ||
                    ip.startsWith("10.") ||
                    ip.startsWith("172.16.") ||
                    ip.startsWith("172.17.") ||
                    ip.startsWith("172.18.") ||
                    ip.startsWith("172.19.") ||
                    ip.startsWith("172.2") ||
                    ip.startsWith("172.30.") ||
                    ip.startsWith("172.31.") ||
                    process.env.NODE_ENV === "development" ||
                    process.env.NODE_ENV === "test";

    const limit = isLocal ? 1000 : 120;
    const limiter = rateLimit(ip, limit, 60 * 1000); // 1 minute window
    if (!limiter.success) {
      return NextResponse.json(
        { available: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

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
    const prefixes = ["iam", "the", "its", "real", "official", "hello", "ask"];
    const suffixes = ["official", "real", "dev", "axn", "hub", "design", "tech", "code"];
    const year = new Date().getFullYear();

    const candidates = [
      `${cleanUsername}_${suffixes[0]}`,
      `${cleanUsername}_${suffixes[1]}`,
      `${cleanUsername}_${suffixes[2]}`,
      `${cleanUsername}_${suffixes[3]}`,
      `${prefixes[0]}_${cleanUsername}`,
      `${prefixes[1]}_${cleanUsername}`,
      `${prefixes[2]}_${cleanUsername}`,
      `${prefixes[3]}_${cleanUsername}`,
      `${cleanUsername}${year}`,
      `${cleanUsername}_${year}`,
      `${cleanUsername}26`,
      `${cleanUsername}_26`,
      `${cleanUsername}${Math.floor(100 + Math.random() * 900)}`,
      `${prefixes[0]}_${cleanUsername}_${suffixes[0]}`,
      `${prefixes[1]}_${cleanUsername}_${suffixes[2]}`
    ];

    for (const candidate of candidates) {
      if (suggestions.length >= 3) break;

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
