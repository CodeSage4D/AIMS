import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// helper to authenticate and check roles
async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) {
    return { authenticated: false, status: 401, error: "Unauthorized access. Please log in." };
  }
  const user = session.user as any;
  return { authenticated: true, user };
}

/**
 * GET /api/documents/vault/analytics
 * Provides storage analytics telemetry for the secure vault
 */
export async function GET(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Admin / HR / Super Admin / Founder role gating
    const hasDocAccess = await hasPermission(user.id, user.role, "documentAccess");
    const isAuthorized = hasDocAccess && (user.role !== "INTERN" && user.role !== "EMPLOYEE");

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden. Administrative access is required for vault metrics." }, { status: 403 });
    }

    // Retrieve active secure document metadata
    const activeDocs = await db.secureDocument.findMany({
      where: { deletedAt: null },
      select: { fileSize: true, documentCategory: true, archived: true },
    });

    const totalFiles = activeDocs.length;
    const totalSize = activeDocs.reduce((acc, d) => acc + d.fileSize, 0);
    const archivedCount = activeDocs.filter(d => d.archived).length;

    // Define Auroxon enterprise vault capacity (e.g. 50 GB)
    const ENTERPRISE_CAPACITY_BYTES = 50 * 1024 * 1024 * 1024; // 50 GB
    const capacityPercentage = Number(((totalSize / ENTERPRISE_CAPACITY_BYTES) * 100).toFixed(4));

    // Calculate category distribution counts and sizes
    const categoryMetrics: Record<string, { count: number; bytes: number; percentage: number }> = {};

    activeDocs.forEach((doc) => {
      const cat = doc.documentCategory || "OTHER";
      if (!categoryMetrics[cat]) {
        categoryMetrics[cat] = { count: 0, bytes: 0, percentage: 0 };
      }
      categoryMetrics[cat].count += 1;
      categoryMetrics[cat].bytes += doc.fileSize;
    });

    // Compute percentages
    Object.keys(categoryMetrics).forEach((cat) => {
      const metric = categoryMetrics[cat];
      metric.percentage = totalFiles > 0 ? Number(((metric.count / totalFiles) * 100).toFixed(1)) : 0;
    });

    // Provide detailed recent uploads logs for the admin visualization panel
    const recentUploads = await db.secureDocument.findMany({
      where: { deletedAt: null },
      orderBy: { uploadDate: "desc" },
      take: 5,
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        documentCategory: true,
        uploadDate: true,
        version: true,
      },
    });

    return NextResponse.json({
      totalFiles,
      totalSize,
      archivedCount,
      enterpriseCapacityBytes: ENTERPRISE_CAPACITY_BYTES,
      capacityPercentage,
      categoryMetrics,
      recentUploads,
    }, { status: 200 });

  } catch (err: any) {
    console.error("Vault analytics generation failed:", err);
    return NextResponse.json({ error: "Internal server error during analytics telemetry aggregation." }, { status: 500 });
  }
}
