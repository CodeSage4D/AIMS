import { PrismaClient, Role, EmploymentType, InternStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateOfferLetterDraft, generateNDADraft, generateIDCardDraft, generateAgreementDraft } from "../src/lib/documentTemplates";

const prisma = new PrismaClient({
  ...(process.env.DATABASE_URL?.startsWith("prisma+postgres://")
    ? { accelerateUrl: process.env.DATABASE_URL }
    : {}),
} as any);

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("CRITICAL WARNING: Database seeding is BLOCKED in production environments to prevent accidental database wipe.");
    process.exit(1);
  }

  console.log("-----------------------------------------------------------------");
  console.log("  AURXON AIMS DATABASE SEEDING ENGINE ENGAGED");
  console.log("  STATUS: Initializing custom 4-tier model users.");
  console.log("-----------------------------------------------------------------");

  // 1. Wipe existing databases to prevent collision
  console.log("Wiping existing records...");
  await prisma.diary.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.todo.deleteMany({});
  await prisma.projectRecord.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.passwordResetRequest.deleteMany({});
  await prisma.leaveApplication.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.generatedDocument.deleteMany({});
  await prisma.intern.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Hydrate access roles
  console.log("Creating administrative system users...");
  
  const founderPasswordHash = bcrypt.hashSync("KarannFuture$136", 10);
  const hrPasswordHash = bcrypt.hashSync("aims-official-hr-2026", 10);
  const leadPasswordHash = bcrypt.hashSync("aims-official-lead-2026", 10);
  const internPasswordHash = bcrypt.hashSync("aims-official-intern-2026", 10);

  const founderUser = await prisma.user.create({
    data: {
      email: "karannmishra136@gmail.com",
      passwordHash: founderPasswordHash,
      fullName: "Karan Mishra",
      role: Role.FOUNDER,
    },
  });

  const hrUser = await prisma.user.create({
    data: {
      email: "hr@aurxon.com",
      passwordHash: hrPasswordHash,
      fullName: "Aurxon HR Manager",
      role: Role.HR,
    },
  });

  const leadUser = await prisma.user.create({
    data: {
      email: "lead@aurxon.com",
      passwordHash: leadPasswordHash,
      fullName: "Aurxon Team Lead",
      role: Role.TEAM_LEAD,
    },
  });

  console.log("Creating active enrollees & corresponding user credentials...");
  
  // Create an intern user credential for Aarav Sharma (forced password reset active)
  const aaravInternUser = await prisma.user.create({
    data: {
      email: "aarav@aurxon.com",
      username: "AXN-SWE-2605-AS01",
      passwordHash: internPasswordHash,
      fullName: "Aarav Sharma",
      role: Role.INTERN,
      changePasswordRequired: true, // Forces Aarav to reset password on first login
    },
  });

  const aaravInternProfile = await prisma.intern.create({
    data: {
      internId: "AXN-SWE-2605-AS01",
      fullName: "Aarav Sharma",
      gender: "Male",
      dateOfBirth: new Date("2004-08-15"),
      email: "aarav@aurxon.com",
      phoneNumber: "+91 9876543210",
      address: "123 Glacial Tech Lane, Suite 400",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      university: "Delhi University",
      degree: "B.Tech Computer Science",
      department: "Engineering",
      roleDomain: "Software Engineer",
      batchSemester: "Semester 6",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-11-01"),
      employmentType: EmploymentType.INTERN,
      status: InternStatus.ONBOARDING,
      stipendAmount: 15000.00,
      paymentStatus: "UNPAID",
      emergencyContactName: "Raj Sharma",
      emergencyContactNumber: "+91 9876543211",
      skills: ["React", "Next.js", "TypeScript", "Node.js"],
      userId: aaravInternUser.id,
      supervisorId: leadUser.id, // Mapped to our Team Lead
    },
  });

  // Generate dynamic onboarding document drafts in the vault
  const offerLetterContent = generateOfferLetterDraft(aaravInternProfile);
  const ndaContent = generateNDADraft(aaravInternProfile);
  const agreementContent = generateAgreementDraft(aaravInternProfile);
  const idCardContent = generateIDCardDraft(aaravInternProfile);

  await prisma.generatedDocument.createMany({
    data: [
      {
        internId: aaravInternProfile.id,
        type: "OFFER_LETTER",
        content: offerLetterContent as any,
        status: "PENDING",
      },
      {
        internId: aaravInternProfile.id,
        type: "NDA",
        content: ndaContent as any,
        status: "PENDING",
      },
      {
        internId: aaravInternProfile.id,
        type: "AGREEMENT",
        content: agreementContent as any,
        status: "PENDING",
      },
      {
        internId: aaravInternProfile.id,
        type: "ID_CARD",
        content: idCardContent as any,
        status: "PENDING",
      },
    ]
  });

  // Seed tasks for Aarav
  await prisma.task.create({
    data: {
      internId: aaravInternProfile.id,
      title: "Integrate Vercel Analytics",
      description: "Implement lightweight summary analytics dashboard components for the AIMS web portal, ensuring compatibility with free-tier Postgres limits.",
      deadline: new Date("2026-05-30"),
      status: "IN_PROGRESS",
      assignedById: leadUser.id,
    },
  });

  // Seed todos for Aarav User
  await prisma.todo.createMany({
    data: [
      {
        userId: aaravInternUser.id,
        title: "Review NDA and Sign Offer Letter",
        description: "Must read the terms and complete onboarding signature flow",
        completed: false,
        date: "2026-05-26",
        type: "TODO",
      },
      {
        userId: aaravInternUser.id,
        title: "Setup Local Development Environment",
        description: "Clone aurxon repos and set up env files",
        completed: true,
        date: "2026-05-25",
        type: "TODO",
      },
      {
        userId: aaravInternUser.id,
        title: "Submit Daily Standup Update",
        description: "Report blockers to Team Lead before 11 AM daily",
        completed: false,
        date: "2026-05-27",
        type: "REMINDER",
      }
    ]
  });

  // Seed project records (Working Portfolio Timeline) for Aarav Intern
  await prisma.projectRecord.create({
    data: {
      internId: aaravInternProfile.id,
      title: "Aurxon Operating System Core Auth Modules",
      description: "Refactored JWT session validation and implemented routing guards compatibility with Next.js edge runtime.",
      technologies: ["Next.js", "Prisma", "TypeScript", "NextAuth"],
      roleInProject: "Lead Security Integrator",
      documentName: "auth-architecture-spec.pdf",
      deliverableUrl: "https://github.com/aurxon/aims-core/pull/42",
      status: "IN_PROGRESS",
      assignedById: leadUser.id,
      reviewNotes: "Security architecture looks solid. Proceed to verify on production environment."
    }
  });

  await prisma.projectRecord.create({
    data: {
      internId: aaravInternProfile.id,
      title: "Premium Component UI Library",
      description: "Developed dark mode glassmorphism theme components using vanilla CSS variables.",
      technologies: ["React", "CSS Variables"],
      roleInProject: "UI Developer",
      documentName: "ui-component-showcase.mp4",
      deliverableUrl: "https://github.com/aurxon/aims-ui/pull/11",
      status: "COMPLETED",
      assignedById: founderUser.id,
      reviewNotes: "Fabulous animations and gradients. This is precisely the premium operating system look we wanted!"
    }
  });

  // Seed Founder's Diaries
  await prisma.diary.createMany({
    data: [
      {
        userId: founderUser.id,
        title: "Systems Launch Reflections",
        content: "AIMS platform setup is officially completed. The security protocols and edge guards feel rock solid. Ready to scale onboarding.",
      },
      {
        userId: founderUser.id,
        title: "Aurxon Strategy Call",
        content: "Met with lead designers to outline requirements for the glassmorphism asset vault. Next milestone: secure document stamps.",
      }
    ]
  });

  // Seed Projects Directory
  await prisma.project.createMany({
    data: [
      {
        projectId: "AXN-PRJ-2605-01",
        title: "AIMS Core Operating System",
        description: "Startup core infrastructure and management portal.",
        status: "ACTIVE",
        details: "Development of 4-tier access control dashboard, onboarding pipelines, and compliance verification.",
        allowedUsers: [aaravInternUser.id],
      },
      {
        projectId: "AXN-PRJ-2605-02",
        title: "Aurxon Global Expansion Platform",
        description: "Localized content delivery and international payment compliance engine.",
        status: "PLANNED",
        details: "Strategic outline for handling multicurrency routing, bank details audits, and security compliance.",
        allowedUsers: [],
      }
    ]
  });

  // 3. Seed default system settings
  await prisma.systemSetting.upsert({
    where: { key: "allow_intern_bank_updates" },
    update: {},
    create: {
      key: "allow_intern_bank_updates",
      value: JSON.stringify({ allowed: false }),
    },
  });

  // 4. Log initial system startup
  await prisma.activityLog.create({
    data: {
      userId: founderUser.id,
      action: "PORTAL_INIT",
      description: "AURXON Internal Management System (AIMS) successfully initialized in clean 4-tier model state.",
    },
  });

  console.log("System initialized successfully with admin, lead, and intern accounts.");
  console.log("-----------------------------------------------------------------");
  console.log("  DATABASE SEEDING COMPLETED SUCCESSFULLY");
  console.log("  Cleared: Yes  |  Users: 4  |  Interns: 1  |  Logs written");
  console.log("-----------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Critical error in AIMS database seeder:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
