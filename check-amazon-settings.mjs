import { db } from './server/db.ts';

async function checkSettings() {
  try {
    const settings = await db.select().from(db.workflowSettings).where(
      db.sql`key IN ('amazon_products_enabled', 'amazon_associate_tag', 'amazon_keywords')`
    );
    
    console.log('Amazon Settings in Database:');
    settings.forEach(s => {
      console.log(`  ${s.key}: ${s.value}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSettings();
