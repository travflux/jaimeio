import { describe, it, expect } from 'vitest';
import { validateArticleBody, validateArticleHeadline, validateArticle } from './articleValidation';

describe('Article Validation', () => {
  describe('validateArticleBody', () => {
    it('should detect raw JSON in body', () => {
      const jsonBody = `{ "headline": "Test", "body": "Content here" }`;
      const result = validateArticleBody(jsonBody);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Article body contains raw JSON. Please extract the content before publishing.');
    });

    it('should pass valid HTML content', () => {
      const htmlBody = '<p>This is a valid paragraph.</p><p>Another paragraph here.</p>';
      const result = validateArticleBody(htmlBody);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about short content', () => {
      const shortBody = 'Too short';
      const result = validateArticleBody(shortBody);
      
      expect(result.warnings).toContain('Article body is very short (less than 100 characters). Consider adding more content.');
    });

    it('should error on empty body', () => {
      const result = validateArticleBody('');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Article body is empty');
    });

    it('should warn about escaped characters', () => {
      const bodyWithEscapes = 'This has escaped\\nnewlines and \\"quotes\\".';
      const result = validateArticleBody(bodyWithEscapes);
      
      expect(result.warnings.some(w => w.includes('escaped characters'))).toBe(true);
    });

    it('should warn about missing paragraph tags in long content', () => {
      const longPlainText = 'A'.repeat(300);
      const result = validateArticleBody(longPlainText);
      
      expect(result.warnings.some(w => w.includes('paragraph formatting'))).toBe(true);
    });
  });

  describe('validateArticleHeadline', () => {
    it('should error on empty headline', () => {
      const result = validateArticleHeadline('');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Article headline is empty');
    });

    it('should warn about short headline', () => {
      const result = validateArticleHeadline('Short');
      
      expect(result.warnings).toContain('Headline is very short (less than 10 characters).');
    });

    it('should warn about long headline', () => {
      const longHeadline = 'A'.repeat(250);
      const result = validateArticleHeadline(longHeadline);
      
      expect(result.warnings).toContain('Headline is very long (over 200 characters). Consider shortening for better SEO.');
    });

    it('should detect JSON in headline', () => {
      const jsonHeadline = '{ "headline": "Test" }';
      const result = validateArticleHeadline(jsonHeadline);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Headline contains JSON or malformed content.');
    });

    it('should pass valid headline', () => {
      const result = validateArticleHeadline('This is a valid headline');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateArticle', () => {
    it('should validate complete article', () => {
      const article = {
        headline: 'Valid Headline Here',
        body: '<p>This is a valid article body with enough content to pass validation.</p><p>Multiple paragraphs make it even better.</p>',
        featuredImage: 'https://example.com/image.jpg',
      };
      
      const result = validateArticle(article);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about missing featured image', () => {
      const article = {
        headline: 'Valid Headline',
        body: '<p>Valid body content here.</p>',
        featuredImage: '',
      };
      
      const result = validateArticle(article);
      
      expect(result.warnings).toContain('Article has no featured image. This may affect social media sharing.');
    });

    it('should aggregate errors from headline and body', () => {
      const article = {
        headline: '',
        body: '',
        featuredImage: '',
      };
      
      const result = validateArticle(article);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Article headline is empty');
      expect(result.errors).toContain('Article body is empty');
    });

    it('should detect JSON in article body', () => {
      const article = {
        headline: 'Test Article',
        body: '{ "headline": "Test", "body": "Content" }',
        featuredImage: 'https://example.com/image.jpg',
      };
      
      const result = validateArticle(article);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('raw JSON'))).toBe(true);
    });
  });
});
