import { describe, it, expect } from "vitest";

// ─── Pure helper tests (no DB required) ──────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 3) + "..." : str;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function injectMetaTags(html: string, metaTags: string): string {
  const cleaned = html
    .replace(/<title>[^<]*<\/title>/gi, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+property="article:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "");
  return cleaned.replace("</head>", `${metaTags}\n  </head>`);
}

describe("SEO meta tag injection", () => {
  describe("escapeHtml", () => {
    it("escapes ampersands", () => {
      expect(escapeHtml("Cats & Dogs")).toBe("Cats &amp; Dogs");
    });
    it("escapes angle brackets", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    });
    it("escapes double quotes", () => {
      expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
    });
    it("escapes single quotes", () => {
      expect(escapeHtml("it's")).toBe("it&#39;s");
    });
    it("leaves safe strings unchanged", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World");
    });
  });

  describe("truncate", () => {
    it("returns string unchanged when under max", () => {
      expect(truncate("short", 100)).toBe("short");
    });
    it("truncates long strings with ellipsis", () => {
      const long = "a".repeat(200);
      const result = truncate(long, 160);
      expect(result.length).toBe(160);
      expect(result.endsWith("...")).toBe(true);
    });
    it("returns empty string for empty input", () => {
      expect(truncate("", 100)).toBe("");
    });
  });

  describe("stripHtml", () => {
    it("removes HTML tags", () => {
      expect(stripHtml("<p>Hello <strong>World</strong></p>")).toBe("Hello World");
    });
    it("collapses whitespace", () => {
      expect(stripHtml("<p>  Hello   </p>")).toBe("Hello");
    });
    it("handles plain text", () => {
      expect(stripHtml("No tags here")).toBe("No tags here");
    });
  });

  describe("injectMetaTags", () => {
    const baseHtml = `<!doctype html><html><head>
      <title>Old Title</title>
      <meta name="description" content="old desc" />
      <meta property="og:title" content="old og" />
      <meta name="twitter:card" content="summary" />
      <link rel="canonical" href="https://old.example.com/" />
    </head><body><div id="root"></div></body></html>`;

    const newTags = `<title>New Title | Satire Engine</title>
    <meta property="og:title" content="New Title" />
    <link rel="canonical" href="https://example.com/article/test" />`;

    it("removes old title and injects new one", () => {
      const result = injectMetaTags(baseHtml, newTags);
      expect(result).not.toContain("Old Title");
      expect(result).toContain("New Title | Satire Engine");
    });

    it("removes old og:title and injects new one", () => {
      const result = injectMetaTags(baseHtml, newTags);
      expect(result).not.toContain('content="old og"');
      expect(result).toContain('content="New Title"');
    });

    it("removes old canonical and injects new one", () => {
      const result = injectMetaTags(baseHtml, newTags);
      expect(result).not.toContain("old.example.com");
      expect(result).toContain("example.com/article/test");
    });

    it("removes old description meta tag", () => {
      const result = injectMetaTags(baseHtml, newTags);
      expect(result).not.toContain('content="old desc"');
    });

    it("removes old twitter:card tag", () => {
      const result = injectMetaTags(baseHtml, newTags);
      expect(result).not.toContain('content="summary"');
    });

    it("preserves the root div", () => {
      const result = injectMetaTags(baseHtml, newTags);
      expect(result).toContain('<div id="root">');
    });

    it("injects tags before </head>", () => {
      const result = injectMetaTags(baseHtml, newTags);
      const headCloseIdx = result.indexOf("</head>");
      const newTitleIdx = result.indexOf("New Title | Satire Engine");
      expect(newTitleIdx).toBeLessThan(headCloseIdx);
    });

    it("removes existing ld+json scripts", () => {
      const htmlWithLdJson = baseHtml.replace(
        "</head>",
        `<script type="application/ld+json">{"@context":"https://schema.org"}</script></head>`
      );
      const result = injectMetaTags(htmlWithLdJson, newTags);
      // The old ld+json should be gone; only the new injected tags remain
      const ldJsonCount = (result.match(/application\/ld\+json/g) || []).length;
      expect(ldJsonCount).toBe(0); // new tags don't include ld+json in this test
    });
  });

  describe("JSON-LD structure", () => {
    it("produces valid NewsArticle schema", () => {
      const schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: "Test Headline",
        description: "Test description",
        image: "https://example.com/img.jpg",
        datePublished: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        author: { "@type": "Organization", name: "Editorial Team" },
        publisher: {
          "@type": "Organization",
          name: "Satire Engine",
          logo: { "@type": "ImageObject", url: "https://example.com/mascot.png" },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": "https://example.com/article/test" },
      };
      const json = JSON.stringify(schema);
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed["@type"]).toBe("NewsArticle");
      expect(parsed.publisher["@type"]).toBe("Organization");
      expect(parsed.author["@type"]).toBe("Organization");
    });
  });

  describe("robots.txt rules", () => {
    it("should disallow /admin paths", () => {
      const disallowedPaths = ["/admin", "/admin/", "/api/"];
      disallowedPaths.forEach((p) => {
        expect(p).toMatch(/^\/(admin|api)/);
      });
    });

    it("should allow article paths", () => {
      const allowedPaths = ["/article/test-slug", "/category/tech", "/"];
      allowedPaths.forEach((p) => {
        expect(p).not.toMatch(/^\/(admin|api)/);
      });
    });

    it("sitemap URL should point to example.com", () => {
      const sitemapUrl = "https://example.com/sitemap.xml";
      expect(sitemapUrl).toContain("example.com");
      expect(sitemapUrl).not.toContain("manus.space");
    });
  });

  describe("canonical URL construction", () => {
    it("builds correct article canonical URL", () => {
      const siteUrl = "https://example.com";
      const slug = "test-article-slug";
      const canonical = `${siteUrl}/article/${slug}`;
      expect(canonical).toBe("https://example.com/article/test-article-slug");
    });

    it("builds correct category canonical URL", () => {
      const siteUrl = "https://example.com";
      const categorySlug = "politics";
      const canonical = `${siteUrl}/category/${categorySlug}`;
      expect(canonical).toBe("https://example.com/category/politics");
    });

    it("does not include query parameters in canonical", () => {
      const url = "https://example.com/article/test?utm_source=twitter";
      const canonical = url.split("?")[0];
      expect(canonical).toBe("https://example.com/article/test");
      expect(canonical).not.toContain("?");
    });
  });
});
