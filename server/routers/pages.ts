import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, tenantOrAdminProcedure } from "../_core/trpc";
import { getDb, getSetting } from "../db";
import { publicationPages } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const DEFAULT_CONTENT: Record<string, any> = {
  advertise: {
    hero_heading: "Advertise with {SITE_NAME}",
    hero_subtext: "Reach our engaged audience of readers who trust {SITE_NAME} for quality content.",
    stat_1_label: "Monthly Readers", stat_1_value: "auto",
    stat_2_label: "Articles Published", stat_2_value: "auto",
    stat_3_label: "Newsletter Subscribers", stat_3_value: "auto",
    why_heading: "Why Advertise With Us",
    why_1_title: "Engaged Audience", why_1_text: "Our readers are highly engaged and trust our content.",
    why_2_title: "Premium Placements", why_2_text: "Your brand appears alongside quality editorial content.",
    why_3_title: "Measurable Results", why_3_text: "Track performance with detailed analytics and reporting.",
    form_heading: "Get In Touch",
    form_subtext: "Tell us about your advertising goals and we'll be in touch.",
  },
  privacy: {
    effective_date: "2026-01-01",
    custom_intro: "",
    additional_sections: [],
  },
  contact: {
    hero_heading: "Get In Touch",
    hero_subtext: "We'd love to hear from you.",
    show_address: true, show_phone: true, show_email: true,
    custom_message: "",
  },
  about: {
    hero_heading: "About {SITE_NAME}",
    hero_subtext: "",
    body: "",
    show_team: false,
  },
};

