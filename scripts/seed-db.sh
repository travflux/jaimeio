#!/bin/bash
set -e

echo "=== JAIME.IO DB Seed ==="
echo "$(date)"

cd /var/www/jaimeio

node -e "
const mysql = require('mysql2/promise');
async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const rows = [
    [7,'resend_audience_id','d0b4c034-15fc-4afe-8a7f-7e4ae2864a9b'],
    [7,'business_name','Niki James'],
    [7,'business_email','hello@nikijames.com'],
    [7,'business_address','Los Angeles, CA'],
    [7,'business_email_show_on_contact','true'],
    [7,'business_address_show_on_contact','true'],
  ];
  for (const [lid,key,val] of rows) {
    await conn.execute('INSERT INTO license_settings (licenseId,\`key\`,value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)',[lid,key,val]);
    console.log('Seeded:',key,'=',val);
  }
  await conn.end();
  console.log('All seeds complete');
}
seed().catch(console.error);
"

echo "=== Seed complete ==="
