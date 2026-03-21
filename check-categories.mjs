import mysql from "mysql2/promise";

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "satire_news",
});

const conn = await pool.getConnection();

const [stats] = await conn.query(`
  SELECT c.name, COUNT(a.id) as count 
  FROM categories c 
  LEFT JOIN articles a ON a.categoryId = c.id 
  GROUP BY c.id, c.name 
  ORDER BY count DESC
`);

console.log('\n=== Category Distribution After Recategorization ===\n');
let total = 0;
stats.forEach(s => {
  console.log(`  ${s.name.padEnd(25)} ${String(s.count).padStart(4)} articles`);
  total += s.count;
});
console.log(`\n  ${'TOTAL'.padEnd(25)} ${String(total).padStart(4)} articles\n`);

await conn.end();
