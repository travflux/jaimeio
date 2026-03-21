/**
 * Apply FULLTEXT index on articles table for fast full-text search.
 * MySQL/TiDB: FULLTEXT indexes are not supported by all storage engines.
 * TiDB uses InnoDB-compatible engine but FULLTEXT support depends on version.
 * If FULLTEXT is unsupported, we fall back to a composite regular index on headline.
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(url);

try {
  // Check if FULLTEXT index already exists
  const [existing] = await conn.execute(
    "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_NAME = 'articles' AND INDEX_NAME = 'ft_articles_search' AND INDEX_TYPE = 'FULLTEXT' LIMIT 1"
  );
  
  if (existing.length > 0) {
    console.log('✓ FULLTEXT index ft_articles_search already exists — skipping');
  } else {
    console.log('Adding FULLTEXT index on articles(headline, subheadline, body)...');
    await conn.execute('ALTER TABLE `articles` ADD FULLTEXT INDEX `ft_articles_search` (`headline`, `subheadline`, `body`)');
    console.log('✓ FULLTEXT index created successfully');
  }
} catch (e) {
  if (e.message && e.message.includes('Unsupported FULLTEXT')) {
    console.log('⚠ FULLTEXT not supported by this MySQL/TiDB version — adding regular index on headline instead');
    try {
      const [existingIdx] = await conn.execute(
        "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_NAME = 'articles' AND INDEX_NAME = 'idx_articles_headline' LIMIT 1"
      );
      if (existingIdx.length > 0) {
        console.log('✓ Regular headline index already exists — skipping');
      } else {
        await conn.execute('ALTER TABLE `articles` ADD INDEX `idx_articles_headline` (`headline`(255))');
        console.log('✓ Regular headline index created');
      }
    } catch (e2) {
      console.error('Failed to add fallback index:', e2.message);
    }
    // Set a flag in DB settings so the search layer knows FULLTEXT is unavailable
    try {
      await conn.execute(
        "INSERT INTO site_settings (`key`, `value`) VALUES ('search_fulltext_available', 'false') ON DUPLICATE KEY UPDATE `value` = 'false'"
      );
      console.log('✓ Recorded search_fulltext_available=false in settings');
    } catch {}
  } else {
    console.error('Error applying migration:', e.message);
    process.exit(1);
  }
}

// Check if FULLTEXT is available by reading the flag
try {
  const [flagRow] = await conn.execute(
    "SELECT value FROM site_settings WHERE `key` = 'search_fulltext_available' LIMIT 1"
  );
  const fulltextAvailable = flagRow.length === 0 || flagRow[0].value !== 'false';
  console.log(`\nSearch mode: ${fulltextAvailable ? 'FULLTEXT (MATCH...AGAINST)' : 'LIKE-based (fallback)'}`);
} catch {}

await conn.end();
console.log('Done.');
