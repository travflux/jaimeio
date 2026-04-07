import { eq, desc, asc, like, and, sql, inArray, isNotNull, isNull, gte, lte, lt, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser, users,
  categories, InsertCategory,
  articles, InsertArticle,
  newsletterSubscribers,
  socialPosts, InsertSocialPost,
  workflowBatches, InsertWorkflowBatch,
  licenses, InsertLicense,
  clientDeployments, InsertClientDeployment,
  searchAnalytics, InsertSearchAnalytics,
  contentCalendar, InsertContentCalendar,
  blockedSources, InsertBlockedSource,
  rssFeedWeights, InsertRssFeedWeight,
  rebalanceLogs, InsertRebalanceLog,
  xReplies,
  ceoDirectives,
  coveredTopics,
  affiliateClicks,
  pageViews,
  merchProducts, InsertMerchProduct,
  merchLeads, InsertMerchLead,
  imageLicenses,
  selectorCandidates,
} from "../drizzle/schema";

import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

// Database connection pool configuration
const POOL_CONFIG = {
  connectionLimit: 10, // Max concurrent connections
  waitForConnections: true, // Queue requests when pool is full
  queueLimit: 0, // No limit on queue size
  enableKeepAlive: true, // Keep connections alive
  keepAliveInitialDelay: 0,
  connectTimeout: 10000, // 10 second connection timeout
};

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create connection pool if it doesn't exist
      if (!_pool) {
        _pool = mysql.createPool({
          uri: process.env.DATABASE_URL,
          ...POOL_CONFIG,
        });
        console.log("[Database] Connection pool created with", POOL_CONFIG.connectionLimit, "max connections");
      }
      
      // Create drizzle instance with pool
      _db = drizzle(_pool as any);
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

// Health check function for monitoring
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { healthy: false, error: "Database not initialized" };
    }
    
    // Simple query to verify connection
    await db.select().from(users).limit(1);
    return { healthy: true };
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Graceful shutdown
export async function closeDatabasePool(): Promise<void> {
  if (_pool) {
    try {
      await _pool.end();
      console.log("[Database] Connection pool closed");
    } catch (error) {
      console.error("[Database] Error closing pool:", error);
    } finally {
      _pool = null;
      _db = null;
    }
  }
}

// ─── Users ───────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFirstAdmin() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  return result[0];
}

// ─── Categories ──────────────────────────────────────────
export async function listCategories(licenseId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (licenseId) {
    return db.select().from(categories).where(eq(categories.licenseId, licenseId)).orderBy(asc(categories.name));
  }
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result[0];
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(categories).values(data);
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(categories).where(eq(categories.id, id));
}

export async function seedDefaultCategories() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(categories).limit(1);
  if (existing.length > 0) return;
  const defaults: InsertCategory[] = [
    { name: "Politics", slug: "politics", description: "Political satire and commentary", color: "#ef4444" },
    { name: "Entertainment", slug: "entertainment", description: "Celebrity and entertainment news", color: "#f59e0b" },
    { name: "Sports", slug: "sports", description: "Sports satire", color: "#22c55e" },
    { name: "Tech", slug: "tech", description: "Technology and Silicon Valley", color: "#3b82f6" },
    { name: "Science", slug: "science", description: "Science and research", color: "#8b5cf6" },
    { name: "World", slug: "world", description: "International affairs", color: "#ec4899" },
    { name: "Business", slug: "business", description: "Business and economy", color: "#14b8a6" },
    { name: "Opinion", slug: "opinion", description: "Opinion and editorial pieces", color: "#f97316" },
  ];
  for (const cat of defaults) {
    await db.insert(categories).values(cat).onDuplicateKeyUpdate({ set: { name: cat.name } });
  }
}

// ─── Articles ────────────────────────────────────────────
export async function listArticles(opts: { status?: string; categoryId?: number; limit?: number; offset?: number; search?: string; dateRange?: string; noImage?: boolean; missingGeo?: boolean; missingImage?: boolean; licenseId?: number; dateFrom?: string; dateTo?: string; tagFilter?: string } = {}) {
  const db = await getDb();
  if (!db) return { articles: [], total: 0 };
  
  // Get blocked sources
  const blockedSourcesList = await getAllBlockedSources();
  const blockedSourceNames = blockedSourcesList.map(s => s.sourceName.toLowerCase());
  
  const conditions = [];
  if (opts.status) conditions.push(eq(articles.status, opts.status as any));
  if (opts.categoryId) conditions.push(eq(articles.categoryId, opts.categoryId));
  if (opts.search) conditions.push(like(articles.headline, `%${opts.search}%`));
  if (opts.noImage) conditions.push(sql`(${articles.featuredImage} IS NULL OR ${articles.featuredImage} = '')`);
  if (opts.missingImage) conditions.push(sql`(${articles.featuredImage} IS NULL OR ${articles.featuredImage} = '')`);
  if (opts.missingGeo) conditions.push(sql`(${articles.geoSummary} IS NULL OR ${articles.geoSummary} = '')`);
  if (opts.licenseId) conditions.push(eq(articles.licenseId, opts.licenseId));
  if (opts.dateFrom) conditions.push(sql`${articles.createdAt} >= ${new Date(opts.dateFrom)}`);
  if (opts.dateTo) conditions.push(sql`${articles.createdAt} <= ${new Date(opts.dateTo)}`);
  if (opts.tagFilter) {
    const tagCol = (articles as any)[opts.tagFilter];
    if (tagCol) conditions.push(eq(tagCol, true));
  }

  
  // Add date range filter
  if (opts.dateRange && opts.dateRange !== 'all') {
    const now = new Date();
    let cutoffDate: Date;
    switch (opts.dateRange) {
      case 'today':
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }
    conditions.push(sql`${articles.publishedAt} >= ${cutoffDate}`);
  }
  
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Get feed settings
  const randomizeSetting = await getSetting('feed_randomize_order');
  const shuffleSeedSetting = await getSetting('feed_shuffle_seed');
  const shouldRandomize = randomizeSetting?.value === 'true';
  const shuffleSeed = shuffleSeedSetting?.value || 'daily';
  
  // Fetch more articles than needed to account for filtering
  const fetchLimit = (opts.limit ?? 20) * 3;
  const [rows, countResult] = await Promise.all([
    db.select().from(articles).where(where).orderBy(desc(articles.createdAt)).limit(fetchLimit).offset(opts.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(articles).where(where),
  ]);
  
  // Filter out blocked sources
  let filteredArticles = rows.filter(article => {
    if (!article.sourceUrl) return true;
    const sourceDomain = article.sourceUrl.toLowerCase();
    return !blockedSourceNames.some(blocked => sourceDomain.includes(blocked));
  });
  
  // Apply randomization if enabled
  if (shouldRandomize && filteredArticles.length > 0) {
    const seed = shuffleSeed === 'daily' 
      ? new Date().toISOString().split('T')[0] 
      : shuffleSeed === 'random' 
      ? Math.random().toString() 
      : 'fixed';
    
    // Simple seeded shuffle using seed string
    const seededRandom = (str: string, index: number) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i) + index;
        hash = hash & hash;
      }
      return Math.abs(hash) / 2147483647;
    };
    
    filteredArticles = filteredArticles
      .map((article, index) => ({ article, sort: seededRandom(seed, index) }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ article }) => article);
  }
  
  // Apply limit after filtering and randomization
  const finalArticles = filteredArticles.slice(0, opts.limit ?? 20);
  
  return { articles: finalArticles, total: countResult[0]?.count ?? 0 };
}

/**
 * Fetch the most recently published articles for use by the X reply engine.
 *
 * This bypasses the feed randomization settings (feed_randomize_order / feed_shuffle_seed)
 * that are applied by listArticles() for the public feed. The reply engine always needs
 * the freshest articles ordered strictly by publishedAt DESC so replies are topical.
 */
export async function listRecentArticlesForEngine(limit: number = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(articles)
    .where(eq(articles.status, "published" as any))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export async function getMostReadArticles(limit: number = 5, licenseId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(articles.status, "published")];
  if (licenseId) conditions.push(eq(articles.licenseId, licenseId));
  return db.select().from(articles).where(and(...conditions)).orderBy(desc(articles.views)).limit(limit);
}

export async function getTrendingArticles(hoursAgo: number, limit: number = 5, licenseId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const conditions = [eq(articles.status, "published"), sql`${articles.publishedAt} >= ${cutoffDate}`];
  if (licenseId) conditions.push(eq(articles.licenseId, licenseId));
  return db.select().from(articles)
    .where(and(...conditions))
    .orderBy(desc(articles.views))
    .limit(limit);
}

export async function getArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  return result[0];
}

export async function getArticleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return result[0];
}

export async function createArticle(data: InsertArticle) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(articles).values(data);
  return result[0].insertId;
}

export async function bulkCreateArticles(dataList: InsertArticle[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (dataList.length === 0) return [];
  const ids: number[] = [];
  for (const data of dataList) {
    // Skip articles with duplicate slugs
    const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, data.slug)).limit(1);
    if (existing.length > 0) {
      ids.push(existing[0].id);
      continue;
    }
    const result = await db.insert(articles).values(data);
    ids.push(result[0].insertId);
  }
  return ids;
}

export async function updateArticle(id: number, data: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(articles).set(data).where(eq(articles.id, id));
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Cascade: delete associated social posts first to prevent orphaned queue entries
  await db.delete(socialPosts).where(eq(socialPosts.articleId, id));
  await db.delete(articles).where(eq(articles.id, id));
}

export async function bulkDeleteRejectedArticles() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  // Get all rejected articles
  const rejectedArticles = await db.select({ id: articles.id })
    .from(articles)
    .where(eq(articles.status, "rejected"));
  
  const count = rejectedArticles.length;
  
  if (count === 0) {
    return { deleted: 0, message: "No rejected articles to delete" };
  }
  
  const articleIds = rejectedArticles.map(a => a.id);
  
  // Delete associated social posts first (foreign key constraint)
  await db.delete(socialPosts).where(inArray(socialPosts.articleId, articleIds));
  
  // Delete the rejected articles
  await db.delete(articles).where(eq(articles.status, "rejected"));
  
  console.log(`[Bulk Delete] Deleted ${count} rejected articles`);
  
  return { deleted: count, message: `Successfully deleted ${count} rejected articles` };
}

export async function updateArticleStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updates: Record<string, unknown> = { status };
  if (status === "published") updates.publishedAt = new Date();
  await db.update(articles).set(updates).where(eq(articles.id, id));
}

export async function incrementArticleViews(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set({ views: sql`${articles.views} + 1` }).where(eq(articles.id, id));
}

export async function getArticlesMissingImages() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: articles.id,
      headline: articles.headline,
      slug: articles.slug,
      status: articles.status,
      createdAt: articles.createdAt,
      categoryId: articles.categoryId,
    })
    .from(articles)
    .where(
      sql`${articles.featuredImage} IS NULL OR ${articles.featuredImage} = ''`
    )
    .orderBy(desc(articles.createdAt))
    .limit(50);
}

export async function getArticleStats() {
  const db = await getDb();
  if (!db) return { total: 0, published: 0, pending: 0, approved: 0, rejected: 0, draft: 0 };
  
  // Get blocked sources to match the filtering in listArticles()
  const blockedSourcesList = await getAllBlockedSources();
  const blockedSourceNames = blockedSourcesList.map(s => s.sourceName.toLowerCase());
  
  // Fetch all articles
  const allRows = await db.select().from(articles);
  
  // Filter out blocked sources to match listArticles() behavior
  const filteredRows = allRows.filter(article => {
    if (!article.sourceUrl) return true;
    const sourceDomain = article.sourceUrl.toLowerCase();
    return !blockedSourceNames.some(blocked => sourceDomain.includes(blocked));
  });
  
  // Count by status
  const stats: Record<string, number> = { total: 0, published: 0, pending: 0, approved: 0, rejected: 0, draft: 0 };
  for (const article of filteredRows) {
    stats[article.status] = (stats[article.status] || 0) + 1;
    stats.total += 1;
  }
  return stats;
}

export async function getUsedSourceUrls(daysBack: number = 30): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const rows = await db.select({ sourceUrl: articles.sourceUrl })
    .from(articles)
    .where(and(
      isNotNull(articles.sourceUrl),
      sql`${articles.createdAt} >= ${cutoffDate}`
    ));
  return new Set(rows.map(r => r.sourceUrl).filter((url): url is string => !!url));
}

// ─── Newsletter ──────────────────────────────────────────
export async function subscribeNewsletter(email: string, licenseId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(newsletterSubscribers).values({ email }).onDuplicateKeyUpdate({ set: { status: "active" } });
}

export async function unsubscribeNewsletter(email: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(newsletterSubscribers).set({ status: "unsubscribed" }).where(eq(newsletterSubscribers.email, email));
}

export async function listSubscribers(licenseId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt));
}

// ─── Social Posts ────────────────────────────────────────
export async function listSocialPosts(opts: { articleId?: number; status?: string } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts.articleId) conditions.push(eq(socialPosts.articleId, opts.articleId));
  if (opts.status) conditions.push(eq(socialPosts.status, opts.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Join with articles table to order by article's publishedAt date (newest first)
  // This ensures the freshest articles are posted first in the X queue
  const results = await db
    .select({
      id: socialPosts.id,
      articleId: socialPosts.articleId,
      platform: socialPosts.platform,
      content: socialPosts.content,
      videoUrl: socialPosts.videoUrl,
      status: socialPosts.status,
      scheduledAt: socialPosts.scheduledAt,
      postedAt: socialPosts.postedAt,
      createdAt: socialPosts.createdAt,
      articlePublishedAt: articles.publishedAt,
    })
    .from(socialPosts)
    .leftJoin(articles, eq(socialPosts.articleId, articles.id))
    .where(where)
    .orderBy(desc(articles.publishedAt), desc(socialPosts.createdAt));
  
  // Return in the original shape (without articlePublishedAt)
  return results.map(({ articlePublishedAt, ...post }) => post);
}

export async function createSocialPost(data: InsertSocialPost) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(socialPosts).values(data);
}

export async function bulkCreateSocialPosts(dataList: InsertSocialPost[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (const data of dataList) {
    try {
      await db.insert(socialPosts).values(data);
    } catch (err: any) {
      // Skip duplicate (articleId + platform unique constraint)
      if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate")) {
        console.log(`[SocialPosts] Skipping duplicate: articleId=${data.articleId}, platform=${data.platform}`);
        continue;
      }
      throw err;
    }
  }
}

export async function updateSocialPostStatus(id: number, status: string, extra?: { attemptedAt?: Date; postedAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updates: Record<string, unknown> = { status, ...extra };
  if (status === "posted" && !extra?.postedAt) updates.postedAt = new Date();
  if ((status === "posted" || status === "failed" || status === "posting") && !extra?.attemptedAt) updates.attemptedAt = new Date();
  await db.update(socialPosts).set(updates).where(eq(socialPosts.id, id));
}

export async function deleteSocialPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(socialPosts).where(eq(socialPosts.id, id));
}

/**
 * Atomically claim a social post for posting by transitioning it from
 * 'scheduled' → 'posting' in a single UPDATE statement.
 *
 * Returns true only if this caller successfully claimed the row (affectedRows === 1).
 * Any concurrent caller will see affectedRows === 0 and must bail out immediately.
 *
 * This is the primary guard against race-condition duplicate posts.
 */
export async function claimSocialPostForPosting(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // The WHERE clause requires status='scheduled' — only one concurrent caller can win.
  const result = await db
    .update(socialPosts)
    .set({ status: "posting" as any })
    .where(and(eq(socialPosts.id, id), eq(socialPosts.status, "scheduled" as any))) as any;
  // drizzle-orm mysql2 returns [ResultSetHeader, FieldPacket[]]
  const affectedRows: number = Array.isArray(result) ? result[0]?.affectedRows ?? 0 : 0;
  return affectedRows > 0;
}

/**
 * Release stuck 'posting' posts back to 'scheduled' so they can be retried.
 * Called on server startup to recover from posts that were claimed but never completed
 * (e.g., server crash mid-flight).
 */
export async function releaseStuckPostingPosts(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Any post stuck in 'posting' for more than 5 minutes is considered crashed
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const result = await db
    .update(socialPosts)
    .set({ status: "scheduled" as any })
    .where(
      and(
        eq(socialPosts.platform, "twitter"),
        eq(socialPosts.status, "posting" as any),
        sql`${socialPosts.createdAt} < ${fiveMinutesAgo}`
      )
    ) as any;
  const affectedRows: number = Array.isArray(result) ? result[0]?.affectedRows ?? 0 : 0;
  if (affectedRows > 0) {
    console.log(`[X Queue] Released ${affectedRows} stuck 'posting' post(s) back to 'scheduled'`);
  }
  return affectedRows;
}

// ─── Workflow Batches ────────────────────────────────────
export async function listWorkflowBatches(limit = 20, licenseId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowBatches).orderBy(desc(workflowBatches.createdAt)).limit(limit);
}

export async function getWorkflowBatch(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workflowBatches).where(eq(workflowBatches.id, id)).limit(1);
  return result[0];
}

export async function getWorkflowBatchByDate(batchDate: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workflowBatches).where(eq(workflowBatches.batchDate, batchDate)).limit(1);
  return result[0];
}

export async function createWorkflowBatch(data: InsertWorkflowBatch) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(workflowBatches).values(data);
  return result[0].insertId;
}

export async function updateWorkflowBatch(id: number, data: Partial<InsertWorkflowBatch>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(workflowBatches).set(data).where(eq(workflowBatches.id, id));
}

// ─── Workflow Settings ──────────────────────────────────
import { workflowSettings, InsertWorkflowSetting } from "../drizzle/schema";

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowSettings).orderBy(asc(workflowSettings.category), asc(workflowSettings.key));
}

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workflowSettings).where(eq(workflowSettings.key, key)).limit(1);
  return result[0];
}


/** Read a setting from license_settings for a specific tenant */
export async function getLicenseSetting(licenseId: number, key: string): Promise<{ key: string; value: string } | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const { licenseSettings } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  const [row] = await db.select().from(licenseSettings)
    .where(and(eq(licenseSettings.licenseId, licenseId), eq(licenseSettings.key, key)))
    .limit(1);
  return row ? { key: row.key, value: row.value } : undefined;
}

/** Read a license setting with fallback to global workflow_settings */

/** Get a license record by subdomain */
export async function getLicenseBySubdomain(subdomain: string) {
  const db = await getDb();
  if (!db) return null;
  const { licenses } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const [license] = await db.select().from(licenses).where(eq(licenses.subdomain, subdomain)).limit(1);
  return license ?? null;
}

export async function getLicenseSettingOrGlobal(licenseId: number, key: string): Promise<string | undefined> {
  const ls = await getLicenseSetting(licenseId, key);
  if (ls?.value) return ls.value;
  const gs = await getSetting(key);
  return gs?.value;
}


// ─── Blotato Account Storage ──────────────────────────────────────────────────

export async function storeBlotatoAccounts(
  licenseId: number,
  accounts: Array<{ id: string; platform: string; username: string; pageId?: string }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { licenseSettings: ls } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  const key = "blotato_accounts";
  const value = JSON.stringify(accounts);
  const [existing] = await db.select().from(ls)
    .where(and(eq(ls.licenseId, licenseId), eq(ls.key, key)))
    .limit(1);
  if (existing) {
    await db.update(ls).set({ value }).where(eq(ls.id, existing.id));
  } else {
    await db.insert(ls).values({ licenseId, key, value, type: "string" });
  }
}

export async function getBlotatoAccountsFromSettings(
  licenseId: number
): Promise<Array<{ id: string; platform: string; username: string; pageId?: string }>> {
  const stored = await getLicenseSetting(licenseId, "blotato_accounts");
  if (!stored?.value) return [];
  try {
    return JSON.parse(stored.value);
  } catch {
    return [];
  }
}

