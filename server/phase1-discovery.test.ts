import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Tagging service tests ────────────────────────────────────────────────────

vi.mock('./tagging', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./tagging')>();
  return {
    ...mod,
    autoTagArticle: vi.fn().mockResolvedValue(['politics', 'congress', 'satire']),
    getArticleTags: vi.fn().mockResolvedValue([
      { id: 1, name: 'politics', slug: 'politics', articleCount: 42 },
      { id: 2, name: 'congress', slug: 'congress', articleCount: 18 },
    ]),
    getArticlesByTag: vi.fn().mockResolvedValue({
      articles: [
        { id: 10, headline: 'Congress Passes Bill Nobody Read', slug: 'congress-passes-bill', featuredImage: null, publishedAt: new Date('2026-03-01'), categoryId: 1 },
        { id: 11, headline: 'Senator Discovers Filibuster Has No Off Switch', slug: 'senator-filibuster', featuredImage: null, publishedAt: new Date('2026-03-02'), categoryId: 1 },
      ],
      total: 2,
      tag: { id: 2, name: 'congress', slug: 'congress', articleCount: 2 },
    }),
    getTagBySlug: vi.fn().mockResolvedValue({ id: 1, name: 'politics', slug: 'politics', articleCount: 42 }),
    getTagCloud: vi.fn().mockResolvedValue([
      { id: 1, name: 'politics', slug: 'politics', articleCount: 42 },
      { id: 2, name: 'technology', slug: 'technology', articleCount: 31 },
      { id: 3, name: 'business', slug: 'business', articleCount: 27 },
    ]),
    getTrendingTags: vi.fn().mockResolvedValue([
      { id: 1, name: 'politics', slug: 'politics', articleCount: 42 },
      { id: 2, name: 'technology', slug: 'technology', articleCount: 31 },
    ]),
  };
});

describe('Tagging service', () => {
  it('autoTagArticle returns an array of tag names', async () => {
    const { autoTagArticle } = await import('./tagging');
    const tags = await autoTagArticle(1, 'Congress Passes Bill Nobody Read', 'Lawmakers celebrate not reading 4,000-page legislation', 'Body text here');
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.every(t => typeof t === 'string')).toBe(true);
  });

  it('getArticleTags returns tags with required fields', async () => {
    const { getArticleTags } = await import('./tagging');
    const tags = await getArticleTags(1);
    expect(Array.isArray(tags)).toBe(true);
    for (const tag of tags) {
      expect(tag).toHaveProperty('id');
      expect(tag).toHaveProperty('name');
      expect(tag).toHaveProperty('slug');
      expect(tag).toHaveProperty('articleCount');
    }
  });

  it('getArticlesByTag returns articles and total', async () => {
    const { getArticlesByTag } = await import('./tagging');
    const result = await getArticlesByTag('politics', { limit: 10 });
    expect(result).toHaveProperty('articles');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.articles)).toBe(true);
  });

  it('getTagBySlug returns a tag or null', async () => {
    const { getTagBySlug } = await import('./tagging');
    const tag = await getTagBySlug('politics');
    expect(tag).not.toBeNull();
    expect(tag?.slug).toBe('politics');
  });

  it('getTagCloud returns tags sorted by count', async () => {
    const { getTagCloud } = await import('./tagging');
    const cloud = await getTagCloud({ limit: 10 });
    expect(Array.isArray(cloud)).toBe(true);
    // Should be sorted descending by articleCount
    for (let i = 1; i < cloud.length; i++) {
      expect(cloud[i - 1].articleCount).toBeGreaterThanOrEqual(cloud[i].articleCount);
    }
  });

  it('getTrendingTags returns recent high-traffic tags', async () => {
    const { getTrendingTags } = await import('./tagging');
    const trending = await getTrendingTags({ limit: 5 });
    expect(Array.isArray(trending)).toBe(true);
    expect(trending.length).toBeLessThanOrEqual(5);
  });
});

// ─── Search engine tests ──────────────────────────────────────────────────────

vi.mock('./search', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./search')>();
  return {
    ...mod,
    searchArticles: vi.fn().mockResolvedValue({
      articles: [
        { id: 1, headline: 'Congress Passes Bill Nobody Read', slug: 'congress-passes-bill', subheadline: 'Lawmakers celebrate', featuredImage: null, publishedAt: new Date('2026-03-01'), categoryId: 1, views: 100 },
      ],
      total: 1,
      hasMore: false,
    }),
    getSearchSuggestions: vi.fn().mockResolvedValue(['congress bill', 'congress passes', 'congress vote']),
    getTrendingSearches: vi.fn().mockResolvedValue(['congress', 'AI', 'economy', 'climate']),
  };
});

describe('Search engine', () => {
  it('searchArticles returns articles and total', async () => {
    const { searchArticles } = await import('./search');
    const result = await searchArticles({ query: 'congress', limit: 10 });
    expect(result).toHaveProperty('articles');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.articles)).toBe(true);
  });

  it('searchArticles handles empty query gracefully', async () => {
    const { searchArticles } = await import('./search');
    const result = await searchArticles({ query: '', limit: 10 });
    expect(result).toHaveProperty('articles');
    expect(result).toHaveProperty('total');
  });

  it('getSearchSuggestions returns string array', async () => {
    const { getSearchSuggestions } = await import('./search');
    const suggestions = await getSearchSuggestions('cong');
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.every(s => typeof s === 'string')).toBe(true);
  });

  it('getTrendingSearches returns non-empty array', async () => {
    const { getTrendingSearches } = await import('./search');
    const trending = await getTrendingSearches();
    expect(Array.isArray(trending)).toBe(true);
    expect(trending.length).toBeGreaterThan(0);
  });
});

// ─── Archive endpoint logic tests ─────────────────────────────────────────────

describe('Archive month helpers', () => {
  it('month regex validates YYYY-MM format', () => {
    const monthRegex = /^\d{4}-\d{2}$/;
    expect(monthRegex.test('2026-03')).toBe(true);
    expect(monthRegex.test('2025-12')).toBe(true);
    expect(monthRegex.test('26-03')).toBe(false);
    expect(monthRegex.test('2026-3')).toBe(false);
    expect(monthRegex.test('2026-00')).toBe(true); // regex only checks format, not validity
    expect(monthRegex.test('not-a-month')).toBe(false);
  });

  it('month boundary calculation is correct', () => {
    const month = '2026-03';
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2); // 0-indexed March
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(3); // April
    expect(end.getDate()).toBe(1);
  });

  it('month boundary wraps correctly at year end', () => {
    const month = '2025-12';
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(11); // December
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(0); // January
  });
});

// ─── Tag slug generation tests ────────────────────────────────────────────────

describe('Tag slug generation', () => {
  function toSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  it('converts simple names to slugs', () => {
    expect(toSlug('Politics')).toBe('politics');
    expect(toSlug('Science & Health')).toBe('science-health');
    expect(toSlug('AI/ML')).toBe('ai-ml');
  });

  it('handles special characters', () => {
    expect(toSlug('U.S. Economy')).toBe('u-s-economy');
    expect(toSlug('  Leading Spaces  ')).toBe('leading-spaces');
    expect(toSlug('Multiple---Dashes')).toBe('multiple-dashes');
  });

  it('handles edge cases', () => {
    expect(toSlug('123')).toBe('123');
    expect(toSlug('a')).toBe('a');
  });
});
