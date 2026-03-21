/**
 * Real Image Sourcing Engine
 *
 * Searches 5 free image sources (Flickr CC, Wikimedia, Unsplash, Pexels, Pixabay)
 * for real, licensed photographs before falling back to AI generation or a branded card.
 *
 * White-label compatible:
 *  - All API keys are per-deployment (stored in workflow_settings, never hardcoded)
 *  - Toggle `real_image_sourcing_enabled` is per-deployment
 *  - Fallback preference is per-deployment
 *  - License compliance tracked in `image_licenses` table per deployment
 *
 * Phase 1: Flickr CC, Wikimedia, Unsplash, Pexels, Pixabay + branded card fallback
 * Phase 2: X/Twitter oEmbed, Instagram oEmbed, auto-discovery
 */

import sharp from "sharp";
import { getDb } from "../db";
import { imageLicenses, knownAccountScores } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { getSetting } from "../db";
import { sql } from "drizzle-orm";
import { getInterFontDefs } from "../fontLoader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageResult {
  sourceUrl: string;
  sourceImageId?: string;
  imageUrl: string;          // direct URL to download
  thumbnailUrl?: string;
  photographer?: string;
  licenseType: string;
  commercialUse: boolean;
  modificationOk: boolean;
  relevanceScore: number;
  title?: string;
  dateUploaded?: string;
}

export interface EmbedResult {
  sourceUrl: string;
  embedHtml: string;
  thumbnailUrl?: string;
  photographer?: string;
  relevanceScore: number;
}

export interface FindRealImageResult {
  found: boolean;
  source?: string;
  cdnUrl?: string;
  embedHtml?: string;
  attribution?: string;
  licenseType?: string;
  relevanceScore?: number;
}

// ─── Query Builder ────────────────────────────────────────────────────────────

/**
 * Build search queries from article headline and tags.
 * Uses first 2 tags as primary terms, remaining as fallback.
 */