export async function getBlotatoAccountForPlatform(
  licenseId: number,
  platform: string
): Promise<{ id: string; platform: string; username: string; pageId?: string } | null> {
  const accounts = await getBlotatoAccountsFromSettings(licenseId);
  return accounts.find(a => a.platform === platform) ?? null;
}

// ─── Blotato Schedule Slots ───────────────────────────────────────────────────


export async function getLLMProvider(licenseId: number): Promise<"auto" | "groq" | "anthropic" | "openai" | "gemini"> {
  const setting = await getLicenseSetting(licenseId, "llm_provider");
  const valid = ["auto", "groq", "anthropic", "openai", "gemini"];
  return valid.includes(setting?.value ?? "") ? setting!.value as any : "auto";
}


export async function getTodayForTenant(licenseId?: number): Promise<string> {
  let tz = "America/Los_Angeles";
  if (licenseId) {
    const setting = await getLicenseSetting(licenseId, "workflow_timezone");
    if (setting?.value) tz = setting.value;
  }
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}
export async function getActiveLicenseIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const { licenses } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const result = await db.select({ id: licenses.id }).from(licenses).where(eq(licenses.status, "active"));
  return result.map(r => r.id);
}
export interface ScheduleSlotConfig {
  platform: string;
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  hour: number;
  minute: number;
}

export async function getScheduleSlots(licenseId: number): Promise<ScheduleSlotConfig[]> {
  const stored = await getLicenseSetting(licenseId, "blotato_schedule_slots");
  if (!stored?.value) return [];
  try { return JSON.parse(stored.value); } catch { return []; }
}

export async function saveScheduleSlots(licenseId: number, slots: ScheduleSlotConfig[]): Promise<void> {
  const { licenseSettings: ls } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return;
  const key = "blotato_schedule_slots";
  const value = JSON.stringify(slots);
  const [existing] = await db.select().from(ls).where(and(eq(ls.licenseId, licenseId), eq(ls.key, key))).limit(1);
  if (existing) { await db.update(ls).set({ value }).where(eq(ls.id, existing.id)); }
  else { await db.insert(ls).values({ licenseId, key, value, type: "string" }); }
}

export async function getSettingsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowSettings).where(eq(workflowSettings.category, category));
}

export async function upsertSetting(data: InsertWorkflowSetting) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(workflowSettings).values(data).onDuplicateKeyUpdate({
    set: { value: data.value, label: data.label, description: data.description, category: data.category, type: data.type },
  });
}

export async function setSetting(key: string, value: string, category?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const insertData = category ? { key, value, category } : { key, value };
  await db.insert(workflowSettings).values(insertData as any).onDuplicateKeyUpdate({
    set: category ? { value, category } : { value },
  });
}

export async function bulkUpsertSettings(dataList: InsertWorkflowSetting[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (const data of dataList) {
    await db.insert(workflowSettings).values(data).onDuplicateKeyUpdate({
      set: { value: data.value, label: data.label, description: data.description, category: data.category, type: data.type },
    });
  }
}

export async function deleteSetting(key: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(workflowSettings).where(eq(workflowSettings.key, key));
}

// ─── Workflow Helpers (used by TypeScript workflow engine) ──────
export async function createOrGetBatch(batchDate: string, targetCount: number) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(workflowBatches).where(eq(workflowBatches.batchDate, batchDate)).limit(1);
  if (existing.length > 0) return existing[0];
  const result = await db.insert(workflowBatches).values({ batchDate, totalEvents: targetCount });
  return { id: result[0].insertId, batchDate, status: "gathering" as const, totalEvents: targetCount };
}

export async function updateBatchStatus(id: number, status: string, totalEvents?: number, articlesGenerated?: number) {
  const db = await getDb();
  if (!db) return;
  const updates: Record<string, unknown> = { status };
  if (totalEvents !== undefined) updates.totalEvents = totalEvents;
  if (articlesGenerated !== undefined) updates.articlesGenerated = articlesGenerated;
  await db.update(workflowBatches).set(updates).where(eq(workflowBatches.id, id));
}

export async function createArticleFromWorkflow(data: {
  headline: string;
  subheadline: string;
  body: string;
  slug: string;
  status: string;
  categoryId: number | null;
  batchDate: string;
  sourceEvent: string;
  sourceUrl: string;
  feedSourceId?: number | null;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  // Skip duplicates
  const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, data.slug)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(articles).values({
    headline: data.headline,
    subheadline: data.subheadline,
    body: data.body,
    slug: data.slug,
    status: data.status as any,
    categoryId: data.categoryId,
    batchDate: data.batchDate,
    sourceEvent: data.sourceEvent,
    sourceUrl: data.sourceUrl,
    feedSourceId: data.feedSourceId ?? null,
  });
  return result[0].insertId;
}

