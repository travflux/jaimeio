/**
 * Test script: verify guessAndAssignCategories works with DB keywords
 * Run: node scripts/test-recategorize.mjs
 */
import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

// Fetch categories with keywords
const [categories] = await conn.execute('SELECT id, name, slug, keywords FROM categories ORDER BY name');
console.log('\n=== Categories with DB keywords ===');
for (const cat of categories) {
  const kws = cat.keywords ? cat.keywords.split(',').length : 0;
  console.log(`  ${cat.name} (${cat.slug}): ${kws} keywords`);
}

// Build keyword map (same logic as guessCategory in workflow.ts)
const CATEGORY_KEYWORDS = {
  "corporate-absurdity": ["ceo", "corporate", "company", "startup", "merger", "acquisition"],
  "tech-innovation": ["ai", "robot", "algorithm", "software", "app"],
  "pop-culture": ["celebrity", "movie", "film", "music", "actor", "actress", "netflix", "hollywood", "streaming", "grammy", "oscar"],
  "politics-government": ["politic", "government", "congress", "senate", "president", "election", "democrat", "republican", "vote", "legislation", "white house"],
  "economics-finance": ["economy", "stock", "market", "trade", "bank", "finance", "wall street", "inflation", "recession", "crypto"],
  "social-trends": ["dating", "social media", "tiktok", "instagram", "twitter", "gen z", "millennial", "viral", "meme", "influencer"],
  "science-environment": ["science", "space", "nasa", "climate", "environment", "research", "study", "discovery", "planet", "vaccine"],
  "sports-games": ["sport", "game", "team", "player", "nfl", "nba", "mlb", "soccer", "football", "basketball", "olympic"],
  "lifestyle-culture": ["food", "restaurant", "recipe", "fashion", "style", "wellness", "fitness", "diet", "love", "marriage"],
  "weird-news": ["bizarre", "strange", "odd", "unusual", "weird", "crazy", "unbelievable", "shocking", "surprising"],
};

const keywordMap = { ...CATEGORY_KEYWORDS };
for (const cat of categories) {
  if (cat.keywords && cat.keywords.trim()) {
    keywordMap[cat.slug] = cat.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  }
}

function guessCategory(title, summary, dbCats) {
  const text = `${title} ${summary}`.toLowerCase();
  const scores = {};
  for (const [slug, kws] of Object.entries(keywordMap)) {
    const score = kws.filter(kw => text.includes(kw)).length;
    if (score > 0) scores[slug] = score;
  }
  if (Object.keys(scores).length > 0) {
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }
  return dbCats[0]?.slug ?? 'weird-news';
}

// Test with sample headlines
const testHeadlines = [
  "Congress Passes Bill Requiring All Senators to Attend Mandatory Nap Time",
  "OpenAI Releases GPT-7, Immediately Asks Users Not to Ask It About Consciousness",
  "Elon Musk Announces Plan to Colonize Mars with Only Tesla Shareholders",
  "Local Man Discovers He Has Been Paying for Netflix Account He Never Uses",
  "Scientists Discover New Species of Bird That Only Sings During Zoom Calls",
  "NFL Team Signs 47-Year-Old Quarterback Out of Desperation",
  "Bitcoin Surges 40% After Teenager Posts Meme About It",
  "Florida Man Arrested for Attempting to Pay Taxes in Beanie Babies",
];

console.log('\n=== Category Assignment Test ===');
for (const headline of testHeadlines) {
  const cat = guessCategory(headline, '', categories);
  const catName = categories.find(c => c.slug === cat)?.name ?? cat;
  console.log(`  "${headline.slice(0, 60)}..." → ${catName}`);
}

// Check uncategorized articles
const [uncategorized] = await conn.execute('SELECT id, headline FROM articles WHERE categoryId IS NULL LIMIT 10');
console.log(`\n=== Uncategorized articles: ${uncategorized.length} ===`);
for (const a of uncategorized) {
  const cat = guessCategory(a.headline, '', categories);
  const catName = categories.find(c => c.slug === cat)?.name ?? cat;
  console.log(`  [${a.id}] "${a.headline.slice(0, 60)}..." → would assign: ${catName}`);
}

await conn.end();
console.log('\n✅ Test complete');
