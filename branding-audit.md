# Branding Audit — White-Label Variables

## Current Architecture
- `shared/siteConfig.ts` defines a `SiteConfig` interface with branding variables
- `getSiteConfig()` returns hardcoded `defaultSiteConfig` (no DB backing)
- Frontend components import `getSiteConfig()` directly for siteName, tagline, description
- Many additional brand references are hardcoded directly in components

## SiteConfig Variables (from shared/siteConfig.ts)

### Brand Identity
| Key | Current Value | Used In |
|---|---|---|
| siteName | "Hambry" | Navbar, Footer, AdminLayout, Home, Contact, Advertise, Careers, About |
| tagline | "The News, Remastered" | Navbar, Home (title + SEO) |
| description | "Delivering top-shelf satirical journalism..." | Footer |

### Visual Branding
| Key | Current Value | Used In |
|---|---|---|
| logo.url | "/logo.svg" | Not directly used (VITE_APP_LOGO used instead) |
| logo.alt | "Hambry Logo" | Not directly used |
| colors.primary | "#dc2626" | Not directly used (CSS vars used) |
| colors.secondary | "#1e40af" | Not directly used |
| colors.background | "#ffffff" | Not directly used |
| colors.text | "#0a0a0a" | Not directly used |

### Contact & Social
| Key | Current Value | Used In |
|---|---|---|
| contact.email | "contact@hambry.com" | Not used (hardcoded emails in pages) |
| contact.twitter | "@hambry" | Not used directly |

### Content Settings
| Key | Current Value | Used In |
|---|---|---|
| content.genre | "satire" | Not used in frontend |
| content.tone | "satirical" | Not used in frontend |
| content.defaultCategories | [...10 categories] | Not used (DB categories used) |

### SEO & Meta
| Key | Current Value | Used In |
|---|---|---|
| seo.keywords | [...5 keywords] | Not used (hardcoded in Home.tsx) |
| seo.ogImage | "/og-image.jpg" | Not used (og-tags.ts has own defaults) |
| seo.twitterCard | "summary_large_image" | Not used |

### Legal
| Key | Current Value | Used In |
|---|---|---|
| legal.companyName | "Hambry Media" | Not used directly |
| legal.foundedYear | 2026 | Not used directly |

## Hardcoded Brand References (NOT using siteConfig)
- Footer: mascot image path, "curated by Hambry"
- ArticleCard: "Hambry" as fallback author
- ArticlePage: "Hambry Editorial Team", "Hambry" in schema.org
- ContactPage: "editor@hambry.com"
- AboutPage: "Hambry launches..." timeline
- PrivacyTermsPage: "privacy@hambry.com", "legal@hambry.com"
- EditorialStandardsPage: "corrections@hambry.com", "editorial@hambry.com", "moderation@hambry.com"
- organization-schema.ts: "Hambry" as default org name
- og-tags.ts: "Hambry" in default title/description
- SettingsSocial: "https://hambry.com" as default
- SettingsImages: "hambry.com" as watermark text
- watermark.ts: "hambry.com" as default text
- server/workflow.ts: "https://hambry.com" as fallback URL
- server/routers.ts: "https://hambry.com" as fallback URL
- server/db.ts: "https://hambry.com" as default site_url setting

## Plan
1. Add branding settings to workflow_settings DB (category: "branding")
2. Create a public tRPC endpoint to fetch branding settings (cached)
3. Create a React context/hook (useBranding) that loads branding from DB
4. Build Admin Branding page with all brand variable controls
5. Update all components to use useBranding() instead of getSiteConfig()
6. Replace hardcoded "Hambry" references with branding values
