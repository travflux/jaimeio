import { getDb } from './server/db.ts';
import { articles, categories } from './drizzle/schema.ts';
import { count } from 'drizzle-orm';

const db = await getDb();
if (!db) {
  console.error('Failed to connect to database');
  process.exit(1);
}

const totalArticles = await db.select({ count: count() }).from(articles);
console.log('Total articles:', totalArticles[0].count);

const articlesByCategory = await db.select({
  categoryId: articles.categoryId,
  count: count()
}).from(articles).groupBy(articles.categoryId);

console.log('\nArticles by category ID:');
for (const row of articlesByCategory) {
  console.log(`Category ${row.categoryId}: ${row.count} articles`);
}

const categoriesList = await db.select().from(categories);
console.log('\nCategories:');
for (const cat of categoriesList) {
  console.log(`${cat.id}: ${cat.name} (${cat.slug})`);
}

process.exit(0);
