import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const settings = [
    ['rebalance_trigger_count', '50', 'Rebalance Trigger Count', 'Number of articles created before triggering auto-rebalance', 'balance', 'number'],
    ['fingerprint_window', '200', 'Fingerprint Window', 'Number of recent articles per feed to use for category fingerprint calculation', 'balance', 'number'],
    ['min_articles_threshold', '25', 'Minimum Articles Threshold', 'Minimum articles a feed must have before its fingerprint is used in optimization', 'balance', 'number'],
    ['cooldown_hours', '6', 'Cooldown Hours', 'Minimum hours between auto-rebalance cycles', 'balance', 'number'],
    ['auto_rebalance_enabled', 'false', 'Auto-Rebalance Enabled', 'Enable automatic weight rebalancing after every N articles', 'balance', 'boolean'],
    ['max_weight_change', '20', 'Max Weight Change Per Cycle', 'Maximum percentage points a feed weight can change in a single rebalance cycle', 'balance', 'number'],
    ['target_distribution', '{}', 'Target Distribution', 'Custom target category distribution (empty = equal distribution)', 'balance', 'json'],
    ['weight_locks', '{}', 'Weight Locks', 'Locked feed weights that auto-rebalance will not modify', 'balance', 'json'],
    ['articles_since_last_rebalance', '0', 'Articles Since Last Rebalance', 'Counter tracking articles created since last rebalance', 'balance', 'number'],
  ];
  
  for (const [key, value, label, description, category, type] of settings) {
    await conn.query(
      'INSERT INTO workflow_settings (`key`, value, label, description, category, type) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE label=VALUES(label), description=VALUES(description), category=VALUES(category), type=VALUES(type)',
      [key, value, label, description, category, type]
    );
  }
  
  console.log('Seeded', settings.length, 'rebalance settings');
  await conn.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
