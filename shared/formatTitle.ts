/**
 * formatTitle — White-label safe page title formatter.
 *
 * Usage:
 *   formatTitle("Search")              → "Search — My Brand"
 *   formatTitle("Politics")            → "Politics — My Brand"
 *   formatTitle()                      → "My Brand"
 *
 * The brand name is resolved at call time from the provided siteName
 * argument (typically sourced from useBranding() or a DB setting).
 * Falls back to "News" if no brand name is supplied, so the output
 * is always a valid, non-empty string.
 */
export function formatTitle(page: string, siteName: string): string {
  const brand = siteName?.trim() || "News";
  const p = page?.trim();
  return p ? `${p} — ${brand}` : brand;
}
