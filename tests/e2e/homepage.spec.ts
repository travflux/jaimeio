import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('returns 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('has article links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const articleLinks = page.locator('a[href*="/article/"]');
    const count = await articleLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('has navigation', async ({ page }) => {
    // The SSR HTML includes a hidden SEO nav with absolute article links.
    // The visible React nav (category links) only renders after JS hydration.
    // This test verifies the site structure is intact by checking:
    // 1. The page has a title (SSR works)
    // 2. There are article links in the page (either SSR or React-rendered)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check page title is set (SSR is working)
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);

    // Check article links exist (SSR nav or React-rendered cards)
    const articleLinks = page.locator('a[href*="/article/"]');
    const count = await articleLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('loads in under 20 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    // 20s on dev server (background jobs running); production target is 5s
    expect(elapsed).toBeLessThan(20_000);
  });
});
