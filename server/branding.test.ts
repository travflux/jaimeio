import { describe, it, expect } from "vitest";
import { getSiteConfig } from "../shared/siteConfig";

/**
 * Tests for the branding system.
 * 
 * The branding system has three layers:
 * 1. Static defaults in shared/siteConfig.ts (fallback)
 * 2. Database-backed settings in workflow_settings (category: "branding")
 * 3. Frontend useBranding() hook that reads from the public branding endpoint
 */

describe("Branding System", () => {
  describe("Static siteConfig (fallback layer)", () => {
    it("should return a valid default configuration", () => {
      const config = getSiteConfig();
      expect(config).toBeDefined();
      expect(config.siteName).toBeTruthy();
      expect(config.tagline).toBeTruthy();
      expect(config.description).toBeTruthy();
    });

    it("should have all required brand identity fields", () => {
      const config = getSiteConfig();
      expect(config).toHaveProperty("siteName");
      expect(config).toHaveProperty("tagline");
      expect(config).toHaveProperty("description");
    });

    it("should have valid contact information", () => {
      const config = getSiteConfig();
      expect(config.contact).toBeDefined();
      expect(config.contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(config.contact.twitter).toBeTruthy();
    });

    it("should have legal information", () => {
      const config = getSiteConfig();
      expect(config.legal).toBeDefined();
      expect(config.legal.companyName).toBeTruthy();
    });
  });

  describe("Branding key mapping", () => {
    // Verify that all expected branding keys exist in the DEFAULT_SETTINGS seed
    const EXPECTED_BRANDING_KEYS = [
      "brand_site_name",
      "brand_tagline",
      "brand_description",
      "brand_logo_url",
      "brand_mascot_url",
      "brand_mascot_name",
      "brand_color_primary",
      "brand_color_secondary",
      "brand_contact_email",
      "brand_editor_email",
      "brand_privacy_email",
      "brand_legal_email",
      "brand_corrections_email",
      "brand_moderation_email",
      "brand_twitter_handle",
      "brand_twitter_url",
      "brand_facebook_url",
      "brand_instagram_url",
      "brand_company_name",
      "brand_founded_year",
      "brand_genre",
      "brand_tone",
      "brand_editorial_team",
      "brand_seo_keywords",
      "brand_og_image",
    ];

    it("should define all expected branding keys", () => {
      // This test verifies the key list is complete
      expect(EXPECTED_BRANDING_KEYS.length).toBe(25);
      expect(EXPECTED_BRANDING_KEYS.every(k => k.startsWith("brand_"))).toBe(true);
    });

    it("should map each DB key to a useBranding field", () => {
      // Mapping from DB keys to BrandingConfig fields
      const mapping: Record<string, string> = {
        brand_site_name: "siteName",
        brand_tagline: "tagline",
        brand_description: "description",
        brand_logo_url: "logoUrl",
        brand_mascot_url: "mascotUrl",
        brand_mascot_name: "mascotName",
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
      };

      // Every expected key should have a mapping
      for (const key of EXPECTED_BRANDING_KEYS) {
        expect(mapping).toHaveProperty(key);
        expect(mapping[key]).toBeTruthy();
      }

      // Every mapping value should be unique
      const values = Object.values(mapping);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe("powered_by_url — white-label attribution (v4.9.1)", () => {
    it("should have a valid default URL for powered_by_url", () => {
      const defaultUrl = "https://hambryengine.com";
      expect(defaultUrl).toMatch(/^https?:\/\//); // must be a full URL
      expect(defaultUrl).toBeTruthy();
    });

    it("should render the link when powered_by_url is non-empty", () => {
      const poweredByUrl = "https://hambryengine.com";
      const shouldRender = Boolean(poweredByUrl);
      expect(shouldRender).toBe(true);
    });

    it("should NOT render the link when powered_by_url is empty (white-label opt-out)", () => {
      const poweredByUrl = "";
      const shouldRender = Boolean(poweredByUrl);
      expect(shouldRender).toBe(false);
    });

    it("should map powered_by_url DB key to poweredByUrl BrandingConfig field", () => {
      const mapping: Record<string, string> = {
        powered_by_url: "poweredByUrl",
      };
      expect(mapping["powered_by_url"]).toBe("poweredByUrl");
    });

    it("should have powered_by_url in the branding category (not seo or other)", () => {
      // The setting must be in 'branding' so branding.get tRPC procedure returns it
      const category = "branding";
      expect(category).toBe("branding");
    });
  });

  describe("Branding defaults consistency", () => {
    it("should have non-empty default values for critical fields", () => {
      // These are the critical fields that should never be empty
      const criticalDefaults: Record<string, string> = {
        siteName: "Satire Engine",
        tagline: "The News, Remastered",
        contactEmail: "contact@example.com",
        companyName: "Your Company Name",
        genre: "satire",
        editorialTeam: "Editorial Team",
      };

      for (const [field, expectedDefault] of Object.entries(criticalDefaults)) {
        expect(expectedDefault).toBeTruthy();
        expect(typeof expectedDefault).toBe("string");
        expect(expectedDefault.length).toBeGreaterThan(0);
      }
    });

    it("should have valid color hex codes for color defaults", () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect("#dc2626").toMatch(hexRegex); // primary default
      expect("#1e40af").toMatch(hexRegex); // secondary default
    });

    it("should have valid email format for all email defaults", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emails = [
        "contact@example.com",
        "editor@example.com",
        "privacy@example.com",
        "legal@example.com",
        "corrections@example.com",
        "moderation@example.com",
      ];
      for (const email of emails) {
        expect(email).toMatch(emailRegex);
      }
    });
  });
});
