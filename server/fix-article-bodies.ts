/**
 * Migration script to fix articles with nested JSON in body field
 * Run with: npx tsx server/fix-article-bodies.ts
 */
import { getDb } from "./db";
import { articles } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixArticleBodies() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("Fetching all articles...");
  const allArticles = await db.select().from(articles);
  console.log(`Found ${allArticles.length} articles`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const article of allArticles) {
    const body = article.body;
    
    // Check if body starts with <p>{ and contains "body": "
    if (body.trim().startsWith('<p>{') && body.includes('"body":')) {
      try {
        // Extract the body content using regex
        // Match: "body": "..." where ... can contain escaped quotes
        const bodyMatch = body.match(/"body":\s*"((?:[^"\\]|\\.)*)"/);
        
        if (bodyMatch && bodyMatch[1]) {
          const bodyContent = bodyMatch[1];
          
          console.log(`Fixing article ${article.id}: ${article.headline.slice(0, 50)}...`);
          
          // Unescape the content: \\n -> \n, \\" -> ", etc.
          const unescaped = bodyContent
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          
          // Convert plain text body to HTML paragraphs
          const htmlBody = unescaped
            .split(/\n\n+/)
            .filter((p: string) => p.trim())
            .map((p: string) => `<p>${p.trim()}</p>`)
            .join('\n\n');
          
          await db.update(articles)
            .set({ body: htmlBody })
            .where(eq(articles.id, article.id));
          
          fixedCount++;
        } else {
          console.log(`  Skipped article ${article.id}: Could not extract body content`);
          skippedCount++;
        }
      } catch (e) {
        console.log(`  Skipped article ${article.id}: Error - ${e instanceof Error ? e.message : 'Unknown error'}`);
        skippedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Fixed: ${fixedCount} articles`);
  console.log(`  Skipped: ${skippedCount} articles`);
  
  process.exit(0);
}

fixArticleBodies().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
