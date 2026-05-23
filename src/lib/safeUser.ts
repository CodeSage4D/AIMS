import { db } from "./db";
import { generateInternId } from "./generateInternId";
import { EmploymentType, InternStatus } from "@prisma/client";

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

/**
 * Resolves or creates an Intern (Personnel) profile dynamically for any user role.
 * This enables executive and administration roles (FOUNDER, HR, TEAM_LEAD, etc.) to seamlessly
 * track their attendance and manage their own profiles under standard DB schema relations.
 */
export async function getOrCreateInternProfile(
  userId: string,
  userRole: string,
  fullName: string,
  email: string,
  tx?: any
): Promise<any> {
  const client = tx || db;

  // 1. Verify user exists
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true },
  });
  if (!user) {
    throw new Error(`User with ID ${userId} does not exist.`);
  }

  // 2. Fetch linked intern profile
  let intern = await client.intern.findUnique({
    where: { userId },
  });

  if (!intern) {
    // Generate a sequential unique internId based on the role and details
    const department = userRole === "FOUNDER" ? "Management" : "Staff";
    const internId = await generateInternId(
      client,
      user.fullName,
      department,
      userRole,
      new Date().toISOString()
    );

    intern = await client.intern.create({
      data: {
        internId,
        fullName: user.fullName,
        email: user.email,
        gender: "Not Specified",
        dateOfBirth: new Date("1990-01-01"),
        phoneNumber: "+91 0000000000",
        address: "Aurxon Headquarters",
        city: "New Delhi",
        state: "Delhi",
        country: "India",
        university: "Aurxon System",
        degree: "Professional",
        department,
        roleDomain: userRole,
        batchSemester: "N/A",
        startDate: new Date(),
        employmentType: userRole === "INTERN" ? EmploymentType.INTERN : EmploymentType.PERMANENT,
        status: InternStatus.ACTIVE,
        emergencyContactName: "AIMS Admin",
        emergencyContactNumber: "+91 0000000000",
        userId: user.id,
      },
    });
  }

  return intern;
}
