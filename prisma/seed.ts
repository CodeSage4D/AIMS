import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  ...(process.env.DATABASE_URL?.startsWith("prisma+postgres://")
    ? { accelerateUrl: process.env.DATABASE_URL }
    : {}),
} as any);

async function main() {
  console.log("-----------------------------------------------------------------");
  console.log("  AURXON AIMS DATABASE SEEDING ENGINE ENGAGED");
  console.log("  STATUS: Initializing system tables in production-ready state.");
  console.log("-----------------------------------------------------------------");

  // 1. Wipe existing databases to prevent collision
  console.log("Wiping existing records...");
  await prisma.activityLog.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.intern.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Hydrate System Access Roles (Official Administrative Users)
  console.log("Creating administrative system users...");
  
  const adminPasswordHash = bcrypt.hashSync("aims-demo-admin-2026", 10);
  const mentorPasswordHash = bcrypt.hashSync("aims-demo-mentor-2026", 10);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@aurxon.demo",
      passwordHash: adminPasswordHash,
      fullName: "AIMS Demo Administrator",
      role: Role.ADMIN,
    },
  });

  const mentorUser = await prisma.user.create({
    data: {
      email: "mentor@aurxon.demo",
      passwordHash: mentorPasswordHash,
      fullName: "AIMS Demo Mentor",
      role: Role.MENTOR,
    },
  });

  // 3. Log initial system startup
  await prisma.activityLog.create({
    data: {
      userId: adminUser.id,
      action: "PORTAL_INIT",
      description: "AURXON Intern Management System (AIMS) database successfully initialized in clean production-ready state.",
    },
  });

  console.log("System initialized successfully with administrator accounts.");
  console.log("-----------------------------------------------------------------");
  console.log("  DATABASE SEEDING COMPLETED SUCCESSFULLY");
  console.log("  Cleared: Yes  |  Users: 2  |  Interns: 0  |  Logs written");
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
