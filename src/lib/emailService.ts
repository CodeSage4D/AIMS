/**
 * Centralized Automated Email Notification Service for AURXON AIMS
 * Integrates beautiful branded templates, records logs to db.emailLog,
 * and maintains clean fallback mechanisms for production optimization.
 */

import { db } from "@/lib/db";

interface EmailPayload {
  recipient: string;
  subject: string;
  template: string;
  htmlBody: string;
}

/**
 * Renders the responsive corporate AURXON branded frame wrapper
 */
function getBrandedWrapper(title: string, bodyContent: string, actionUrl?: string, actionLabel?: string): string {
  const buttonHtml = actionUrl && actionLabel ? `
    <div style="margin: 30px 0; text-align: center;">
      <a href="${actionUrl}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px rgba(2, 132, 199, 0.15); transition: background-color 0.2s;">
        ${actionLabel}
      </a>
    </div>
  ` : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f8fafc; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.05); overflow: hidden;">
              <!-- Header Bar -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px;">AURXON</h1>
                  <p style="color: #38bdf8; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Corporate Workforce Management</p>
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 40px 30px; font-size: 15px; line-height: 1.6; color: #334155;">
                  <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 20px; font-size: 18px; font-weight: 700;">${title}</h2>
                  ${bodyContent}
                  ${buttonHtml}
                </td>
              </tr>
              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f1f5f9; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                  <p style="margin: 0; font-weight: 600;">AURXON DB & Software Systems Inc.</p>
                  <p style="margin: 4px 0 0 0;">This is an automated production notification. Please do not reply directly to this mail.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Central low-overhead dispatcher
 */
