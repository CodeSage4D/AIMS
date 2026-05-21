import { db } from "./db";

/**
 * Checks if the given userId is valid and exists in the database.
 * If the userId is null, undefined, starts with "demo-", or does not exist in the database,
 * it returns null. Otherwise, it returns the verified userId.
 * This prevents foreign key constraint violations when logged in via mock offline credentials.
 */
export async function getSafeUserId(
  userId: string | null | undefined,
  tx?: any
): Promise<string | null> {
  if (!userId) return null;
  if (userId.startsWith("demo-")) return null;

  try {
    const client = tx || db;
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user ? user.id : null;
  } catch (error) {
    console.warn(`[getSafeUserId] Failed to verify userId ${userId}:`, error);
    return null;
  }
}
