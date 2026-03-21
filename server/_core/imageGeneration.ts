/**
 * Image generation helper - now supports multiple providers
 * Delegates to the multi-provider system in imageProviders.ts
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 */
export { generateImage, generateImageWithProvider } from "./imageProviders";
export type { ImageGenerationOptions as GenerateImageOptions, ImageGenerationResponse as GenerateImageResponse } from "./imageProviders";
