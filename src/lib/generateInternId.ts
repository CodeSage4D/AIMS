import { ROLE_CODES } from "./roles";


export function getRoleCode(roleDomain: string): string {
  const normalized = roleDomain.trim();
  
  // 1. Exact dictionary match
  if (ROLE_CODES[normalized]) {
    return ROLE_CODES[normalized];
  }
  
  // 2. Case-insensitive exact dictionary match
  const lower = normalized.toLowerCase();
  for (const [key, value] of Object.entries(ROLE_CODES)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }

  // 3. Robust keyphrase/keyword match
  if (lower.includes("software engineer")) return "SWE";
  if (lower.includes("frontend") || lower.includes("front-end")) return "FED";
  if (lower.includes("backend") || lower.includes("back-end")) return "BED";
  if (lower.includes("fullstack") || lower.includes("full-stack") || lower.includes("full stack")) return "FSD";
  if (lower.includes("web developer") || lower.includes("web dev") || lower.includes("web")) return "WBD";
  if (lower.includes("android")) return "AND";
  if (lower.includes("ios")) return "IOS";
  if (lower.includes("mobile")) return "MAD";
  if (lower.includes("react")) return "RCT";
  if (lower.includes("next")) return "NXD";
  if (lower.includes("node")) return "NOD";
  if (lower.includes("python")) return "PYD";
  if (lower.includes("java") && !lower.includes("script")) return "JAV";
  if (lower.includes("c++")) return "CPP";
  if (lower.includes("ai") || lower.includes("ml") || lower.includes("machine learning") || lower.includes("artificial intelligence") || lower.includes("deep learning")) return "AIM";
  if (lower.includes("scientist")) return "DST";
  if (lower.includes("analyst")) return "DAN";
  if (lower.includes("devops")) return "DOP";
  if (lower.includes("cloud")) return "CLD";
  if (lower.includes("cyber") || lower.includes("security") || lower.includes("cybersecurity")) return "CSE";
  if (lower.includes("hacker") || lower.includes("ethical")) return "ETH";
  if (lower.includes("blockchain") || lower.includes("crypto")) return "BCD";
  if (lower.includes("game")) return "GMD";
  if (lower.includes("ui/ux") || lower.includes("ui-ux") || lower.includes("ux")) return "UXD";
  if (lower.includes("product designer")) return "PRD";
  if (lower.includes("graphic")) return "GRD";
  if (lower.includes("motion")) return "MOD";
  if (lower.includes("video") || lower.includes("editor")) return "VED";
  if (lower.includes("3d") || lower.includes("artist")) return "ART";
  if (lower.includes("automation")) return "TAE";
  if (lower.includes("qa") || lower.includes("test") || lower.includes("quality")) return "QAE";
  if (lower.includes("database") || lower.includes("sql")) return "DBE";
  if (lower.includes("system")) return "SYE";
  if (lower.includes("erp")) return "ERP";
  if (lower.includes("api")) return "APD";
  if (lower.includes("embedded")) return "ESE";
  if (lower.includes("iot")) return "IOT";
  if (lower.includes("ar") || lower.includes("vr")) return "ARV";
  if (lower.includes("research")) return "TRI";
  if (lower.includes("design") || lower.includes("product engineering")) return "PED";
  if (lower.includes("hr") || lower.includes("human resources") || lower.includes("recruit")) return "HRS";
  if (lower.includes("operations")) return "OPS";
  if (lower.includes("marketing")) return "MKT";
  if (lower.includes("sales")) return "SLS";
  if (lower.includes("business development") || lower.includes("development")) return "BDE";
  if (lower.includes("writer") || lower.includes("content")) return "CWT";
  if (lower.includes("social") || lower.includes("media") || lower.includes("instagram") || lower.includes("linkedin")) return "SMM";
  if (lower.includes("talent") || lower.includes("acquisition")) return "TAC";
  if (lower.includes("coordinator")) return "PJC";
  if (lower.includes("support") || lower.includes("customer")) return "CSP";

  return "SWE"; // Smart default fallback
}

// Extractor logic for full name initials (First Letter + Last Letter)
export function getInitials(name: string): string {
  // Strip out non-alphabetic characters except spaces to keep initials clean and professional
  const cleanName = (name || "").replace(/[^a-zA-Z\s]/g, "");
  const parts = cleanName.trim().split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return "XX";
  if (parts.length === 1) {
    const word = parts[0].toUpperCase();
    return word.length >= 2 ? word.slice(0, 2) : word + "X";
  }
  const firstChar = parts[0][0]?.toUpperCase() || "X";
  const lastChar = parts[parts.length - 1][0]?.toUpperCase() || "X";
  return firstChar + lastChar;
}

/**
 * Safe generation function to run inside an existing Prisma transaction or standard context.
 * Computes the next visual unique ID for the intern based on formatting criteria.
 */
export async function generateInternId(
  tx: any,
  fullName: string,
  department: string, // Kept for signature compatibility
  roleDomain: string,
  startDateStr: string
): Promise<string> {
  const roleCode = getRoleCode(roleDomain);
  
  // Format joining date to YYMM
  const date = new Date(startDateStr);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yymm = `${yy}${mm}`;
  
  // Get initials
  const initials = getInitials(fullName);
  
  // Fetch all interns to calculate sequential counter safely across the entire company
  const existing = await tx.intern.findMany({
    where: {
      internId: {
        startsWith: `AXN-`,
      },
    },
    select: {
      internId: true,
    },
  });
  
  let maxVal = 0;
  for (const item of existing) {
    // Matches the sequence counter at the end of the ID (e.g. AXN-SWE-2605-KV01 -> match 01)
    const match = item.internId.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxVal) {
        maxVal = num;
      }
    }
  }
  
  const nextNum = maxVal + 1;
  const suffix = String(nextNum).padStart(2, "0");
  
  return `AXN-${roleCode}-${yymm}-${initials}${suffix}`;
}