async function dispatchEmail(payload: EmailPayload): Promise<void> {
  let status = "SENT";
  let errorMessage: string | null = null;

  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      // Lazy load nodemailer dynamically using eval to prevent Turbopack compile-time resolution warnings
      const nodemailer = await eval('import("nodemailer")');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort) || 587,
        secure: smtpPort === "465",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"AURXON Operations" <${smtpUser}>`,
        to: payload.recipient,
        subject: payload.subject,
        html: payload.htmlBody,
      });
    } else {
      // In development or when SMTP is not configured, we simulate dispatch.
      // Omit full HTML body to keep production/console logs clean.
      console.log(`[SMTP SIMULATOR] Dispatching ${payload.template} notification to ${payload.recipient}. Subject: "${payload.subject}". (Saved in EmailLog DB table)`);
    }
  } catch (error: any) {
    status = "FAILED";
    errorMessage = error?.message || "Unknown SMTP dispatch error";
    // Minimal error log in production
    console.error(`[SMTP ERROR] Failed to dispatch ${payload.template} to ${payload.recipient}: ${errorMessage}`);
  }

  // Persist record in database for audit compliance
  try {
    await db.emailLog.create({
      data: {
        recipient: payload.recipient,
        subject: payload.subject,
        template: payload.template,
        status,
        errorMessage,
      },
    });
  } catch (dbError) {
    console.error("[DATABASE ERROR] Failed to log EmailLog:", dbError);
  }
}

/**
 * Onboarding confirmation with credentials
 */
export async function sendOnboardingWelcomeEmail(intern: { fullName: string; email: string; internId: string }, defaultPassword: string, dashboardUrl: string) {
  const title = "Welcome to the AURXON Workforce Portal";
  const bodyContent = `
    <p>We are thrilled to officially welcome you to the <strong>AURXON</strong> family! Your administrative member profile has been registered and verified.</p>
    
    <table border="0" cellpadding="10" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <tr>
        <td style="font-weight: bold; width: 40%;">Intern ID:</td>
        <td><code>${intern.internId}</code></td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Registered Email:</td>
        <td><code>${intern.email}</code></td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Temporary Password:</td>
        <td><code>${defaultPassword}</code></td>
      </tr>
    </table>
    
    <p style="color: #e11d48; font-weight: 600;">Security Notice: You will be prompted to change this temporary password immediately upon your first check-in for account protection.</p>
  `;

  await dispatchEmail({
    recipient: intern.email,
    subject: `🚀 Welcome to AURXON - Onboarding Confirmed [ID: ${intern.internId}]`,
    template: "ONBOARDING_WELCOME",
    htmlBody: getBrandedWrapper(title, bodyContent, dashboardUrl, "Access Portal Workspace"),
  });
}

/**
 * Task Assigned Email
 */
export async function sendTaskAssignedEmail(intern: { fullName: string; email: string }, task: { title: string; deadline: Date | string }, tasksUrl: string) {
  const formattedDeadline = new Date(task.deadline).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const title = "New Production Task Assigned";
  const bodyContent = `
    <p>Hello ${intern.fullName},</p>
    <p>A new engineering ticket or task has been assigned to your active queue. Please review the requirements and submit progress before the deadline.</p>
    
    <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 15px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 16px; color: #0f172a;">${task.title}</p>
      <p style="margin: 0; font-size: 13px; color: #64748b;">Deadline: ${formattedDeadline}</p>
    </div>
    
    <p>Kindly maintain structured updates on the task status (In Progress, In Review) within your active dashboard.</p>
  `;

  await dispatchEmail({
    recipient: intern.email,
    subject: `📋 Task Assigned: ${task.title}`,
    template: "TASK_ASSIGNED",
    htmlBody: getBrandedWrapper(title, bodyContent, tasksUrl, "View Task Board"),
  });
}

/**
 * Password Reset Email
 */
export async function sendPasswordResetEmail(intern: { fullName: string; email: string }, tempPassword: string, loginUrl: string) {
  const title = "Temporary Passcode Issued";
  const bodyContent = `
    <p>Hello ${intern.fullName},</p>
    <p>An administrative password reset has been triggered for your workspace account. A temporary passcode has been safely generated.</p>
    
    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #9f1239; font-weight: 600;">Your Temporary Password:</p>
      <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 20px; font-weight: bold; color: #be123c; letter-spacing: 1px;">${tempPassword}</p>
    </div>
    
    <p>Please log in and adjust your credentials under settings immediately.</p>
  `;

  await dispatchEmail({
    recipient: intern.email,
    subject: "🔒 Security Alert: AIMS Password Reset Resolved",
    template: "PASSWORD_RESET",
    htmlBody: getBrandedWrapper(title, bodyContent, loginUrl, "Log In to Workspace"),
  });
}

/**
 * Document Verification Approval Update
 */
export async function sendDocumentVerificationEmail(intern: { fullName: string; email: string }, documentType: string, verified: boolean, vaultUrl: string) {
  const title = `Compliance Document ${verified ? 'Approved' : 'Rejected'}`;
  const bodyContent = verified
    ? `<p>Hello ${intern.fullName},</p><p>We are pleased to inform you that your uploaded <strong>${documentType}</strong> compliance file has been successfully audited and approved by HR/Admin operations.</p>`
    : `<p>Hello ${intern.fullName},</p><p style="color: #be123c;">Your uploaded <strong>${documentType}</strong> has been rejected during administrative review due to formatting or resolution issues. Please re-upload a clean, high-contrast file under 100 KB in size.</p>`;

  await dispatchEmail({
    recipient: intern.email,
    subject: `📂 Document Auditing: ${documentType} ${verified ? 'Approved' : 'Action Required'}`,
    template: "DOCUMENT_VERIFIED",
    htmlBody: getBrandedWrapper(title, bodyContent, vaultUrl, "Go to Document Vault"),
  });
}

/**
 * Auto-Generated Document Approval Notification
 */
export async function sendDocumentApprovedEmail(intern: { fullName: string; email: string }, documentType: string, vaultUrl: string) {
  const title = `Official ${documentType} Digitally Signed`;
  const bodyContent = `
    <p>Hello ${intern.fullName},</p>
    <p>Your official <strong>${documentType}</strong> has been digitally reviewed, approved, and signed by the Founder. It is now finalized and available as a legally certified document.</p>
    
    <p>You can view, print, or download this signed credential directly from the "Verified Documents" tab in your workspace dashboard.</p>
  `;

  await dispatchEmail({
    recipient: intern.email,
    subject: `📄 Finalized: Your ${documentType} is Approved & Signed`,
    template: "DOCUMENT_APPROVED",
    htmlBody: getBrandedWrapper(title, bodyContent, vaultUrl, "Download Document"),
  });
}
