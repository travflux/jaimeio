import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute("SELECT `value` FROM settings WHERE `key` = 'article_llm_system_prompt' LIMIT 1");
if (rows.length === 0 || !rows[0].value) {
  console.log('STATUS: NULL/EMPTY — Hambry is using buildSystemPrompt() fallback (the one we changed)');
} else {
  console.log('STATUS: DB OVERRIDE EXISTS');
  console.log('VALUE (first 1000 chars):', rows[0].value.slice(0, 1000));
}
await conn.end();
