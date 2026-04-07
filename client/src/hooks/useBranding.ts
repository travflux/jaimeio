import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

/**
 * Branding configuration loaded from the database.
 * All values have sensible defaults so components never render blank.
 */
export interface BrandingConfig {
  // Brand Identity
  siteName: string;
  tagline: string;
  description: string;
  logoUrl: string;

  // Colors
  colorPrimary: string;
  colorSecondary: string;

  // Contact
  contactEmail: string;
  editorEmail: string;
  privacyEmail: string;
  legalEmail: string;
  correctionsEmail: string;
  moderationEmail: string;

  // Social
  twitterHandle: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;

  // Legal
  companyName: string;
  foundedYear: string;

  // Content
  genre: string;
  tone: string;
  editorialTeam: string;

  // SEO
  seoKeywords: string;
  ogImage: string;

  // Favicon
  faviconUrl: string;

  // Legal
  disclaimer: string;

  // Site URL (for canonical domain detection)
  siteUrl: string;

  // Loading screen (v4.7.2)
  loadingStyle: "spinner" | "logo" | "none";
  loadingLogoUrl: string;
  loadingText: string;

  // Analytics (v4.7.3)
  gtagId: string;

  // Analytics (v4.8.0)
  clarityId: string;

  // Shop (v4.9.9)
  printifyEnabled: boolean;
  shopExternalUrl: string;

  // Typography (v4.9.9)
  headingFont: string;
  bodyFont: string;

  // White-label attribution (v4.9.1)
  poweredByUrl: string;

  // Business & Contact (v5.0)
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  businessPhone: string;
  businessWebsite: string;

  // Social links (v5.0)
  socialXUrl: string;
  socialInstagramUrl: string;
  socialLinkedinUrl: string;
  socialFacebookUrl: string;
  socialTiktokUrl: string;
  socialPinterestUrl: string;

  // Masthead customization (v4.9.6)
  mastheadBgColor: string;
  mastheadTextColor: string;
  mastheadFontFamily: string;
  mastheadFontSize: "small" | "medium" | "large" | "extra-large";
  mastheadLayout: "center" | "left" | "logo-only";
  mastheadShowTagline: boolean;
  mastheadShowDate: boolean;
  mastheadDateBgColor: string;
  mastheadLogoHeight: number;
  mastheadPadding: "compact" | "medium" | "spacious";
  mastheadBorderBottom: boolean;
  mastheadBorderColor: string;
}

const DEFAULTS: BrandingConfig = {
  siteName: "",
  tagline: "",
  description: "",
  logoUrl: "/logo.svg",
  colorPrimary: "#0f2d5e",
  colorSecondary: "#2dd4bf",
  contactEmail: "contact@example.com",
  editorEmail: "editor@example.com",
  privacyEmail: "privacy@example.com",
  legalEmail: "legal@example.com",
  correctionsEmail: "corrections@example.com",
  moderationEmail: "moderation@example.com",
  twitterHandle: "",
  twitterUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  companyName: "Your Company Name",
  foundedYear: "2026",
  genre: "",
  tone: "",
  editorialTeam: "",
  seoKeywords: "",
  ogImage: "",
  faviconUrl: "",
  disclaimer: "",
  siteUrl: "",
  loadingStyle: "spinner",
  loadingLogoUrl: "",
  loadingText: "",
  gtagId: "",
  clarityId: "",
  printifyEnabled: false,
  shopExternalUrl: "",
  headingFont: "",
  bodyFont: "",
  poweredByUrl: "https://getjaime.io",

  // Business & Contact (v5.0)
  businessName: "",
  businessAddress: "",
  businessEmail: "",
  businessPhone: "",
  businessWebsite: "",

  // Social links (v5.0)
  socialXUrl: "",
  socialInstagramUrl: "",
  socialLinkedinUrl: "",
  socialFacebookUrl: "",
  socialTiktokUrl: "",
  socialPinterestUrl: "",

  // Masthead customization (v4.9.6)
  mastheadBgColor: "",
  mastheadTextColor: "#ffffff",
  mastheadFontFamily: "serif",
  mastheadFontSize: "large",
  mastheadLayout: "center",
  mastheadShowTagline: true,
  mastheadShowDate: true,
  mastheadDateBgColor: "",
  mastheadLogoHeight: 60,
  mastheadPadding: "medium",
  mastheadBorderBottom: false,
  mastheadBorderColor: "",
};

