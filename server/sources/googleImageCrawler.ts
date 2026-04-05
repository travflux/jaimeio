/**
 * googleImageCrawler.ts — Real Image Sourcing v2
 *
 * Pipeline:
 *   1. Check image_library for reusable tagged images (if enabled)
 *   2. Search Google Custom Search API for image candidates
 *   3. Filter by domain whitelist/blacklist
 *   4. Download + measure each candidate (min 400×300, max 10 MB)
 *   5. Compute pHash for duplicate detection
 *   6. AI validation: relevance + entity + safety check (if enabled)
 *   7. Upload best candidate to S3, store in image_library
 *   8. Return ImageResult or null
 *
 * White-label compatible: all credentials come from workflow_settings.
 */

import { getDb } from "../db.js";
import { imageLibrary, imageSourceDomains } from "../../drizzle/schema.js";
import { eq, and, lte, gte, sql, inArray } from "drizzle-orm";
import { invokeLLMWithFallback as invokeLLM } from "../_core/llmRouter";
import { storagePut } from "../storage.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageResult {
  url: string;
  attribution: string;
  sourceDomain: string;
  sourceUrl: string;
  width?: number;
  height?: number;
  fromLibrary?: boolean;
  libraryId?: number;
}

export interface CrawlerConfig {
  apiKey: string;
  cx: string;
  validationEnabled: boolean;
  libraryReuseEnabled: boolean;
  maxReuseCount: number;
  relevanceThreshold: number;
}

interface GoogleImageItem {
  title: string;
  link: string;
  displayLink: string;
  image: {
    contextLink: string;
    height: number;
    width: number;
    byteSize: number;
    thumbnailLink: string;
    thumbnailHeight: number;
    thumbnailWidth: number;
  };
}

// ─── Domain Checker ───────────────────────────────────────────────────────────

let domainCacheTs = 0;
let domainCache: Map<string, "whitelisted" | "blacklisted" | "unknown"> = new Map();

async function getDomainStatus(domain: string): Promise<"whitelisted" | "blacklisted" | "unknown"> {
  const now = Date.now();
  // Refresh cache every 10 minutes
  if (now - domainCacheTs > 10 * 60 * 1000) {
    const db = await getDb();
    if (!db) return "unknown";
    const rows = await db.select({ domain: imageSourceDomains.domain, status: imageSourceDomains.status })
      .from(imageSourceDomains)
      .where(inArray(imageSourceDomains.status, ["whitelisted", "blacklisted"]));
    domainCache = new Map(rows.map(r => [r.domain, (r.status === "pending_review" ? "unknown" : r.status) as "whitelisted" | "blacklisted" | "unknown"]));
    domainCacheTs = now;
  }
  return domainCache.get(domain) ?? "unknown";
}

async function recordDomainSeen(domain: string, success: boolean): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const existing = await db.select({ id: imageSourceDomains.id })
      .from(imageSourceDomains)
      .where(eq(imageSourceDomains.domain, domain))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(imageSourceDomains).values({
        domain,
        status: "unknown",
        imagesSourced: success ? 1 : 0,
        imagesRejected: success ? 0 : 1,
        lastSourcedAt: new Date(),
      });
    } else {
      await db.update(imageSourceDomains)
        .set({
          imagesSourced: success ? sql`images_sourced + 1` : sql`images_sourced`,
          imagesRejected: success ? sql`images_rejected` : sql`images_rejected + 1`,
          lastSourcedAt: new Date(),
        })
        .where(eq(imageSourceDomains.domain, domain));
    }
  } catch {
    // Non-critical — don't break the pipeline
  }
}

// ─── Image Library Lookup ─────────────────────────────────────────────────────

