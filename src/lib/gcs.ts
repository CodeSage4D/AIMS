import { Storage } from "@google-cloud/storage";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface GcsUploadResult {
  fileId: string;
  storagePath: string;
  bucketUsed: string;
  sha256Hash: string;
  fileSize: number;
}

// Credentials structure
const projectId = process.env.GCS_PROJECT_ID;
const clientEmail = process.env.GCS_CLIENT_EMAIL;
const privateKey = process.env.GCS_PRIVATE_KEY;
const primaryBucketName = process.env.GCS_BUCKET_NAME || "aurxon-vault-primary";
const backupBucketName = process.env.GCS_BACKUP_BUCKET_NAME || "aurxon-vault-backup";

// Is GCP credentials configured?
const isRealGcsConfigured = !!(projectId && clientEmail && privateKey);

// Initialize GCS storage client if configured
let storageClient: Storage | null = null;
if (isRealGcsConfigured) {
  try {
    storageClient = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey!.replace(/\\n/g, "\n"),
      },
    });
    console.info("Google Cloud Storage client initialized successfully for production mode.");
  } catch (error) {
    console.error("GCS Initialization failed. Operating in fallback simulation mode:", error);
  }
} else {
  console.info("GCS environment variables missing. AIMS secure document vault is operating in high-fidelity mock simulation mode.");
}

// Local simulation directory within workspace
const SIMULATION_DIR = path.join(process.cwd(), "scratch", "mock_gcs");

