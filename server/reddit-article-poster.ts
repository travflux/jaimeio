/**
 * Reddit Article Poster
 * Helper functions for posting articles to Reddit
 */

import { postToReddit } from "./_core/redditPoster";
import * as db from "./db";

export interface RedditPostArticleOptions {
  articleId: number;
  articleUrl: string;
  headline: string;
}

export interface RedditPostArticleResult {
  success: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
}

/**
 * Post an article to Reddit using configured settings
 */
export async function postArticleToReddit(options: RedditPostArticleOptions): Promise<RedditPostArticleResult> {
  try {
    // Get Reddit settings
    const redditEnabledSetting = await db.getSetting("reddit_enabled");
    const redditEnabled = redditEnabledSetting?.value || "false";
    if (redditEnabled !== "true") {
      return {
        success: false,
        error: "Reddit posting is not enabled"
      };
    }

    const clientIdSetting = await db.getSetting("reddit_client_id");
    const clientSecretSetting = await db.getSetting("reddit_client_secret");
    const usernameSetting = await db.getSetting("reddit_username");
    const passwordSetting = await db.getSetting("reddit_password");
    const subredditSetting = await db.getSetting("reddit_subreddit");
    const postTypeSetting = await db.getSetting("reddit_post_type");
    const titleTemplateSetting = await db.getSetting("reddit_title_template");

    const clientId = clientIdSetting?.value || "";
    const clientSecret = clientSecretSetting?.value || "";
    const username = usernameSetting?.value || "";
    const password = passwordSetting?.value || "";
    const subreddit = subredditSetting?.value || "test";
    const postType = postTypeSetting?.value || "link";
    const titleTemplate = titleTemplateSetting?.value || "{{headline}}";

    // Validate required settings
    if (!clientId || !clientSecret || !username || !password) {
      return {
        success: false,
        error: "Reddit credentials are not configured"
      };
    }

    // Generate post title from template
    const postTitle = titleTemplate.replace(/\{\{headline\}\}/g, options.headline);

    // Post to Reddit
    const result = await postToReddit({
      clientId,
      clientSecret,
      username,
      password,
      subreddit,
      title: postTitle,
      url: postType === "link" ? options.articleUrl : undefined,
      selftext: postType === "text" ? `${options.headline}\n\nRead more: ${options.articleUrl}` : undefined
    });

    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Unknown error"
    };
  }
}
