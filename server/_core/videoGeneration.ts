/**
 * Video generation helper - now supports multiple providers
 * Delegates to the multi-provider system in videoProviders.ts
 *
 * Example usage:
 *   const { url: videoUrl } = await generateVideo({
 *     prompt: "A satirical news anchor reporting on tech industry layoffs",
 *     duration: 10,
 *     aspectRatio: "16:9"
 *   });
 */
export { generateVideo, generateVideoWithProvider } from "./videoProviders";
export type { VideoGenerationOptions as GenerateVideoOptions, VideoGenerationResponse as GenerateVideoResponse } from "./videoProviders";
