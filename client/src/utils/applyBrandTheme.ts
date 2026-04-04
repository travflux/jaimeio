/**
 * Apply brand color palette as CSS custom properties on :root.
 * Called on public publication pages only (not admin).
 */
export interface BrandPalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text_primary: string;
  text_secondary: string;
  accent: string;
  border: string;
  nav_bg: string;
  nav_text: string;
  footer_bg: string;
  footer_text: string;
  button_bg: string;
  button_text: string;
  link_color: string;
  category_colors?: string[];
}

const DEFAULT_PALETTE: BrandPalette = {
  primary: "#0f2d5e",
  secondary: "#2dd4bf",
  background: "#faf9f7",
  surface: "#f3f0ed",
  text_primary: "#0a0a0a",
  text_secondary: "#6b7280",
  accent: "#2dd4bf",
  border: "#e5e7eb",
  nav_bg: "#0a1e3f",
  nav_text: "#ffffff",
  footer_bg: "#0f2d5e",
  footer_text: "#ffffff",
  button_bg: "#0f2d5e",
  button_text: "#ffffff",
  link_color: "#2dd4bf",
};

export function applyBrandTheme(palette?: BrandPalette | null) {
  const p = palette || DEFAULT_PALETTE;
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", p.primary);
  root.style.setProperty("--brand-secondary", p.secondary);
  root.style.setProperty("--brand-background", p.background);
  root.style.setProperty("--brand-surface", p.surface);
  root.style.setProperty("--brand-text-primary", p.text_primary);
  root.style.setProperty("--brand-text-secondary", p.text_secondary);
  root.style.setProperty("--brand-accent", p.accent);
  root.style.setProperty("--brand-border", p.border);
  root.style.setProperty("--brand-nav-bg", p.nav_bg);
  root.style.setProperty("--brand-nav-text", p.nav_text);
  root.style.setProperty("--brand-footer-bg", p.footer_bg);
  root.style.setProperty("--brand-footer-text", p.footer_text);
  root.style.setProperty("--brand-button-bg", p.button_bg);
  root.style.setProperty("--brand-button-text", p.button_text);
  root.style.setProperty("--brand-link", p.link_color);
  if (p.category_colors) {
    p.category_colors.forEach((c, i) => root.style.setProperty(`--brand-cat-${i}`, c));
  }
}
