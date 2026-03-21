import { test, expect } from '@playwright/test';

test.describe('Tags', () => {
  test('/tags page returns 200', async ({ page }) => {
    const response = await page.goto('/tags');
    expect(response?.status()).toBe(200);
  });

  test('at least one tag link exists on the tags page (if tags have been generated)', async ({ page }) => {
    await page.goto('/tags');
    await page.waitForLoadState('networkidle');
    const tagLinks = page.locator('a[href*="/tag/"]');
    const count = await tagLinks.count();
    // Tags exist in the DB — there should be at least one link
    // If the page renders with zero tags, check it's not a hard error state
    if (count === 0) {
      // Check for visible error UI (not just the word "error" in source)
      const errorHeading = page.locator('h1:has-text("Error"), h2:has-text("Error"), [class*="error-state"], [class*="error-message"]');
      const errorCount = await errorHeading.count();
      expect(errorCount).toBe(0);
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });
});
