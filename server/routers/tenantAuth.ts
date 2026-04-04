import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import { publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { licenseUsers, licenses } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword, createLicenseUserToken, TENANT_COOKIE_NAME } from "../auth";
import { resolveLicense } from "../auth/licenseAuth";
import { getSessionCookieOptions } from "../_core/cookies";

const ONE_MONTH_MS = 1000 * 60 * 60 * 24 * 30;

export const tenantAuthRouter = router({
  /**
   * Login as a license user.
   * Requires licenseId to be resolved from the domain/subdomain by middleware.
   */
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
      licenseId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [user] = await db
        .select()
        .from(licenseUsers)
        .where(and(
          eq(licenseUsers.licenseId, input.licenseId),
          eq(licenseUsers.email, input.email.toLowerCase()),
          eq(licenseUsers.isActive, true),
        ))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      // Update last login
      await db.update(licenseUsers).set({ lastLoginAt: new Date() }).where(eq(licenseUsers.id, user.id));

      // Create JWT
      const token = await createLicenseUserToken({
        userId: user.id,
        licenseId: user.licenseId,
        email: user.email,
        role: user.role,
      });

      // Set cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(TENANT_COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: ONE_MONTH_MS,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          licenseId: user.licenseId,
        },
      };
    }),

  /**
   * Get current tenant user from cookie.
   */
  me: publicProcedure.query(async ({ ctx }) => {
    // tenantUser is set by tenant middleware if cookie is present
    return (ctx as any).tenantUser || null;
  }),

  /**
   * Logout — clear tenant cookie.
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(TENANT_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  /**
   * Request access to a license (creates a pending user entry).
   */
  requestAccess: publicProcedure
    .input(z.object({
      licenseId: z.number(),
      email: z.string().email(),
      name: z.string().min(1),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check license exists and is active
      const [license] = await db
        .select()
        .from(licenses)
        .where(and(eq(licenses.id, input.licenseId), eq(licenses.status, "active")))
        .limit(1);

      if (!license) {
        throw new TRPCError({ code: "NOT_FOUND", message: "License not found" });
      }

      // Check if user already exists
      const [existing] = await db
        .select()
        .from(licenseUsers)
        .where(and(
          eq(licenseUsers.licenseId, input.licenseId),
          eq(licenseUsers.email, input.email.toLowerCase()),
        ))
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
      }

      // Create user with a temporary password (they'll be activated by an admin)
      const tempHash = await hashPassword(Math.random().toString(36));
      await db.insert(licenseUsers).values({
        licenseId: input.licenseId,
        email: input.email.toLowerCase(),
        passwordHash: tempHash,
        name: input.name,
        role: "editor",
        isActive: false, // Not active until admin approves
      });

      return { success: true, message: "Access request submitted. An admin will review your request." };
    }),

  /**
   * Resolve license from hostname (used by frontend on subdomain pages).
   */
  resolveLicense: publicProcedure
    .input(z.object({ hostname: z.string() }))
    .query(async ({ input }) => {
      const license = await resolveLicense(input.hostname);
      if (!license) return null;
      return {
        id: license.id,
        clientName: license.clientName,
        subdomain: license.subdomain,
        domain: license.domain,
        tier: license.tier,
        logoUrl: license.logoUrl,
        primaryColor: license.primaryColor,
        status: license.status,
      };
    }),

});
