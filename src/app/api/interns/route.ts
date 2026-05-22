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

    // 2. Strict Access Control (Only FOUNDER operations can onboard new interns)
    if (userRole !== "FOUNDER") {
      return NextResponse.json(
        { error: "Access Denied. Onboarding privileges restricted strictly to Founder role." },
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

    // 4. Basic parameter validations (endDate is optional for PERMANENT/CONTRACT employee types)
    if (!fullName || !email || !phoneNumber || !startDate || (parsedEmploymentType === "INTERN" && !endDate)) {
      return NextResponse.json(
        { error: "Missing required onboarding parameters (Name, Email, Phone, Dates)." },
        { status: 400 }
      );
    }

    // Strict input validation for Names and Phone Numbers
    const nameRegex = /^[a-zA-Z\s]+$/;
    const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;

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

    if (!phoneRegex.test(phoneNumber?.trim() || "")) {
      return NextResponse.json(
        { error: "Primary Phone Number must be a valid number containing between 7 and 15 digits." },
        { status: 400 }
      );
    }

    if (!phoneRegex.test(emergencyContactNumber?.trim() || "")) {
      return NextResponse.json(
        { error: "Emergency Contact Number must be a valid number containing between 7 and 15 digits." },
        { status: 400 }
      );
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
          const defaultPassword = "aims-demo-intern-2026";
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

          // Create corresponding Intern record
          return await tx.intern.create({
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
              notes: notes || "",
              ssidn: ssidn || null,
              supervisorId: supervisorId || null,
              status: "ACTIVE", // Onboards directly into active list
              userId: createdUser.id,
            },
          });
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

    return NextResponse.json({ success: true, intern }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An internal server error occurred during database insertion." },
      { status: 500 }
    );
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

    // 2. Strict Access Control (Only FOUNDER can delete/remove interns)
    if (userRole !== "FOUNDER") {
      return NextResponse.json(
        { error: "Access Denied. Deletion privileges restricted strictly to Founder role." },
        { status: 403 }
      );
    }

    // 3. Extract parameter 'id' from searchParams
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query parameter: id." },
        { status: 400 }
      );
    }

    // 4. Check if intern exists
    const intern = await db.intern.findUnique({
      where: { id },
      select: { fullName: true, internId: true, userId: true },
    });

    if (!intern) {
      return NextResponse.json(
        { error: "Intern file not found." },
        { status: 404 }
      );
    }

    // 5. Delete intern (deleting the linked user cascades and deletes the intern record)
    if (intern.userId) {
      await db.user.delete({
        where: { id: intern.userId },
      });
    } else {
      await db.intern.delete({
        where: { id },
      });
    }

    // 6. Register administrative security log
    const safeUserIdDel = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserIdDel,
        action: "DELETE_INTERN",
        description: `Successfully removed employee/intern ${intern.fullName} (ID: ${intern.internId})`,
      },
    });

    return NextResponse.json({ success: true, message: `Intern ${intern.fullName} successfully removed.` });
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

    // 2. Strict Access Control (Only FOUNDER can update interns)
    if (userRole !== "FOUNDER") {
      return NextResponse.json(
        { error: "Access Denied. Profile modification privileges restricted strictly to Founder role." },
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
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Intern file not found." },
        { status: 404 }
      );
    }

    // Strict input validation for updates if provided
    const nameRegex = /^[a-zA-Z\s]+$/;
    const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;

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

    if (updateData.phoneNumber !== undefined && !phoneRegex.test(updateData.phoneNumber?.trim() || "")) {
      return NextResponse.json(
        { error: "Primary Phone Number must be a valid number containing between 7 and 15 digits." },
        { status: 400 }
      );
    }

    if (updateData.emergencyContactNumber !== undefined && !phoneRegex.test(updateData.emergencyContactNumber?.trim() || "")) {
      return NextResponse.json(
        { error: "Emergency Contact Number must be a valid number containing between 7 and 15 digits." },
        { status: 400 }
      );
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
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;
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

    // 5. Auto-recompute Intern ID if name, dates, or roles change AND not explicitly specified
    if (
      updateData.internId === undefined &&
      (updateData.fullName !== undefined ||
        updateData.department !== undefined ||
        updateData.roleDomain !== undefined ||
        updateData.startDate !== undefined)
    ) {
      const finalName = updateData.fullName !== undefined ? updateData.fullName : existing.fullName;
      const finalDept = updateData.department !== undefined ? updateData.department : existing.department;
      const finalRole = updateData.roleDomain !== undefined ? updateData.roleDomain : existing.roleDomain;
      
      const rawDate = updateData.startDate !== undefined ? updateData.startDate : existing.startDate;
      const finalDateStr = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);

      const { generateInternId } = await import("@/lib/generateInternId");
      dataToUpdate.internId = await generateInternId(db, finalName, finalDept, finalRole, finalDateStr);
    } else if (updateData.internId !== undefined) {
      dataToUpdate.internId = updateData.internId;
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


