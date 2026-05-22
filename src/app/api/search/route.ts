import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Global search endpoint
 * GET /api/search?q=query
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json({ interns: [], tasks: [] });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    // Search query definitions
    const containsQuery = { contains: query, mode: "insensitive" as const };

    if (role === "FOUNDER" || role === "HR") {
      // Admin Search: Can search all interns and all tasks
      const interns = await db.intern.findMany({
        where: {
          OR: [
            { fullName: containsQuery },
            { internId: containsQuery },
            { email: containsQuery },
            { roleDomain: containsQuery },
          ],
        },
        select: {
          id: true,
          internId: true,
          fullName: true,
          roleDomain: true,
          status: true,
        },
        take: 5,
      });

      const tasks = await db.task.findMany({
        where: {
          OR: [
            { title: containsQuery },
            { description: containsQuery },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          intern: {
            select: {
              fullName: true,
            },
          },
        },
        take: 5,
      });

      return NextResponse.json({ interns, tasks });
    } else {
      // Intern Search: Can search their own tasks and view active colleagues
      const internRecord = await db.intern.findUnique({
        where: { userId },
      });

      if (!internRecord) {
        return NextResponse.json({ interns: [], tasks: [] });
      }

      const tasks = await db.task.findMany({
        where: {
          internId: internRecord.id,
          OR: [
            { title: containsQuery },
            { description: containsQuery },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
        },
        take: 5,
      });

      // Active colleagues (can search active colleagues for messaging/collaboration)
      const interns = await db.intern.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { fullName: containsQuery },
            { roleDomain: containsQuery },
          ],
        },
        select: {
          id: true,
          fullName: true,
          roleDomain: true,
          status: true,
        },
        take: 5,
      });

      return NextResponse.json({ interns, tasks });
    }
  } catch (error: any) {
    console.error("Global search error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
