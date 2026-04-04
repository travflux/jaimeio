/**
 * GEO Service — Generative Engine Optimization
 *
 * Generates structured content that helps AI tools (ChatGPT, Perplexity,
 * Google AI Overviews) cite articles accurately.
 */

import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { articles } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeoLLMResult {
  summary?: string[];
  direct_answer: string;
  faq: Array<{ question: string; answer: string }>;
  speakable: string;
}

interface ArticleInput {
  id: number;
  headline: string;
  subheadline?: string | null;
  body: string;
  slug: string;
  featuredImage?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  categoryId?: number | null;
}

interface LicenseSettings {
  brand_site_name?: string;
  brand_site_url?: string;
  brand_logo_url?: string;
  geo_enabled?: string;
  geo_faq_enabled?: string;
  geo_faq_count?: string;
  geo_key_takeaway_label?: string;
}

// ─── GEO Content Generation ─────────────────────────────────────────────────

export async function generateGeoContent(
  article: ArticleInput,
  settings: LicenseSettings
): Promise<GeoLLMResult> {
  const brandName = settings.brand_site_name || "Our Publication";
  const bodyPreview = (article.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a GEO (Generative Engine Optimization) specialist. Return ONLY valid JSON, no markdown fences."
      },
      {
        role: "user",
        content: `Given this article, generate structured content that helps AI tools like ChatGPT and Perplexity cite this article accurately.

Return ONLY valid JSON with these fields:
{
  "summary": ["key takeaway 1", "key takeaway 2", "key takeaway 3", "key takeaway 4", "key takeaway 5"],
  "direct_answer": "2-3 sentences that directly answer what this article is about. Written to be cited verbatim by AI search engines.",
  "faq": [{"question": "...", "answer": "..."}],
  "speakable": "1 sentence under 25 words optimized for voice search. Starts with the publication name."
}

Rules for summary: Return exactly 5 key takeaway strings. Each is one concise sentence capturing an important point from the article.

Generate exactly ${parseInt(settings.geo_faq_count || "4", 10)} FAQ items. Each answer should be 2-3 sentences, factual and direct. Questions should be what readers would actually search for about this topic.

Article title: ${article.headline}
Article subheadline: ${article.subheadline || "N/A"}
Article body (first 800 chars): ${bodyPreview}
Publication name: ${brandName}`
      }
    ],
    responseFormat: { type: "json_object" },
  });

  const raw = typeof result.choices[0]?.message?.content === "string"
    ? result.choices[0].message.content
    : "";

  try {
    return JSON.parse(raw) as GeoLLMResult;
  } catch {
    // Try to extract JSON from markdown fences
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]) as GeoLLMResult;
    throw new Error(`Failed to parse GEO LLM response: ${raw.slice(0, 200)}`);
  }
}

// ─── JSON-LD Schema Generation ──────────────────────────────────────────────

