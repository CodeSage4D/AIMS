import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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

const prisma = new PrismaClient();

// AES Encryption settings
const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(process.env.FOUNDER_RECOVERY_KEY || "aims-default-secure-passphrase-2026")
  .digest(); // 32 bytes key

function encrypt(text: string): { iv: string; encryptedData: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted,
  };
}

async function main() {
  const code = process.argv[2];
  if (code !== "221102") {
    console.error("CRITICAL ERROR: Unauthorized database backup access.");
    console.error("Please provide the correct backup password as an argument:");
    console.error("  npx tsx prisma/secure-backup.ts <password>");
    process.exit(1);
  }

  console.log("-----------------------------------------------------------------");
  console.log("  AURXON AIMS SECURE DATABASE BACKUP ENGINE");
  console.log("-----------------------------------------------------------------");

  // Create backups directories if not exist
  const backupDir = path.join(process.cwd(), "backups");
  const offlineDir = path.join(backupDir, "offline-records");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  if (!fs.existsSync(offlineDir)) fs.mkdirSync(offlineDir);

  // 1. Fetch data from all tables
  console.log("Exporting database tables...");
  const users = await prisma.user.findMany();
  const permissions = await prisma.userPermission.findMany();
  const interns = await prisma.intern.findMany();
  const tasks = await prisma.task.findMany();
  const todos = await prisma.todo.findMany();
  const attendance = await prisma.attendance.findMany();
  const documents = await prisma.document.findMany();
  const generatedDocuments = await prisma.generatedDocument.findMany();
  const leaves = await prisma.leaveApplication.findMany();
  const logs = await prisma.activityLog.findMany();
  const resetRequests = await prisma.passwordResetRequest.findMany();
  const holidays = await prisma.holiday.findMany();
  const systemSettings = await prisma.systemSetting.findMany();
  const projectRecords = await prisma.projectRecord.findMany();
  const diaries = await prisma.diary.findMany();
  const projects = await prisma.project.findMany();

  const backupPayload = {
    timestamp: new Date().toISOString(),
    users,
    permissions,
    interns,
    tasks,
    todos,
    attendance,
    documents,
    generatedDocuments,
    leaves,
    logs,
    resetRequests,
    holidays,
    systemSettings,
    projectRecords,
    diaries,
    projects
  };

  // 2. Encrypt the backup payload for security
  console.log("Encrypting backup database payload...");
  const serialized = JSON.stringify(backupPayload);
  const encrypted = encrypt(serialized);

  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
  const encryptedBackupPath = path.join(backupDir, `aims-backup-${timestampStr}.enc`);
  fs.writeFileSync(encryptedBackupPath, JSON.stringify(encrypted), "utf-8");
  console.log(`[SECURE] Encrypted database backup saved to: ${encryptedBackupPath}`);

  // 3. Generate offline human-readable CSV summaries for quick PC access
  console.log("Generating offline human-readable CSV files...");

  // Interns CSV
  if (interns.length > 0) {
    const internHeaders = ["ID", "Full Name", "Email", "Phone Number", "Role Domain", "Status", "University"];
    const internRows = interns.map(i => [
      `"${i.internId}"`,
      `"${i.fullName}"`,
      `"${i.email}"`,
      `"${i.phoneNumber}"`,
      `"${i.roleDomain}"`,
      `"${i.status}"`,
      `"${i.university}"`
    ].join(","));
    fs.writeFileSync(
      path.join(offlineDir, "offline-interns-summary.csv"),
      [internHeaders.join(","), ...internRows].join("\n"),
      "utf-8"
    );
    console.log(`[OFFLINE RECORD] Intern summary written to offline-records/offline-interns-summary.csv`);
  }

  // Users CSV
  if (users.length > 0) {
    const userHeaders = ["ID", "Full Name", "Email", "Role", "Status"];
    const userRows = users.map(u => [
      `"${u.id}"`,
      `"${u.fullName}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${u.status}"`
    ].join(","));
    fs.writeFileSync(
      path.join(offlineDir, "offline-users-summary.csv"),
      [userHeaders.join(","), ...userRows].join("\n"),
      "utf-8"
    );
    console.log(`[OFFLINE RECORD] User summary written to offline-records/offline-users-summary.csv`);
  }

  console.log("-----------------------------------------------------------------");
  console.log("  SECURE DATABASE BACKUP COMPLETED");
  console.log("-----------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Backup failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
