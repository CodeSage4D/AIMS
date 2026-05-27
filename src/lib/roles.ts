export const ROLE_CODES: Record<string, string> = {
  // ==========================================
  // Executive / Founder Level
  // ==========================================
  "Founder": "FND",
  "Co-Founder": "CFD",
  "Director": "DIR",
  "Managing Director (MD)": "MDR",
  "Managing Director": "MDR",
  "Chief Executive Officer (CEO)": "CEO",
  "Chief Operating Officer (COO)": "COO",
  "Chief Technology Officer (CTO)": "CTO",
  "Chief Product Officer (CPO)": "CPO",
  "Chief Strategy Officer (CSO)": "CSO",
  "Chief Financial Officer (CFO)": "CFO",
  "Chief Marketing Officer (CMO)": "CMO",
  "Chief Human Resources Officer (CHRO)": "CHRO",

  // ==========================================
  // Department / Managerial Level
  // ==========================================
  "Head of Operations": "OPS-HD",
  "Head of Talent Acquisition": "TAL-HD",
  "Head of Engineering": "ENG-HD",
  "Head of Product Design": "DSN-HD",
  "Engineering Manager": "ENG-MGR",
  "Product Manager": "PDM",
  "Operations Manager": "OPM",
  "HR Manager": "HRM",
  "Technical Lead": "EDL",
  "Team Lead": "TML",
  "Project Coordinator": "PJC",
  "Department Manager": "DPM",
  "Compliance Manager": "CSM",

  // ==========================================
  // Technical / Engineering Roles
  // ==========================================
  "Software Engineer": "SWE",
  "Full Stack Engineer": "FSE",
  "Frontend Engineer": "FEE",
  "Backend Engineer": "BEE",
  "DevOps Engineer": "DOP",
  "Cloud Engineer": "CLD",
  "AI Engineer": "AIM",
  "Cybersecurity Engineer": "CSE",
  "UI/UX Designer": "UXD",
  "Product Designer": "PRD",
  "QA Engineer": "QAE",

  // ==========================================
  // Backwards Compatibility & Special/Combined Business Roles
  // ==========================================
  "Head Talent": "HDT",
  "Head Operations": "HOS",
  "Talent Acquisition Manager": "TAM",
  "Coordinator": "COR",
  "Engineer": "ENG",
  "Employee": "EMP",
  "Intern": "INT",
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
  "DevOps Developer": "DOP",
  "Cloud Architect": "CLD",
  "Cyber Security": "CSE",
  "Ethical Hacker": "ETH",
  "Blockchain Developer": "BCD",
  "Game Developer": "GMD",
  "Graphic Designer": "GRD",
  "Motion Designer": "MOD",
  "Video Editor": "VED",
  "3D Artist": "ART",
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
  "Human Resources": "HRS",
  "Operations Executive": "OPS",
  "Marketing Intern": "MKT",
  "Sales Executive": "SLS",
  "Business Development": "BDE",
  "Content Writer": "CWT",
  "Social Media Manager": "SMM",
  "Talent Acquisition Specialist": "TAC",
  "Customer Support": "CSP"
};

export interface RoleMeta {
  roleName: string;
  shortCode: string;
  accessLevel: string;
  appointmentSource: "Founder-appointed" | "HR-appointed" | "system-assigned";
}

export function registerRoleCodeOverrides(overrides: Record<string, string>) {
  for (const [key, value] of Object.entries(overrides)) {
    if (key && value) {
      ROLE_CODES[key] = value.toUpperCase();
    }
  }
}

export function isExecutiveRole(roleDomain: string): boolean {
  const name = (roleDomain || "").trim().toLowerCase();
  return (
    name === "founder" ||
    name === "co-founder" ||
    name === "director" ||
    name === "managing director" ||
    name === "managing director (md)" ||
    name === "chief executive officer (ceo)" ||
    name === "chief operating officer (coo)" ||
    name === "chief technology officer (cto)" ||
    name === "chief product officer (cpo)" ||
    name === "chief strategy officer (cso)" ||
    name === "chief financial officer (cfo)" ||
    name === "chief marketing officer (cmo)" ||
    name === "chief human resources officer (chro)" ||
    name === "ceo" ||
    name === "cto" ||
    name === "coo" ||
    name === "cfo" ||
    name === "cpo"
  );
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
    lower.includes("director") ||
    lower.includes("chief") ||
    lower === "ceo" ||
    lower === "cto" ||
    lower === "coo" ||
    lower === "cfo" ||
    lower === "cpo"
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
    isExecutiveRole(name) ||
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
    isExecutiveRole(name) ||
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
  return isExecutiveRole(roleDomain) || getRoleMeta(roleDomain).appointmentSource === "Founder-appointed";
}

export function getDefaultPermissionsForRoleDomain(roleDomain: string): Record<string, boolean> {
  const name = (roleDomain || "").trim();
  const isExec = isExecutiveRole(name);
  const lower = name.toLowerCase();
  const isHR = lower.includes("hr") || lower.includes("talent") || lower.includes("human resources");
  const isManager = lower.includes("manager") || lower.includes("head") || lower.includes("lead");

  if (isExec) {
    const isTopExec = lower.includes("founder") || lower.includes("ceo") || lower === "ceo";
    return {
      dashboardAccess: true,
      attendanceAccess: true,
      taskAccess: true,
      documentAccess: true,
      approvalAccess: true,
      settingsAccess: isTopExec,
      analyticsAccess: true,
      onboardingAccess: true,
    };
  }

  if (isHR) {
    return {
      dashboardAccess: true,
      attendanceAccess: true,
      taskAccess: true,
      documentAccess: true,
      approvalAccess: true,
      settingsAccess: false,
      analyticsAccess: true,
      onboardingAccess: true,
    };
  }

  if (isManager) {
    return {
      dashboardAccess: true,
      attendanceAccess: true,
      taskAccess: true,
      documentAccess: true,
      approvalAccess: true,
      settingsAccess: false,
      analyticsAccess: true,
      onboardingAccess: false,
    };
  }

  // Standard technical / engineering roles (Engineers, Designers, QAs, etc.)
  return {
    dashboardAccess: true,
    attendanceAccess: true,
    taskAccess: true,
    documentAccess: true,
    approvalAccess: false,
    settingsAccess: false,
    analyticsAccess: false,
    onboardingAccess: false,
  };
}

export interface CustomProfileFields {
  linkedIn?: string;
  gitHub?: string;
  instagram?: string;
  bloodGroup?: string;
  accountHolderName?: string;
  paymentPreference?: string;
  customNotes?: string;
  pictureUrl?: string;
  onboardingSkipped?: boolean;
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

