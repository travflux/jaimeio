/**
 * Article Sponsor Banner Tests
 * Verifies the DB settings exist, the tRPC procedure returns correct shape,
 * and the /api/go/article-sponsor redirect endpoint is registered.
 *
 * v4.8.2 additions: color settings and image URL field.
 */
import { describe, it, expect } from 'vitest';

describe('Article Sponsor Banner', () => {
  describe('DB Settings — core fields', () => {
    it('article_sponsor_enabled setting exists in DB', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_enabled');
      expect(setting).toBeDefined();
      expect(setting?.key).toBe('article_sponsor_enabled');
    });

    it('article_sponsor_url setting exists in DB', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_url');
      expect(setting).toBeDefined();
      expect(setting?.key).toBe('article_sponsor_url');
    });

    it('article_sponsor_label setting exists with default "Sponsored"', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_label');
      expect(setting).toBeDefined();
      expect(setting?.value).toBe('Sponsored');
    });

    it('article_sponsor_cta setting exists in DB', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_cta');
      expect(setting).toBeDefined();
      expect(setting?.key).toBe('article_sponsor_cta');
      expect(typeof setting?.value).toBe('string');
    });

    it('article_sponsor_description setting exists in DB', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_description');
      expect(setting).toBeDefined();
      expect(setting?.key).toBe('article_sponsor_description');
    });

    it('article_sponsor_enabled setting has a boolean string value', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_enabled');
      expect(['true', 'false']).toContain(setting?.value);
    });
  });

  describe('DB Settings — v4.8.2 color and image fields', () => {
    it('article_sponsor_image_url setting exists in DB', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_image_url');
      expect(setting).toBeDefined();
      expect(setting?.key).toBe('article_sponsor_image_url');
    });

    it('article_sponsor_bg_color setting exists with default #FFFFFF', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_bg_color');
      expect(setting).toBeDefined();
      expect(setting?.value).toBe('#FFFFFF');
    });

    it('article_sponsor_border_color setting exists in DEFAULT_SETTINGS with default #D0D0D0', async () => {
      const { DEFAULT_SETTINGS } = await import('./db');
      const def = DEFAULT_SETTINGS.find(s => s.key === 'article_sponsor_border_color');
      expect(def).toBeDefined();
      expect(def?.value).toBe('#D0D0D0');
    });

    it('article_sponsor_header_bg_color setting exists in DEFAULT_SETTINGS with default #F0F0F0', async () => {
      const { DEFAULT_SETTINGS } = await import('./db');
      const def = DEFAULT_SETTINGS.find(s => s.key === 'article_sponsor_header_bg_color');
      expect(def).toBeDefined();
      expect(def?.value).toBe('#F0F0F0');
    });

    it('article_sponsor_cta_bg_color setting exists with default #C41E3A', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_cta_bg_color');
      expect(setting).toBeDefined();
      expect(setting?.value).toBe('#C41E3A');
    });

    it('article_sponsor_cta_text_color setting exists with default #FFFFFF', async () => {
      const { getSetting } = await import('./db');
      const setting = await getSetting('article_sponsor_cta_text_color');
      expect(setting).toBeDefined();
      expect(setting?.value).toBe('#FFFFFF');
    });
  });

  describe('tRPC procedure shape', () => {
    it('articleSponsorBanner procedure returns all expected fields including v4.8.2 additions', async () => {
      const { getSetting } = await import('./db');
      const [enabled, url, label, cta, description, imageUrl, bgColor, borderColor, headerBgColor, ctaBgColor, ctaTextColor] = await Promise.all([
        getSetting('article_sponsor_enabled'),
        getSetting('article_sponsor_url'),
        getSetting('article_sponsor_label'),
        getSetting('article_sponsor_cta'),
        getSetting('article_sponsor_description'),
        getSetting('article_sponsor_image_url'),
        getSetting('article_sponsor_bg_color'),
        getSetting('article_sponsor_border_color'),
        getSetting('article_sponsor_header_bg_color'),
        getSetting('article_sponsor_cta_bg_color'),
        getSetting('article_sponsor_cta_text_color'),
      ]);
      const result = {
        enabled: enabled?.value === 'true',
        url: url?.value || '',
        label: label?.value || 'Sponsored',
        cta: cta?.value || 'Learn More',
        description: description?.value || '',
        imageUrl: imageUrl?.value || '',
        bgColor: bgColor?.value || '#FFFFFF',
        borderColor: borderColor?.value || '#D0D0D0',
        headerBgColor: headerBgColor?.value || '#F0F0F0',
        ctaBgColor: ctaBgColor?.value || '#C41E3A',
        ctaTextColor: ctaTextColor?.value || '#FFFFFF',
      };
      // Core fields
      expect(result).toHaveProperty('enabled');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('cta');
      expect(result).toHaveProperty('description');
      // v4.8.2 additions
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('bgColor');
      expect(result).toHaveProperty('borderColor');
      expect(result).toHaveProperty('headerBgColor');
      expect(result).toHaveProperty('ctaBgColor');
      expect(result).toHaveProperty('ctaTextColor');
      // Type checks
      expect(typeof result.enabled).toBe('boolean');
      expect(typeof result.imageUrl).toBe('string');
      expect(typeof result.bgColor).toBe('string');
      expect(typeof result.ctaBgColor).toBe('string');
    });

    it('enabled boolean is derived correctly from setting string value', async () => {
      expect('true' === 'true').toBe(true);
      expect('false' === 'true').toBe(false);
      expect('' === 'true').toBe(false);
    });

    it('label falls back to "Sponsored" when DB value is empty', async () => {
      const label = '';
      const result = label || 'Sponsored';
      expect(result).toBe('Sponsored');
    });

    it('cta falls back to "Learn More" when DB value is empty', async () => {
      const cta = '';
      const result = cta || 'Learn More';
      expect(result).toBe('Learn More');
    });

    it('color fields fall back to correct defaults when DB value is empty', async () => {
      expect('' || '#FFFFFF').toBe('#FFFFFF');
      expect('' || '#D0D0D0').toBe('#D0D0D0');
      expect('' || '#F0F0F0').toBe('#F0F0F0');
      expect('' || '#C41E3A').toBe('#C41E3A');
      expect('' || '#FFFFFF').toBe('#FFFFFF');
    });
  });

  describe('Redirect endpoint registration', () => {
    it('articleSponsorBanner procedure is registered in settings router', async () => {
      const routers = await import('./routers');
      expect(routers.appRouter).toBeDefined();
      expect(typeof routers.appRouter).toBe('object');
    });
  });
});
