/**
 * Tagging system for JAIME.IO / white-label content engine.
 *
 * Responsibilities:
 *  - Auto-tag articles using LLM (extracts 3-7 tags from headline + subheadline + body)
 *  - CRUD helpers for tags and article_tags tables
 *  - Tag page queries (articles by tag, tag cloud, trending tags)
 *
 * White-label compatible: no hardcoded brand names. All LLM prompts are
 * configurable via site_settings (tag_llm_system_prompt, tag_max_count).
 */

import { getDb } from "./db";
import { tags, articleTags, articles } from "../drizzle/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TagWithCount {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  articleCount: number;
  createdAt: Date;
}

// ─── Slug helpers ────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 120);
}

// ─── Tag CRUD ────────────────────────────────────────────────────────────────

export async function getOrCreateTag(name: string): Promise<{ id: number; name: string; slug: string }> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('DB unavailable');

  const slug = toSlug(name);
  const normalizedName = name.trim().toLowerCase();

  // Try to find existing tag
  const existing = await dbConn
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1);

  if (existing.length > 0) return existing[0];

  // Create new tag
  const result = await dbConn.insert(tags).values({
    name: normalizedName,
    slug,
    articleCount: 0,
  });

  return { id: Number(result[0].insertId), name: normalizedName, slug };
}

export async function listTags(opts: { limit?: number; offset?: number; orderBy?: 'count' | 'name' | 'recent' } = {}): Promise<TagWithCount[]> {
  const dbConn = await getDb();
  if (!dbConn) return [];

  const { limit = 50, offset = 0, orderBy = 'count' } = opts;

  const order = orderBy === 'name'
    ? tags.name
    : orderBy === 'recent'
    ? desc(tags.createdAt)
    : desc(tags.articleCount);

  return dbConn
    .select()
    .from(tags)
    .orderBy(order as any)
    .limit(limit)
    .offset(offset) as Promise<TagWithCount[]>;
}

export async function getTagBySlug(slug: string): Promise<TagWithCount | null> {
  const dbConn = await getDb();
  if (!dbConn) return null;

  const rows = await dbConn
    .select()
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1);

  return (rows[0] as TagWithCount) ?? null;
}

export async function getTagById(id: number): Promise<TagWithCount | null> {
  const dbConn = await getDb();
  if (!dbConn) return null;

  const rows = await dbConn
    .select()
    .from(tags)
    .where(eq(tags.id, id))
    .limit(1);

  return (rows[0] as TagWithCount) ?? null;
}

export async function deleteTag(id: number): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;

  await dbConn.delete(articleTags).where(eq(articleTags.tagId, id));
  await dbConn.delete(tags).where(eq(tags.id, id));
}

// ─── Article–Tag associations ────────────────────────────────────────────────

export async function setArticleTags(articleId: number, tagNames: string[]): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;

  // Remove existing tags for this article
  await dbConn.delete(articleTags).where(eq(articleTags.articleId, articleId));

  if (tagNames.length === 0) return;

  // Get or create all tags
  const tagObjects = await Promise.all(tagNames.map(n => getOrCreateTag(n)));

  // Insert article_tags rows
  await dbConn.insert(articleTags).values(
    tagObjects.map(t => ({ articleId, tagId: t.id }))
  );

  // Recount article_count for each affected tag
  await recomputeTagCounts(tagObjects.map(t => t.id));
}

export async function addTagsToArticle(articleId: number, tagNames: string[]): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;

  for (const name of tagNames) {
    const tag = await getOrCreateTag(name);
    try {
      await dbConn.insert(articleTags).values({ articleId, tagId: tag.id });
    } catch {
      // Ignore duplicate key errors (tag already attached)
    }
  }

  const tagObjects = await Promise.all(tagNames.map(n => getOrCreateTag(n)));
  await recomputeTagCounts(tagObjects.map(t => t.id));
}

export async function getArticleTags(articleId: number): Promise<TagWithCount[]> {
  const dbConn = await getDb();
  if (!dbConn) return [];

  const rows = await dbConn
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      articleCount: tags.articleCount,
      createdAt: tags.createdAt,
    })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, articleId));

  return rows as TagWithCount[];
}

