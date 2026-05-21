import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Instantiates a database connection singleton to guarantee a single concurrent client connection,
 * preventing connection exhaustion during Next.js hot reloads in development.
 */
export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(process.env.DATABASE_URL?.startsWith("prisma+postgres://")
      ? { accelerateUrl: process.env.DATABASE_URL }
      : {}),
  } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
export default db;
