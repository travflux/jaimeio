/**
 * Apply tags and article_tags tables directly via SQL.
 * Used because the Drizzle migration journal is out of sync with the DB.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`tags\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(100) NOT NULL,
    \`slug\` varchar(120) NOT NULL,
    \`description\` text,
    \`article_count\` int NOT NULL DEFAULT 0,
    \`created_at\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`tags_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`tags_name_unique\` UNIQUE(\`name\`),
    CONSTRAINT \`tags_slug_unique\` UNIQUE(\`slug\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`article_tags\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`article_id\` int NOT NULL,
    \`tag_id\` int NOT NULL,
    \`created_at\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`article_tags_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`idx_article_tag\` UNIQUE(\`article_id\`, \`tag_id\`)
  )`,
  `CREATE INDEX IF NOT EXISTS \`idx_article_tags_article\` ON \`article_tags\` (\`article_id\`)`,
  `CREATE INDEX IF NOT EXISTS \`idx_article_tags_tag\` ON \`article_tags\` (\`tag_id\`)`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log('✓', sql.trim().split('\n')[0].substring(0, 60));
  } catch (e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_KEYNAME') {
      console.log('⚠ Already exists, skipping:', e.message.substring(0, 60));
    } else {
      console.error('✗ Error:', e.message);
    }
  }
}

await conn.end();
console.log('Done.');
