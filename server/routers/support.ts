import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { supportArticles } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export const supportRouter = router({
  /** Get single article by slug (public) */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [article] = await db.select().from(supportArticles)
        .where(eq(supportArticles.slug, input.slug)).limit(1);
      if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
      return article;
    }),

  /** List all public articles */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db.select({
      id: supportArticles.id,
      slug: supportArticles.slug,
      title: supportArticles.title,
      category: supportArticles.category,
      isPublic: supportArticles.isPublic,
      createdAt: supportArticles.createdAt,
    }).from(supportArticles).orderBy(desc(supportArticles.createdAt));
  }),

  /** Create article (admin) */
  create: adminProcedure
    .input(z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      content: z.string().min(1),
      category: z.string().default("general"),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const id = randomUUID();
      await db.insert(supportArticles).values({ id, ...input });
      return { success: true, id };
    }),

  /** Update article (admin) */
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      category: z.string().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { id, ...updates } = input;
      const setObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined) setObj[key] = val;
      }
      if (Object.keys(setObj).length > 0) {
        await db.update(supportArticles).set(setObj).where(eq(supportArticles.id, id));
      }
      return { success: true };
    }),

  /** Delete article (admin) */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(supportArticles).where(eq(supportArticles.id, input.id));
      return { success: true };
    }),

  /** Submit support ticket via email */
  submitTicket: publicProcedure
    .input(z.object({
      subject: z.string().min(1),
      priority: z.string().default("normal"),
      category: z.string().default("technical"),
      description: z.string().min(1),
      licenseId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: "JAIME.IO Platform <noreply@getjaime.io>",
            to: "support@getjaime.io",
            subject: `[${input.priority.toUpperCase()}] ${input.subject}${input.licenseId ? ` — License ${input.licenseId}` : ""}`,
            html: `<h2>Support Ticket</h2>
              <table style="border-collapse:collapse;width:100%;font-size:14px;">
                <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold;width:120px;">Priority</td><td style="padding:8px;border:1px solid #eee;">${input.priority}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold;">Category</td><td style="padding:8px;border:1px solid #eee;">${input.category}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold;">Subject</td><td style="padding:8px;border:1px solid #eee;">${input.subject}</td></tr>
                ${input.licenseId ? `<tr><td style="padding:8px;border:1px solid #eee;font-weight:bold;">License</td><td style="padding:8px;border:1px solid #eee;">${input.licenseId}</td></tr>` : ""}
                <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold;vertical-align:top;">Description</td><td style="padding:8px;border:1px solid #eee;white-space:pre-wrap;">${input.description}</td></tr>
              </table>`,
          });
        } catch (err) {
          console.error("[Support] Email send failed:", err);
        }
      }
      return { success: true };
    }),
});
