import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test('/search?q=the returns at least one article link', async ({ page }) => {
    const response = await page.goto('/search?q=the');
    expect(response?.status()).toBe(200);
    // Wait for React to hydrate and render results
    await page.locator('a[href*="/article/"]').first().waitFor({ timeout: 15_000 });
    const count = await page.locator('a[href*="/article/"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('search page loads in under 10 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/search?q=the');
    // Wait for results to appear
    await page.locator('a[href*="/article/"]').first().waitFor({ timeout: 15_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10_000);
  });
});
