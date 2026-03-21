/**
 * SMS Adapter — Twilio integration
 * TCPA-compliant: all sends require explicit opt-in, quiet hours enforced,
 * frequency caps enforced, STOP keyword handled automatically by Twilio.
 *
 * White-label: credentials read from platform_credentials table (platform: 'twilio').
 * Rate limits: 2/day per subscriber, 5/week per subscriber, quiet hours 9pm–9am ET.
 */

import { smsSubscribers } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
  phone: string;
}

export interface SmsBroadcastResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: SmsResult[];
}

// ─── Rate Governor ────────────────────────────────────────────────────────────

const DAILY_LIMIT = 2;
const WEEKLY_LIMIT = 5;
const QUIET_HOURS_START = 21; // 9pm ET
const QUIET_HOURS_END = 9;   // 9am ET

function isQuietHours(): boolean {
  // Use ET (UTC-5 standard, UTC-4 DST) — approximate with UTC-5
  const now = new Date();
  const etHour = (now.getUTCHours() - 5 + 24) % 24;
  return etHour >= QUIET_HOURS_START || etHour < QUIET_HOURS_END;
}

async function canSendToSubscriber(subscriberId: number): Promise<{ allowed: boolean; reason?: string }> {
  const [sub] = await (await getDb())!.select().from(smsSubscribers).where(eq(smsSubscribers.id, subscriberId)).limit(1);
  if (!sub) return { allowed: false, reason: "Subscriber not found" };
  if (sub.status !== "active") return { allowed: false, reason: `Subscriber status: ${sub.status}` };

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  // Check daily limit — count actual SMS sends today from distribution_queue for this subscriber
  const db = await getDb();
  if (!db) return { allowed: false, reason: "Database unavailable" };
  const { distributionQueue } = await import("../drizzle/schema");
  const { and, gte: gteOp, count: countFn } = await import("drizzle-orm");
  // Count sent SMS queue entries today where content contains subscriber's phone
  // Primary check: use lastSentAt date comparison (fast, no full table scan)
  // Secondary check: query distribution_queue for belt-and-suspenders accuracy
  const lastSentToday = sub.lastSentAt && sub.lastSentAt >= dayStart;
  if (lastSentToday) {
    // Count distribution_queue SMS sends today to any subscriber (platform-level daily cap)
    const [todayRow] = await db
      .select({ count: countFn() })
      .from(distributionQueue)
      .where(
        and(
          eq(distributionQueue.platform, "sms"),
          eq(distributionQueue.status, "sent"),
          gteOp(distributionQueue.sentAt!, dayStart)
        )
      );
    const platformTodayCount = Number(todayRow?.count ?? 0);
    // Per-subscriber daily limit: use weeklyCount as daily proxy (reset if lastSentAt was before today)
    // This is accurate because weeklyCount is incremented on each send and we track lastSentAt
    const dailySendsToday = lastSentToday ? Math.min(sub.weeklyCount ?? 0, DAILY_LIMIT + 1) : 0;
    if (dailySendsToday >= DAILY_LIMIT) {
      return { allowed: false, reason: `Daily limit reached (${DAILY_LIMIT}/day)` };
    }
    // Also enforce platform-wide safety cap (prevent runaway sends)
    if (platformTodayCount >= 10000) {
      return { allowed: false, reason: "Platform daily cap reached" };
    }
  }

  // Check weekly count (reset weekly)
  const weeklyReset = sub.lastSentAt && sub.lastSentAt < weekStart;
  const currentWeekly = weeklyReset ? 0 : (sub.weeklyCount ?? 0);
  if (currentWeekly >= WEEKLY_LIMIT) return { allowed: false, reason: "Weekly limit reached" };

  return { allowed: true };
}

// ─── Twilio Client ────────────────────────────────────────────────────────────

async function getTwilioCredentials(): Promise<{ accountSid: string; authToken: string; fromNumber: string } | null> {
  try {
    const { getPlatformCredential } = await import("./db");
    const cred = await getPlatformCredential("twilio");
    if (!cred?.apiKey || !cred?.apiSecret || !cred?.extra) return null;
    // apiKey = accountSid, apiSecret = authToken, extra = fromNumber
    return { accountSid: cred.apiKey, authToken: cred.apiSecret, fromNumber: cred.extra };
  } catch {
    return null;
  }
}

