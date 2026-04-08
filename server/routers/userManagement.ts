import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { router, publicProcedure, adminProcedure, tenantOrAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { licenseUsers, licenses } from "../../drizzle/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { hashPassword } from "../auth";
import { sendEmail } from "../communications/emailService";

export const userManagementRouter = router({
  /** List users for a license (super admin) */
  listByLicense: adminProcedure
    .input(z.object({ licenseId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select({
          id: licenseUsers.id,
          licenseId: licenseUsers.licenseId,
          email: licenseUsers.email,
          name: licenseUsers.name,
          role: licenseUsers.role,
          isActive: licenseUsers.isActive,
          lastLoginAt: licenseUsers.lastLoginAt,
          createdAt: licenseUsers.createdAt,
        })
        .from(licenseUsers)
        .where(eq(licenseUsers.licenseId, input.licenseId));
    }),

  /** List users for the current tenant */
  listMine: tenantOrAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    if (!ctx.licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });
    return db
      .select({
        id: licenseUsers.id,
        licenseId: licenseUsers.licenseId,
        email: licenseUsers.email,
        name: licenseUsers.name,
        role: licenseUsers.role,
        isActive: licenseUsers.isActive,
        lastLoginAt: licenseUsers.lastLoginAt,
        createdAt: licenseUsers.createdAt,
      })
      .from(licenseUsers)
      .where(eq(licenseUsers.licenseId, ctx.licenseId));
  }),

  /** Invite a user to the current tenant (creates inactive user + sends email) */
  invite: tenantOrAdminProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1),
      role: z.enum(["owner", "admin", "editor", "viewer"]).default("admin"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      if (!ctx.licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });

      // Check duplicate
      const [existing] = await db
        .select()
        .from(licenseUsers)
        .where(and(
          eq(licenseUsers.licenseId, ctx.licenseId),
          eq(licenseUsers.email, input.email.toLowerCase()),
        ))
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
      }

      // Generate a temporary password (user will need to be given creds or reset)
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const passwordHash = await hashPassword(tempPassword);

      const [result] = await db.insert(licenseUsers).values({
        licenseId: ctx.licenseId,
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        role: input.role,
        isActive: true,
      });

      // Look up license for subdomain and publication name
      const [license] = await db.select().from(licenses).where(eq(licenses.id, ctx.licenseId)).limit(1);
      const subdomain = license?.subdomain || "app";
      const pubName = license?.clientName || "Publication";
      const loginUrl = `https://${subdomain}.getjaime.io/admin`;

      // Send invitation email
      await sendEmail(ctx.licenseId, input.email.toLowerCase(),
        `You've been invited to ${pubName}`,
        `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>
          <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p>Hi ${input.name},</p>
            <p>You've been invited to join <strong>${pubName}</strong> as a team member.</p>
            <p>Your temporary password is: <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
            <p style="margin-top: 24px;">
              <a href="${loginUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Log In to ${pubName}</a>
            </p>
            <p style="color: #64748b; font-size: 14px; margin-top: 32px;">— The ${pubName} Team</p>
          </div>
        </div>`
      );

      return { success: true, userId: result.insertId };
    }),

  /** Create a user within a license (super admin) */
  create: adminProcedure
    .input(z.object({
      licenseId: z.number(),
      email: z.string().email(),
      name: z.string().min(1),
      password: z.string().min(8),
      role: z.enum(["owner", "admin", "editor", "viewer"]).default("editor"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check duplicate
      const [existing] = await db
        .select()
        .from(licenseUsers)
        .where(and(
          eq(licenseUsers.licenseId, input.licenseId),
          eq(licenseUsers.email, input.email.toLowerCase()),
        ))
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User with this email already exists" });
      }

      const passwordHash = await hashPassword(input.password);
      const [result] = await db.insert(licenseUsers).values({
        licenseId: input.licenseId,
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        role: input.role,
        isActive: true,
      });

      return { success: true, userId: result.insertId };
    }),

  /** Update a user */
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      role: z.enum(["owner", "admin", "editor", "viewer"]).optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const setObj: Record<string, any> = {};
      if (input.name !== undefined) setObj.name = input.name;
      if (input.role !== undefined) setObj.role = input.role;
      if (input.isActive !== undefined) setObj.isActive = input.isActive;
      if (input.password) setObj.passwordHash = await hashPassword(input.password);

      if (Object.keys(setObj).length > 0) {
        await db.update(licenseUsers).set(setObj).where(eq(licenseUsers.id, input.id));
      }
      return { success: true };
    }),

  /** Delete a user (tenant-accessible, scoped to licenseId) */
  delete: tenantOrAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      if (!ctx.licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });
      // Only allow deleting users within the same license
      await db.delete(licenseUsers).where(
        and(eq(licenseUsers.id, input.userId), eq(licenseUsers.licenseId, ctx.licenseId))
      );
      return { success: true };
    }),

  /** Request password reset — public, does not reveal if email exists */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { sent: true };
      const [user] = await db.select().from(licenseUsers).where(sql`LOWER(${licenseUsers.email}) = LOWER(${input.email})`).limit(1);
      if (!user) return { sent: true };
      const [license] = await db.select().from(licenses).where(eq(licenses.id, user.licenseId)).limit(1);
      const subdomain = license?.subdomain || "app";
      const token = crypto.randomBytes(32).toString("hex");
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      await db.update(licenseUsers).set({ resetTokenHash: hash, resetTokenExpiresAt: new Date(Date.now() + 3600000) } as any).where(eq(licenseUsers.id, user.id));
      const resetUrl = `https://${subdomain}.getjaime.io/admin/reset-password?token=${token}`;
      try {
        await sendEmail(user.licenseId, input.email, "Reset your password", `
          <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:32px;">
            <h2 style="margin:0 0 16px;">Reset Your Password</h2>
            <p>Click the button below to set a new password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0;">Reset Password</a>
            <p style="font-size:12px;color:#9ca3af;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `);
      } catch (err) { console.error("[PasswordReset] Email failed:", err); }
      return { sent: true };
    }),

  /** Reset password with token */
  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const hash = crypto.createHash("sha256").update(input.token).digest("hex");
      const [user] = await db.select().from(licenseUsers).where(and(eq(licenseUsers.resetTokenHash, hash), gte(licenseUsers.resetTokenExpiresAt, new Date()))).limit(1);
      if (!user) throw new TRPCError({ code: "BAD_REQUEST", message: "Reset link is invalid or has expired." });
      const passwordHash = await hashPassword(input.newPassword);
      await db.update(licenseUsers).set({ passwordHash, resetTokenHash: null, resetTokenExpiresAt: null } as any).where(eq(licenseUsers.id, user.id));
      return { success: true };
    }),
});
