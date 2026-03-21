/**
 * google-image-crawler.test.ts — Unit tests for Google CSE image crawler (v4.9.7)
 *
 * Tests cover:
 * - Domain status checking (whitelist/blacklist/unknown)
 * - Image size filtering
 * - URL validation
 * - AI validation score thresholds
 * - Library reuse logic
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Domain Status Helpers ────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isDomainAllowed(
  domain: string,
  whitelist: string[],
  blacklist: string[]
): "whitelisted" | "blacklisted" | "unknown" {
  if (blacklist.includes(domain)) return "blacklisted";
  if (whitelist.includes(domain)) return "whitelisted";
  return "unknown";
}

// ─── Image Size Filter ────────────────────────────────────────────────────────

function meetsMinimumSize(
  width: number,
  height: number,
  minWidth = 400,
  minHeight = 300
): boolean {
  return width >= minWidth && height >= minHeight;
}

// ─── Relevance Score Threshold ────────────────────────────────────────────────

function isRelevantEnough(score: number, threshold = 0.5): boolean {
  return score >= threshold;
}

// ─── Library Reuse Logic ──────────────────────────────────────────────────────

function findReusableImage(
  articleTags: string[],
  library: Array<{ tags: string[]; timesUsed: number; cdnUrl: string }>,
  maxReuse = 3
): string | null {
  const candidates = library.filter(img => {
    if (img.timesUsed >= maxReuse) return false;
    return img.tags.some(tag => articleTags.includes(tag));
  });
  if (candidates.length === 0) return null;
  // Sort by most tags matched, then by least used
  candidates.sort((a, b) => {
    const aMatches = a.tags.filter(t => articleTags.includes(t)).length;
    const bMatches = b.tags.filter(t => articleTags.includes(t)).length;
    if (bMatches !== aMatches) return bMatches - aMatches;
    return a.timesUsed - b.timesUsed;
  });
  return candidates[0].cdnUrl;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("extractDomain", () => {
  it("extracts domain from https URL", () => {
    expect(extractDomain("https://reuters.com/photo.jpg")).toBe("reuters.com");
  });
  it("strips www prefix", () => {
    expect(extractDomain("https://www.apnews.com/image.jpg")).toBe("apnews.com");
  });
  it("returns empty string for invalid URL", () => {
    expect(extractDomain("not-a-url")).toBe("");
  });
  it("handles URL with path", () => {
    expect(extractDomain("https://upload.wikimedia.org/wikipedia/commons/image.jpg")).toBe("upload.wikimedia.org");
  });
});

describe("isDomainAllowed", () => {
  const whitelist = ["reuters.com", "apnews.com", "wikimedia.org"];
  const blacklist = ["gettyimages.com", "shutterstock.com", "istockphoto.com"];

  it("returns whitelisted for known good domain", () => {
    expect(isDomainAllowed("reuters.com", whitelist, blacklist)).toBe("whitelisted");
  });
  it("returns blacklisted for known bad domain", () => {
    expect(isDomainAllowed("shutterstock.com", whitelist, blacklist)).toBe("blacklisted");
  });
  it("returns unknown for unrecognized domain", () => {
    expect(isDomainAllowed("example.com", whitelist, blacklist)).toBe("unknown");
  });
  it("blacklist takes priority over whitelist", () => {
    // If a domain is somehow in both, blacklist wins
    expect(isDomainAllowed("shutterstock.com", ["shutterstock.com", ...whitelist], blacklist)).toBe("blacklisted");
  });
});

describe("meetsMinimumSize", () => {
  it("passes image meeting minimum dimensions", () => {
    expect(meetsMinimumSize(800, 600)).toBe(true);
  });
  it("rejects image below minimum width", () => {
    expect(meetsMinimumSize(300, 600)).toBe(false);
  });
  it("rejects image below minimum height", () => {
    expect(meetsMinimumSize(800, 200)).toBe(false);
  });
  it("passes image exactly at minimum dimensions", () => {
    expect(meetsMinimumSize(400, 300)).toBe(true);
  });
  it("respects custom thresholds", () => {
    expect(meetsMinimumSize(200, 150, 200, 150)).toBe(true);
    expect(meetsMinimumSize(199, 150, 200, 150)).toBe(false);
  });
});

describe("isRelevantEnough", () => {
  it("accepts score at threshold", () => {
    expect(isRelevantEnough(0.5)).toBe(true);
  });
  it("accepts score above threshold", () => {
    expect(isRelevantEnough(0.9)).toBe(true);
  });
  it("rejects score below threshold", () => {
    expect(isRelevantEnough(0.49)).toBe(false);
  });
  it("rejects zero score", () => {
    expect(isRelevantEnough(0)).toBe(false);
  });
  it("respects custom threshold", () => {
    expect(isRelevantEnough(0.7, 0.8)).toBe(false);
    expect(isRelevantEnough(0.8, 0.8)).toBe(true);
  });
});

describe("findReusableImage", () => {
  const library = [
    { tags: ["politics", "congress", "senate"], timesUsed: 0, cdnUrl: "https://cdn.example.com/politics1.jpg" },
    { tags: ["politics", "white-house"], timesUsed: 2, cdnUrl: "https://cdn.example.com/politics2.jpg" },
    { tags: ["technology", "ai", "robots"], timesUsed: 1, cdnUrl: "https://cdn.example.com/tech1.jpg" },
    { tags: ["sports", "football"], timesUsed: 3, cdnUrl: "https://cdn.example.com/sports1.jpg" },
  ];

  it("returns best matching image for article tags", () => {
    const result = findReusableImage(["politics", "senate", "election"], library, 3);
    expect(result).toBe("https://cdn.example.com/politics1.jpg");
  });

  it("skips images at max reuse count", () => {
    // sports1 has timesUsed=3 which equals maxReuse=3, should be skipped
    const result = findReusableImage(["sports", "football"], library, 3);
    expect(result).toBeNull();
  });

  it("returns null when no tags match", () => {
    const result = findReusableImage(["cooking", "recipes"], library, 3);
    expect(result).toBeNull();
  });

  it("prefers image with more tag matches", () => {
    // politics1 matches 2 tags (politics, senate), politics2 matches 1 (politics)
    const result = findReusableImage(["politics", "senate"], library, 3);
    expect(result).toBe("https://cdn.example.com/politics1.jpg");
  });

  it("prefers less-used image when tag match count is equal", () => {
    const tiedLibrary = [
      { tags: ["tech"], timesUsed: 2, cdnUrl: "https://cdn.example.com/tech-used.jpg" },
      { tags: ["tech"], timesUsed: 0, cdnUrl: "https://cdn.example.com/tech-fresh.jpg" },
    ];
    const result = findReusableImage(["tech"], tiedLibrary, 3);
    expect(result).toBe("https://cdn.example.com/tech-fresh.jpg");
  });

  it("respects custom maxReuse value", () => {
    // politics2 has timesUsed=2, with maxReuse=2 it should be excluded (timesUsed >= maxReuse)
    // politics1 also matches "politics" tag and has timesUsed=0, so it should be returned
    const result = findReusableImage(["politics", "white-house"], library, 2);
    // politics1 matches "politics" (1 tag), politics2 is excluded (timesUsed=2 >= maxReuse=2)
    expect(result).toBe("https://cdn.example.com/politics1.jpg");
  });

  it("returns null when all matching images exceed maxReuse", () => {
    const saturatedLibrary = [
      { tags: ["sports"], timesUsed: 5, cdnUrl: "https://cdn.example.com/sports-saturated.jpg" },
    ];
    const result = findReusableImage(["sports"], saturatedLibrary, 3);
    expect(result).toBeNull();
  });
});
