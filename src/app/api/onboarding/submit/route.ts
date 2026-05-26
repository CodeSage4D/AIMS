import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 1. Fetch the intern profile
    const intern = await db.intern.findUnique({
      where: { userId },
      include: {
        documents: true,
        generatedDocuments: true,
      },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern profile not found." }, { status: 404 });
    }

    if (intern.status !== "ONBOARDING") {
      return NextResponse.json({ error: "Your profile is not in onboarding status." }, { status: 400 });
    }

    // 2. Validate core profile fields are complete
    const body = await req.json().catch(() => ({}));
    const {
      gender,
      dateOfBirth,
      phoneNumber,
      address,
      city,
      state,
      country,
      pinCode,
      citizenship,
      region,
      university,
      degree,
      batchSemester,
      emergencyContactName,
      emergencyContactNumber,
      skillsInput,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      branchName,
      panCard,
      linkedIn,
      gitHub,
      bloodGroup,
      accountHolderName,
      paymentPreference,
    } = body;

    // Required fields check
    if (
      !gender ||
      !dateOfBirth ||
      !phoneNumber ||
      !address ||
      !city ||
      !state ||
      !country ||
      !pinCode ||
      !university ||
      !degree ||
      !emergencyContactName ||
      !emergencyContactNumber ||
      !bankName ||
      !accountNumber ||
      !ifscCode ||
      !panCard
    ) {
      return NextResponse.json({ error: "Please fill in all required profile, address, and banking fields." }, { status: 400 });
    }

    // 3. Verify Resume document has been uploaded
    const resumeExists = intern.documents.some((d) => d.type === "RESUME");
    if (!resumeExists) {
      return NextResponse.json({ error: "Please upload your resume before submitting." }, { status: 400 });
    }

    // 4. Verify candidate signatures on OFFER_LETTER, NDA, and AGREEMENT
    const requiredTypes = ["OFFER_LETTER", "NDA", "AGREEMENT"];
    for (const type of requiredTypes) {
      const doc = intern.generatedDocuments.find((gd) => gd.type === type);
      if (!doc) {
        return NextResponse.json({ error: `Onboarding document draft for ${type} is missing. Please contact administration.` }, { status: 400 });
      }
      const content = typeof doc.content === "object" ? (doc.content as any) : null;
      if (!content || !content.candidateSignature) {
        return NextResponse.json({ error: `Please sign your ${type.replace("_", " ")} before submitting.` }, { status: 400 });
      }
    }

    // 5. Build notes field with serialized custom fields
    const { serializeInternNotes } = await import("@/lib/roles");
    const notesString = serializeInternNotes({
      linkedIn: linkedIn || "",
      gitHub: gitHub || "",
      bloodGroup: bloodGroup || "",
      accountHolderName: accountHolderName || "",
      paymentPreference: paymentPreference || "",
      customNotes: "",
    });

    // 6. Update the intern profile with completed fields and activate status
    const updatedIntern = await db.intern.update({
      where: { id: intern.id },
      data: {
        gender,
        dateOfBirth: new Date(dateOfBirth),
        phoneNumber,
        address,
        city,
        state,
        country,
        pinCode,
        citizenship,
        region,
        university,
        degree,
        batchSemester: batchSemester || "",
        emergencyContactName,
        emergencyContactNumber,
        bankName,
        accountNumber,
        ifscCode,
        upiId,
        branchName,
        panCard,
        notes: notesString,
        skills: skillsInput
          ? skillsInput
              .split(",")
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)
          : [],
        status: "ACTIVE", // Activate profile!
      },
    });

    // 7. Audit log
    const safeUserId = await getSafeUserId(userId);
    await db.activityLog.create({
      data: {
        userId: safeUserId,
        action: "SUBMIT_ONBOARDING_COMPLETED",
        description: `Enrollee ${intern.fullName} successfully completed onboarding setup and signed all contract agreements. Profile activated.`,
      },
    });

    const maskedIntern = {
      ...updatedIntern,
      accountNumber: updatedIntern.accountNumber ? `****${updatedIntern.accountNumber.slice(-4)}` : null,
      panCard: updatedIntern.panCard ? `******${updatedIntern.panCard.slice(-4)}` : null,
      ifscCode: updatedIntern.ifscCode ? `*******${updatedIntern.ifscCode.slice(-4)}` : null,
    };

    return NextResponse.json({ success: true, intern: maskedIntern });
  } catch (error: any) {
    console.error("Onboarding Submit Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process onboarding submission." }, { status: 500 });
  }
}
