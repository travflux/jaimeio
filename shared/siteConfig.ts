/**
 * Site Configuration
 * 
 * This file contains all white-label configuration for the content engine.
 * Customize these values for each client deployment.
 * 
 * IMPORTANT CUSTOMIZATIONS:
 * - description: Custom footer tagline (updated 2026-02-20) - do not change without explicit approval
 */

export interface SiteConfig {
  // Brand Identity
  siteName: string;
  tagline: string;
  description: string;
  
  // Visual Branding
  logo: {
    url: string;
    alt: string;
  };
  
  colors: {
    primary: string;      // Main brand color
    secondary: string;    // Accent color
    background: string;   // Page background
    text: string;         // Main text color
  };
  
  // Contact & Social
  contact: {
    email: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  
  // Content Settings
  content: {
    genre: string;        // e.g., "satire", "news", "tech", "entertainment"
    tone: string;         // e.g., "satirical", "professional", "casual"
    defaultCategories: string[];
  };
  
  // SEO & Meta
  seo: {
    keywords: string[];
    ogImage: string;      // Default Open Graph image
    twitterCard: string;  // Default Twitter card type
  };
  
  // Legal
  legal: {
    companyName: string;
    foundedYear: number;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
  };
}

// ─── Default Configuration (White-Label Defaults) ───────────────────────

export const defaultSiteConfig: SiteConfig = {
  siteName: "Your Publication Name",
  tagline: "Your Tagline Here",
  description: "Delivering top-shelf satirical journalism since reality jumped the shark",
  
  logo: {
    url: "/logo.svg",
    alt: "Site Logo"
  },
  
  colors: {
    primary: "#dc2626",      // Red
    secondary: "#1e40af",    // Blue
    background: "#ffffff",
    text: "#0a0a0a"
  },
  
  contact: {
    email: "contact@example.com",
    twitter: "@yourbrand",
  },
  
  content: {
    genre: "satire",
    tone: "satirical",
    defaultCategories: [
      "Politics",
      "Business",
      "Technology",
      "Science",
      "Entertainment",
      "Sports",
      "World",
      "Lifestyle",
      "Opinion",
      "Art"
    ]
  },
  
  seo: {
    keywords: ["satire", "news", "comedy", "current events", "politics"],
    ogImage: "/og-image.jpg",
    twitterCard: "summary_large_image"
  },
  
  legal: {
    companyName: "Your Company Name",
    foundedYear: 2026,
  }
};

// ─── Load Configuration ───────────────────────────────────

/**
 * Get site configuration
 * 
 * In production, this could load from environment variables,
 * a database, or a separate config file per deployment.
 */
export function getSiteConfig(): SiteConfig {
  // For now, return default config
  // In white-label deployments, this would load from env or database
  return defaultSiteConfig;
}

/**
 * Get a specific config value with type safety
 */
export function getConfigValue<K extends keyof SiteConfig>(key: K): SiteConfig[K] {
  return getSiteConfig()[key];
}
