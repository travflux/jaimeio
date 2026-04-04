import sharp from "sharp";
import path from "path";
import fs from "fs";
import { getInterBoldBase64 } from "./fontLoader";



export interface WatermarkOptions {
  text?: string;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  fontSize?: number;
  textColor?: string;
  bgOpacity?: number;
}

export async function addWatermark(
  imageBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<Buffer> {
  const {
    text = "example.com",
    position = "bottom-right",
    fontSize = 16,
    textColor = "255,255,255",
    bgOpacity = 60,
  } = options;

  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width = 600, height = 400 } = metadata;

    // Dynamic scaling: base font size is 16px at 600px width
    const scaleFactor = width / 600;
    const scaledFontSize = Math.round(fontSize * scaleFactor);

    // Padding and margins
    const padding = Math.round(10 * scaleFactor);
    const margin = Math.round(20 * scaleFactor);

    const composites: sharp.OverlayOptions[] = [];

    // Add text watermark (bottom-right) using SVG
    const textHeight = Math.round(scaledFontSize * 1.8);
    const textWidth = Math.round(text.length * scaledFontSize * 0.55);
    
    const maxTextWidth = Math.min(textWidth, width - margin * 2 - padding * 2);
    const maxTextHeight = Math.min(textHeight, height - margin * 2 - padding * 2);
    
    // Create SVG with proper namespace and encoding
    const svgWidth = maxTextWidth + padding * 2;
    const svgHeight = maxTextHeight + padding * 2;
    const cornerRadius = Math.round(10 * scaleFactor);
    const textX = svgWidth / 2;
    const textY = svgHeight / 2 + scaledFontSize / 3;
    
    // Embed Inter Bold as base64 so the font renders correctly on any server
    let fontFaceBlock = "";
    try {
      const interBoldB64 = getInterBoldBase64();
      fontFaceBlock = `<defs><style>@font-face{font-family:'Inter';font-weight:700;src:url('data:font/truetype;base64,${interBoldB64}')format('truetype');}</style></defs>`;
    } catch {
      // If font file is missing, fall back to system fonts gracefully
    }
    const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">${fontFaceBlock}<rect width="${svgWidth}" height="${svgHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="rgb(0,0,0)" fill-opacity="${bgOpacity / 100}"/><text x="${textX}" y="${textY}" font-family="Inter, Arial, sans-serif" font-size="${scaledFontSize}" font-weight="700" fill="rgb(${textColor})" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`;

    // Render SVG to PNG buffer
    const svgBuffer = Buffer.from(textSvg);
    const textImage = sharp(svgBuffer, { density: 300 });
    
    composites.push({
      input: await textImage.toBuffer(),
      top: height - maxTextHeight - padding * 2 - margin,
      left: width - maxTextWidth - padding * 2 - margin,
    });

    return await image.composite(composites).toBuffer();
  } catch (error) {
    console.error("[Watermark] Error adding watermark:", error instanceof Error ? error.message : String(error));
    console.error("[Watermark] Stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("[Watermark] Returning original image without watermark");
    return imageBuffer;
  }
}

// Helper function to get watermark settings from database
export async function getWatermarkSettings(): Promise<WatermarkOptions> {
  const { getSetting } = await import("./db");
  
  const text = (await getSetting("watermark_text"))?.value || "example.com";
  const position = ((await getSetting("watermark_position"))?.value || "bottom-right") as WatermarkOptions["position"];
  const fontSize = parseInt((await getSetting("watermark_font_size"))?.value || "16", 10);
  const textColor = (await getSetting("watermark_text_color"))?.value || "255,255,255";
  const bgOpacity = parseInt((await getSetting("watermark_bg_opacity"))?.value || "60", 10);

  
  return {
    text,
    position,
    fontSize,
    textColor,
    bgOpacity,
  };
}

// Helper function to watermark an image from a URL
export async function watermarkImageFromUrl(
  imageUrl: string,
  options?: WatermarkOptions
): Promise<Buffer> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    return await addWatermark(imageBuffer, options);
  } catch (error) {
    console.error("[Watermark] Error watermarking image from URL:", error);
    throw error;
  }
}
