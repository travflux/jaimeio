/**
 * masthead-settings.test.ts
 * v4.9.6 — Verify the 12 masthead customization settings exist in DEFAULT_SETTINGS
 * and that the Navbar helper functions produce correct output.
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "./db";

// ─── Helper functions (copied from Navbar.tsx for server-side testing) ───────

function mastheadBgStyle(b: { mastheadBgColor: string; colorPrimary: string }): string {
  return b.mastheadBgColor || b.colorPrimary || "#dc2626";
}

function paddingClass(padding: string): string {
  switch (padding) {
    case "compact":  return "py-2 sm:py-3";
    case "spacious": return "py-8 sm:py-10";
    default:         return "py-5 sm:py-6";
  }
}

function fontSizeClass(size: string, scrolled: boolean): string {
  if (scrolled) return "text-2xl sm:text-3xl";
  switch (size) {
    case "small":       return "text-2xl sm:text-3xl";
    case "medium":      return "text-3xl sm:text-4xl";
    case "extra-large": return "text-5xl sm:text-6xl lg:text-7xl";
    default:            return "text-4xl sm:text-5xl lg:text-6xl";
  }
}

function fontFamilyStyle(family: string): string {
  switch (family) {
    case "serif":      return "Georgia, 'Times New Roman', serif";
    case "sans-serif": return "system-ui, -apple-system, sans-serif";
    default:           return `'${family}', serif`;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

const MASTHEAD_KEYS = [
  "masthead_bg_color",
  "masthead_text_color",
  "masthead_font_family",
  "masthead_font_size",
  "masthead_layout",
  "masthead_show_tagline",
  "masthead_show_date",
  "masthead_date_bg_color",
  "masthead_logo_height",
  "masthead_padding",
  "masthead_border_bottom",
  "masthead_border_color",
] as const;

describe("masthead settings — DEFAULT_SETTINGS", () => {
  it("all 12 masthead keys exist in DEFAULT_SETTINGS", () => {
    const keys = DEFAULT_SETTINGS.map(s => s.key);
    for (const k of MASTHEAD_KEYS) {
      expect(keys, `Missing key: ${k}`).toContain(k);
    }
  });

  it("all 12 masthead settings have category: branding", () => {
    for (const k of MASTHEAD_KEYS) {
      const setting = DEFAULT_SETTINGS.find(s => s.key === k);
      expect(setting?.category, `${k} should be category branding`).toBe("branding");
    }
  });

  it("masthead_text_color defaults to #ffffff", () => {
    const s = DEFAULT_SETTINGS.find(s => s.key === "masthead_text_color");
    expect(s?.value).toBe("#ffffff");
  });

  it("masthead_font_family defaults to serif", () => {
    const s = DEFAULT_SETTINGS.find(s => s.key === "masthead_font_family");
    expect(s?.value).toBe("serif");
  });

  it("masthead_font_size defaults to large", () => {
    const s = DEFAULT_SETTINGS.find(s => s.key === "masthead_font_size");
    expect(s?.value).toBe("large");
  });

  it("masthead_layout defaults to center", () => {
    const s = DEFAULT_SETTINGS.find(s => s.key === "masthead_layout");
    expect(s?.value).toBe("center");
  });

  it("masthead_show_tagline defaults to true (string)", () => {
    const s = DEFAULT_SETTINGS.find(s => s.key === "masthead_show_tagline");
    expect(s?.value).toBe("true");
  });

  it("masthead_show_date defaults to true (string)", () => {
    const s = DEFAULT_SETTINGS.find(s => s.key === "masthead_show_date");
    expect(s?.value).toBe("true");
  });

  it("masthead_logo_height defaults to 60", () => {
    const s = DEFAULT_SETTINGS.find(s => s.key === "masthead_logo_height");
    expect(s?.value).toBe("60");
  });

  it("masthead_padding defaults to medium", () => {
    const s = DEFAULT_SETTINGS.find(s => s.key === "masthead_padding");
    expect(s?.value).toBe("medium");
  });

  it("masthead_border_bottom defaults to false (string)", () => {
    const s = DEFAULT_SETTINGS.find(s => s.key === "masthead_border_bottom");
    expect(s?.value).toBe("false");
  });

  it("masthead_bg_color and masthead_date_bg_color default to empty string (falls back to brand color)", () => {
    const bg = DEFAULT_SETTINGS.find(s => s.key === "masthead_bg_color");
    const dateBg = DEFAULT_SETTINGS.find(s => s.key === "masthead_date_bg_color");
    expect(bg?.value).toBe("");
    expect(dateBg?.value).toBe("");
  });
});

describe("mastheadBgStyle helper", () => {
  it("uses mastheadBgColor when set", () => {
    expect(mastheadBgStyle({ mastheadBgColor: "#003366", colorPrimary: "#dc2626" })).toBe("#003366");
  });

  it("falls back to colorPrimary when mastheadBgColor is empty", () => {
    expect(mastheadBgStyle({ mastheadBgColor: "", colorPrimary: "#dc2626" })).toBe("#dc2626");
  });

  it("falls back to hardcoded red when both are empty", () => {
    expect(mastheadBgStyle({ mastheadBgColor: "", colorPrimary: "" })).toBe("#dc2626");
  });
});

describe("paddingClass helper", () => {
  it("compact returns compact padding", () => {
    expect(paddingClass("compact")).toBe("py-2 sm:py-3");
  });

  it("spacious returns spacious padding", () => {
    expect(paddingClass("spacious")).toBe("py-8 sm:py-10");
  });

  it("medium (default) returns medium padding", () => {
    expect(paddingClass("medium")).toBe("py-5 sm:py-6");
    expect(paddingClass("anything-else")).toBe("py-5 sm:py-6");
  });
});

describe("fontSizeClass helper", () => {
  it("scrolled always returns small size", () => {
    expect(fontSizeClass("extra-large", true)).toBe("text-2xl sm:text-3xl");
    expect(fontSizeClass("large", true)).toBe("text-2xl sm:text-3xl");
  });

  it("small returns small text", () => {
    expect(fontSizeClass("small", false)).toBe("text-2xl sm:text-3xl");
  });

  it("medium returns medium text", () => {
    expect(fontSizeClass("medium", false)).toBe("text-3xl sm:text-4xl");
  });

  it("large (default) returns large text", () => {
    expect(fontSizeClass("large", false)).toBe("text-4xl sm:text-5xl lg:text-6xl");
    expect(fontSizeClass("unknown", false)).toBe("text-4xl sm:text-5xl lg:text-6xl");
  });

  it("extra-large returns xl text", () => {
    expect(fontSizeClass("extra-large", false)).toBe("text-5xl sm:text-6xl lg:text-7xl");
  });
});

describe("fontFamilyStyle helper", () => {
  it("serif returns Georgia stack", () => {
    expect(fontFamilyStyle("serif")).toContain("Georgia");
  });

  it("sans-serif returns system-ui stack", () => {
    expect(fontFamilyStyle("sans-serif")).toContain("system-ui");
  });

  it("custom font name is wrapped in quotes", () => {
    expect(fontFamilyStyle("Playfair Display")).toBe("'Playfair Display', serif");
  });

  it("Merriweather is wrapped correctly", () => {
    expect(fontFamilyStyle("Merriweather")).toBe("'Merriweather', serif");
  });
});