export const pagesRouter = router({
  submitContactForm: publicProcedure
    .input(z.object({
      formType: z.enum(["contact", "advertise", "careers"]),
      name: z.string().min(1),
      email: z.string().email(),
      subject: z.string().optional(),
      company: z.string().optional(),
      budget: z.string().optional(),
      message: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const notificationEmail =
        (await getSetting("brand_contact_email"))?.value ??
        (await getSetting("brand_editor_email"))?.value ??
        "support@getjaime.io";
      const siteName =
        (await getSetting("brand_site_name"))?.value ?? "Publication";
      const resendKey =
        (await getSetting("resend_api_key"))?.value ?? process.env.RESEND_API_KEY;

      const labels: Record<string, string> = {
        contact: "Contact Form", advertise: "Advertising Inquiry", careers: "Career Application",
      };
      const emailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#111827;margin-bottom:16px;">New ${labels[input.formType]} — ${escapeHtml(siteName)}</h2>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;width:120px;">Name</td>
                <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(input.name)}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Email</td>
                <td style="padding:8px 12px;border:1px solid #e5e7eb;"><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>
            ${input.company ? `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Company</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(input.company)}</td></tr>` : ""}
            ${input.budget ? `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Budget</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(input.budget)}</td></tr>` : ""}
            ${input.subject ? `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Subject</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(input.subject)}</td></tr>` : ""}
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;vertical-align:top;">Message</td>
                <td style="padding:8px 12px;border:1px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(input.message)}</td></tr>
          </table>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Submitted via ${escapeHtml(siteName)} website</p>
        </div>`;

      if (resendKey) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);
          const fromEmail = (await getSetting("newsletter_from_email"))?.value ?? "noreply@getjaime.io";
          await resend.emails.send({
            from: `${siteName} Forms <${fromEmail}>`,
            to: notificationEmail,
            replyTo: input.email,
            subject: `[${siteName}] New ${labels[input.formType]} from ${input.name}`,
            html: emailHtml,
          });
        } catch (err) {
          console.error("[Pages] Email send failed:", err);
        }
      } else {
        console.log(`[Pages] No Resend key — form from ${input.email} logged only`);
      }
      return { success: true };
    }),

  getPublic: publicProcedure
    .input(z.object({ hostname: z.string(), slug: z.string() }))
    .query(async ({ input }) => {
      const { resolveLicense } = await import("../auth/licenseAuth");
      let licenseId: number | null = null;
      try {
        const license = await resolveLicense(input.hostname);
        if (license) licenseId = license.id;
      } catch {}
      if (!licenseId) return DEFAULT_CONTENT[input.slug] || {};
      const db = await getDb();
      if (!db) return DEFAULT_CONTENT[input.slug] || {};
      const [row] = await db.select().from(publicationPages)
        .where(and(eq(publicationPages.licenseId, licenseId), eq(publicationPages.pageSlug, input.slug)))
        .limit(1);
      if (row?.content) {
        try { return JSON.parse(row.content); } catch {}
      }
      return DEFAULT_CONTENT[input.slug] || {};
    }),

  get: publicProcedure
    .input(z.object({ licenseId: z.number(), slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [row] = await db.select().from(publicationPages)
        .where(and(eq(publicationPages.licenseId, input.licenseId), eq(publicationPages.pageSlug, input.slug)))
        .limit(1);
      if (row?.content) {
        try { return JSON.parse(row.content); } catch { /* fall through */ }
      }
      return DEFAULT_CONTENT[input.slug] || {};
    }),

  update: protectedProcedure
    .input(z.object({ licenseId: z.number(), slug: z.string(), content: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db.select().from(publicationPages)
        .where(and(eq(publicationPages.licenseId, input.licenseId), eq(publicationPages.pageSlug, input.slug)))
        .limit(1);
      if (existing) {
        await db.update(publicationPages).set({ content: input.content }).where(eq(publicationPages.id, existing.id));
      } else {
        await db.insert(publicationPages).values({
          licenseId: input.licenseId,
          pageSlug: input.slug,
          content: input.content,
        });
      }
      return { success: true };
    }),

  reset: protectedProcedure
    .input(z.object({ licenseId: z.number(), slug: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(publicationPages)
        .where(and(eq(publicationPages.licenseId, input.licenseId), eq(publicationPages.pageSlug, input.slug)));
      return { success: true };
    }),

  list: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { pages: [] };
      const lid = ctx.licenseId!;
      const rows = await db.select().from(publicationPages).where(eq(publicationPages.licenseId, lid)).orderBy(publicationPages.sortOrder);
      return { pages: rows.map(r => ({
        id: r.id, title: r.title || r.pageSlug, slug: r.pageSlug,
        content: r.content || "", status: r.status || "published",
        template: r.template || "custom", isSystemPage: !!r.isSystemPage,
        seoTitle: r.seoTitle || null, seoDescription: r.seoDescription || null,
        sortOrder: r.sortOrder || 0,
      }))};
    }),

  // Tenant-aware save (create or update)
  save: tenantOrAdminProcedure
    .input(z.object({
      id: z.number().optional(),
      title: z.string(),
      slug: z.string(),
      content: z.string(),
      status: z.enum(["draft", "published"]).default("published"),
      template: z.string().default("custom"),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      isPublished: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lid = ctx.licenseId!;
      const [existing] = await db.select().from(publicationPages)
        .where(and(eq(publicationPages.licenseId, lid), eq(publicationPages.pageSlug, input.slug)))
        .limit(1);
      const data = {
        title: input.title,
        content: input.content,
        status: input.status as any,
        template: input.template,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
      };
      if (existing) {
        await db.update(publicationPages).set(data).where(eq(publicationPages.id, existing.id));
      } else {
        await db.insert(publicationPages).values({ ...data, licenseId: lid, pageSlug: input.slug });
      }
      return { success: true };
    }),

  checkSlug: tenantOrAdminProcedure
    .input(z.object({ slug: z.string(), excludeId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { available: false };
      const lid = ctx.licenseId!;
      const rows = await db.select({ id: publicationPages.id }).from(publicationPages)
        .where(and(eq(publicationPages.licenseId, lid), eq(publicationPages.pageSlug, input.slug)));
      const taken = rows.filter(r => input.excludeId ? r.id !== input.excludeId : true);
      return { available: taken.length === 0 };
    }),

  // Delete (custom pages only)
  deletePage: tenantOrAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lid = ctx.licenseId!;
      const DEFAULT_SLUGS = ["advertise", "privacy", "contact", "sitemap-page", "about"];
      const [page] = await db.select().from(publicationPages).where(and(eq(publicationPages.id, input.id), eq(publicationPages.licenseId, lid))).limit(1);
      if (page && DEFAULT_SLUGS.includes(page.pageSlug)) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete default pages" });
      await db.delete(publicationPages).where(and(eq(publicationPages.id, input.id), eq(publicationPages.licenseId, lid)));
      return { success: true };
    }),

  create: tenantOrAdminProcedure
    .input(z.object({
      title: z.string().min(1),
      slug: z.string().min(1),
      template: z.string().default("custom"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lid = ctx.licenseId!;
      const [existing] = await db.select({ id: publicationPages.id })
        .from(publicationPages)
        .where(and(eq(publicationPages.licenseId, lid), eq(publicationPages.pageSlug, input.slug)))
        .limit(1);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "A page with this slug already exists" });
      const result = await db.insert(publicationPages).values({
        licenseId: lid,
        pageSlug: input.slug,
        title: input.title,
        content: JSON.stringify({ body: "" }),
      } as any);
      return { id: Number((result as any)[0]?.insertId ?? 0), slug: input.slug };
    }),

  reorder: tenantOrAdminProcedure
    .input(z.object({ pageIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lid = ctx.licenseId!;
      for (let i = 0; i < input.pageIds.length; i++) {
        await db.update(publicationPages)
          .set({ sortOrder: i } as any)
          .where(and(eq(publicationPages.id, input.pageIds[i]), eq(publicationPages.licenseId, lid)));
      }
      return { success: true };
    }),
});
