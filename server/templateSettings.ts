/**
 * Template Settings — applies article template config to generation settings.
 */
import { getDb } from "./db";

export interface GenerationSettings {
  userMessage?: string;
  tone?: string;
  targetWordCount?: number;
  imageStylePrompt?: string;
  imageProvider?: string;
  imageAspectRatio?: string;
  seoTitleFormat?: string;
  geoKeyTakeawayCount?: number;
  geoFaqCount?: number;
  templateId?: number;
  templateName?: string;
  categoryId?: number;
}

export async function applyTemplateSettings(
  templateId: number,
  baseSettings: GenerationSettings = {}
): Promise<GenerationSettings> {
  const db = await getDb();
  if (!db) return baseSettings;
  const { sql } = await import("drizzle-orm");
  const [rows] = await db.execute(sql`SELECT * FROM article_templates WHERE id = ${templateId} LIMIT 1`);
  const template = (rows as any[])[0];
  if (!template) return baseSettings;

  const merged: GenerationSettings = { ...baseSettings };
  if (template.promptTemplate) merged.userMessage = template.promptTemplate;
  if (template.tone && template.tone !== "default") merged.tone = template.tone;
  if (template.target_word_count) merged.targetWordCount = template.target_word_count;
  if (template.image_style_prompt) merged.imageStylePrompt = template.image_style_prompt;
  if (template.image_provider) merged.imageProvider = template.image_provider;
  if (template.image_aspect_ratio) merged.imageAspectRatio = template.image_aspect_ratio;
  if (template.seo_title_format) merged.seoTitleFormat = template.seo_title_format;
  if (template.geo_key_takeaway_count) merged.geoKeyTakeawayCount = template.geo_key_takeaway_count;
  if (template.geo_faq_count) merged.geoFaqCount = template.geo_faq_count;
  if (template.category_id || template.categoryId) merged.categoryId = template.category_id || template.categoryId;
  merged.templateId = template.id;
  merged.templateName = template.name;

  // Update usage stats
  await db.execute(sql`UPDATE article_templates SET last_used_at = NOW(), use_count = COALESCE(use_count, 0) + 1 WHERE id = ${templateId}`);

  return merged;
}
