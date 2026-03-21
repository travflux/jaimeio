/**
 * Newsletter Weekly Digest
 *
 * Sends a Sunday 10am ET email to all active subscribers featuring the top 10
 * articles from the past week. Uses Resend for delivery.
 *
 * White-label compatible: all brand values read from settings / env vars.
 * API key sourced from platform_credentials table (platform="resend"), falling
 * back to RESEND_API_KEY env var for backwards compatibility.
 *
 * CAN-SPAM compliant:
 * - Physical address in footer (configurable via brand_address setting)
 * - One-click unsubscribe link (/unsubscribe?email=...)
 * - Clear "You're receiving this because you subscribed" copy
 */

import { getDb, getSetting, listSubscribers } from "./db";
import { articles, platformCredentials, newsletterSendHistory } from "../drizzle/schema";
import { eq, gte, desc, and } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DigestArticle {
  slug: string;
  headline: string;
  subheadline: string | null;
  featuredImage: string | null;
  publishedAt: Date | null;
}

interface DigestResult {
  sent: number;
  skipped: number;
  errors: number;
  reason?: string;
}

// ─── Brand helpers ────────────────────────────────────────────────────────────

async function getBrandConfig() {
  const [siteName, tagline, siteUrl, address, fromEmail, fromName] = await Promise.all([
    getSetting("brand_site_name"),
    getSetting("brand_tagline"),
    getSetting("brand_site_url"),
    getSetting("brand_address"),
    getSetting("newsletter_from_email"),
    getSetting("newsletter_from_name"),
  ]);
  return {
    siteName: siteName?.value || process.env.VITE_APP_TITLE || "",
    tagline: tagline?.value || "The News, Remastered.",
    siteUrl: siteUrl?.value || process.env.SITE_URL || "",
    address: address?.value || process.env.NEWSLETTER_ADDRESS || "",
    fromEmail: fromEmail?.value || process.env.NEWSLETTER_FROM_EMAIL || "",
    fromName: fromName?.value || process.env.NEWSLETTER_FROM_NAME || process.env.VITE_APP_TITLE || "",
  };
}

// ─── Resend key resolver (platform_credentials → env fallback) ────────────────

async function getResendApiKey(): Promise<string | null> {
  try {
    const db = await getDb();
    if (db) {
      const [cred] = await db
        .select()
        .from(platformCredentials)
        .where(eq(platformCredentials.platform, "resend"))
        .limit(1);
      if (cred?.apiKey && cred.isActive) return cred.apiKey;
    }
  } catch { /* fall through to env */ }
  return process.env.RESEND_API_KEY || null;
}

// ─── Article fetcher (top 10 by views, last 7 days) ──────────────────────────

