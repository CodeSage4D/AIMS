import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

    // 2. Strict Access Control (Only ADMINs/HR operations can onboard new interns)
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied. Onboarding privileges restricted strictly to Administrator role." },
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
    } = body;

    // 4. Basic parameter validations
    if (!fullName || !email || !phoneNumber || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required onboarding parameters (Name, Email, Phone, Dates)." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // 5. Verify email uniqueness
    const existingEmail = await db.intern.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "An intern file with this email address already exists." },
        { status: 400 }
      );
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

    // 8. Create intern record in a transactional, collision-safe retry wrapper
    const { generateInternId } = await import("@/lib/generateInternId");
    
    let retries = 3;
    let intern;
    let finalAssignedId = "";

    while (retries > 0) {
      try {
        intern = await db.$transaction(async (tx) => {
          const computedId = await generateInternId(tx, fullName, department, roleDomain, startDate);
          finalAssignedId = computedId;

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
              endDate: new Date(endDate),
              stipendAmount: parsedStipend,
              paymentStatus: paymentStatus || "UNPAID",
              emergencyContactName,
              emergencyContactNumber,
              skills,
              notes: notes || "",
              ssidn: ssidn || null,
              supervisorId: supervisorId || null,
              status: "ACTIVE", // Onboards directly into active list
            },
          });
        });
        break; // Successfully inserted!
      } catch (error: any) {
        const isUniqueConstraint = error.code === "P2002" && 
          (error.meta?.target?.includes("intern_id") || error.meta?.target?.includes("internId") || error.message?.includes("intern_id"));

        if (isUniqueConstraint) {
          retries--;
          if (retries === 0) {
            return NextResponse.json(
              { error: "Concurrency conflict: Unable to allocate a unique Intern ID prefix. Please retry." },
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
    await db.activityLog.create({
      data: {
        userId: userId,
        action: "CREATE_INTERN",
        description: `Successfully onboarded new intern ${fullName} with active branded ID ${finalAssignedId}`,
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

    // 2. Strict Access Control (Only ADMINs can delete/remove interns)
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied. Deletion privileges restricted strictly to Administrator role." },
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
      select: { fullName: true, internId: true },
    });

    if (!intern) {
      return NextResponse.json(
        { error: "Intern file not found." },
        { status: 404 }
      );
    }

    // 5. Delete intern (cascade deletes attendance, tasks, documents automatically)
    await db.intern.delete({
      where: { id },
    });

    // 6. Register administrative security log
    await db.activityLog.create({
      data: {
        userId: userId,
        action: "DELETE_INTERN",
        description: `Successfully removed intern ${intern.fullName} (ID: ${intern.internId})`,
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

