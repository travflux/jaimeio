import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { publicationPages } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

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

  list: publicProcedure
    .input(z.object({ licenseId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(publicationPages).where(eq(publicationPages.licenseId, input.licenseId));
    }),
});
