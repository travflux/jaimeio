/**
 * SMS Router — tRPC procedures for Admin SMS management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { smsSubscribers } from "../../drizzle/schema";
import { eq, desc, like, sql } from "drizzle-orm";
import { sendSmsBroadcast, testTwilioConnection, smsOptIn, smsOptOut } from "../smsAdapter";

export const smsRouter = router({
  // ─── Subscribers Tab ────────────────────────────────────────────────────────

  listSubscribers: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      status: z.enum(["all", "active", "opted_out", "invalid", "blocked"]).default("all"),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { subscribers: [], total: 0 };
      const offset = (input.page - 1) * input.limit;
      let query = db.select().from(smsSubscribers);
      if (input.status !== "all") {
        query = query.where(eq(smsSubscribers.status, input.status)) as any;
      }
      const allRows = await query.orderBy(desc(smsSubscribers.createdAt));
      const filtered = input.search
        ? allRows.filter(r => r.phone.includes(input.search!))
        : allRows;
      return {
        subscribers: filtered.slice(offset, offset + input.limit),
        total: filtered.length,
      };
    }),

  addSubscriber: protectedProcedure
    .input(z.object({ phone: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const result = await smsOptIn(input.phone, "admin_manual", "admin");
      return result;
    }),

  removeSubscriber: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(smsSubscribers)
        .set({ status: "opted_out", optOutAt: new Date(), updatedAt: new Date() })
        .where(eq(smsSubscribers.id, input.id));
      return { success: true };
    }),

  importSubscribers: protectedProcedure
    .input(z.object({ phones: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      let added = 0, skipped = 0, failed = 0;
      for (const phone of input.phones) {
        try {
          const result = await smsOptIn(phone.trim(), "csv_import", "admin");
          if (result.alreadySubscribed) skipped++;
          else added++;
        } catch {
          failed++;
        }
      }
      return { added, skipped, failed };
    }),

  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, active: 0, optedOut: 0, invalid: 0 };
    const rows = await db.select({
      status: smsSubscribers.status,
      count: sql<number>`count(*)`,
    }).from(smsSubscribers).groupBy(smsSubscribers.status);
    const stats: Record<string, number> = {};
    for (const r of rows) stats[r.status] = Number(r.count);
    return {
      total: Object.values(stats).reduce((a, b) => a + b, 0),
      active: stats.active ?? 0,
      optedOut: stats.opted_out ?? 0,
      invalid: stats.invalid ?? 0,
      blocked: stats.blocked ?? 0,
    };
  }),

  // ─── Compose / Broadcast Tab ────────────────────────────────────────────────

  sendBroadcast: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(1600),
      dryRun: z.boolean().default(false),
      respectQuietHours: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      return sendSmsBroadcast(input.message, {
        dryRun: input.dryRun,
        respectQuietHours: input.respectQuietHours,
      });
    }),

  // ─── History Tab ────────────────────────────────────────────────────────────

  getBroadcastHistory: protectedProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async () => {
      // History is stored in distribution_queue with platform='sms'
      // For now return empty — will be populated once broadcasts are sent
      return { history: [], total: 0 };
    }),

  // ─── Settings Tab ────────────────────────────────────────────────────────────

  getSettings: protectedProcedure.query(async () => {
    const { getPlatformCredential } = await import("../db");
    const cred = await getPlatformCredential("twilio");
    return {
      configured: !!(cred?.apiKey && cred?.apiSecret && cred?.extra),
      accountSidMasked: cred?.apiKey ? `${cred.apiKey.slice(0, 6)}...${cred.apiKey.slice(-4)}` : null,
      fromNumber: cred?.extra ?? null,
      isActive: cred?.isActive ?? false,
    };
  }),

  saveSettings: protectedProcedure
    .input(z.object({
      accountSid: z.string().min(1),
      authToken: z.string().min(1),
      fromNumber: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const { upsertPlatformCredential } = await import("../db");
      await upsertPlatformCredential("twilio", {
        apiKey: input.accountSid,
        apiSecret: input.authToken,
        extra: input.fromNumber,
        isActive: true,
      });
      return { success: true };
    }),

  testConnection: protectedProcedure
    .input(z.object({ testPhone: z.string() }))
    .mutation(async ({ input }) => {
      return testTwilioConnection(input.testPhone);
    }),
});
