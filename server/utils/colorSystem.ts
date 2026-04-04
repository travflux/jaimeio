/**
 * Color System — WCAG-compliant palette generation from brand colors.
 * All public pages derive their entire color scheme from brand_primary_color
 * and brand_secondary_color stored in license_settings.
 */

// ─── Primitives ─────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
    .join("");
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r: rr, g: gg, b: bb } = hexToRgb(hex);
  const r = rr / 255, g = gg / 255, b = bb / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let rr = 0, gg = 0, bb = 0;
  if (h < 60) { rr = c; gg = x; }
  else if (h < 120) { rr = x; gg = c; }
  else if (h < 180) { gg = c; bb = x; }
  else if (h < 240) { gg = x; bb = c; }
  else if (h < 300) { rr = x; bb = c; }
  else { rr = c; bb = x; }
  return rgbToHex((rr + m) * 255, (gg + m) * 255, (bb + m) * 255);
}

// ─── Luminance & Contrast ───────────────────────────────────────────────────

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rL, gL, bL] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ensureContrast(fg: string, bg: string, minRatio = 4.5): string {
  if (getContrastRatio(fg, bg) >= minRatio) return fg;
  const bgLum = getRelativeLuminance(bg);
  const { h, s } = hexToHsl(fg);
  let { l } = hexToHsl(fg);
  // Darken fg if bg is light, lighten if bg is dark
  if (bgLum > 0.5) {
    for (let i = 0; i < 20; i++) {
      l = Math.max(0, l - 5);
      const candidate = hslToHex(h, s, l);
      if (getContrastRatio(candidate, bg) >= minRatio) return candidate;
    }
    return "#0a0a0a";
  } else {
    for (let i = 0; i < 20; i++) {
      l = Math.min(100, l + 5);
      const candidate = hslToHex(h, s, l);
      if (getContrastRatio(candidate, bg) >= minRatio) return candidate;
    }
    return "#fafafa";
  }
}

// ─── Lighten / Darken ───────────────────────────────────────────────────────

export function lighten(hex: string, percent: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.min(100, l + (100 - l) * (percent / 100)));
}

export function darken(hex: string, percent: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - l * (percent / 100)));
}

// ─── Palette ────────────────────────────────────────────────────────────────

export interface BrandPalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  border: string;
  text_primary: string;
  text_secondary: string;
  nav_bg: string;
  nav_text: string;
  footer_bg: string;
  footer_text: string;
  button_bg: string;
  button_text: string;
  link_color: string;
  accent: string;
  category_colors: string[];
}

export function generatePalette(primaryHex: string, secondaryHex: string): BrandPalette {
  const background = lighten(primaryHex, 95);
  const surface = lighten(primaryHex, 90);
  const border = lighten(primaryHex, 70);
  const nav_bg = secondaryHex;
  const footer_bg = secondaryHex;

  const { h: pH } = hexToHsl(primaryHex);

  const category_colors = [
    primaryHex,
    secondaryHex,
    hslToHex((pH + 60) % 360, 55, 45),
    hslToHex((pH + 120) % 360, 55, 45),
    hslToHex((pH + 180) % 360, 55, 45),
    hslToHex((pH + 240) % 360, 55, 45),
  ];

  return {
    primary: primaryHex,
    secondary: secondaryHex,
    background,
    surface,
    border,
    text_primary: ensureContrast(darken(primaryHex, 80), background, 4.5),
    text_secondary: ensureContrast(darken(primaryHex, 60), background, 4.5),
    nav_bg,
    nav_text: ensureContrast("#ffffff", nav_bg, 4.5),
    footer_bg,
    footer_text: ensureContrast("#ffffff", footer_bg, 4.5),
    button_bg: secondaryHex,
    button_text: ensureContrast("#ffffff", secondaryHex, 4.5),
    link_color: ensureContrast(secondaryHex, background, 4.5),
    accent: secondaryHex,
    category_colors,
  };
}

export function generateCssVariables(palette: BrandPalette): string {
  return `:root {
  --brand-primary: ${palette.primary};
  --brand-secondary: ${palette.secondary};
  --brand-background: ${palette.background};
  --brand-surface: ${palette.surface};
  --brand-border: ${palette.border};
  --brand-text-primary: ${palette.text_primary};
  --brand-text-secondary: ${palette.text_secondary};
  --brand-nav-bg: ${palette.nav_bg};
  --brand-nav-text: ${palette.nav_text};
  --brand-footer-bg: ${palette.footer_bg};
  --brand-footer-text: ${palette.footer_text};
  --brand-button-bg: ${palette.button_bg};
  --brand-button-text: ${palette.button_text};
  --brand-link: ${palette.link_color};
  --brand-accent: ${palette.accent};
${palette.category_colors.map((c, i) => `  --brand-cat-${i}: ${c};`).join("\n")}
}`;
}

/** Backward-compat alias used by existing colorSystem router */
export const generateComplementaryPalette = generatePalette;
