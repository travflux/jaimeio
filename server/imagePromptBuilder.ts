/**
 * Image Prompt Builder — builds per-tenant image generation prompts.
 * Reads style settings from license_settings (per-tenant) with global fallback.
 */

import { getLicenseSettingOrGlobal, getSetting } from "./db";
import { invokeLLMWithFallback as invokeLLM } from "./_core/llmRouter";

export async function buildImagePrompt(
  headline: string,
  subheadline?: string | null,
  options?: { licenseId?: number }
): Promise<string> {
  const licenseId = options?.licenseId;

  // Read per-tenant settings with global fallback
  let stylePrompt = "";
  let styleKeywords = "";
  let llmSystemPrompt = "";

  if (licenseId) {
    stylePrompt = await getLicenseSettingOrGlobal(licenseId, "image_style_prompt") || "";
    styleKeywords = await getLicenseSettingOrGlobal(licenseId, "image_style_keywords") || "";
    llmSystemPrompt = await getLicenseSettingOrGlobal(licenseId, "image_llm_system_prompt") || "";
  } else {
    const sp = await getSetting("image_style_prompt");
    const sk = await getSetting("image_style_keywords");
    const lp = await getSetting("image_llm_system_prompt");
    stylePrompt = sp?.value || "";
    styleKeywords = sk?.value || "";
    llmSystemPrompt = lp?.value || "";
  }

  if (!llmSystemPrompt) {
    llmSystemPrompt = "You are an art director for a professional news publication. Create a concise image generation prompt for an illustration that matches the article topic. Return ONLY the prompt text, under 100 words.";
  }

  // Ask LLM to generate a descriptive image prompt from the headline
  const promptResp = await invokeLLM({
    messages: [
      { role: "system", content: llmSystemPrompt },
      { role: "user", content: "Create an image prompt for: " + headline + (subheadline ? " — " + subheadline : "") },
    ],
  });

  const imgPrompt = (typeof promptResp.choices?.[0]?.message?.content === "string" ? promptResp.choices[0].message.content : "") || headline;

  // Assemble final prompt
  const defaultStyle = "Professional editorial photography, clean modern style";
  const defaultKeywords = "High quality, sharp detail, professional aesthetic. No text or words in the image.";
  const finalPrompt = (stylePrompt || defaultStyle) + ": " + imgPrompt + ". " + (styleKeywords || defaultKeywords);

  return finalPrompt;
}

export async function buildNegativePrompt(licenseId?: number): Promise<string> {
  if (licenseId) {
    const custom = await getLicenseSettingOrGlobal(licenseId, "image_negative_prompt");
    if (custom) return custom;
  }
  return "text, watermark, logo, blurry, low quality, distorted, cartoon, ugly, bad anatomy";
}
