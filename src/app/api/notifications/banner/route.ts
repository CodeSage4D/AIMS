import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInternNotes } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const userId = user.id;
    const userRole = user.role;

    const alerts: any[] = [];

    // ────────────────────────────────────────────────────────────────────────
    // 1. FOUNDER & HR ALERTS
    // ────────────────────────────────────────────────────────────────────────
    if (userRole === "FOUNDER" || userRole === "HR" || userRole === "SUPER_ADMIN") {
      // Alert A: Pending correction requests
      const pendingRequestsCount = await db.profileUpdateRequest.count({
        where: { status: "PENDING" },
      });

      if (pendingRequestsCount > 0) {
        alerts.push({
          id: "pending-requests",
          type: "warning",
          message: `There are ${pendingRequestsCount} pending profile correction requests requiring review.`,
          link: "/profile",
          actionText: "Review Requests",
        });
      }

      // Alert B: Pending verification profiles
      const pendingVerificationCount = await db.intern.count({
        where: { status: "PENDING_VERIFICATION", deletedAt: null },
      });

      if (pendingVerificationCount > 0) {
        alerts.push({
          id: "pending-verification",
          type: "info",
          message: `There are ${pendingVerificationCount} pending executive onboarding profiles requiring Founder approval.`,
          link: "/interns",
          actionText: "Review Profiles",
        });
      }

      // Alert C: Expiring internships/contracts within 7 days
      const today = new Date();
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(today.getDate() + 7);

      const expiringInterns = await db.intern.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          endDate: {
            gte: today,
            lte: sevenDaysLater,
          },
        },
        select: { id: true, fullName: true, endDate: true },
      });

      if (expiringInterns.length > 0) {
        alerts.push({
          id: "expiring-internships-admin",
          type: "danger",
          message: `${expiringInterns.length} enrollees have internships/contracts ending in the next 7 days.`,
          link: "/interns",
          actionText: "Manage Roster",
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. INTERN & EMPLOYEE ALERTS
    // ────────────────────────────────────────────────────────────────────────
    if (userRole === "INTERN" || userRole === "EMPLOYEE") {
      const intern = await db.intern.findUnique({
        where: { userId },
      });

      if (intern) {
        const customFields = parseInternNotes(intern.notes);

        // Alert A: Incomplete Profile Fields
        const incompleteFields: string[] = [];
        if (!intern.address || intern.address === "PENDING") incompleteFields.push("Address");
        if (!intern.pinCode || intern.pinCode === "PENDING") incompleteFields.push("PIN Code");
        if (!intern.bankName) incompleteFields.push("Bank Name");
        if (!intern.accountNumber) incompleteFields.push("Account Number");
        if (!intern.ifscCode) incompleteFields.push("IFSC Code");
        if (!customFields.pictureUrl) incompleteFields.push("Profile Portrait");

        if (incompleteFields.length > 0) {
          alerts.push({
            id: "incomplete-profile",
            type: "warning",
            message: `Your profile file is incomplete. Mandatory missing: ${incompleteFields.slice(0, 3).join(", ")}${incompleteFields.length > 3 ? "..." : ""}.`,
            link: "/profile",
            actionText: "Complete Profile",
          });
        }

        // Alert B: Expiring Internship / Contract
        if (intern.endDate) {
          const today = new Date();
          const sevenDaysLater = new Date();
          sevenDaysLater.setDate(today.getDate() + 7);
          const end = new Date(intern.endDate);

          if (end >= today && end <= sevenDaysLater) {
            alerts.push({
              id: "expiring-internship-user",
              type: "danger",
              message: `Your tenure at AURXON is scheduled to conclude on ${end.toLocaleDateString()}. Please coordinate transition documents.`,
              link: "/documents",
              actionText: "Access Vault",
            });
          }
        }

        // Alert C: Incomplete Onboarding Stage
        if (intern.status === "ONBOARDING") {
          alerts.push({
            id: "pending-onboarding",
            type: "info",
            message: "Your initial corporate onboarding is in progress. Please review pending offer drafts.",
            link: "/",
            actionText: "View Onboarding",
          });
        }
      }
    }

    return NextResponse.json(alerts, { status: 200 });
  } catch (error: any) {
    console.error("Error in banner notifications API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
