// Archived FeedHive auto-post logic from server/routers.ts
// This code was removed from the article publish workflow on February 21, 2026
// Location: articles.updateStatus mutation, after social post creation

// Auto-post to FeedHive if enabled
const autoPost = await db.getSetting("auto_post_on_publish");
if (autoPost?.value === "true") {
  // Send to FeedHive for each platform
  for (const post of posts) {
    try {
      const triggerUrl = await db.getFeedHiveTriggerUrl(post.platform);
      if (triggerUrl) {
        const payload: Record<string, any> = { text: post.content };
        if (article.featuredImage) {
          const includeImageSetting = await db.getSetting("feedhive_include_image");
          if (includeImageSetting?.value !== "false") {
            payload.media_urls = [article.featuredImage];
          }
        }
        const response = await fetch(triggerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          console.log(`[AutoFeedHive] Posted to ${post.platform} for article ${input.id}`);
        } else {
          console.warn(`[AutoFeedHive] Failed to post to ${post.platform}: ${response.status}`);
        }
      }
    } catch (err) {
      console.error(`[AutoFeedHive] Error posting to ${post.platform}:`, err);
    }
  }
}