export async function getArticlesByTag(
  tagSlug: string,
  opts: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ articles: any[]; total: number; tag: TagWithCount | null }> {
  const dbConn = await getDb();
  if (!dbConn) return { articles: [], total: 0, tag: null };

  const tag = await getTagBySlug(tagSlug);
  if (!tag) return { articles: [], total: 0, tag: null };

  const { limit = 20, offset = 0, status = 'published' } = opts;

  const conditions = [
    eq(articleTags.tagId, tag.id),
    eq(articles.status, status as any),
  ];

  const [rows, countRows] = await Promise.all([
    dbConn
      .select({
        id: articles.id,
        headline: articles.headline,
        subheadline: articles.subheadline,
        slug: articles.slug,
        featuredImage: articles.featuredImage,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        categoryId: articles.categoryId,
        status: articles.status,
        views: articles.views,
      })
      .from(articleTags)
      .innerJoin(articles, eq(articleTags.articleId, articles.id))
      .where(and(...conditions))
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset(offset),
    dbConn
      .select({ count: sql<number>`COUNT(*)` })
      .from(articleTags)
      .innerJoin(articles, eq(articleTags.articleId, articles.id))
      .where(and(...conditions)),
  ]);

  return {
    articles: rows,
    total: Number(countRows[0]?.count ?? 0),
    tag,
  };
}

// ─── Tag counts ──────────────────────────────────────────────────────────────

async function recomputeTagCounts(tagIds: number[]): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn || tagIds.length === 0) return;

  for (const tagId of tagIds) {
    const [countRow] = await dbConn
      .select({ count: sql<number>`COUNT(*)` })
      .from(articleTags)
      .innerJoin(articles, eq(articleTags.articleId, articles.id))
      .where(and(
        eq(articleTags.tagId, tagId),
        eq(articles.status, 'published')
      ));

    await dbConn
      .update(tags)
      .set({ articleCount: Number(countRow?.count ?? 0) })
      .where(eq(tags.id, tagId));
  }
}

export async function recomputeAllTagCounts(): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;

  const allTags = await dbConn.select({ id: tags.id }).from(tags);
  await recomputeTagCounts(allTags.map(t => t.id));
}

// ─── Tag cloud ───────────────────────────────────────────────────────────────

export async function getTagCloud(limit: number = 30): Promise<TagWithCount[]> {
  const dbConn = await getDb();
  if (!dbConn) return [];

  return dbConn
    .select()
    .from(tags)
    .where(sql`${tags.articleCount} > 0`)
    .orderBy(desc(tags.articleCount))
    .limit(limit) as Promise<TagWithCount[]>;
}

export async function getTrendingTags(limit: number = 10): Promise<TagWithCount[]> {
  // "Trending" = tags attached to articles published in the last 7 days, sorted by count
  const dbConn = await getDb();
  if (!dbConn) return [];

  const cutoff = new Date(Date.now() - 7 * 86400000);

  const rows = await dbConn
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      articleCount: sql<number>`COUNT(DISTINCT ${articleTags.articleId})`,
      createdAt: tags.createdAt,
    })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .innerJoin(articles, eq(articleTags.articleId, articles.id))
    .where(and(
      eq(articles.status, 'published'),
      sql`${articles.publishedAt} >= ${cutoff}`
    ))
    .groupBy(tags.id, tags.name, tags.slug, tags.description, tags.createdAt)
    .orderBy(desc(sql`COUNT(DISTINCT ${articleTags.articleId})`))
    .limit(limit);

  return rows as TagWithCount[];
}

// ─── Auto-tagger ─────────────────────────────────────────────────────────────

const DEFAULT_TAG_SYSTEM_PROMPT = `You are a news article tagger. Extract 3-7 concise, lowercase topic tags from the article.
Rules:
- Tags must be 1-3 words each
- Use common, searchable terms (e.g., "climate change", "federal reserve", "artificial intelligence")
- Include: main topic, key entities (people/orgs/places), and thematic tags (e.g., "satire", "politics")
- No punctuation in tags except hyphens
- Return ONLY a JSON array of strings, e.g.: ["tag one", "tag two", "tag three"]`;

