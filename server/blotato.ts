/**
 * blotato.ts — Blotato API client for JAIME.IO
 * 
 * Base URL: https://backend.blotato.com/v2
 * Auth: blotato-api-key header (NOT Bearer token)
 * All operations are async: submit → poll for status
 * 
 * Docs: https://help.blotato.com/api/start
 */

const BLOTATO_BASE = "https://backend.blotato.com/v2";

export interface BlotatoPostContent {
  text: string;
  mediaUrls: string[];
  platform: string;
  additionalPosts?: Array<{ text: string; mediaUrls: string[] }>;
}

export interface BlotatoTarget {
  targetType: string;
  pageId?: string;
  // TikTok required fields
  privacyLevel?: string;
  disabledComments?: boolean;
  disabledDuet?: boolean;
  disabledStitch?: boolean;
  isBrandedContent?: boolean;
  isYourBrand?: boolean;
  isAiGenerated?: boolean;
  // YouTube required fields
  title?: string;
  privacyStatus?: string;
  shouldNotifySubscribers?: boolean;
}

export interface BlotatoPostRequest {
  accountId: string;
  content: BlotatoPostContent;
  target: BlotatoTarget;
}

export interface BlotatoScheduleOptions {
  scheduledTime?: string;    // ISO 8601 — e.g. "2026-04-05T15:00:00Z"
  useNextFreeSlot?: boolean; // true = use next open calendar slot
}

export interface BlotatoSubmitResult {
  postSubmissionId: string;
}

export interface BlotatoPostStatus {
  status: "in-progress" | "published" | "failed";
  publicUrl?: string;
  errorMessage?: string;
}

export interface BlotatoAccount {
  id: string;
  platform: string;
  fullname: string;
  username: string;
}

export interface BlotatoSubaccount {
  id: string;
  accountId: string;
  name: string;
}

// ─── Core API helper ──────────────────────────────────────────────────────────

async function blotatoFetch(
  apiKey: string,
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const url = `${BLOTATO_BASE}${path}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "blotato-api-key": apiKey,  // CORRECT auth header
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Blotato API error ${response.status}: ${error}`);
  }

  return response.json();
}

// ─── Account Management ───────────────────────────────────────────────────────

/**
 * Get all connected social accounts for this Blotato API key.
 * Call this to get accountIds before posting.
 */
export async function getBlotatoAccounts(apiKey: string): Promise<BlotatoAccount[]> {
  const data = await blotatoFetch(apiKey, "GET", "/users/me/accounts") as { items: BlotatoAccount[] };
  return data.items ?? [];
}

/**
 * Get subaccounts (Facebook Pages, LinkedIn Company Pages) for an account.
 * Required for Facebook posting — pageId must come from here.
 */
export async function getBlotatoSubaccounts(
  apiKey: string,
  accountId: string
): Promise<BlotatoSubaccount[]> {
  const data = await blotatoFetch(
    apiKey, "GET", `/users/me/accounts/${accountId}/subaccounts`
  ) as { items: BlotatoSubaccount[] };
  return data.items ?? [];
}

/**
 * Verify the API key is valid and return user info.
 */
