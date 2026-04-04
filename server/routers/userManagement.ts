import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { licenseUsers } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "../auth";

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

  /** Create a user within a license */
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

  /** Delete a user */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(licenseUsers).where(eq(licenseUsers.id, input.id));
      return { success: true };
    }),
});
