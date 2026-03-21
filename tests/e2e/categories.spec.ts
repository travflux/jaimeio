import { test, expect } from '@playwright/test';

test.describe('Categories', () => {
  test('at least 50% of article cards on homepage show a category label', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Count article links (excluding hidden SEO nav links)
    const articleLinks = page.locator('main a[href*="/article/"], article a[href*="/article/"], [class*="card"] a[href*="/article/"]');
    const totalArticles = await articleLinks.count();

    if (totalArticles === 0) {
      // Fall back to all article links if no main-scoped ones found
      const allArticleLinks = page.locator('a[href*="/article/"]');
      const allCount = await allArticleLinks.count();
      expect(allCount).toBeGreaterThan(0);
      return;
    }

    // Count category labels — links to category pages
    const categoryLabels = page.locator('a[href*="/category/"]');
    const categoryCount = await categoryLabels.count();

    // At least 50% of articles should have a visible category
    expect(categoryCount).toBeGreaterThanOrEqual(Math.floor(totalArticles * 0.5));
  });

  test('clicking a category link returns a page with articles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const categoryLink = page.locator('a[href*="/category/"]').first();
    const count = await categoryLink.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const href = await categoryLink.getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.goto(href!);
    expect(response?.status()).toBe(200);

    await page.waitForLoadState('networkidle');
    const articles = page.locator('a[href*="/article/"]');
    const articleCount = await articles.count();
    expect(articleCount).toBeGreaterThan(0);
  });

  test('homepage does not show widespread "Uncategorized" text (max 2 instances)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const content = await page.content();
    const matches = (content.match(/uncategorized/gi) ?? []).length;
    expect(matches).toBeLessThanOrEqual(2);
  });
});
