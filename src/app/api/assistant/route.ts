import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { queryAiAssistant } from "@/lib/aiService";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const user = session.user as any;
    const { query } = await req.json().catch(() => ({}));

    if (!query || !String(query).trim()) {
      return NextResponse.json({ error: "Missing required query string." }, { status: 400 });
    }

    const result = await queryAiAssistant(user.id, user.role, query);

    return NextResponse.json({
      success: true,
      response: result.response,
      citations: result.citations,
    });
  } catch (error: any) {
    console.error("AI assistant API error:", error);
    return NextResponse.json(
      { error: "Failed to process AI query request." },
      { status: 500 }
    );
  }
}
