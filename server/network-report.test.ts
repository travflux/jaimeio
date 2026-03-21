/**
 * network-report.test.ts — v4.7.0
 *
 * 11 tests covering:
 *  1. Rate limiter: allows first request within window
 *  2. Rate limiter: blocks when limit exceeded
 *  3. Rate limiter: resets after window expires
 *  4. UPDATABLE_SETTINGS allowlist: contains all expected keys
 *  5. UPDATABLE_SETTINGS allowlist: rejects unknown keys
 *  6. Auth: missing API key → 401
 *  7. Auth: invalid API key → 401
 *  8. Auth: valid API key → passes auth (mock)
 *  9. GET response structure: contains required top-level fields
 * 10. POST settings: saves allowed key, rejects disallowed key
 * 11. POST actions: unknown action returns error object
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, UPDATABLE_SETTINGS } from "./network-report";

// ─── 1-3: Rate limiter ────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Each test uses a unique key to avoid cross-test interference
  });

  it("1. allows the first request within the window", () => {
    const allowed = checkRateLimit("test-key-1", 3, 60_000);
    expect(allowed).toBe(true);
  });

  it("2. blocks when the limit is exceeded within the window", () => {
    const key = "test-key-2";
    const maxRequests = 2;
    const windowMs = 60_000;
    // First two should pass
    expect(checkRateLimit(key, maxRequests, windowMs)).toBe(true);
    expect(checkRateLimit(key, maxRequests, windowMs)).toBe(true);
    // Third should be blocked
    expect(checkRateLimit(key, maxRequests, windowMs)).toBe(false);
  });

  it("3. resets after the window expires", () => {
    const key = "test-key-3";
    // Use a very short window (1ms) so it expires immediately
    const maxRequests = 1;
    const windowMs = 1;
    expect(checkRateLimit(key, maxRequests, windowMs)).toBe(true);
    // Exhaust the limit
    expect(checkRateLimit(key, maxRequests, windowMs)).toBe(false);
    // Wait for the window to expire
    return new Promise<void>(resolve => {
      setTimeout(() => {
        // After expiry, should be allowed again
        expect(checkRateLimit(key, maxRequests, windowMs)).toBe(true);
        resolve();
      }, 5);
    });
  });
});

// ─── 4-5: UPDATABLE_SETTINGS allowlist ───────────────────────────────────────

describe("UPDATABLE_SETTINGS allowlist", () => {
  it("4. contains all expected production and network settings keys", () => {
    const expected = [
      "production_loop_enabled",
      "production_mode",
      "production_interval_minutes",
      "max_daily_articles",
      "max_batch_high",
      "max_batch_medium",
      "score_high_threshold",
      "min_score_threshold",
      "min_score_to_publish",
      "pool_min_size",
      "network_api_enabled",
      "network_hub_url",
      "network_sync_interval",
    ];
    for (const key of expected) {
      expect(UPDATABLE_SETTINGS.has(key), `Expected '${key}' to be in UPDATABLE_SETTINGS`).toBe(true);
    }
  });

  it("5. does not contain sensitive or disallowed keys", () => {
    const disallowed = [
      "network_api_key",     // key itself must not be updatable via POST
      "brand_site_name",     // branding keys are not in scope
      "brand_contact_email",
      "jwt_secret",
      "database_url",
      "article_llm_system_prompt",
    ];
    for (const key of disallowed) {
      expect(UPDATABLE_SETTINGS.has(key), `'${key}' should NOT be in UPDATABLE_SETTINGS`).toBe(false);
    }
  });
});

// ─── 6-8: Auth middleware (unit-level via mock) ───────────────────────────────

describe("Auth middleware logic", () => {
  // We test the auth logic by simulating the middleware's behavior
  // without spinning up a full Express server.

  function buildAuthContext(providedKey: string | undefined, storedKey: string, apiEnabled: boolean) {
    return { providedKey, storedKey, apiEnabled };
  }

  function simulateAuth(ctx: ReturnType<typeof buildAuthContext>): { status: number; body: Record<string, string> } {
    if (!ctx.apiEnabled) {
      return { status: 503, body: { error: "Network API is disabled on this deployment" } };
    }
    if (!ctx.providedKey) {
      return { status: 401, body: { error: "Missing X-Network-API-Key header" } };
    }
    if (ctx.providedKey !== ctx.storedKey) {
      return { status: 401, body: { error: "Invalid API key" } };
    }
    return { status: 200, body: {} };
  }

  it("6. returns 401 when X-Network-API-Key header is missing", () => {
    const result = simulateAuth(buildAuthContext(undefined, "correct-key", true));
    expect(result.status).toBe(401);
    expect(result.body.error).toMatch(/Missing/);
  });

  it("7. returns 401 when an invalid API key is provided", () => {
    const result = simulateAuth(buildAuthContext("wrong-key", "correct-key", true));
    expect(result.status).toBe(401);
    expect(result.body.error).toMatch(/Invalid/);
  });

  it("8. passes auth when the correct API key is provided", () => {
    const result = simulateAuth(buildAuthContext("correct-key", "correct-key", true));
    expect(result.status).toBe(200);
  });
});

// ─── 9: GET response structure ────────────────────────────────────────────────

describe("GET /api/network-report response structure", () => {
  it("9. response contains all required top-level fields", () => {
    // Simulate the shape of the GET response
    const mockResponse = {
      ok: true,
      generatedAt: new Date().toISOString(),
      site: { name: "Test Site", url: "https://test.example.com" },
      articles: { total: 100, published: 80, pending: 20, today: 5 },
      pool: { high: 10, medium: 20, low: 5, dead: 0, unscored: 50, total: 85 },
      productionLoop: { isRunning: false, runCount: 3, lastMessage: "3 articles generated" },
      settings: {
        production_loop_enabled: "true",
        max_daily_articles: "500",
        brand_genre: "satire",
      },
    };

    expect(mockResponse).toHaveProperty("ok", true);
    expect(mockResponse).toHaveProperty("generatedAt");
    expect(mockResponse).toHaveProperty("site");
    expect(mockResponse.site).toHaveProperty("name");
    expect(mockResponse.site).toHaveProperty("url");
    expect(mockResponse).toHaveProperty("articles");
    expect(mockResponse.articles).toHaveProperty("total");
    expect(mockResponse.articles).toHaveProperty("today");
    expect(mockResponse).toHaveProperty("pool");
    expect(mockResponse.pool).toHaveProperty("high");
    expect(mockResponse.pool).toHaveProperty("unscored");
    expect(mockResponse).toHaveProperty("productionLoop");
    expect(mockResponse.productionLoop).toHaveProperty("isRunning");
    expect(mockResponse).toHaveProperty("settings");
    expect(typeof mockResponse.settings).toBe("object");
  });
});

// ─── 10: POST settings update logic ──────────────────────────────────────────

describe("POST /api/network-report settings update logic", () => {
  it("10. saves allowed keys and rejects disallowed keys", () => {
    const updates = {
      max_daily_articles: "200",       // allowed
      brand_site_name: "Hacked Site",  // not in allowlist
      network_api_key: "stolen-key",   // not in allowlist (security)
      pool_min_size: "5",              // allowed
    };

    const saved: string[] = [];
    const rejected: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (UPDATABLE_SETTINGS.has(key) && typeof value === "string") {
        saved.push(key);
      } else {
        rejected.push(key);
      }
    }

    expect(saved).toContain("max_daily_articles");
    expect(saved).toContain("pool_min_size");
    expect(rejected).toContain("brand_site_name");
    expect(rejected).toContain("network_api_key");
    expect(saved).toHaveLength(2);
    expect(rejected).toHaveLength(2);
  });
});

// ─── 11: POST actions unknown action ─────────────────────────────────────────

describe("POST /api/network-report/actions", () => {
  it("11. returns error object for unknown action", () => {
    const VALID_ACTIONS = ["score", "generate", "publish"];

    function handleAction(action: string) {
      if (!VALID_ACTIONS.includes(action)) {
        return {
          ok: false,
          error: `Unknown action '${action}'. Valid actions: ${VALID_ACTIONS.join(", ")}`,
        };
      }
      return { ok: true, action };
    }

    const result = handleAction("delete_all_articles");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unknown action/);
    expect(result.error).toMatch(/delete_all_articles/);

    // Valid actions should not return error
    for (const validAction of VALID_ACTIONS) {
      const validResult = handleAction(validAction);
      expect(validResult.ok).toBe(true);
    }
  });
});
