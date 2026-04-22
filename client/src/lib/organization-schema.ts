/**
 * Generate JSON-LD Organization schema for SEO
 */

export interface OrganizationSchemaConfig {
  name: string;
  url: string;
  logo: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  socialProfiles?: string[];
  foundingDate?: string;
  founders?: Array<{
    name: string;
    url?: string;
  }>;
}

/**
 * Generate Organization schema JSON-LD
 */
export function generateOrganizationSchema(config: OrganizationSchemaConfig): string {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.name,
    url: config.url,
    logo: {
      "@type": "ImageObject",
      url: config.logo,
    },
  };

  if (config.description) {
    schema.description = config.description;
  }

  if (config.email || config.telephone) {
    schema.contactPoint = {
      "@type": "ContactPoint",
      contactType: "customer service",
    };
    if (config.email) schema.contactPoint.email = config.email;
    if (config.telephone) schema.contactPoint.telephone = config.telephone;
  }

  if (config.address) {
    schema.address = {
      "@type": "PostalAddress",
      ...config.address,
    };
  }

  if (config.socialProfiles && config.socialProfiles.length > 0) {
    schema.sameAs = config.socialProfiles;
  }

  if (config.foundingDate) {
    schema.foundingDate = config.foundingDate;
  }

  if (config.founders && config.founders.length > 0) {
    schema.founder = config.founders.map(founder => ({
      "@type": "Person",
      name: founder.name,
      ...(founder.url && { url: founder.url }),
    }));
  }

  return JSON.stringify(schema, null, 2);
}

/**
 * Insert Organization schema into page
 */
export function setOrganizationSchema(config: OrganizationSchemaConfig): void {
  // Remove existing organization schema
  const existing = document.querySelector('script[type="application/ld+json"][data-schema="organization"]');
  if (existing) {
    existing.remove();
  }

  // Create new schema script
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-schema', 'organization');
  script.textContent = generateOrganizationSchema(config);
  document.head.appendChild(script);
}

/**
 * Default organization schema configuration (overridden by branding settings at runtime)
 */
/**
 * Default organization schema — all brand-specific values are empty.
 * Callers must spread this and override name/description/logo from branding settings.
 */
export const DEFAULT_ORGANIZATION: OrganizationSchemaConfig = {
  name: "",
  url: typeof window !== 'undefined' ? window.location.origin : '',
  logo: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '',
  description: "",
  email: "",
  socialProfiles: [],
};

/** @deprecated Use DEFAULT_ORGANIZATION instead */
export const HAMBRY_ORGANIZATION = DEFAULT_ORGANIZATION;
