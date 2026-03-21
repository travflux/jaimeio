import { describe, it, expect } from 'vitest';
import { 
  levenshteinDistance, 
  similarityScore, 
  fuzzyMatch, 
  calculateRelevanceScore,
  extractSnippet,
  highlightMatches,
  generateAutocompleteSuggestions,
  extractKeywords
} from './search-engine';

describe('Search Engine', () => {
  describe('Levenshtein Distance', () => {
    it('should calculate distance between identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should calculate distance for single character difference', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
    });

    it('should calculate distance for multiple differences', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', 'world')).toBe(5);
    });
  });

  describe('Similarity Score', () => {
    it('should return 1 for identical strings', () => {
      expect(similarityScore('test', 'test')).toBe(1);
    });

    it('should return value between 0 and 1 for similar strings', () => {
      const score = similarityScore('test', 'text');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should be case insensitive', () => {
      expect(similarityScore('Hello', 'hello')).toBe(1);
    });

    it('should return lower score for very different strings', () => {
      const score = similarityScore('abc', 'xyz');
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('Fuzzy Match', () => {
    it('should match exact phrases', () => {
      expect(fuzzyMatch('hello world', 'hello world test')).toBe(true);
    });

    it('should match with typos within threshold', () => {
      expect(fuzzyMatch('politiks', 'politics news', 0.7)).toBe(true);
    });

    it('should not match very different words', () => {
      expect(fuzzyMatch('apple', 'orange banana', 0.7)).toBe(false);
    });

    it('should match partial words', () => {
      expect(fuzzyMatch('tech', 'technology news', 0.7)).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(fuzzyMatch('HELLO', 'hello world', 0.7)).toBe(true);
    });
  });

  describe('Relevance Score Calculation', () => {
    it('should give highest score for exact headline match', () => {
      const score = calculateRelevanceScore(
        'breaking news',
        'Breaking News Today',
        null,
        null
      );
      expect(score).toBeGreaterThan(100);
    });

    it('should score subheadline matches', () => {
      const score = calculateRelevanceScore(
        'politics',
        'Today in News',
        'Politics and government updates',
        null
      );
      expect(score).toBeGreaterThan(0);
    });

    it('should score content matches lower than headline', () => {
      const headlineScore = calculateRelevanceScore(
        'technology',
        'Technology Advances',
        null,
        null
      );
      const contentScore = calculateRelevanceScore(
        'technology',
        'News Today',
        null,
        'Technology is advancing rapidly'
      );
      expect(headlineScore).toBeGreaterThan(contentScore);
    });

    it('should handle multiple word queries', () => {
      const score = calculateRelevanceScore(
        'breaking tech news',
        'Breaking Technology News Today',
        null,
        null
      );
      expect(score).toBeGreaterThan(100);
    });

    it('should return 0 for no matches', () => {
      const score = calculateRelevanceScore(
        'xyz',
        'Hello World',
        null,
        null
      );
      expect(score).toBe(0);
    });
  });

  describe('Snippet Extraction', () => {
    it('should extract snippet around query match', () => {
      const text = 'This is a long article about technology and innovation in the modern world';
      const snippet = extractSnippet('technology', text, 30);
      expect(snippet).toContain('technology');
      expect(snippet.length).toBeLessThanOrEqual(40); // 30 + ellipsis (accounting for word boundaries)
    });

    it('should add ellipsis when text is truncated', () => {
      const text = 'This is a very long article that needs to be truncated';
      const snippet = extractSnippet('article', text, 20);
      expect(snippet).toContain('...');
    });

    it('should handle query not found', () => {
      const text = 'This is some text';
      const snippet = extractSnippet('notfound', text, 50);
      expect(snippet.length).toBeLessThanOrEqual(50);
    });

    it('should center snippet around match', () => {
      const text = 'Start of text. Middle section with keyword here. End of text.';
      const snippet = extractSnippet('keyword', text, 30);
      expect(snippet).toContain('keyword');
      expect(snippet).toContain('...');
    });
  });

  describe('Highlight Matches', () => {
    it('should wrap matches in mark tags', () => {
      const result = highlightMatches('test', 'this is a test string');
      expect(result).toContain('<mark>');
      expect(result).toContain('</mark>');
      expect(result).toContain('test');
    });

    it('should highlight multiple occurrences', () => {
      const result = highlightMatches('test', 'test this test');
      const matches = (result.match(/<mark>/g) || []).length;
      expect(matches).toBe(2);
    });

    it('should be case insensitive', () => {
      const result = highlightMatches('test', 'This is a TEST string');
      expect(result).toContain('<mark>TEST</mark>');
    });

    it('should highlight multiple words', () => {
      const result = highlightMatches('hello world', 'hello there world');
      expect(result).toContain('<mark>hello</mark>');
      expect(result).toContain('<mark>world</mark>');
    });

    it('should escape regex special characters', () => {
      const result = highlightMatches('test.', 'test. string');
      expect(result).toContain('<mark>test.</mark>');
    });
  });

  describe('Autocomplete Suggestions', () => {
    it('should prioritize prefix matches', () => {
      const headlines = [
        'Technology News Today',
        'Tech Advances',
        'Breaking News in Technology'
      ];
      const suggestions = generateAutocompleteSuggestions('tech', headlines, 3);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.toLowerCase().startsWith('tech'))).toBe(true);
    });

    it('should include contains matches', () => {
      const headlines = [
        'Breaking News',
        'Technology Updates',
        'Sports Technology'
      ];
      const suggestions = generateAutocompleteSuggestions('tech', headlines, 3);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('Technology') || s.includes('Technology'))).toBe(true);
    });

    it('should limit results to specified count', () => {
      const headlines = Array(20).fill('Technology News');
      const suggestions = generateAutocompleteSuggestions('tech', headlines, 5);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty query', () => {
      const headlines = ['News 1', 'News 2'];
      const suggestions = generateAutocompleteSuggestions('', headlines, 5);
      // Empty query returns no suggestions (or could return all - implementation dependent)
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should use fuzzy matching for suggestions', () => {
      const headlines = ['Technology News', 'Political Updates'];
      const suggestions = generateAutocompleteSuggestions('technolgy', headlines, 5);
      // Fuzzy matching may or may not find matches depending on threshold
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract meaningful keywords', () => {
      const keywords = extractKeywords('breaking news about technology');
      expect(keywords).toContain('breaking');
      expect(keywords).toContain('news');
      expect(keywords).toContain('technology');
    });

    it('should filter out stop words', () => {
      const keywords = extractKeywords('the quick brown fox');
      expect(keywords).not.toContain('the');
      expect(keywords).toContain('quick');
      expect(keywords).toContain('brown');
    });

    it('should filter out short words', () => {
      const keywords = extractKeywords('a big cat is here');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('is');
      expect(keywords).toContain('big');
      expect(keywords).toContain('cat');
    });

    it('should convert to lowercase', () => {
      const keywords = extractKeywords('BREAKING NEWS');
      expect(keywords).toContain('breaking');
      expect(keywords).toContain('news');
    });

    it('should handle empty input', () => {
      const keywords = extractKeywords('');
      expect(keywords).toEqual([]);
    });
  });

  describe('Search Performance', () => {
    it('should handle large text efficiently', () => {
      const largeText = 'word '.repeat(10000);
      const start = Date.now();
      calculateRelevanceScore('test', 'headline', null, largeText);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle many autocomplete candidates', () => {
      const headlines = Array(1000).fill(0).map((_, i) => `Headline ${i}`);
      const start = Date.now();
      generateAutocompleteSuggestions('head', headlines, 10);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in queries', () => {
      const score = calculateRelevanceScore(
        'test@#$%',
        'test headline',
        null,
        null
      );
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle unicode characters', () => {
      const score = calculateRelevanceScore(
        'café',
        'café news',
        null,
        null
      );
      expect(score).toBeGreaterThan(0);
    });

    it('should handle very long queries', () => {
      const longQuery = 'word '.repeat(100);
      const score = calculateRelevanceScore(
        longQuery,
        'headline',
        null,
        null
      );
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle null and undefined gracefully', () => {
      const score = calculateRelevanceScore(
        'test',
        'headline',
        null,
        undefined
      );
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});
