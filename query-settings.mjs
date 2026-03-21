import mysql from 'mysql2/promise';

async function query() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [rows] = await connection.execute(
    "SELECT `key`, `value` FROM workflow_settings WHERE `key` LIKE '%amazon%'"
  );
  
  console.log('Amazon settings:');
  rows.forEach(row => {
    console.log(`  ${row.key} = ${row.value}`);
  });
  
  await connection.end();
}

query().catch(console.error);
