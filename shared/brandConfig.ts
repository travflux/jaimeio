/**
 * WHITE_LABEL_CONFIG — Central brand configuration for the Satire Engine.
 *
 * These are the FALLBACK values used when a setting has not yet been
 * persisted to the database (e.g., on a fresh install before the admin
 * has configured branding).  They are intentionally generic so a new
 * client deployment never leaks the previous operator's brand name.
 *
 * ─── DO NOT hardcode operator-specific values here ───────────────────
 * All real brand values live in the `workflow_settings` DB table under
 * the `brand_*` keys.  The server reads them via `getSetting()` and the
 * client reads them via the `useBranding()` hook.
 *
 * This file exists only to give TypeScript a single import point for
 * the shape of the config and to provide safe, neutral fallbacks.
 */

export interface WhiteLabelConfig {
  /** Publication display name, e.g. "Acme News" */
  siteName: string;
  /** Canonical site URL, e.g. "https://acmenews.com" */
  siteUrl: string;
  /** X/Twitter handle including @, e.g. "@acmenews" */
  twitterHandle: string;
  /** Full X/Twitter profile URL */
  twitterUrl: string;
  /** General contact email */
  contactEmail: string;
  /** Editor / editorial inquiries email */
  editorEmail: string;
  /** Privacy inquiries email */
  privacyEmail: string;
  /** Legal inquiries email */
  legalEmail: string;
  /** Corrections email */
  correctionsEmail: string;
  /** Community moderation email */
  moderationEmail: string;
  /** Legal company name */
  companyName: string;
  /** Editorial team display name (used in bylines and schema.org) */
  editorialTeam: string;
  /** Mascot display name */
  mascotName: string;
  /** Path to mascot image (relative to public/) */
  mascotUrl: string;
  /** Default Open Graph / Twitter Card image path */
  ogImage: string;
  /** Default watermark text overlaid on generated images */
  watermarkText: string;
  /** Bot user-agent string for outbound HTTP requests */
  userAgent: string;
}

/**
 * Generic fallback values — safe for any white-label deployment.
 * Replace with real values via the Admin > Settings > Branding panel.
 */
export const WHITE_LABEL_CONFIG: WhiteLabelConfig = {
  siteName: "Your Publication Name",
  siteUrl: "https://example.com",
  twitterHandle: "@yourbrand",
  twitterUrl: "https://x.com/yourbrand",
  contactEmail: "contact@example.com",
  editorEmail: "editor@example.com",
  privacyEmail: "privacy@example.com",
  legalEmail: "legal@example.com",
  correctionsEmail: "corrections@example.com",
  moderationEmail: "moderation@example.com",
  companyName: "Your Company Name",
  editorialTeam: "Editorial Team",
  mascotName: "Mascot",
  mascotUrl: "/mascot.png",
  ogImage: "/og-image.jpg",
  watermarkText: "example.com",
  userAgent: "SatireEngine/1.0",
};
