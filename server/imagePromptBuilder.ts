/**
 * Shared image prompt builder — consolidates image generation prompt logic
 * from all three call sites (routers.ts backfill, workflowApi.ts media API,
 * workflow.ts pipeline) into a single, configurable function.
 *
 * All style settings are read from the database so white-label clients can
 * override them without touching code.
 */

import * as db from "./db";
import { invokeLLM } from "./_core/llm";

export async function buildImagePrompt(
  headline: string,
  subheadline?: string | null
): Promise<string> {
  // Load the LLM system prompt for image prompt generation
  const llmSystemPromptSetting = await db.getSetting("image_llm_system_prompt");
  const llmSystemPrompt =
    llmSystemPromptSetting?.value ||
    "You are an art director for a professional news publication. Create a concise image generation prompt for an illustration that matches the article's topic. The image should be visually striking and editorially appropriate. Return ONLY the prompt text, under 100 words.";

  // Ask the LLM to generate a descriptive image prompt from the headline
  const promptResp = await invokeLLM({
    messages: [
      { role: "system", content: llmSystemPrompt },
      {
        role: "user",
        content: `Create an image prompt for: ${headline}${subheadline ? " — " + subheadline : ""}`,
      },
    ],
  });

  const imgPrompt =
    (promptResp.choices?.[0]?.message?.content as string) || headline;

  // Load style settings
  const stylePrompt = await db.getSetting("image_style_prompt");
  const styleKeywords = await db.getSetting("image_style_keywords");


  // Assemble the final prompt
  let finalPrompt = `${stylePrompt?.value || "Professional editorial illustration, clean modern style"}: ${imgPrompt}. ${styleKeywords?.value || "High quality, sharp detail, professional photography aesthetic. No text or words in the image."}`;

  return finalPrompt;
}
