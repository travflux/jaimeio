/**
 * Utility functions for managing Open Graph meta tags
 * These tags enable rich previews on social media platforms
 */

export interface OGTagsConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Set Open Graph meta tags for social media sharing
 */
export function setOGTags(config: OGTagsConfig) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const url = config.url || (typeof window !== 'undefined' ? window.location.href : '');

  // Default values
  const title = config.title || document.title || '';
  const description = config.description || '';
  const image = config.image || `${baseUrl}/og-image.jpg`;
  const type = config.type || 'website';

  // Helper function to set or update meta tag
  const setMetaTag = (property: string, content: string) => {
    let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      document.head.appendChild(tag);
    }
    tag.content = content;
  };

  // Helper function to set or update name-based meta tag
  const setNameTag = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.content = content;
  };

  // Set standard SEO meta tags (read by crawlers directly)
  setNameTag('description', description);
  if (config.keywords) {
    setNameTag('keywords', config.keywords);
  }

  // Set Open Graph tags
  setMetaTag('og:title', title);
  setMetaTag('og:description', description);
  setMetaTag('og:image', image);
  setMetaTag('og:image:width', '1200');
  setMetaTag('og:image:height', '630');
  setMetaTag('og:url', url);
  setMetaTag('og:type', type);

  // Twitter Card tags (for X/Twitter)
  setNameTag('twitter:card', 'summary_large_image');
  setNameTag('twitter:title', title);
  setNameTag('twitter:description', description);
  setNameTag('twitter:image', image);

  // Additional Open Graph tags for articles
  if (config.type === 'article') {
    if (config.author) {
      setMetaTag('article:author', config.author);
    }
    if (config.publishedTime) {
      setMetaTag('article:published_time', config.publishedTime);
    }
    if (config.modifiedTime) {
      setMetaTag('article:modified_time', config.modifiedTime);
    }
  }

  // Update page title
  document.title = title;
}

/**
 * Reset OG tags to defaults
 */
export function resetOGTags() {
  setOGTags({});
}

/**
 * Set noindex meta tag for admin/private pages
 * Prevents search engines from indexing sensitive pages
 */
export function setNoIndex() {
  let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'robots');
    document.head.appendChild(tag);
  }
  tag.content = 'noindex, nofollow';
}

/**
 * Remove noindex meta tag (for public pages)
 */
export function removeNoIndex() {
  const tag = document.querySelector('meta[name="robots"]');
  if (tag) {
    tag.remove();
  }
}

/**
 * Set canonical URL to ensure www/non-www consistency
 * Redirects to preferred version if needed
 */
export function setCanonicalURL(preferredDomain: 'www' | 'non-www' = 'www') {
  if (typeof window === 'undefined') return;

  const currentURL = new URL(window.location.href);
  const hostname = currentURL.hostname;
  
  // Determine if we need to redirect
  let shouldRedirect = false;
  let newHostname = hostname;

  if (preferredDomain === 'www' && !hostname.startsWith('www.')) {
    // Prefer www, but current doesn't have it
    newHostname = `www.${hostname}`;
    shouldRedirect = true;
  } else if (preferredDomain === 'non-www' && hostname.startsWith('www.')) {
    // Prefer non-www, but current has it
    newHostname = hostname.replace(/^www\./, '');
    shouldRedirect = true;
  }

  // Set canonical link tag
  const canonicalURL = `${currentURL.protocol}//${preferredDomain === 'www' ? (hostname.startsWith('www.') ? hostname : `www.${hostname}`) : hostname.replace(/^www\./, '')}${currentURL.pathname}${currentURL.search}${currentURL.hash}`;
  
  let linkTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!linkTag) {
    linkTag = document.createElement('link');
    linkTag.setAttribute('rel', 'canonical');
    document.head.appendChild(linkTag);
  }
  linkTag.href = canonicalURL;

  // Redirect if needed (only for production, not localhost)
  if (shouldRedirect && !hostname.includes('localhost') && !hostname.includes('127.0.0.1') && !hostname.includes('manus.computer')) {
    window.location.href = `${currentURL.protocol}//${newHostname}${currentURL.pathname}${currentURL.search}${currentURL.hash}`;
  }
}
