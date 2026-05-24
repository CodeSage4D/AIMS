import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import bcrypt from "bcryptjs";

/**
 * REST Endpoint for onboarding a new intern profile record.
 * POST /api/interns
 */
export async function POST(req: Request) {
  try {
    // 1. Session verification
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized access. Session credentials missing." },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const { hasPermission } = await import("@/lib/permissions");
    const hasAccess = await hasPermission(userId, userRole, "onboardingAccess");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access Denied. Onboarding privileges restricted." },
        { status: 403 }
      );
    }

    // 3. Extract and parse parameters
    const body = await req.json();
    const {
      fullName,
      gender,
      dateOfBirth,
      email,
      phoneNumber,
      address,
      city,
      state,
      country,
      university,
      degree,
      department,
      roleDomain,
      batchSemester,
      startDate,
      endDate,
      stipendAmount,
      paymentStatus,
      emergencyContactName,
      emergencyContactNumber,
      skillsInput,
      notes,
      supervisorId,
      ssidn,
      employmentType,
      username,
    } = body;

    const parsedEmploymentType = employmentType || "INTERN";

    if (roleDomain) {
      const { isFounderOnlyRole } = await import("@/lib/roles");
      if (isFounderOnlyRole(roleDomain) && userRole !== "FOUNDER") {
        return NextResponse.json(
          { error: `Access Denied. Only the Founder has final permission to appoint or assign the special role: '${roleDomain}'.` },
          { status: 403 }
        );
      }
    }

    // 4. Basic parameter validations (endDate is optional for PERMANENT/CONTRACT employee types)
    if (!fullName || !email || !phoneNumber || !startDate || (parsedEmploymentType === "INTERN" && !endDate)) {
      return NextResponse.json(
        { error: "Missing required onboarding parameters (Name, Email, Phone, Dates)." },
        { status: 400 }
      );
    }

    // Strict input validation for Names and Phone Numbers
    const nameRegex = /^[a-zA-Z\s]+$/;

    if (!nameRegex.test(fullName?.trim() || "")) {
      return NextResponse.json(
        { error: "Full Name must contain alphabetical letters and spaces only." },
        { status: 400 }
      );
    }

    if (!nameRegex.test(emergencyContactName?.trim() || "")) {
      return NextResponse.json(
        { error: "Emergency Contact Name must contain alphabetical letters and spaces only." },
        { status: 400 }
      );
    }

    // Phone number validation: Indian (10 digits) vs International (+ prefix)
    const cleanedPhone = (phoneNumber || "").replace(/[\s\-\(\)]/g, "");
    const finalCountry = country?.trim() || "India";

    if (finalCountry.toLowerCase() === "india") {
      const isIndian = /^(?:\+91|91)?[6-9]\d{9}$/.test(cleanedPhone);
      if (!isIndian) {
        return NextResponse.json(
          { error: "Primary Phone Number must be a valid 10-digit Indian mobile number." },
          { status: 400 }
        );
      }
    } else {
      const isIntl = /^\+\d{7,15}$/.test(cleanedPhone);
      if (!isIntl) {
        return NextResponse.json(
          { error: "Primary Phone Number must start with a '+' country code followed by 7 to 15 digits." },
          { status: 400 }
        );
      }
    }

    // Emergency Phone
    const cleanedEmerPhone = (emergencyContactNumber || "").replace(/[\s\-\(\)]/g, "");
    if (finalCountry.toLowerCase() === "india") {
      const isIndian = /^(?:\+91|91)?[6-9]\d{9}$/.test(cleanedEmerPhone);
      if (!isIndian) {
        return NextResponse.json(
          { error: "Emergency Contact Number must be a valid 10-digit Indian mobile number." },
          { status: 400 }
        );
      }
    } else {
      const isIntl = /^\+\d{7,15}$/.test(cleanedEmerPhone);
      if (!isIntl) {
        return NextResponse.json(
          { error: "Emergency Contact Number must start with a '+' country code followed by 7 to 15 digits." },
          { status: 400 }
        );
      }
    }

    // PIN Code validation
    if (body.pinCode) {
      const cleanPin = String(body.pinCode).trim();
      if (finalCountry.toLowerCase() === "india") {
        if (!/^\d{6}$/.test(cleanPin)) {
          return NextResponse.json({ error: "Indian PIN codes must be exactly 6 digits." }, { status: 400 });
        }
      } else {
        if (!/^[a-zA-Z0-9\s-]{3,10}$/.test(cleanPin)) {
          return NextResponse.json({ error: "International postal codes must be alphanumeric, between 3 and 10 characters." }, { status: 400 });
        }
      }
    }

    // Banking validations
    if (body.accountNumber) {
      if (!/^\d{9,18}$/.test(String(body.accountNumber).trim())) {
        return NextResponse.json({ error: "Bank account numbers must contain only digits and be between 9 and 18 digits long." }, { status: 400 });
      }
    }

    if (body.ifscCode) {
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(body.ifscCode).trim())) {
        return NextResponse.json({ error: "Indian IFSC codes must be exactly 11 characters (first 4 uppercase letters, 5th character '0', last 6 alphanumeric)." }, { status: 400 });
      }
    }

    if (body.upiId) {
      if (!/^[\w.-]+@[\w.-]+$/.test(String(body.upiId).trim())) {
        return NextResponse.json({ error: "UPI ID must be in a valid format (e.g. handle@bank)." }, { status: 400 });
      }
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // 5. Verify email or username uniqueness
    const existingEmail = await db.intern.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "An intern file with this email address already exists." },
        { status: 400 }
      );
    }

    if (username) {
      const cleanUsername = String(username).trim();
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanUsername, mode: "insensitive" } },
            { email: { equals: cleanEmail, mode: "insensitive" } }
          ]
        }
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "A user account with this username or email already exists." },
          { status: 400 }
        );
      }
    }

    // 6. Verify Custom ID uniqueness - Disabled (Pure System Auto-Generation Only)

    // 7. Parse complex types safely
    const skills = skillsInput
      ? skillsInput
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : [];

    const parsedStipend = stipendAmount ? Number(stipendAmount) : 0.00;

    // 8. Create intern and user records in a transactional, collision-safe retry wrapper
    const { generateInternId } = await import("@/lib/generateInternId");
    
    let retries = 3;
    let intern;
    let finalAssignedId = "";

    while (retries > 0) {
      try {
        intern = await db.$transaction(async (tx) => {
          const computedId = await generateInternId(tx, fullName, department, roleDomain, startDate);
          finalAssignedId = computedId;

          // Create linked User account for the intern/employee
          const defaultPassword = "aims-official-intern-2026";
          const passwordHash = bcrypt.hashSync(defaultPassword, 10);
          
          const createdUser = await tx.user.create({
            data: {
              email: cleanEmail,
              username: username?.trim() || computedId,
              passwordHash,
              fullName,
              role: "INTERN",
              changePasswordRequired: true,
            },
          });

          const { serializeInternNotes } = await import("@/lib/roles");
          const serializedNotes = serializeInternNotes({
            linkedIn: body.linkedIn || "",
            gitHub: body.gitHub || "",
            bloodGroup: body.bloodGroup || "",
            accountHolderName: body.accountHolderName || "",
            paymentPreference: body.paymentPreference || "",
            customNotes: notes || "",
          });

          // Create corresponding Intern record
          const createdIntern = await tx.intern.create({
            data: {
              internId: computedId,
              fullName,
              gender,
              dateOfBirth: new Date(dateOfBirth),
              email: cleanEmail,
              phoneNumber,
              address: address || "",
              city: city || "",
              state: state || "",
              country: country || "India",
              pinCode: body.pinCode || null,
              university,
              degree,
              department,
              roleDomain,
              batchSemester: batchSemester || "",
              startDate: new Date(startDate),
              endDate: endDate ? new Date(endDate) : null,
              employmentType: parsedEmploymentType as any,
              stipendAmount: parsedStipend,
              paymentStatus: paymentStatus || "UNPAID",
              emergencyContactName,
              emergencyContactNumber,
              skills,
              notes: serializedNotes,
              ssidn: ssidn || null,
              bankName: body.bankName || null,
              accountNumber: body.accountNumber || null,
              ifscCode: body.ifscCode || null,
              upiId: body.upiId || null,
              branchName: body.branchName || null,
              panCard: body.panCard || null,
              supervisorId: supervisorId || null,
              status: "ACTIVE", // Onboards directly into active list
              userId: createdUser.id,
            },
          });

          // Generate dynamic onboarding document drafts
          const { generateOfferLetterDraft, generateNDADraft, generateIDCardDraft } = await import("@/lib/documentTemplates");
          const offerLetterContent = generateOfferLetterDraft(createdIntern);
          const ndaContent = generateNDADraft(createdIntern);
          const idCardContent = generateIDCardDraft(createdIntern);

          await tx.generatedDocument.createMany({
            data: [
              {
                internId: createdIntern.id,
                type: "OFFER_LETTER",
                content: offerLetterContent as any,
                status: "PENDING",
              },
              {
                internId: createdIntern.id,
                type: "NDA",
                content: ndaContent as any,
                status: "PENDING",
              },
              {
                internId: createdIntern.id,
                type: "ID_CARD",
                content: idCardContent as any,
                status: "PENDING",
              },
            ],
          });

          return createdIntern;
        });
        break; // Successfully inserted!
      } catch (error: any) {
        const isUniqueConstraint = error.code === "P2002" && 
          (error.meta?.target?.includes("intern_id") || error.meta?.target?.includes("internId") || error.message?.includes("intern_id") || error.meta?.target?.includes("username") || error.message?.includes("username"));

        if (isUniqueConstraint) {
          retries--;
          if (retries === 0) {
            return NextResponse.json(
              { error: "Concurrency conflict: Unable to allocate a unique Intern ID or Username. Please retry." },
              { status: 409 }
            );
          }
          // Tiny delay before retry
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else {
          return NextResponse.json(
            { error: error.message || "An error occurred during database creation." },
            { status: 500 }
          );
        }
      }
    }

    if (!intern) {
      return NextResponse.json(
        { error: "Failed to onboard intern due to unexpected concurrency issues." },
        { status: 500 }
      );
    }

    // 9. Register administrative security log
    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "CREATE_INTERN",
        description: `Successfully onboarded new employee/intern ${fullName} with active branded ID ${finalAssignedId}`,
      },
    });

    // Trigger onboarding welcome email asynchronously
    const loginUrl = `${req.headers.get("origin") || "http://localhost:3000"}/login`;
    const { sendOnboardingWelcomeEmail } = await import("@/lib/emailService");
    sendOnboardingWelcomeEmail(
      { fullName: intern.fullName, email: intern.email, internId: intern.internId },
      "aims-official-intern-2026",
      loginUrl
    ).catch((err) => console.error("Asynchronous welcome email dispatch failed:", err));

    return NextResponse.json({ success: true, intern }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An internal server error occurred during database insertion." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interns
 * Fetches enrollees with specific filters (e.g. pending registrations or soft-deleted recovery bin).
 * Only Founder/HR/SUPER_ADMIN can run this query.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "FOUNDER" && userRole !== "HR" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access Denied. Administrative view restricted." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // "pending" or "deleted"

    if (filter === "pending") {
      const pending = await db.intern.findMany({
        where: {
          status: "PENDING_VERIFICATION",
          deletedAt: null
        },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(pending, { status: 200 });
    }

    if (filter === "deleted") {
      const deleted = await db.intern.findMany({
        where: {
          deletedAt: { not: null }
        },
        orderBy: { deletedAt: "desc" }
      });
      return NextResponse.json(deleted, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid filter option." }, { status: 400 });

  } catch (error: any) {
    console.error("GET Interns API Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * REST Endpoint for removing an intern profile record.
 * DELETE /api/interns?id=uuid
 */
export async function DELETE(req: Request) {
  try {
    // 1. Session verification
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized access. Session credentials missing." },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const { hasPermission } = await import("@/lib/permissions");
    const hasAccess = await hasPermission(userId, userRole, "onboardingAccess");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access Denied. Deletion privileges restricted." },
        { status: 403 }
      );
    }

    // 3. Extract parameters 'id' and 'action' from searchParams
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action") || "delete"; // delete (soft), restore, permanent

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query parameter: id." },
        { status: 400 }
      );
    }

    // 4. Check if intern exists
    const intern = await db.intern.findUnique({
      where: { id },
      select: { 
        fullName: true, 
        internId: true, 
        userId: true,
        user: {
          select: { role: true }
        }
      },
    });

    if (!intern) {
      return NextResponse.json(
        { error: "Intern file not found." },
        { status: 404 }
      );
    }

    // HR cannot remove Founder accounts
    if (intern.user?.role === "FOUNDER" && userRole !== "FOUNDER") {
      return NextResponse.json(
        { error: "Access Denied. HR cannot remove Founder accounts." },
        { status: 403 }
      );
    }

    const safeUserIdDel = await getSafeUserId(userId);

    // RESTORE ACTION (Founder-Only recovery)
    if (action === "restore") {
      if (userRole !== "FOUNDER") {
        return NextResponse.json({ error: "Access Denied. Only the Founder can restore accounts." }, { status: 403 });
      }

      await db.$transaction(async (tx) => {
        await tx.intern.update({
          where: { id },
          data: { deletedAt: null, deletedBy: null }
        });
        if (intern.userId) {
          await tx.user.update({
            where: { id: intern.userId },
            data: { deletedAt: null }
          });
        }
        await tx.activityLog.create({
          data: {
            userId: safeUserIdDel,
            action: "RESTORE_INTERN",
            description: `Founder successfully restored employee/intern ${intern.fullName} (ID: ${intern.internId}) from recovery trash.`,
          },
        });
      });

      return NextResponse.json({ success: true, message: `Intern ${intern.fullName} successfully restored.` });
    }

    // PERMANENT PURGE ACTION (Founder-Only purge)
    if (action === "permanent") {
      if (userRole !== "FOUNDER") {
        return NextResponse.json({ error: "Access Denied. Only the Founder can permanently purge records." }, { status: 403 });
      }

      await db.$transaction(async (tx) => {
        if (intern.userId) {
          await tx.user.delete({
            where: { id: intern.userId },
          });
        } else {
          await tx.intern.delete({
            where: { id },
          });
        }
        await tx.activityLog.create({
          data: {
            userId: safeUserIdDel,
            action: "PURGE_INTERN",
            description: `Founder permanently purged employee/intern ${intern.fullName} (ID: ${intern.internId}) and cascading files.`,
          },
        });
      });

      return NextResponse.json({ success: true, message: `Intern ${intern.fullName} permanently deleted.` });
    }

    // SOFT DELETE ACTION (Standard cooling cooling stage delete)
    await db.$transaction(async (tx) => {
      await tx.intern.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: (session.user as any)?.name || "AIMS Manager"
        }
      });
      if (intern.userId) {
        await tx.user.update({
          where: { id: intern.userId },
          data: { deletedAt: new Date() }
        });
      }
      await tx.activityLog.create({
        data: {
          userId: safeUserIdDel,
          action: "DELETE_INTERN",
          description: `Successfully soft-deleted employee/intern ${intern.fullName} (ID: ${intern.internId}) into 7-day cooling state.`,
        },
      });
    });

    return NextResponse.json({ success: true, message: `Intern ${intern.fullName} successfully moved to cooling bin.` });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An internal server error occurred during database deletion." },
      { status: 500 }
    );
  }
}

