/**
 * X/Twitter Direct Posting Service
 * Replaces FeedHive with direct API integration using twitter-api-v2
 */
import { TwitterApi } from "twitter-api-v2";

interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface TweetResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
}

/**
 * Get X/Twitter credentials: platform_credentials table first, then env var fallback.
 * This ensures white-label clients who enter creds via the wizard get them used.
 */
export async function getXCredentials(): Promise<XCredentials | null> {
  // Try platform_credentials table first
  try {
    const { getDb } = await import("./db");
    const { platformCredentials } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      const [cred] = await db
        .select()
        .from(platformCredentials)
        .where(and(eq(platformCredentials.platform, "x"), eq(platformCredentials.isActive, true)))
        .limit(1);
      if (cred) {
        // PlatformCard saves: apiKey=accessToken, apiSecret=accessTokenSecret, extra={apiKey,apiSecret}
        let apiKey: string | undefined;
        let apiSecret: string | undefined;
        let accessToken: string | undefined;
        let accessTokenSecret: string | undefined;
        if (cred.extra) {
          try {
            const extra = JSON.parse(cred.extra);
            if (extra.apiKey) apiKey = extra.apiKey;
            if (extra.apiSecret) apiSecret = extra.apiSecret;
            if (extra.accessToken) accessToken = extra.accessToken;
            if (extra.accessTokenSecret) accessTokenSecret = extra.accessTokenSecret;
          } catch { /* ignore */ }
        }
        // Fallback: apiKey/apiSecret fields may hold accessToken/accessTokenSecret
        if (!accessToken && cred.apiKey) accessToken = cred.apiKey;
        if (!accessTokenSecret && cred.apiSecret) accessTokenSecret = cred.apiSecret;
        if (apiKey && apiSecret && accessToken && accessTokenSecret) {
          return { apiKey, apiSecret, accessToken, accessTokenSecret };
        }
      }
    }
  } catch { /* fall through to env vars */ }
  // Env var fallback (JAIME.IO production + backwards compat)
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return null;
  }
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

/**
 * Create authenticated Twitter client
 */
function createClient(creds: XCredentials): TwitterApi {
  return new TwitterApi({
    appKey: creds.apiKey,
    appSecret: creds.apiSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessTokenSecret,
  });
}

/**
 * Post a tweet with optional image
 */
export async function postTweet(
  text: string,
  imageUrl?: string
): Promise<TweetResult> {
  const creds = await getXCredentials();
  if (!creds) {
    return {
      success: false,
      error: "X/Twitter API credentials not configured. Please set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET.",
    };
  }

  try {
    const client = createClient(creds);
    const v2Client = client.readWrite;

    let mediaId: string | undefined;

    // Upload image if provided
    if (imageUrl) {
      try {
        // Download the image first
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          let imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const contentType = imageResponse.headers.get("content-type") || "image/png";
          
          // Determine media type for upload
          let mimeType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" = "image/png";
          if (contentType.includes("jpeg") || contentType.includes("jpg")) {
            mimeType = "image/jpeg";
          } else if (contentType.includes("gif")) {
            mimeType = "image/gif";
          } else if (contentType.includes("webp")) {
            mimeType = "image/webp";
          }
          
          // Convert PNG to JPEG for better X/Twitter compatibility
          if (mimeType === "image/png") {
            try {
              const sharp = await import("sharp");
              const jpegBuffer = await sharp.default(imageBuffer)
                .jpeg({ quality: 85, progressive: true })
                .toBuffer();
              imageBuffer = Buffer.from(jpegBuffer);
              mimeType = "image/jpeg";
              console.log("[X/Twitter] Converted PNG to JPEG for better compatibility");
            } catch (e) {
              console.warn("[X/Twitter] Sharp not available for PNG conversion, uploading original PNG");
            }
          }

          // Upload via v1.1 media upload endpoint
          const v1Client = client.v1;
          mediaId = await v1Client.uploadMedia(imageBuffer, {
            mimeType,
          });
        }
      } catch (mediaError: any) {
        console.warn(`[X/Twitter] Failed to upload image: ${mediaError.message}. Posting without image.`);
        // Continue without image
      }
    }

    // Post the tweet
    const tweetPayload: any = { text };
    if (mediaId) {
      tweetPayload.media = { media_ids: [mediaId] };
    }

    const result = await v2Client.v2.tweet(tweetPayload);

    const tweetId = result.data.id;
    // Get username for tweet URL (we'll construct it from the tweet ID)
    const tweetUrl = `https://x.com/i/web/status/${tweetId}`;

    console.log(`[X/Twitter] Tweet posted successfully: ${tweetId}`);

    return {
      success: true,
      tweetId,
      tweetUrl,
    };
  } catch (error: any) {
    console.error(`[X/Twitter] Failed to post tweet:`, error.message || error);
    
    // Parse common Twitter API errors
    let errorMessage = error.message || "Unknown error";
    if (error.code === 403) {
      errorMessage = "Forbidden: Check your API permissions. You may need Elevated access or the correct app permissions.";
    } else if (error.code === 429) {
      errorMessage = "Rate limit exceeded. Please wait before posting again.";
    } else if (error.code === 401) {
      errorMessage = "Authentication failed. Check your API credentials.";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Verify X/Twitter credentials are valid.
 * Accepts optional override credentials (e.g., from the wizard test-before-save flow).
 * Falls back to DB/env via getXCredentials() if no overrides are provided.
 */
export async function verifyCredentials(
  overrideCreds?: Record<string, string>
): Promise<{
  valid: boolean;
  username?: string;
  error?: string;
}> {
  let creds: XCredentials | null = null;
  if (
    overrideCreds?.apiKey && overrideCreds?.apiSecret &&
    overrideCreds?.accessToken && overrideCreds?.accessTokenSecret
  ) {
    // Wizard passed explicit credentials to test before saving
    creds = {
      apiKey: overrideCreds.apiKey,
      apiSecret: overrideCreds.apiSecret,
      accessToken: overrideCreds.accessToken,
      accessTokenSecret: overrideCreds.accessTokenSecret,
    };
  } else {
    creds = await getXCredentials();
  }
  if (!creds) {
    return {
      valid: false,
      error: "X/Twitter API credentials not configured.",
    };
  }

  try {
    const client = createClient(creds);
    const me = await client.v2.me();
    return {
      valid: true,
      username: me.data.username,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || "Failed to verify credentials",
    };
  }
}
