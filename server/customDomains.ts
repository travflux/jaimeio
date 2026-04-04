import { eq } from "drizzle-orm";
import { customDomains, type InsertCustomDomain } from "../drizzle/schema";
import { getDb } from "./db";
import dns from "dns/promises";

const CNAME_TARGET = "publications.getjaime.io";

export async function registerDomain(
  clientId: string,
  domain: string,
  publicationName: string
): Promise<{ success: boolean; id?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const normalized = domain.toLowerCase().trim();

  // Check for duplicate
  const [existing] = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.customDomain, normalized))
    .limit(1);

  if (existing) {
    return { success: false, error: "Domain already registered" };
  }

  const [result] = await db.insert(customDomains).values({
    clientId,
    customDomain: normalized,
    publicationName,
    sslStatus: "pending",
  });

  return { success: true, id: result.insertId };
}

export async function verifyDomain(
  domain: string
): Promise<{ verified: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { verified: false, error: "Database not available" };

  const normalized = domain.toLowerCase().trim();

  try {
    const records = await dns.resolveCname(normalized);
    const hasCname = records.some(
      (r) => r.toLowerCase() === CNAME_TARGET || r.toLowerCase() === `${CNAME_TARGET}.`
    );

    if (hasCname) {
      await db
        .update(customDomains)
        .set({ sslStatus: "active", verifiedAt: new Date() })
        .where(eq(customDomains.customDomain, normalized));
      return { verified: true };
    }

    return {
      verified: false,
      error: `CNAME not pointing to ${CNAME_TARGET}. Found: ${records.join(", ") || "none"}`,
    };
  } catch (err: any) {
    if (err.code === "ENODATA" || err.code === "ENOTFOUND") {
      return {
        verified: false,
        error: `No CNAME record found for ${normalized}. Add: ${normalized} CNAME ${CNAME_TARGET}`,
      };
    }
    return { verified: false, error: `DNS lookup failed: ${err.message}` };
  }
}

export async function listDomains(clientId?: string) {
  const db = await getDb();
  if (!db) return [];

  if (clientId) {
    return db
      .select()
      .from(customDomains)
      .where(eq(customDomains.clientId, clientId));
  }

  return db.select().from(customDomains);
}

export async function deleteDomain(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(customDomains).where(eq(customDomains.id, id));
}

export async function getDomainByHostname(hostname: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.customDomain, hostname.toLowerCase()))
    .limit(1);
  return row ?? null;
}

// ─── Resend email notification ────────────────────────────────────────────────

export async function sendDomainSetupEmail(
  recipientEmail: string,
  domain: string,
  publicationName: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[CustomDomains] RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "Jaime.io Platform <noreply@getjaime.io>",
      to: recipientEmail,
      subject: `DNS Setup Required — ${publicationName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Custom Domain Setup for ${publicationName}</h2>
          <p>To connect <strong>${domain}</strong> to your publication, add the following DNS record:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <tr style="background: #f5f5f5;">
              <th style="text-align: left; padding: 12px; border: 1px solid #e0e0e0;">Type</th>
              <th style="text-align: left; padding: 12px; border: 1px solid #e0e0e0;">Name</th>
              <th style="text-align: left; padding: 12px; border: 1px solid #e0e0e0;">Target</th>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e0e0e0; font-family: monospace;">CNAME</td>
              <td style="padding: 12px; border: 1px solid #e0e0e0; font-family: monospace;">${domain}</td>
              <td style="padding: 12px; border: 1px solid #e0e0e0; font-family: monospace;">publications.getjaime.io</td>
            </tr>
          </table>
          <p><strong>Important:</strong></p>
          <ul>
            <li>DNS changes can take up to 24 hours to propagate</li>
            <li>If using Cloudflare, set proxy status to <strong>DNS only</strong> (grey cloud)</li>
            <li>Once the CNAME is set, click "Verify DNS" in the admin panel</li>
          </ul>
          <p style="color: #666; font-size: 13px; margin-top: 32px;">— The Jaime.io Platform Team</p>
        </div>
      `,
    });

    console.log(`[CustomDomains] Setup email sent to ${recipientEmail} for ${domain}`);
  } catch (err) {
    console.error("[CustomDomains] Failed to send setup email:", err);
  }
}