/**
 * Map a DB key like "brand_site_name" to the BrandingConfig field "siteName"
 */
function mapKeyToField(key: string): keyof BrandingConfig | null {
  const mapping: Record<string, keyof BrandingConfig> = {
    brand_site_name: "siteName",
    brand_tagline: "tagline",
    brand_description: "description",
    brand_logo_url: "logoUrl",
    brand_color_primary: "colorPrimary",
    brand_color_secondary: "colorSecondary",
    brand_contact_email: "contactEmail",
    brand_editor_email: "editorEmail",
    brand_privacy_email: "privacyEmail",
    brand_legal_email: "legalEmail",
    brand_corrections_email: "correctionsEmail",
    brand_moderation_email: "moderationEmail",
    brand_twitter_handle: "twitterHandle",
    brand_twitter_url: "twitterUrl",
    brand_facebook_url: "facebookUrl",
    brand_instagram_url: "instagramUrl",
    brand_company_name: "companyName",
    brand_founded_year: "foundedYear",
    brand_genre: "genre",
    brand_tone: "tone",
    brand_editorial_team: "editorialTeam",
    brand_seo_keywords: "seoKeywords",
    brand_og_image: "ogImage",
    brand_favicon_url: "faviconUrl",
    brand_disclaimer: "disclaimer",
    site_url: "siteUrl",
    loading_style: "loadingStyle",
    loading_logo_url: "loadingLogoUrl",
    loading_text: "loadingText",
    brand_gtag_id: "gtagId",
    brand_clarity_id: "clarityId",
    printify_enabled: "printifyEnabled",
    shop_external_url: "shopExternalUrl",
    brand_heading_font: "headingFont",
    brand_body_font: "bodyFont",
    powered_by_url: "poweredByUrl",
    brand_business_name: "businessName",
    brand_address: "businessAddress",
    brand_contact_email: "businessEmail",
    brand_phone: "businessPhone",
    brand_website_url: "businessWebsite",
    social_x_url: "socialXUrl",
    social_instagram_url: "socialInstagramUrl",
    social_linkedin_url: "socialLinkedinUrl",
    social_facebook_url: "socialFacebookUrl",
    social_tiktok_url: "socialTiktokUrl",
    social_pinterest_url: "socialPinterestUrl",
    masthead_bg_color: "mastheadBgColor",
    masthead_text_color: "mastheadTextColor",
    masthead_font_family: "mastheadFontFamily",
    masthead_font_size: "mastheadFontSize",
    masthead_layout: "mastheadLayout",
    masthead_show_tagline: "mastheadShowTagline",
    masthead_show_date: "mastheadShowDate",
    masthead_date_bg_color: "mastheadDateBgColor",
    masthead_logo_height: "mastheadLogoHeight",
    masthead_padding: "mastheadPadding",
    masthead_border_bottom: "mastheadBorderBottom",
    masthead_border_color: "mastheadBorderColor",
  };
  return mapping[key] ?? null;
}

/**
 * Hook to load branding configuration from the database.
 * Returns defaults while loading, then merges DB values on top.
 * Uses a public endpoint so it works for unauthenticated visitors.
 */
export function useBranding(): { branding: BrandingConfig; isLoading: boolean } {
  const { data: raw, isLoading } = trpc.branding.get.useQuery({ hostname: window.location.hostname }, {
    staleTime: 30 * 1000, // Cache for 30 seconds only
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Fields that must be coerced from DB strings to their correct runtime types
  const BOOLEAN_FIELDS = new Set<keyof BrandingConfig>([
    "mastheadShowTagline",
    "mastheadShowDate",
    "mastheadBorderBottom",
    "printifyEnabled",
  ]);
  const NUMBER_FIELDS = new Set<keyof BrandingConfig>(["mastheadLogoHeight"]);

  const branding = useMemo<BrandingConfig>(() => {
    if (!raw) return DEFAULTS;
    const config = { ...DEFAULTS };
    for (const [key, value] of Object.entries(raw)) {
      const field = mapKeyToField(key);
      if (!field) continue;
      if (BOOLEAN_FIELDS.has(field)) {
        // DB stores "true"/"false" strings; coerce to boolean
        (config as any)[field] = value === "true";
      } else if (NUMBER_FIELDS.has(field)) {
        const n = Number(value);
        if (!isNaN(n)) (config as any)[field] = n;
      } else if (value) {
        (config as any)[field] = value;
      }
    }
    return config;
  }, [raw]);

  return { branding, isLoading };
}
