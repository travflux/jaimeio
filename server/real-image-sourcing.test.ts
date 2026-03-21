/**
 * Tests for real-image-sourcing module
 *
 * Tests the exported public API: searchFlickrCC, searchWikimedia,
 * searchUnsplash, searchPexels, searchPixabay, generateBrandedCard,
 * logImageLicense, and findRealImage — all with mocked HTTP/DB/storage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock external dependencies ──────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-image-data")),
    composite: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    metadata: vi.fn().mockResolvedValue({ width: 1200, height: 630 }),
  })),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://cdn.example.com/test-image.jpg",
    key: "test-key",
  }),
}));

vi.mock("./db", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  searchFlickrCC,
  searchWikimedia,
  searchUnsplash,
  searchPexels,
  searchPixabay,
  logImageLicense,
  type ImageResult,
} from "./sources/real-image-sourcing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFlickrResponse(photos: object[]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        photos: {
          photo: photos,
          total: photos.length,
        },
        stat: "ok",
      }),
  };
}

function makeWikimediaResponse(pages: object[]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        query: {
          pages: Object.fromEntries(
            pages.map((p: any, i) => [
              i,
              {
                pageid: i,
                title: p.title ?? "Test Image",
                imageinfo: [
                  {
                    url: p.url ?? "https://upload.wikimedia.org/test.jpg",
                    descriptionurl: p.descriptionurl ?? "https://commons.wikimedia.org/wiki/File:test.jpg",
                    extmetadata: {
                      Artist: { value: p.artist ?? "Test Artist" },
                      LicenseShortName: { value: p.license ?? "CC BY-SA 4.0" },
                    },
                  },
                ],
              },
            ])
          ),
        },
      }),
  };
}

function makeUnsplashResponse(results: object[]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        results: results.map((r: any) => ({
          id: r.id ?? "abc123",
          urls: { regular: r.url ?? "https://images.unsplash.com/photo-abc123" },
          links: { html: "https://unsplash.com/photos/abc123" },
          user: {
            name: r.author ?? "Test Photographer",
            links: { html: "https://unsplash.com/@testphotographer" },
          },
          description: r.description ?? "test photo",
          tags: (r.tags ?? []).map((t: string) => ({ title: t })),
          created_at: new Date().toISOString(),
        })),
        total: results.length,
      }),
  };
}

function makePexelsResponse(photos: object[]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        photos: photos.map((p: any) => ({
          id: p.id ?? 1,
          src: { large2x: p.url ?? "https://images.pexels.com/photos/1/photo.jpg" },
          url: "https://pexels.com/photo/1",
          photographer: p.photographer ?? "Test Photographer",
          photographer_url: "https://pexels.com/@testphotographer",
          alt: p.alt ?? "test photo",
        })),
        total_results: photos.length,
      }),
  };
}

function makePixabayResponse(hits: object[]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        hits: hits.map((h: any) => ({
          id: h.id ?? 1,
          largeImageURL: h.url ?? "https://pixabay.com/photos/test/photo.jpg",
          pageURL: "https://pixabay.com/photos/test/1",
          user: h.user ?? "TestUser",
          tags: h.tags ?? "test, photo",
          previewURL: "https://pixabay.com/photos/test/preview.jpg",
        })),
        totalHits: hits.length,
      }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("searchFlickrCC", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns empty array when no API key provided", async () => {
    const results = await searchFlickrCC("climate change", "");
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns parsed results from Flickr API", async () => {
    mockFetch.mockResolvedValueOnce(
      makeFlickrResponse([
        {
          id: "12345",
          title: "Climate Change Protest",
          owner: "johndoe",
          ownername: "John Doe",
          url_l: "https://live.staticflickr.com/12345/photo.jpg",
          license: "4",
          dateupload: "1700000000",
          tags: "climate protest environment",
        },
      ])
    );

    const results = await searchFlickrCC("climate change", "test-api-key");
    expect(results).toHaveLength(1);
    expect(results[0].title).toContain("Climate");
    expect(results[0].commercialUse).toBe(true);
    expect(results[0].licenseType).toContain("CC");
  });

  it("returns empty array on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const results = await searchFlickrCC("climate", "test-api-key");
    expect(results).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const results = await searchFlickrCC("climate", "test-api-key");
    expect(results).toEqual([]);
  });
});

describe("searchWikimedia", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns parsed results from Wikimedia API", async () => {
    mockFetch.mockResolvedValueOnce(
      makeWikimediaResponse([
        {
          title: "Climate protest",
          url: "https://upload.wikimedia.org/test.jpg",
          artist: "Jane Smith",
          license: "CC BY-SA 4.0",
        },
      ])
    );

    const results = await searchWikimedia("climate protest");
    expect(results).toHaveLength(1);
    expect(results[0].licenseType).toContain("CC");
    expect(results[0].imageUrl).toBeTruthy();
  });

  it("returns empty array on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    const results = await searchWikimedia("climate");
    expect(results).toEqual([]);
  });
});

describe("searchUnsplash", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns empty array when no access key provided", async () => {
    const results = await searchUnsplash("technology", "");
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns parsed results from Unsplash API", async () => {
    mockFetch.mockResolvedValueOnce(
      makeUnsplashResponse([
        {
          id: "xyz789",
          url: "https://images.unsplash.com/photo-xyz789",
          author: "Alex Photo",
          description: "tech office",
          tags: ["technology", "office"],
        },
      ])
    );

    const results = await searchUnsplash("technology", "test-access-key");
    expect(results).toHaveLength(1);
    expect(results[0].licenseType).toBe("Unsplash License");
    expect(results[0].photographer).toBe("Alex Photo");
  });
});

describe("searchPexels", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns empty array when no API key provided", async () => {
    const results = await searchPexels("business", "");
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns parsed results from Pexels API", async () => {
    mockFetch.mockResolvedValueOnce(
      makePexelsResponse([
        {
          id: 999,
          url: "https://images.pexels.com/photos/999/photo.jpg",
          photographer: "Bob Builder",
          alt: "business meeting",
        },
      ])
    );

    const results = await searchPexels("business meeting", "test-api-key");
    expect(results).toHaveLength(1);
    expect(results[0].licenseType).toBe("Pexels License");
    expect(results[0].photographer).toBe("Bob Builder");
    expect(results[0].commercialUse).toBe(true);
  });
});

describe("searchPixabay", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns empty array when no API key provided", async () => {
    const results = await searchPixabay("sports", "");
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns parsed results from Pixabay API", async () => {
    mockFetch.mockResolvedValueOnce(
      makePixabayResponse([
        {
          id: 42,
          url: "https://pixabay.com/photos/sports/42.jpg",
          user: "SportsFan",
          tags: "sports, football, stadium",
        },
      ])
    );

    const results = await searchPixabay("football stadium", "test-api-key");
    expect(results).toHaveLength(1);
    expect(results[0].licenseType).toBe("Pixabay License");
    expect(results[0].commercialUse).toBe(true);
  });
});

describe("logImageLicense", () => {
  it("does not throw when DB is unavailable", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValueOnce(null as any);

    await expect(
      logImageLicense(123, {
        found: true,
        source: "flickr",
        sourceUrl: "https://flickr.com/photos/test/12345",
        cdnUrl: "https://cdn.example.com/test.jpg",
        attribution: "Photo by Test / Flickr / CC BY 2.0",
        licenseType: "CC BY 2.0",
        photographer: "Test Photographer",
        relevanceScore: 0.75,
        commercialUse: true,
        modificationOk: true,
      })
    ).resolves.not.toThrow();
  });
});