// Default settings to seed on first run
export const DEFAULT_SETTINGS: InsertWorkflowSetting[] = [
  // Content Generation
  { key: "articles_per_batch", value: "20", label: "Articles Per Batch", description: "Number of news events to gather and generate articles for each daily run.", category: "generation", type: "number" },
  { key: "ai_writing_style", value: "onion", label: "AI Writing Style", description: "Default satirical writing style for AI-generated articles.", category: "generation", type: "string" },
  { key: "llm_model", value: "gemini-2.5-flash", label: "LLM Model", description: "The AI model used for article generation. Default: gemini-2.5-flash", category: "ai", type: "string" },
  { key: "ai_custom_prompt", value: "", label: "Custom AI Prompt", description: "Additional instructions appended to the AI generation prompt. Leave empty to use defaults.", category: "generation", type: "text" },
  // ── Pipeline Quality Fixes (CEO Directive) ──
  { key: "selector_window_size", value: "200", label: "Selector Window Size", description: "Number of RSS entries passed to the AI selector. Higher = more variety but slower. Default: 200.", category: "generation", type: "number" },
  { key: "candidate_expiry_hours", value: "48", label: "Candidate Expiry (hours)", description: "v4.0: How many hours a selector_candidates row stays pending before being marked expired. Default: 48.", category: "generation", type: "number" },
  // v4.5.0: Candidate scoring thresholds
  { key: "score_high_threshold", value: "0.70", label: "High Potential Score Threshold", description: "v4.5: Composite score >= this value = high article potential. Range 0-1. Default: 0.70.", category: "generation", type: "number" },
  { key: "min_score_threshold", value: "0.40", label: "Medium Potential Score Threshold", description: "v4.5: Composite score >= this value = medium article potential. Below = low. Range 0-1. Default: 0.40.", category: "generation", type: "number" },
  { key: "min_score_to_publish", value: "0.30", label: "Minimum Score to Publish", description: "v4.5: Candidates with composite score below this value are skipped by the production loop. Default: 0.30.", category: "generation", type: "number" },
  // v4.5.0: Score-based expiry windows
  { key: "expiry_breaking_hours", value: "6", label: "Breaking News Expiry (hours)", description: "v4.5: Hours before a breaking news candidate (recency > 0.8) expires. Default: 6.", category: "generation", type: "number" },
  { key: "expiry_trending_hours", value: "18", label: "Trending News Expiry (hours)", description: "v4.5: Hours before a trending candidate (recency 0.4-0.8) expires. Default: 18.", category: "generation", type: "number" },
  { key: "expiry_evergreen_hours", value: "72", label: "Evergreen Content Expiry (hours)", description: "v4.5: Hours before an evergreen candidate (recency < 0.4) expires. Default: 72.", category: "generation", type: "number" },
  // v4.5.1: Continuous production loop (pool-drain model)
  { key: "production_loop_enabled", value: "true", label: "Continuous Production Loop", description: "v4.5.1: Enable the production loop that drains the candidate pool throughout the day.", category: "generation", type: "boolean" },
  { key: "production_mode", value: "hybrid", label: "Production Mode", description: "v4.5.1: legacy = scheduled runs only, continuous = loop only, hybrid = both (default).", category: "generation", type: "string" },
  { key: "production_interval_minutes", value: "15", label: "Production Loop Interval (minutes)", description: "v4.5.1: How often the production loop runs. Default: 15. Range: 1-60.", category: "generation", type: "number" },
  { key: "max_daily_articles", value: "500", label: "Max Daily Articles (Safety Cap)", description: "v4.5.1: Hard daily limit on articles created. Emergency brake — prevents runaway costs. Default: 500.", category: "generation", type: "number" },
  { key: "max_batch_high", value: "25", label: "Max High-Potential Articles per Loop Run", description: "v4.5.1: Max articles to generate from the high-potential pool per loop tick. Default: 25.", category: "generation", type: "number" },
  { key: "max_batch_medium", value: "10", label: "Max Medium-Potential Articles per Loop Run", description: "v4.5.1: Max articles to generate from the medium-potential pool per loop tick. Default: 10.", category: "generation", type: "number" },
  { key: "pool_min_size", value: "10", label: "Minimum Candidate Pool Size", description: "v4.5: Alert threshold: if pending candidates drop below this number, the CEO dashboard shows a warning. Default: 10.", category: "generation", type: "number" },
  { key: "x_listener_enabled", value: "false", label: "X/Twitter Listener", description: "v4.0: Enable X/Twitter search as a content source. Requires X API Basic tier credentials.", category: "generation", type: "boolean" },
  { key: "x_listener_queries", value: "", label: "X Listener Search Queries", description: "v4.0: One search query per line. Each query fetches up to 10 recent tweets for the candidate pool.", category: "generation", type: "text" },
  { key: "reddit_listener_enabled", value: "false", label: "Reddit Listener", description: "v4.0: Enable Reddit hot posts as a content source. No API key required.", category: "generation", type: "boolean" },
  { key: "reddit_listener_subreddits", value: "", label: "Reddit Subreddits", description: "v4.0: One subreddit per line (with or without r/ prefix). Fetches top 10 hot posts per subreddit.", category: "generation", type: "text" },
  { key: "headline_dedup_enabled", value: "true", label: "Headline Dedup", description: "Skip RSS entries whose titles closely match headlines published in the last 3 days.", category: "generation", type: "boolean" },
  { key: "headline_dedup_days", value: "3", label: "Headline Dedup Window (days)", description: "How many days back to check for duplicate headlines.", category: "generation", type: "number" },
  { key: "topic_cluster_enabled", value: "true", label: "Topic Clustering", description: "Group similar RSS entries by topic before AI selection to prevent 10 articles on the same story.", category: "generation", type: "boolean" },
  { key: "topic_cluster_max_per_cluster", value: "2", label: "Max Entries Per Topic Cluster", description: "Maximum number of entries from the same topic cluster passed to the AI selector.", category: "generation", type: "number" },
  { key: "cross_batch_memory_enabled", value: "true", label: "Cross-Batch Topic Memory", description: "Track topics covered in recent batches and exclude them from the selector prompt.", category: "generation", type: "boolean" },
  { key: "cross_batch_memory_days", value: "2", label: "Cross-Batch Memory Window (days)", description: "How many days of covered topics to exclude from new batches.", category: "generation", type: "number" },
  { key: "category_quotas_enabled", value: "true", label: "Category Quotas in Selector", description: "Inject hard category quotas into the AI selector prompt to enforce content mix.", category: "generation", type: "boolean" },
  { key: "default_status", value: "pending", label: "Default Article Status", description: "Status assigned to newly generated articles (draft, pending).", category: "generation", type: "string" },
  { key: "target_article_length", value: "200", label: "Target Article Length (words)", description: "Target word count for AI-generated articles. The AI will aim for approximately this many words per article.", category: "generation", type: "number" },
  { key: "auto_generate_images", value: "true", label: "Auto-Generate Images", description: "Automatically generate featured images for each article.", category: "generation", type: "boolean" },

  // Image Generation Providers
  { key: "image_provider", value: "none", label: "Image Provider", description: "Primary image generation provider (none, manus, openai, replicate, custom). Defaults to none — must be explicitly configured before image generation will work.", category: "image_providers", type: "string" },
  { key: "image_style_prompt", value: "Professional editorial illustration, clean modern style", label: "Image Style Prompt", description: "Base style description for image generation (e.g., 'Editorial cartoon illustration, satirical style' or 'Photorealistic, high detail, professional photography').", category: "image_providers", type: "text" },
  { key: "image_style_keywords", value: "High quality, sharp detail, professional photography aesthetic. No text or words in the image.", label: "Image Style Keywords", description: "Additional style keywords appended to the prompt (e.g., 'Bold colors, exaggerated proportions' or '8k resolution, cinematic lighting, sharp focus').", category: "image_providers", type: "text" },
  { key: "image_provider_fallback_enabled", value: "true", label: "Enable Fallback to Manus", description: "If the primary provider fails, automatically fall back to the built-in Manus provider.", category: "image_providers", type: "boolean" },
  { key: "image_provider_openai_api_key", value: "", label: "OpenAI API Key", description: "API key for OpenAI DALL-E image generation.", category: "image_providers", type: "string" },
  { key: "image_provider_replicate_api_key", value: "", label: "Replicate API Key", description: "API key for Replicate image generation.", category: "image_providers", type: "string" },
  { key: "image_provider_replicate_model", value: "black-forest-labs/flux-schnell", label: "Replicate Model", description: "Replicate model version ID or name (e.g., black-forest-labs/flux-schnell).", category: "image_providers", type: "string" },
  { key: "image_provider_custom_api_url", value: "", label: "Custom API URL", description: "Full URL for custom image generation API endpoint.", category: "image_providers", type: "string" },
   { key: "image_provider_custom_api_key", value: "", label: "Custom API Key", description: "API key for custom image generation API (if required).", category: "image_providers", type: "string" },
  { key: "image_aspect_ratio", value: "1:1", label: "Image Aspect Ratio", description: "Aspect ratio for generated images. Google recommends 1:1 or 16:9 for best display in search results and Discover.", category: "image_providers", type: "string" },
  { key: "image_llm_system_prompt", value: "You are an art director for a professional news publication. Create a concise image generation prompt for an illustration that matches the article's topic. The image should be visually striking and editorially appropriate. Return ONLY the prompt text, under 100 words.", label: "Image LLM System Prompt", description: "System prompt used by the LLM when generating image descriptions from article headlines. Controls the art direction style.", category: "image_providers", type: "text" },
  // Watermark
  { key: "watermark_enabled", value: "false", label: "Enable Watermark", description: "Add watermark overlay to generated images.", category: "image_providers", type: "boolean" },
  { key: "watermark_text", value: "", label: "Watermark Text", description: "Text shown in watermark. Leave empty to use site URL.", category: "image_providers", type: "string" },
  { key: "watermark_position", value: "bottom-right", label: "Watermark Position", description: "Corner of image where watermark appears.", category: "image_providers", type: "string" },
  { key: "watermark_font_size", value: "16", label: "Watermark Font Size", description: "Base font size for watermark text (scales with image).", category: "image_providers", type: "number" },
  { key: "watermark_text_color", value: "255,255,255", label: "Watermark Text Color", description: "RGB color for watermark text.", category: "image_providers", type: "string" },
  { key: "watermark_bg_opacity", value: "60", label: "Watermark Background Opacity", description: "Opacity of watermark background (0-100).", category: "image_providers", type: "number" },
  // Real Image Sourcing (licensed photos from free image APIs)
  { key: "real_image_sourcing_enabled", value: "false", label: "Enable Real Image Sourcing", description: "Search free image APIs (Flickr CC, Wikimedia, Unsplash, Pexels, Pixabay) for real photos before falling back to AI generation.", category: "image_providers", type: "boolean" },
  { key: "real_image_fallback", value: "ai_generate", label: "Fallback When No Real Image Found", description: "What to use when no real image meets the relevance threshold: ai_generate, branded_card, or none.", category: "image_providers", type: "string" },
  { key: "real_image_relevance_threshold", value: "0.4", label: "Relevance Threshold", description: "Minimum relevance score (0.0-1.0) for a real image to be used. Lower = more permissive.", category: "image_providers", type: "number" },
  { key: "flickr_api_key", value: "", label: "Flickr API Key", description: "API key for Flickr Creative Commons image search.", category: "image_providers", type: "string" },
  { key: "unsplash_access_key", value: "", label: "Unsplash Access Key", description: "Access key for Unsplash free image search.", category: "image_providers", type: "string" },
  { key: "pexels_api_key", value: "", label: "Pexels API Key", description: "API key for Pexels free stock photo search.", category: "image_providers", type: "string" },
  { key: "pixabay_api_key", value: "", label: "Pixabay API Key", description: "API key for Pixabay free image search.", category: "image_providers", type: "string" },

  // Google Custom Search Image Crawler (Real Image Sourcing v2)
  { key: "google_cse_api_key", value: "", label: "Google Custom Search API Key", description: "API key for Google Programmable Search Engine image search. Get from https://developers.google.com/custom-search/v1/introduction", category: "image_providers", type: "string" },
  { key: "google_cse_cx", value: "", label: "Google Search Engine ID (cx)", description: "Programmable Search Engine ID. Create at https://programmablesearchengine.google.com", category: "image_providers", type: "string" },
  { key: "image_crawler_enabled", value: "false", label: "Enable Google Image Crawler", description: "Use Google Custom Search to find real images for articles before falling back to stock APIs. Requires google_cse_api_key and google_cse_cx.", category: "image_providers", type: "boolean" },
  { key: "image_validation_enabled", value: "true", label: "Enable AI Image Validation", description: "Run AI relevance + safety check on each candidate image before using it. Rejects irrelevant, unsafe, or entity-mismatched images.", category: "image_providers", type: "boolean" },
  { key: "image_library_reuse_enabled", value: "true", label: "Enable Image Library Reuse", description: "Check the local image library for matching tagged images before searching Google. Faster and cheaper over time.", category: "image_providers", type: "boolean" },
  { key: "image_max_reuse_count", value: "3", label: "Max Image Reuse Count", description: "Maximum times a library image can be reused before preferring fresh images. Set to 0 to always fetch new images.", category: "image_providers", type: "number" },

  // Video Generation Providers
  { key: "auto_generate_videos", value: "false", label: "Auto-Generate Videos", description: "Automatically generate videos for each article during the workflow.", category: "video_providers", type: "boolean" },
  { key: "video_provider", value: "manus", label: "Video Provider", description: "Primary video generation provider (manus, openai, replicate, custom).", category: "video_providers", type: "string" },
  { key: "video_duration", value: "5", label: "Video Duration (seconds)", description: "Default duration for generated videos (5-60 seconds).", category: "video_providers", type: "number" },
  { key: "video_aspect_ratio", value: "16:9", label: "Video Aspect Ratio", description: "Aspect ratio for generated videos (16:9, 9:16, or 1:1).", category: "video_providers", type: "string" },
  { key: "video_style_prompt", value: "Professional news broadcast style, high production quality, cinematic lighting", label: "Video Style Prompt", description: "Base style description for video generation.", category: "video_providers", type: "text" },
  { key: "video_provider_fallback_enabled", value: "true", label: "Enable Fallback to Manus", description: "If the primary video provider fails, automatically fall back to the built-in Manus provider.", category: "video_providers", type: "boolean" },
  { key: "video_provider_openai_api_key", value: "", label: "OpenAI API Key", description: "API key for OpenAI video generation (future support).", category: "video_providers", type: "string" },
  { key: "video_provider_replicate_api_key", value: "", label: "Replicate API Key", description: "API key for Replicate video generation (Runway, Kling, etc.).", category: "video_providers", type: "string" },
  { key: "video_provider_replicate_model", value: "runway/gen-3-lite", label: "Replicate Model", description: "Replicate model version ID or name for video generation (e.g., runway/gen-3-lite, kling-ai/kling-v1).", category: "video_providers", type: "string" },
  { key: "video_provider_custom_api_url", value: "", label: "Custom API URL", description: "Full URL for custom video generation API endpoint.", category: "video_providers", type: "string" },
  { key: "video_provider_custom_api_key", value: "", label: "Custom API Key", description: "API key for custom video generation API (if required).", category: "video_providers", type: "string" },

  // News Sources
  { key: "rss_feeds", value: JSON.stringify([
    "https://feeds.reuters.com/reuters/topNews",
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    "https://feeds.npr.org/1001/rss.xml",
    "https://feeds.washingtonpost.com/rss/national",
    "https://rss.cnn.com/rss/edition.rss",
    "https://feeds.theguardian.com/theguardian/world/rss",
  ]), label: "RSS Feed Sources", description: "JSON array of RSS feed URLs to gather news from.", category: "sources", type: "json" },
  { key: "use_google_news", value: "true", label: "Include Google News", description: "Also gather trending stories from Google News.", category: "sources", type: "boolean" },
  { key: "news_regions", value: "US,GB", label: "News Regions", description: "Comma-separated region codes for news gathering (e.g., US, GB, AU).", category: "sources", type: "string" },

  // Reddit Integration
  { key: "reddit_enabled", value: "false", label: "Enable Reddit Posting", description: "Automatically post articles to Reddit when published.", category: "reddit", type: "boolean" },
  { key: "reddit_client_id", value: "", label: "Reddit Client ID", description: "Reddit app client ID from https://www.reddit.com/prefs/apps", category: "reddit", type: "string" },
  { key: "reddit_client_secret", value: "", label: "Reddit Client Secret", description: "Reddit app client secret.", category: "reddit", type: "string" },
  { key: "reddit_username", value: "", label: "Reddit Username", description: "Reddit account username for posting.", category: "reddit", type: "string" },
  { key: "reddit_password", value: "", label: "Reddit Password", description: "Reddit account password. If 2FA enabled, use format: password:123456", category: "reddit", type: "string" },
  { key: "reddit_subreddit", value: "test", label: "Target Subreddit", description: "Subreddit to post to (without r/). Use 'test' for testing.", category: "reddit", type: "string" },
  { key: "reddit_post_type", value: "link", label: "Post Type", description: "Type of Reddit post: 'link' (direct link to article) or 'text' (text post with link in body).", category: "reddit", type: "string" },
  { key: "reddit_title_template", value: "{{headline}}", label: "Post Title Template", description: "Template for Reddit post title. Use {{headline}} for article headline.", category: "reddit", type: "text" },

  // Publishing
  { key: "auto_approve_enabled", value: "false", label: "Auto-Approve Pending Articles", description: "Automatically approve pending articles after a set number of hours if not manually rejected.", category: "publishing", type: "boolean" },
  { key: "auto_approve_after_hours", value: "4", label: "Auto-Approve After (hours)", description: "Number of hours a pending article waits before being automatically approved.", category: "publishing", type: "number" },
  { key: "auto_publish_approved", value: "false", label: "Auto-Publish Approved", description: "Automatically publish articles once approved (skip manual publish step).", category: "publishing", type: "boolean" },
  { key: "publish_delay_minutes", value: "0", label: "Publish Delay (minutes)", description: "Delay in minutes between approving and publishing. Set to 0 for immediate.", category: "publishing", type: "number" },
  { key: "max_publish_per_day", value: "20", label: "Max Publications Per Day", description: "Maximum number of articles to publish in a single day. Excess articles stay approved.", category: "publishing", type: "number" },
  { key: "stagger_interval_minutes", value: "30", label: "Stagger Interval (minutes)", description: "Minutes between each article publication for staggered release. 0 = all at once.", category: "publishing", type: "number" },

  // Social Media
  { key: "site_url", value: "https://example.com", label: "Site URL", description: "Your custom domain URL (e.g., https://yournewssite.com). Used in social media posts and RSS feeds.", category: "social", type: "string" },
  { key: "trending_time_window_hours", value: "24", label: "Trending Time Window (hours)", description: "Time window in hours for calculating trending articles on the homepage (e.g., 24 for last 24 hours, 168 for last week).", category: "homepage", type: "number" },
  { key: "homepage_show_ticker", value: "true", label: "Show Latest Headlines Ticker", description: "Display a scrolling banner at the top showing the most recent breaking news stories.", category: "homepage", type: "boolean" },
  { key: "homepage_show_trending", value: "true", label: "Show Trending & Popular Section", description: "Display a dedicated section showing articles that are getting the most reader engagement and views.", category: "homepage", type: "boolean" },
  { key: "homepage_show_categories", value: "true", label: "Show Category-Based Article Grid", description: "Display articles organized by topic (Business, Entertainment, Politics, etc.) for easier browsing.", category: "homepage", type: "boolean" },
  { key: "homepage_show_sidebar", value: "true", label: "Show Right Sidebar (Ads & Widgets)", description: "Display the right sidebar containing advertisement spaces and additional content widgets.", category: "homepage", type: "boolean" },
  // Platform enable/disable toggles
  { key: "dist_enabled_x", value: "true", label: "X/Twitter Enabled", description: "Enable X/Twitter distribution.", category: "social", type: "boolean" },
  { key: "dist_enabled_reddit", value: "false", label: "Reddit Enabled", description: "Enable Reddit distribution.", category: "social", type: "boolean" },
  { key: "dist_enabled_facebook", value: "false", label: "Facebook Enabled", description: "Enable Facebook distribution.", category: "social", type: "boolean" },
  { key: "dist_enabled_instagram", value: "false", label: "Instagram Enabled", description: "Enable Instagram distribution.", category: "social", type: "boolean" },
  { key: "dist_enabled_bluesky", value: "false", label: "Bluesky Enabled", description: "Enable Bluesky distribution.", category: "social", type: "boolean" },
  { key: "dist_enabled_threads", value: "false", label: "Threads Enabled", description: "Enable Threads distribution.", category: "social", type: "boolean" },
  { key: "dist_enabled_linkedin", value: "false", label: "LinkedIn Enabled", description: "Enable LinkedIn distribution.", category: "social", type: "boolean" },
  { key: "auto_create_social_posts", value: "true", label: "Auto-Create Social Posts", description: "Automatically generate social media posts when articles are published.", category: "social", type: "boolean" },
  { key: "x_auto_queue_on_publish", value: "true", label: "Auto-Queue X Posts on Publish", description: "Automatically move Twitter/X draft posts to the scheduled queue when articles are published.", category: "social", type: "boolean" },
  { key: "social_platforms", value: "twitter,facebook,linkedin", label: "Social Platforms", description: "Comma-separated list of platforms to generate posts for.", category: "social", type: "string" },
  // FeedHive settings archived to /archive/feedhive/db-settings.ts (Feb 21, 2026)

  /**
   * DEFAULT_SETTINGS — Seed values for new installs and backfill for upgrades.
   *
   * ⚠️ CRITICAL: These defaults are inserted into EVERY deployment's database,
   * including white-label clients. NEVER use deployment-specific brand values here.
   * All brand_* values must be generic placeholders or empty strings.
   *
   * JAIME.IO's own brand values are set via the Setup Wizard or Admin → Settings,
   * NOT through seed defaults.
   */
  // Branding — Brand Identity
  { key: "brand_site_name", value: "", label: "Site Name", description: "The name of your publication displayed in the header, footer, and SEO tags.", category: "branding", type: "string" },
  { key: "brand_tagline", value: "", label: "Tagline", description: "Short tagline displayed below the site name in the masthead.", category: "branding", type: "string" },
  { key: "brand_description", value: "", label: "Description", description: "Longer description used in the footer and meta tags.", category: "branding", type: "text" },
  { key: "brand_logo_url", value: "/logo.svg", label: "Logo URL", description: "URL to your site logo image (SVG or PNG recommended).", category: "branding", type: "string" },
  { key: "brand_favicon_url", value: "/favicon.ico", label: "Favicon URL", description: "URL to your browser tab icon (ICO, PNG, or SVG, 32×32px or 64×64px).", category: "branding", type: "string" },
  // v4.9.1: white-label attribution — set to empty string to hide the link
  { key: "powered_by_url", value: "https://getjaime.io", label: "Powered By URL", description: "If set, a subtle 'Powered by JAIME.IO Engine' link appears in the footer. Clear this field to remove the link (white-label opt-out).", category: "branding", type: "string" },

  // Masthead customization (v4.9.6)
  { key: "masthead_bg_color", value: "", label: "Masthead Background Color", description: "Background color of the masthead area. Leave blank to use the primary brand color.", category: "branding", type: "string" },
  { key: "masthead_text_color", value: "#ffffff", label: "Masthead Text Color", description: "Text color for site name and tagline in the masthead.", category: "branding", type: "string" },
  { key: "masthead_font_family", value: "serif", label: "Masthead Font Family", description: "Font style: serif (classic/editorial), sans-serif (modern/clean), or a custom Google Font name (e.g. Playfair Display).", category: "branding", type: "string" },
  { key: "masthead_font_size", value: "large", label: "Masthead Font Size", description: "Site name size: small, medium, large, or extra-large.", category: "branding", type: "string" },
  { key: "masthead_layout", value: "center", label: "Masthead Layout", description: "Alignment: center (site name centered), left (site name left-aligned), or logo-only (show only the logo image, no text).", category: "branding", type: "string" },
  { key: "masthead_show_tagline", value: "true", label: "Show Tagline", description: "Show or hide the tagline below the site name.", category: "branding", type: "boolean" },
  { key: "masthead_show_date", value: "true", label: "Show Date Bar", description: "Show or hide the date bar above the masthead.", category: "branding", type: "boolean" },
  { key: "masthead_date_bg_color", value: "", label: "Date Bar Background Color", description: "Background color of the date bar. Leave blank to use the masthead background color.", category: "branding", type: "string" },
  { key: "masthead_logo_height", value: "60", label: "Logo Height (px)", description: "Logo height in pixels when a logo image is used. Width scales proportionally.", category: "branding", type: "number" },
  { key: "masthead_padding", value: "medium", label: "Masthead Padding", description: "Vertical spacing: compact, medium, or spacious.", category: "branding", type: "string" },
  { key: "masthead_border_bottom", value: "false", label: "Show Bottom Border", description: "Show a border line below the masthead.", category: "branding", type: "boolean" },
  { key: "masthead_border_color", value: "", label: "Masthead Border Color", description: "Color of the bottom border if enabled. Leave blank for a subtle default.", category: "branding", type: "string" },

  // Branding — Colors
  { key: "brand_color_primary", value: "#dc2626", label: "Primary Color", description: "Main brand color used for accents, buttons, and highlights.", category: "branding", type: "string" },
  { key: "brand_color_secondary", value: "#1e40af", label: "Secondary Color", description: "Secondary accent color.", category: "branding", type: "string" },

  // Branding — Contact
  { key: "brand_contact_email", value: "contact@example.com", label: "Contact Email", description: "General contact email displayed on the Contact page.", category: "branding", type: "string" },
  { key: "brand_editor_email", value: "editor@example.com", label: "Editor Email", description: "Editor email for editorial inquiries.", category: "branding", type: "string" },
  { key: "brand_privacy_email", value: "privacy@example.com", label: "Privacy Email", description: "Email for privacy-related inquiries.", category: "branding", type: "string" },
  { key: "brand_legal_email", value: "legal@example.com", label: "Legal Email", description: "Email for legal inquiries and terms of service.", category: "branding", type: "string" },
  { key: "brand_corrections_email", value: "corrections@example.com", label: "Corrections Email", description: "Email for corrections and editorial standards.", category: "branding", type: "string" },
  { key: "brand_moderation_email", value: "moderation@example.com", label: "Moderation Email", description: "Email for community moderation issues.", category: "branding", type: "string" },

  // Branding — Social
  { key: "brand_twitter_handle", value: "", label: "X/Twitter Handle", description: "Your X/Twitter handle (e.g., @YourBrand).", category: "branding", type: "string" },
  { key: "brand_twitter_url", value: "", label: "X/Twitter URL", description: "Full URL to your X/Twitter profile.", category: "branding", type: "string" },
  { key: "brand_facebook_url", value: "", label: "Facebook URL", description: "Full URL to your Facebook page.", category: "branding", type: "string" },
  { key: "brand_instagram_url", value: "", label: "Instagram URL", description: "Full URL to your Instagram profile.", category: "branding", type: "string" },
  { key: "brand_bluesky_url", value: "", label: "Bluesky URL", description: "Full URL to your Bluesky profile.", category: "branding", type: "string" },
  { key: "brand_threads_url", value: "", label: "Threads URL", description: "Full URL to your Threads profile.", category: "branding", type: "string" },
  { key: "brand_linkedin_url", value: "", label: "LinkedIn URL", description: "Full URL to your LinkedIn page.", category: "branding", type: "string" },

  // Branding — Legal
  { key: "brand_company_name", value: "Your Company Name", label: "Company Name", description: "Legal company name used in Terms of Service and Privacy Policy.", category: "branding", type: "string" },
  { key: "brand_founded_year", value: "2026", label: "Founded Year", description: "Year the publication was founded.", category: "branding", type: "string" },
  { key: "brand_launch_date", value: "2026-02-19", label: "Launch Date", description: "The date the publication went live (YYYY-MM-DD). Used to calculate \"Days Since Launch\" in the CEO Dashboard.", category: "branding", type: "string" },

  // Branding — Content
  { key: "brand_genre", value: "satire", label: "Content Genre", description: "Primary content genre (e.g., satire, news, tech, entertainment). Used by the scoring engine to evaluate editorial potential.", category: "branding", type: "string" },
  { key: "brand_tone", value: "", label: "Content Tone", description: "Default editorial tone (e.g., satirical, professional, casual, humorous).", category: "branding", type: "string" },
  { key: "brand_editorial_team", value: "", label: "Editorial Team Name", description: "Name used for article bylines and schema.org author attribution.", category: "branding", type: "string" },
  // Branding — SEO
  { key: "brand_seo_keywords", value: "", label: "SEO Keywords", description: "Comma-separated keywords for meta tags.", category: "branding", type: "text" },
  { key: "brand_og_image", value: "", label: "Default OG Image", description: "Default Open Graph image URL for social sharing.", category: "branding", type: "string" },
  { key: "brand_disclaimer", value: "", label: "Footer Disclaimer", description: "Legal disclaimer shown in the footer. Leave blank to auto-generate from genre.", category: "branding", type: "text" },

  { key: "article_comments_enabled", value: "false", label: "Article Comments", description: "Allow readers to leave comments on articles. Requires a Disqus shortname.", category: "games", type: "boolean" },
  { key: "disqus_shortname", value: "", label: "Disqus Shortname", description: "Your Disqus site shortname (e.g., 'mysite' from mysite.disqus.com). Required when article comments are enabled.", category: "games", type: "string" },

  // Schedule
  { key: "workflow_enabled", value: "true", label: "Workflow Enabled", description: "Master switch to enable/disable the daily automated workflow.", category: "schedule", type: "boolean" },
  { key: "schedule_hour", value: "5", label: "Schedule Hour (Run 1)", description: "Hour of day (0-23) for the first daily workflow run, in the configured timezone.", category: "schedule", type: "number" },
  { key: "schedule_minute", value: "0", label: "Schedule Minute (Run 1)", description: "Minute of the hour (0-59) for the first daily workflow run.", category: "schedule", type: "number" },
  { key: "schedule_timezone", value: "America/Los_Angeles", label: "Timezone", description: "IANA timezone for the schedule (e.g., America/Los_Angeles, America/New_York, UTC).", category: "schedule", type: "string" },
  { key: "schedule_days", value: "mon,tue,wed,thu,fri", label: "Schedule Days", description: "Comma-separated days to run the workflow (mon,tue,wed,thu,fri,sat,sun).", category: "schedule", type: "string" },
  { key: "schedule_runs_per_day", value: "4", label: "Runs Per Day", description: "Number of workflow runs per day (1-4). With 4 runs, articles are spread across morning, midday, evening, and night.", category: "schedule", type: "number" },
  { key: "schedule_run2_hour", value: "11", label: "Schedule Hour (Run 2)", description: "Hour of day (0-23) for the second daily workflow run. Only used if Runs Per Day >= 2.", category: "schedule", type: "number" },
  { key: "schedule_run2_minute", value: "0", label: "Schedule Minute (Run 2)", description: "Minute of the hour (0-59) for the second daily workflow run.", category: "schedule", type: "number" },
  { key: "schedule_run3_hour", value: "17", label: "Schedule Hour (Run 3)", description: "Hour of day (0-23) for the third daily workflow run. Only used if Runs Per Day >= 3.", category: "schedule", type: "number" },
  { key: "schedule_run3_minute", value: "0", label: "Schedule Minute (Run 3)", description: "Minute of the hour (0-59) for the third daily workflow run.", category: "schedule", type: "number" },
  { key: "schedule_run4_hour", value: "22", label: "Schedule Hour (Run 4)", description: "Hour of day (0-23) for the fourth daily workflow run. Only used if Runs Per Day >= 4.", category: "schedule", type: "number" },
  { key: "schedule_run4_minute", value: "0", label: "Schedule Minute (Run 4)", description: "Minute of the hour (0-59) for the fourth daily workflow run.", category: "schedule", type: "number" },

  // Promotion Candidates
  { key: "promo_enabled", value: "true", label: "Enable Promotion Candidates", description: "Surface articles that qualify for paid promotion on the CEO Dashboard.", category: "promotion", type: "boolean" },
  { key: "promo_max_age_hours", value: "48", label: "Max Article Age (hours)", description: "Only consider articles published within this window. Older articles won't appear as candidates.", category: "promotion", type: "number" },
  { key: "promo_min_x_views", value: "3", label: "Min X Views", description: "Minimum page views from X (Twitter) traffic required to qualify as a promotion candidate.", category: "promotion", type: "number" },
  { key: "promo_min_affiliate_ctr", value: "0", label: "Min Affiliate CTR (%)", description: "Minimum affiliate click-through rate required. Set to 0 to ignore affiliate performance in qualification.", category: "promotion", type: "number" },
  { key: "promo_max_candidates", value: "10", label: "Max Candidates Shown", description: "Maximum number of promotion candidates to display on the CEO Dashboard.", category: "promotion", type: "number" },
  { key: "promo_category_cap", value: "3", label: "Max Per Category", description: "Maximum number of candidates from the same category. Prevents over-representing a single category.", category: "promotion", type: "number" },

  // Monetization — Sponsor Bar (Adsterra)
  { key: "sponsor_bar_enabled", value: "false", label: "Enable Sponsor Bar", description: "Show a slim sponsor strip at the top of article, homepage, and category pages.", category: "monetization", type: "boolean" },
  { key: "sponsor_bar_url", value: "", label: "Sponsor Bar URL", description: "Adsterra Smartlink or other sponsor destination URL. Clicks are tracked via /api/go/sponsor.", category: "monetization", type: "string" },
  { key: "sponsor_bar_label", value: "Today's Sponsor", label: "Sponsor Bar Label", description: "Label text shown before the CTA (e.g., \"Today's Sponsor\").", category: "monetization", type: "string" },
  { key: "sponsor_bar_cta", value: "Learn More", label: "Sponsor Bar CTA Text", description: "Call-to-action link text in the sponsor bar.", category: "monetization", type: "string" },
  { key: "sponsor_bar_bg_color", value: "#F0F0F0", label: "Sponsor Bar Background Color", description: "Background color of the sponsor strip.", category: "monetization", type: "string" },
  { key: "sponsor_bar_border_color", value: "#D0D0D0", label: "Sponsor Bar Border Color", description: "Bottom border color of the sponsor strip.", category: "monetization", type: "string" },
  { key: "sponsor_bar_label_color", value: "#525252", label: "Sponsor Bar Label Text Color", description: "Color of the small uppercase label text.", category: "monetization", type: "string" },
  { key: "sponsor_bar_link_color", value: "#9B1830", label: "Sponsor Bar Link Color", description: "Color of the clickable CTA link.", category: "monetization", type: "string" },
  { key: "sponsor_bar_image_url", value: "", label: "Sponsor Bar Image URL", description: "Optional sponsor image URL. When set, displays the image instead of label+CTA text. Image is clickable and links to the Sponsor URL.", category: "monetization", type: "string" },
  // ─── Article Sponsor Banner ────────────────────────────────────────────────
  { key: "article_sponsor_enabled", value: "false", label: "Enable Article Sponsor Banner", description: "Show a sponsor banner below article content and above share buttons.", category: "monetization", type: "boolean" },
  { key: "article_sponsor_url", value: "", label: "Article Sponsor URL", description: "Destination URL for the article sponsor. Clicks tracked via /api/go/article-sponsor.", category: "monetization", type: "string" },
  { key: "article_sponsor_label", value: "Sponsored", label: "Article Sponsor Label", description: "Small uppercase label shown in the banner header.", category: "monetization", type: "string" },
  { key: "article_sponsor_cta", value: "Learn More", label: "Article Sponsor CTA Text", description: "Call-to-action button text.", category: "monetization", type: "string" },
  { key: "article_sponsor_description", value: "", label: "Article Sponsor Description", description: "Optional body text shown in the banner. Leave blank for the default fallback.", category: "monetization", type: "text" },
  { key: "article_sponsor_image_url", value: "", label: "Article Sponsor Image URL", description: "Optional sponsor image. When set, displays the image instead of description+CTA. Clickable, links to Article Sponsor URL.", category: "monetization", type: "string" },
  { key: "article_sponsor_bg_color", value: "#FFFFFF", label: "Article Sponsor Background Color", description: "Background color of the banner body.", category: "monetization", type: "string" },
  { key: "article_sponsor_border_color", value: "#D0D0D0", label: "Article Sponsor Border Color", description: "Border color around the banner.", category: "monetization", type: "string" },
  { key: "article_sponsor_header_bg_color", value: "#F0F0F0", label: "Article Sponsor Header Background", description: "Background color of the banner header strip.", category: "monetization", type: "string" },
  { key: "article_sponsor_cta_bg_color", value: "#C41E3A", label: "Article Sponsor CTA Button Color", description: "Background color of the CTA button.", category: "monetization", type: "string" },
  { key: "article_sponsor_cta_text_color", value: "#FFFFFF", label: "Article Sponsor CTA Text Color", description: "Text color of the CTA button.", category: "monetization", type: "string" },
  // ─── Sponsor Scheduling ────────────────────────────────────────────────────
  { key: "sponsor_bar_active_from", value: "", label: "Sponsor Bar Active From", description: "ISO datetime when sponsor bar goes live (e.g. 2026-04-01T00:00:00). Leave blank for no start restriction.", category: "monetization", type: "string" },
  { key: "sponsor_bar_active_until", value: "", label: "Sponsor Bar Active Until", description: "ISO datetime when sponsor bar expires. Leave blank for no end restriction.", category: "monetization", type: "string" },
  { key: "article_sponsor_active_from", value: "", label: "Article Sponsor Active From", description: "ISO datetime when article sponsor banner goes live. Leave blank for no start restriction.", category: "monetization", type: "string" },
  { key: "article_sponsor_active_until", value: "", label: "Article Sponsor Active Until", description: "ISO datetime when article sponsor banner expires. Leave blank for no end restriction.", category: "monetization", type: "string" },
  // ─── A/B Sponsor Testing ───────────────────────────────────────────────────
  { key: "article_sponsor_ab_test_enabled", value: "false", label: "Enable A/B Sponsor Test", description: "When enabled, randomly serves variant A or B to readers and tracks clicks separately.", category: "monetization", type: "boolean" },
  { key: "article_sponsor_b_label", value: "Sponsored", label: "A/B Variant B — Label", description: "Small uppercase label for variant B.", category: "monetization", type: "string" },
  { key: "article_sponsor_b_cta", value: "Learn More", label: "A/B Variant B — CTA Text", description: "Call-to-action button text for variant B.", category: "monetization", type: "string" },
  { key: "article_sponsor_b_description", value: "", label: "A/B Variant B — Description", description: "Body text for variant B. Leave blank to use same as variant A.", category: "monetization", type: "text" },
  { key: "article_sponsor_b_image_url", value: "", label: "A/B Variant B — Image URL", description: "Optional image for variant B. When set, shows image instead of text+CTA.", category: "monetization", type: "string" },
  { key: "article_sponsor_b_bg_color", value: "#FFFFFF", label: "A/B Variant B — Background Color", description: "Background color for variant B banner.", category: "monetization", type: "string" },
  { key: "article_sponsor_b_border_color", value: "#D0D0D0", label: "A/B Variant B — Border Color", description: "Border color for variant B banner.", category: "monetization", type: "string" },
  { key: "article_sponsor_b_header_bg_color", value: "#F0F0F0", label: "A/B Variant B — Header Background", description: "Header background color for variant B banner.", category: "monetization", type: "string" },
  { key: "article_sponsor_b_cta_bg_color", value: "#C41E3A", label: "A/B Variant B — CTA Button Color", description: "CTA button background color for variant B.", category: "monetization", type: "string" },
  { key: "article_sponsor_b_cta_text_color", value: "#FFFFFF", label: "A/B Variant B — CTA Text Color", description: "CTA button text color for variant B.", category: "monetization", type: "string" },
  // ─── Merch Store ───────────────────────────────────────────────────────────
  { key: "merch_sidebar_enabled", value: "false", label: "Enable Article Merch Sidebar", description: "Show a merch sidebar on article pages linking to the shop.", category: "monetization", type: "boolean" },
  { key: "merch_printify_api_token", value: "", label: "Printify API Token", description: "Bearer token from your Printify account (Profile → Connections → API access).", category: "monetization", type: "string" },
  { key: "merch_printify_shop_id", value: "", label: "Printify Shop ID", description: "Your Printify shop ID (found in the shop URL or API).", category: "monetization", type: "string" },
  { key: "merch_markup_percent", value: "50", label: "Merch Markup %", description: "Percentage markup above Printify base cost. Default 50 = 50% markup.", category: "monetization", type: "number" },
  { key: "merch_digital_price", value: "2.99", label: "Digital Print Price ($)", description: "Fixed price for digital download products.", category: "monetization", type: "string" },
  { key: "merch_loading_animation_url", value: "", label: "Loading Animation URL", description: "URL to a looping WebP or MP4 animation shown while products load.", category: "monetization", type: "string" },
  { key: "merch_blueprint_mug", value: "", label: "Printify Blueprint ID — Mug", description: "Printify blueprint ID for ceramic mugs.", category: "monetization", type: "string" },
  { key: "merch_blueprint_shirt", value: "", label: "Printify Blueprint ID — T-Shirt", description: "Printify blueprint ID for t-shirts.", category: "monetization", type: "string" },
  { key: "merch_blueprint_poster", value: "", label: "Printify Blueprint ID — Poster", description: "Printify blueprint ID for posters.", category: "monetization", type: "string" },
  { key: "merch_blueprint_case", value: "", label: "Printify Blueprint ID — Phone Case", description: "Printify blueprint ID for phone cases.", category: "monetization", type: "string" },
  { key: "merch_print_provider_id", value: "", label: "Printify Print Provider ID", description: "Preferred print provider ID from Printify's catalog.", category: "monetization", type: "string" },
  // ─── Merch v2: Per-product active/position flags ────────────────────────────
  { key: "merch_product_active_mug",        value: "true",  label: "Merch Active — Mug",           description: "Show mug in shop and sidebar.",           category: "monetization", type: "boolean" },
  { key: "merch_product_active_shirt",      value: "true",  label: "Merch Active — T-Shirt",       description: "Show t-shirt in shop and sidebar.",       category: "monetization", type: "boolean" },
  { key: "merch_product_active_poster",     value: "true",  label: "Merch Active — Poster",        description: "Show poster in shop and sidebar.",        category: "monetization", type: "boolean" },
  { key: "merch_product_active_case",       value: "true",  label: "Merch Active — Phone Case",    description: "Show phone case in shop and sidebar.",    category: "monetization", type: "boolean" },
  { key: "merch_product_active_canvas",     value: "true",  label: "Merch Active — Canvas",        description: "Show canvas print in shop and sidebar.",  category: "monetization", type: "boolean" },
  { key: "merch_product_active_tote",       value: "true",  label: "Merch Active — Tote Bag",      description: "Show tote bag in shop and sidebar.",      category: "monetization", type: "boolean" },
  { key: "merch_product_active_hoodie",     value: "true",  label: "Merch Active — Hoodie",        description: "Show hoodie in shop and sidebar.",        category: "monetization", type: "boolean" },
  { key: "merch_product_active_mousepad",   value: "true",  label: "Merch Active — Desk Mat",      description: "Show desk mat in shop and sidebar.",      category: "monetization", type: "boolean" },
  { key: "merch_product_active_candle",     value: "true",  label: "Merch Active — Candle",        description: "Show candle in shop and sidebar.",        category: "monetization", type: "boolean" },
  { key: "merch_product_active_cards",      value: "true",  label: "Merch Active — Playing Cards", description: "Show playing cards in shop and sidebar.", category: "monetization", type: "boolean" },
  // Sidebar position (0 = not in sidebar, 1-5 = position slot)
  { key: "merch_sidebar_position_mug",      value: "1", label: "Sidebar Position — Mug",           description: "Sidebar slot for mug (0 = hidden, 1-5 = slot).",           category: "monetization", type: "number" },
  { key: "merch_sidebar_position_shirt",    value: "2", label: "Sidebar Position — T-Shirt",       description: "Sidebar slot for t-shirt (0 = hidden, 1-5 = slot).",       category: "monetization", type: "number" },
  { key: "merch_sidebar_position_poster",   value: "3", label: "Sidebar Position — Poster",        description: "Sidebar slot for poster (0 = hidden, 1-5 = slot).",        category: "monetization", type: "number" },
  { key: "merch_sidebar_position_case",     value: "4", label: "Sidebar Position — Phone Case",    description: "Sidebar slot for phone case (0 = hidden, 1-5 = slot).",    category: "monetization", type: "number" },
  { key: "merch_sidebar_position_canvas",   value: "0", label: "Sidebar Position — Canvas",        description: "Sidebar slot for canvas (0 = hidden, 1-5 = slot).",        category: "monetization", type: "number" },
  { key: "merch_sidebar_position_tote",     value: "0", label: "Sidebar Position — Tote Bag",      description: "Sidebar slot for tote (0 = hidden, 1-5 = slot).",          category: "monetization", type: "number" },
  { key: "merch_sidebar_position_hoodie",   value: "0", label: "Sidebar Position — Hoodie",        description: "Sidebar slot for hoodie (0 = hidden, 1-5 = slot).",        category: "monetization", type: "number" },
  { key: "merch_sidebar_position_mousepad", value: "0", label: "Sidebar Position — Desk Mat",      description: "Sidebar slot for desk mat (0 = hidden, 1-5 = slot).",      category: "monetization", type: "number" },
  { key: "merch_sidebar_position_candle",   value: "0", label: "Sidebar Position — Candle",        description: "Sidebar slot for candle (0 = hidden, 1-5 = slot).",        category: "monetization", type: "number" },
  { key: "merch_sidebar_position_cards",    value: "0", label: "Sidebar Position — Playing Cards", description: "Sidebar slot for playing cards (0 = hidden, 1-5 = slot).", category: "monetization", type: "number" },
  // Printify product IDs (mapped from Printify shop)
  { key: "merch_product_id_mug",      value: "", label: "Printify Product ID — Mug",           description: "Printify product ID for the mug.",           category: "monetization", type: "string" },
  { key: "merch_product_id_shirt",    value: "", label: "Printify Product ID — T-Shirt",       description: "Printify product ID for the t-shirt.",       category: "monetization", type: "string" },
  { key: "merch_product_id_poster",   value: "", label: "Printify Product ID — Poster",        description: "Printify product ID for the poster.",        category: "monetization", type: "string" },
  { key: "merch_product_id_case",     value: "", label: "Printify Product ID — Phone Case",    description: "Printify product ID for the phone case.",    category: "monetization", type: "string" },
  { key: "merch_product_id_canvas",   value: "", label: "Printify Product ID — Canvas",        description: "Printify product ID for the canvas print.",  category: "monetization", type: "string" },
  { key: "merch_product_id_tote",     value: "", label: "Printify Product ID — Tote Bag",      description: "Printify product ID for the tote bag.",      category: "monetization", type: "string" },
  { key: "merch_product_id_hoodie",   value: "", label: "Printify Product ID — Hoodie",        description: "Printify product ID for the hoodie.",        category: "monetization", type: "string" },
  { key: "merch_product_id_mousepad", value: "", label: "Printify Product ID — Desk Mat",      description: "Printify product ID for the desk mat.",      category: "monetization", type: "string" },
  { key: "merch_product_id_candle",   value: "", label: "Printify Product ID — Candle",        description: "Printify product ID for the candle.",        category: "monetization", type: "string" },
  { key: "merch_product_id_cards",    value: "", label: "Printify Product ID — Playing Cards", description: "Printify product ID for the playing cards.", category: "monetization", type: "string" },
  // Availability check timestamps
  { key: "merch_last_availability_check", value: "", label: "Last Availability Check", description: "ISO timestamp of last automated Printify availability check.", category: "monetization", type: "string" },
  { key: "merch_last_manual_sync",        value: "", label: "Last Manual Sync",        description: "ISO timestamp of last manual sync from Printify.",           category: "monetization", type: "string" },
  // ─── Amazon Affiliates ───────────────────────────────────────────────────────
  { key: "amazon_affiliate_enabled", value: "false", label: "Enable Amazon Affiliates", description: "Enable Amazon Associates affiliate link injection.", category: "monetization", type: "boolean" },
  { key: "amazon_associate_tag", value: "", label: "Amazon Associate Tag", description: "Your Amazon Associates tracking ID (e.g., yoursite-20).", category: "monetization", type: "string" },
  // ─── AdSense ─────────────────────────────────────────────────────────────────
  { key: "adsense_publisher_id", value: "", label: "AdSense Publisher ID", description: "Google AdSense publisher ID (pub-xxxxxxxxxxxxxxxx).", category: "monetization", type: "string" },
  // ─── Newsletter ──────────────────────────────────────────────────────────────
  { key: "newsletter_reply_to", value: "", label: "Newsletter Reply-To Email", description: "Where subscriber replies go. Can differ from From Email.", category: "email", type: "string" },
  // ─── SMS ─────────────────────────────────────────────────────────────────────
  { key: "sms_enabled", value: "false", label: "Enable SMS Alerts", description: "Enable Twilio SMS for breaking news alerts to opted-in subscribers.", category: "email", type: "boolean" },
  // ─── X Social Cadence ────────────────────────────────────────────────────────
  { key: "x_post_interval_minutes", value: "45", label: "X Post Interval (minutes)", description: "Minimum minutes between X posts.", category: "social", type: "number" },
  { key: "x_daily_post_limit", value: "25", label: "X Daily Post Limit", description: "Maximum X posts per day across all types.", category: "social", type: "number" },
  // ─── Social Media Wizard (v4.9.8) ────────────────────────────────────────────
  // X (Twitter) credentials & controls
  { key: "x_handle", value: "", label: "X Handle", description: "Your X username including the @", category: "social", type: "string" },
  { key: "x_api_key", value: "", label: "X API Key", description: "From X Developer Portal → App → Keys and Tokens", category: "social", type: "string" },
  { key: "x_api_secret", value: "", label: "X API Secret", description: "X API secret key", category: "social", type: "string" },
  { key: "x_access_token", value: "", label: "X Access Token", description: "X access token for posting", category: "social", type: "string" },
  { key: "x_access_token_secret", value: "", label: "X Access Token Secret", description: "X access token secret", category: "social", type: "string" },
  { key: "x_bearer_token", value: "", label: "X Bearer Token", description: "Required for some read operations. Optional for posting.", category: "social", type: "string" },
  { key: "x_auto_post_enabled", value: "false", label: "X Auto-Post Articles", description: "Automatically post new articles to X", category: "social", type: "boolean" },
  { key: "x_posts_per_day", value: "25", label: "X Posts Per Day", description: "Maximum posts per day. X free tier allows ~50 tweets/day.", category: "social", type: "number" },
  { key: "x_posting_start_hour", value: "12", label: "X Posting Start Hour (UTC)", description: "Hour to start posting (UTC). E.g., 12 = noon UTC.", category: "social", type: "number" },
  { key: "x_posting_end_hour", value: "4", label: "X Posting End Hour (UTC)", description: "Hour to stop posting (UTC). E.g., 4 = 4am UTC. Wraps around midnight.", category: "social", type: "number" },
  { key: "x_reply_engine_enabled", value: "false", label: "X Reply Engine Enabled", description: "Automatically reply to mentions and relevant conversations", category: "social", type: "boolean" },
  { key: "x_standalone_tweets_enabled", value: "false", label: "X Standalone Tweets Enabled", description: "Post original commentary tweets (not linked to articles)", category: "social", type: "boolean" },
  // Threads
  { key: "threads_user_id", value: "", label: "Threads User ID", description: "Your numeric Threads/Instagram user ID", category: "social", type: "string" },
  { key: "threads_access_token", value: "", label: "Threads Access Token", description: "Long-lived token from Meta Developer Portal", category: "social", type: "string" },
  { key: "threads_auto_post_enabled", value: "false", label: "Threads Auto-Post Articles", description: "Mirror article posts to Threads", category: "social", type: "boolean" },
  { key: "threads_posts_per_day", value: "15", label: "Threads Posts Per Day", description: "Maximum posts per day on Threads", category: "social", type: "number" },
  // Bluesky
  { key: "bluesky_handle", value: "", label: "Bluesky Handle", description: "Your Bluesky handle (e.g., jaimeio.bsky.social)", category: "social", type: "string" },
  { key: "bluesky_app_password", value: "", label: "Bluesky App Password", description: "Settings → App Passwords → Create. Do NOT use your main password.", category: "social", type: "string" },
  { key: "bluesky_auto_post_enabled", value: "false", label: "Bluesky Auto-Post Articles", description: "Mirror article posts to Bluesky", category: "social", type: "boolean" },
  { key: "bluesky_posts_per_day", value: "15", label: "Bluesky Posts Per Day", description: "Maximum posts per day on Bluesky", category: "social", type: "number" },
  // Facebook
  { key: "facebook_page_id", value: "", label: "Facebook Page ID", description: "Found in Page Settings → About → Page ID", category: "social", type: "string" },
  { key: "facebook_page_access_token", value: "", label: "Facebook Page Access Token", description: "Long-lived page token from Meta Developer Portal. Must have pages_manage_posts permission.", category: "social", type: "string" },
  { key: "facebook_auto_post_enabled", value: "false", label: "Facebook Auto-Post Articles", description: "Post article links to your Facebook Page", category: "social", type: "boolean" },
  { key: "facebook_posts_per_day", value: "10", label: "Facebook Posts Per Day", description: "Maximum posts per day on Facebook", category: "social", type: "number" },
  // Instagram
  { key: "instagram_account_id", value: "", label: "Instagram Business Account ID", description: "Requires a connected Facebook Page with Instagram Business account", category: "social", type: "string" },
  { key: "instagram_access_token", value: "", label: "Instagram Access Token", description: "Same long-lived token as Facebook if accounts are linked, or separate from Meta Developer Portal", category: "social", type: "string" },
  { key: "instagram_auto_post_enabled", value: "false", label: "Instagram Auto-Post Articles", description: "Post article images/carousels to Instagram", category: "social", type: "boolean" },
  { key: "instagram_posts_per_day", value: "5", label: "Instagram Posts Per Day", description: "Maximum posts per day on Instagram", category: "social", type: "number" },
  // LinkedIn
  { key: "linkedin_org_urn", value: "", label: "LinkedIn Organization URN", description: "Your LinkedIn Company Page URN. Found via LinkedIn API or page admin settings.", category: "social", type: "string" },
  { key: "linkedin_access_token", value: "", label: "LinkedIn Access Token", description: "OAuth 2.0 access token with w_organization_social scope", category: "social", type: "string" },
  { key: "linkedin_auto_post_enabled", value: "false", label: "LinkedIn Auto-Post Articles", description: "Post article links to your LinkedIn Company Page", category: "social", type: "boolean" },
  { key: "linkedin_posts_per_day", value: "5", label: "LinkedIn Posts Per Day", description: "Maximum posts per day on LinkedIn", category: "social", type: "number" },
  // Social Profile URLs (footer display)
  { key: "social_url_x", value: "", label: "X (Twitter) URL", description: "Your X profile URL for footer display", category: "social", type: "string" },
  { key: "social_url_threads", value: "", label: "Threads URL", description: "Your Threads profile URL for footer display", category: "social", type: "string" },
  { key: "social_url_bluesky", value: "", label: "Bluesky URL", description: "Your Bluesky profile URL for footer display", category: "social", type: "string" },
  { key: "social_url_facebook", value: "", label: "Facebook URL", description: "Your Facebook page URL for footer display", category: "social", type: "string" },
  { key: "social_url_instagram", value: "", label: "Instagram URL", description: "Your Instagram profile URL for footer display", category: "social", type: "string" },
  { key: "social_url_linkedin", value: "", label: "LinkedIn URL", description: "Your LinkedIn company page URL for footer display", category: "social", type: "string" },
  { key: "social_url_youtube", value: "", label: "YouTube URL", description: "Your YouTube channel URL for footer display", category: "social", type: "string" },
  { key: "social_url_tiktok", value: "", label: "TikTok URL", description: "Your TikTok profile URL for footer display", category: "social", type: "string" },
  { key: "social_url_reddit", value: "", label: "Reddit URL", description: "Your Reddit community URL for footer display", category: "social", type: "string" },
  // ─── SEO ─────────────────────────────────────────────────────────────────────
  { key: "gsc_site_url", value: "", label: "Google Search Console Property URL", description: "The property URL in Google Search Console (e.g., sc-domain:yourdomain.com).", category: "seo", type: "string" },
  { key: "indexnow_key", value: "", label: "IndexNow Key", description: "Used for instant indexing on Bing, Yandex, DuckDuckGo, and ChatGPT.", category: "seo", type: "string" },
  { key: "bing_api_key", value: "", label: "Bing Webmaster API Key", description: "From bing.com/webmasters → Settings → API Access.", category: "seo", type: "string" },
  // ─── Network API ─────────────────────────────────────────────────────────────
  { key: "network_api_enabled", value: "true", label: "Network API Enabled", description: "v4.7.0: Master on/off switch for the /api/network-report endpoint.", category: "system", type: "boolean" },
  { key: "network_api_key", value: "800eb05d856ee2579291b49047edd74f15c52f87b8b7aec9e96a651f37540d2a", label: "Network API Key", description: "v4.7.0: 64-character hex key for /api/network-report authentication. Each deployment generates its own unique key.", category: "system", type: "string" },
  { key: "network_hub_url", value: "", label: "Network Hub URL", description: "v4.7.0: Optional URL of a central hub that aggregates metrics from multiple deployments. Leave blank if not part of a network.", category: "system", type: "string" },
  { key: "network_sync_interval", value: "60", label: "Network Sync Interval (minutes)", description: "v4.7.0: How often this deployment pushes metrics to the network hub. Default: 60 minutes.", category: "system", type: "number" },
  // v4.7.1: Setup gate — production loop and batch workflow skip until this is true
  { key: "setup_complete", value: "false", label: "Setup Complete", description: "v4.7.1: Set to true once the operator has completed the Setup Wizard. The production loop and batch workflow will not run until this is true. Prevents wrong-niche content on fresh deployments.", category: "system", type: "boolean" },
  // v4.7.2: Configurable loading screen (replaces legacy loader with white-label SiteLoader)
  { key: "loading_style", value: "spinner", label: "Loading Style", description: "v4.7.2: Controls the loading animation shown while pages render. Options: spinner (CSS-only, default), logo (custom image from loading_logo_url), none (instant load, no animation).", category: "branding", type: "string" },
  { key: "loading_logo_url", value: "", label: "Loading Logo URL", description: "v4.7.2: URL to a custom logo image shown during page load. Only used when loading_style=logo. If empty and style=logo, falls back to spinner.", category: "branding", type: "string" },
  // Sponsorship & Advertising (v5.0)
  { key: "adsense_enabled", value: "false", label: "AdSense Enabled", description: "Enable Google AdSense ad placements.", category: "monetization", type: "boolean" },
  { key: "adsense_publisher_id", value: "", label: "AdSense Publisher ID", description: "Your AdSense publisher ID (ca-pub-...).", category: "monetization", type: "string" },
  { key: "adsense_header_unit", value: "", label: "Header Ad Unit ID", description: "Ad unit ID for header banner.", category: "monetization", type: "string" },
  { key: "adsense_sidebar_unit", value: "", label: "Sidebar Ad Unit ID", description: "Ad unit ID for sidebar.", category: "monetization", type: "string" },
  { key: "adsense_article_unit", value: "", label: "In-Article Ad Unit ID", description: "Ad unit ID for in-article ads.", category: "monetization", type: "string" },
  { key: "adsense_footer_unit", value: "", label: "Footer Ad Unit ID", description: "Ad unit ID for footer.", category: "monetization", type: "string" },
  { key: "amazon_enabled", value: "false", label: "Amazon Affiliate Enabled", description: "Enable Amazon product recommendations.", category: "monetization", type: "boolean" },
  { key: "amazon_associate_tag", value: "", label: "Amazon Associate Tag", description: "Your Amazon Associate tracking tag.", category: "monetization", type: "string" },
  { key: "amazon_store_id", value: "", label: "Amazon Store ID", description: "Optional Amazon storefront ID.", category: "monetization", type: "string" },
  { key: "amazon_keywords", value: "", label: "Amazon Keywords", description: "Default keywords for Amazon product search.", category: "monetization", type: "string" },
  // Shop (v5.0)
  { key: "printify_enabled", value: "false", label: "Printify Enabled", description: "Enable print-on-demand merchandise shop.", category: "monetization", type: "boolean" },
  { key: "printify_api_key", value: "", label: "Printify API Key", description: "Your Printify API key.", category: "monetization", type: "string" },
  { key: "printify_shop_id", value: "", label: "Printify Shop ID", description: "Your Printify shop ID.", category: "monetization", type: "string" },
  { key: "brand_shop_title", value: "Shop", label: "Shop Title", description: "Title for the shop page.", category: "branding", type: "string" },
  { key: "brand_shop_description", value: "", label: "Shop Description", description: "Description shown at the top of the shop page.", category: "branding", type: "string" },
  { key: "brand_shop_nav_label", value: "Shop", label: "Shop Nav Label", description: "Label for shop link in navigation.", category: "branding", type: "string" },
  { key: "shop_in_nav", value: "false", label: "Show Shop in Nav", description: "Show shop link in navigation menu.", category: "branding", type: "boolean" },
  // Brand Palette (v5.0)
  { key: "brand_palette", value: "", label: "Brand Palette", description: "Auto-generated WCAG-compliant color palette JSON.", category: "branding", type: "string" },
  { key: "loading_text", value: "", label: "Loading Text", description: "v4.7.2: Optional text shown below the loading animation (e.g., your site name). Leave blank to show no text.", category: "branding", type: "string" },
  // v4.7.3: Configurable Google Analytics tag (replaces hardcoded AW-17988276150)
  { key: "brand_gtag_id", value: "", label: "Google Analytics Tag ID", description: "v4.7.3: Your GA4 measurement ID (G-XXXXXXXX) or Google Ads conversion ID (AW-XXXXXXXXX). Leave blank to disable analytics entirely. Each deployment must use its own ID.", category: "branding", type: "string" },
  // v4.8.0: Microsoft Clarity session recording
  { key: "brand_clarity_id", value: "", label: "Microsoft Clarity Project ID", description: "v4.8.0: Your Microsoft Clarity project ID (e.g. abc123xyz). Leave blank to disable. Provides session recordings and heatmaps. Each deployment must use its own ID.", category: "branding", type: "string" },
  // v4.9.0: Sponsor branded card fallback settings
  { key: "sponsor_card_enabled", value: "false", label: "Enable Sponsor Branded Card", description: "v4.9.0: When real_image_fallback=sponsor_card, show a branded card with sponsor info instead of a plain branded card.", category: "monetization", type: "boolean" },
  { key: "sponsor_card_label", value: "", label: "Sponsor Card Label", description: "v4.9.0: Sponsor name shown on the branded card (e.g. King Shocks).", category: "monetization", type: "string" },
  { key: "sponsor_card_logo_url", value: "", label: "Sponsor Card Logo URL", description: "v4.9.0: URL to sponsor logo image rendered on the branded card.", category: "monetization", type: "string" },
  { key: "sponsor_card_click_url", value: "", label: "Sponsor Card Click URL", description: "v4.9.0: Destination URL when the sponsor card image is clicked.", category: "monetization", type: "string" },
  // v4.9.0: Image watermark settings (new keys — distinct from legacy watermark_* keys)
  { key: "image_watermark_enabled", value: "true", label: "Enable Image Watermark", description: "v4.9.0: Stamp site URL on every generated/sourced image. Master toggle.", category: "image_providers", type: "boolean" },
  { key: "image_watermark_text", value: "", label: "Watermark Text Override", description: "v4.9.0: Custom watermark text. Leave empty to use domain from site_url setting.", category: "image_providers", type: "string" },
  // v4.9.0: Analytics spam referrer blocklist (JSON array of regex pattern strings)
  { key: "analytics_spam_referrer_blocklist", value: "[]", label: "Analytics Spam Referrer Blocklist", description: "v4.9.0: JSON array of regex pattern strings for known spam referrers. Matching referrers are excluded from JS-tracked page views.", category: "analytics", type: "json" },
];