function buildSearchQuery(headline: string, tags: string[]): {
  primary: string;
  secondary: string;
  flickrQuery: string;
} {
  // Strip common stop words
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "is", "are", "was", "were", "be", "been", "has", "have", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can", "not", "no", "nor", "so", "yet", "both", "either", "neither", "each", "few", "more", "most", "other", "some", "such", "than", "too", "very", "just", "that", "this", "these", "those", "its", "it", "he", "she", "they", "we", "you", "i", "me", "him", "her", "us", "them", "my", "your", "his", "our", "their", "who", "which", "what", "how", "when", "where", "why"]);

  const cleanTag = (t: string) => t.toLowerCase().trim().replace(/['"]/g, "");
  const cleanTags = tags.map(cleanTag).filter(t => t.length > 2 && !stopWords.has(t));

  const primaryTags = cleanTags.slice(0, 2);
  const secondaryTags = cleanTags.slice(2, 5);

  // Primary query: first 2 tags
  const primary = primaryTags.join(" ") || headline.split(" ").slice(0, 5).join(" ");

  // Secondary: remaining tags
  const secondary = secondaryTags.join(" ") || primary;

  // Flickr: use quoted entity names for precision
  let flickrQuery = primaryTags.length >= 2
    ? `"${primaryTags[0]}" OR ("${primaryTags[1]}" ${secondaryTags[0] ?? ""})`
    : primaryTags[0] ?? headline.split(" ").slice(0, 4).join(" ");

  // Cap at 100 chars
  if (flickrQuery.length > 100) flickrQuery = flickrQuery.slice(0, 100);

  return { primary: primary.slice(0, 100), secondary: secondary.slice(0, 100), flickrQuery };
}

// ─── Relevance Scoring ────────────────────────────────────────────────────────

function scoreResult(result: ImageResult, tags: string[], threshold: number): number {
  // text_match_to_tags * 0.40
  const titleLower = (result.title ?? "").toLowerCase();
  const tagMatchCount = tags.filter(t => titleLower.includes(t.toLowerCase())).length;
  const textMatch = Math.min(tagMatchCount / Math.max(tags.length, 1), 1.0);

  // recency * 0.25 — prefer images from last 2 years
  let recency = 0.5;
  if (result.dateUploaded) {
    const age = (Date.now() - new Date(result.dateUploaded).getTime()) / (1000 * 60 * 60 * 24 * 365);
    recency = age < 1 ? 1.0 : age < 2 ? 0.8 : age < 5 ? 0.5 : 0.2;
  }

  // resolution * 0.15 — prefer larger images (we don't always know, default 0.5)
  const resolution = 0.5;

  // license_permissiveness * 0.10
  const licenseScore = result.commercialUse ? (result.modificationOk ? 1.0 : 0.7) : 0.3;

  // source_trust * 0.10 — all Tier 1 sources are trusted
  const sourceTrust = 0.8;

  const score = (textMatch * 0.40) + (recency * 0.25) + (resolution * 0.15) + (licenseScore * 0.10) + (sourceTrust * 0.10);
  return Math.round(score * 100) / 100;
}

// ─── Image Download + Resize + Store ─────────────────────────────────────────

async function downloadResizeStore(
  imageUrl: string,
  articleId: number,
  source: string
): Promise<{ cdnUrl: string; buffer: Buffer }> {
  // Download
  const resp = await fetch(imageUrl, {
    headers: { "User-Agent": "SatireEngine-Image/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${imageUrl}`);
  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Resize to header size (1200×630) — the primary CDN asset
  const resized = await sharp(buffer)
    .resize(1200, 630, { fit: "cover", position: "attention" })
    .jpeg({ quality: 85 })
    .toBuffer();

  // Store on CDN
  const key = `real-images/${source}/${articleId}-${Date.now()}-header.jpg`;
  const { url: cdnUrl } = await storagePut(key, resized, "image/jpeg");

  return { cdnUrl, buffer: resized };
}

// ─── Attribution Generator ────────────────────────────────────────────────────

function buildAttribution(source: string, photographer?: string, licenseType?: string): string {
  switch (source) {
    case "flickr":
      return photographer
        ? `Photo by ${photographer} / Flickr / ${licenseType ?? "CC"}`
        : `Photo via Flickr / ${licenseType ?? "CC"}`;
    case "wikimedia":
      return `Image: Wikimedia Commons / ${licenseType ?? "CC"}`;
    case "unsplash":
      return photographer ? `Photo by ${photographer} on Unsplash` : "Photo via Unsplash";
    case "pexels":
      return photographer ? `Photo by ${photographer} on Pexels` : "Photo via Pexels";
    case "pixabay":
      return "Image from Pixabay";
    default:
      return `Image sourced from ${source}`;
  }
}

// ─── Flickr CC Search ─────────────────────────────────────────────────────────

const FLICKR_LICENSE_MAP: Record<string, { type: string; commercial: boolean; modification: boolean }> = {
  "1": { type: "CC BY-NC-SA 2.0", commercial: false, modification: true },
  "2": { type: "CC BY-NC 2.0", commercial: false, modification: false },
  "4": { type: "CC BY 2.0", commercial: true, modification: true },
  "5": { type: "CC BY-SA 2.0", commercial: true, modification: true },
  "9": { type: "CC0 1.0", commercial: true, modification: true },
  "10": { type: "Public Domain", commercial: true, modification: true },
};

export async function searchFlickrCC(query: string, apiKey: string): Promise<ImageResult[]> {
  if (!apiKey) return [];
  try {
    const url = new URL("https://api.flickr.com/services/rest/");
    url.searchParams.set("method", "flickr.photos.search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("text", query);
    url.searchParams.set("license", "1,2,4,5,9,10");
    url.searchParams.set("sort", "relevance");
    url.searchParams.set("content_type", "1");
    url.searchParams.set("media", "photos");
    url.searchParams.set("per_page", "10");
    url.searchParams.set("format", "json");
    url.searchParams.set("nojsoncallback", "1");
    url.searchParams.set("extras", "url_l,url_o,owner_name,license,date_upload,title");

    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    const photos = data?.photos?.photo ?? [];

    return photos
      .filter((p: any) => p.url_l || p.url_o)
      .map((p: any) => {
        const licenseInfo = FLICKR_LICENSE_MAP[p.license] ?? { type: "CC", commercial: false, modification: false };
        const imageUrl = p.url_l ?? p.url_o;
        return {
          sourceUrl: `https://www.flickr.com/photos/${p.owner}/${p.id}`,
          sourceImageId: p.id,
          imageUrl,
          photographer: p.ownername,
          licenseType: licenseInfo.type,
          commercialUse: licenseInfo.commercial,
          modificationOk: licenseInfo.modification,
          relevanceScore: 0,
          title: p.title,
          dateUploaded: p.dateupload ? new Date(parseInt(p.dateupload) * 1000).toISOString() : undefined,
        } as ImageResult;
      });
  } catch (err: any) {
    console.error(`[RealImage] Flickr search error: ${err.message}`);
    return [];
  }
}

// ─── Wikimedia Commons Search ─────────────────────────────────────────────────

export async function searchWikimedia(query: string): Promise<ImageResult[]> {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrnamespace", "6"); // File namespace
    url.searchParams.set("gsrsearch", `filetype:bitmap ${query}`);
    url.searchParams.set("gsrlimit", "5");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|extmetadata|size");
    url.searchParams.set("iiurlwidth", "1200");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    const pages = Object.values(data?.query?.pages ?? {}) as any[];

    return pages
      .filter((p: any) => p.imageinfo?.[0]?.url)
      .map((p: any) => {
        const info = p.imageinfo[0];
        const meta = info.extmetadata ?? {};
        const license = meta.LicenseShortName?.value ?? "CC";
        const artist = meta.Artist?.value?.replace(/<[^>]+>/g, "") ?? "";
        const commercial = !license.toLowerCase().includes("nc");
        const modification = !license.toLowerCase().includes("nd");

        return {
          sourceUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${p.title}`,
          sourceImageId: p.pageid?.toString(),
          imageUrl: info.thumburl ?? info.url,
          photographer: artist || undefined,
          licenseType: license,
          commercialUse: commercial,
          modificationOk: modification,
          relevanceScore: 0,
          title: p.title?.replace("File:", ""),
        } as ImageResult;
      });
  } catch (err: any) {
    console.error(`[RealImage] Wikimedia search error: ${err.message}`);
    return [];
  }
}

// ─── Unsplash Search ──────────────────────────────────────────────────────────

export async function searchUnsplash(query: string, accessKey: string): Promise<ImageResult[]> {
  if (!accessKey) return [];
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    const resp = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();

    return (data.results ?? []).map((p: any) => ({
      sourceUrl: p.links?.html ?? `https://unsplash.com/photos/${p.id}`,
      sourceImageId: p.id,
      imageUrl: p.urls?.regular ?? p.urls?.full,
      thumbnailUrl: p.urls?.small,
      photographer: p.user?.name,
      licenseType: "Unsplash License",
      commercialUse: true,
      modificationOk: true,
      relevanceScore: 0,
      title: p.alt_description ?? p.description,
      dateUploaded: p.created_at,
    } as ImageResult));
  } catch (err: any) {
    console.error(`[RealImage] Unsplash search error: ${err.message}`);
    return [];
  }
}

// ─── Pexels Search ────────────────────────────────────────────────────────────

export async function searchPexels(query: string, apiKey: string): Promise<ImageResult[]> {
  if (!apiKey) return [];
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    const resp = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();

    return (data.photos ?? []).map((p: any) => ({
      sourceUrl: p.url,
      sourceImageId: p.id?.toString(),
      imageUrl: p.src?.large2x ?? p.src?.large,
      thumbnailUrl: p.src?.medium,
      photographer: p.photographer,
      licenseType: "Pexels License",
      commercialUse: true,
      modificationOk: true,
      relevanceScore: 0,
      title: p.alt,
    } as ImageResult));
  } catch (err: any) {
    console.error(`[RealImage] Pexels search error: ${err.message}`);
    return [];
  }
}

// ─── Pixabay Search ───────────────────────────────────────────────────────────

export async function searchPixabay(query: string, apiKey: string): Promise<ImageResult[]> {
  if (!apiKey) return [];
  try {
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=5&safesearch=true`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json();

    return (data.hits ?? []).map((p: any) => ({
      sourceUrl: p.pageURL,
      sourceImageId: p.id?.toString(),
      imageUrl: p.largeImageURL ?? p.webformatURL,
      thumbnailUrl: p.previewURL,
      photographer: p.user,
      licenseType: "Pixabay License",
      commercialUse: true,
      modificationOk: true,
      relevanceScore: 0,
      title: p.tags,
    } as ImageResult));
  } catch (err: any) {
    console.error(`[RealImage] Pixabay search error: ${err.message}`);
    return [];
  }
}

// ─── Branded Card Fallback ────────────────────────────────────────────────────

/**
 * Generate a branded title card using Sharp — no AI, no API call, instant.
 * Creates a 1200×630 image with the site's brand color and the article headline.
 * Uses bundled Inter font (base64-embedded in SVG) so text renders correctly
 * regardless of which system fonts are installed on the server.
 */
export async function generateBrandedCard(
  headline: string,
  options: {
    brandColor?: string;
    textColor?: string;
    siteName?: string;
    tagline?: string;
    accentColor?: string;
  } = {}
): Promise<string | null> {
  try {
    const brandColor = options.brandColor ?? "#1A1A1A";
    const textColor = options.textColor ?? "#F5F0EB";
    const siteName = options.siteName ?? "";
    const tagline = options.tagline ?? "";
    const accentColor = options.accentColor ?? "#C41E3A";

    // Auto-scale font size based on headline length
    // Shorter headlines get bigger text, longer ones wrap at smaller size
    let fontSize = 48;
    let maxCharsPerLine = 28;
    if (headline.length > 100) { fontSize = 34; maxCharsPerLine = 42; }
    else if (headline.length > 70) { fontSize = 38; maxCharsPerLine = 36; }
    else if (headline.length > 50) { fontSize = 42; maxCharsPerLine = 32; }

    const displayHeadline = headline.length > 160 ? headline.slice(0, 157) + "..." : headline;
    const lines = wrapText(displayHeadline, maxCharsPerLine).slice(0, 5); // max 5 lines
    const lineHeight = Math.round(fontSize * 1.4);
    const totalTextHeight = lines.length * lineHeight;

    // Vertical layout: top bar (8px) + site name row (80px) + divider + headline (centered) + divider + tagline row (50px)
    const headerHeight = 120; // top bar + site name
    const footerHeight = 70;  // tagline + bottom padding
    const contentHeight = 630 - headerHeight - footerHeight;
    const textStartY = headerHeight + (contentHeight - totalTextHeight) / 2 + fontSize * 0.8;

    const fontDefs = getInterFontDefs();

    const svgLines = lines.map((line, i) =>
      `<text x="600" y="${textStartY + i * lineHeight}" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="700" fill="${escapeXml(textColor)}" text-anchor="middle">${escapeXml(line)}</text>`
    ).join("\n  ");

    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  ${fontDefs}
  <!-- Background -->
  <rect width="1200" height="630" fill="${escapeXml(brandColor)}"/>
  <!-- Top accent bar -->
  <rect x="0" y="0" width="1200" height="8" fill="${escapeXml(accentColor)}"/>
  <!-- Site name -->
  <text x="600" y="72" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="${escapeXml(accentColor)}" text-anchor="middle" letter-spacing="6">${escapeXml(siteName.toUpperCase())}</text>
  <!-- Top divider -->
  <line x1="80" y1="100" x2="1120" y2="100" stroke="${escapeXml(textColor)}" stroke-width="1" opacity="0.25"/>
  <!-- Headline lines -->
  ${svgLines}
  <!-- Bottom divider -->
  <line x1="80" y1="${630 - footerHeight + 10}" x2="1120" y2="${630 - footerHeight + 10}" stroke="${escapeXml(textColor)}" stroke-width="1" opacity="0.25"/>
  <!-- Tagline -->
  <text x="600" y="${630 - 22}" font-family="Inter, sans-serif" font-size="15" font-weight="400" fill="${escapeXml(textColor)}" text-anchor="middle" opacity="0.55">${escapeXml(tagline)}</text>
</svg>`;

    const buffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 92 })
      .toBuffer();

    const key = `branded-cards/${Date.now()}-card.jpg`;
    const { url } = await storagePut(key, buffer, "image/jpeg");
    return url;
  } catch (err: any) {
    console.error(`[RealImage] Branded card generation failed: ${err.message}`);
    return null;
  }
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// ─── License Logging ──────────────────────────────────────────────────────────

export async function logImageLicense(
  articleId: number,
  result: FindRealImageResult & {
    source: string;
    sourceUrl: string;
    sourceImageId?: string;
    photographer?: string;
    commercialUse?: boolean;
    modificationOk?: boolean;
  }
): Promise<void> {
  try {
    const dbConn = await getDb();
    if (!dbConn) return;
    await dbConn.insert(imageLicenses).values({
      articleId,
      source: result.source,
      sourceUrl: result.sourceUrl,
      sourceImageId: result.sourceImageId,
      licenseType: result.licenseType ?? "Unknown",
      photographer: result.photographer,
      attributionText: result.attribution ?? "",
      commercialUse: result.commercialUse ?? true,
      modificationOk: result.modificationOk ?? true,
      cdnUrl: result.cdnUrl,
      embedHtml: result.embedHtml,
      relevanceScore: result.relevanceScore,
    });
  } catch (err: any) {
    console.error(`[RealImage] License logging failed: ${err.message}`);
  }
}

// ─── Known Account Score Update ───────────────────────────────────────────────

export async function updateKnownAccountScore(
  platform: string,
  handle: string,
  tag: string,
  relevance: number
): Promise<void> {
  try {
    const dbConn = await getDb();
    if (!dbConn) return;
    // Upsert: increment hit_count and update avg_relevance
    await dbConn.execute(
      sql`INSERT INTO known_account_scores (platform, handle, tag, hit_count, avg_relevance, last_hit)
       VALUES (${platform}, ${handle}, ${tag}, 1, ${relevance}, NOW())
       ON DUPLICATE KEY UPDATE
         hit_count = hit_count + 1,
         avg_relevance = (avg_relevance * hit_count + ${relevance}) / (hit_count + 1),
         last_hit = NOW()`
    );
  } catch (err: any) {
    console.error(`[RealImage] Known account score update failed: ${err.message}`);
  }
}

// ─── Main findRealImage Function ──────────────────────────────────────────────

export async function findRealImage(article: {
  id: number;
  headline: string;
  tags: string[];
  categorySlug?: string;
}): Promise<FindRealImageResult> {
  const { id: articleId, headline, tags } = article;

  // Load settings
  const [
    flickrKey,
    unsplashKey,
    pexelsKey,
    pixabayKey,
    thresholdSetting,
  ] = await Promise.all([
    getSetting("real_image_flickr_api_key"),
    getSetting("real_image_unsplash_access_key"),
    getSetting("real_image_pexels_api_key"),
    getSetting("real_image_pixabay_api_key"),
    getSetting("real_image_relevance_threshold"),
  ]);

  const threshold = parseFloat(thresholdSetting?.value ?? "0.4");
  const { primary, secondary, flickrQuery } = buildSearchQuery(headline, tags);

  console.log(`[RealImage] Searching for article ${articleId}: "${headline.slice(0, 60)}"`);
  console.log(`[RealImage] Query: primary="${primary}" flickr="${flickrQuery}"`);

  // Search sources in priority order
  const sources: Array<{
    name: string;
    search: () => Promise<ImageResult[]>;
  }> = [
    { name: "flickr", search: () => searchFlickrCC(flickrQuery, flickrKey?.value ?? "") },
    { name: "wikimedia", search: () => searchWikimedia(primary) },
    { name: "unsplash", search: () => searchUnsplash(primary, unsplashKey?.value ?? "") },
    { name: "pexels", search: () => searchPexels(secondary, pexelsKey?.value ?? "") },
    { name: "pixabay", search: () => searchPixabay(secondary, pixabayKey?.value ?? "") },
  ];

  for (const { name, search } of sources) {
    try {
      const results = await search();
      if (results.length === 0) {
        console.log(`[RealImage] ${name}: 0 results`);
        continue;
      }

      // Score all results
      const scored = results
        .map(r => ({ ...r, relevanceScore: scoreResult(r, tags, threshold) }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      const best = scored[0];
      console.log(`[RealImage] ${name}: ${results.length} results, best score=${best.relevanceScore}`);

      if (best.relevanceScore < threshold) {
        console.log(`[RealImage] ${name}: best score ${best.relevanceScore} below threshold ${threshold}, skipping`);
        continue;
      }

      // Download, resize, store
      console.log(`[RealImage] ${name}: using "${best.title ?? best.sourceUrl}" (score=${best.relevanceScore})`);
      const { cdnUrl } = await downloadResizeStore(best.imageUrl, articleId, name);
      const attribution = buildAttribution(name, best.photographer, best.licenseType);

      return {
        found: true,
        source: name,
        cdnUrl,
        attribution,
        licenseType: best.licenseType,
        relevanceScore: best.relevanceScore,
      };
    } catch (err: any) {
      console.error(`[RealImage] ${name} error: ${err.message}`);
      continue;
    }
  }

  console.log(`[RealImage] No real image found above threshold for article ${articleId}`);
  return { found: false };
}
