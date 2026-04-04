/**
 * Hook to read the generated brand palette from license settings.
 */
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import type { BrandPalette } from "@/utils/applyBrandTheme";

const DEFAULTS: BrandPalette = {
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

export function useBrandPalette(): { palette: BrandPalette; isLoading: boolean } {
  const { data: raw, isLoading } = trpc.branding.get.useQuery({ hostname: window.location.hostname }, {
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const palette = useMemo<BrandPalette>(() => {
    if (!raw) return DEFAULTS;
    const paletteStr = (raw as Record<string, string>).brand_palette;
    if (paletteStr) {
      try { return { ...DEFAULTS, ...JSON.parse(paletteStr) }; } catch { /* fall through */ }
    }
    return DEFAULTS;
  }, [raw]);

  return { palette, isLoading };
}
