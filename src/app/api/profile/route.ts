import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSafeUserId } from "@/lib/safeUser";

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
 * GET /api/profile
 * Retrieves profile update requests:
 * - Founder / HR: All pending or all requests
 * - Intern: Self requests only
 */
export async function GET(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    if (user.role === "FOUNDER" || user.role === "HR") {
      const requests = await db.profileUpdateRequest.findMany({
        include: {
          intern: {
            select: { id: true, internId: true, fullName: true, department: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(requests, { status: 200 });
    } else {
      const internProfile = await db.intern.findUnique({
        where: { userId: user.id },
      });

      if (!internProfile) {
        return NextResponse.json({ error: "No intern profile associated with this account." }, { status: 404 });
      }

      const requests = await db.profileUpdateRequest.findMany({
        where: { internId: internProfile.id },
        include: {
          intern: {
            select: { id: true, internId: true, fullName: true, department: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(requests, { status: 200 });
    }
  } catch (err: any) {
    console.error("Error retrieving profile requests:", err);
    return NextResponse.json({ error: "Internal database query error." }, { status: 500 });
  }
}

/**
 * POST /api/profile
 * Submits a new Profile Correction Request (Restricted to INTERNs only)
 */
export async function POST(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    if (user.role !== "INTERN") {
      return NextResponse.json({ error: "Forbidden. Only interns can submit correction requests." }, { status: 403 });
    }

    const internProfile = await db.intern.findUnique({
      where: { userId: user.id },
    });

    if (!internProfile) {
      return NextResponse.json({ error: "Forbidden. No active intern profile found." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { fieldToUpdate, proposedValue, notes } = body;

    if (!fieldToUpdate || !proposedValue?.trim()) {
      return NextResponse.json({ error: "Validation failed. Missing required fields: fieldToUpdate or proposedValue." }, { status: 400 });
    }

    // Submit request in ACID transaction along with ActivityLog
    const request = await db.$transaction(async (tx) => {
      const safeUserId = await getSafeUserId(user.id, tx);
      const reqRecord = await tx.profileUpdateRequest.create({
        data: {
          internId: internProfile.id,
          fieldToUpdate,
          proposedValue: proposedValue.trim(),
          notes: notes?.trim() || null,
          status: "PENDING",
        },
      });

      await tx.activityLog.create({
        data: {
          userId: safeUserId,
          action: "SUBMIT_PROFILE_REQUEST",
          description: `Submitted correction request for field "${fieldToUpdate}".`,
        },
      });

      return reqRecord;
    });

    return NextResponse.json(request, { status: 201 });
  } catch (err: any) {
    console.error("Error submitting profile request:", err);
    return NextResponse.json({ error: "Internal database save error." }, { status: 500 });
  }
}

/**
 * PATCH /api/profile
 * Handles multiple update behaviors:
 * 1. Self Username & Password update (Accepts `username`, `currentPassword`, `newPassword`)
 * 2. Manager Approving / Rejecting ProfileUpdateRequest (Accepts `requestId`, `action: APPROVE | REJECT`)
 */
export async function PATCH(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const body = await req.json().catch(() => ({}));
    const { username, currentPassword, newPassword, requestId, action, notes } = body;

    // SCENARIO 2: Manager resolving a ProfileUpdateRequest
    if (requestId && action) {
      if (user.role !== "FOUNDER" && user.role !== "HR") {
        return NextResponse.json({ error: "Forbidden. Only Founders and HR can resolve profile update requests." }, { status: 403 });
      }

      if (action !== "APPROVE" && action !== "REJECT") {
        return NextResponse.json({ error: "Validation failed. Action must be APPROVE or REJECT." }, { status: 400 });
      }

      const request = await db.profileUpdateRequest.findUnique({
        where: { id: requestId },
        include: { intern: true },
      });

      if (!request) {
        return NextResponse.json({ error: "Validation failed. Request does not exist." }, { status: 404 });
      }

      if (request.status !== "PENDING") {
        return NextResponse.json({ error: "Validation failed. This request has already been resolved." }, { status: 400 });
      }

      const resolved = await db.$transaction(async (tx) => {
        const safeUserId = await getSafeUserId(user.id, tx);
        const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

        const updatedRequest = await tx.profileUpdateRequest.update({
          where: { id: requestId },
          data: {
            status: nextStatus,
            notes: notes?.trim() || request.notes,
          },
        });

        if (action === "APPROVE") {
          const fieldMap: Record<string, string> = {
            fullName: "fullName",
            gender: "gender",
            dateOfBirth: "dateOfBirth",
            phoneNumber: "phoneNumber",
            address: "address",
            city: "city",
            state: "state",
            country: "country",
            pinCode: "pinCode",
            citizenship: "citizenship",
            region: "region",
            university: "university",
            degree: "degree",
            department: "department",
            roleDomain: "roleDomain",
            batchSemester: "batchSemester",
            bankName: "bankName",
            accountNumber: "accountNumber",
            ifscCode: "ifscCode",
            upiId: "upiId",
            branchName: "branchName",
            panCard: "panCard",
          };

          const targetField = fieldMap[request.fieldToUpdate];
          if (targetField) {
            let parsedValue: any = request.proposedValue;
            if (targetField === "dateOfBirth") {
              parsedValue = new Date(request.proposedValue);
            }

            await tx.intern.update({
              where: { id: request.internId },
              data: {
                [targetField]: parsedValue,
              },
            });

            // Also update the User table if fullName is updated
            if (targetField === "fullName" && request.intern.userId) {
              await tx.user.update({
                where: { id: request.intern.userId },
                data: { fullName: parsedValue },
              });
            }
          }
        }

        await tx.activityLog.create({
          data: {
            userId: safeUserId,
            action: "RESOLVE_PROFILE_REQUEST",
            description: `${action === "APPROVE" ? "Approved" : "Rejected"} correction request for field "${request.fieldToUpdate}" for intern ${request.intern.fullName}.`,
          },
        });

        return updatedRequest;
      });

      return NextResponse.json(resolved, { status: 200 });
    }

    // SCENARIO 1: Self Profile Updates (Username / Password)
    if (username !== undefined || (currentPassword !== undefined && newPassword !== undefined)) {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      const updateData: any = {};

      // 1. Username handling
      if (username !== undefined) {
        const cleanUsername = username.trim();
        if (!/^[a-z0-9-]+$/.test(cleanUsername)) {
          return NextResponse.json(
            { error: "Validation failed. Username must contain only lowercase alphanumeric characters and hyphens." },
            { status: 400 }
          );
        }

        // Unique check
        const existingUser = await db.user.findFirst({
          where: {
            username: cleanUsername,
            NOT: { id: user.id },
          },
        });

        if (existingUser) {
          return NextResponse.json({ error: "Validation failed. Username is already taken." }, { status: 400 });
        }

        updateData.username = cleanUsername;
      }

      // 2. Password handling
      if (currentPassword !== undefined && newPassword !== undefined) {
        if (newPassword.length < 8) {
          return NextResponse.json({ error: "Validation failed. New password must be at least 8 characters long." }, { status: 400 });
        }

        const isMatch = bcrypt.compareSync(currentPassword, dbUser.passwordHash);
        if (!isMatch) {
          return NextResponse.json({ error: "Validation failed. The current password you provided is incorrect." }, { status: 400 });
        }

        updateData.passwordHash = bcrypt.hashSync(newPassword, 10);
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No update parameters provided." }, { status: 400 });
      }

      const updated = await db.$transaction(async (tx) => {
        const safeUserId = await getSafeUserId(user.id, tx);
        const userRec = await tx.user.update({
          where: { id: user.id },
          data: updateData,
        });

        if (updateData.username) {
          await tx.activityLog.create({
            data: {
              userId: safeUserId,
              action: "CHANGE_USERNAME",
              description: `Changed username to "${updateData.username}".`,
            },
          });
        }

        if (updateData.passwordHash) {
          await tx.activityLog.create({
            data: {
              userId: safeUserId,
              action: "CHANGE_PASSWORD",
              description: `Updated security password credentials.`,
            },
          });
        }

        return userRec;
      });

      return NextResponse.json({ success: true, message: "Profile successfully updated." }, { status: 200 });
    }

    return NextResponse.json({ error: "Validation failed. Invalid parameters." }, { status: 400 });
  } catch (err: any) {
    console.error("Error updating profile:", err);
    return NextResponse.json({ error: "Internal database update error." }, { status: 500 });
  }
}
