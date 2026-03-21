import { test, expect } from '@playwright/test';

test.describe('RSS Feed', () => {
  test('/api/rss returns XML containing <rss, <channel>, and at least one <item>', async ({ request }) => {
    const response = await request.get('/api/rss');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('<rss');
    expect(body).toContain('<channel>');
    expect(body).toContain('<item>');
  });
});
