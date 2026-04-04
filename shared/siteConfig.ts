/**
 * Site Configuration
 * 
 * This file contains all white-label configuration for the content engine.
 * Customize these values for each client deployment.
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
    primary: string;
    secondary: string;
    background: string;
    text: string;
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
    genre: string;
    tone: string;
    defaultCategories: string[];
  };
  
  // SEO & Meta
  seo: {
    keywords: string[];
    ogImage: string;
    twitterCard: string;
  };
  
  // Legal
  legal: {
    companyName: string;
    foundedYear: number;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
  };
}

export const defaultSiteConfig: SiteConfig = {
  siteName: "JAIME.IO",
  tagline: "AI-Powered Content, Automated",
  description: "The AI content engine that writes, publishes, and distributes for you",
  
  logo: {
    url: "/logo.svg",
    alt: "JAIME.IO"
  },
  
  colors: {
    primary: "#0f2d5e",
    secondary: "#1e40af",
    background: "#ffffff",
    text: "#0a0a0a"
  },
  
  contact: {
    email: "hello@getjaime.io",
    twitter: "@getjaimeio",
  },
  
  content: {
    genre: "news",
    tone: "professional",
    defaultCategories: [
      "Business",
      "Technology",
      "Marketing",
      "Finance",
      "Health",
      "Lifestyle",
      "Politics",
      "Entertainment",
      "Sports",
      "World"
    ]
  },
  
  seo: {
    keywords: ["AI content", "content automation", "SEO", "content marketing", "AI writing"],
    ogImage: "/og-image.jpg",
    twitterCard: "summary_large_image"
  },
  
  legal: {
    companyName: "JANICCO",
    foundedYear: 2026,
  }
};

export function getSiteConfig(): SiteConfig {
  return defaultSiteConfig;
}

export function getConfigValue<K extends keyof SiteConfig>(key: K): SiteConfig[K] {
  return getSiteConfig()[key];
}
