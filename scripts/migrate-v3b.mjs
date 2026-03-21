/**
 * v3.0.0 Migration Script - Part B
 * Adds missing columns to distribution_queue to match the v3 schema
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function exec(sql, label) {
  try {
    await conn.query(sql);
    console.log(`  ✓ ${label}`);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('already exists') || e.message.includes('Duplicate column')) {
      console.log(`  ~ ${label} (already exists, skipped)`);
    } else {
      console.error(`  ✗ ${label}: ${e.message}`);
    }
  }
}

console.log('Running v3.0.0 Part B migrations...\n');

// distribution_queue: add missing columns from v3 schema
await exec(`ALTER TABLE \`distribution_queue\` ADD \`postUrl\` varchar(1000)`, 'ADD distribution_queue.postUrl');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`attemptedAt\` timestamp`, 'ADD distribution_queue.attemptedAt');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`platform_post_id\` varchar(255)`, 'ADD distribution_queue.platform_post_id');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`engagement_likes\` int DEFAULT 0`, 'ADD distribution_queue.engagement_likes');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`engagement_comments\` int DEFAULT 0`, 'ADD distribution_queue.engagement_comments');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`engagement_shares\` int DEFAULT 0`, 'ADD distribution_queue.engagement_shares');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`engagement_clicks\` int DEFAULT 0`, 'ADD distribution_queue.engagement_clicks');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`engagement_checked_at\` timestamp`, 'ADD distribution_queue.engagement_checked_at');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, 'ADD distribution_queue.updatedAt');

// Rename old columns to match schema (likes -> engagement_likes already done above, old ones may conflict)
// Check if old columns exist and drop them if the new ones were added
try {
  const [cols] = await conn.query('DESCRIBE distribution_queue');
  const colNames = cols.map(r => r.Field);
  
  // If both old and new engagement columns exist, drop the old ones
  if (colNames.includes('likes') && colNames.includes('engagement_likes')) {
    await exec(`ALTER TABLE \`distribution_queue\` DROP COLUMN \`likes\``, 'DROP old distribution_queue.likes');
    await exec(`ALTER TABLE \`distribution_queue\` DROP COLUMN \`comments\``, 'DROP old distribution_queue.comments');
    await exec(`ALTER TABLE \`distribution_queue\` DROP COLUMN \`shares\``, 'DROP old distribution_queue.shares');
    await exec(`ALTER TABLE \`distribution_queue\` DROP COLUMN \`clicks\``, 'DROP old distribution_queue.clicks');
    await exec(`ALTER TABLE \`distribution_queue\` DROP COLUMN \`checked_at\``, 'DROP old distribution_queue.checked_at');
  }
} catch(e) {
  console.log('  ~ Column cleanup skipped:', e.message);
}

// Also fix triggeredBy to be enum if it's varchar
await exec(`ALTER TABLE \`distribution_queue\` MODIFY COLUMN \`triggeredBy\` enum('auto','manual') DEFAULT 'auto' NOT NULL`, 'MODIFY distribution_queue.triggeredBy to enum');

console.log('\nMigration Part B complete.');
await conn.end();
