/**
 * Public Page SSR — Injects brand CSS variables into <head> before React loads.
 * Prevents color flash by ensuring brand colors are available on first paint.
 */
import { resolveLicense } from "./auth/licenseAuth";
import { getDb } from "./db";
import { generatePalette, generateCssVariables } from "./utils/colorSystem";

interface BrandSsrData {
  cssVars: string;
  fontLink: string;
  gaScript: string;
}

const DEFAULT_PRIMARY = "#2DD4BF";
const DEFAULT_SECONDARY = "#0F2D5E";

export async function getBrandSsrData(hostname: string): Promise<BrandSsrData> {
  try {
    if (hostname === "app.getjaime.io" || hostname === "localhost" || hostname === "127.0.0.1") {
      return { cssVars: "", fontLink: "" };
    }

    const license = await resolveLicense(hostname);
    if (!license) return { cssVars: "", fontLink: "" };

    const db = await getDb();
    if (!db) return { cssVars: "", fontLink: "" };

    const { licenseSettings } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(licenseSettings).where(eq(licenseSettings.licenseId, license.id));

    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;

    let cssVars = "";
    if (settings.brand_palette) {
      try {
        const palette = JSON.parse(settings.brand_palette);
        cssVars = generateCssVariables(palette);
      } catch { /* regenerate below */ }
    }

    if (!cssVars) {
      const primary = settings.brand_primary_color || DEFAULT_PRIMARY;
      const secondary = settings.brand_secondary_color || DEFAULT_SECONDARY;
      const palette = generatePalette(primary, secondary);
      cssVars = generateCssVariables(palette);
    }

    const headingFont = settings.brand_heading_font || "Playfair Display";
    const bodyFont = settings.brand_body_font || "Inter";
    const fontLink = `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;600;700&family=${encodeURIComponent(bodyFont)}:wght@400;500;600&display=swap" rel="stylesheet">`;

    cssVars = cssVars.replace(
      "}",
      `  --brand-font-heading: '${headingFont}', Georgia, serif;\n  --brand-font-body: '${bodyFont}', -apple-system, BlinkMacSystemFont, sans-serif;\n}`
    );

    // Google Analytics injection
    const gaId = settings.brand_analytics_id || settings.brand_gtag_id || settings.seo_ga_id || "";
    let gaScript = "";
    if (gaId) {
      gaScript = '<script async src="https://www.googletagmanager.com/gtag/js?id=' + gaId + '"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","' + gaId + '")</script>';
    }

    return { cssVars, fontLink, gaScript };
  } catch (e) {
    console.error("[BrandSSR] Error:", e);
    return { cssVars: "", fontLink: "", gaScript: "" };
  }
}

export function injectBrandTheme(html: string, data: BrandSsrData): string {
  if (!data.cssVars && !data.fontLink && !data.gaScript) return html;

  const injection = [
    data.fontLink,
    data.cssVars ? `<style id="brand-theme">${data.cssVars}</style>` : "",
    data.gaScript || "",
  ].filter(Boolean).join("\n  ");

  return html.replace(/<head[^>]*>/i, `$&\n  ${injection}`);
}
