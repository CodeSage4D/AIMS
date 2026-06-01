import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'pool_timeout=30&connect_timeout=30'
    }
  }
});

async function main() {
  const MAX_ATTEMPTS = 5;
  let users = null;
  let interns = null;
  let permissions = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${MAX_ATTEMPTS}] Querying database...`);
      users = await prisma.user.findMany();
      interns = await prisma.intern.findMany();
      permissions = await prisma.userPermission.findMany();
      console.log("Successfully connected and queried database!");
      break;
    } catch (err: any) {
      console.warn(`Attempt ${attempt} failed:`, err.message || err);
      if (attempt === MAX_ATTEMPTS) {
        throw err;
      }
      console.log("Waiting 3 seconds before next retry...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log("=== USERS ===");
  console.log(JSON.stringify(users, null, 2));

  console.log("=== INTERNS ===");
  console.log(JSON.stringify(interns, null, 2));

  console.log("=== USER PERMISSIONS ===");
  console.log(JSON.stringify(permissions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

