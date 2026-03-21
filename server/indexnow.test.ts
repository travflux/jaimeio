import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module so IndexNow stats persistence doesn't hit a real DB
vi.mock("./db", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("IndexNow module", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.INDEXNOW_KEY = "test-indexnow-key-12345";
    process.env.SITE_URL = "https://joinwilderblueprint.vip";
  });

  it("returns false for empty URL list without calling fetch", async () => {
    const { submitToIndexNow } = await import("./indexnow");
    const result = await submitToIndexNow([]);
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("submits a single URL and returns true on 200", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    });
    const { submitToIndexNow } = await import("./indexnow");
    const result = await submitToIndexNow(["https://www.hambry.com/article/test-slug"]);
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.indexnow.org/IndexNow");
    const body = JSON.parse(opts.body);
    expect(body.urlList).toContain("https://www.hambry.com/article/test-slug");
    expect(body.key).toBeTruthy();
    expect(body.host).toBeTruthy();
    expect(body.keyLocation).toMatch(/\.txt$/);
  });

  it("returns true on 202 Accepted", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 202,
      statusText: "Accepted",
      text: async () => "",
    });
    const { submitToIndexNow } = await import("./indexnow");
    const result = await submitToIndexNow(["https://www.hambry.com/article/another-slug"]);
    expect(result).toBe(true);
  });

  it("returns false on 400 Bad Request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "bad request",
    });
    const { submitToIndexNow } = await import("./indexnow");
    const result = await submitToIndexNow(["https://www.hambry.com/article/bad-slug"]);
    expect(result).toBe(false);
  });

  it("returns false and does not throw on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));
    const { submitToIndexNow } = await import("./indexnow");
    const result = await submitToIndexNow(["https://www.hambry.com/article/net-error"]);
    expect(result).toBe(false);
  });

  it("prefixes relative paths with https site base URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    });
    const { submitToIndexNow } = await import("./indexnow");
    await submitToIndexNow(["/article/relative-slug"]);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.urlList[0]).toMatch(/^https:\/\//);
    expect(body.urlList[0]).toContain("/article/relative-slug");
  });

  it("notifyArticlePublished resolves without throwing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    });
    const { notifyArticlePublished } = await import("./indexnow");
    await expect(notifyArticlePublished("some-article-slug")).resolves.toBeUndefined();
  });

  it("notifyArticlePublished does not throw even when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Timeout"));
    const { notifyArticlePublished } = await import("./indexnow");
    await expect(notifyArticlePublished("fail-slug")).resolves.toBeUndefined();
  });

  it("getIndexNowStats returns structured stats object", async () => {
    const { getIndexNowStats } = await import("./indexnow");
    const stats = getIndexNowStats();
    expect(stats).toHaveProperty("lastSubmitTime");
    expect(stats).toHaveProperty("lastSubmitCount");
    expect(stats).toHaveProperty("totalSubmitted");
    expect(typeof stats.totalSubmitted).toBe("number");
  });
});
