import { getDb } from "../db";
import { licenses } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { License } from "../../drizzle/schema";

/**
 * Resolve a license from a subdomain (e.g., "wilder" from wilder.getjaime.io).
 * Also checks custom domains in the licenses table.
 */
export async function resolveLicense(hostname: string): Promise<License | null> {
  const db = await getDb();

  // Check if it's a subdomain of getjaime.io
  const subdomainMatch = hostname.match(/^([a-z0-9-]+)\.getjaime\.io$/i);
  if (subdomainMatch) {
    const subdomain = subdomainMatch[1].toLowerCase();
    // Skip system subdomains
    if (["app", "staging", "www", "api", "publications"].includes(subdomain)) {
      return null;
    }
    const [license] = await db
      .select()
      .from(licenses)
      .where(and(eq(licenses.subdomain, subdomain), eq(licenses.status, "active")))
      .limit(1);
    return license || null;
  }

  // Check custom domain
  const [license] = await db
    .select()
    .from(licenses)
    .where(and(eq(licenses.domain, hostname.toLowerCase()), eq(licenses.status, "active")))
    .limit(1);
  return license || null;
}

/**
 * Get a license by ID.
 */
export async function getLicenseById(id: number): Promise<License | null> {
  const db = await getDb();
  const [license] = await db.select().from(licenses).where(eq(licenses.id, id)).limit(1);
  return license || null;
}
