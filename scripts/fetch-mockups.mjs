/**
 * Fetch blank mockup images from Printify for all 10 product types.
 * Run from project root: node scripts/fetch-mockups.mjs
 */
import { createConnection } from 'mysql2/promise';
import { createWriteStream, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const conn = await createConnection(process.env.DATABASE_URL);

// Get all merch settings
const [rows] = await conn.execute(
  "SELECT `key`, value FROM workflow_settings WHERE `key` LIKE 'merch_%'"
);
const settings = {};
for (const r of rows) settings[r.key] = r.value;

const token = settings['merch_printify_api_token'];
const shopId = settings['merch_printify_shop_id'];

console.log('TOKEN:', token ? token.substring(0, 20) + '...' : 'NOT SET');
console.log('SHOP_ID:', shopId || 'NOT SET');

if (!token || !shopId) {
  console.error('Missing Printify credentials in DB. Set merch_printify_api_token and merch_printify_shop_id in Admin → Settings → Merch Store.');
  await conn.end();
  process.exit(1);
}

// Product types and their blueprint IDs
const PRODUCTS = [
  { type: 'mug',       blueprintId: settings['merch_blueprint_mug'],       providerId: settings['merch_print_provider_mug'] },
  { type: 'shirt',     blueprintId: settings['merch_blueprint_shirt'],     providerId: settings['merch_print_provider_shirt'] },
  { type: 'poster',    blueprintId: settings['merch_blueprint_poster'],    providerId: settings['merch_print_provider_poster'] },
  { type: 'case',      blueprintId: settings['merch_blueprint_case'],      providerId: settings['merch_print_provider_case'] },
  { type: 'canvas',    blueprintId: settings['merch_blueprint_canvas'],    providerId: settings['merch_print_provider_canvas'] },
  { type: 'tote',      blueprintId: settings['merch_blueprint_tote'],      providerId: settings['merch_print_provider_tote'] },
  { type: 'hoodie',    blueprintId: settings['merch_blueprint_hoodie'],    providerId: settings['merch_print_provider_hoodie'] },
  { type: 'mousepad',  blueprintId: settings['merch_blueprint_mousepad'],  providerId: settings['merch_print_provider_mousepad'] },
  { type: 'candle',    blueprintId: settings['merch_blueprint_candle'],    providerId: settings['merch_print_provider_candle'] },
  { type: 'cards',     blueprintId: settings['merch_blueprint_cards'],     providerId: settings['merch_print_provider_cards'] },
];

async function printifyGet(path) {
  const res = await fetch(`https://api.printify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Hambry/1.0' }
  });
  if (!res.ok) throw new Error(`Printify ${res.status}: ${await res.text()}`);
  return res.json();
}

// Create output dir
const outDir = '/tmp/mockups';
mkdirSync(outDir, { recursive: true });

const results = [];

for (const p of PRODUCTS) {
  if (!p.blueprintId || !p.providerId) {
    console.log(`SKIP ${p.type}: no blueprint/provider in settings`);
    results.push({ type: p.type, status: 'skipped', reason: 'no blueprint/provider' });
    continue;
  }
  try {
    console.log(`\nFetching blueprint data for ${p.type} (blueprint ${p.blueprintId})...`);
    const blueprintData = await printifyGet(`/catalog/blueprints/${p.blueprintId}.json`);
    const images = blueprintData.images || [];
    console.log(`  Blueprint "${blueprintData.title}" has ${images.length} images`);
    
    if (images.length > 0) {
      // Download the first image (front/main mockup)
      const imgUrl = images[0];
      console.log(`  Downloading: ${imgUrl.substring(0, 80)}...`);
      const imgRes = await fetch(imgUrl);
      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') || '';
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const dest = `${outDir}/${p.type}-blank.${ext}`;
        const writer = createWriteStream(dest);
        await pipeline(Readable.fromWeb(imgRes.body), writer);
        console.log(`  Saved: ${dest}`);
        results.push({ type: p.type, status: 'ok', dest, url: imgUrl, allImages: images });
      } else {
        console.log(`  Download failed: ${imgRes.status}`);
        results.push({ type: p.type, status: 'download_failed', url: imgUrl });
      }
    } else {
      console.log(`  No blueprint images available`);
      results.push({ type: p.type, status: 'no_images' });
    }
  } catch (err) {
    console.error(`  ERROR for ${p.type}:`, err.message);
    results.push({ type: p.type, status: 'error', error: err.message });
  }
  // Small delay to avoid rate limiting
  await new Promise(r => setTimeout(r, 500));
}

await conn.end();

console.log('\n=== SUMMARY ===');
for (const r of results) {
  console.log(`${r.type.padEnd(10)} ${r.status} ${r.dest || r.reason || r.error || ''}`);
}
console.log('\nDone.');
