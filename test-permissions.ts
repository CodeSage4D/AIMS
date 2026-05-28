import { PrismaClient } from "@prisma/client";
import { hasPermission } from "./src/lib/permissions";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Testing permissions for all users:");
  for (const user of users) {
    const result = await hasPermission(user.id, user.role, "dashboardAccess");
    console.log(`User: ${user.fullName} (${user.role}) -> dashboardAccess: ${result}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
