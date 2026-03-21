/**
 * Advanced search engine with fuzzy matching, relevance scoring, and autocomplete
 */

export interface SearchResult {
  id: number;
  score: number;
  matchedFields: string[];
  snippet?: string;
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
export function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Check if query matches text with fuzzy tolerance
 */
export function fuzzyMatch(query: string, text: string, threshold: number = 0.7): boolean {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) return true;
  
  // Word-by-word fuzzy matching
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);
  
  for (const queryWord of queryWords) {
    let found = false;
    for (const textWord of textWords) {
      if (similarityScore(queryWord, textWord) >= threshold) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  
  return true;
}

/**
 * Calculate relevance score for an article based on search query
 */
export function calculateRelevanceScore(
  query: string,
  headline: string,
  subheadline?: string | null,
  content?: string | null
): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  // Exact phrase match in headline (highest weight)
  if (headline.toLowerCase().includes(queryLower)) {
    score += 100;
  }
  
  // Individual word matches in headline
  const headlineLower = headline.toLowerCase();
  for (const word of queryWords) {
    if (headlineLower.includes(word)) {
      score += 50;
    } else {
      // Fuzzy match in headline
      const headlineWords = headlineLower.split(/\s+/);
      for (const hw of headlineWords) {
        const similarity = similarityScore(word, hw);
        if (similarity >= 0.7) {
          score += 30 * similarity;
        }
      }
    }
  }
  
  // Matches in subheadline
  if (subheadline) {
    const subheadlineLower = subheadline.toLowerCase();
    if (subheadlineLower.includes(queryLower)) {
      score += 40;
    }
    for (const word of queryWords) {
      if (subheadlineLower.includes(word)) {
        score += 20;
      }
    }
  }
  
  // Matches in content (lower weight)
  if (content) {
    const contentLower = content.toLowerCase();
    if (contentLower.includes(queryLower)) {
      score += 20;
    }
    for (const word of queryWords) {
      const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score += Math.min(matches * 5, 30); // Cap content matches
    }
  }
  
  return score;
}

/**
 * Extract highlighted snippet from text around query matches
 */
export function extractSnippet(
  query: string,
  text: string,
  maxLength: number = 200
): string {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Find first occurrence of query
  const index = textLower.indexOf(queryLower);
  
  if (index === -1) {
    // No exact match, return beginning
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }
  
  // Calculate snippet boundaries
  const start = Math.max(0, index - Math.floor((maxLength - query.length) / 2));
  const end = Math.min(text.length, start + maxLength);
  
  let snippet = text.substring(start, end);
  
  // Add ellipsis
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * Highlight query terms in text
 */
export function highlightMatches(query: string, text: string): string {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  let result = text;
  
  for (const word of queryWords) {
    const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  }
  
  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate autocomplete suggestions from article headlines
 */
export function generateAutocompleteSuggestions(
  query: string,
  headlines: string[],
  limit: number = 5
): string[] {
  const queryLower = query.toLowerCase();
  const suggestions: Array<{ text: string; score: number }> = [];
  
  for (const headline of headlines) {
    const headlineLower = headline.toLowerCase();
    
    // Exact prefix match (highest priority)
    if (headlineLower.startsWith(queryLower)) {
      suggestions.push({ text: headline, score: 100 });
      continue;
    }
    
    // Contains query
    if (headlineLower.includes(queryLower)) {
      suggestions.push({ text: headline, score: 50 });
      continue;
    }
    
    // Fuzzy match
    const similarity = similarityScore(queryLower, headlineLower);
    if (similarity >= 0.5) {
      suggestions.push({ text: headline, score: similarity * 30 });
    }
  }
  
  // Sort by score and return top results
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.text);
}

/**
 * Extract keywords from query for better matching
 */
export function extractKeywords(query: string): string[] {
  // Remove common stop words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can']);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}
