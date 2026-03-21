import { getSetting } from "../server/db.js";

(async () => {
  try {
    const tag = await getSetting('amazon_associate_tag');
    const enabled = await getSetting('amazon_products_enabled');
    const keywords = await getSetting('amazon_product_keywords');
    
    console.log('amazon_associate_tag:', tag?.value || '(not set)');
    console.log('amazon_products_enabled:', enabled?.value || '(not set)');
    console.log('amazon_product_keywords:', keywords?.value || '(not set)');
    
    if (!tag?.value) {
      console.log('\n⚠️  amazon_associate_tag is NOT set!');
    }
    if (enabled?.value !== 'true') {
      console.log('\n⚠️  amazon_products_enabled is NOT true! (value:', enabled?.value, ')');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
