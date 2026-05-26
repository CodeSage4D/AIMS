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

function decrypt(textObj: { iv: string; encryptedData: string }): string {
  const iv = Buffer.from(textObj.iv, "hex");
  const encryptedText = Buffer.from(textObj.encryptedData, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf-8");
}

async function main() {
  const code = process.argv[2];
  if (code !== "221102") {
    console.error("CRITICAL ERROR: Unauthorized database restore access.");
    console.error("Please provide the correct restore password as an argument:");
    console.error("  npx tsx prisma/secure-restore.ts <password>");
    process.exit(1);
  }

  console.log("-----------------------------------------------------------------");
  console.log("  AURXON AIMS SECURE DATABASE RESTORE ENGINE");
  console.log("-----------------------------------------------------------------");

  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    console.error("Error: backups/ folder not found. Cannot proceed.");
    process.exit(1);
  }

  // Find all encrypted backups
  const files = fs.readdirSync(backupDir).filter(f => f.startsWith("aims-backup-") && f.endsWith(".enc"));
  if (files.length === 0) {
    console.error("Error: No backup (.enc) files found in backups/ directory.");
    process.exit(1);
  }

  // Get the latest backup file
  files.sort();
  const latestBackupFile = files[files.length - 1];
  const latestBackupPath = path.join(backupDir, latestBackupFile);
  console.log(`Loading latest backup file: ${latestBackupFile}`);

  // Decrypt backup payload
  const rawData = fs.readFileSync(latestBackupPath, "utf-8");
  const encryptedObj = JSON.parse(rawData);
  console.log("Decrypting database backup...");
  const decryptedStr = decrypt(encryptedObj);
  const backup = JSON.parse(decryptedStr);
  console.log(`Backup payload timestamp: ${backup.timestamp}`);

  // 1. Wipe existing databases in safe dependency order
  console.log("Wiping current database records to prepare for clean restore...");
  await prisma.diary.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.todo.deleteMany({});
  await prisma.projectRecord.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.passwordResetRequest.deleteMany({});
  await prisma.leaveApplication.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.generatedDocument.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.intern.deleteMany({});
  await prisma.userPermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.holiday.deleteMany({});
  await prisma.systemSetting.deleteMany({});

  // 2. Hydrate models in safe sequence
  console.log("Restoring users...");
  if (backup.users && backup.users.length > 0) {
    await prisma.user.createMany({ data: backup.users });
  }

  console.log("Restoring user permissions...");
  if (backup.permissions && backup.permissions.length > 0) {
    await prisma.userPermission.createMany({ data: backup.permissions });
  }

  console.log("Restoring system settings...");
  if (backup.systemSettings && backup.systemSettings.length > 0) {
    await prisma.systemSetting.createMany({ data: backup.systemSettings });
  }

  console.log("Restoring holidays...");
  if (backup.holidays && backup.holidays.length > 0) {
    await prisma.holiday.createMany({ data: backup.holidays });
  }

  console.log("Restoring interns...");
  if (backup.interns && backup.interns.length > 0) {
    await prisma.intern.createMany({ data: backup.interns });
  }

  console.log("Restoring tasks...");
  if (backup.tasks && backup.tasks.length > 0) {
    await prisma.task.createMany({ data: backup.tasks });
  }

  console.log("Restoring todos...");
  if (backup.todos && backup.todos.length > 0) {
    await prisma.todo.createMany({ data: backup.todos });
  }

  console.log("Restoring attendance logs...");
  if (backup.attendance && backup.attendance.length > 0) {
    // Correct date formats if parsed as string
    const attendanceData = backup.attendance.map((att: any) => ({
      ...att,
      date: new Date(att.date),
      checkIn: att.checkIn ? new Date(att.checkIn) : null,
      checkOut: att.checkOut ? new Date(att.checkOut) : null
    }));
    await prisma.attendance.createMany({ data: attendanceData });
  }

  console.log("Restoring documents...");
  if (backup.documents && backup.documents.length > 0) {
    await prisma.document.createMany({ data: backup.documents });
  }

  console.log("Restoring generated documents...");
  if (backup.generatedDocuments && backup.generatedDocuments.length > 0) {
    await prisma.generatedDocument.createMany({ data: backup.generatedDocuments });
  }

  console.log("Restoring leave applications...");
  if (backup.leaves && backup.leaves.length > 0) {
    const leavesData = backup.leaves.map((l: any) => ({
      ...l,
      startDate: new Date(l.startDate),
      endDate: new Date(l.endDate),
      requestTime: new Date(l.requestTime)
    }));
    await prisma.leaveApplication.createMany({ data: leavesData });
  }

  console.log("Restoring activity logs...");
  if (backup.logs && backup.logs.length > 0) {
    await prisma.activityLog.createMany({ data: backup.logs });
  }

  console.log("Restoring password reset requests...");
  if (backup.resetRequests && backup.resetRequests.length > 0) {
    await prisma.passwordResetRequest.createMany({ data: backup.resetRequests });
  }

  console.log("Restoring project records...");
  if (backup.projectRecords && backup.projectRecords.length > 0) {
    await prisma.projectRecord.createMany({ data: backup.projectRecords });
  }

  console.log("Restoring diaries...");
  if (backup.diaries && backup.diaries.length > 0) {
    await prisma.diary.createMany({ data: backup.diaries });
  }

  console.log("Restoring projects...");
  if (backup.projects && backup.projects.length > 0) {
    await prisma.project.createMany({ data: backup.projects });
  }

  console.log("-----------------------------------------------------------------");
  console.log("  DATABASE RESTORE COMPLETED SUCCESSFULLY");
  console.log("-----------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Restore failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
