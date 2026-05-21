import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Manually load .env variables
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed) continue;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join("=").trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient({
  ...(process.env.DATABASE_URL?.startsWith("prisma+postgres://")
    ? { accelerateUrl: process.env.DATABASE_URL }
    : {}),
} as any);

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DESTRUCTIVE_DB_SCRIPTS !== "true") {
    console.error("CRITICAL ERROR: Destructive database operations are BLOCKED in production.");
    console.error("To override this guard, set the environment variable: ALLOW_DESTRUCTIVE_DB_SCRIPTS='true'");
    process.exit(1);
  }

  console.log("-----------------------------------------------------------------");
  console.log("  AURXON AIMS DATABASE BACKUP & WIPE ENGINE ENGAGED");
  console.log("-----------------------------------------------------------------");

  // 1. Fetch all interns for backup
  console.log("Fetching intern records for backup...");
  const interns = await prisma.intern.findMany({
    include: {
      supervisor: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (interns.length > 0) {
    console.log(`Found ${interns.length} interns. Creating CSV backup...`);
    
    // Generate CSV Header
    const headers = [
      "ID",
      "Full Name",
      "Gender",
      "Date of Birth",
      "Email",
      "Phone Number",
      "Address",
      "City",
      "State",
      "Country",
      "University",
      "Degree",
      "Department",
      "Role Domain",
      "Batch Semester",
      "Start Date",
      "End Date",
      "Status",
      "Stipend Amount",
      "Payment Status",
      "Document Status",
      "Emergency Contact Name",
      "Emergency Contact Number",
      "Skills",
      "Performance Score",
      "Performance Notes",
      "Notes",
      "Supervisor Name",
      "Supervisor Email"
    ];

    // Map rows
    const rows = interns.map((intern) => {
      const escape = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };
      
      const skillsStr = Array.isArray(intern.skills) ? intern.skills.join(", ") : "";

      return [
        escape(intern.id),
        escape(intern.fullName),
        escape(intern.gender),
        escape(intern.dateOfBirth instanceof Date ? intern.dateOfBirth.toISOString().split("T")[0] : intern.dateOfBirth),
        escape(intern.email),
        escape(intern.phoneNumber),
        escape(intern.address),
        escape(intern.city),
        escape(intern.state),
        escape(intern.country),
        escape(intern.university),
        escape(intern.degree),
        escape(intern.department),
        escape(intern.roleDomain),
        escape(intern.batchSemester),
        escape(intern.startDate instanceof Date ? intern.startDate.toISOString().split("T")[0] : intern.startDate),
        escape(intern.endDate instanceof Date ? intern.endDate.toISOString().split("T")[0] : intern.endDate),
        escape(intern.status),
        escape(intern.stipendAmount ? Number(intern.stipendAmount) : 0),
        escape(intern.paymentStatus),
        escape(intern.documentStatus),
        escape(intern.emergencyContactName),
        escape(intern.emergencyContactNumber),
        escape(skillsStr),
        escape(intern.performanceScore),
        escape(intern.performanceNotes),
        escape(intern.notes),
        escape(intern.supervisor?.fullName),
        escape(intern.supervisor?.email)
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const backupPath = path.join(process.cwd(), "aurxon_interns_backup.csv");
    fs.writeFileSync(backupPath, csvContent, "utf-8");
    console.log(`Backup CSV successfully created at: ${backupPath}`);
  } else {
    console.log("No interns found in the database. Skipping CSV backup creation.");
  }

  // 2. Clear data (excluding Users)
  console.log("Wiping existing operational records...");
  
  const deletedLogs = await prisma.activityLog.deleteMany({});
  console.log(`Deleted ${deletedLogs.count} activity log records.`);
  
  const deletedDocs = await prisma.document.deleteMany({});
  console.log(`Deleted ${deletedDocs.count} document records.`);
  
  const deletedTasks = await prisma.task.deleteMany({});
  console.log(`Deleted ${deletedTasks.count} task records.`);
  
  const deletedAttendance = await prisma.attendance.deleteMany({});
  console.log(`Deleted ${deletedAttendance.count} attendance records.`);
  
  const deletedInterns = await prisma.intern.deleteMany({});
  console.log(`Deleted ${deletedInterns.count} intern records.`);

  console.log("-----------------------------------------------------------------");
  console.log("  DATABASE OPERATIONAL DATA WIPED successfully.");
  console.log("  (System users remain intact so you can still log in!)");
  console.log("-----------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Critical error in database clear and backup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
