/**
 * Color System tRPC Router — generates accessible palettes from brand colors.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { generateComplementaryPalette } from "../utils/colorSystem";
import * as db from "../db";

export const colorSystemRouter = router({
  generatePalette: protectedProcedure
    .input(z.object({ primaryColor: z.string(), secondaryColor: z.string() }))
    .mutation(async ({ input }) => {
      const palette = generateComplementaryPalette(input.primaryColor, input.secondaryColor);
      // Store in license_settings
      await db.setSetting("brand_palette", JSON.stringify(palette), "branding");
      return palette;
    }),

  getPalette: protectedProcedure.query(async () => {
    const setting = await db.getSetting("brand_palette");
    if (setting?.value) {
      try { return JSON.parse(setting.value); } catch { return null; }
    }
    return null;
  }),
});
