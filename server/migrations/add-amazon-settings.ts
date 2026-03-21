import { getSetting, bulkUpsertSettings } from "../db";
import type { InsertWorkflowSetting } from "../../drizzle/schema";

export async function addAmazonSettings() {
  try {
    // Check if settings already exist
    const existing = await getSetting("amazon_client_id");

    if (existing) {
      console.log("Amazon settings already exist");
      return;
    }

    // Add Amazon API settings
    const amazonSettings: InsertWorkflowSetting[] = [
      {
        key: "amazon_client_id",
        value: "",
        label: "Amazon Client ID",
        description: "OAuth 2.0 Client ID from Amazon Creator API",
        category: "amazon",
        type: "string",
      },
      {
        key: "amazon_client_secret",
        value: "",
        label: "Amazon Client Secret",
        description: "OAuth 2.0 Client Secret from Amazon Creator API",
        category: "amazon",
        type: "string",
      },
      {
        key: "amazon_associate_tag",
        value: "",
        label: "Amazon Associate Tag",
        description: "Your Amazon Associates tag for affiliate link tracking",
        category: "amazon",
        type: "string",
      },
      {
        key: "amazon_product_keywords",
        value: JSON.stringify(["satire", "comedy", "political humor", "books", "merchandise"]),
        label: "Product Search Keywords",
        description: "Keywords to search for satire-related products",
        category: "amazon",
        type: "json",
      },
      {
        key: "amazon_cache_ttl_hours",
        value: "24",
        label: "Cache TTL (Hours)",
        description: "How long to cache product data before refreshing",
        category: "amazon",
        type: "number",
      },
      {
        key: "amazon_products_enabled",
        value: "true",
        label: "Enable Amazon Products",
        description: "Show recommended products on the site",
        category: "amazon",
        type: "boolean",
      },
    ];

    await bulkUpsertSettings(amazonSettings);
    console.log("Amazon settings added successfully");
  } catch (error) {
    console.error("Failed to add Amazon settings:", error);
    throw error;
  }
}
