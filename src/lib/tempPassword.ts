import crypto from "crypto";

/**
 * Generates a high-entropy, 14-character temporary password that complies with:
 * - At least one uppercase character
 * - At least one lowercase character
 * - At least one numeric digit
 * - At least one special character
 * - Length >= 10
 */
export function generateSecureTempPassword(): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Exclude confusing O/0, I/1
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const specials = "!@#$%&*?";

  // Guarantee at least one from each complexity subset
  const uChar = uppercase[crypto.randomInt(uppercase.length)];
  const lChar = lowercase[crypto.randomInt(lowercase.length)];
  const dChar = digits[crypto.randomInt(digits.length)];
  const sChar = specials[crypto.randomInt(specials.length)];

  // Fill remaining 6 characters from the aggregated secure sets
  const allPool = uppercase + lowercase + digits + specials;
  let remaining = "";
  for (let i = 0; i < 6; i++) {
    remaining += allPool[crypto.randomInt(allPool.length)];
  }

  // Shuffle the set using secure random indexes
  const combined = [uChar, lChar, dChar, sChar, ...remaining.split("")];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    const temp = combined[i];
    combined[i] = combined[j];
    combined[j] = temp;
  }

  return `AXN-${combined.join("")}`;
}
