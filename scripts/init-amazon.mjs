import { addAmazonSettings } from '../server/migrations/add-amazon-settings.ts';
import { updateSetting } from '../server/db.ts';

await addAmazonSettings();
await updateSetting('amazon_associate_tag', 'hambry06-20');
await updateSetting('amazon_products_enabled', 'true');
console.log('✅ Amazon settings initialized with hambry06-20');
process.exit(0);