async function getWeeklyTopArticles(): Promise<DigestArticle[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db
    .select({
      slug: articles.slug,
      headline: articles.headline,
      subheadline: articles.subheadline,
      featuredImage: articles.featuredImage,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(and(
      eq(articles.status, "published"),
      gte(articles.publishedAt, cutoff)
    ))
    .orderBy(desc(articles.views))
    .limit(10);
}

// ─── HTML email template ──────────────────────────────────────────────────────

function buildDigestHtml(brand: Awaited<ReturnType<typeof getBrandConfig>>, arts: DigestArticle[], unsubscribeUrl: string): string {
  const articleRows = arts.map((a, i) => {
    const url = `${brand.siteUrl}/article/${a.slug}?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest`;
    const img = a.featuredImage
      ? `<img src="${a.featuredImage}" alt="" style="width:100%;height:160px;object-fit:cover;border-radius:4px;display:block;margin-bottom:10px;">`
      : "";
    const sub = a.subheadline ? `<p style="margin:4px 0 0;color:#666;font-size:14px;line-height:1.4;">${a.subheadline}</p>` : "";
    return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e5e5e5;">
        <span style="font-size:11px;font-weight:700;color:#C41E3A;text-transform:uppercase;letter-spacing:0.05em;">#${i + 1}</span>
        ${img}
        <a href="${url}" style="color:#1A1A1A;text-decoration:none;font-size:18px;font-weight:700;font-family:Georgia,serif;line-height:1.3;">${a.headline}</a>
        ${sub}
      </td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${brand.siteName} Weekly Digest</title>
</head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1A1A1A;padding:24px 32px;text-align:center;">
            <a href="${brand.siteUrl}?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest" style="text-decoration:none;">
              <span style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.02em;">${brand.siteName}</span>
            </a>
            <p style="margin:6px 0 0;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Weekly Digest</p>
          </td>
        </tr>
        <!-- Intro -->
        <tr>
          <td style="padding:24px 32px 8px;border-bottom:2px solid #1A1A1A;">
            <p style="margin:0;font-family:Georgia,serif;font-size:16px;color:#2C2C2C;line-height:1.6;">
              The week's top stories, curated for you. Because staying informed shouldn't require a news anchor.
            </p>
          </td>
        </tr>
        <!-- Articles -->
        <tr>
          <td style="padding:0 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${articleRows}
            </table>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding:24px 32px;text-align:center;border-top:2px solid #1A1A1A;">
            <a href="${brand.siteUrl}?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest" style="display:inline-block;background:#C41E3A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:0.03em;">Read More on ${brand.siteName}</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#F5F0EB;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#666;">
              You're receiving this because you subscribed to ${brand.siteName}.
            </p>
            <p style="margin:0;font-size:12px;color:#666;">
              <a href="${unsubscribeUrl}" style="color:#666;">Unsubscribe</a> &nbsp;|&nbsp; ${brand.address}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildDigestText(brand: Awaited<ReturnType<typeof getBrandConfig>>, arts: DigestArticle[], unsubscribeUrl: string): string {
  const lines = arts.map((a, i) => {
    const url = `${brand.siteUrl}/article/${a.slug}?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest`;
    return `${i + 1}. ${a.headline}\n   ${url}`;
  });
  return [
    `${brand.siteName} Weekly Digest`,
    `${brand.tagline}`,
    ``,
    `This week's top stories:`,
    ``,
    ...lines,
    ``,
    `---`,
    `You're receiving this because you subscribed to ${brand.siteName}.`,
    `Unsubscribe: ${unsubscribeUrl}`,
    `${brand.address}`,
  ].join("\n");
}

// ─── Send history writer ──────────────────────────────────────────────────────

async function writeSendHistory(record: {
  recipientCount: number;
  successCount: number;
  failCount: number;
  subject: string;
  articleCount: number;
  isDryRun: boolean;
  triggeredBy: "cron" | "manual";
  errorMessage?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(newsletterSendHistory).values({
      recipientCount: record.recipientCount,
      successCount: record.successCount,
      failCount: record.failCount,
      subject: record.subject,
      articleCount: record.articleCount,
      isDryRun: record.isDryRun,
      triggeredBy: record.triggeredBy,
      errorMessage: record.errorMessage || null,
    });
  } catch (e: any) {
    console.error("[Newsletter] Failed to write send history:", e.message);
  }
}

// ─── Main send function ───────────────────────────────────────────────────────

export async function sendWeeklyDigest(opts?: { dryRun?: boolean; triggeredBy?: "cron" | "manual" }): Promise<DigestResult> {
  const triggeredBy = opts?.triggeredBy ?? "manual";
  const apiKey = await getResendApiKey();
  if (!apiKey) {
    console.log("[Newsletter] Resend API key not configured — skipping weekly digest");
    return { sent: 0, skipped: 0, errors: 0, reason: "Resend API key not configured" };
  }

  const [brand, topArticles, subscribers] = await Promise.all([
    getBrandConfig(),
    getWeeklyTopArticles(),
    listSubscribers(),
  ]);

  const activeSubscribers = subscribers.filter((s: any) => s.status === "active");
  const subject = `${brand.siteName} Weekly Digest — Top Stories`;

  if (topArticles.length === 0) {
    console.log("[Newsletter] No articles published this week — skipping digest");
    return { sent: 0, skipped: activeSubscribers.length, errors: 0, reason: "No articles this week" };
  }

  if (activeSubscribers.length === 0) {
    console.log("[Newsletter] No active subscribers — skipping digest");
    return { sent: 0, skipped: 0, errors: 0, reason: "No active subscribers" };
  }

  if (opts?.dryRun) {
    console.log(`[Newsletter] Dry run — would send to ${activeSubscribers.length} subscribers`);
    await writeSendHistory({
      recipientCount: activeSubscribers.length,
      successCount: 0,
      failCount: 0,
      subject,
      articleCount: topArticles.length,
      isDryRun: true,
      triggeredBy,
    });
    return { sent: 0, skipped: activeSubscribers.length, errors: 0, reason: "Dry run" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  let sent = 0;
  let errors = 0;

  for (const sub of activeSubscribers) {
    const email = (sub as any).email as string;
    const unsubUrl = `${brand.siteUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
    try {
      await resend.emails.send({
        from: `${brand.fromName} <${brand.fromEmail}>`,
        to: email,
        subject,
        html: buildDigestHtml(brand, topArticles, unsubUrl),
        text: buildDigestText(brand, topArticles, unsubUrl),
      });
      sent++;
    } catch (e: any) {
      console.error(`[Newsletter] Failed to send to ${email}:`, e.message);
      errors++;
    }
  }

  await writeSendHistory({
    recipientCount: activeSubscribers.length,
    successCount: sent,
    failCount: errors,
    subject,
    articleCount: topArticles.length,
    isDryRun: false,
    triggeredBy,
  });

  console.log(`[Newsletter] Weekly digest sent: ${sent} sent, ${errors} errors`);
  return { sent, skipped: 0, errors };
}

// ─── Unsubscribe route helpers ────────────────────────────────────────────────

export function registerNewsletterUnsubscribeRoute(app: any) {
  // GET /unsubscribe?email=... — one-click unsubscribe (CAN-SPAM)
  // NOT under /api/ so the Manus edge layer does not intercept it.
  app.get("/unsubscribe", async (req: any, res: any) => {
    const email = req.query.email as string;
    if (!email) return res.status(400).send("Missing email parameter");
    try {
      const { unsubscribeNewsletter } = await import("./db");
      await unsubscribeNewsletter(email);
      const brand = await getBrandConfig();
      res.status(200).set("Content-Type", "text/html").send(`
        <!DOCTYPE html><html><head><title>Unsubscribed — ${brand.siteName}</title>
        <meta name="robots" content="noindex">
        </head>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px;background:#F5F0EB;">
          <h1 style="font-family:Georgia,serif;color:#1A1A1A;">${brand.siteName}</h1>
          <p style="color:#2C2C2C;font-size:18px;">You've been unsubscribed.</p>
          <p style="color:#666;">You won't receive any more emails from us.</p>
          <a href="${brand.siteUrl}" style="color:#C41E3A;">Return to ${brand.siteName}</a>
        </body></html>
      `);
    } catch (e: any) {
      res.status(500).send("Error processing unsubscribe request");
    }
  });

  // Keep legacy /api/newsletter/unsubscribe for backwards compat with old emails
  app.get("/api/newsletter/unsubscribe", async (req: any, res: any) => {
    const email = req.query.email as string;
    if (!email) { res.redirect("/unsubscribe"); return; }
    res.redirect(`/unsubscribe?email=${encodeURIComponent(email)}`);
  });
}

// ─── Cron scheduler (Sunday 10am ET = 15:00 UTC) ─────────────────────────────

let _digestScheduled = false;

export function initNewsletterDigestScheduler() {
  if (_digestScheduled) return;
  _digestScheduled = true;

  // Check every hour if it's Sunday 10am ET (15:00 UTC)
  const ONE_HOUR = 60 * 60 * 1000;
  let lastSentWeek: string | null = null;

  setInterval(async () => {
    const now = new Date();
    // Sunday = 0, 15:00 UTC = 10am ET (EST) / 11am ET (EDT)
    const isTargetTime = now.getUTCDay() === 0 && now.getUTCHours() === 15;
    const weekKey = `${now.getUTCFullYear()}-W${getISOWeek(now)}`;

    if (isTargetTime && lastSentWeek !== weekKey) {
      lastSentWeek = weekKey;
      console.log("[Newsletter] Triggering weekly digest...");
      try {
        const result = await sendWeeklyDigest({ triggeredBy: "cron" });
        console.log(`[Newsletter] Digest result:`, result);
      } catch (e: any) {
        console.error("[Newsletter] Digest failed:", e.message);
      }
    }
  }, ONE_HOUR);

  console.log("[Newsletter] Weekly digest scheduler initialized (Sunday 10am ET)");
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ─── Test Resend Connection ───────────────────────────────────────────────────
// Sends a test email to the configured contact email to verify Resend delivery.

export async function testResendConnection(toEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = await getResendApiKey();
  if (!apiKey) {
    return { success: false, error: "Resend API key not configured. Add it in Settings → Newsletter or set RESEND_API_KEY env var." };
  }
  const brand = await getBrandConfig();
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: `${brand.fromName} <${brand.fromEmail}>`,
      to: toEmail,
      subject: `[Test] ${brand.siteName} Newsletter Connection Test`,
      html: `<p style="font-family:Arial,sans-serif;font-size:16px;color:#1A1A1A;">
        <strong>✅ Resend is connected and working.</strong><br><br>
        This test email confirms that <strong>${brand.siteName}</strong>'s newsletter system can deliver emails via Resend.<br><br>
        From: ${brand.fromName} &lt;${brand.fromEmail}&gt;<br>
        Site: <a href="${brand.siteUrl}">${brand.siteUrl}</a>
      </p>`,
      text: `Resend connection test for ${brand.siteName}.\n\nThis confirms your newsletter system is working.\n\nFrom: ${brand.fromName} <${brand.fromEmail}>\nSite: ${brand.siteUrl}`,
    });
    if (result.error) {
      return { success: false, error: result.error.message ?? "Resend returned an error" };
    }
    return { success: true, messageId: result.data?.id };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Unknown error sending test email" };
  }
}
