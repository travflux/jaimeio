import { getDb } from "../db";
import { licenseSettings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function getLicenseSetting(licenseId: number, key: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db.select().from(licenseSettings)
    .where(and(eq(licenseSettings.licenseId, licenseId), eq(licenseSettings.key, key)))
    .limit(1);
  return row?.value ?? null;
}

export async function getResendClient(licenseId?: number) {
  let apiKey: string | null = null;
  if (licenseId) {
    apiKey = await getLicenseSetting(licenseId, "resend_api_key");
  }
  if (!apiKey) {
    apiKey = process.env.RESEND_API_KEY || null;
  }
  if (!apiKey) return null;
  const { Resend } = await import("resend");
  return new Resend(apiKey);
}

export async function getSmsClient(licenseId?: number) {
  let sid: string | null = null;
  let token: string | null = null;
  let phone: string | null = null;

  if (licenseId) {
    sid = await getLicenseSetting(licenseId, "twilio_account_sid");
    token = await getLicenseSetting(licenseId, "twilio_auth_token");
    phone = await getLicenseSetting(licenseId, "twilio_phone_number");
  }
  if (!sid) sid = process.env.TWILIO_ACCOUNT_SID || null;
  if (!token) token = process.env.TWILIO_AUTH_TOKEN || null;
  if (!phone) phone = process.env.TWILIO_PHONE_NUMBER || null;

  if (!sid || !token || !phone) return null;
  return { sid, token, phone };
}

export async function sendEmail(
  licenseId: number | undefined,
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<{ success: boolean; error?: string }> {
  const resend = await getResendClient(licenseId);
  if (!resend) return { success: false, error: "No email provider configured" };

  const isStaging = process.env.JAIME_ENV === "staging";
  const finalSubject = isStaging ? `[STAGING] ${subject}` : subject;

  try {
    await resend.emails.send({
      from: from || "JAIME.IO <noreply@getjaime.io>",
      to,
      subject: finalSubject,
      html,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function sendWelcomeEmail(
  licenseId: number,
  to: string,
  name: string,
  subdomain: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to JAIME.IO</h1>
      </div>
      <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p>Hi ${name},</p>
        <p>Your account has been created for the publication at <strong>${subdomain}.getjaime.io</strong>.</p>
        <p>You can log in at:</p>
        <p><a href="https://${subdomain}.getjaime.io" style="color: #0f172a; font-weight: bold;">https://${subdomain}.getjaime.io</a></p>
        <p style="color: #64748b; font-size: 14px; margin-top: 32px;">— The JAIME.IO Platform</p>
      </div>
    </div>
  `;
  return sendEmail(licenseId, to, `Welcome to ${subdomain}.getjaime.io`, html);
}

export async function sendApprovalNotification(
  licenseId: number,
  approverEmail: string,
  articleTitle: string,
  articleAdminUrl: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Article Ready for Review</h1>
      </div>
      <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p>A new article is ready for your review:</p>
        <p style="font-size: 18px; font-weight: bold;">${articleTitle}</p>
        <p><a href="${articleAdminUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Review Article</a></p>
        <p style="color: #64748b; font-size: 14px; margin-top: 32px;">— The JAIME.IO Platform</p>
      </div>
    </div>
  `;
  return sendEmail(licenseId, approverEmail, `Review: ${articleTitle}`, html);
}