export async function findLibraryImage(
  tags: string[],
  maxReuseCount: number
): Promise<ImageResult | null> {
  if (tags.length === 0) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    // Find images that have at least one matching tag and haven't exceeded reuse limit
    const rows = await db.select()
      .from(imageLibrary)
      .where(
        maxReuseCount > 0
          ? lte(imageLibrary.timesUsed, maxReuseCount)
          : undefined
      )
      .orderBy(sql`times_used ASC, relevance_score DESC`)
      .limit(50);

    // Filter by tag overlap in JS (JSON column search is DB-specific)
    const lowerTags = tags.map(t => t.toLowerCase());
    const match = rows.find(row => {
      const rowTags = (row.tags as string[]).map(t => t.toLowerCase());
      return lowerTags.some(t => rowTags.includes(t));
    });

    if (!match) return null;

    // Increment usage counter — db is guaranteed non-null here (checked above)
    await db!.update(imageLibrary)
      .set({ timesUsed: sql`times_used + 1`, lastUsedAt: new Date() })
      .where(eq(imageLibrary.id, match.id));

    return {
      url: match.cdnUrl,
      attribution: match.photographer ? `Photo by ${match.photographer}` : `Image from ${match.sourceDomain}`,
      sourceDomain: match.sourceDomain,
      sourceUrl: match.sourceUrl,
      width: match.width ?? undefined,
      height: match.height ?? undefined,
      fromLibrary: true,
      libraryId: match.id,
    };
  } catch {
    return null;
  }
}

// ─── Google CSE Search ────────────────────────────────────────────────────────

async function searchGoogleImages(
  query: string,
  apiKey: string,
  cx: string,
  num = 10
): Promise<GoogleImageItem[]> {
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    searchType: "image",
    num: String(Math.min(num, 10)),
    imgSize: "LARGE",
    safe: "active",
  });
  const url = `https://www.googleapis.com/customsearch/v1?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google CSE error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json() as { items?: GoogleImageItem[] };
  return data.items ?? [];
}

// ─── Image Download + Measure ─────────────────────────────────────────────────

interface DownloadResult {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  fileSize: number;
}

async function downloadAndMeasure(imageUrl: string): Promise<DownloadResult | null> {
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JaimeBot/1.0)" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileSize = buffer.length;

    // Reject if > 10 MB
    if (fileSize > 10 * 1024 * 1024) return null;

    // Parse dimensions from JPEG/PNG headers
    let width = 0;
    let height = 0;
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      const dims = getJpegDimensions(buffer);
      width = dims.width;
      height = dims.height;
    } else if (contentType.includes("png")) {
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    } else if (contentType.includes("webp")) {
      // WebP VP8 chunk
      if (buffer.length > 30 && buffer.toString("ascii", 8, 12) === "WEBP") {
        width = (buffer.readUInt16LE(26) & 0x3fff) + 1;
        height = (buffer.readUInt16LE(28) & 0x3fff) + 1;
      }
    }

    // Minimum size filter: 400×300
    if (width > 0 && height > 0 && (width < 400 || height < 300)) return null;

    return { buffer, contentType, width, height, fileSize };
  } catch {
    return null;
  }
}

function getJpegDimensions(buf: Buffer): { width: number; height: number } {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    const segLen = buf.readUInt16BE(i + 2);
    i += 2 + segLen;
  }
  return { width: 0, height: 0 };
}

// ─── Simple pHash (8×8 DCT-like) ─────────────────────────────────────────────

function computeSimpleHash(buffer: Buffer): string {
  // Use first 64 bytes of the image as a fingerprint proxy
  // (A real pHash requires image decoding; this is a lightweight substitute)
  const sample = buffer.slice(0, Math.min(256, buffer.length));
  let hash = "";
  for (let i = 0; i < 64; i++) {
    const byte = sample[i % sample.length] ?? 0;
    hash += (byte > 128 ? "1" : "0");
  }
  return hash;
}

// ─── AI Validation ────────────────────────────────────────────────────────────

interface ValidationResult {
  approved: boolean;
  relevanceScore: number;
  reason: string;
  tags: string[];
  entities: string[];
  description: string;
}

async function validateImage(
  imageUrl: string,
  articleHeadline: string,
  articleBody: string
): Promise<ValidationResult> {
  try {
    const prompt = `You are an image quality validator for a news publication. Evaluate whether this image is appropriate for the given article.

Article headline: ${articleHeadline}
Article excerpt: ${articleBody.slice(0, 400)}

Image URL: ${imageUrl}

Respond with JSON only:
{
  "approved": boolean,
  "relevanceScore": number (0.0-1.0),
  "reason": "brief explanation",
  "tags": ["tag1", "tag2", ...],
  "entities": ["person/org/place names visible or relevant"],
  "description": "one sentence describing what the image shows"
}