export async function autoTagArticle(
  articleId: number,
  headline: string,
  subheadline?: string | null,
  body?: string | null
): Promise<string[]> {
  try {
    // Load configurable system prompt
    const promptSetting = await db.getSetting('tag_llm_system_prompt');
    const systemPrompt = promptSetting?.value || DEFAULT_TAG_SYSTEM_PROMPT;

    const maxCountSetting = await db.getSetting('tag_max_count');
    const maxCount = parseInt(maxCountSetting?.value || '7', 10);

    // Build article context (truncated to avoid token waste)
    const bodySnippet = body ? body.substring(0, 600) : '';
    const articleText = [
      `Headline: ${headline}`,
      subheadline ? `Subheadline: ${subheadline}` : '',
      bodySnippet ? `Body: ${bodySnippet}` : '',
    ].filter(Boolean).join('\n');

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: articleText },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'article_tags',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of topic tags for the article',
              },
            },
            required: ['tags'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content as string;
    let tagNames: string[] = [];

    try {
      const parsed = JSON.parse(content);
      tagNames = Array.isArray(parsed) ? parsed : (parsed.tags || []);
    } catch {
      // Fallback: try to extract array from raw string
      const match = content?.match(/\[([^\]]+)\]/);
      if (match) {
        tagNames = match[1].split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
      }
    }

    // Sanitize and cap
    tagNames = tagNames
      .map((t: string) => t.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').substring(0, 50))
      .filter((t: string) => t.length >= 2)
      .slice(0, maxCount);

    if (tagNames.length > 0) {
      await setArticleTags(articleId, tagNames);
    }

    return tagNames;
  } catch (err: any) {
    console.error(`[AutoTag] Failed for article ${articleId}:`, err.message);
    return [];
  }
}

/**
 * Batch auto-tag articles that have no tags yet.
 * Called from the scheduler or admin UI.
 */
export async function batchAutoTagUntagged(limit: number = 50): Promise<{ processed: number; tagged: number }> {
  const dbConn = await getDb();
  if (!dbConn) return { processed: 0, tagged: 0 };

  // Find published articles with no tags
  const untagged = await dbConn
    .select({
      id: articles.id,
      headline: articles.headline,
      subheadline: articles.subheadline,
      body: articles.body,
    })
    .from(articles)
    .where(and(
      eq(articles.status, 'published'),
      sql`${articles.id} NOT IN (SELECT DISTINCT article_id FROM article_tags)`
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);

  let tagged = 0;
  for (const article of untagged) {
    const result = await autoTagArticle(article.id, article.headline, article.subheadline, article.body);
    if (result.length > 0) tagged++;
    // Small delay to avoid LLM rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  return { processed: untagged.length, tagged };
}

// ─── Batch auto-tag ALL untagged published articles ───────────────────────────
// Processes all untagged articles in sequential batches of 25 to avoid LLM
// rate limits. Returns total counts. Designed for one-time retroactive tagging.
export async function batchAutoTagAll(): Promise<{ processed: number; tagged: number; total: number }> {
  const dbConn = await getDb();
  if (!dbConn) return { processed: 0, tagged: 0, total: 0 };

  // Count total untagged articles first
  const countResult = await dbConn.execute(
    sql`SELECT COUNT(*) as cnt FROM articles WHERE status = 'published' AND id NOT IN (SELECT DISTINCT article_id FROM article_tags)`
  );
  const total = Number((countResult[0] as any)?.[0]?.cnt ?? 0);

  let processed = 0;
  let tagged = 0;
  const BATCH_SIZE = 25;

  while (true) {
    const batch = await dbConn
      .select({
        id: articles.id,
        headline: articles.headline,
        subheadline: articles.subheadline,
        body: articles.body,
      })
      .from(articles)
      .where(and(
        eq(articles.status, 'published'),
        sql`${articles.id} NOT IN (SELECT DISTINCT article_id FROM article_tags)`
      ))
      .orderBy(desc(articles.publishedAt))
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    for (const article of batch) {
      const result = await autoTagArticle(article.id, article.headline, article.subheadline, article.body);
      if (result.length > 0) tagged++;
      processed++;
      // Delay to avoid LLM rate limits
      await new Promise(r => setTimeout(r, 150));
    }
  }

  return { processed, tagged, total };
}