export async function testBlotatoConnection(apiKey: string): Promise<{
  success: boolean;
  user?: { email?: string };
  accountCount?: number;
  error?: string;
}> {
  try {
    const accounts = await getBlotatoAccounts(apiKey);
    return {
      success: true,
      accountCount: accounts.length,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

// ─── Publishing ───────────────────────────────────────────────────────────────

/**
 * Submit a post to Blotato for publishing.
 * Returns a postSubmissionId — poll getPostStatus() for result.
 * 
 * CRITICAL: scheduledTime and useNextFreeSlot must be ROOT-LEVEL fields,
 * NOT nested inside the post object. If nested, post publishes immediately.
 */
export async function submitBlotatoPost(
  apiKey: string,
  post: BlotatoPostRequest,
  schedule?: BlotatoScheduleOptions
): Promise<BlotatoSubmitResult> {
  // Build payload with scheduling fields at ROOT LEVEL
  const payload: Record<string, unknown> = { post };
  
  if (schedule?.scheduledTime) {
    payload.scheduledTime = schedule.scheduledTime;  // ROOT LEVEL
  } else if (schedule?.useNextFreeSlot) {
    payload.useNextFreeSlot = true;  // ROOT LEVEL
  }
  // If no schedule options: post publishes immediately

  const data = await blotatoFetch(apiKey, "POST", "/posts", payload) as BlotatoSubmitResult;
  return data;
}

/**
 * Poll the status of a submitted post.
 * Call this every 30-60 seconds until status is "published" or "failed".
 */
export async function getBlotatoPostStatus(
  apiKey: string,
  postSubmissionId: string
): Promise<BlotatoPostStatus> {
  const data = await blotatoFetch(
    apiKey, "GET", `/posts/${postSubmissionId}`
  ) as BlotatoPostStatus;
  return data;
}

// ─── Schedule Slots ───────────────────────────────────────────────────────────

export interface BlotatoSlot {
  id: string;
  hour: number;
  minute: number;
  day: string;
  selectedTargets: Array<{
    platform: string;
    accountId: string;
    subaccountId: string | null;
  }>;
}

/**
 * Get all configured schedule slots for this account.
 */
export async function getBlotatoSlots(apiKey: string): Promise<BlotatoSlot[]> {
  const data = await blotatoFetch(apiKey, "GET", "/schedule/slots") as { items: BlotatoSlot[] };
  return data.items ?? [];
}

/**
 * Create schedule slots for a platform/account.
 * Each slot = a recurring posting time (day + hour + minute + target platforms).
 */
export async function createBlotatoSlots(
  apiKey: string,
  slots: Omit<BlotatoSlot, "id">[]
): Promise<BlotatoSlot[]> {
  const data = await blotatoFetch(apiKey, "POST", "/schedule/slots", { slots }) as { items: BlotatoSlot[] };
  return data.items ?? [];
}

/**
 * Delete a schedule slot.
 * Note: fails if the slot has future scheduled content — delete schedules first.
 */
export async function deleteBlotatoSlot(apiKey: string, slotId: string): Promise<void> {
  await blotatoFetch(apiKey, "DELETE", `/schedules/slots/${slotId}`);
}

/**
 * Find the next available slot for a platform/account.
 * Use this when rescheduling to the next free slot via scheduledTime.
 */
export async function getNextAvailableSlot(
  apiKey: string,
  platform: string,
  accountId: string
): Promise<{ slotId: string; slotTime: string } | null> {
  try {
    const data = await blotatoFetch(
      apiKey, "POST", "/schedule/slots/next-available",
      { platform, accountId, subaccountId: null }
    ) as { slot: { slotId: string; slotTime: string } };
    return data.slot;
  } catch {
    return null;
  }
}

// ─── Content Extraction (Source API) ─────────────────────────────────────────

export type BlotatoSourceType = 
  | "youtube" | "tiktok" | "article" | "pdf" 
  | "audio" | "twitter" | "text" | "perplexity-query";

export interface BlotatoSourceResult {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  content?: string;
  title?: string;
  error?: string;
}

/**
 * Extract content from a URL or text using Blotato's source API.
 * Returns a source ID — poll getSourceStatus() for result.
 */
export async function submitBlotatoSource(
  apiKey: string,
  sourceType: BlotatoSourceType,
  urlOrText: string,
  customInstructions?: string
): Promise<{ id: string }> {
  const body: Record<string, unknown> = {
    source: {
      sourceType,
      ...(sourceType === "text" || sourceType === "perplexity-query"
        ? { text: urlOrText }
        : { url: urlOrText }
      ),
    },
  };
  
  if (customInstructions) {
    body.customInstructions = customInstructions;
  }

  return await blotatoFetch(apiKey, "POST", "/source-resolutions-v3", body) as { id: string };
}

/**
 * Poll the status of a source extraction request.
 */
export async function getBlotatoSourceStatus(
  apiKey: string,
  sourceId: string
): Promise<BlotatoSourceResult> {
  return await blotatoFetch(
    apiKey, "GET", `/source-resolutions-v3/${sourceId}`
  ) as BlotatoSourceResult;
}

// ─── Auto-sync helper (called from settings save hook) ────────────────────────

export async function syncBlotatoAccountsForLicense(licenseId: number): Promise<void> {
  const { getLicenseSetting, storeBlotatoAccounts } = await import("./db");
  const ls = await getLicenseSetting(licenseId, "blotato_api_key");
  const apiKey = ls?.value || null;
  if (!apiKey) return;

  const accounts = await getBlotatoAccounts(apiKey);
  const enrichedAccounts = await Promise.all(
    accounts.map(async (account) => {
      let pageId: string | undefined;
      if (account.platform === "facebook" || account.platform === "linkedin") {
        try {
          const subaccounts = await getBlotatoSubaccounts(apiKey, account.id);
          if (subaccounts.length > 0) pageId = subaccounts[0].id;
        } catch { /* no subaccounts */ }
      }
      return {
        id: account.id,
        platform: account.platform,
        username: account.username || account.fullname,
        ...(pageId && { pageId }),
      };
    })
  );

  await storeBlotatoAccounts(licenseId, enrichedAccounts);
  console.log("[Blotato] Synced " + enrichedAccounts.length + " accounts for licenseId " + licenseId);
}

// ─── Slot sync helper ─────────────────────────────────────────────────────────

export async function syncSlotsToBlotato(
  licenseId: number,
  slots: Array<{ platform: string; day: string; hour: number; minute: number }>
): Promise<void> {
  const { getLicenseSetting, getBlotatoAccountsFromSettings } = await import("./db");
  const ls = await getLicenseSetting(licenseId, "blotato_api_key");
  const apiKey = ls?.value || null;
  if (!apiKey) return;

  const accounts = await getBlotatoAccountsFromSettings(licenseId);
  if (accounts.length === 0) return;

  // Get existing Blotato slots and delete them (clean slate)
  const existingSlots = await getBlotatoSlots(apiKey);
  for (const slot of existingSlots) {
    try { await deleteBlotatoSlot(apiKey, slot.id); } catch { /* skip if has content */ }
  }

  // Create new slots from config
  const blotatoSlots = slots
    .map(slot => {
      const account = accounts.find(a => a.platform === slot.platform);
      if (!account) return null;
      return {
        hour: slot.hour,
        minute: slot.minute,
        day: slot.day,
        selectedTargets: [{
          platform: slot.platform,
          accountId: account.id,
          subaccountId: account.pageId ?? null,
        }],
      };
    })
    .filter(Boolean) as Array<Omit<BlotatoSlot, "id">>;

  if (blotatoSlots.length > 0) {
    await createBlotatoSlots(apiKey, blotatoSlots);
  }

  console.log("[Blotato] Synced " + blotatoSlots.length + " slots for licenseId " + licenseId);
}

// ─── Article Distribution ─────────────────────────────────────────────────────

function buildPostContent(
  article: { headline: string; subheadline?: string | null; featuredImage?: string | null },
  articleUrl: string,
  platform: string
): BlotatoPostContent {
  const mediaUrls = article.featuredImage ? [article.featuredImage] : [];
  switch (platform) {
    case "twitter":
    case "x":
      return { text: article.headline + "\n\n" + articleUrl, mediaUrls, platform: "twitter" };
    case "instagram":
      return { text: article.headline + "\n\n" + (article.subheadline || "") + "\n\nRead more at the link in bio.\n\n" + articleUrl, mediaUrls, platform: "instagram" };
    case "linkedin":
      return { text: article.headline + "\n\n" + (article.subheadline || "") + "\n\n" + articleUrl, mediaUrls, platform: "linkedin" };
    case "facebook":
      return { text: article.headline + "\n\n" + (article.subheadline || ""), mediaUrls, platform: "facebook" };
    case "threads":
      return { text: article.headline + "\n\n" + articleUrl, mediaUrls, platform: "threads" };
    case "bluesky":
      return { text: article.headline + "\n\n" + articleUrl, mediaUrls, platform: "bluesky" };
    default:
      return { text: article.headline + "\n\n" + articleUrl, mediaUrls, platform };
  }
}

function buildPostTarget(account: { platform: string; id: string; pageId?: string }): BlotatoTarget {
  switch (account.platform) {
    case "facebook":
      return { targetType: "facebook", pageId: account.pageId };
    case "linkedin":
      return { targetType: "linkedin", ...(account.pageId && { pageId: account.pageId }) };
    case "tiktok":
      return { targetType: "tiktok", privacyLevel: "PUBLIC_TO_EVERYONE", disabledComments: false, disabledDuet: false, disabledStitch: false, isBrandedContent: false, isYourBrand: true, isAiGenerated: true };
    default:
      return { targetType: account.platform };
  }
}

export async function queueArticleToBlotato(
  licenseId: number,
  article: { id: number; headline: string; subheadline?: string | null; slug: string; featuredImage?: string | null },
  siteUrl: string
): Promise<number> {
  const { getLicenseSetting, getBlotatoAccountsFromSettings } = await import("./db");
  const ls = await getLicenseSetting(licenseId, "blotato_api_key");
  const apiKey = ls?.value || null;
  if (!apiKey) {
    console.log("[Blotato] No API key for licenseId " + licenseId + " — skipping distribution");
    return 0;
  }

  const accounts = await getBlotatoAccountsFromSettings(licenseId);
  if (accounts.length === 0) {
    console.log("[Blotato] No accounts for licenseId " + licenseId + " — skipping distribution");
    return 0;
  }

  // Determine enabled platforms from license_settings toggles
  const enabledPlatforms: string[] = [];
  const platformKeys = ["x", "instagram", "linkedin", "facebook", "threads", "bluesky", "tiktok"];
  for (const p of platformKeys) {
    const setting = await getLicenseSetting(licenseId, "blotato_" + p + "_enabled");
    if (setting?.value === "true") enabledPlatforms.push(p);
  }
  // Also accept "twitter" if "x" is enabled
  if (enabledPlatforms.includes("x")) enabledPlatforms.push("twitter");

  const articleUrl = siteUrl.replace(/\/$/, "") + "/article/" + article.slug;
  let queued = 0;

  for (const account of accounts) {
    if (!enabledPlatforms.includes(account.platform)) continue;

    try {
      const postContent = buildPostContent(article, articleUrl, account.platform);
      const target = buildPostTarget(account);
      let result;
      try {
        result = await submitBlotatoPost(apiKey, { accountId: account.id, content: postContent, target }, { useNextFreeSlot: true });
      } catch (slotErr: any) {
        if (slotErr?.message?.includes("No available slot")) {
          result = await submitBlotatoPost(apiKey, { accountId: account.id, content: postContent, target });
          console.log("[Blotato] No slots — posting immediately for " + account.platform);
        } else {
          throw slotErr;
        }
      }
      console.log("[Blotato] Queued " + account.platform + " post for article " + article.id + ": " + result.postSubmissionId);

      // Record in distribution_queue
      try {
        const { getDb } = await import("./db");
        const { distributionQueue } = await import("../drizzle/schema");
        const { sql } = await import("drizzle-orm");
        const db2 = await getDb();
        if (db2) {
          const [insertResult] = await db2.insert(distributionQueue).values({
            articleId: article.id,
            platform: account.platform,
            status: "sending",
            content: postContent.text,
            platformPostId: result.postSubmissionId,
            triggeredBy: "auto",
            imageUrl: article.featuredImage || undefined,
          });
          // Set license_id via raw SQL (column exists in DB but not Drizzle schema)
          if (insertResult.insertId) {
            await db2.execute(sql.raw("UPDATE distribution_queue SET license_id = " + licenseId + " WHERE id = " + insertResult.insertId));
          }
        }
      } catch (e) {
        console.error("[Blotato] Failed to record queue entry:", e);
      }

      queued++;
    } catch (err) {
      console.error("[Blotato] Failed to queue " + account.platform + " for article " + article.id + ":", err);
    }
  }
  return queued;
}

// ─── Status Polling ───────────────────────────────────────────────────────────

export async function pollBlotatoStatuses(): Promise<{ checked: number; updated: number }> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return { checked: 0, updated: 0 };

  const { distributionQueue } = await import("../drizzle/schema");
  const { eq, and, isNotNull, sql } = await import("drizzle-orm");

  // Get all "sending" rows that have a platformPostId
  const pendingRows = await db
    .select()
    .from(distributionQueue)
    .where(and(eq(distributionQueue.status, "sending"), isNotNull(distributionQueue.platformPostId)))
    .limit(50);

  if (pendingRows.length === 0) return { checked: 0, updated: 0 };

  console.log("[Blotato Poller] Checking " + pendingRows.length + " pending posts");

  // Group by license to reuse API keys
  const keyCache = new Map<number, string | null>();
  let updated = 0;

  for (const row of pendingRows) {
    try {
      // Get license_id via raw SQL since column may not be in Drizzle schema
      let licenseId: number | null = null;
      const [licRow] = await db.execute(sql.raw("SELECT license_id FROM distribution_queue WHERE id = " + row.id));
      if (licRow && (licRow as any).license_id) licenseId = (licRow as any).license_id;
      // Fallback: get from article
      if (!licenseId && row.articleId) {
        const { articles } = await import("../drizzle/schema");
        const [art] = await db.select({ licenseId: articles.licenseId }).from(articles).where(eq(articles.id, row.articleId)).limit(1);
        if (art?.licenseId) licenseId = art.licenseId;
      }
      if (!licenseId) continue;

      // Get API key (cached per license)
      if (!keyCache.has(licenseId)) {
        const { getLicenseSetting } = await import("./db");
        const ls = await getLicenseSetting(licenseId, "blotato_api_key");
        keyCache.set(licenseId, ls?.value || null);
      }
      const apiKey = keyCache.get(licenseId);
      if (!apiKey) continue;

      const status = await getBlotatoPostStatus(apiKey, row.platformPostId!);

      if (status.status === "published") {
        await db.update(distributionQueue).set({
          status: "sent",
          sentAt: new Date(),
          postUrl: status.publicUrl ?? null,
        }).where(eq(distributionQueue.id, row.id));
        console.log("[Blotato Poller] Post " + row.platformPostId + " published on " + row.platform);
        updated++;
      } else if (status.status === "failed") {
        await db.update(distributionQueue).set({
          status: "failed",
          errorMessage: status.errorMessage ?? "Unknown error",
        }).where(eq(distributionQueue.id, row.id));
        console.log("[Blotato Poller] Post " + row.platformPostId + " failed: " + status.errorMessage);
        updated++;
      }
      // "in-progress" — leave as sending

    } catch (err) {
      console.error("[Blotato Poller] Error checking post " + row.platformPostId + ":", err);
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { checked: pendingRows.length, updated };
}

export async function pollBlotatoStatusesForLicense(licenseId: number): Promise<{ checked: number; updated: number }> {
  const { getDb, getLicenseSetting } = await import("./db");
  const db = await getDb();
  if (!db) return { checked: 0, updated: 0 };

  const ls = await getLicenseSetting(licenseId, "blotato_api_key");
  const apiKey = ls?.value || null;
  if (!apiKey) return { checked: 0, updated: 0 };

  const { distributionQueue } = await import("../drizzle/schema");
  const { eq, and, isNotNull, sql } = await import("drizzle-orm");

  const pendingRows = await db
    .select()
    .from(distributionQueue)
    .where(and(
      eq(distributionQueue.status, "sending"),
      isNotNull(distributionQueue.platformPostId),
      sql.raw("license_id = " + licenseId),
    ))
    .limit(50);

  if (pendingRows.length === 0) return { checked: 0, updated: 0 };

  let updated = 0;
  for (const row of pendingRows) {
    try {
      const status = await getBlotatoPostStatus(apiKey, row.platformPostId!);
      if (status.status === "published") {
        await db.update(distributionQueue).set({ status: "sent", sentAt: new Date(), postUrl: status.publicUrl ?? null }).where(eq(distributionQueue.id, row.id));
        updated++;
      } else if (status.status === "failed") {
        await db.update(distributionQueue).set({ status: "failed", errorMessage: status.errorMessage ?? "Unknown error" }).where(eq(distributionQueue.id, row.id));
        updated++;
      }
    } catch (err) {
      console.error("[Blotato Poller] Error:", err);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { checked: pendingRows.length, updated };
}
