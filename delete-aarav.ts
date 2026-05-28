import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const aarav = await prisma.intern.findFirst({
    where: { fullName: { contains: "Aarav" } }
  });
  
  if (aarav) {
    // Delete associated user if any
    if (aarav.userId) {
      await prisma.user.delete({ where: { id: aarav.userId } });
    } else {
      await prisma.intern.delete({ where: { id: aarav.id } });
    }
    console.log("Deleted Aarav Sharma");
  } else {
    console.log("Aarav Sharma not found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
