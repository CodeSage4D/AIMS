import { PrismaClient, Role, EmploymentType, InternStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  await prisma.activityLog.deleteMany({});
  await prisma.passwordResetRequest.deleteMany({});
  await prisma.leaveApplication.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.intern.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Hydrate access roles
  console.log("Creating administrative system users...");
  
  const founderPasswordHash = bcrypt.hashSync("aims-official-founder-2026", 10);
  const hrPasswordHash = bcrypt.hashSync("aims-official-hr-2026", 10);
  const leadPasswordHash = bcrypt.hashSync("aims-official-lead-2026", 10);
  const internPasswordHash = bcrypt.hashSync("aims-official-intern-2026", 10);

  const founderUser = await prisma.user.create({
    data: {
      email: "founder@aurxon.com",
      passwordHash: founderPasswordHash,
      fullName: "Karann Mishra",
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
      status: InternStatus.ACTIVE,
      stipendAmount: 15000.00,
      paymentStatus: "UNPAID",
      emergencyContactName: "Raj Sharma",
      emergencyContactNumber: "+91 9876543211",
      skills: ["React", "Next.js", "TypeScript", "Node.js"],
      userId: aaravInternUser.id,
      supervisorId: leadUser.id, // Mapped to our Team Lead
    },
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
