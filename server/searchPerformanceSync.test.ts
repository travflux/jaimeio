/**
 * searchPerformanceSync.test.ts
 * Tests for Search Engine Performance sync module (GSC + Bing)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────
vi.mock("./db", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock gscClient ───────────────────────────────────────────────
vi.mock("./gscClient", () => ({
  fetchGscData: vi.fn(),
}));

// ─── Mock bingWebmasterClient ─────────────────────────────────────
vi.mock("./bingWebmasterClient", () => ({
  fetchBingData: vi.fn(),
}));

// ─── Mock drizzle getDb ───────────────────────────────────────────
const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockReturnValue({
    onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
  }),
});
vi.mock("../drizzle/schema", () => ({
  searchEnginePerformance: { engine: "engine", date: "date", type: "type", query: "query", pageUrl: "pageUrl", clicks: "clicks", impressions: "impressions", ctr: "ctr", position: "position" },
}));

import { getSearchSyncStatus } from "./searchPerformanceSync";
import * as dbModule from "./db";
import * as gscModule from "./gscClient";
import * as bingModule from "./bingWebmasterClient";

describe("getSearchSyncStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    delete process.env.GSC_CLIENT_ID;
    delete process.env.GSC_REFRESH_TOKEN;
    delete process.env.BING_WEBMASTER_API_KEY;
  });

  it("returns not-configured when env vars are missing", async () => {
    vi.mocked(dbModule.getSetting).mockResolvedValue(null);
    const status = await getSearchSyncStatus();
    expect(status.gsc.configured).toBe(false);
    expect(status.bing.configured).toBe(false);
  });

  it("marks gsc as configured when env vars are set", async () => {
    process.env.GSC_CLIENT_ID = "test-client-id";
    process.env.GSC_REFRESH_TOKEN = "test-refresh-token";
    vi.mocked(dbModule.getSetting).mockResolvedValue(null);
    const status = await getSearchSyncStatus();
    expect(status.gsc.configured).toBe(true);
    expect(status.bing.configured).toBe(false);
  });

  it("marks bing as configured when env var is set", async () => {
    process.env.BING_WEBMASTER_API_KEY = "test-bing-key";
    vi.mocked(dbModule.getSetting).mockResolvedValue(null);
    const status = await getSearchSyncStatus();
    expect(status.gsc.configured).toBe(false);
    expect(status.bing.configured).toBe(true);
  });

  it("reads last sync time from DB settings", async () => {
    const mockTime = "2026-03-01T07:00:00.000Z";
    vi.mocked(dbModule.getSetting).mockImplementation(async (key: string) => {
      if (key === "search_sync_gsc_last_sync") return { value: mockTime } as { value: string };
      if (key === "search_sync_gsc_last_query_rows") return { value: "42" } as { value: string };
      if (key === "search_sync_gsc_last_page_rows") return { value: "18" } as { value: string };
      return null;
    });
    const status = await getSearchSyncStatus();
    expect(status.gsc.lastSync).toBe(mockTime);
    expect(status.gsc.lastQueryRows).toBe(42);
    expect(status.gsc.lastPageRows).toBe(18);
  });

  it("reads last error from DB settings", async () => {
    vi.mocked(dbModule.getSetting).mockImplementation(async (key: string) => {
      if (key === "search_sync_bing_last_error") return { value: "401 Unauthorized" } as { value: string };
      return null;
    });
    const status = await getSearchSyncStatus();
    expect(status.bing.lastError).toBe("401 Unauthorized");
  });

  it("returns zero row counts when DB has no entries", async () => {
    vi.mocked(dbModule.getSetting).mockResolvedValue(null);
    const status = await getSearchSyncStatus();
    expect(status.gsc.lastQueryRows).toBe(0);
    expect(status.gsc.lastPageRows).toBe(0);
    expect(status.bing.lastQueryRows).toBe(0);
    expect(status.bing.lastPageRows).toBe(0);
  });
});

describe("gscClient — fetchGscData", () => {
  it("is exported as a function", async () => {
    const { fetchGscData } = await import("./gscClient");
    expect(typeof fetchGscData).toBe("function");
  });
});

describe("bingWebmasterClient — fetchBingData", () => {
  it("is exported as a function", async () => {
    const { fetchBingData } = await import("./bingWebmasterClient");
    expect(typeof fetchBingData).toBe("function");
  });
});

describe("SearchSyncStatus shape", () => {
  it("has correct keys for gsc and bing", async () => {
    vi.mocked(dbModule.getSetting).mockResolvedValue(null);
    const status = await getSearchSyncStatus();
    expect(status).toHaveProperty("gsc");
    expect(status).toHaveProperty("bing");
    expect(status.gsc).toHaveProperty("configured");
    expect(status.gsc).toHaveProperty("lastSync");
    expect(status.gsc).toHaveProperty("lastQueryRows");
    expect(status.gsc).toHaveProperty("lastPageRows");
    expect(status.gsc).toHaveProperty("lastError");
    expect(status.bing).toHaveProperty("configured");
    expect(status.bing).toHaveProperty("lastSync");
    expect(status.bing).toHaveProperty("lastQueryRows");
    expect(status.bing).toHaveProperty("lastPageRows");
    expect(status.bing).toHaveProperty("lastError");
  });
});
