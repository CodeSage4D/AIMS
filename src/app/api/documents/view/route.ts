import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return new Response("Missing document ID", { status: 400 });
    }

    const document = await db.document.findUnique({
      where: { id },
      include: { intern: true },
    });

    if (!document) {
      return new Response("Document not found", { status: 404 });
    }

    const user = session.user as any;
    const hasDocAccess = await hasPermission(user.id, user.role, "documentAccess");

    if (user.role === "INTERN" || user.role === "EMPLOYEE") {
      if (document.intern.userId !== user.id || !hasDocAccess) {
        return new Response("Forbidden. You do not have permission to view this document.", { status: 403 });
      }
    } else {
      if (!hasDocAccess) {
        return new Response("Forbidden. Administrative document access is required.", { status: 403 });
      }
      if ((user.role === "TEAM_LEAD" || user.role === "ADMIN") && document.intern.supervisorId !== user.id) {
        return new Response("Forbidden. You can only view documents of interns under your direct supervision.", { status: 403 });
      }
    }

    const fileRes = await fetch(document.fileUrl);
    if (!fileRes.ok) {
      return new Response("Failed to retrieve document from secure storage.", { status: 500 });
    }

    const headers = new Headers();
    headers.set("Content-Type", fileRes.headers.get("Content-Type") || "application/octet-stream");
    headers.set("Content-Disposition", `inline; filename="${document.fileName}"`);

    return new Response(fileRes.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("View document API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