// Helper to ensure simulation directories exist
function ensureDirExists(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

/**
 * Uploads a buffer to Google Cloud Storage (with backup bucket failover strategy).
 * Automatically handles offline simulation if GCP is not configured.
 */
export async function uploadToGcs(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  internId: string,
  category: string
): Promise<GcsUploadResult> {
  const fileId = crypto.randomUUID();
  const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const fileSize = buffer.length;

  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const uniquePrefix = `${Date.now()}-${crypto.randomInt(1000, 9999)}`;
  const storagePath = `aims/vault/${internId}/${category}/${uniquePrefix}-${cleanFileName}`;

  // 1. Simulated Mode Fallback
  if (!isRealGcsConfigured || !storageClient) {
    console.log(`[SIMULATED GCS UPLOAD] Destination: ${primaryBucketName}/${storagePath}`);
    const localFilePath = path.join(SIMULATION_DIR, primaryBucketName, storagePath);
    ensureDirExists(localFilePath);
    fs.writeFileSync(localFilePath, buffer);

    return {
      fileId,
      storagePath,
      bucketUsed: primaryBucketName,
      sha256Hash,
      fileSize,
    };
  }

  // 2. Production GCS Mode with Backup bucket strategy
  let bucketUsed = primaryBucketName;
  try {
    console.log(`[GCS UPLOAD] Attempting upload to primary bucket: ${primaryBucketName}`);
    const bucket = storageClient.bucket(primaryBucketName);
    const file = bucket.file(storagePath);
    
    await file.save(buffer, {
      contentType: mimeType,
      metadata: {
        metadata: {
          sha256Hash,
          fileId,
          internId,
          category,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    console.info(`[GCS UPLOAD SUCCESS] Uploaded to primary bucket: ${primaryBucketName}/${storagePath}`);
    return {
      fileId,
      storagePath,
      bucketUsed,
      sha256Hash,
      fileSize,
    };
  } catch (primaryError) {
    console.error(`[GCS PRIMARY FAILED] Upload to primary bucket failed. Triggering backup failover bucket strategy.`, primaryError);
    
    if (backupBucketName) {
      bucketUsed = backupBucketName;
      try {
        console.log(`[GCS BACKUP UPLOAD] Attempting upload to backup bucket: ${backupBucketName}`);
        const backupBucket = storageClient.bucket(backupBucketName);
        const backupFile = backupBucket.file(storagePath);
        
        await backupFile.save(buffer, {
          contentType: mimeType,
          metadata: {
            metadata: {
              sha256Hash,
              fileId,
              internId,
              category,
              uploadedAt: new Date().toISOString(),
              isBackupBucket: "true",
            },
          },
        });

        console.info(`[GCS BACKUP SUCCESS] Uploaded successfully to backup bucket: ${backupBucketName}/${storagePath}`);
        return {
          fileId,
          storagePath,
          bucketUsed,
          sha256Hash,
          fileSize,
        };
      } catch (backupError) {
        console.error(`[GCS BACKUP CRITICAL FAILED] Failed to write to backup bucket. Falling back to local vault simulation.`, backupError);
        // Fail-safe: if both primary and backup buckets fail in production, trigger disaster-recovery local caching
        const localFilePath = path.join(SIMULATION_DIR, "disaster_recovery", storagePath);
        ensureDirExists(localFilePath);
        fs.writeFileSync(localFilePath, buffer);
        
        return {
          fileId,
          storagePath,
          bucketUsed: "disaster_recovery",
          sha256Hash,
          fileSize,
        };
      }
    } else {
      throw new Error(`GCS upload failed: Primary bucket failed and no backup bucket configured.`);
    }
  }
}

/**
 * Generates a secure, temporary V4 signed read URL for a file in GCS.
 * Automatically handles simulation mode fallback by serving a local dev-route path.
 */
export async function getGcsSignedUrl(
  storagePath: string,
  bucketName: string,
  expiresMinutes = 15
): Promise<string> {
  const bucketToUse = bucketName || primaryBucketName;

  // 1. Simulation Mode URL Fallback
  if (!isRealGcsConfigured || !storageClient || bucketToUse === "disaster_recovery" || bucketToUse === "aurxon-vault-primary" || bucketToUse === "aurxon-vault-backup") {
    // Generate a secure proxy URL to stream simulation file
    return `/api/documents/mock-gcs?storagePath=${encodeURIComponent(storagePath)}&bucket=${encodeURIComponent(bucketToUse)}`;
  }

  // 2. Production signed URL generation
  try {
    const expires = Date.now() + expiresMinutes * 60 * 1000;
    const [url] = await storageClient
      .bucket(bucketToUse)
      .file(storagePath)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires,
      });

    return url;
  } catch (error) {
    console.error(`[GCS SIGNED URL ERROR] Failed to generate signed URL for path ${storagePath}`, error);
    // Secure fallback proxy in case of transient API errors
    return `/api/documents/mock-gcs?storagePath=${encodeURIComponent(storagePath)}&bucket=${encodeURIComponent(bucketToUse)}`;
  }
}

/**
 * Deletes a file from GCS or simulation storage.
 */
export async function deleteFromGcs(storagePath: string, bucketName: string): Promise<boolean> {
  const bucketToUse = bucketName || primaryBucketName;

  if (!isRealGcsConfigured || !storageClient || bucketToUse === "disaster_recovery" || bucketToUse === "aurxon-vault-primary" || bucketToUse === "aurxon-vault-backup") {
    try {
      const localFilePath = path.join(SIMULATION_DIR, bucketToUse, storagePath);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log(`[SIMULATED GCS DELETE] Successfully deleted: ${localFilePath}`);
        return true;
      }
    } catch (e) {
      console.error("[SIMULATED GCS DELETE ERROR]", e);
    }
    return false;
  }

  try {
    await storageClient.bucket(bucketToUse).file(storagePath).delete();
    console.info(`[GCS DELETE SUCCESS] Deleted ${storagePath} from bucket ${bucketToUse}`);
    return true;
  } catch (error) {
    console.error(`[GCS DELETE ERROR] Failed to delete ${storagePath} from bucket ${bucketToUse}`, error);
    return false;
  }
}

/**
 * Streams a mock file buffer from simulated local path.
 */
export function getSimulatedFileBuffer(storagePath: string, bucketName: string): Buffer {
  const localFilePath = path.join(SIMULATION_DIR, bucketName || primaryBucketName, storagePath);
  if (fs.existsSync(localFilePath)) {
    return fs.readFileSync(localFilePath);
  }
  throw new Error(`Simulated file not found at ${localFilePath}`);
}
