import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      fullName, 
      email, 
      phone, 
      username, 
      department, 
      requestedPosition,
      pinCode,
      country,
      state,
      city,
      address,
      citizenship,
      region,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
      upiId,
      notes
    } = body;

    // 1. Basic required fields checking
    if (!fullName || !email || !phone || !username || !department || !requestedPosition) {
      return NextResponse.json(
        { error: "All core registration fields (Name, Email, Phone, Username, Department, Role) are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const finalCountry = country?.trim() || "India";
    const finalState = state?.trim() || "PENDING";
    const finalCity = city?.trim() || "PENDING";
    const finalAddress = address?.trim() || "PENDING";
    const finalCitizenship = citizenship?.trim() || "PENDING";
    const finalRegion = region?.trim() || "PENDING";

    // 2. Strict Username Validation
    const usernameRegex = /^[a-z0-9_-]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Username must contain only lowercase letters, numbers, hyphens, and underscores (no spaces)." },
        { status: 400 }
      );
    }

    // 3. Strict Phone Number Validation
    // Remove formatting characters to get raw digits for counting
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, "");
    
    if (finalCountry.toLowerCase() === "india") {
      // Indian phone number: exactly 10 digits (optionally starting with +91 or 91)
      const isIndian = /^(?:\+91|91)?[6-9]\d{9}$/.test(cleanedPhone);
      if (!isIndian) {
        return NextResponse.json(
          { error: "Indian phone numbers must be exactly 10 digits, starting with a valid mobile prefix (6-9)." },
          { status: 400 }
        );
      }
    } else {
      // International users: must start with "+" and have 7 to 15 digits
      const isIntl = /^\+\d{7,15}$/.test(cleanedPhone);
      if (!isIntl) {
        return NextResponse.json(
          { error: "International phone numbers must start with a '+' country code followed by 7 to 15 digits." },
          { status: 400 }
        );
      }
    }

    // 4. PIN Code Validation
    if (pinCode) {
      const cleanPin = pinCode.trim();
      if (finalCountry.toLowerCase() === "india") {
        if (!/^\d{6}$/.test(cleanPin)) {
          return NextResponse.json(
            { error: "Indian PIN codes must be exactly 6 digits." },
            { status: 400 }
          );
        }
      } else {
        if (!/^[a-zA-Z0-9\s-]{3,10}$/.test(cleanPin)) {
          return NextResponse.json(
            { error: "International postal codes must be alphanumeric, between 3 and 10 characters." },
            { status: 400 }
          );
        }
      }
    }

    // 5. Strict Banking Details Validations
    if (accountNumber) {
      if (!/^\d{9,18}$/.test(accountNumber.trim())) {
        return NextResponse.json(
          { error: "Bank account numbers must contain only digits and be between 9 and 18 digits long." },
          { status: 400 }
        );
      }
    }

    if (ifscCode) {
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode.trim())) {
        return NextResponse.json(
          { error: "Indian IFSC codes must be exactly 11 characters (first 4 uppercase letters, 5th character '0', last 6 alphanumeric)." },
          { status: 400 }
        );
      }
    }

    if (upiId) {
      if (!/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
        return NextResponse.json(
          { error: "UPI ID must be in a valid format (e.g. handle@bank)." },
          { status: 400 }
        );
      }
    }

    // Unique checks
    const existingUserByEmail = await db.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "This email address is already registered." },
        { status: 400 }
      );
    }

    const existingUserByUsername = await db.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: "This username is already taken." },
        { status: 400 }
      );
    }

    const existingInternByEmail = await db.intern.findUnique({
      where: { email: cleanEmail },
    });
    if (existingInternByEmail) {
      return NextResponse.json(
        { error: "An intern profile with this email already exists." },
        { status: 400 }
      );
    }

    // Generate reference token: AXN-REF-[4 chars hex]
    const randomHex = crypto.randomBytes(2).toString("hex").toUpperCase();
    const referenceId = `AXN-REF-${randomHex}`;

    // Generate secure temp password
    const rawTempPassword = `AXN-TMP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(rawTempPassword, salt);

    // Transactionally save User and Intern
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
          address: finalAddress,
          city: finalCity,
          state: finalState,
          country: finalCountry,
          pinCode: pinCode ? pinCode.trim() : null,
          citizenship: finalCitizenship,
          region: finalRegion,
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
          notes: notes?.trim() || null,
        },
      });
    });

    return NextResponse.json({
      message: "Registration successful! Account is under administrative review.",
      referenceId,
      tempPassword: rawTempPassword,
    });
  } catch (error: any) {
    console.error("Signup Endpoint Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process enrollment request." },
      { status: 500 }
    );
  }
}
