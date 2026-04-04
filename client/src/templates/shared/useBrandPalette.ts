import { useMemo } from "react";
import type { LicenseSettings } from "./types";

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

const DEFAULTS: BrandPalette = {
  primary: "#2DD4BF",
  secondary: "#0F2D5E",
  background: "#faf9f7",
  surface: "#f3f0ed",
  border: "#e5e7eb",
  text_primary: "#0a0a0a",
  text_secondary: "#6b7280",
  nav_bg: "#0a1e3f",
  nav_text: "#ffffff",
  footer_bg: "#0f2d5e",
  footer_text: "#ffffff",
  button_bg: "#2DD4BF",
  button_text: "#ffffff",
  link_color: "#2DD4BF",
  accent: "#2DD4BF",
  category_colors: [],
};

export function useTemplatePalette(licenseSettings: LicenseSettings): BrandPalette {
  return useMemo(() => {
    if (licenseSettings.brand_palette) {
      try {
        return { ...DEFAULTS, ...JSON.parse(licenseSettings.brand_palette) };
      } catch { /* fall through */ }
    }
    return DEFAULTS;
  }, [licenseSettings.brand_palette]);
}
