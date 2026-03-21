/**
 * Generate contextual Amazon product keywords based on article content
 */

interface Article {
  title: string;
  content: string;
  category?: string;
}

/**
 * Category-to-product keyword mapping
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  tech: ["electronics", "gadgets", "computers", "smartphones", "tech accessories", "software"],
  business: ["business books", "productivity tools", "office supplies", "management books", "entrepreneurship"],
  sports: ["sports equipment", "fitness gear", "athletic wear", "sports books", "training equipment"],
  wellness: ["health supplements", "fitness equipment", "wellness books", "yoga gear", "meditation tools"],
  lifestyle: ["home decor", "kitchen gadgets", "lifestyle books", "home improvement", "organization"],
  entertainment: ["movies", "music", "entertainment books", "streaming devices", "gaming"],
  science: ["science books", "educational toys", "lab equipment", "STEM kits", "documentaries"],
  politics: ["political books", "history books", "current affairs", "biographies", "news subscriptions"],
  opinion: ["books", "essays", "commentary", "journalism", "thought leadership"],
  world: ["travel guides", "world history", "international cuisine", "language learning", "cultural books"],
};

/**
 * Extract relevant keywords from article title and content
 */
function extractKeywords(article: Article): string[] {
  const keywords: string[] = [];
  const text = `${article.title} ${article.content}`.toLowerCase();
  
  // Common product-related terms
  const productTerms = [
    'book', 'device', 'tool', 'equipment', 'gear', 'product',
    'software', 'app', 'game', 'toy', 'gadget', 'accessory',
    'supplement', 'vitamin', 'protein', 'fitness', 'workout',
    'camera', 'phone', 'laptop', 'tablet', 'watch', 'headphones',
    'kitchen', 'cooking', 'recipe', 'food', 'drink', 'coffee',
    'clothing', 'shoes', 'fashion', 'style', 'wear',
  ];
  
  productTerms.forEach(term => {
    if (text.includes(term)) {
      keywords.push(term);
    }
  });
  
  return keywords;
}

/**
 * Generate Amazon product search keywords based on article
 */
export function generateAmazonKeywords(article: Article): string {
  const keywords: string[] = [];
  
  // 1. Add category-specific keywords
  if (article.category) {
    const categoryKey = article.category.toLowerCase();
    const categoryKeywords = CATEGORY_KEYWORDS[categoryKey] || [];
    keywords.push(...categoryKeywords.slice(0, 3)); // Top 3 category keywords
  }
  
  // 2. Extract content-specific keywords
  const contentKeywords = extractKeywords(article);
  keywords.push(...contentKeywords.slice(0, 2)); // Top 2 content keywords
  
  // 3. Add satire/humor baseline
  keywords.push("humor", "satire", "comedy");
  
  // 4. Deduplicate and join
  const uniqueKeywords = Array.from(new Set(keywords));
  
  return uniqueKeywords.slice(0, 8).join(", "); // Max 8 keywords
}

/**
 * Get fallback keywords if article-specific generation fails
 */
export function getFallbackKeywords(): string {
  return "books, humor, satire, comedy, political, entertainment, lifestyle, gifts";
}
