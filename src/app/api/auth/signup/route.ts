import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { 
      fullName, 
      email, 
      phone, 
      username, 
      department, 
      requestedPosition,
      pinCode,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
      upiId
    } = await req.json();

    if (!fullName || !email || !phone || !username || !department || !requestedPosition) {
      return NextResponse.json(
        { error: "All registration fields are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // Check email uniqueness on User
    const existingUserByEmail = await db.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "This email address is already registered." },
        { status: 400 }
      );
    }

    // Check username uniqueness on User
    const existingUserByUsername = await db.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: "This username is already taken." },
        { status: 400 }
      );
    }

    // Check email uniqueness on Intern profile
    const existingInternByEmail = await db.intern.findUnique({
      where: { email: cleanEmail },
    });
    if (existingInternByEmail) {
      return NextResponse.json(
        { error: "An intern profile with this email already exists." },
        { status: 400 }
      );
    }

    // Generate a temporary reference number: AXN-REF-[4 chars hex]
    const randomHex = crypto.randomBytes(2).toString("hex").toUpperCase();
    const referenceId = `AXN-REF-${randomHex}`;

    // Generate a secure, randomized temporary password
    const rawTempPassword = `AXN-TMP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(rawTempPassword, salt);

    // Transactionally create User and Intern profile
    await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: cleanEmail,
          username: cleanUsername,
          fullName: fullName.trim(),
          passwordHash,
          role: "INTERN",
          status: "PENDING",
          changePasswordRequired: true,
        },
      });

      await tx.intern.create({
        data: {
          internId: referenceId,
          fullName: fullName.trim(),
          gender: "PENDING",
          dateOfBirth: new Date("2000-01-01"),
          email: cleanEmail,
          phoneNumber: phone.trim(),
          address: "PENDING",
          city: "PENDING",
          state: "PENDING",
          country: "PENDING",
          pinCode: pinCode ? pinCode.trim() : null,
          bankName: bankName ? bankName.trim() : null,
          accountNumber: accountNumber ? accountNumber.trim() : null,
          ifscCode: ifscCode ? ifscCode.trim() : null,
          branchName: branchName ? branchName.trim() : null,
          upiId: upiId ? upiId.trim() : null,
          university: "PENDING",
          degree: "PENDING",
          department: department.trim(),
          roleDomain: requestedPosition.trim(),
          batchSemester: "PENDING",
          emergencyContactName: "PENDING",
          emergencyContactNumber: "PENDING",
          startDate: new Date(),
          status: "PENDING_VERIFICATION",
          userId: newUser.id,
        },
      });
    });

    return NextResponse.json({
      message: "Registration successful! Account is under administrative review.",
      referenceId,
    });
  } catch (error: any) {
    console.error("Signup Endpoint Error:", error);
    return NextResponse.json(
      { error: "Failed to process enrollment request." },
      { status: 500 }
    );
  }
}
