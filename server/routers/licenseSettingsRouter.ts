import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { licenseSettings, licenses } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const licenseSettingsRouter = router({
  /** Get all settings for a license */
  getAll: publicProcedure
    .input(z.object({ licenseId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db.select().from(licenseSettings)
        .where(eq(licenseSettings.licenseId, input.licenseId));
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    }),

  /** Get a single setting */
  get: publicProcedure
    .input(z.object({ licenseId: z.number(), key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [row] = await db.select().from(licenseSettings)
        .where(and(eq(licenseSettings.licenseId, input.licenseId), eq(licenseSettings.key, input.key)))
        .limit(1);
      return row?.value ?? null;
    }),

  /** Upsert a setting */
  set: publicProcedure
    .input(z.object({
      licenseId: z.number(),
      key: z.string(),
      value: z.string(),
      type: z.enum(["number", "string", "boolean", "json", "text"]).default("string"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Try update first
      const [existing] = await db.select().from(licenseSettings)
        .where(and(eq(licenseSettings.licenseId, input.licenseId), eq(licenseSettings.key, input.key)))
        .limit(1);
      if (existing) {
        await db.update(licenseSettings)
          .set({ value: input.value, type: input.type })
          .where(eq(licenseSettings.id, existing.id));
      } else {
        await db.insert(licenseSettings).values({
          licenseId: input.licenseId,
          key: input.key,
          value: input.value,
          type: input.type,
        });
      }
      return { success: true };
    }),

  /** Bulk upsert settings */
  setBulk: publicProcedure
    .input(z.object({
      licenseId: z.number(),
      settings: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const entries: Array<[string, string]> = Object.entries(input.settings);
      for (const [key, value] of entries) {
        const [existing] = await db.select().from(licenseSettings)
          .where(and(eq(licenseSettings.licenseId, input.licenseId), eq(licenseSettings.key, key)))
          .limit(1);
        if (existing) {
          await db.update(licenseSettings)
            .set({ value })
            .where(eq(licenseSettings.id, existing.id));
        } else {
          await db.insert(licenseSettings).values({
            licenseId: input.licenseId,
            key,
            value,
            type: "string",
          });
        }
      }
      // Reload tenant scheduler if schedule settings changed
      const scheduleKeys = ["schedule_hour", "schedule_minute", "schedule_days", "schedule_timezone", "schedule_runs_per_day", "workflow_enabled"];
      const hasScheduleChange = entries.some(([key]) => scheduleKeys.includes(key));
      if (hasScheduleChange) {
        try {
          const { reloadTenantSchedule } = await import("../scheduler");
          await reloadTenantSchedule(input.licenseId);
          console.log("[Settings] Reloaded scheduler for license", input.licenseId);
        } catch (e: any) { console.log("[Settings] Scheduler reload skipped:", e.message?.substring(0, 50)); }
      }
      // Auto-sync Blotato accounts when API key changes
      if (entries.some(([key]) => key === "blotato_api_key")) {
        import("../blotato").then(({ syncBlotatoAccountsForLicense }) => {
          syncBlotatoAccountsForLicense(input.licenseId).catch(err =>
            console.error("[Blotato] Auto-sync failed:", err)
          );
        });
      }
      return { success: true };
    }),
});
