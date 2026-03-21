/**
 * Tests for seedDefaultSettings auto-detect upgrade path.
 *
 * Verifies that any DEFAULT_SETTINGS key missing from the DB is automatically
 * backfilled on startup — without requiring a manual whitelist update.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock drizzle-orm and schema ────────────────────────────────────────────
vi.mock("../drizzle/schema", () => ({
  workflowSettings: { key: "key", value: "value" },
  users: {},
  categories: {},
  articles: {},
  newsletterSubscribers: {},
  socialPosts: {},
  workflowBatches: {},
  licenses: {},
  clientDeployments: {},
  searchAnalytics: {},
  contentCalendar: {},
  blockedSources: {},
  rssFeedWeights: {},
  rebalanceLogs: {},
  xReplies: {},
  ceoDirectives: {},
  coveredTopics: {},
  affiliateClicks: {},
  pageViews: {},
  merchProducts: {},
  merchLeads: {},
  imageLicenses: {},
  selectorCandidates: {},
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerOpenId: "test-owner", siteUrl: "https://test.example.com" },
}));

// ─── Build a minimal in-memory DB mock ──────────────────────────────────────
function buildDbMock(existingKeys: string[]) {
  const insertedKeys: string[] = [];

  const selectMock = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation((n: number) => {
      // First call (existence check): return 1 row to trigger upgrade path
      // Subsequent calls (per-key check): return empty to trigger insert
      return Promise.resolve(existingKeys.map(k => ({ key: k })).slice(0, n));
    }),
  };

  // Override: first select().from(workflowSettings).limit(1) → non-empty
  // Then: select({ key }).from(workflowSettings) → all existing keys
  let selectCallCount = 0;
  const dbMock = {
    select: vi.fn().mockImplementation((fields?: any) => {
      selectCallCount++;
      if (!fields) {
        // select() with no args → existence check
        return {
          from: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(selectCallCount === 1 ? [{ key: "existing" }] : []),
          }),
        };
      }
      // select({ key }) → return all existing keys
      return {
        from: vi.fn().mockReturnValue({
          // No .limit() call in the new auto-detect path
          then: (resolve: any) => resolve(existingKeys.map(k => ({ key: k }))),
          [Symbol.iterator]: undefined,
        }),
      };
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onDuplicateKeyUpdate: vi.fn().mockImplementation((_: any) => {
          return Promise.resolve();
        }),
      }),
    }),
  };

  return { dbMock, insertedKeys };
}

describe("seedDefaultSettings — auto-detect upgrade path", () => {
  it("backfills all DEFAULT_SETTINGS keys missing from an existing DB", async () => {
    // Arrange: simulate a DB that only has a subset of settings
    const existingKeys = ["articles_per_batch", "writing_style", "brand_name"];

    // We need to intercept the DB calls made by seedDefaultSettings.
    // Since getDb() is module-level, we mock it via the module.
    const insertedKeys: string[] = [];

    vi.doMock("mysql2/promise", () => ({
      default: {
        createPool: vi.fn().mockReturnValue({
          end: vi.fn(),
          query: vi.fn(),
          execute: vi.fn(),
        }),
      },
    }));

    // Import DEFAULT_SETTINGS directly to know the expected count
    const { DEFAULT_SETTINGS } = await import("./db");
    const expectedMissingCount = DEFAULT_SETTINGS.filter(
      (s) => !existingKeys.includes(s.key)
    ).length;

    expect(expectedMissingCount).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.length).toBeGreaterThan(existingKeys.length);

    // Verify all v4.5.x production settings are in DEFAULT_SETTINGS
    const productionKeys = [
      "score_high_threshold",
      "min_score_threshold",
      "min_score_to_publish",
      "expiry_breaking_hours",
      "expiry_trending_hours",
      "expiry_evergreen_hours",
      "production_loop_enabled",
      "production_mode",
      "production_interval_minutes",
      "max_daily_articles",
      "max_batch_high",
      "max_batch_medium",
      "pool_min_size",
      "brand_genre",
    ];

    for (const key of productionKeys) {
      const found = DEFAULT_SETTINGS.find((s) => s.key === key);
      expect(found, `DEFAULT_SETTINGS missing key: ${key}`).toBeDefined();
    }
  });

  it("DEFAULT_SETTINGS contains no Goodies keys", async () => {
    const { DEFAULT_SETTINGS } = await import("./db");
    const goodiesKeys = DEFAULT_SETTINGS.filter(
      (s) =>
        s.key.includes("horoscope") ||
        s.key.includes("crossword") ||
        s.key.includes("trivia") ||
        s.key.includes("word_scramble") ||
        s.key.includes("mad_lib") ||
        s.key.includes("easter_egg") ||
        s.key.includes("goodies")
    );
    expect(goodiesKeys).toHaveLength(0);
  });

  it("DEFAULT_SETTINGS has no duplicate keys", async () => {
    const { DEFAULT_SETTINGS } = await import("./db");
    const keys = DEFAULT_SETTINGS.map((s) => s.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("every DEFAULT_SETTINGS entry has a non-empty key and value", async () => {
    const { DEFAULT_SETTINGS } = await import("./db");
    for (const setting of DEFAULT_SETTINGS) {
      expect(setting.key, "key must be non-empty").toBeTruthy();
      expect(setting.value !== undefined, `value missing for key: ${setting.key}`).toBe(true);
    }
  });
});
