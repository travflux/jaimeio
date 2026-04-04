import { getDb } from "../db";
import { sql, eq, gte, count } from "drizzle-orm";
import { articles, categories, users, newsletterSubscribers, workflowBatches, customDomains } from "../../drizzle/schema";

export async function getOverviewStats() {
  const db = await getDb();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [
    totalPublications,
    activeUsers,
    articlesThisMonth,
    totalArticles,
    workflowRunsThisMonth,
    subscriberCount,
    categoryCount,
    articlesPerDay,
    statusBreakdown,
    topCategories,
  ] = await Promise.all([
    // Total publications (custom_domains)
    db.select({ count: count() }).from(customDomains).then(r => r[0]?.count ?? 0),

    // Active users
    db.select({ count: count() }).from(users).then(r => r[0]?.count ?? 0),

    // Articles this month
    db.select({ count: count() }).from(articles)
      .where(gte(articles.publishedAt, startOfMonth))
      .then(r => r[0]?.count ?? 0),

    // Total articles (all time)
    db.select({ count: count() }).from(articles).then(r => r[0]?.count ?? 0),

    // Workflow runs this month
    db.select({ count: count() }).from(workflowBatches)
      .where(gte(workflowBatches.createdAt, startOfMonth))
      .then(r => r[0]?.count ?? 0),

    // Newsletter subscribers
    db.select({ count: count() }).from(newsletterSubscribers).then(r => r[0]?.count ?? 0),

    // Categories
    db.select({ count: count() }).from(categories).then(r => r[0]?.count ?? 0),

    // Articles per day (last 30 days)
    db.select({
      date: sql<string>`DATE(${articles.publishedAt})`.as("date"),
      count: count(),
    })
      .from(articles)
      .where(gte(articles.publishedAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${articles.publishedAt})`)
      .orderBy(sql`DATE(${articles.publishedAt})`)
      .then(rows => {
        // Fill in missing days with 0
        const map = new Map(rows.map(r => [r.date, r.count]));
        const result: { date: string; count: number }[] = [];
        for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10);
          result.push({ date: key, count: map.get(key) ?? 0 });
        }
        return result;
      }),

    // Status breakdown
    db.select({
      status: articles.status,
      count: count(),
    })
      .from(articles)
      .groupBy(articles.status),

    // Top 5 categories by article count
    db.select({
      name: categories.name,
      count: count(),
    })
      .from(articles)
      .innerJoin(categories, eq(articles.categoryId, categories.id))
      .groupBy(categories.name)
      .orderBy(sql`count(*) DESC`)
      .limit(5),
  ]);

  return {
    kpis: {
      totalPublications,
      activeUsers,
      articlesThisMonth,
      totalArticles,
      workflowRunsThisMonth,
      subscriberCount,
      categoryCount,
      mrr: 0, // Stripe webhook will populate later
    },
    articlesPerDay,
    statusBreakdown: statusBreakdown.map(s => ({
      status: s.status,
      count: s.count,
    })),
    topCategories: topCategories.map((c, i) => ({
      name: c.name,
      value: c.count,
      rank: i + 1,
    })),
  };
}
