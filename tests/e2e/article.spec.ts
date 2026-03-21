import { test, expect } from '@playwright/test';

test.describe('Article page', () => {
  let articleSlug: string;

  test.beforeAll(async ({ request }) => {
    // Get articles via the API to find a valid slug
    const response = await request.get('/api/trpc/articles.list?input=%7B%22limit%22%3A5%7D');
    if (response.ok()) {
      const data = await response.json();
      const articles = data?.result?.data?.json?.articles ?? data?.result?.data?.articles ?? [];
      if (articles.length > 0) {
        articleSlug = articles[0].slug;
      }
    }
    // Fallback: try to get slug from RSS feed
    if (!articleSlug) {
      const rss = await request.get('/api/rss');
      if (rss.ok()) {
        const text = await rss.text();
        const match = text.match(/\/api\/article\/([^<"]+)/);
        if (match) articleSlug = match[1];
      }
    }
  });

  test('article page loads with 200 via server-rendered route', async ({ request }) => {
    test.skip(!articleSlug, 'No article slug found');
    const response = await request.get(`/api/article/${articleSlug}`);
    expect(response.status()).toBe(200);
  });

  test('server-rendered article has exactly one h1', async ({ request }) => {
    test.skip(!articleSlug, 'No article slug found');
    const response = await request.get(`/api/article/${articleSlug}`);
    const body = await response.text();
    const h1Matches = body.match(/<h1[^>]*>/gi) ?? [];
    expect(h1Matches.length).toBe(1);
  });

  test('server-rendered article has og:image meta tag', async ({ request }) => {
    test.skip(!articleSlug, 'No article slug found');
    const response = await request.get(`/api/article/${articleSlug}`);
    const body = await response.text();
    expect(body).toContain('property="og:image"');
    const match = body.match(/property="og:image"\s+content="([^"]+)"/);
    expect(match).toBeTruthy();
    expect(match![1].length).toBeGreaterThan(5);
  });

  test('og:image does NOT contain /mascot.png', async ({ request }) => {
    test.skip(!articleSlug, 'No article slug found');
    const response = await request.get(`/api/article/${articleSlug}`);
    const body = await response.text();
    const match = body.match(/property="og:image"\s+content="([^"]+)"/);
    if (match) {
      expect(match[1]).not.toContain('/mascot.png');
    }
  });
});