// ─── FeedHive Functions (Archived Feb 21, 2026) ───────────────────────────────
// These functions are preserved but unused. See /archive/feedhive/ for details.
// Replaced with direct X/Twitter posting queue system.

/**
 * @deprecated Archived - use X Queue instead
 * Get FeedHive trigger URL for a specific platform.
 * Falls back to default trigger URL if platform-specific URL is not configured.
 */
export async function getFeedHiveTriggerUrl(platform: string): Promise<string | undefined> {
  // Try platform-specific URL first
  const platformKey = `feedhive_trigger_url_${platform}`;
  const platformSetting = await getSetting(platformKey);
  if (platformSetting?.value) return platformSetting.value;
  // Fall back to default trigger URL
  const defaultSetting = await getSetting("feedhive_trigger_url");
  return defaultSetting?.value || undefined;
}

/**
 * @deprecated Archived - use X Queue instead
 * Get all configured FeedHive trigger URLs as a map of platform -> url.
 * Only includes platforms that have a URL configured (either platform-specific or default).
 */
export async function getAllFeedHiveTriggerUrls(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const allSettings = await db.select().from(workflowSettings)
    .where(like(workflowSettings.key, "feedhive_trigger_url%"));
  
  const result: Record<string, string> = {};
  const defaultUrl = allSettings.find(s => s.key === "feedhive_trigger_url")?.value || "";
  
  const platforms = ["twitter", "facebook", "linkedin", "instagram", "threads"];
  for (const platform of platforms) {
    const platformUrl = allSettings.find(s => s.key === `feedhive_trigger_url_${platform}`)?.value;
    if (platformUrl) {
      result[platform] = platformUrl;
    } else if (defaultUrl) {
      result[platform] = defaultUrl;
    }
  }
  return result;
}

