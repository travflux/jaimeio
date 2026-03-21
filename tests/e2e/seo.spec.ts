import { test, expect } from '@playwright/test';

test.describe('SEO', () => {
  test('homepage has a title tag longer than 5 characters', async ({ request }) => {
    const response = await request.get('/');
    const body = await response.text();
    const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
    expect(match).toBeTruthy();
    expect(match![1].trim().length).toBeGreaterThan(5);
  });

  test('server-rendered article pages have a canonical link tag', async ({ request }) => {
    // Get a slug from RSS
    const rss = await request.get('/api/rss');
    let slug = '';
    if (rss.ok()) {
      const text = await rss.text();
      const match = text.match(/\/api\/article\/([^<"&\s]+)/);
      if (match) slug = match[1];
    }
    test.skip(!slug, 'No article slug found in RSS');

    const response = await request.get(`/api/article/${slug}`);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('rel="canonical"');
    const canonicalMatch = body.match(/rel="canonical"\s+href="([^"]+)"/);
    expect(canonicalMatch).toBeTruthy();
    expect(canonicalMatch![1].length).toBeGreaterThan(5);
  });

  test('non-existent category slug returns 404 or not-found page', async ({ page }) => {
    const response = await page.goto('/category/zzz-does-not-exist-zzz');
    const status = response?.status() ?? 0;
    const content = await page.content();
    const isNotFound = status === 404 || content.toLowerCase().includes('not found') || content.toLowerCase().includes('no articles');
    expect(isNotFound).toBe(true);
  });

  test('sitemap is accessible', async ({ request }) => {
    // Try all known sitemap locations
    const urls = ['/content-sitemap.xml', '/api/sitemap.xml', '/sitemap.xml'];
    let found = false;
    for (const url of urls) {
      const response = await request.get(url);
      if (response.status() === 200) {
        const body = await response.text();
        if (body.includes('<urlset') || body.includes('<sitemapindex')) {
          found = true;
          break;
        }
      }
    }
    expect(found).toBe(true);
  });
});
