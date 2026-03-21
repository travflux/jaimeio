/**
 * Bulk video generation helper
 */
import * as db from "./db";
import { generateVideo } from "./_core/videoGeneration";
import { extractVideoThumbnail } from "./_core/videoThumbnail";

export async function bulkGenerateVideos(articleIds?: number[]) {
  // Get approved or published articles without videos
  const allArticles = await db.listArticles({ limit: 10000 });
  const articlesToProcess = articleIds 
    ? allArticles.articles.filter(a => 
        articleIds.includes(a.id) && 
        !a.videoUrl && 
        (a.status === "approved" || a.status === "published")
      )
    : allArticles.articles.filter(a => 
        !a.videoUrl && 
        (a.status === "approved" || a.status === "published")
      );
  
  const videoStyleSetting = await db.getSetting("video_style_prompt");
  const videoStylePrompt = videoStyleSetting?.value || "Professional news broadcast style, high production quality, cinematic lighting";
  const videoDurationSetting = await db.getSetting("video_duration");
  const videoDuration = videoDurationSetting?.value ? parseInt(videoDurationSetting.value) : 5;
  const videoAspectRatioSetting = await db.getSetting("video_aspect_ratio");
  const videoAspectRatio = (videoAspectRatioSetting?.value || "16:9") as "16:9" | "9:16" | "1:1";
  
  let videosGenerated = 0;
  let videosFailed = 0;
  const results: Array<{ articleId: number; success: boolean; videoUrl?: string; error?: string }> = [];
  
  for (const article of articlesToProcess) {
    try {
      const videoPrompt = videoStylePrompt + ". News headline: " + article.headline + (article.subheadline ? ". Subheadline: " + article.subheadline : "");
      const result = await generateVideo({
        prompt: videoPrompt,
        duration: videoDuration,
        aspectRatio: videoAspectRatio,
      });
      
      if (result.url) {
        // Extract thumbnail if article doesn't have a featured image
        let featuredImage = article.featuredImage;
        if (!featuredImage) {
          const thumbnailResult = await extractVideoThumbnail({ videoUrl: result.url, timestamp: 2 });
          if (thumbnailResult.url) {
            featuredImage = thumbnailResult.url;
          }
        }
        
        await db.updateArticle(article.id, { videoUrl: result.url, featuredImage });
        videosGenerated++;
        results.push({ articleId: article.id, success: true, videoUrl: result.url });
      } else {
        videosFailed++;
        results.push({ articleId: article.id, success: false, error: "No video URL returned" });
      }
    } catch (err: any) {
      videosFailed++;
      results.push({ articleId: article.id, success: false, error: err.message?.slice(0, 100) });
    }
  }
  
  return {
    total: articlesToProcess.length,
    videosGenerated,
    videosFailed,
    results,
  };
}
