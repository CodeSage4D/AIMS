import { NextResponse } from "next/server";
import { getSimulatedFileBuffer } from "@/lib/gcs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storagePath = searchParams.get("storagePath");
    const bucket = searchParams.get("bucket");

    if (!storagePath || !bucket) {
      return new Response("Missing simulated path parameters.", { status: 400 });
    }

    const buffer = getSimulatedFileBuffer(storagePath, bucket);
    
    // Determine content type based on extension
    const lowerPath = storagePath.toLowerCase();
    let contentType = "application/octet-stream";
    if (lowerPath.endsWith(".pdf")) {
      contentType = "application/pdf";
    } else if (lowerPath.endsWith(".png")) {
      contentType = "image/png";
    } else if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
      contentType = "image/jpeg";
    }

    const fileName = storagePath.split("/").pop() || "downloaded-file";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `inline; filename="${fileName}"`);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Mock GCS retrieve failed:", error);
    return new Response("Simulated vault file not found on local workspace.", { status: 404 });
  }
}