export function generateNewsArticleSchema(
  article: ArticleInput,
  settings: LicenseSettings,
  geoContent?: GeoLLMResult | null
): string {
  const siteName = settings.brand_site_name || "Publication";
  const siteUrl = (settings.brand_site_url || "").replace(/\/$/, "");
  const logoUrl = settings.brand_logo_url || "";

  function toIso(val: string | Date | null | undefined): string {
    if (!val) return new Date().toISOString();
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.subheadline || "",
    datePublished: toIso(article.publishedAt),
    dateModified: toIso(article.updatedAt),
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
    },
    image: article.featuredImage ? [article.featuredImage] : [],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/article/${article.slug}`,
    },
  };

  // Add speakable if available
  if (geoContent?.speakable) {
    schema.speakable = {
      "@type": "SpeakableSpecification",
      cssSelector: [".geo-speakable", ".article-headline"],
    };
  }

  return JSON.stringify(schema);
}

// ─── FAQ Schema Generation ──────────────────────────────────────────────────

export function generateFaqSchema(
  faq: Array<{ question: string; answer: string }>
): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  });
}

// ─── GEO Score Calculation ──────────────────────────────────────────────────

export function calculateGeoScore(
  article: ArticleInput,
  geoContent: GeoLLMResult | null,
  hasSchema: boolean
): number {
  let score = 0;

  // Direct answer exists and is substantive (0-25)
  if (geoContent?.direct_answer) {
    const words = geoContent.direct_answer.split(/\s+/).length;
    score += Math.min(25, Math.round(words * 1.5));
  }

  // FAQ quality (0-25)
  if (geoContent?.faq && geoContent.faq.length > 0) {
    const faqScore = Math.min(25, geoContent.faq.length * 6);
    score += faqScore;
  }

  // Speakable exists (0-10)
  if (geoContent?.speakable && geoContent.speakable.length > 10) {
    score += 10;
  }

  // JSON-LD schema (0-15)
  if (hasSchema) {
    score += 15;
  }

  // Article has subheadline (0-5)
  if (article.subheadline && article.subheadline.length > 20) {
    score += 5;
  }

  // Article has featured image (0-5)
  if (article.featuredImage) {
    score += 5;
  }

  // Body length — longer content is more citable (0-15)
  const bodyText = (article.body || "").replace(/<[^>]+>/g, "");
  const wordCount = bodyText.split(/\s+/).length;
  if (wordCount > 800) score += 15;
  else if (wordCount > 500) score += 10;
  else if (wordCount > 300) score += 5;

  return Math.min(100, score);
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────

export async function processArticleGeo(
  articleId: number,
  settings: LicenseSettings
): Promise<{ success: boolean; score: number; error?: string; geoSummary?: string; geoFaq?: string }> {
  const database = await db.getDb();
  if (!database) throw new Error("Database unavailable");

  // Fetch the article
  const article = await db.getArticleById(articleId);
  if (!article) throw new Error(`Article ${articleId} not found`);

  try {
    // Generate GEO content via LLM
    const geoContent = await generateGeoContent(article, settings);

    // Generate JSON-LD schemas
    const newsSchema = generateNewsArticleSchema(article, settings, geoContent);
    const faqSchema = geoContent.faq?.length > 0
      ? generateFaqSchema(geoContent.faq)
      : null;

    // Combine schemas
    const combinedSchema = faqSchema
      ? JSON.stringify([JSON.parse(newsSchema), JSON.parse(faqSchema)])
      : newsSchema;

    // Calculate score
    const score = calculateGeoScore(article, geoContent, true);

    // Save to database
    await database
      .update(articles)
      .set({
        geoSummary: geoContent.summary ? JSON.stringify(geoContent.summary) : geoContent.direct_answer,
        geoFaq: JSON.stringify(geoContent.faq),
        geoSchema: combinedSchema,
        geoSpeakable: geoContent.speakable,
        geoScore: score,
        geoGeneratedAt: new Date(),
      })
      .where(eq(articles.id, articleId));

    console.log(`  [GEO] Article #${articleId} — score: ${score}/100, summary length: ${geoContent.direct_answer?.length}`);
    return { success: true, score, geoSummary: geoContent.summary ? JSON.stringify(geoContent.summary) : geoContent.direct_answer, geoFaq: JSON.stringify(geoContent.faq) };
  } catch (err: any) {
    console.error(`  [GEO] Error processing article #${articleId}: ${err.message}`);
    return { success: false, score: 0, error: err.message };
  }
}

// ─── Batch Processor ────────────────────────────────────────────────────────

export async function processArticlesGeo(
  articleIds: number[],
  settings: LicenseSettings
): Promise<{ processed: number; avgScore: number; errors: number }> {
  let totalScore = 0;
  let processed = 0;
  let errors = 0;

  for (const id of articleIds) {
    const result = await processArticleGeo(id, settings);
    if (result.success) {
      totalScore += result.score;
      processed++;
    } else {
      errors++;
    }
  }

  return {
    processed,
    avgScore: processed > 0 ? Math.round(totalScore / processed) : 0,
    errors,
  };
}
