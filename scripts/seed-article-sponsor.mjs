import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

const settings = [
  ['article_sponsor_enabled', 'false', 'Enable Article Sponsor Banner', 'Show a sponsor banner below article content on article pages', 'sponsor', 'boolean'],
  ['article_sponsor_url', '', 'Article Sponsor URL', 'Destination URL when the banner is clicked', 'sponsor', 'string'],
  ['article_sponsor_label', 'Sponsored', 'Article Sponsor Label', 'Small uppercase label (e.g. Sponsored, Advertisement, Partner)', 'sponsor', 'string'],
  ['article_sponsor_cta', 'Learn More', 'Article Sponsor CTA', 'Call-to-action link text (e.g. Learn More, Visit Site, Shop Now)', 'sponsor', 'string'],
  ['article_sponsor_description', '', 'Article Sponsor Description', 'Optional short description line shown in the banner', 'sponsor', 'string'],
];

for (const [key, value, label, description, category, type] of settings) {
  await conn.execute(
    'INSERT IGNORE INTO workflow_settings (`key`, value, label, description, category, type) VALUES (?, ?, ?, ?, ?, ?)',
    [key, value, label, description, category, type]
  );
}

console.log('✅ Article sponsor settings seeded');
const [rows] = await conn.execute('SELECT `key`, value, label FROM workflow_settings WHERE `key` LIKE "article_sponsor%"');
console.table(rows);

await conn.end();
