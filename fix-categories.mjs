import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const fixes = [
  ['amazon_affiliate_link', 'amazon'],
  ['amazon_keywords', 'amazon'],
  ['enable_horoscopes', 'horoscopes'],
  ['feed_randomize_order', 'sources'],
  ['feed_shuffle_seed', 'sources'],
  ['image_llm_system_prompt', 'image_providers'],
  ['mascot_instruction', 'image_providers'],
  ['randomize_feed_sources', 'sources'],
  ['x_auto_queue_on_publish', 'social'],
  ['x_post_interval_minutes', 'social'],
  ['feedhive_mode', 'social'],
  ['ai_excluded_styles', 'generation'],
  ['enable_crosswords', 'crosswords'],
  ['image_provider', 'image_providers'],
  ['image_provider_openai_api_key', 'image_providers'],
  ['image_style_keywords', 'image_providers'],
  ['image_style_prompt', 'image_providers'],
  ['trending_time_window_hours', 'homepage'],
  ['watermark_enabled', 'image_providers'],
  ['watermark_mascot_size', 'image_providers'],
  ['watermark_opacity', 'image_providers'],
  ['watermark_position', 'image_providers'],
  ['watermark_text', 'image_providers'],
  ['writing_style_prompt', 'generation'],
];

let updated = 0;
for (const [key, newCategory] of fixes) {
  const [result] = await conn.execute(
    'UPDATE workflow_settings SET category = ? WHERE `key` = ? AND category != ?',
    [newCategory, key, newCategory]
  );
  if (result.affectedRows > 0) {
    console.log(`✅ ${key}: updated to "${newCategory}"`);
    updated++;
  } else {
    console.log(`⏭️  ${key}: already correct or not found`);
  }
}

console.log(`\nDone. Updated ${updated} settings.`);
await conn.end();
