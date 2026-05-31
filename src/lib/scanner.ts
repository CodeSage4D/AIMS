/**
 * AURXON AIMS - Enterprise Malware & Threat Scanner Hook
 *
 * Implements a signature-based inline malware check on document buffers
 * before they are written to Google Cloud Storage.
 */

export interface ScanResult {
  clean: boolean;
  threatName?: string;
  scannedAt: Date;
  details?: string;
}

// EICAR Standard Anti-Virus Test File string (standard test signature for scanner hooks)
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

/**
 * Scans a file buffer for known malicious patterns and signatures.
 * 
 * @param buffer File content buffer
 * @param fileName Original file name
 * @param mimeType Declared MIME type
 * @returns ScanResult indicating if the file is safe
 */
export async function scanFileBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ScanResult> {
  const scannedAt = new Date();
  
  try {
    // 1. Convert subset of buffer to text for signature checks
    const contentText = buffer.toString("utf-8");
    const contentStringAscii = buffer.toString("ascii");

    // 2. Check for EICAR test signature
    if (contentText.includes(EICAR_SIGNATURE) || contentStringAscii.includes(EICAR_SIGNATURE)) {
      return {
        clean: false,
        threatName: "EICAR-Test-Signature (VirusDetected)",
        scannedAt,
        details: "Security threat identified matching standard EICAR test signature.",
      };
    }

    // 3. High-fidelity PDF structure checks: block suspicious embedded Javascript blocks
    if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
      // PDF dangerous actions checks: /JS or /JavaScript or /Launch patterns
      if (
        contentText.includes("/JS ") ||
        contentText.includes("/JavaScript") ||
        contentText.includes("/Launch")
      ) {
        return {
          clean: false,
          threatName: "Suspicious-PDF-ActiveContent-Exploit",
          scannedAt,
          details: "File contains active executable elements (/JS or /JavaScript blocks) in a static PDF upload.",
        };
      }
    }

    // 4. Check for double extension execution tricks (e.g. file.pdf.exe)
    const lowerName = fileName.toLowerCase();
    if (
      lowerName.endsWith(".exe") ||
      lowerName.endsWith(".bat") ||
      lowerName.endsWith(".sh") ||
      lowerName.endsWith(".scr") ||
      lowerName.endsWith(".js") ||
      lowerName.endsWith(".vbs")
    ) {
      return {
        clean: false,
        threatName: "Executable-Masquerade-Threat",
        scannedAt,
        details: "Blocked due to executable extension masquerading as a document upload.",
      };
    }

    // 5. Successful scan pass
    return {
      clean: true,
      scannedAt,
      details: "Signature scan passed. No active threats or anomalies detected.",
    };
  } catch (error: any) {
    console.error("Malware scan error:", error);
    // Secure by default: if scanner raises exceptions, fail closed.
    return {
      clean: false,
      threatName: "Scanner-Failure-SafeMode-Triggered",
      scannedAt,
      details: `Scanning failed: ${error.message || error}`,
    };
  }
}
