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
