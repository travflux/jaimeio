/**
 * Apply brand fonts — loads Google Fonts and sets CSS variables.
 * Called on public publication pages alongside applyBrandTheme().
 */

const loadedFontLinks = new Set<string>();

export function applyBrandFonts(headingFont?: string, bodyFont?: string) {
  const heading = headingFont || "Playfair Display";
  const body = bodyFont || "Inter";

  // Build Google Fonts URL
  const families = [heading, body]
    .filter(Boolean)
    .map(f => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`)
    .join("&");
  const url = `https://fonts.googleapis.com/css2?${families}&display=swap`;

  // Inject link if not already loaded
  if (!loadedFontLinks.has(url)) {
    loadedFontLinks.add(url);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }

  // Set CSS variables
  const root = document.documentElement;
  root.style.setProperty("--brand-font-heading", `"${heading}", serif`);
  root.style.setProperty("--brand-font-body", `"${body}", sans-serif`);
}