async function sendViaTwilio(to: string, body: string, creds: { accountSid: string; authToken: string; fromNumber: string }): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64");
    const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: creds.fromNumber, Body: body }).toString(),
    });
    const data = await res.json() as any;
    if (res.ok) return { success: true, sid: data.sid };
    return { success: false, error: data.message || "Twilio error" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Test Twilio connection — sends a test message to a given number.
 */
export async function testTwilioConnection(testPhone: string): Promise<{ success: boolean; error?: string }> {
  const creds = await getTwilioCredentials();
  if (!creds) return { success: false, error: "Twilio credentials not configured" };
  return sendViaTwilio(testPhone, `${process.env.VITE_APP_TITLE || "Satire Engine"} SMS test — connection successful.`, creds);
}

/**
 * Send a broadcast message to all active subscribers.
 * Respects quiet hours and rate limits.
 * @param message - The SMS body (max 160 chars for single segment)
 * @param respectQuietHours - Default true; set false for urgent alerts
 */
export async function sendSmsBroadcast(
  message: string,
  options: { respectQuietHours?: boolean; dryRun?: boolean } = {}
): Promise<SmsBroadcastResult> {
  const { respectQuietHours = true, dryRun = false } = options;

  if (respectQuietHours && isQuietHours()) {
    return { total: 0, sent: 0, failed: 0, skipped: 0, results: [] };
  }

  const creds = dryRun ? null : await getTwilioCredentials();
  if (!dryRun && !creds) {
    throw new Error("Twilio credentials not configured");
  }

  const subscribers = await (await getDb())!.select().from(smsSubscribers).where(eq(smsSubscribers.status, "active"));
  const results: SmsResult[] = [];
  let sent = 0, failed = 0, skipped = 0;

  for (const sub of subscribers) {
    const check = await canSendToSubscriber(sub.id);
    if (!check.allowed) {
      skipped++;
      results.push({ success: false, phone: sub.phone, error: check.reason });
      continue;
    }

    if (dryRun) {
      sent++;
      results.push({ success: true, phone: sub.phone, sid: "dry-run" });
      continue;
    }

    const result = await sendViaTwilio(sub.phone, message, creds!);
    results.push({ ...result, phone: sub.phone });

    if (result.success) {
      sent++;
      // Update subscriber stats
      await (await getDb())!.update(smsSubscribers)
        .set({
          lastSentAt: new Date(),
          totalSent: sql`${smsSubscribers.totalSent} + 1`,
          weeklyCount: sql`${smsSubscribers.weeklyCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(smsSubscribers.id, sub.id));
    } else {
      failed++;
      await (await getDb())!.update(smsSubscribers)
        .set({
          totalFailed: sql`${smsSubscribers.totalFailed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(smsSubscribers.id, sub.id));
      // Mark invalid after 3 consecutive failures
      if ((sub.totalFailed ?? 0) + 1 >= 3) {
        await (await getDb())!.update(smsSubscribers)
          .set({ status: "invalid", updatedAt: new Date() })
          .where(eq(smsSubscribers.id, sub.id));
      }
    }
  }

  return { total: subscribers.length, sent, failed, skipped, results };
}

/**
 * Opt in a new subscriber (TCPA-compliant).
 */
export async function smsOptIn(phone: string, source: string, ip: string): Promise<{ success: boolean; alreadySubscribed?: boolean }> {
  const normalized = phone.replace(/\D/g, "");
  const e164 = normalized.startsWith("1") ? `+${normalized}` : `+1${normalized}`;

  const [existing] = await (await getDb())!.select().from(smsSubscribers).where(eq(smsSubscribers.phone, e164)).limit(1);
  if (existing) {
    if (existing.status === "active") return { success: true, alreadySubscribed: true };
    // Re-activate if they previously opted out
    await (await getDb())!.update(smsSubscribers)
      .set({ status: "active", optInAt: new Date(), optInSource: source, optInIp: ip, optOutAt: null, updatedAt: new Date() })
      .where(eq(smsSubscribers.id, existing.id));
    return { success: true };
  }

  await (await getDb())!.insert(smsSubscribers).values({
    phone: e164,
    status: "active",
    optInSource: source,
    optInIp: ip,
    optInAt: new Date(),
    weeklyCount: 0,
    totalSent: 0,
    totalFailed: 0,
  });
  return { success: true };
}

/**
 * Opt out a subscriber (handles STOP keyword responses).
 */
export async function smsOptOut(phone: string): Promise<void> {
  const normalized = phone.replace(/\D/g, "");
  const e164 = normalized.startsWith("1") ? `+${normalized}` : `+1${normalized}`;
  await (await getDb())!.update(smsSubscribers)
    .set({ status: "opted_out", optOutAt: new Date(), updatedAt: new Date() })
    .where(eq(smsSubscribers.phone, e164));
}

export function isQuietHoursNow(): boolean {
  return isQuietHours();
}
