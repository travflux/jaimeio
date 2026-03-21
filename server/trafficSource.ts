/**
 * Traffic source classification for first-party analytics.
 * Classifies a referrer URL + UTM params into source/medium pairs.
 */

export interface TrafficSource {
  source: string;  // "x", "google", "direct", "reddit", "facebook", "email", "other"
  medium: string;  // "organic", "paid", "social", "email", "referral", "direct"
}

const SOCIAL_SOURCES: Record<string, string> = {
  "t.co": "x",
  "twitter.com": "x",
  "x.com": "x",
  "reddit.com": "reddit",
  "old.reddit.com": "reddit",
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "threads.net": "threads",
  "tiktok.com": "tiktok",
  "youtube.com": "youtube",
};

const SEARCH_SOURCES: Record<string, string> = {
  "google.com": "google",
  "google.co": "google",
  "bing.com": "bing",
  "yahoo.com": "yahoo",
  "duckduckgo.com": "duckduckgo",
  "search.brave.com": "brave",
  "yandex.com": "yandex",
  "baidu.com": "baidu",
};

const EMAIL_SOURCES: Record<string, string> = {
  "mail.google.com": "gmail",
  "outlook.live.com": "outlook",
  "mail.yahoo.com": "yahoo_mail",
  "substack.com": "substack",
  "beehiiv.com": "beehiiv",
  "mailchimp.com": "mailchimp",
};

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Classify a request into source + medium.
 * UTM params take precedence over referrer heuristics.
 */
export function classifyReferrer(
  referrer: string | undefined,
  utmSource?: string,
  utmMedium?: string
): TrafficSource {
  // UTM params take full precedence
  if (utmSource) {
    return {
      source: utmSource.toLowerCase().trim(),
      medium: utmMedium ? utmMedium.toLowerCase().trim() : "referral",
    };
  }

  if (!referrer) {
    return { source: "direct", medium: "direct" };
  }

  const domain = extractDomain(referrer);
  if (!domain) {
    return { source: "direct", medium: "direct" };
  }

  // Check social networks
  for (const [key, name] of Object.entries(SOCIAL_SOURCES)) {
    if (domain === key || domain.endsWith("." + key)) {
      return { source: name, medium: "social" };
    }
  }

  // Check search engines
  for (const [key, name] of Object.entries(SEARCH_SOURCES)) {
    if (domain === key || domain.endsWith("." + key)) {
      return { source: name, medium: "organic" };
    }
  }

  // Check email clients
  for (const [key, name] of Object.entries(EMAIL_SOURCES)) {
    if (domain === key || domain.endsWith("." + key)) {
      return { source: name, medium: "email" };
    }
  }

  // Generic referral
  return { source: domain, medium: "referral" };
}
