import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeUserId } from "@/lib/safeUser";
import crypto from "crypto";

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
      signatureName,
    } = body;

    // Required fields check
    const isPanRequired = Number(intern.stipendAmount) > 50000;
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
      (isPanRequired && !panCard)
    ) {
      return NextResponse.json({ error: "Please fill in all required profile, address, and banking fields." }, { status: 400 });
    }

    // 3. Verify Resume document has been uploaded
    const resumeExists = intern.documents.some((d) => d.type === "RESUME");
    if (!resumeExists) {
      return NextResponse.json({ error: "Please upload your resume before submitting." }, { status: 400 });
    }

    // 4. Verify / auto-generate and sign candidate agreements on-the-fly
    const requiredTypes = ["OFFER_LETTER", "NDA", "AGREEMENT"];
    
    // Auto-generate any missing drafts on-the-fly to prevent signature blockers
    const missingTypes = requiredTypes.filter(t => !intern.generatedDocuments.some(gd => gd.type === t));
    if (!intern.generatedDocuments.some(gd => gd.type === "ID_CARD")) {
      missingTypes.push("ID_CARD");
    }

    if (missingTypes.length > 0) {
      console.log(`[ONBOARDING SUBMIT] Auto-compiling missing drafts on-the-fly for intern ${intern.id}:`, missingTypes);
      const { generateOfferLetterDraft, generateNDADraft, generateIDCardDraft, generateAgreementDraft } = await import("@/lib/documentTemplates");
      
      const createdDocs = [];
      for (const type of missingTypes) {
        let content;
        if (type === "OFFER_LETTER") content = generateOfferLetterDraft(intern);
        if (type === "NDA") content = generateNDADraft(intern);
        if (type === "AGREEMENT") content = generateAgreementDraft(intern);
        if (type === "ID_CARD") content = generateIDCardDraft(intern);

        const newDoc = await db.generatedDocument.create({
          data: {
            internId: intern.id,
            type,
            content: content as any,
            version: 1,
            lifecycleStatus: "DRAFT",
            watermarkStatus: "DRAFT",
            status: "PENDING",
          }
        });
        createdDocs.push(newDoc);
      }
      intern.generatedDocuments.push(...createdDocs);
    }

    // Apply unified "One-Click Accept & Sign All" digital signature server-side if provided
    if (signatureName && signatureName.trim()) {
      const signedAt = new Date();
      const cleanSigName = signatureName.trim();
      
      console.log(`[ONBOARDING SUBMIT] Atomically signing all ${requiredTypes.length} agreements for intern ${intern.id} with name: ${cleanSigName}`);
      for (const type of requiredTypes) {
        const doc = intern.generatedDocuments.find((gd) => gd.type === type);
        if (doc) {
          const updatedContent = typeof doc.content === "object" && doc.content !== null
            ? {
                ...doc.content,
                candidateSignature: cleanSigName,
                candidateSignedAt: signedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                candidateSignatureStamp: `Digitally Signed by Candidate [${cleanSigName}] | Date: ${signedAt.toLocaleDateString()}`
              }
            : {
                candidateSignature: cleanSigName,
                candidateSignedAt: signedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                candidateSignatureStamp: `Digitally Signed by Candidate [${cleanSigName}] | Date: ${signedAt.toLocaleDateString()}`
              };

          const salt = process.env.NEXTAUTH_SECRET || "AURXON_SALT_2026";
          const verificationHash = crypto
            .createHash("sha256")
            .update(`${doc.id}-${intern.id}-${type}-${signedAt.getTime()}-${salt}`)
            .digest("hex");

          await db.generatedDocument.update({
            where: { id: doc.id },
            data: {
              content: updatedContent as any,
              verificationHash,
              status: "APPROVED",
              candidateSigned: true,
              lifecycleStatus: "PENDING_REVIEW", // Moves to APPROVED only after founder signs
              watermarkStatus: "PENDING",
            }
          });
          
          doc.content = updatedContent; // sync local object
          (doc as any).verificationHash = verificationHash;
          doc.status = "APPROVED";
          (doc as any).candidateSigned = true;
          (doc as any).lifecycleStatus = "PENDING_REVIEW";
          (doc as any).watermarkStatus = "PENDING";
        }
      }
    }

    // Perform validation check to ensure all required documents are successfully signed
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

    // Ensure the intern has a UserPermission row with correct defaults.
    // This handles interns who were onboarded via direct HR flow (no permission row created).
    if (userId) {
      await db.userPermission.upsert({
        where: { userId },
        update: {}, // Don't overwrite if row already exists with custom settings
        create: {
          userId,
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