export async function seedDefaultSettings() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(workflowSettings).limit(1);
  if (existing.length > 0) {
    // Auto-detect: insert any DEFAULT_SETTINGS key that doesn't exist in the DB yet.
    // This eliminates the need for a manual whitelist — every future setting is
    // automatically backfilled on upgrade without code changes.
    const existingRows = await db.select({ key: workflowSettings.key }).from(workflowSettings);
    const existingKeySet = new Set(existingRows.map(r => r.key));
    const missingSettings = DEFAULT_SETTINGS.filter(s => !existingKeySet.has(s.key));
    if (missingSettings.length > 0) {
      for (const setting of missingSettings) {
        await db.insert(workflowSettings).values(setting).onDuplicateKeyUpdate({ set: { key: setting.key } });
      }
      console.log(`[Database] Backfilled ${missingSettings.length} new settings:`, missingSettings.map(s => s.key).join(", "));
    }
    return;
  }
  for (const setting of DEFAULT_SETTINGS) {
    await db.insert(workflowSettings).values(setting).onDuplicateKeyUpdate({ set: { value: setting.value } });
  }
  console.log("[Database] Seeded default workflow settings");
}

// ─── Licenses ────────────────────────────────────────────
export async function createLicense(data: InsertLicense) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(licenses).values(data);
  return result[0].insertId;
}

export async function getAllLicenses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(licenses).orderBy(desc(licenses.createdAt));
}

export async function getLicenseById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(licenses).where(eq(licenses.id, id)).limit(1);
  return result[0] || null;
}

export async function getLicenseByKey(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(licenses).where(eq(licenses.licenseKey, key)).limit(1);
  return result[0] || null;
}

export async function updateLicense(id: number, data: Partial<InsertLicense>) {
  const db = await getDb();
  if (!db) return;
  await db.update(licenses).set(data).where(eq(licenses.id, id));
}

export async function deleteLicense(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(licenses).where(eq(licenses.id, id));
}

// ─── Client Deployments ──────────────────────────────────
export async function createDeployment(data: InsertClientDeployment) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(clientDeployments).values(data);
  return result[0].insertId;
}

export async function getAllDeployments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientDeployments).orderBy(desc(clientDeployments.deployedAt));
}

export async function getDeploymentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clientDeployments).where(eq(clientDeployments.id, id)).limit(1);
  return result[0] || null;
}

export async function getDeploymentsByLicenseId(licenseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientDeployments).where(eq(clientDeployments.licenseId, licenseId)).orderBy(desc(clientDeployments.deployedAt));
}

export async function updateDeployment(id: number, data: Partial<InsertClientDeployment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(clientDeployments).set(data).where(eq(clientDeployments.id, id));
}

export async function deleteDeployment(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(clientDeployments).where(eq(clientDeployments.id, id));
}


// ─── Search Analytics ────────────────────────────────────────────────────────

export async function trackSearch(data: InsertSearchAnalytics) {
  const db = await getDb();
  if (!db) return;
  await db.insert(searchAnalytics).values(data);
}

export async function getPopularSearches(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      query: searchAnalytics.query,
      searchCount: sql<number>`COUNT(*)`.as('searchCount'),
      avgResults: sql<number>`AVG(${searchAnalytics.resultsCount})`.as('avgResults'),
      lastSearched: sql<Date>`MAX(${searchAnalytics.searchedAt})`.as('lastSearched'),
    })
    .from(searchAnalytics)
    .groupBy(searchAnalytics.query)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}

