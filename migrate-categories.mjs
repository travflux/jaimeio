import mysql from 'mysql2/promise';

const CATEGORY_KEYWORDS = {
  "corporate-absurdity": ["company", "corporate", "ceo", "merger", "acquisition", "layoff", "startup", "billion", "valuation", "venture capital", "ipo"],
  "tech-innovation": ["ai", "artificial intelligence", "tech", "software", "app", "algorithm", "robot", "cyber", "digital", "internet", "computer", "silicon valley", "google", "apple", "meta", "microsoft", "amazon"],
  "pop-culture": ["celebrity", "movie", "film", "music", "tv", "show", "actor", "actress", "netflix", "hollywood", "streaming", "award", "grammy", "oscar", "emmy"],
  "politics-government": ["politic", "government", "congress", "senate", "president", "election", "democrat", "republican", "vote", "law", "legislation", "white house"],
  "economics-finance": ["economy", "stock", "market", "trade", "bank", "finance", "wall street", "gdp", "inflation", "recession", "crypto", "bitcoin"],
  "social-trends": ["dating", "relationship", "social media", "tiktok", "instagram", "twitter", "facebook", "gen z", "millennial", "boomer", "trend", "viral", "meme"],
  "science-environment": ["science", "space", "nasa", "climate", "environment", "research", "study", "discovery", "planet", "health", "medical", "vaccine"],
  "sports-games": ["sport", "game", "team", "player", "nfl", "nba", "mlb", "soccer", "football", "basketball", "baseball", "olympic", "championship"],
  "lifestyle-culture": ["food", "restaurant", "recipe", "fashion", "style", "wellness", "health", "fitness", "diet", "relationship", "love", "marriage"],
  "weird-news": ["bizarre", "strange", "odd", "unusual", "weird", "crazy", "unbelievable", "shocking", "surprising", "unexpected", "rare"],
};

function guessCategory(title, body) {
  const text = `${title} ${body || ''}`.toLowerCase();
  const scores = {};

  for (const [catSlug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > 0) scores[catSlug] = score;
  }

  if (Object.keys(scores).length > 0) {
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }
  return "weird-news"; // default fallback
}

async function migrateCategories() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    database: 'satire_news',
  });

  try {
    console.log('Fetching all articles...');
    const [articles] = await connection.query('SELECT id, headline, body FROM articles');
    
    console.log(`Found ${articles.length} articles to migrate`);
    
    let updated = 0;
    for (const article of articles) {
      const categorySlug = guessCategory(article.headline, article.body);
      
      // Get category ID from slug
      const [categories] = await connection.query(
        'SELECT id FROM categories WHERE slug = ?',
        [categorySlug]
      );
      
      if (categories.length > 0) {
        const categoryId = categories[0].id;
        await connection.query(
          'UPDATE articles SET categoryId = ? WHERE id = ?',
          [categoryId, article.id]
        );
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`Migrated ${updated}/${articles.length} articles...`);
        }
      }
    }
    
    console.log(`\n✅ Successfully migrated ${updated} articles to new categories`);
    
    // Show distribution
    const [distribution] = await connection.query(`
      SELECT c.slug, c.name, COUNT(a.id) as count 
      FROM categories c 
      LEFT JOIN articles a ON c.id = a.categoryId 
      GROUP BY c.id, c.slug, c.name 
      ORDER BY count DESC
    `);
    
    console.log('\nNew category distribution:');
    console.log('─'.repeat(50));
    for (const row of distribution) {
      console.log(`${row.name.padEnd(25)} ${String(row.count).padStart(4)} articles`);
    }
    
  } finally {
    await connection.end();
  }
}

migrateCategories().catch(console.error);