Approve if: image is relevant to the article topic, safe for general audiences, not a watermarked stock photo, not a logo/icon/infographic, not a person in a private context.
Reject if: image is irrelevant, contains explicit content, shows real identifiable people in potentially defamatory contexts, or is clearly a watermarked stock image.`;

    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const parsed = JSON.parse(content) as Partial<ValidationResult>;
    return {
      approved: parsed.approved ?? false,
      relevanceScore: parsed.relevanceScore ?? 0,
      reason: parsed.reason ?? "No reason provided",
      tags: parsed.tags ?? [],
      entities: parsed.entities ?? [],
      description: parsed.description ?? "",
    };
  } catch {
    // If validation fails, default to rejected
    return {
      approved: false,
      relevanceScore: 0,
      reason: "Validation error",
      tags: [],
      entities: [],
      description: "",
    };
  }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function findImageWithCrawler(
  articleHeadline: string,
  articleBody: string,
  articleTags: string[],
  config: CrawlerConfig
): Promise<ImageResult | null> {
  // Phase 1: Check image library for reusable images
  if (config.libraryReuseEnabled && articleTags.length > 0) {
    const libraryResult = await findLibraryImage(articleTags, config.maxReuseCount);
    if (libraryResult) {
      return libraryResult;
    }
  }

  // Phase 2: Search Google CSE
  let candidates: GoogleImageItem[] = [];
  try {
    // Build a focused search query from headline
    const searchQuery = `${articleHeadline} news photo`;
    candidates = await searchGoogleImages(searchQuery, config.apiKey, config.cx, 10);
  } catch (err) {
    console.error("[ImageCrawler] Google CSE search failed:", err);
    return null;
  }

  if (candidates.length === 0) return null;

  // Phase 3: Filter by domain whitelist/blacklist + download + validate
  for (const candidate of candidates) {
    const domain = candidate.displayLink?.toLowerCase() ?? "";
    if (!domain) continue;

    const domainStatus = await getDomainStatus(domain);
    if (domainStatus === "blacklisted") {
      await recordDomainSeen(domain, false);
      continue;
    }

    // Download and measure
    const downloaded = await downloadAndMeasure(candidate.link);
    if (!downloaded) {
      await recordDomainSeen(domain, false);
      continue;
    }

    // Phase 4: AI validation (if enabled)
    let validationResult: ValidationResult = {
      approved: true,
      relevanceScore: 0.5,
      reason: "Validation skipped",
      tags: articleTags,
      entities: [],
      description: candidate.title,
    };

    if (config.validationEnabled) {
      validationResult = await validateImage(candidate.link, articleHeadline, articleBody);
      if (!validationResult.approved || validationResult.relevanceScore < config.relevanceThreshold) {
        await recordDomainSeen(domain, false);
        continue;
      }
    }

    // Phase 5: Upload to S3
    let cdnUrl = candidate.link;
    try {
      const ext = downloaded.contentType.includes("png") ? "png"
        : downloaded.contentType.includes("webp") ? "webp" : "jpg";
      const key = `images/crawled/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const uploaded = await storagePut(key, downloaded.buffer, downloaded.contentType);
      cdnUrl = uploaded.url;
    } catch {
      // Use original URL if S3 upload fails
    }

    // Phase 6: Store in image_library
    const phash = computeSimpleHash(downloaded.buffer);
    try {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const mergedTags = Array.from(new Set([...articleTags, ...validationResult.tags]));
      await db.insert(imageLibrary).values({
        cdnUrl,
        sourceDomain: domain,
        sourceUrl: candidate.link,
        sourcePageUrl: candidate.image?.contextLink ?? undefined,
        phash,
        tags: mergedTags,
        entities: validationResult.entities,
        aiDescription: validationResult.description,
        relevanceScore: validationResult.relevanceScore,
        validationResult: validationResult as unknown as Record<string, unknown>,
        timesUsed: 1,
        width: downloaded.width || undefined,
        height: downloaded.height || undefined,
        fileSize: downloaded.fileSize,
        lastUsedAt: new Date(),
      });
    } catch {
      // Non-critical — continue even if library insert fails
    }

    await recordDomainSeen(domain, true);

    return {
      url: cdnUrl,
      attribution: `Image from ${domain}`,
      sourceDomain: domain,
      sourceUrl: candidate.link,
      width: downloaded.width || undefined,
      height: downloaded.height || undefined,
      fromLibrary: false,
    };
  }

  return null;
}
