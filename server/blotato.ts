/**
 * Blotato Social Distribution Client
 * All social posting goes through Blotato — not native platform APIs.
 */

const BLOTATO_BASE = "https://app.blotato.com";

export interface BlotatoPostOptions {
  licenseId: number;
  platforms: string[];
  text: string;
  imageUrl?: string;
  link?: string;
  articleId?: number;
}

export interface BlotatoPostResult {
  platform: string;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

async function getBlotatoKey(licenseId: number): Promise<string | null> {
  const { getLicenseSetting } = await import("./db");
  const tenantKey = await getLicenseSetting(licenseId, "blotato_api_key");
  return tenantKey?.value || process.env.BLOTATO_API_KEY || null;
}

export async function blotatoPost(options: BlotatoPostOptions): Promise<BlotatoPostResult[]> {
  const apiKey = await getBlotatoKey(options.licenseId);
  if (!apiKey) {
    return options.platforms.map(p => ({ platform: p, success: false, error: "Blotato API key not configured" }));
  }

  const results: BlotatoPostResult[] = [];
  for (const platform of options.platforms) {
    try {
      const response = await fetch(`${BLOTATO_BASE}/api/v1/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          platform,
          text: options.text,
          ...(options.imageUrl ? { image_url: options.imageUrl } : {}),
          ...(options.link ? { link: options.link } : {}),
        }),
      });
      if (!response.ok) {
        const err = await response.text().catch(() => "");
        results.push({ platform, success: false, error: `HTTP ${response.status}: ${err.substring(0, 200)}` });
      } else {
        const data = await response.json() as any;
        results.push({ platform, success: true, postId: data.id || data.post_id, postUrl: data.url || data.post_url });
      }
    } catch (e: any) {
      results.push({ platform, success: false, error: e.message });
    }
  }
  return results;
}

export async function testBlotatoConnection(apiKey: string): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
  try {
    const response = await fetch(`${BLOTATO_BASE}/api/v1/account`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, accountInfo: data };
    }
    const err = await response.text().catch(() => "");
    return { success: false, error: `HTTP ${response.status}: ${err.substring(0, 200)}` };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
