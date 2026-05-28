import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import { generateInternId } from "@/lib/generateInternId";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * POST /api/interns/approve
 * Administrative endpoint to Approve or Reject a pending self-registration.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access. Session credentials missing." }, { status: 401 });
    }

    const actorUserId = (session.user as any).id;
    const actorUserRole = (session.user as any).role;

    // Permissions check: Founder, HR, and Super Admins only
    if (actorUserRole !== "FOUNDER" && actorUserRole !== "HR" && actorUserRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access Denied. Onboarding approvals restricted." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, action, fullName, roleDomain, department, startDate } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "Validation failed. Missing parameter: id or action." }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT" && action !== "PREVIEW") {
      return NextResponse.json({ error: "Validation failed. Action must be APPROVE, REJECT, or PREVIEW." }, { status: 400 });
    }

    // 1. Fetch pending intern and linked user profile
    const pendingIntern = await db.intern.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!pendingIntern) {
      return NextResponse.json({ error: "Onboarding file not found." }, { status: 404 });
    }

    if (pendingIntern.status !== "PENDING_VERIFICATION") {
      return NextResponse.json({ error: "Validation failed: This onboarding file has already been resolved." }, { status: 400 });
    }

    const safeActorUserId = await getSafeUserId(actorUserId);

    // Scenario 1: Rejecting the self-registration
    if (action === "REJECT") {
      await db.$transaction(async (tx) => {
        // Set User status to REJECTED
        if (pendingIntern.userId) {
          await tx.user.update({
            where: { id: pendingIntern.userId },
            data: { status: "REJECTED" }
          });
        }

        // Set Intern status to ARCHIVED/TERMINATED
        await tx.intern.update({
          where: { id },
          data: { status: "TERMINATED" }
        });

        // Audit Log
        await tx.activityLog.create({
          data: {
            userId: safeActorUserId,
            action: "REJECT_ONBOARDING",
            description: `Rejected self-enrollment request for ${pendingIntern.fullName} (${pendingIntern.email})`,
          }
        });
      });

      return NextResponse.json({ success: true, message: "Onboarding enrollment rejected." }, { status: 200 });
    }

    // Scenario 2: Approving the self-registration
    const finalName = fullName?.trim() || pendingIntern.fullName;
    const finalRole = roleDomain?.trim() || pendingIntern.roleDomain;
    const finalDept = department?.trim() || pendingIntern.department;
    const finalDateStr = startDate ? new Date(startDate).toISOString() : pendingIntern.startDate.toISOString();

    // Scenario 3: ID Preview Forecasting (Transactional Preview)
    if (action === "PREVIEW") {
      const computedId = await generateInternId(db, finalName, finalDept, finalRole, finalDateStr);
      return NextResponse.json({ success: true, previewId: computedId }, { status: 200 });
    }

    // Verify Founder-only role appointment restriction
    const { isFounderOnlyRole } = await import("@/lib/roles");
    if (isFounderOnlyRole(finalRole) && actorUserRole !== "FOUNDER") {
      return NextResponse.json(
        { error: `Access Denied. Only the Founder can approve or assign the special role: '${finalRole}'.` },
        { status: 403 }
      );
    }

    // Generate a strong, random temporary password
    const rawTempPassword = `AXN-TMP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(rawTempPassword, salt);

    // Generate stable sequential Intern ID transactionally
    const result = await db.$transaction(async (tx) => {
      const computedId = await generateInternId(tx, finalName, finalDept, finalRole, finalDateStr);

      // 1. Update User Details
      let usernameUpdate = computedId;
      if (pendingIntern.user?.username && !pendingIntern.user.username.startsWith("axn-ref-")) {
        usernameUpdate = pendingIntern.user.username; // Keep custom username if specified
      }

      if (pendingIntern.userId) {
        await tx.user.update({
          where: { id: pendingIntern.userId },
          data: {
            fullName: finalName,
            status: "APPROVED",
            username: usernameUpdate,
            passwordHash,
            changePasswordRequired: true,
          }
        });
      }

      // 2. Update Intern Details
      const updatedIntern = await tx.intern.update({
        where: { id },
        data: {
          internId: computedId,
          fullName: finalName,
          roleDomain: finalRole,
          department: finalDept,
          startDate: new Date(finalDateStr),
          status: "ONBOARDING", // Activates onboarding flow for first login
          phoneNumber: body.phoneNumber !== undefined ? body.phoneNumber : pendingIntern.phoneNumber,
          address: body.address !== undefined ? body.address : pendingIntern.address,
          city: body.city !== undefined ? body.city : pendingIntern.city,
          state: body.state !== undefined ? body.state : pendingIntern.state,
          country: body.country !== undefined ? body.country : pendingIntern.country,
          pinCode: body.pinCode !== undefined ? body.pinCode : pendingIntern.pinCode,
          citizenship: body.citizenship !== undefined ? body.citizenship : pendingIntern.citizenship,
          region: body.region !== undefined ? body.region : pendingIntern.region,
          bankName: body.bankName !== undefined ? body.bankName : pendingIntern.bankName,
          accountNumber: body.accountNumber !== undefined ? body.accountNumber : pendingIntern.accountNumber,
          ifscCode: body.ifscCode !== undefined ? body.ifscCode : pendingIntern.ifscCode,
          branchName: body.branchName !== undefined ? body.branchName : pendingIntern.branchName,
          upiId: body.upiId !== undefined ? body.upiId : pendingIntern.upiId,
          notes: body.notes !== undefined ? body.notes : pendingIntern.notes,
        }
      });

      // 2.5 Ensure UserPermission row exists with correct intern defaults
      if (pendingIntern.userId) {
        await tx.userPermission.upsert({
          where: { userId: pendingIntern.userId },
          update: {}, // Don't overwrite if row already exists with custom settings
          create: {
            userId: pendingIntern.userId,
            dashboardAccess: true,
            attendanceAccess: true,
            taskAccess: true,
            documentAccess: true,
            approvalAccess: false,
            settingsAccess: false,
            analyticsAccess: false,
            onboardingAccess: false,
          },
        });
      }

      // 3. Re-generate dynamic onboarding document drafts in the vault matching permanent sequential ID
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

      // 4. Register administrative audit log
      await tx.activityLog.create({
        data: {
          userId: safeActorUserId,
          action: "APPROVE_ONBOARDING",
          description: `Approved self-enrollment request for ${finalName}. Assigned sequence ID: ${computedId} (Role: ${finalRole})`,
        }
      });

      return updatedIntern;
    });

    return NextResponse.json({ success: true, intern: result, tempPassword: rawTempPassword }, { status: 200 });

  } catch (error: any) {
    console.error("Approve Onboarding API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process onboarding approval." }, { status: 500 });
  }
}
