import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { licenses, licenseUsers, licenseSettings } from "../../drizzle/schema";
import { eq, count, desc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

function generateLicenseKey(): string {
  return `JIO-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export const licenseManagementRouter = router({
  /** List all licenses with user counts */
  list: adminProcedure.query(async () => {
    const db = await getDb();
    const rows = await db
      .select({
        id: licenses.id,
        licenseKey: licenses.licenseKey,
        clientName: licenses.clientName,
        email: licenses.email,
        domain: licenses.domain,
        subdomain: licenses.subdomain,
        tier: licenses.tier,
        maxUsers: licenses.maxUsers,
        features: licenses.features,
        logoUrl: licenses.logoUrl,
        primaryColor: licenses.primaryColor,
        status: licenses.status,
        expiresAt: licenses.expiresAt,
        createdAt: licenses.createdAt,
        userCount: count(licenseUsers.id),
      })
      .from(licenses)
      .leftJoin(licenseUsers, eq(licenses.id, licenseUsers.licenseId))
      .groupBy(licenses.id)
      .orderBy(desc(licenses.createdAt));
    return rows;
  }),

  /** Get single license with details */
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [license] = await db.select().from(licenses).where(eq(licenses.id, input.id)).limit(1);
      if (!license) throw new TRPCError({ code: "NOT_FOUND" });

      const users = await db.select().from(licenseUsers).where(eq(licenseUsers.licenseId, input.id));
      return { ...license, users };
    }),

  /** Create a new license */
  create: adminProcedure
    .input(z.object({
      clientName: z.string().min(1),
      email: z.string().email(),
      domain: z.string().min(1),
      subdomain: z.string().min(1).regex(/^[a-z0-9-]+$/, "Subdomain must be lowercase alphanumeric with hyphens"),
      tier: z.enum(["starter", "professional", "enterprise"]),
      maxUsers: z.number().min(1).default(5),
      features: z.record(z.boolean()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const licenseKey = generateLicenseKey();

      const { PLAN_TIERS } = await import("../constants/planTiers");
      const tierConfig = PLAN_TIERS[input.tier as keyof typeof PLAN_TIERS];

      await db.insert(licenses).values({
        licenseKey,
        clientName: input.clientName,
        email: input.email,
        domain: input.domain,
        subdomain: input.subdomain,
        tier: input.tier,
        maxUsers: input.maxUsers,
        features: input.features || null,
        notes: input.notes || null,
        status: "active",
        billingCycleStartDay: new Date().getDate(),
        monthlyPageLimit: tierConfig?.monthlyPageLimit ?? null,
      });

      return { success: true, licenseKey };
    }),

  /** Update a license */
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      clientName: z.string().optional(),
      email: z.string().email().optional(),
      domain: z.string().optional(),
      subdomain: z.string().optional(),
      tier: z.enum(["starter", "professional", "enterprise"]).optional(),
      maxUsers: z.number().min(1).optional(),
      features: z.record(z.boolean()).optional(),
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
      status: z.enum(["active", "expired", "suspended", "cancelled"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...updates } = input;
      const setObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined) setObj[key] = val;
      }
      if (Object.keys(setObj).length === 0) return { success: true };
      await db.update(licenses).set(setObj).where(eq(licenses.id, id));
      return { success: true };
    }),

  /** Delete a license (soft: set status to cancelled) */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(licenses).set({ status: "cancelled" }).where(eq(licenses.id, input.id));
      return { success: true };
    }),

  /** Dashboard stats for Mission Control */
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    const [totals] = await db
      .select({
        totalLicenses: count(),
        activeLicenses: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
      })
      .from(licenses);

    const [userTotals] = await db
      .select({ totalUsers: count() })
      .from(licenseUsers);

    const tierBreakdown = await db
      .select({
        tier: licenses.tier,
        count: count(),
      })
      .from(licenses)
      .where(eq(licenses.status, "active"))
      .groupBy(licenses.tier);

    return {
      totalLicenses: totals?.totalLicenses ?? 0,
      activeLicenses: Number(totals?.activeLicenses ?? 0),
      totalUsers: userTotals?.totalUsers ?? 0,
      tierBreakdown,
    };
  }),
});
