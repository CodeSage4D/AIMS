import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("=== USERS ===");
  console.log(JSON.stringify(users, null, 2));

  const interns = await prisma.intern.findMany();
  console.log("=== INTERNS ===");
  console.log(JSON.stringify(interns, null, 2));

  const permissions = await prisma.userPermission.findMany();
  console.log("=== USER PERMISSIONS ===");
  console.log(JSON.stringify(permissions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
