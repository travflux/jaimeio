/**
 * IndexNow Integration
 *
 * Submits URLs to the IndexNow protocol, which simultaneously notifies
 * Bing, Yahoo, DuckDuckGo, Yandex, ChatGPT (Bing index), Naver, and Seznam.
 *
 * White-label compatible: key and host are read from env vars / DB settings,
 * not hardcoded to any deployment.
 */

import * as db from "./db";

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

// In-memory tracking (also persisted to settings DB)
let _lastSubmitTime: string | null = null;
let _lastSubmitCount: number = 0;
let _totalSubmitted: number = 0;

export function getIndexNowStats() {
  return {
    lastSubmitTime: _lastSubmitTime,
    lastSubmitCount: _lastSubmitCount,
    totalSubmitted: _totalSubmitted,
  };
}

async function persistStats() {
  try {
    await db.setSetting("indexnow_last_submit_time", _lastSubmitTime || "", "seo");
    await db.setSetting("indexnow_total_submitted", String(_totalSubmitted), "seo");
  } catch { /* non-critical */ }
}

export async function loadIndexNowStats() {
  try {
    const t = await db.getSetting("indexnow_last_submit_time");
    const n = await db.getSetting("indexnow_total_submitted");
    if (t?.value) _lastSubmitTime = t.value;
    if (n?.value) _totalSubmitted = parseInt(n.value, 10) || 0;
  } catch { /* non-critical */ }
}

function getSiteHost(): string {
  const url = process.env.SITE_URL || "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/**
 * Submit a list of URLs to IndexNow.
 * Accepts absolute URLs or paths (will be prefixed with SITE_URL).
 */
export async function submitToIndexNow(urls: string[]): Promise<boolean> {
  if (!urls.length) return false;

  const host = getSiteHost();
  const siteBase = `https://${host}`;

  const payload: IndexNowPayload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${siteBase}/${INDEXNOW_KEY}.txt`,
    urlList: urls.map((url) =>
      url.startsWith("http") ? url : `${siteBase}${url}`
    ),
  };

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 202) {
      console.log(`[IndexNow] Submitted ${urls.length} URL(s) — status ${response.status}`);
      _lastSubmitTime = new Date().toISOString();
      _lastSubmitCount = urls.length;
      _totalSubmitted += urls.length;
      persistStats().catch(() => {});
      return true;
    } else {
      const body = await response.text().catch(() => "");
      console.error(`[IndexNow] Submission failed: ${response.status} ${response.statusText} — ${body.slice(0, 200)}`);
      return false;
    }
  } catch (error: any) {
    console.error("[IndexNow] Network error:", error?.message || error);
    return false;
  }
}

/**
 * Notify IndexNow that a single article was just published.
 * Fire-and-forget safe — errors are logged, never thrown.
 */
export async function notifyArticlePublished(slug: string): Promise<void> {
  const host = getSiteHost();
  await submitToIndexNow([`https://${host}/article/${slug}`]).catch((e) =>
    console.error("[IndexNow] notifyArticlePublished error:", e?.message)
  );
}

/**
 * Bulk-submit all article slugs. Batches in groups of 10,000 (IndexNow max).
 */
export async function submitAllArticles(slugs: string[]): Promise<void> {
  const host = getSiteHost();
  const urls = slugs.map((slug) => `https://${host}/article/${slug}`);
  const batchSize = 10000;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await submitToIndexNow(batch);
    if (i + batchSize < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
