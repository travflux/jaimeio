import { test, expect } from '@playwright/test';

test.describe('Images', () => {
  test('featured images return an image content-type (not text/html)', async ({ page, request }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get first article's featured image (look for img elements with http URLs)
    const imgEl = page.locator('img[src^="http"]').first();
    const imgCount = await imgEl.count();
    if (imgCount === 0) {
      test.skip();
      return;
    }

    const src = await imgEl.getAttribute('src');
    if (!src || src.startsWith('data:')) {
      test.skip();
      return;
    }

    const response = await request.get(src);
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/^image\//);
  });

  test('no <img src="/mascot.png"> tags on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const mascotImgs = page.locator('img[src="/mascot.png"]');
    const count = await mascotImgs.count();
    expect(count).toBe(0);
  });

  test('no broken image requests on homepage (img tags where src returns 404)', async ({ page }) => {
    const brokenImages: string[] = [];

    page.on('response', (response) => {
      if (
        response.status() === 404 &&
        response.request().resourceType() === 'image'
      ) {
        brokenImages.push(response.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(brokenImages).toHaveLength(0);
  });
});
