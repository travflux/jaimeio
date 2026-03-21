// Archived FeedHive settings from server/db.ts
// Removed from defaultSettings array on February 21, 2026

export const feedhiveSettings = [
  { key: "auto_post_on_publish", value: "false", label: "Auto-Post to FeedHive on Publish", description: "Automatically send social media posts to FeedHive when articles are published.", category: "social", type: "boolean" },
  { key: "feedhive_trigger_url", value: process.env.FEEDHIVE_TRIGGER_URL || "", label: "FeedHive Trigger URL (Default/Fallback)", description: "Default FeedHive trigger URL used as fallback when no platform-specific URL is configured.", category: "social", type: "string" },
  { key: "feedhive_trigger_url_twitter", value: process.env.FEEDHIVE_TRIGGER_URL || "", label: "FeedHive Trigger URL — X (Twitter)", description: "FeedHive trigger URL for X (Twitter) posts.", category: "social", type: "string" },
  { key: "feedhive_trigger_url_facebook", value: "", label: "FeedHive Trigger URL — Facebook", description: "FeedHive trigger URL for Facebook posts.", category: "social", type: "string" },
  { key: "feedhive_trigger_url_linkedin", value: "", label: "FeedHive Trigger URL — LinkedIn", description: "FeedHive trigger URL for LinkedIn posts.", category: "social", type: "string" },
  { key: "feedhive_trigger_url_instagram", value: "", label: "FeedHive Trigger URL — Instagram", description: "FeedHive trigger URL for Instagram posts.", category: "social", type: "string" },
  { key: "feedhive_trigger_url_threads", value: "", label: "FeedHive Trigger URL — Threads", description: "FeedHive trigger URL for Threads posts.", category: "social", type: "string" },
  { key: "feedhive_mode", value: "draft", label: "FeedHive Mode", description: "How FeedHive handles posts: 'draft' creates drafts for review, 'publish' creates and publishes immediately.", category: "social", type: "string" },
  { key: "feedhive_include_image", value: "true", label: "Include Images", description: "Include featured article images in FeedHive posts.", category: "social", type: "boolean" },
];

// Archived FeedHive helper functions

export async function getFeedHiveTriggerUrl(platform: string): Promise<string | undefined> {
  // Try platform-specific URL first
  const platformKey = `feedhive_trigger_url_${platform}`;
  const platformSetting = await getSetting(platformKey);
  if (platformSetting?.value) return platformSetting.value;
  // Fall back to default trigger URL
  const defaultSetting = await getSetting("feedhive_trigger_url");
  return defaultSetting?.value || undefined;
}

export async function getAllFeedHiveTriggerUrls(): Promise<Record<string, string>> {
  if (!db) return {};
  const allSettings = await db.select().from(workflowSettings)
    .where(like(workflowSettings.key, "feedhive_trigger_url%"));
  
  const result: Record<string, string> = {};
  const defaultUrl = allSettings.find(s => s.key === "feedhive_trigger_url")?.value || "";
  
  const platforms = ["twitter", "facebook", "linkedin", "instagram", "threads"];
  for (const platform of platforms) {
    const platformUrl = allSettings.find(s => s.key === `feedhive_trigger_url_${platform}`)?.value;
    if (platformUrl) {
      result[platform] = platformUrl;
    } else if (defaultUrl) {
      result[platform] = defaultUrl;
    }
  }
  
  return result;
}
