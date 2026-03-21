import { getSetting, upsertSetting } from './server/db.ts';

// Check watermark_enabled setting
const result = await getSetting('watermark_enabled');
console.log('Watermark enabled setting:', result);

if (!result) {
  console.log('Setting not found. Creating it...');
  await upsertSetting({
    key: 'watermark_enabled',
    value: 'true',
    label: 'Enable Watermark',
    description: 'Enable watermark overlay on generated images',
    category: 'image_generation',
    type: 'boolean',
  });
  console.log('Watermark setting created and enabled');
} else if (result.value !== 'true') {
  console.log('Setting exists but is disabled. Enabling it...');
  await upsertSetting({
    key: 'watermark_enabled',
    value: 'true',
    label: result.label || 'Enable Watermark',
    description: result.description || 'Enable watermark overlay on generated images',
    category: result.category || 'image_generation',
    type: result.type || 'boolean',
  });
  console.log('Watermark setting enabled');
} else {
  console.log('Watermark is already enabled');
}

process.exit(0);
