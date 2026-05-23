export const ROLE_CODES: Record<string, string> = {
  // Special/Combined Business Roles
  "Founder": "FND",
  "Director": "DIR",
  "Managing Director": "MDR",
  "Managing Director (MD)": "MDR",
  "Head Talent": "HDT",
  "Head Operations": "HOS",
  "Operations Manager": "OPM",
  "Talent Acquisition Manager": "TAM",
  "Department Manager": "DPM",
  "Team Lead": "TML",
  "Coordinator": "COR",
  "Engineer": "ENG",
  "Employee": "EMP",
  "Intern": "INT",

  "HR Manager": "HRM",
  "Operations": "OPR",
  "Talent Acquisition": "TAL",
  "Product/Design Manager": "PDM",
  "Engineering Lead": "EDL",
  "Compliance & Support Manager": "CSM",
  "Head Operations & Talent Acquisition": "HOS-TAL",
  "Product Engineering & Design Lead": "PED-LEAD",
  "Admin & Compliance Manager": "ADM-CSM",
  "Operations & HR Coordinator": "OPR-HRS",
  "Founder’s Executive Assistant": "FND-AST",
  "HR Coordinator": "HR-COORD",

  // Core Engineering & Technical Roles
  "Software Engineer": "SWE",
  "Frontend Developer": "FED",
  "Backend Developer": "BED",
  "Full Stack Developer": "FSD",
  "Web Developer": "WBD",
  "Mobile App Developer": "MAD",
  "Android Developer": "AND",
  "iOS Developer": "IOS",
  "React Developer": "RCT",
  "Next.js Developer": "NXD",
  "Node.js Developer": "NOD",
  "Python Developer": "PYD",
  "Java Developer": "JAV",
  "C++ Developer": "CPP",
  "AI/ML Engineer": "AIM",
  "Data Scientist": "DST",
  "Data Analyst": "DAN",
  "DevOps Engineer": "DOP",
  "Cloud Engineer": "CLD",
  "Cyber Security": "CSE",
  "Ethical Hacker": "ETH",
  "Blockchain Developer": "BCD",
  "Game Developer": "GMD",
  "UI/UX Designer": "UXD",
  "Product Designer": "PRD",
  "Graphic Designer": "GRD",
  "Motion Designer": "MOD",
  "Video Editor": "VED",
  "3D Artist": "ART",
  "QA Engineer": "QAE",
  "Test Automation Engineer": "TAE",
  "Database Engineer": "DBE",
  "System Engineer": "SYE",
  "ERP Developer": "ERP",
  "API Developer": "APD",
  "Embedded Systems Engineer": "ESE",
  "IoT Developer": "IOT",
  "AR/VR Developer": "ARV",
  "Technical Research Intern": "TRI",
  "Product Engineering & Design": "PED",

  // Support & Operations Roles
  "Human Resources": "HRS",
  "Operations Executive": "OPS",
  "Marketing Intern": "MKT",
  "Sales Executive": "SLS",
  "Business Development": "BDE",
  "Content Writer": "CWT",
  "Social Media Manager": "SMM",
  "Talent Acquisition Specialist": "TAC",
  "Project Coordinator": "PJC",
  "Customer Support": "CSP"
};

export interface RoleMeta {
  roleName: string;
  shortCode: string;
  accessLevel: string;
  appointmentSource: "Founder-appointed" | "HR-appointed" | "system-assigned";
}

