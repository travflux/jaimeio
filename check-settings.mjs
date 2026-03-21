import * as db from './server/db.ts';

async function check() {
  const settings = await db.listSettings();
  const amazonSettings = settings.filter(s => 
    s.key.includes('amazon')
  );
  
  console.log('Amazon-related settings:');
  amazonSettings.forEach(s => {
    console.log(`  ${s.key} = ${s.value}`);
  });
  
  process.exit(0);
}

check();
