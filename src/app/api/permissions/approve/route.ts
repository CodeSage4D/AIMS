import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, InternStatus, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getSafeUserId } from "@/lib/safeUser";

async function getAdminUser() {
  const session = await auth();
  if (!session?.user) {
    return { authenticated: false, status: 401, error: "Unauthorized access. Please log in." };
  }
  const user = session.user as any;
  const { hasPermission } = await import("@/lib/permissions");
  
  // Requires onboardingAccess or settingsAccess permissions
  const hasOnboardingAccess = await hasPermission(user.id, user.role, "onboardingAccess");
  const hasSettingsAccess = await hasPermission(user.id, user.role, "settingsAccess");

  if (!hasOnboardingAccess && !hasSettingsAccess) {
    return { authenticated: false, status: 403, error: "Forbidden. Onboarding settings privileges required." };
  }
  return { authenticated: true, user };
}

export async function POST(req: Request) {
  try {
    const authResult = await getAdminUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user: currentUser } = authResult;

    const { userId, role, internId, status } = await req.json();

    if (!userId || !status) {
      return NextResponse.json({ error: "Missing required fields: userId, status." }, { status: 400 });
    }

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "Invalid status selection." }, { status: 400 });
    }

    // Retrieve target user
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: { internProfile: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    if (targetUser.status !== "PENDING") {
      return NextResponse.json({ error: "Only accounts in PENDING state can be approved or rejected." }, { status: 400 });
    }

    // Role validation
    const targetRole = (role as Role) || Role.INTERN;
    if (targetRole === Role.FOUNDER) {
      return NextResponse.json({ error: "Forbidden. Cannot designate another user as Founder." }, { status: 403 });
    }
    if (targetRole === Role.SUPER_ADMIN && currentUser.role !== Role.FOUNDER) {
      return NextResponse.json({ error: "Forbidden. Only the Founder can promote to Super Admin." }, { status: 403 });
    }

    if (status === "APPROVED") {
      if (!internId?.trim()) {
        return NextResponse.json({ error: "Official Intern/Employee ID is required for approval." }, { status: 400 });
      }

      // Check if official internId already exists
      const existingIntern = await db.intern.findUnique({
        where: { internId: internId.trim().toUpperCase() },
      });
      if (existingIntern && existingIntern.userId !== targetUser.id) {
        return NextResponse.json({ error: "This official Intern/Employee ID is already in use." }, { status: 400 });
      }

      // Generate a strong, random temporary password
      const rawTempPassword = `AXN-TMP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(rawTempPassword, salt);

      await db.$transaction(async (tx) => {
        // Update user status and credentials
        await tx.user.update({
          where: { id: userId },
          data: {
            status: "APPROVED" as UserStatus,
            role: targetRole,
            passwordHash,
            changePasswordRequired: true,
          },
        });

        // Update Intern profile
        if (targetUser.internProfile) {
          const updatedIntern = await tx.intern.update({
            where: { id: targetUser.internProfile.id },
            data: {
              internId: internId.trim().toUpperCase(),
              status: "ONBOARDING" as InternStatus,
            },
          });

          // Re-generate dynamic onboarding document drafts matching permanent sequential ID
          const { generateOfferLetterDraft, generateNDADraft, generateIDCardDraft, generateAgreementDraft } = await import("@/lib/documentTemplates");
          const offerLetterContent = generateOfferLetterDraft(updatedIntern);
          const ndaContent = generateNDADraft(updatedIntern);
          const agreementContent = generateAgreementDraft(updatedIntern);
          const idCardContent = generateIDCardDraft(updatedIntern);

          // Remove previous drafts if any
          await tx.generatedDocument.deleteMany({
            where: { internId: updatedIntern.id }
          });

          // Insert fresh, corrected drafts
          await tx.generatedDocument.createMany({
            data: [
              {
                internId: updatedIntern.id,
                type: "OFFER_LETTER",
                content: offerLetterContent as any,
                status: "PENDING",
              },
              {
                internId: updatedIntern.id,
                type: "NDA",
                content: ndaContent as any,
                status: "PENDING",
              },
              {
                internId: updatedIntern.id,
                type: "AGREEMENT",
                content: agreementContent as any,
                status: "PENDING",
              },
              {
                internId: updatedIntern.id,
                type: "ID_CARD",
                content: idCardContent as any,
                status: "PENDING",
              },
            ]
          });
        }

        // Create default user permissions
        const defaultPerms = {
          dashboardAccess: true,
          attendanceAccess: true,
          taskAccess: true,
          documentAccess: true,
          approvalAccess: targetRole === Role.SUPER_ADMIN || targetRole === Role.HR,
          settingsAccess: targetRole === Role.SUPER_ADMIN,
          analyticsAccess: targetRole !== Role.INTERN,
          onboardingAccess: targetRole === Role.SUPER_ADMIN || targetRole === Role.HR,
        };

        await tx.userPermission.upsert({
          where: { userId },
          update: defaultPerms,
          create: {
            userId,
            ...defaultPerms,
          },
        });

        // Permission log
        await tx.permissionChangeLog.create({
          data: {
            changedById: currentUser.id,
            targetId: userId,
            previousRole: "INTERN",
            newRole: targetRole,
            details: `Approved enrollment request. Assigned official ID: ${internId.trim().toUpperCase()}`,
          },
        });

        // Activity Log
        await tx.activityLog.create({
          data: {
            userId: await getSafeUserId(currentUser.id, tx),
            action: "APPROVE_REGISTRATION",
            description: `Approved enrollment registration for user ${targetUser.fullName}. Assigned official ID: ${internId.trim().toUpperCase()}, Role: ${targetRole}.`,
          },
        });

        // Email Log Simulation
        await tx.emailLog.create({
          data: {
            recipient: targetUser.email,
            subject: "AURXON AIMS - Account Active & Onboarding Access Instructions",
            template: "ONBOARDING_WELCOME",
            status: "SENT",
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Enrollment approved and activated successfully. Welcome email event logged.",
        tempPassword: rawTempPassword,
      });

    } else {
      // REJECTED Flow
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            status: "REJECTED" as UserStatus,
          },
        });

        if (targetUser.internProfile) {
          await tx.intern.update({
            where: { id: targetUser.internProfile.id },
            data: {
              status: "TERMINATED" as InternStatus,
            },
          });
        }

        await tx.activityLog.create({
          data: {
            userId: await getSafeUserId(currentUser.id, tx),
            action: "REJECT_REGISTRATION",
            description: `Rejected enrollment registration for user ${targetUser.fullName}.`,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Enrollment request has been rejected.",
      });
    }

  } catch (error: any) {
    console.error("Verification Activation Error:", error);
    return NextResponse.json({ error: "Internal database verification transactional failure." }, { status: 500 });
  }
}