export function getRoleMeta(roleDomain: string): RoleMeta {
  const name = (roleDomain || "Software Engineer").trim();

  // 1. Direct match in ROLE_CODES
  if (ROLE_CODES[name]) {
    const code = ROLE_CODES[name];
    const source = getSourceByRole(name, code);
    const access = getAccessByRole(name, code);
    return {
      roleName: name,
      shortCode: code,
      accessLevel: access,
      appointmentSource: source,
    };
  }

  // 2. Parse combined roles separated by " & ", " and ", " / ", etc.
  const parts = name.split(/\s+(?:&|and|\/)\s+/i);
  if (parts.length > 1) {
    const codes = parts.map((p) => {
      const trimmedPart = p.trim();
      if (ROLE_CODES[trimmedPart]) return ROLE_CODES[trimmedPart];

      const lower = trimmedPart.toLowerCase();
      if (lower.includes("head operations")) return "HOS";
      if (lower.includes("talent acquisition")) return "TAL";
      if (lower.includes("product engineering")) return "PED";
      if (lower.includes("design lead")) return "LEAD";
      if (lower.includes("admin")) return "ADM";
      if (lower.includes("compliance")) return "CSM";
      if (lower.includes("operations")) return "OPR";
      if (lower.includes("hr") || lower.includes("human resources")) return "HRS";
      if (lower.includes("assistant")) return "AST";

      return trimmedPart.slice(0, 3).toUpperCase();
    });

    const combinedCode = codes.join("-");
    const combinedSource = parts.some((p) => isRestrictedRoleName(p))
      ? "Founder-appointed"
      : "HR-appointed";
    const combinedAccess = parts.some(
      (p) =>
        p.toLowerCase().includes("head") ||
        p.toLowerCase().includes("founder") ||
        p.toLowerCase().includes("assistant")
    )
      ? "Executive Level"
      : "Management Level";

    return {
      roleName: name,
      shortCode: combinedCode,
      accessLevel: combinedAccess,
      appointmentSource: combinedSource,
    };
  }

  // 3. Fallback for custom singular roles
  const lower = name.toLowerCase();
  let code = "SWE";
  if (lower.includes("founder")) code = "FND";
  else if (lower.includes("hr manager")) code = "HRM";
  else if (lower.includes("operations")) code = "OPR";
  else if (lower.includes("talent acquisition")) code = "TAL";
  else if (lower.includes("head operations")) code = "HOS";
  else if (lower.includes("product") && lower.includes("manager")) code = "PDM";
  else if (lower.includes("lead")) code = "EDL";
  else if (lower.includes("compliance")) code = "CSM";
  else {
    code = name.slice(0, 3).toUpperCase();
  }

  const source = getSourceByRole(name, code);
  const access = getAccessByRole(name, code);

  return {
    roleName: name,
    shortCode: code,
    accessLevel: access,
    appointmentSource: source,
  };
}

function isRestrictedRoleName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("founder") ||
    lower.includes("head") ||
    lower.includes("manager") ||
    lower.includes("lead") ||
    lower.includes("assistant") ||
    lower.includes("director")
  );
}

function getSourceByRole(
  name: string,
  code: string
): "Founder-appointed" | "HR-appointed" | "system-assigned" {
  const lowerName = name.toLowerCase();
  const lowerCode = code.toLowerCase();

  if (lowerName.includes("founder") && !lowerName.includes("assistant")) {
    return "system-assigned";
  }

  if (
    lowerName.includes("founder") ||
    lowerName.includes("head") ||
    lowerName.includes("manager") ||
    lowerName.includes("lead") ||
    lowerName.includes("assistant") ||
    lowerName.includes("director") ||
    lowerCode === "fnd" ||
    lowerCode === "hrm" ||
    lowerCode === "hos" ||
    lowerCode === "pdm" ||
    lowerCode === "edl" ||
    lowerCode === "csm" ||
    lowerCode === "dir" ||
    lowerCode === "mdr" ||
    lowerCode === "hdt" ||
    lowerCode === "opm" ||
    lowerCode === "tam" ||
    lowerCode === "dpm" ||
    lowerCode === "tml"
  ) {
    return "Founder-appointed";
  }

  if (
    lowerName.includes("coordinator") ||
    lowerName.includes("specialist") ||
    lowerName.includes("executive") ||
    lowerCode === "opr" ||
    lowerCode === "tal" ||
    lowerCode === "hrs" ||
    lowerCode === "ops" ||
    lowerCode === "cor" ||
    lowerCode === "eng" ||
    lowerCode === "emp" ||
    lowerCode === "int"
  ) {
    return "HR-appointed";
  }

  return "system-assigned";
}

function getAccessByRole(name: string, code: string): string {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("founder") && !lowerName.includes("assistant")) {
    return "Owner Control";
  }
  if (
    lowerName.includes("founder") ||
    lowerName.includes("head") ||
    lowerName.includes("assistant") ||
    lowerName.includes("director")
  ) {
    return "Executive Level";
  }
  if (lowerName.includes("manager") || lowerName.includes("lead")) {
    return "Management Level";
  }
  if (
    lowerName.includes("coordinator") ||
    lowerName.includes("specialist") ||
    lowerName.includes("executive")
  ) {
    return "Operations Level";
  }
  return "Staff Level";
}

export function isFounderOnlyRole(roleDomain: string): boolean {
  const meta = getRoleMeta(roleDomain);
  return meta.appointmentSource === "Founder-appointed";
}

export interface CustomProfileFields {
  linkedIn?: string;
  gitHub?: string;
  bloodGroup?: string;
  accountHolderName?: string;
  paymentPreference?: string;
  customNotes?: string;
}

export function parseInternNotes(notesStr: string | null | undefined): CustomProfileFields {
  if (!notesStr) return {};
  const trimmed = notesStr.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed) as CustomProfileFields;
    } catch (e) {
      return { customNotes: notesStr };
    }
  }
  return { customNotes: notesStr };
}

export function serializeInternNotes(data: CustomProfileFields): string {
  return JSON.stringify(data);
}
