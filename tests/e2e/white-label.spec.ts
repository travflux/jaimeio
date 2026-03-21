import { test, expect } from '@playwright/test';

const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
// White-label compliance tests only run on explicitly configured non-Hambry deployments.
// Hambry is the flagship brand — it is allowed to say "Hambry" and "satirical journalism."
// localhost is also skipped because it serves Hambry content during development.
const isHambryOrLocal =
  siteUrl.includes('hambry.com') ||
  siteUrl.includes('hambrynews') ||
  siteUrl.includes('localhost') ||
  siteUrl.includes('127.0.0.1') ||
  siteUrl.includes('manus.computer');

test.describe('White-label compliance', () => {
  test('body text does not contain "hambry" (case-insensitive)', async ({ page }) => {
    test.skip(isHambryOrLocal, 'White-label checks skipped on Hambry/localhost deployments.');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).not.toContain('hambry');
  });

  test('nav text does not contain "satirical"', async ({ page }) => {
    test.skip(isHambryOrLocal, 'White-label checks skipped on Hambry/localhost deployments.');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const navText = await page.locator('nav').innerText();
    expect(navText.toLowerCase()).not.toContain('satirical');
  });

  test('page title does not contain "Hambry"', async ({ page }) => {
    test.skip(isHambryOrLocal, 'White-label checks skipped on Hambry/localhost deployments.');
    await page.goto('/');
    const title = await page.title();
    expect(title.toLowerCase()).not.toContain('hambry');
  });

  test('meta description does not contain "satirical"', async ({ page }) => {
    test.skip(isHambryOrLocal, 'White-label checks skipped on Hambry/localhost deployments.');
    await page.goto('/');
    const metaDesc = page.locator('meta[name="description"]');
    const count = await metaDesc.count();
    if (count > 0) {
      const content = await metaDesc.getAttribute('content') ?? '';
      expect(content.toLowerCase()).not.toContain('satirical');
    }
  });

  test('RSS feed does not contain "Hambry" or "satirical journalism"', async ({ request }) => {
    test.skip(isHambryOrLocal, 'White-label checks skipped on Hambry/localhost deployments.');
    const response = await request.get('/api/rss');
    if (response.status() !== 200) {
      test.skip();
      return;
    }
    const body = await response.text();
    expect(body.toLowerCase()).not.toContain('hambry');
    expect(body.toLowerCase()).not.toContain('satirical journalism');
  });
});
