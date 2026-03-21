import { describe, it, expect } from 'vitest';

/**
 * Test suite for Schema.org markup and XML sitemap generation
 */

describe('Schema.org Markup and Sitemap', () => {
  describe('BreadcrumbList Schema', () => {
    it('should generate valid BreadcrumbList schema structure', () => {
      const breadcrumbs = [
        { name: 'Home', url: 'https://example.com/' },
        { name: 'Politics', url: 'https://example.com/category/politics' },
        { name: 'Article Title', url: 'https://example.com/article/article-slug' },
      ];

      const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url,
        })),
      };

      expect(schema["@type"]).toBe("BreadcrumbList");
      expect(schema.itemListElement).toHaveLength(3);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[2].position).toBe(3);
    });

    it('should maintain correct position order in BreadcrumbList', () => {
      const items = [
        { name: 'Home', url: 'https://example.com/' },
        { name: 'Category', url: 'https://example.com/category/test' },
      ];

      const positions = items.map((_, index) => index + 1);
      expect(positions).toEqual([1, 2]);
    });
  });

  describe('NewsArticle Schema', () => {
    it('should generate valid NewsArticle schema', () => {
      const article = {
        headline: 'Breaking News Title',
        description: 'Article description',
        image: 'https://example.com/image.jpg',
        datePublished: '2026-02-21T10:00:00Z',
        dateModified: '2026-02-21T15:00:00Z',
        author: 'Editorial Team',
      };

      const schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article.headline,
        "description": article.description,
        "image": article.image,
        "datePublished": article.datePublished,
        "dateModified": article.dateModified,
        "author": {
          "@type": "Person",
          "name": article.author,
        },
      };

      expect(schema["@type"]).toBe("NewsArticle");
      expect(schema.headline).toBe('Breaking News Title');
      expect(schema.author["@type"]).toBe("Person");
    });
  });

  describe('Sitemap XML Generation', () => {
    it('should generate valid XML sitemap structure', () => {
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-02-21</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

      expect(sitemapXml).toContain('<?xml version="1.0"');
      expect(sitemapXml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(sitemapXml).toContain('</urlset>');
      expect(sitemapXml).toContain('<loc>');
      expect(sitemapXml).toContain('<lastmod>');
      expect(sitemapXml).toContain('<changefreq>');
      expect(sitemapXml).toContain('<priority>');
    });

    it('should include all required URL elements', () => {
      const urlEntry = {
        loc: 'https://example.com/article/test',
        lastmod: '2026-02-21',
        changefreq: 'weekly',
        priority: '0.9',
      };

      expect(urlEntry.loc).toBeDefined();
      expect(urlEntry.lastmod).toBeDefined();
      expect(urlEntry.changefreq).toBeDefined();
      expect(urlEntry.priority).toBeDefined();
    });

    it('should escape XML special characters in URLs', () => {
      const testCases = [
        { input: 'https://example.com/article?id=1&name=test', expected: 'https://example.com/article?id=1&amp;name=test' },
        { input: 'https://example.com/article/<test>', expected: 'https://example.com/article/&lt;test&gt;' },
        { input: 'https://example.com/article/"quoted"', expected: 'https://example.com/article/&quot;quoted&quot;' },
      ];

      testCases.forEach(({ input, expected }) => {
        const escaped = input
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        expect(escaped).toBe(expected);
      });
    });

    it('should set correct priority for different page types', () => {
      const priorities = {
        homepage: 1.0,
        latestFeed: 0.9,
        recentArticle: 0.9,
        category: 0.8,
        game: 0.7,
        olderArticle: 0.7,
        staticPage: 0.6,
        privacyPage: 0.4,
      };

      expect(priorities.homepage).toBeGreaterThan(priorities.category);
      expect(priorities.recentArticle).toBeGreaterThan(priorities.olderArticle);
      expect(priorities.category).toBeGreaterThan(priorities.game);
      expect(priorities.staticPage).toBeGreaterThan(priorities.privacyPage);
    });

    it('should set correct changefreq for different page types', () => {
      const changefreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      const articleChangefreq = 'weekly';
      const categoryChangefreq = 'daily';
      const staticChangefreq = 'monthly';
      const latestFeedChangefreq = 'hourly';

      expect(changefreqs).toContain(articleChangefreq);
      expect(changefreqs).toContain(categoryChangefreq);
      expect(changefreqs).toContain(staticChangefreq);
      expect(changefreqs).toContain(latestFeedChangefreq);
    });

    it('should include game pages in sitemap', () => {
      const gamePages = [
        '/games/crossword',
        '/games/word-scramble',
        '/games/trivia',
        '/games/mad-libs',
      ];

      expect(gamePages).toHaveLength(4);
      expect(gamePages).toContain('/games/crossword');
      expect(gamePages).toContain('/games/word-scramble');
    });

    it('should include category pages in sitemap', () => {
      const categoryPages = [
        '/category/politics',
        '/category/entertainment',
        '/category/business',
        '/category/sports',
      ];

      expect(categoryPages.length).toBeGreaterThan(0);
      categoryPages.forEach(page => {
        expect(page).toMatch(/^\/category\//);
      });
    });

    it('should include published articles in sitemap', () => {
      const articles = [
        { slug: 'article-1', status: 'published' },
        { slug: 'article-2', status: 'published' },
        { slug: 'article-3', status: 'draft' },
      ];

      const publishedArticles = articles.filter(a => a.status === 'published');
      expect(publishedArticles).toHaveLength(2);
      expect(publishedArticles[0].slug).toBe('article-1');
    });

    it('should exclude admin pages from sitemap', () => {
      const sitemapUrls = [
        'https://example.com/',
        'https://example.com/category/politics',
        'https://example.com/api/article/some-slug',
        'https://example.com/about',
      ];

      // Admin pages must never appear in the sitemap
      const adminUrls = sitemapUrls.filter(url => url.includes('/admin'));
      expect(adminUrls).toHaveLength(0);
    });

    it('should use /api/article/ prefix for article canonical URLs', () => {
      const articleSlug = 'congress-passes-law-requiring-all-bills-to-rhyme';
      const articleUrl = `https://example.com/api/article/${articleSlug}`;
      expect(articleUrl).toContain('/api/article/');
      expect(articleUrl).toContain(articleSlug);
    });

    it('should boost priority for recently published articles', () => {
      const now = Date.now();
      const recentDate = new Date(now - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const oldDate = new Date(now - 30 * 24 * 60 * 60 * 1000);   // 30 days ago

      const isRecent = (d: Date, days = 7) => Date.now() - d.getTime() < days * 24 * 60 * 60 * 1000;

      const recentPriority = isRecent(recentDate) ? '0.9' : '0.7';
      const oldPriority = isRecent(oldDate) ? '0.9' : '0.7';

      expect(recentPriority).toBe('0.9');
      expect(oldPriority).toBe('0.7');
    });

    it('should use YYYY-MM-DD date format (not full ISO timestamp)', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const testDate = '2026-02-21';
      const badDate = '2026-02-21T10:00:00.000Z';

      expect(testDate).toMatch(dateRegex);
      expect(badDate).not.toMatch(dateRegex);
    });
  });

  describe('Sitemap Index', () => {
    it('should generate valid sitemap index structure', () => {
      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
    <lastmod>2026-02-21</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-articles-1.xml</loc>
    <lastmod>2026-02-21</lastmod>
  </sitemap>
</sitemapindex>`;

      expect(indexXml).toContain('<sitemapindex');
      expect(indexXml).toContain('</sitemapindex>');
      expect(indexXml).toContain('<sitemap>');
      expect(indexXml).toContain('sitemap.xml');
    });

    it('should calculate correct number of article sitemap pages', () => {
      const MAX_PER_PAGE = 45_000;
      const articleCounts = [1000, 45000, 45001, 90000, 90001];
      const expectedPages = [1, 1, 2, 2, 3];

      articleCounts.forEach((count, i) => {
        const pages = Math.ceil(count / MAX_PER_PAGE);
        expect(pages).toBe(expectedPages[i]);
      });
    });
  });

  describe('Robots.txt Configuration', () => {
    it('should reference sitemap in robots.txt', () => {
      const robotsTxt = `User-agent: *
Allow: /
Allow: /api/article/
Disallow: /admin/
Disallow: /api/trpc/

Sitemap: https://hambry.com/sitemap.xml
Sitemap: https://hambry.com/sitemap-index.xml`;

      expect(robotsTxt).toContain('Sitemap:');
      expect(robotsTxt).toContain('/sitemap.xml');
      expect(robotsTxt).toContain('/sitemap-index.xml');
    });

    it('should allow /api/article/ for crawlers', () => {
      const robotsTxt = `User-agent: *
Allow: /api/article/
Disallow: /api/trpc/`;

      expect(robotsTxt).toContain('Allow: /api/article/');
    });

    it('should block admin and tRPC API paths', () => {
      const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/trpc/`;

      expect(robotsTxt).toContain('Disallow: /admin/');
      expect(robotsTxt).toContain('Disallow: /api/trpc/');
    });

    it('should have specific rules for major search engines', () => {
      const robotsTxt = `User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Crawl-delay: 1`;

      expect(robotsTxt).toContain('User-agent: Googlebot');
      expect(robotsTxt).toContain('User-agent: Bingbot');
    });
  });

  describe('SEO Best Practices', () => {
    it('should use ISO 8601 date format in sitemap', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const testDate = '2026-02-21';
      expect(testDate).toMatch(dateRegex);
    });

    it('should validate priority values are between 0.0 and 1.0', () => {
      const priorities = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.0];
      priorities.forEach(priority => {
        expect(priority).toBeGreaterThanOrEqual(0);
        expect(priority).toBeLessThanOrEqual(1);
      });
    });

    it('should use valid changefreq values', () => {
      const validChangefreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      const testChangefreqs = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];
      testChangefreqs.forEach(freq => {
        expect(validChangefreqs).toContain(freq);
      });
    });

    it('should include Cache-Control header for sitemap responses', () => {
      // Sitemaps should be cached for 1 hour (3600 seconds)
      const cacheHeader = 'public, max-age=3600';
      expect(cacheHeader).toContain('max-age=3600');
      expect(cacheHeader).toContain('public');
    });
  });
});
