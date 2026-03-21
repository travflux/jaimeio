/**
 * Manage canonical URLs for SEO
 */

/**
 * Set canonical URL for the current page
 * Prevents duplicate content issues by specifying the preferred URL
 */
export function setCanonicalURL(url?: string): void {
  // Use provided URL or clean current URL (remove query params, hash)
  const canonicalUrl = url || getCleanURL();

  // Remove existing canonical tag
  const existing = document.querySelector('link[rel="canonical"]');
  if (existing) {
    existing.remove();
  }

  // Create new canonical link
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = canonicalUrl;
  document.head.appendChild(link);
}

/**
 * Get clean URL without query parameters or hash
 */
function getCleanURL(): string {
  if (typeof window === 'undefined') return '';
  
  const url = new URL(window.location.href);
  // Remove query parameters and hash
  return `${url.origin}${url.pathname}`;
}

/**
 * Build canonical URL from path
 */
export function buildCanonicalURL(path: string): string {
  if (typeof window === 'undefined') return path;
  
  const origin = window.location.origin;
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}