/**
 * REST Endpoint for updating an intern profile record.
 * PUT /api/interns
 */
export async function PUT(req: Request) {
  try {
    // 1. Session verification
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized access. Session credentials missing." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const { hasPermission } = await import("@/lib/permissions");
    const hasAccess = await hasPermission(userId, userRole, "onboardingAccess");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access Denied. Profile modification privileges restricted." },
        { status: 403 }
      );
    }

    // 2. Extract and parse parameters
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: id." },
        { status: 400 }
      );
    }

    // 3. Verify intern exists
    const existing = await db.intern.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Intern file not found." },
        { status: 404 }
      );
    }

    // HR cannot modify Founder accounts
    if (existing.user?.role === "FOUNDER" && userRole !== "FOUNDER") {
      return NextResponse.json(
        { error: "Access Denied. HR cannot modify Founder records." },
        { status: 403 }
      );
    }

    // Founder designation restriction check
    if (updateData.roleDomain !== undefined && updateData.roleDomain !== existing.roleDomain) {
      const { isFounderOnlyRole } = await import("@/lib/roles");
      if (isFounderOnlyRole(updateData.roleDomain) && userRole !== "FOUNDER") {
        return NextResponse.json(
          { error: `Access Denied. Only the Founder has final permission to appoint or assign the special role: '${updateData.roleDomain}'.` },
          { status: 403 }
        );
      }
    }

    const actorUser = await db.user.findUnique({
      where: { id: userId },
      select: { fullName: true, role: true }
    });

    // Strict input validation for updates if provided
    const nameRegex = /^[a-zA-Z\s]+$/;

    if (updateData.fullName !== undefined && !nameRegex.test(updateData.fullName?.trim() || "")) {
      return NextResponse.json(
        { error: "Full Name must contain alphabetical letters and spaces only." },
        { status: 400 }
      );
    }

    if (updateData.emergencyContactName !== undefined && !nameRegex.test(updateData.emergencyContactName?.trim() || "")) {
      return NextResponse.json(
        { error: "Emergency Contact Name must contain alphabetical letters and spaces only." },
        { status: 400 }
      );
    }

    const finalCountry = updateData.country || existing.country || "India";

    // Phone validation
    if (updateData.phoneNumber !== undefined) {
      const cleaned = String(updateData.phoneNumber).replace(/[\s\-\(\)]/g, "");
      if (finalCountry.toLowerCase() === "india") {
        if (!/^(?:\+91|91)?[6-9]\d{9}$/.test(cleaned)) {
          return NextResponse.json({ error: "Primary Phone Number must be a valid 10-digit Indian mobile number." }, { status: 400 });
        }
      } else {
        if (!/^\+\d{7,15}$/.test(cleaned)) {
          return NextResponse.json({ error: "Primary Phone Number must start with a '+' country code followed by 7 to 15 digits." }, { status: 400 });
        }
      }
    }

    // Emergency Phone validation
    if (updateData.emergencyContactNumber !== undefined) {
      const cleaned = String(updateData.emergencyContactNumber).replace(/[\s\-\(\)]/g, "");
      if (finalCountry.toLowerCase() === "india") {
        if (!/^(?:\+91|91)?[6-9]\d{9}$/.test(cleaned)) {
          return NextResponse.json({ error: "Emergency Contact Number must be a valid 10-digit Indian mobile number." }, { status: 400 });
        }
      } else {
        if (!/^\+\d{7,15}$/.test(cleaned)) {
          return NextResponse.json({ error: "Emergency Contact Number must start with a '+' country code followed by 7 to 15 digits." }, { status: 400 });
        }
      }
    }

    // PIN code validation
    if (updateData.pinCode !== undefined && updateData.pinCode !== null) {
      const cleanPin = String(updateData.pinCode).trim();
      if (cleanPin) {
        if (finalCountry.toLowerCase() === "india") {
          if (!/^\d{6}$/.test(cleanPin)) {
            return NextResponse.json({ error: "Indian PIN codes must be exactly 6 digits." }, { status: 400 });
          }
        } else {
          if (!/^[a-zA-Z0-9\s-]{3,10}$/.test(cleanPin)) {
            return NextResponse.json({ error: "International postal codes must be alphanumeric, between 3 and 10 characters." }, { status: 400 });
          }
        }
      }
    }

    // Banking validations
    if (updateData.accountNumber !== undefined && updateData.accountNumber !== null) {
      const acc = String(updateData.accountNumber).trim();
      if (acc && !/^\d{9,18}$/.test(acc)) {
        return NextResponse.json({ error: "Bank account numbers must contain only digits and be between 9 and 18 digits long." }, { status: 400 });
      }
    }

    if (updateData.ifscCode !== undefined && updateData.ifscCode !== null) {
      const ifsc = String(updateData.ifscCode).trim();
      if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc)) {
        return NextResponse.json({ error: "Indian IFSC codes must be exactly 11 characters (first 4 uppercase letters, 5th character '0', last 6 alphanumeric)." }, { status: 400 });
      }
    }

    if (updateData.upiId !== undefined && updateData.upiId !== null) {
      const upi = String(updateData.upiId).trim();
      if (upi && !/^[\w.-]+@[\w.-]+$/.test(upi)) {
        return NextResponse.json({ error: "UPI ID must be in a valid format (e.g. handle@bank)." }, { status: 400 });
      }
    }

    // 4. Build selective update payload
    const dataToUpdate: any = {};
    if (updateData.fullName !== undefined) dataToUpdate.fullName = updateData.fullName;
    if (updateData.gender !== undefined) dataToUpdate.gender = updateData.gender;
    if (updateData.dateOfBirth !== undefined) dataToUpdate.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.email !== undefined) dataToUpdate.email = String(updateData.email).toLowerCase().trim();
    if (updateData.phoneNumber !== undefined) dataToUpdate.phoneNumber = updateData.phoneNumber;
    if (updateData.address !== undefined) dataToUpdate.address = updateData.address;
    if (updateData.city !== undefined) dataToUpdate.city = updateData.city;
    if (updateData.state !== undefined) dataToUpdate.state = updateData.state;
    if (updateData.country !== undefined) dataToUpdate.country = updateData.country;
    if (updateData.university !== undefined) dataToUpdate.university = updateData.university;
    if (updateData.degree !== undefined) dataToUpdate.degree = updateData.degree;
    if (updateData.department !== undefined) dataToUpdate.department = updateData.department;
    if (updateData.roleDomain !== undefined) dataToUpdate.roleDomain = updateData.roleDomain;
    if (updateData.batchSemester !== undefined) dataToUpdate.batchSemester = updateData.batchSemester;
    if (updateData.startDate !== undefined) dataToUpdate.startDate = new Date(updateData.startDate);
    if (updateData.endDate !== undefined) dataToUpdate.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    if (updateData.employmentType !== undefined) dataToUpdate.employmentType = updateData.employmentType;
    if (updateData.stipendAmount !== undefined) dataToUpdate.stipendAmount = Number(updateData.stipendAmount);
    if (updateData.paymentStatus !== undefined) dataToUpdate.paymentStatus = updateData.paymentStatus;
    if (updateData.emergencyContactName !== undefined) dataToUpdate.emergencyContactName = updateData.emergencyContactName;
    if (updateData.emergencyContactNumber !== undefined) dataToUpdate.emergencyContactNumber = updateData.emergencyContactNumber;
    if (updateData.pinCode !== undefined) dataToUpdate.pinCode = updateData.pinCode;
    if (updateData.bankName !== undefined) dataToUpdate.bankName = updateData.bankName;
    if (updateData.accountNumber !== undefined) dataToUpdate.accountNumber = updateData.accountNumber;
    if (updateData.ifscCode !== undefined) dataToUpdate.ifscCode = updateData.ifscCode;
    if (updateData.upiId !== undefined) dataToUpdate.upiId = updateData.upiId;
    if (updateData.branchName !== undefined) dataToUpdate.branchName = updateData.branchName;
    if (updateData.panCard !== undefined) dataToUpdate.panCard = updateData.panCard;

    // Handle Notes & Serialized Custom properties
    const { parseInternNotes, serializeInternNotes } = await import("@/lib/roles");
    const existingCustom = parseInternNotes(existing.notes);
    const nextCustomNotes = updateData.notes !== undefined ? updateData.notes : existingCustom.customNotes;
    const nextLinkedIn = updateData.linkedIn !== undefined ? updateData.linkedIn : existingCustom.linkedIn;
    const nextGitHub = updateData.gitHub !== undefined ? updateData.gitHub : existingCustom.gitHub;
    const nextBloodGroup = updateData.bloodGroup !== undefined ? updateData.bloodGroup : existingCustom.bloodGroup;
    const nextAccountHolder = updateData.accountHolderName !== undefined ? updateData.accountHolderName : existingCustom.accountHolderName;
    const nextPaymentPref = updateData.paymentPreference !== undefined ? updateData.paymentPreference : existingCustom.paymentPreference;

    dataToUpdate.notes = serializeInternNotes({
      linkedIn: nextLinkedIn || "",
      gitHub: nextGitHub || "",
      bloodGroup: nextBloodGroup || "",
      accountHolderName: nextAccountHolder || "",
      paymentPreference: nextPaymentPref || "",
      customNotes: nextCustomNotes || "",
    });

    if (updateData.ssidn !== undefined) dataToUpdate.ssidn = updateData.ssidn || null;
    if (updateData.supervisorId !== undefined) dataToUpdate.supervisorId = updateData.supervisorId || null;
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status as any;

    if (updateData.skillsInput !== undefined) {
      dataToUpdate.skills = updateData.skillsInput
        ? updateData.skillsInput
            .split(",")
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
        : [];
    }

    // 5. Intern ID is strictly permanent. Do NOT regenerate or recompute.
    if (updateData.internId !== undefined && userRole === "FOUNDER") {
      dataToUpdate.internId = updateData.internId; // Only Founder can manually override
    }

    // 6. Execute update in database (transactional update for both User and Intern)
    const updated = await db.$transaction(async (tx) => {
      // If the intern has a linked user, update their account details in sync
      if (existing.userId) {
        const userUpdateData: any = {};
        if (updateData.fullName !== undefined) userUpdateData.fullName = updateData.fullName;
        if (updateData.email !== undefined) userUpdateData.email = String(updateData.email).toLowerCase().trim();
        if (updateData.username !== undefined) userUpdateData.username = String(updateData.username).trim() || null;

        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: existing.userId },
            data: userUpdateData,
          });
        }
      }

      // Audit Role updates!
      if (updateData.roleDomain !== undefined && updateData.roleDomain !== existing.roleDomain && existing.userId) {
        const { getRoleMeta } = await import("@/lib/roles");
        const meta = getRoleMeta(updateData.roleDomain);
        
        await tx.permissionChangeLog.create({
          data: {
            changedById: userId,
            targetId: existing.userId,
            previousRole: existing.roleDomain,
            newRole: updateData.roleDomain,
            details: `Corporate Designation appointed. Source: ${meta.appointmentSource}. Access: ${meta.accessLevel}. Operator: ${actorUser?.fullName || "AIMS Manager"}.`,
          },
        });
      }

      // Audit Bank details updates!
      if (existing.userId) {
        const { parseInternNotes } = await import("@/lib/roles");
        const existingCustom = parseInternNotes(existing.notes);
        const bankChanged = 
          (updateData.bankName !== undefined && updateData.bankName !== existing.bankName) ||
          (updateData.accountNumber !== undefined && updateData.accountNumber !== existing.accountNumber) ||
          (updateData.ifscCode !== undefined && updateData.ifscCode !== existing.ifscCode) ||
          (updateData.upiId !== undefined && updateData.upiId !== existing.upiId) ||
          (updateData.branchName !== undefined && updateData.branchName !== existing.branchName) ||
          (updateData.accountHolderName !== undefined && updateData.accountHolderName !== existingCustom.accountHolderName) ||
          (updateData.paymentPreference !== undefined && updateData.paymentPreference !== existingCustom.paymentPreference);

        if (bankChanged) {
          await tx.permissionChangeLog.create({
            data: {
              changedById: userId,
              targetId: existing.userId,
              previousRole: existing.roleDomain,
              newRole: existing.roleDomain,
              details: `Corporate bank details changed. Operator: ${actorUser?.fullName || "AIMS Manager"}.`,
            },
          });
        }
      }

      return await tx.intern.update({
        where: { id },
        data: dataToUpdate,
      });
    });

    // 7. Register administrative audit log
    const safeUserIdPut = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserIdPut,
        action: "UPDATE_INTERN",
        description: `Successfully updated profile for ${updated.fullName} (ID: ${updated.internId})`,
      },
    });

    return NextResponse.json({ success: true, intern: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An internal server error occurred during database update." },
      { status: 500 }
    );
  }
}


