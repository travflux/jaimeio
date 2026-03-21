#!/usr/bin/env node
/**
 * Bulk migration script to parse JSON article bodies
 * Scans all articles, detects JSON bodies, parses them, and updates the database
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { articles } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Database connection
const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
});

const db = drizzle(connection);

/**
 * Parse JSON body and extract content
 */
function parseJsonBody(body) {
  const trimmed = body.trim();
  
  // Check if body is JSON
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null; // Not JSON
  }

  try {
    const parsed = JSON.parse(trimmed);
    
    // Check if it has a body field
    if (!parsed.body || typeof parsed.body !== 'string') {
      return null; // Not the expected JSON format
    }

    // Extract body field and convert escaped newlines to HTML paragraphs
    let extractedBody = parsed.body.replace(/\\n/g, '\n');
    const paragraphs = extractedBody.split('\n\n').filter(p => p.trim());
    const htmlBody = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');

    return htmlBody;
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    return null;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🔍 Scanning articles for JSON bodies...\n');

  // Fetch all articles
  const allArticles = await db.select().from(articles);
  console.log(`Found ${allArticles.length} total articles\n`);

  let jsonCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  for (const article of allArticles) {
    const parsedBody = parseJsonBody(article.body);

    if (parsedBody) {
      jsonCount++;
      console.log(`📝 Article ${article.id}: "${article.headline}"`);
      console.log(`   Status: ${article.status}`);
      console.log(`   Original length: ${article.body.length} chars`);
      console.log(`   Parsed length: ${parsedBody.length} chars`);

      try {
        // Update the article with parsed body
        await db.update(articles)
          .set({ body: parsedBody })
          .where(eq(articles.id, article.id));

        updatedCount++;
        console.log(`   ✅ Updated successfully\n`);
      } catch (e) {
        failedCount++;
        console.error(`   ❌ Failed to update: ${e.message}\n`);
      }
    }
  }

  console.log('━'.repeat(50));
  console.log('📊 Migration Summary:');
  console.log(`   Total articles scanned: ${allArticles.length}`);
  console.log(`   Articles with JSON bodies: ${jsonCount}`);
  console.log(`   Successfully updated: ${updatedCount}`);
  console.log(`   Failed updates: ${failedCount}`);
  console.log(`   Already in correct format: ${allArticles.length - jsonCount}`);
  console.log('━'.repeat(50));

  if (updatedCount > 0) {
    console.log('\n✨ Migration completed successfully!');
  } else if (jsonCount === 0) {
    console.log('\n✅ No articles needed migration. All articles are already in correct format.');
  } else {
    console.log('\n⚠️  Migration completed with some failures. Check logs above.');
  }

  await connection.end();
}

// Run migration
migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