export async function getSearchAnalytics(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(searchAnalytics)
    .where(sql`${searchAnalytics.searchedAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .orderBy(desc(searchAnalytics.searchedAt));
}



// ─── Content Calendar ───────────────────────────────────────────────────────
export async function getContentCalendarEntry(date: string) {
  const db = await getDb();
  if (!db) return null;
  const [entry] = await db.select().from(contentCalendar).where(eq(contentCalendar.date, date));
  return entry ?? null;
}
export async function getContentCalendarRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contentCalendar)
    .where(and(gte(contentCalendar.date, startDate), lte(contentCalendar.date, endDate)))
    .orderBy(contentCalendar.date);
}
export async function createOrUpdateContentCalendarEntry(data: InsertContentCalendar) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await getContentCalendarEntry(data.date);
  if (existing) {
    await db.update(contentCalendar).set({ ...data, updatedAt: new Date() }).where(eq(contentCalendar.date, data.date));
    return { ...existing, ...data };
  }
  const [result] = await db.insert(contentCalendar).values(data);
  return result;
}
export async function deleteContentCalendarEntry(date: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(contentCalendar).where(eq(contentCalendar.date, date));
}
// ─── Blocked Sources ─────────────────────────────────────
export async function createBlockedSource(data: InsertBlockedSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(blockedSources).values(data);
  return result;
}

export async function getAllBlockedSources() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(blockedSources).orderBy(desc(blockedSources.blockedAt));
}

export async function deleteBlockedSource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blockedSources).where(eq(blockedSources.id, id));
}

export async function getSourceAnalytics() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all published articles with source URLs
  const allArticles = await db.select({
    sourceUrl: articles.sourceUrl,
    publishedAt: articles.publishedAt,
  }).from(articles).where(eq(articles.status, "published"));
  
  // Count articles per source domain
  const sourceCounts = new Map<string, { count: number; latestDate: Date | null }>();
  
  for (const article of allArticles) {
    if (!article.sourceUrl) continue;
    
    // Extract domain from URL
    try {
      const url = new URL(article.sourceUrl);
      const domain = url.hostname.replace(/^www\./, '');
      
      const existing = sourceCounts.get(domain);
      if (existing) {
        existing.count++;
        if (article.publishedAt && (!existing.latestDate || article.publishedAt > existing.latestDate)) {
          existing.latestDate = article.publishedAt;
        }
      } else {
        sourceCounts.set(domain, { count: 1, latestDate: article.publishedAt });
      }
    } catch (e) {
      // Skip invalid URLs
      continue;
    }
  }
  
  // Convert to array and sort by count descending
  const totalArticles = allArticles.length;
  const analytics = Array.from(sourceCounts.entries())
    .map(([source, data]) => ({
      source,
      count: data.count,
      percentage: totalArticles > 0 ? (data.count / totalArticles * 100).toFixed(1) : '0.0',
      latestDate: data.latestDate,
    }))
    .sort((a, b) => b.count - a.count);
  
  return analytics;
}

export async function isSourceBlocked(sourceName: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const results = await db
    .select()
    .from(blockedSources)
    .where(eq(blockedSources.sourceName, sourceName))
    .limit(1);
  return results.length > 0;
}


// ─── RSS Feed Weights ────────────────────────────────────
export async function getRssFeedWeights() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rssFeedWeights).where(eq(rssFeedWeights.enabled, true)).orderBy(desc(rssFeedWeights.weight));
}

export async function getAllRssFeedWeights() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rssFeedWeights).orderBy(desc(rssFeedWeights.weight));
}

export async function updateRssFeedWeight(feedUrl: string, weight: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(rssFeedWeights).set({ weight, updatedAt: new Date() }).where(eq(rssFeedWeights.feedUrl, feedUrl));
}

export async function toggleRssFeedEnabled(feedUrl: string, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(rssFeedWeights).set({ enabled, updatedAt: new Date() }).where(eq(rssFeedWeights.feedUrl, feedUrl));
}

export async function resetFeedErrors(feedUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(rssFeedWeights).set({ errorCount: 0, lastError: null, updatedAt: new Date() }).where(eq(rssFeedWeights.feedUrl, feedUrl));
}

export async function addRssFeedWeight(feedUrl: string, weight: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(rssFeedWeights).values({ feedUrl, weight, enabled: true }).onDuplicateKeyUpdate({ set: { weight, enabled: true, updatedAt: new Date() } });
}

export async function removeRssFeedWeight(feedUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(rssFeedWeights).where(eq(rssFeedWeights.feedUrl, feedUrl));
}

export async function migrateRssFeedsToWeights() {
  const db = await getDb();
  if (!db) return;
  
  // Get existing RSS feeds from settings
  const rssFeedsSetting = await getSetting("rss_feeds");
  if (!rssFeedsSetting?.value) return;
  
  try {
    const feeds = JSON.parse(rssFeedsSetting.value) as string[];
    for (const feed of feeds) {
      await addRssFeedWeight(feed, 50);
    }
    console.log(`[Database] Migrated ${feeds.length} RSS feeds to rss_feed_weights table`);
  } catch (error) {
    console.error("[Database] Failed to migrate RSS feeds:", error);
  }
}


export async function updateFeedHealth(feedUrl: string, updates: { errorCount?: number; lastError?: string | null; isSuccess?: boolean; candidatesGenerated?: number }) {
  const db = await getDb();
  if (!db) return;
  
  try {
    const newErrorCount = updates.errorCount ?? 0;
    const shouldDisable = newErrorCount >= 3;
    const isSuccess = updates.isSuccess ?? (newErrorCount === 0);
    const candidatesInc = updates.candidatesGenerated ?? 0;
    
    // Use raw SQL to atomically increment counters
    const { sql: sqlHelper } = await import("drizzle-orm");
    
    if (isSuccess) {
      await db.execute(sqlHelper`
        UPDATE rss_feed_weights
        SET lastFetchTime = NOW(),
            errorCount = ${newErrorCount},
            lastError = ${updates.lastError ?? null},
            enabled = 1,
            total_fetches = COALESCE(total_fetches, 0) + 1,
            successful_fetches = COALESCE(successful_fetches, 0) + 1,
            candidates_generated = COALESCE(candidates_generated, 0) + ${candidatesInc},
            auto_disabled = 0,
            updatedAt = NOW()
        WHERE feedUrl = ${feedUrl}
      `);
    } else {
      await db.execute(sqlHelper`
        UPDATE rss_feed_weights
        SET lastFetchTime = NOW(),
            errorCount = ${newErrorCount},
            lastError = ${updates.lastError ?? null},
            enabled = ${shouldDisable ? 0 : 1},
            total_fetches = COALESCE(total_fetches, 0) + 1,
            auto_disabled = ${shouldDisable ? 1 : 0},
            updatedAt = NOW()
        WHERE feedUrl = ${feedUrl}
      `);
      if (shouldDisable) {
        console.log(`[Feed Health] Feed ${feedUrl} auto-disabled due to 3+ consecutive failures`);
      }
    }
  } catch (error) {
    console.error(`[Database] Failed to update feed health for ${feedUrl}:`, error);
  }
}

export async function getFeedHealth(feedUrl: string) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.select()
      .from(rssFeedWeights)
      .where(eq(rssFeedWeights.feedUrl, feedUrl))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error(`[Database] Failed to get feed health for ${feedUrl}:`, error);
    return null;
  }
}


// ─── Category Balance Analytics ─────────────────────────────────

/**
 * Get the Feed × Category Matrix — shows how many articles each feed has produced per category.
 * Uses a rolling window of the last N articles per feed (configurable via fingerprint_window setting).
 */
export async function getFeedCategoryMatrix(fingerprintWindow: number = 200) {
  const db = await getDb();
  if (!db) return [];

  // Get all feeds
  const feeds = await db.select().from(rssFeedWeights).orderBy(desc(rssFeedWeights.weight));
  
  // Get all categories
  const cats = await db.select().from(categories).orderBy(asc(categories.name));
  
  // For each feed, get the last N articles and count by category
  const matrix: Array<{
    feedId: number;
    feedUrl: string;
    weight: number;
    enabled: boolean;
    totalArticles: number;
    categories: Record<string, number>; // categorySlug -> count
    categoryPercentages: Record<string, number>; // categorySlug -> percentage
  }> = [];

  for (const feed of feeds) {
    // Use feedSourceId for direct matching, fall back to domain matching
    let feedArticles = await db.select({
      id: articles.id,
      categoryId: articles.categoryId,
    })
      .from(articles)
      .where(
        and(
          eq(articles.feedSourceId, feed.id),
          sql`${articles.status} IN ('pending', 'approved', 'published')`
        )
      )
      .orderBy(desc(articles.createdAt))
      .limit(fingerprintWindow);

    // Fallback to domain matching if no feedSourceId matches
    if (feedArticles.length === 0) {
      let feedDomain: string;
      try {
        const url = new URL(feed.feedUrl);
        feedDomain = url.hostname.replace(/^www\./, '');
      } catch {
        continue;
      }
      feedArticles = await db.select({
        id: articles.id,
        categoryId: articles.categoryId,
      })
        .from(articles)
        .where(
          and(
            sql`${articles.sourceUrl} LIKE ${`%${feedDomain}%`}`,
            sql`${articles.status} IN ('pending', 'approved', 'published')`
          )
        )
        .orderBy(desc(articles.createdAt))
        .limit(fingerprintWindow);
    }

    if (feedArticles.length === 0) continue;

    const catCounts: Record<string, number> = {};
    const catPercentages: Record<string, number> = {};
    
    for (const cat of cats) {
      catCounts[cat.slug] = 0;
    }
    
    for (const article of feedArticles) {
      const cat = cats.find(c => c.id === article.categoryId);
      if (cat) {
        catCounts[cat.slug] = (catCounts[cat.slug] || 0) + 1;
      }
    }

    const total = feedArticles.length;
    for (const slug of Object.keys(catCounts)) {
      catPercentages[slug] = total > 0 ? Math.round((catCounts[slug] / total) * 1000) / 10 : 0;
    }

    matrix.push({
      feedId: feed.id,
      feedUrl: feed.feedUrl,
      weight: feed.weight,
      enabled: feed.enabled,
      totalArticles: total,
      categories: catCounts,
      categoryPercentages: catPercentages,
    });
  }

  return matrix;
}

/**
 * Get current category distribution — counts of published articles per category.
 */
export async function getCategoryDistribution() {
  const db = await getDb();
  if (!db) return [];

  const cats = await db.select().from(categories).orderBy(asc(categories.name));
  
  const results: Array<{
    categoryId: number;
    categoryName: string;
    categorySlug: string;
    categoryColor: string;
    articleCount: number;
    percentage: number;
  }> = [];

  // Get total article count (published + approved + pending)
  const [totalResult] = await db.select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(sql`${articles.status} IN ('pending', 'approved', 'published')`);
  const totalArticles = totalResult?.count || 0;

  for (const cat of cats) {
    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(
        and(
          eq(articles.categoryId, cat.id),
          sql`${articles.status} IN ('pending', 'approved', 'published')`
        )
      );
    const count = countResult?.count || 0;
    results.push({
      categoryId: cat.id,
      categoryName: cat.name,
      categorySlug: cat.slug,
      categoryColor: cat.color || '#6366f1',
      articleCount: count,
      percentage: totalArticles > 0 ? Math.round((count / totalArticles) * 1000) / 10 : 0,
    });
  }

  return results;
}

/**
 * Get feed publish rate — article counts per feed (total, last 7d, last 30d).
 */
export async function getFeedPublishRate() {
  const db = await getDb();
  if (!db) return [];

  const feeds = await db.select().from(rssFeedWeights).orderBy(desc(rssFeedWeights.weight));
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const results: Array<{
    feedId: number;
    feedUrl: string;
    feedDomain: string;
    weight: number;
    enabled: boolean;
    totalArticles: number;
    last7Days: number;
    last30Days: number;
    errorCount: number;
    lastError: string | null;
  }> = [];

  for (const feed of feeds) {
    let feedDomain: string;
    try {
      const url = new URL(feed.feedUrl);
      feedDomain = url.hostname.replace(/^www\./, '');
    } catch {
      feedDomain = feed.feedUrl;
    }

    // Prefer feedSourceId, fallback to domain matching
    const feedIdFilter = eq(articles.feedSourceId, feed.id);
    const domainFilter = sql`${articles.sourceUrl} LIKE ${`%${feedDomain}%`}`;
    const statusFilter = sql`${articles.status} IN ('pending', 'approved', 'published')`;

    // Check feedSourceId first
    const [totalById] = await db.select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(and(feedIdFilter, statusFilter));
    
    const useFeedId = (totalById?.count || 0) > 0;
    const primaryFilter = useFeedId ? feedIdFilter : domainFilter;

    const [totalResult] = useFeedId ? [totalById] : await db.select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(and(domainFilter, statusFilter));

    const [last7Result] = await db.select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(and(primaryFilter, statusFilter, gte(articles.createdAt, sevenDaysAgo)));

    const [last30Result] = await db.select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(and(primaryFilter, statusFilter, gte(articles.createdAt, thirtyDaysAgo)));

    results.push({
      feedId: feed.id,
      feedUrl: feed.feedUrl,
      feedDomain,
      weight: feed.weight,
      enabled: feed.enabled,
      totalArticles: totalResult?.count || 0,
      last7Days: last7Result?.count || 0,
      last30Days: last30Result?.count || 0,
      errorCount: feed.errorCount,
      lastError: feed.lastError,
    });
  }

  return results;
}

/**
 * Get category gap analysis — compares actual vs target distribution.
 */
export async function getCategoryGapAnalysis(targetDistribution?: Record<string, number>) {
  const db = await getDb();
  if (!db) return [];

  const distribution = await getCategoryDistribution();
  const totalCategories = distribution.length;
  
  // Default target: equal distribution
  const defaultTarget = totalCategories > 0 ? Math.round(1000 / totalCategories) / 10 : 0;

  return distribution.map(cat => {
    const target = targetDistribution?.[cat.categorySlug] ?? defaultTarget;
    const gap = cat.percentage - target;
    return {
      ...cat,
      targetPercentage: target,
      gap, // positive = over-represented, negative = under-represented
      status: gap > 3 ? 'over' as const : gap < -3 ? 'under' as const : 'balanced' as const,
    };
  });
}

/**
 * Backfill feedSourceId on existing articles by matching sourceUrl to rssFeedWeights.
 */
export async function backfillFeedSourceIds() {
  const db = await getDb();
  if (!db) return { updated: 0 };

  const feeds = await db.select().from(rssFeedWeights);
  let updated = 0;

  for (const feed of feeds) {
    let feedDomain: string;
    try {
      const url = new URL(feed.feedUrl);
      feedDomain = url.hostname.replace(/^www\./, '');
    } catch {
      continue;
    }

    const result = await db.update(articles)
      .set({ feedSourceId: feed.id })
      .where(
        and(
          sql`${articles.sourceUrl} LIKE ${`%${feedDomain}%`}`,
          sql`${articles.feedSourceId} IS NULL`
        )
      );
    
    // Count affected rows (drizzle doesn't return affected count easily, so we track per feed)
    updated++;
  }

  return { updated };
}

/**
 * Get feed source ID by matching a sourceUrl to a known feed.
 */
export async function getFeedSourceIdByUrl(sourceUrl: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const url = new URL(sourceUrl);
    const domain = url.hostname.replace(/^www\./, '');
    
    const feeds = await db.select()
      .from(rssFeedWeights)
      .where(sql`${rssFeedWeights.feedUrl} LIKE ${`%${domain}%`}`)
      .limit(1);
    
    return feeds[0]?.id || null;
  } catch {
    return null;
  }
}

// ─── Rebalance Logs ─────────────────────────────────────────────

export async function createRebalanceLog(data: InsertRebalanceLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(rebalanceLogs).values(data);
  return result[0]?.insertId;
}

export async function getRebalanceLogs(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rebalanceLogs).orderBy(desc(rebalanceLogs.triggeredAt)).limit(limit);
}

export async function getLastRebalanceLog() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(rebalanceLogs).orderBy(desc(rebalanceLogs.triggeredAt)).limit(1);
  return result[0] || null;
}

/**
 * Increment the articles_since_last_rebalance counter.
 * Returns the new count.
 */
export async function incrementArticleRebalanceCounter(count: number = 1): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const setting = await getSetting('articles_since_last_rebalance');
  const current = parseInt(setting?.value || '0', 10);
  const newCount = current + count;
  await setSetting('articles_since_last_rebalance', newCount.toString());
  return newCount;
}

/**
 * Reset the articles_since_last_rebalance counter to 0.
 */
export async function resetArticleRebalanceCounter(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await setSetting('articles_since_last_rebalance', '0');
}

// ─── X Auto-Replies ──────────────────────────────────────────
export async function insertXReply(data: {
  tweetId: string;
  tweetText: string;
  tweetAuthor: string;
  tweetAuthorHandle: string;
  tweetLikes?: number;
  tweetRetweets?: number;
  tweetFollowers?: number;
  tweetVerifiedType?: string;
  keyword?: string;
  articleId?: number;
  articleSlug?: string;
  articleHeadline?: string;
  replyContent?: string;
  replyMode?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(xReplies).values({
    ...data,
    status: "pending",
  });
  return result[0]?.insertId;
}

export async function listXReplies(opts: { status?: string; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  const { status, limit = 100 } = opts;
  const conditions = status ? [eq(xReplies.status, status as any)] : [];
  return db
    .select()
    .from(xReplies)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(xReplies.createdAt))
    .limit(limit);
}

export async function updateXReplyStatus(
  id: number,
  status: "pending" | "approved" | "posted" | "failed" | "skipped",
  extra?: { postedTweetId?: string; errorMessage?: string; postedAt?: Date; attemptedAt?: Date }
) {
  const db = await getDb();
  if (!db) return;
  const updates: Record<string, unknown> = { status, ...extra };
  if ((status === "posted" || status === "failed") && !extra?.attemptedAt) updates.attemptedAt = new Date();
  await db
    .update(xReplies)
    .set(updates)
    .where(eq(xReplies.id, id));
}

export async function updateXReplyContent(id: number, replyContent: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(xReplies).set({ replyContent }).where(eq(xReplies.id, id));
}

export async function getXReplyByTweetId(tweetId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(xReplies).where(eq(xReplies.tweetId, tweetId)).limit(1);
  return result[0] || null;
}

export async function countXRepliesToday() {
  const db = await getDb();
  if (!db) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(xReplies)
    .where(and(eq(xReplies.status, "posted"), gte(xReplies.postedAt, today)));
  return Number(result[0]?.count) || 0;
}
export async function deleteXReply(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(xReplies).where(eq(xReplies.id, id));
}

/** Count how many times we have engaged (posted/pending/approved) with a given Twitter handle. */
export async function countRepliesByUserHandle(handle: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: count() })
    .from(xReplies)
    .where(
      and(
        eq(xReplies.tweetAuthorHandle, handle),
        inArray(xReplies.status, ["pending", "approved", "posted"])
      )
    );
  return rows[0]?.count ?? 0;
}

/** Return the set of article slugs already used when engaging with a given Twitter handle. */
export async function getArticlesUsedWithUser(handle: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ slug: xReplies.articleSlug })
    .from(xReplies)
    .where(
      and(
        eq(xReplies.tweetAuthorHandle, handle),
        inArray(xReplies.status, ["pending", "approved", "posted"])
      )
    );
  return rows.map((r) => r.slug).filter(Boolean) as string[];
}

/**
 * Prune xReplies table by status — keep the most recent `keepCount` rows,
 * delete everything older. Called at the end of each cycle to cap queue size.
 */
export async function pruneXRepliesByStatus(
  status: "pending" | "approved" | "posted" | "failed" | "skipped",
  keepCount: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Find the IDs of the rows to keep (newest first)
  const toKeep = await db
    .select({ id: xReplies.id })
    .from(xReplies)
    .where(eq(xReplies.status, status))
    .orderBy(desc(xReplies.createdAt))
    .limit(keepCount);
  if (toKeep.length < keepCount) return 0; // not enough rows to prune yet
  const keepIds = toKeep.map((r) => r.id);
  // Delete all rows with this status that are NOT in the keep list
  const result = await db
    .delete(xReplies)
    .where(
      and(
        eq(xReplies.status, status),
        sql`${xReplies.id} NOT IN (${sql.join(keepIds.map((id) => sql`${id}`), sql`, `)})`
      )
    ) as any;
  const deleted: number = Array.isArray(result) ? result[0]?.affectedRows ?? 0 : 0;
  if (deleted > 0) {
    console.log(`[X Reply Queue] Pruned ${deleted} old '${status}' replies (keeping last ${keepCount})`);
  }
  return deleted;
}

/** Delete ALL failed replies from the queue. Returns count deleted. */
export async function purgeFailedXReplies(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .delete(xReplies)
    .where(eq(xReplies.status, "failed")) as any;
  const deleted: number = Array.isArray(result) ? result[0]?.affectedRows ?? 0 : 0;
  if (deleted > 0) {
    console.log(`[X Reply Queue] Purged ${deleted} failed replies`);
  }
  return deleted;
}

/** Get all pending articles created more than N hours ago (for auto-approve). */
export async function getPendingArticlesOlderThan(hours: number) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.status, "pending"),
        sql`${articles.createdAt} <= ${cutoff}`
      )
    );
}


// ─── CEO Dashboard Helpers ───────────────────────────────────────
/** Count articles by status. */
export async function countArticlesByStatus(status: string): Promise<number> {
  const stats = await getArticleStats();
  return (stats as Record<string, number>)[status] ?? 0;
}

/** Count articles published since a given date. */
export async function countArticlesPublishedSince(since: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.status, "published"), gte(articles.publishedAt, since)));
  return rows.length;
}

/** Count social posts with status=posted since a given date. */
export async function countSocialPostsPostedSince(since: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: socialPosts.id })
    .from(socialPosts)
    .where(and(eq(socialPosts.status, "posted"), gte(socialPosts.postedAt, since)));
  return rows.length;
}

/** Get article count grouped by category name. */
export async function getArticleCountByCategory(): Promise<{ name: string | null; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ name: categories.name, count: sql<number>`COUNT(*)` })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.status, "published"))
    .groupBy(categories.name)
    .orderBy(desc(sql`COUNT(*)`));
  return rows.map(r => ({ name: r.name, count: Number(r.count) }));
}

/** Get the N most recently published articles. */
export async function getRecentPublishedArticles(limit: number): Promise<{ headline: string; slug: string; publishedAt: Date | null }[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ headline: articles.headline, slug: articles.slug, publishedAt: articles.publishedAt })
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

/** Get daily article counts for the last N days. */
export async function getDailyArticleCounts(days: number): Promise<{ date: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().slice(0, 19).replace('T', ' ');
  const rows = await db.execute(
    sql`SELECT DATE(publishedAt) as date, COUNT(*) as count FROM articles WHERE status = 'published' AND publishedAt >= ${sinceStr} GROUP BY DATE(publishedAt) ORDER BY DATE(publishedAt) DESC`
  ) as any;
  const result = Array.isArray(rows) ? rows[0] : rows;
  return (Array.isArray(result) ? result : []).map((r: any) => ({ date: String(r.date ?? '').slice(0, 10), count: Number(r.count) }));
}

/** Count active newsletter subscribers. */
export async function countNewsletterSubscribers(status: string, licenseId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, status as "active" | "unsubscribed"));
  return rows.length;
}

/** Count newsletter subscribers who joined since a given date. */
export async function countNewsletterSubscribersJoinedSince(since: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(and(eq(newsletterSubscribers.status, "active"), gte(newsletterSubscribers.createdAt, since)));
  return rows.length;
}

/** List all CEO directives ordered by date descending. */
export async function listCeoDirectives() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ceoDirectives)
    .orderBy(desc(ceoDirectives.createdAt));
}

/** Create a new CEO directive. */
export async function createCeoDirective(data: {
  directiveDate: string;
  fromName?: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  subject: string;
  body: string;
  status?: "Pending" | "In Progress" | "Complete" | "Cancelled";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(ceoDirectives).values({
    directiveDate: data.directiveDate,
    fromName: data.fromName ?? "Claude, CEO",
    priority: data.priority,
    subject: data.subject,
    body: data.body,
    status: data.status ?? "Pending",
  });
}

/** Update a CEO directive's status. */
export async function updateCeoDirectiveStatus(id: number, status: "Pending" | "In Progress" | "Complete" | "Cancelled", completedDate?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(ceoDirectives).set({ status, completedDate: completedDate ?? null }).where(eq(ceoDirectives.id, id));
}

export async function deleteCeoDirective(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(ceoDirectives).where(eq(ceoDirectives.id, id));
}

// ─── Covered Topics (cross-batch memory, Fix 6) ───────────────────────────────
/** Store a list of topic strings for a given batch date. */
export async function storeCoveredTopics(topics: string[], batchDate: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (topics.length === 0) return;
  await db.insert(coveredTopics).values(topics.map(t => ({ topic: t, batchDate })));
}

/** Return topics covered in the last N days (deduped). */
export async function getRecentCoveredTopics(days: number = 2): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({ topic: coveredTopics.topic })
    .from(coveredTopics)
    .where(gte(coveredTopics.createdAt, cutoff));
  const seen = new Set<string>();
  return rows.map(r => r.topic).filter(t => { if (seen.has(t)) return false; seen.add(t); return true; });
}

/** Prune covered_topics rows older than N days to keep the table small. */
export async function pruneOldCoveredTopics(days: number = 7): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await db.delete(coveredTopics).where(lte(coveredTopics.createdAt, cutoff));
}

// ─── Recent Headlines (Fix 2 — headline dedup) ────────────────────────────────
/** Return the last N published/approved article headlines for dedup comparison. */
export async function getRecentHeadlines(days: number = 3): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({ headline: articles.headline })
    .from(articles)
    .where(and(
      gte(articles.createdAt, cutoff),
      sql`${articles.status} IN ('approved', 'published', 'pending')`
    ))
    .orderBy(desc(articles.createdAt))
    .limit(500);
  return rows.map(r => r.headline);
}

// ─── Affiliate Click Tracking ──────────────────────────────────────────────────
/** Log an affiliate click event. */
export async function logAffiliateClick(data: {
  articleId?: number;
  articleSlug?: string;
  targetUrl: string;
  clickType?: string;
  referrer?: string;
  userAgent?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(affiliateClicks).values({
    articleId: data.articleId ?? null,
    articleSlug: data.articleSlug ?? null,
    targetUrl: data.targetUrl,
    clickType: data.clickType ?? 'amazon',
    referrer: data.referrer ?? null,
    userAgent: data.userAgent ?? null,
  });
}

//** Total affiliate clicks in the last N days. */
export async function countAffiliateClicks(days: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(affiliateClicks)
    .where(gte(affiliateClicks.createdAt, cutoff));
  return Number(result[0]?.count ?? 0);
}
/** Count affiliate clicks filtered by clickType ('amazon' | 'sponsor') in the last N days. */
export async function countAffiliateClicksByType(days: number = 30, clickType: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(affiliateClicks)
    .where(and(gte(affiliateClicks.createdAt, cutoff), eq(affiliateClicks.clickType, clickType)));
  return Number(result[0]?.count ?? 0);
}
/** Top articles by affiliate clicks in the last N days. */
export async function getTopAffiliateArticles(days: number = 30, limit: number = 10): Promise<{ slug: string; clicks: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    slug: affiliateClicks.articleSlug,
    clicks: sql<number>`count(*)`,
  })
    .from(affiliateClicks)
    .where(and(gte(affiliateClicks.createdAt, cutoff), isNotNull(affiliateClicks.articleSlug)))
    .groupBy(affiliateClicks.articleSlug)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(limit);
  return rows.map(r => ({ slug: r.slug!, clicks: Number(r.clicks) }));
}

/** Affiliate clicks grouped by day for the last N days. */
export async function getAffiliateClicksByDay(days: number = 30): Promise<{ date: string; clicks: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    date: sql<string>`DATE(${affiliateClicks.createdAt})`,
    clicks: sql<number>`count(*)`,
  })
    .from(affiliateClicks)
    .where(gte(affiliateClicks.createdAt, cutoff))
    .groupBy(sql`DATE(${affiliateClicks.createdAt})`)
    .orderBy(sql`DATE(${affiliateClicks.createdAt})`);
  return rows.map(r => ({ date: r.date, clicks: Number(r.clicks) }));
}

// ─── Page View Tracking ────────────────────────────────────────────────────────
/** Log a page view with source classification. */
export async function logPageView(data: {
  articleId?: number;
  articleSlug?: string;
  source?: string;
  medium?: string;
  referrer?: string;
  path?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(pageViews).values({
    articleId: data.articleId ?? null,
    articleSlug: data.articleSlug ?? null,
    source: data.source ?? null,
    medium: data.medium ?? null,
    referrer: data.referrer ?? null,
    path: data.path ?? null,
  });
}

/** Total page views in the last N days grouped by traffic source. */
export async function getPageViewsBySource(days: number = 30): Promise<{ source: string; views: number }[]> {
  await getDb(); // ensure pool is initialized
  if (!_pool) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const [rows] = await _pool.execute(
      `SELECT COALESCE(source, 'direct') AS source, COUNT(*) AS views
       FROM page_views WHERE createdAt >= ? GROUP BY COALESCE(source, 'direct')
       ORDER BY views DESC`,
      [cutoff]
    ) as [{ source: string; views: number | string }[], unknown];
    return rows.map(r => ({ source: r.source, views: Number(r.views) }));
  } catch {
    return [];
  }
}

/** Daily page views for the last N days. */
export async function getDailyPageViews(days: number = 30): Promise<{ date: string; views: number }[]> {
  await getDb(); // ensure pool is initialized
  if (!_pool) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const limit = Math.max(1, Math.min(365, Math.floor(days))); // safe integer, no parameterization needed
  try {
    const [rows] = await _pool.execute(
      `SELECT DATE(createdAt) AS date, COUNT(*) AS views
       FROM page_views WHERE createdAt >= ?
       GROUP BY DATE(createdAt) ORDER BY DATE(createdAt) DESC LIMIT ${limit}`,
      [cutoff]
    ) as [{ date: string | Date; views: number | string }[], unknown];
    return rows.map(r => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      views: Number(r.views),
    }));
  } catch (e) {
    console.error('[getDailyPageViews] query failed:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

/** Page views by source per day for the last N days. */
export async function getPageViewsBySourceAndDay(days: number = 7): Promise<{ date: string; source: string; views: number }[]> {
  await getDb(); // ensure pool is initialized
  if (!_pool) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const [rows] = await _pool.execute(
      `SELECT DATE(createdAt) AS date, COALESCE(source, 'direct') AS source, COUNT(*) AS views
       FROM page_views WHERE createdAt >= ?
       GROUP BY DATE(createdAt), COALESCE(source, 'direct')
       ORDER BY DATE(createdAt) DESC`,
      [cutoff]
    ) as [{ date: string | Date; source: string; views: number | string }[], unknown];
    return rows.map(r => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      source: r.source,
      views: Number(r.views),
    }));
  } catch {
    return [];
  }
}

/**
 * Internal hostname patterns that should be excluded from external traffic counts.
 * These are dev/build/staging URLs, not real visitor traffic.
 */
const INTERNAL_HOST_PATTERNS = [
  '.manus.space', '.manus.computer', '.run.app', 'localhost', '127.0.0.1',
  'manus.space', 'manus.computer',
];

/**
 * Returns true if a source value looks like an internal/dev hostname
 * (as opposed to a classified source name like "x", "direct", "google").
 */
export function isInternalSource(source: string): boolean {
  if (!source) return false;
  const s = source.toLowerCase();
  // Classified source names are short and don't contain dots (except TLDs in referral domains)
  // Internal sources are full hostnames containing known internal patterns
  return INTERNAL_HOST_PATTERNS.some(p => s.includes(p));
}

/** Total external page views in the last N days (excludes internal dev/build traffic). */
export async function countExternalPageViews(days: number = 30): Promise<number> {
  await getDb();
  if (!_pool) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  // Exclude rows where source matches known internal hostname patterns
  // Also exclude rows where source is a full hostname (contains a dot but is not a known social/search source)
  // We identify internal traffic as: source contains .manus.space, .run.app, .manus.computer, localhost
  try {
    const [rows] = await _pool.execute(
      `SELECT COUNT(*) AS cnt FROM page_views
       WHERE createdAt >= ?
       AND (source IS NULL
         OR source NOT LIKE '%.manus.space'
         AND source NOT LIKE '%.manus.computer'
         AND source NOT LIKE '%.run.app'
         AND source NOT LIKE '%localhost%'
         AND source NOT LIKE '%127.0.0.1%'
       )`,
      [cutoff]
    ) as [{ cnt: number | string }[], unknown];
    return Number(rows[0]?.cnt ?? 0);
  } catch {
    return 0;
  }
}

/** External traffic sources for the last N days (excludes internal dev/build traffic). */
export async function getExternalPageViewsBySource(days: number = 30): Promise<{ source: string; views: number }[]> {
  await getDb();
  if (!_pool) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const [rows] = await _pool.execute(
      `SELECT COALESCE(source, 'direct') AS source, COUNT(*) AS views
       FROM page_views
       WHERE createdAt >= ?
       AND (source IS NULL
         OR source NOT LIKE '%.manus.space'
         AND source NOT LIKE '%.manus.computer'
         AND source NOT LIKE '%.run.app'
         AND source NOT LIKE '%localhost%'
         AND source NOT LIKE '%127.0.0.1%'
       )
       GROUP BY COALESCE(source, 'direct')
       ORDER BY views DESC`,
      [cutoff]
    ) as [{ source: string; views: number | string }[], unknown];
    return rows.map(r => ({ source: r.source, views: Number(r.views) }));
  } catch {
    return [];
  }
}

/** Internal traffic sources for the last N days (dev/build/staging URLs only). */
export async function getInternalPageViewsBySource(days: number = 30): Promise<{ source: string; views: number }[]> {
  await getDb();
  if (!_pool) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const [rows] = await _pool.execute(
      `SELECT source, COUNT(*) AS views
       FROM page_views
       WHERE createdAt >= ?
       AND source IS NOT NULL
       AND (
         source LIKE '%.manus.space'
         OR source LIKE '%.manus.computer'
         OR source LIKE '%.run.app'
         OR source LIKE '%localhost%'
         OR source LIKE '%127.0.0.1%'
       )
       GROUP BY source
       ORDER BY views DESC
       LIMIT 10`,
      [cutoff]
    ) as [{ source: string; views: number | string }[], unknown];
    return rows.map(r => ({ source: r.source, views: Number(r.views) }));
  } catch {
    return [];
  }
}

/** Total page views in the last N days. */
export async function countPageViews(days: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(pageViews)
    .where(gte(pageViews.createdAt, cutoff));
  return Number(result[0]?.count ?? 0);
}

// ─── Promotion Candidates ─────────────────────────────────────────────────────

export interface PromotionCandidate {
  articleId: number;
  headline: string;
  slug: string;
  category: string | null;
  publishedAt: string;
  hoursLive: number;
  totalViews: number;
  xViews: number;
  affiliateClicks: number;
  affiliateCtr: number;  // affiliate clicks / total views as percentage
  score: number;         // composite score for ranking
}

export async function getPromotionCandidates(
  maxAgeHours: number = 48,
  minXViews: number = 10,
  minAffiliateCtr: number = 0,
  limit: number = 10,
  categoryCap: number = 3,
): Promise<PromotionCandidate[]> {
  const db = await getDb();
  if (!db) return [];

  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  // Get recent published articles
  const recentArticles = await db.select({
    id: articles.id,
    headline: articles.headline,
    slug: articles.slug,
    categoryId: articles.categoryId,
    publishedAt: articles.publishedAt,
    views: articles.views,
  })
    .from(articles)
    .where(and(
      eq(articles.status, "published"),
      sql`${articles.publishedAt} >= ${cutoff}`,
      isNotNull(articles.publishedAt),
    ))
    .orderBy(desc(articles.publishedAt));

  if (recentArticles.length === 0) return [];

  // Get category names
  const cats = await listCategories();
  const catMap = new Map(cats.map(c => [c.id, c.name]));

  const candidates: PromotionCandidate[] = [];

  for (const article of recentArticles) {
    const slug = article.slug;
    if (!slug) continue;

    // Count page views from X
    const xViewResult = await db.select({ count: sql<number>`count(*)` })
      .from(pageViews)
      .where(and(
        eq(pageViews.articleSlug, slug),
        eq(pageViews.source, "x"),
      ));
    const xViews = Number(xViewResult[0]?.count ?? 0);

    // Count affiliate clicks
    const clickResult = await db.select({ count: sql<number>`count(*)` })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.articleSlug, slug));
    const affClicks = Number(clickResult[0]?.count ?? 0);

    const totalViews = article.views ?? 0;
    const affiliateCtr = totalViews > 0 ? (affClicks / totalViews) * 100 : 0;
    const hoursLive = (Date.now() - new Date(article.publishedAt!).getTime()) / (1000 * 60 * 60);

    // Apply minimum thresholds
    if (xViews < minXViews) continue;
    if (affiliateCtr < minAffiliateCtr) continue;

    // Composite score: X views dominant, affiliate CTR revenue signal, freshness tiebreaker
    const score = (xViews * 10) + (affiliateCtr * 50) + Math.max(0, (48 - hoursLive));

    candidates.push({
      articleId: article.id,
      headline: article.headline,
      slug,
      category: article.categoryId ? catMap.get(article.categoryId) || null : null,
      publishedAt: new Date(article.publishedAt!).toISOString(),
      hoursLive: Math.round(hoursLive * 10) / 10,
      totalViews,
      xViews,
      affiliateClicks: affClicks,
      affiliateCtr: Math.round(affiliateCtr * 100) / 100,
      score: Math.round(score),
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Apply category diversity cap
  const categoryCounts: Record<string, number> = {};
  const diverseCandidates = candidates.filter(c => {
    const cat = c.category || "uncategorized";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    return categoryCounts[cat] <= categoryCap;
  });

  return diverseCandidates.slice(0, limit);
}

// ─── Related Articles ─────────────────────────────────────────────────────────

export interface RelatedArticle {
  id: number;
  headline: string;
  slug: string;
  featuredImage: string | null;
  publishedAt: string | null;
  categoryId: number | null;
}

export async function getRelatedArticles(
  currentSlug: string,
  categoryId: number | null,
  limit: number = 4,
): Promise<RelatedArticle[]> {
  const db = await getDb();
  if (!db) return [];

  // Tag-based related articles: find articles sharing the most tags with the current article
  try {
    const { getArticleTags, getArticlesByTag } = await import('./tagging');
    // Get the current article's ID from slug
    const currentArticle = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, currentSlug)).limit(1);
    if (currentArticle.length > 0) {
      const currentId = currentArticle[0].id;
      const currentTags = await getArticleTags(currentId);
      if (currentTags.length > 0) {
        // Find articles sharing tags, scored by overlap count
        const tagSlugs = currentTags.map(t => t.slug);
        const tagArticleMap = new Map<number, { id: number; headline: string; slug: string; featuredImage: string | null; publishedAt: Date | null; categoryId: number | null; score: number }>();
        for (const tagSlug of tagSlugs) {
          const { articles: tagArticles } = await getArticlesByTag(tagSlug, { limit: 20 });
          for (const a of tagArticles) {
            if (a.slug === currentSlug) continue;
            const existing = tagArticleMap.get(a.id);
            if (existing) {
              existing.score++;
            } else {
              tagArticleMap.set(a.id, { ...a, score: 1 });
            }
          }
        }
        if (tagArticleMap.size > 0) {
          const sorted = Array.from(tagArticleMap.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
          if (sorted.length >= limit) {
            return sorted.map(r => ({
              id: r.id,
              headline: r.headline,
              slug: r.slug,
              featuredImage: r.featuredImage,
              publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
              categoryId: r.categoryId,
            }));
          }
        }
      }
    }
  } catch { /* fall through to category-based */ }

  // If we have a category, prefer same-category articles
  if (categoryId) {
    const rows = await db.select({
      id: articles.id,
      headline: articles.headline,
      slug: articles.slug,
      featuredImage: articles.featuredImage,
      publishedAt: articles.publishedAt,
      categoryId: articles.categoryId,
    })
      .from(articles)
      .where(and(
        eq(articles.status, "published"),
        eq(articles.categoryId, categoryId),
        sql`${articles.slug} != ${currentSlug}`,
        isNotNull(articles.publishedAt),
      ))
      .orderBy(desc(articles.publishedAt))
      .limit(limit);

    if (rows.length >= limit) {
      return rows.map(r => ({
        ...r,
        publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
      }));
    }

    // Pad with recent articles from other categories if not enough same-category
    const existingIds = rows.map(r => r.id);
    const extra = await db.select({
      id: articles.id,
      headline: articles.headline,
      slug: articles.slug,
      featuredImage: articles.featuredImage,
      publishedAt: articles.publishedAt,
      categoryId: articles.categoryId,
    })
      .from(articles)
      .where(and(
        eq(articles.status, "published"),
        sql`${articles.slug} != ${currentSlug}`,
        existingIds.length > 0 ? sql`${articles.id} NOT IN (${sql.join(existingIds.map(id => sql`${id}`), sql`, `)})` : sql`1=1`,
        isNotNull(articles.publishedAt),
      ))
      .orderBy(desc(articles.publishedAt))
      .limit(limit - rows.length);

    return [...rows, ...extra].map(r => ({
      ...r,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    }));
  }

  // No category — just return recent published articles
  const rows = await db.select({
    id: articles.id,
    headline: articles.headline,
    slug: articles.slug,
    featuredImage: articles.featuredImage,
    publishedAt: articles.publishedAt,
    categoryId: articles.categoryId,
  })
    .from(articles)
    .where(and(
      eq(articles.status, "published"),
      sql`${articles.slug} != ${currentSlug}`,
      isNotNull(articles.publishedAt),
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);

  return rows.map(r => ({
    ...r,
    publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
  }));
}

// ─── Merch Store ─────────────────────────────────────────────────────────────

/** Get a cached merch product for an article + product type. */
export async function getMerchProduct(articleId: number, productType: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(merchProducts)
    .where(and(eq(merchProducts.articleId, articleId), eq(merchProducts.productType, productType as any)))
    .limit(1);
  return result[0] ?? null;
}

/** Cache a merch product after Printify creation. */
export async function upsertMerchProduct(data: InsertMerchProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(merchProducts).values(data).onDuplicateKeyUpdate({
    set: {
      status: data.status,
      errorMessage: data.errorMessage,
      upscaledImageUrl: data.upscaledImageUrl,
      printifyProductId: data.printifyProductId,
      printifyShopId: data.printifyShopId,
      blueprintId: data.blueprintId,
      mockupUrls: data.mockupUrls,
      basePrice: data.basePrice,
      sellPrice: data.sellPrice,
      variantData: data.variantData,
      cachedAt: new Date(),
    },
  });
}

/** Record a merch lead (email capture pre-checkout). */
export async function createMerchLead(data: InsertMerchLead) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(merchLeads).values(data);
  return result[0].insertId;
}

/** Count merch leads. Pass `days` to filter to the last N days; omit for all-time. */
export async function countMerchLeads(days?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (days !== undefined) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(merchLeads)
      .where(gte(merchLeads.createdAt, cutoff));
    return Number(result[0]?.count ?? 0);
  }
  const result = await db.select({ count: sql<number>`count(*)` }).from(merchLeads);
  return Number(result[0]?.count ?? 0);
}

/** Update the pipeline status of a merch product (pending/failed + optional error/upscaled URL). */
export async function updateMerchProductStatus(
  articleId: number,
  productType: string,
  status: "pending" | "ready" | "failed",
  errorMessage?: string,
  upscaledImageUrl?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(merchProducts)
    .set({
      status: status as "pending" | "ready" | "failed",
      ...(errorMessage !== undefined ? { errorMessage } : {}),
      ...(upscaledImageUrl !== undefined ? { upscaledImageUrl } : {}),
    })
    .where(
      and(
        eq(merchProducts.articleId, articleId),
        eq(merchProducts.productType, productType as "mug" | "shirt" | "poster" | "case" | "digital")
      )
    );
}

/** Mark a merch product as ready with all Printify data. */
export async function updateMerchProductReady(
  articleId: number,
  productType: string,
  data: {
    printifyProductId: string;
    printifyShopId: string;
    blueprintId: number;
    mockupUrls: string[];
    basePrice: string;
    sellPrice: string;
    upscaledImageUrl: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(merchProducts)
    .set({
      status: "ready",
      errorMessage: null,
      printifyProductId: data.printifyProductId,
      printifyShopId: data.printifyShopId,
      blueprintId: data.blueprintId,
      mockupUrls: data.mockupUrls as any,
      basePrice: data.basePrice,
      sellPrice: data.sellPrice,
      upscaledImageUrl: data.upscaledImageUrl,
      cachedAt: new Date(),
    })
    .where(
      and(
        eq(merchProducts.articleId, articleId),
        eq(merchProducts.productType, productType as "mug" | "shirt" | "poster" | "case" | "digital")
      )
    );
}

/** List all merch products with article info, status, and pricing. */
export async function listMerchProducts(opts?: {
  limit?: number;
  offset?: number;
}): Promise<Array<{
  id: number;
  articleId: number;
  productType: string | null;
  status: string | null;
  errorMessage: string | null;
  printifyProductId: string | null;
  basePrice: string | null;
  sellPrice: string | null;
  cachedAt: Date | null;
  articleHeadline: string | null;
  articleSlug: string | null;
  articleImage: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 100;
  const offset = opts?.offset ?? 0;
  const rows = await db
    .select({
      id: merchProducts.id,
      articleId: merchProducts.articleId,
      productType: merchProducts.productType,
      status: merchProducts.status,
      errorMessage: merchProducts.errorMessage,
      printifyProductId: merchProducts.printifyProductId,
      basePrice: merchProducts.basePrice,
      sellPrice: merchProducts.sellPrice,
      cachedAt: merchProducts.cachedAt,
      articleHeadline: articles.headline,
      articleSlug: articles.slug,
      articleImage: articles.featuredImage,
    })
    .from(merchProducts)
    .leftJoin(articles, eq(articles.id, merchProducts.articleId))
    .orderBy(desc(merchProducts.cachedAt))
    .limit(limit)
    .offset(offset);
  return rows;
}


/**
 * Returns the most recent published articles in a given category (by category slug).
 * Used by category pages for SSR crawl-path injection.
 */
export async function getArticlesByCategory(categorySlug: string, limit: number = 20): Promise<Array<{ slug: string; headline: string }>> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ slug: articles.slug, headline: articles.headline })
    .from(articles)
    .innerJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(
      eq(articles.status, "published"),
      eq(categories.slug, categorySlug)
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

// ─── Newsletter Send History ──────────────────────────────────────────────────

export async function getNewsletterSendHistory(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const { newsletterSendHistory } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  return db.select().from(newsletterSendHistory).orderBy(desc(newsletterSendHistory.sentAt)).limit(limit);
}

// ─── Platform Credentials ────────────────────────────────────────────────────

export async function getPlatformCredential(platform: string) {
  const db = await getDb();
  if (!db) return null;
  const { platformCredentials } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const [cred] = await db.select().from(platformCredentials).where(eq(platformCredentials.platform, platform)).limit(1);
  return cred ?? null;
}

export async function upsertPlatformCredential(platform: string, data: { apiKey?: string; apiSecret?: string; extra?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { platformCredentials } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const existing = await getPlatformCredential(platform);
  if (existing) {
    await db.update(platformCredentials).set({ ...data }).where(eq(platformCredentials.platform, platform));
  } else {
    await db.insert(platformCredentials).values({ platform, ...data });
  }
  return getPlatformCredential(platform);
}

// ─── Social Distribution Queue ────────────────────────────────────────────────

export async function getDistributionQueue(opts?: { status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const { distributionQueue } = await import("../drizzle/schema");
  const { desc, eq, sql } = await import("drizzle-orm");
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  let query = db.select().from(distributionQueue);
  if (opts?.status) {
    query = (query as any).where(eq(distributionQueue.status, opts.status as any));
  }
  const items = await (query as any).orderBy(desc(distributionQueue.createdAt)).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(distributionQueue);
  return { items, total: Number(count) };
}

export async function getDistributionQueueStats() {
  const db = await getDb();
  if (!db) return { pending: 0, sent: 0, failed: 0, skipped: 0 };
  const { distributionQueue } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");
  const rows = await db.select({
    status: distributionQueue.status,
    count: sql<number>`count(*)`,
  }).from(distributionQueue).groupBy(distributionQueue.status);
  const stats: Record<string, number> = { pending: 0, sent: 0, failed: 0, skipped: 0, sending: 0 };
  for (const r of rows) stats[r.status] = Number(r.count);
  return stats;
}

export async function getRedditSubredditMap() {
  const db = await getDb();
  if (!db) return [];
  const { redditSubredditMap } = await import("../drizzle/schema");
  const { asc } = await import("drizzle-orm");
  return db.select().from(redditSubredditMap).orderBy(asc(redditSubredditMap.subreddit));
}

export async function upsertRedditSubreddit(data: { id?: number; subreddit: string; categorySlug?: string | null; isActive?: boolean; weight?: number; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { redditSubredditMap } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(redditSubredditMap).set(rest).where(eq(redditSubredditMap.id, id));
    return id;
  } else {
    const [result] = await db.insert(redditSubredditMap).values(data as any).$returningId();
    return result.id;
  }
}

export async function deleteRedditSubreddit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { redditSubredditMap } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db.delete(redditSubredditMap).where(eq(redditSubredditMap.id, id));
}

// ─── Setup Checklist Helpers ─────────────────────────────────────────────────

export async function getSetupChecklist() {
  const { setupChecklist } = await import("../drizzle/schema");
  const { asc } = await import("drizzle-orm");
  const d = await getDb();
  if (!d) return [];
  return d.select().from(setupChecklist).orderBy(asc(setupChecklist.sortOrder));
}

export async function completeSetupItem(key: string, completedBy: string) {
  const { setupChecklist } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const d = await getDb();
  if (!d) return { success: false };
  await d.update(setupChecklist).set({ completedAt: new Date(), completedBy }).where(eq(setupChecklist.key, key));
  return { success: true };
}

export async function uncompleteSetupItem(key: string) {
  const { setupChecklist } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const d = await getDb();
  if (!d) return { success: false };
  await d.update(setupChecklist).set({ completedAt: null, completedBy: null }).where(eq(setupChecklist.key, key));
  return { success: true };
}

export async function getSetupSummary() {
  const { setupChecklist } = await import("../drizzle/schema");
  const { asc } = await import("drizzle-orm");
  const d = await getDb();
  if (!d) return { total: 0, completed: 0, required: 0, requiredCompleted: 0, percent: 0, sections: {} as Record<string, { total: number; completed: number }> };
  const items = await d.select().from(setupChecklist).orderBy(asc(setupChecklist.sortOrder));
  const total = items.length;
  const completed = items.filter(i => i.completedAt).length;
  const required = items.filter(i => i.isRequired).length;
  const requiredCompleted = items.filter(i => i.isRequired && i.completedAt).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const sections: Record<string, { total: number; completed: number }> = {};
  for (const item of items) {
    const sec = item.section ?? "other";
    if (!sections[sec]) sections[sec] = { total: 0, completed: 0 };
    sections[sec].total++;
    if (item.completedAt) sections[sec].completed++;
  }
  return { total, completed, required, requiredCompleted, percent, sections };
}

export async function isSetupComplete() {
  const { setupChecklist } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const d = await getDb();
  if (!d) return false;
  const required = await d.select({ completedAt: setupChecklist.completedAt }).from(setupChecklist).where(eq(setupChecklist.isRequired, true));
  if (required.length === 0) return false;
  return required.every(i => i.completedAt !== null);
}

export async function seedSetupChecklistIfEmpty(seed: Array<{ key: string; label: string; description?: string; section?: string; sortOrder: number; isRequired: boolean }>) {
  const { setupChecklist } = await import("../drizzle/schema");
  const d = await getDb();
  if (!d) return;
  const existing = await d.select({ key: setupChecklist.key }).from(setupChecklist).limit(1);
  if (existing.length > 0) return;
  for (const item of seed) {
    await d.insert(setupChecklist).values(item).onDuplicateKeyUpdate({ set: { label: item.label } });
  }
}



// ─── Distribution Performance Analytics ─────────────────────────────────────

export async function getDistributionPerformance() {
  const db = await getDb();
  if (!db) return { totalPosts: 0, totalEngagement: 0, avgEngagement: 0, failedPosts: 0, byPlatform: {}, topPosts: [], removedPosts: [] };
  const { distributionQueue } = await import("../drizzle/schema");
  const { gte, eq, sql, desc, inArray, isNotNull } = await import("drizzle-orm");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Aggregate by platform
  const platformRows = await db
    .select({
      platform: distributionQueue.platform,
      status: distributionQueue.status,
      count: sql<number>`count(*)`,
      totalLikes: sql<number>`COALESCE(SUM(engagement_likes), 0)`,
      totalComments: sql<number>`COALESCE(SUM(engagement_comments), 0)`,
      totalShares: sql<number>`COALESCE(SUM(engagement_shares), 0)`,
    })
    .from(distributionQueue)
    .where(gte(distributionQueue.createdAt, sevenDaysAgo))
    .groupBy(distributionQueue.platform, distributionQueue.status);

  const byPlatform: Record<string, { posts: number; totalEngagement: number; failed: number }> = {};
  let totalPosts = 0;
  let totalEngagement = 0;
  let failedPosts = 0;

  for (const row of platformRows) {
    if (!byPlatform[row.platform]) byPlatform[row.platform] = { posts: 0, totalEngagement: 0, failed: 0 };
    const eng = Number(row.totalLikes) + Number(row.totalComments) + Number(row.totalShares);
    if (row.status === "sent") {
      byPlatform[row.platform].posts += Number(row.count);
      byPlatform[row.platform].totalEngagement += eng;
      totalPosts += Number(row.count);
      totalEngagement += eng;
    } else if (row.status === "failed") {
      byPlatform[row.platform].failed += Number(row.count);
      failedPosts += Number(row.count);
    }
  }

  const avgEngagement = totalPosts > 0 ? totalEngagement / totalPosts : 0;

  // Top 10 posts by engagement
  const topPosts = await db
    .select()
    .from(distributionQueue)
    .where(
      eq(distributionQueue.status, "sent")
    )
    .orderBy(
      desc(sql`COALESCE(engagement_likes, 0) + COALESCE(engagement_comments, 0) + COALESCE(engagement_shares, 0)`)
    )
    .limit(10);

  // Removed or failed posts in last 7 days
  const removedPosts = await db
    .select()
    .from(distributionQueue)
    .where(
      inArray(distributionQueue.status, ["failed"])
    )
    .orderBy(desc(distributionQueue.createdAt))
    .limit(20);

  // Also include posts with removedAt set
  const removedByPlatform = await db
    .select()
    .from(distributionQueue)
    .where(isNotNull(distributionQueue.removedAt))
    .orderBy(desc(distributionQueue.removedAt))
    .limit(20);

  const allRemoved = [...removedPosts, ...removedByPlatform].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

  return {
    totalPosts,
    totalEngagement,
    avgEngagement,
    failedPosts,
    byPlatform,
    topPosts,
    removedPosts: allRemoved,
  };
}

// ─── Image Licenses ──────────────────────────────────────
export async function getImageLicenses(opts: { limit?: number; offset?: number; source?: string; articleId?: number } = {}) {
  const db = await getDb();
  if (!db) return { licenses: [], total: 0 };
  const conditions = [];
  if (opts.source) conditions.push(eq(imageLicenses.source, opts.source));
  if (opts.articleId) conditions.push(eq(imageLicenses.articleId, opts.articleId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, countResult] = await Promise.all([
    db.select().from(imageLicenses).where(where).orderBy(desc(imageLicenses.dateSourced)).limit(opts.limit ?? 50).offset(opts.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(imageLicenses).where(where),
  ]);
  return { licenses: rows, total: Number(countResult[0]?.count ?? 0) };
}

// ─── CEO Dashboard v2 Helpers ─────────────────────────────────────────────────

/** Hourly external page views for today (external traffic only, 24-bucket breakdown). */
export async function getHourlyExternalPageViews(): Promise<{ hour: number; views: number }[]> {
  await getDb();
  if (!_pool) return [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  try {
    const [rows] = await _pool.execute(
      `SELECT HOUR(createdAt) AS hour, COUNT(*) AS views
       FROM page_views
       WHERE createdAt >= ?
       AND (source IS NULL
         OR source NOT LIKE '%.manus.space'
         AND source NOT LIKE '%.manus.computer'
         AND source NOT LIKE '%.run.app'
         AND source NOT LIKE '%localhost%'
         AND source NOT LIKE '%127.0.0.1%'
       )
       GROUP BY HOUR(createdAt)
       ORDER BY HOUR(createdAt) ASC`,
      [todayStart]
    ) as [{ hour: number | string; views: number | string }[], unknown];
    return rows.map(r => ({ hour: Number(r.hour), views: Number(r.views) }));
  } catch {
    return [];
  }
}

/** Daily external page views for the last N days (external traffic only, ascending order). */
export async function getDailyExternalPageViews(days: number = 30): Promise<{ date: string; views: number }[]> {
  await getDb();
  if (!_pool) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const limit = Math.max(1, Math.min(365, Math.floor(days)));
  try {
    const [rows] = await _pool.execute(
      `SELECT DATE(createdAt) AS date, COUNT(*) AS views
       FROM page_views
       WHERE createdAt >= ?
       AND (source IS NULL
         OR source NOT LIKE '%.manus.space'
         AND source NOT LIKE '%.manus.computer'
         AND source NOT LIKE '%.run.app'
         AND source NOT LIKE '%localhost%'
         AND source NOT LIKE '%127.0.0.1%'
       )
       GROUP BY DATE(createdAt)
       ORDER BY DATE(createdAt) ASC
       LIMIT ${limit}`,
      [cutoff]
    ) as [{ date: string; views: number | string }[], unknown];
    return rows.map(r => ({ date: String(r.date), views: Number(r.views) }));
  } catch {
    return [];
  }
}

/** Count articles published between two dates. Used for trend % comparison. */
export async function countArticlesPublishedBetween(from: Date, to: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(and(
      gte(articles.publishedAt, from),
      lt(articles.publishedAt, to),
      eq(articles.status, "published")
    ));
  return Number(result[0]?.count ?? 0);
}

/** Count published articles with null categoryId (uncategorized). */
export async function countArticlesWithNullCategory(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(and(
      eq(articles.status, "published"),
      isNull(articles.categoryId)
    ));
  return Number(result[0]?.count ?? 0);
}

/** Count published articles with null or empty featuredImage. */
export async function countArticlesWithNoImage(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(and(
      eq(articles.status, "published"),
      isNull(articles.featuredImage)
    ));
  return Number(result[0]?.count ?? 0);
}

/** Get the oldest pending selector candidate (for pool health monitoring). */
export async function getOldestPendingCandidate(): Promise<{ title: string; sourceType: string; createdAt: Date } | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    title: selectorCandidates.title,
    sourceType: selectorCandidates.sourceType,
    createdAt: selectorCandidates.createdAt,
  })
    .from(selectorCandidates)
    .where(eq(selectorCandidates.status, "pending"))
    .orderBy(asc(selectorCandidates.createdAt))
    .limit(1);
  return result[0] ?? null;
}

// ─── Sponsor Attribution Report ───────────────────────────────────────────────
/**
 * Top articles by sponsor clicks (type='sponsor'), enriched with article headline and views.
 * Returns slug, headline, views, sponsorClicks, and a CTR estimate (clicks / views * 100).
 */
export async function getSponsorAttributionReport(
  days: number = 30,
  limit: number = 50,
  clickType: string = 'sponsor',
): Promise<{ slug: string; headline: string; views: number; sponsorClicks: number; ctr: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  // Aggregate sponsor clicks per slug
  const clickRows = await db.select({
    slug: affiliateClicks.articleSlug,
    clicks: sql<number>`count(*)`,
  })
    .from(affiliateClicks)
    .where(and(
      gte(affiliateClicks.createdAt, cutoff),
      isNotNull(affiliateClicks.articleSlug),
      eq(affiliateClicks.clickType, clickType),
    ))
    .groupBy(affiliateClicks.articleSlug)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(limit);

  if (clickRows.length === 0) return [];

  const slugs = clickRows.map(r => r.slug!);
  // Fetch article headlines and views for those slugs
  const articleRows = await db.select({
    slug: articles.slug,
    headline: articles.headline,
    views: articles.views,
  })
    .from(articles)
    .where(inArray(articles.slug, slugs));

  const articleMap = new Map(articleRows.map(a => [a.slug, a]));

  return clickRows.map(r => {
    const art = articleMap.get(r.slug!);
    const views = art?.views ?? 0;
    const clicks = Number(r.clicks);
    return {
      slug: r.slug!,
      headline: art?.headline ?? r.slug!,
      views,
      sponsorClicks: clicks,
      ctr: views > 0 ? Math.round((clicks / views) * 10000) / 100 : 0,
    };
  });
}

/**
 * Sponsor attribution totals: total clicks, total impressions (article views), blended CTR.
 */
export async function getSponsorAttributionTotals(
  days: number = 30,
  clickType: string = 'sponsor',
): Promise<{ totalClicks: number; totalViews: number; blendedCtr: number }> {
  const db = await getDb();
  if (!db) return { totalClicks: 0, totalViews: 0, blendedCtr: 0 };
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [clickResult] = await db.select({ total: sql<number>`count(*)` })
    .from(affiliateClicks)
    .where(and(gte(affiliateClicks.createdAt, cutoff), eq(affiliateClicks.clickType, clickType)));
  const totalClicks = Number(clickResult?.total ?? 0);
  // Total views for articles that had at least one sponsor click in the period
  const [viewResult] = await db.select({ total: sql<number>`sum(${articles.views})` })
    .from(articles)
    .where(eq(articles.status, 'published'));
  const totalViews = Number(viewResult?.total ?? 0);
  return {
    totalClicks,
    totalViews,
    blendedCtr: totalViews > 0 ? Math.round((totalClicks / totalViews) * 10000) / 100 : 0,
  };
}

// ─── A/B Sponsor Click Logging ────────────────────────────────────────────────
/**
 * Count sponsor clicks split by ab_variant ('a' or 'b') in the last N days.
 * Uses the clickType field: 'sponsor_a' for variant A, 'sponsor_b' for variant B.
 */
export async function countSponsorClicksByVariant(
  days: number = 30,
): Promise<{ a: number; b: number }> {
  const db = await getDb();
  if (!db) return { a: 0, b: 0 };
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [aResult, bResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(affiliateClicks)
      .where(and(gte(affiliateClicks.createdAt, cutoff), eq(affiliateClicks.clickType, 'sponsor_a'))),
    db.select({ count: sql<number>`count(*)` })
      .from(affiliateClicks)
      .where(and(gte(affiliateClicks.createdAt, cutoff), eq(affiliateClicks.clickType, 'sponsor_b'))),
  ]);
  return {
    a: Number(aResult[0]?.count ?? 0),
    b: Number(bResult[0]?.count ?? 0),
  };
}

// ─── Sponsor Schedule Helper ──────────────────────────────────────────────────
/**
 * Returns true if the current time is within the [activeFrom, activeUntil] window.
 * If both are empty, returns true (always active).
 * If only activeFrom is set, active from that time onward.
 * If only activeUntil is set, active until that time.
 */
export function sponsorIsActive(activeFrom: string, activeUntil: string): boolean {
  const now = Date.now();
  const from = activeFrom ? new Date(activeFrom).getTime() : null;
  const until = activeUntil ? new Date(activeUntil).getTime() : null;
  if (from && now < from) return false;
  if (until && now > until) return false;
  return true;
}
