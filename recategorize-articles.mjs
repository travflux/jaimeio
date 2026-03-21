import { getDb } from './server/db.ts';
import { articles, categories } from './drizzle/schema.ts';
import { eq, isNull, or } from 'drizzle-orm';
import { invokeLLM } from './server/_core/llm.ts';

const db = await getDb();
if (!db) {
  console.error('Failed to connect to database');
  process.exit(1);
}

// Get all categories
const allCategories = await db.select().from(categories);
const categoryMap = new Map(allCategories.map(c => [c.slug, c.id]));

console.log('\nAvailable categories:');
allCategories.forEach(c => console.log(`  ${c.slug}: ${c.name}`));

// Get articles that need recategorization (null or in over-represented categories)
const articlesToRecategorize = await db.select().from(articles)
  .where(or(
    isNull(articles.categoryId),
    eq(articles.categoryId, 120001), // Corporate - 141 articles
    eq(articles.categoryId, 120002)  // Tech - 399 articles
  ))
  .limit(552);

console.log(`\nFound ${articlesToRecategorize.length} articles to recategorize`);

const categoryDescriptions = {
  'corporate-absurdity': 'Corporate, business, CEOs, companies, mergers, acquisitions, layoffs, startups, venture capital',
  'tech-innovation': 'Technology, AI, software, apps, algorithms, robots, cyber security, digital, internet, Silicon Valley',
  'pop-culture': 'Celebrities, movies, films, music, TV shows, actors, Netflix, Hollywood, streaming, awards',
  'politics-government': 'Politics, government, Congress, Senate, President, elections, voting, laws, legislation',
  'economics-finance': 'Economy, stock market, trading, banking, finance, Wall Street, GDP, inflation, cryptocurrency',
  'social-trends': 'Dating, relationships, social media, TikTok, Instagram, Twitter, Gen Z, Millennials, viral trends',
  'science-environment': 'Science, space, NASA, climate, environment, research, discoveries, health, medical',
  'sports-games': 'Sports, games, teams, players, NFL, NBA, MLB, soccer, football, basketball, Olympics',
  'lifestyle-culture': 'Food, restaurants, recipes, fashion, style, wellness, fitness, diet, relationships',
  'weird-news': 'Bizarre, strange, odd, unusual, weird, crazy, unbelievable, shocking, surprising events'
};

let processed = 0;
let updated = 0;

for (const article of articlesToRecategorize) {
  processed++;
  
  if (processed % 10 === 0) {
    console.log(`Progress: ${processed}/${articlesToRecategorize.length}`);
  }
  
  try {
    const prompt = `Analyze this satirical news article and categorize it into ONE of these categories:

${Object.entries(categoryDescriptions).map(([slug, desc]) => `- ${slug}: ${desc}`).join('\n')}

Article:
Headline: ${article.headline}
Subheadline: ${article.subheadline || 'N/A'}
Body: ${article.body.substring(0, 500)}...

Return ONLY the category slug (e.g., "tech-innovation"), nothing else.`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a categorization expert. Return only the category slug.' },
        { role: 'user', content: prompt }
      ]
    });

    const suggestedCategory = response.choices[0].message.content.trim().toLowerCase();
    const categoryId = categoryMap.get(suggestedCategory);

    if (categoryId && categoryId !== article.categoryId) {
      await db.update(articles)
        .set({ categoryId })
        .where(eq(articles.id, article.id));
      updated++;
      console.log(`  ✓ Article ${article.id}: "${article.headline.substring(0, 60)}..." → ${suggestedCategory}`);
    }
  } catch (error) {
    console.error(`  ✗ Error processing article ${article.id}:`, error.message);
  }
  
  // Rate limiting - wait 100ms between requests
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log(`\nRecategorization complete!`);
console.log(`Processed: ${processed} articles`);
console.log(`Updated: ${updated} articles`);

// Show new distribution
const newStats = await db.select({
  categoryId: articles.categoryId,
  count: db.$count()
}).from(articles).groupBy(articles.categoryId);

console.log('\nNew category distribution:');
for (const stat of newStats) {
  const cat = allCategories.find(c => c.id === stat.categoryId);
  console.log(`  ${cat?.name || 'Uncategorized'}: ${stat.count} articles`);
}

process.exit(0);
