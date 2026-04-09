import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, uniqueIndex, index, decimal, json, float, bigint, datetime } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  keywords: text("keywords"),
  targetPercentage: int("target_percentage"),
  licenseId: int("license_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  headline: text("headline").notNull(),
  subheadline: varchar("subheadline", { length: 500 }),
  body: text("body").notNull(),
  slug: varchar("slug", { length: 600 }).notNull().unique(),
  status: mysqlEnum("status", ["draft", "pending", "approved", "published", "rejected"]).default("draft").notNull(),
  categoryId: int("categoryId"),
  licenseId: int("license_id"),
  featuredImage: text("featuredImage"),
  featuredEmbed: text("featuredEmbed"),  // oEmbed HTML for X/Instagram embeds
  imageAttribution: text("imageAttribution"),  // attribution text for sourced real images
  llmImagePrompt: text("llmImagePrompt"),
  videoUrl: text("videoUrl"),
  authorId: int("authorId"),
  batchDate: varchar("batchDate", { length: 10 }),
  sourceEvent: text("sourceEvent"),
  sourceUrl: text("sourceUrl"),
  sourceName: varchar("sourceName", { length: 255 }),
  feedSourceId: int("feedSourceId"), // FK to rssFeedWeights.id — tracks which feed produced this article
  views: int("views").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp("publishedAt"),
  // GEO (Generative Engine Optimization) fields
  geoSummary: text("geo_summary"),
  geoFaq: text("geo_faq"),                         // JSON array of {question, answer}
  geoSchema: text("geo_schema"),                    // JSON-LD string
  geoSpeakable: text("geo_speakable"),
  geoScore: int("geo_score"),                       // 0-100
  geoGeneratedAt: timestamp("geo_generated_at"),
  // Article tags for Discover sections
  isEditorsPick: boolean("is_editors_pick").default(false).notNull(),
  isTrending: boolean("is_trending").default(false).notNull(),
  seoDescription: varchar("seo_description", { length: 500 }),
  focusKeyword: varchar("focus_keyword", { length: 100 }),
  seoTitle: varchar("seo_title", { length: 255 }),
  altText: varchar("alt_text", { length: 255 }),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isSponsored: boolean("is_sponsored").default(false).notNull(),
  isBreaking: boolean("is_breaking").default(false).notNull(),
  // Sprint 4 additions
  wordCount: int("word_count"),
  readingTimeMinutes: int("reading_time_minutes"),
  generationModel: varchar("generation_model", { length: 100 }),
  generationStyle: varchar("generation_style", { length: 100 }),
  geoStatus: mysqlEnum("geo_status", ["pending", "generated", "failed"]).default("pending"),
  seoStatus: mysqlEnum("seo_status", ["pending", "generated", "failed"]).default("pending"),
  seoScore: int("seo_score"),
  imageStatus: mysqlEnum("image_status", ["pending", "generated", "failed", "skipped"]).default("pending"),
  qualityScore: int("quality_score"),
  amazonProducts: text("amazon_products"),
  amazonPlacement: mysqlEnum("amazon_placement", ["inline", "sidebar", "both", "none"]).default("none"),
  templateId: int("template_id"),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

export const newsletterSubscribers = mysqlTable("newsletter_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  status: mysqlEnum("status", ["active", "unsubscribed"]).default("active").notNull(),
  licenseId: int("license_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

export const newsletterSends = mysqlTable("newsletter_sends", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  previewText: varchar("preview_text", { length: 255 }),
  htmlContent: text("html_content"),
  articleIds: text("article_ids"), // JSON array of article IDs
  recipientCount: int("recipient_count").default(0),
  openCount: int("open_count").default(0),
  clickCount: int("click_count").default(0),
  resendBroadcastId: varchar("resend_broadcast_id", { length: 255 }),
  status: mysqlEnum("status", ["draft", "sending", "sent", "failed"]).default("draft"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type NewsletterSend = typeof newsletterSends.$inferSelect;

export const smsTemplates = mysqlTable("sms_templates", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  templateText: text("template_text").notNull(),
  templateType: mysqlEnum("template_type", ["newsletter_url", "breaking_news", "custom"]).default("custom"),
  isActive: boolean("is_active").default(true),
  sendDelayMinutes: int("send_delay_minutes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SmsTemplate = typeof smsTemplates.$inferSelect;

export const socialPosts = mysqlTable("social_posts", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  licenseId: int("license_id"),
  platform: mysqlEnum("platform", ["twitter", "facebook", "linkedin", "instagram", "threads"]).notNull(),
  content: text("content").notNull(),
  videoUrl: text("videoUrl"),
  status: mysqlEnum("status", ["draft", "scheduled", "posting", "posted", "failed", "cancelled"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  attemptedAt: timestamp("attemptedAt"),
  postedAt: timestamp("postedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  articlePlatformUnique: uniqueIndex("idx_article_platform").on(table.articleId, table.platform),
}));

export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = typeof socialPosts.$inferInsert;

export const workflowBatches = mysqlTable("workflow_batches", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id"),
  batchDate: varchar("batchDate", { length: 10 }).notNull(),
  status: mysqlEnum("status", ["gathering", "generating", "pending_approval", "approved", "publishing", "completed", "failed"]).default("gathering").notNull(),
  totalEvents: int("totalEvents").default(0).notNull(),
  articlesGenerated: int("articlesGenerated").default(0).notNull(),
  articlesApproved: int("articlesApproved").default(0).notNull(),
  articlesPublished: int("articlesPublished").default(0).notNull(),
  articlesRejected: int("articlesRejected").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowBatch = typeof workflowBatches.$inferSelect;
export type InsertWorkflowBatch = typeof workflowBatches.$inferInsert;

export const workflowSettings = mysqlTable("workflow_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  label: varchar("label", { length: 200 }),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"),
  type: mysqlEnum("type", ["number", "string", "boolean", "json", "text"]).default("string").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowSetting = typeof workflowSettings.$inferSelect;
export type InsertWorkflowSetting = typeof workflowSettings.$inferInsert;

export const licenses = mysqlTable("licenses", {
  id: int("id").autoincrement().primaryKey(),
  licenseKey: varchar("licenseKey", { length: 500 }).notNull().unique(),
  clientName: varchar("clientName", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }),
  tier: mysqlEnum("tier", ["starter", "professional", "enterprise"]).notNull(),
  maxUsers: int("maxUsers").default(5).notNull(),
  features: json("features"), // JSON: { analytics: true, api: false, whiteLabel: true, ... }
  logoUrl: text("logoUrl"),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#0f2d5e"),
  status: mysqlEnum("status", ["active", "expired", "suspended", "cancelled"]).default("active").notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  lastValidated: timestamp("lastValidated"),
  notes: text("notes"),
  // Sprint 4 additions
  isTest: boolean("is_test").default(false),
  parentLicenseId: int("parent_license_id"),
  baseArticleCommitment: int("base_article_commitment"),
  perArticleRate: decimal("per_article_rate", { precision: 10, scale: 4 }),
  monthlyPageLimit: int("monthly_page_limit"),
  billingCycleStartDay: int("billing_cycle_start_day").default(1),
  whiteLabelConfig: json("white_label_config"),
  resellerPlanConfig: json("reseller_plan_config"),
  resellerDefaults: json("reseller_defaults"),
  customDomain: varchar("custom_domain", { length: 255 }),
  customDomainVerified: boolean("custom_domain_verified").default(false),
  customDomainVerifiedAt: timestamp("custom_domain_verified_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

export const clientDeployments = mysqlTable("client_deployments", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull(),
  engineVersion: varchar("engineVersion", { length: 20 }).notNull(),
  deploymentUrl: varchar("deploymentUrl", { length: 500 }),
  status: mysqlEnum("status", ["active", "inactive", "maintenance"]).default("active").notNull(),
  lastCheckIn: timestamp("lastCheckIn"),
  articlesGenerated: int("articlesGenerated").default(0).notNull(),
  lastArticleDate: timestamp("lastArticleDate"),
  deployedAt: timestamp("deployedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientDeployment = typeof clientDeployments.$inferSelect;
export type InsertClientDeployment = typeof clientDeployments.$inferInsert;

export const searchAnalytics = mysqlTable("search_analytics", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id"),
  query: varchar("query", { length: 500 }).notNull(),
  resultsCount: int("resultsCount").default(0).notNull(),
  categoryFilter: int("categoryFilter"),
  dateRangeFilter: varchar("dateRangeFilter", { length: 50 }),
  userId: int("userId"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  searchedAt: timestamp("searchedAt").defaultNow().notNull(),
});

export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytics = typeof searchAnalytics.$inferInsert;

export const horoscopes = mysqlTable("horoscopes", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  sign: mysqlEnum("sign", [
    "aries", "taurus", "gemini", "cancer", 
    "leo", "virgo", "libra", "scorpio", 
    "sagittarius", "capricorn", "aquarius", "pisces"
  ]).notNull(),
  content: text("content").notNull(),
  styleId: varchar("styleId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Horoscope = typeof horoscopes.$inferSelect;
export type InsertHoroscope = typeof horoscopes.$inferInsert;

export const crosswords = mysqlTable("crosswords", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD format
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  grid: text("grid").notNull(), // JSON: 2D array of cells
  clues: text("clues").notNull(), // JSON: { across: [...], down: [...] }
  solution: text("solution").notNull(), // JSON: 2D array of answers
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  styleId: varchar("styleId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Crossword = typeof crosswords.$inferSelect;
export type InsertCrossword = typeof crosswords.$inferInsert;

export const crosswordSolves = mysqlTable("crossword_solves", {
  id: int("id").autoincrement().primaryKey(),
  crosswordId: int("crosswordId").notNull(),
  userId: int("userId"),
  userAnswers: text("userAnswers").notNull(), // JSON: 2D array of user's answers
  isComplete: boolean("isComplete").default(false).notNull(),
  timeSpent: int("timeSpent"), // seconds
  solvedAt: timestamp("solvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrosswordSolve = typeof crosswordSolves.$inferSelect;
export type InsertCrosswordSolve = typeof crosswordSolves.$inferInsert;

export const contentCalendar = mysqlTable("content_calendar", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(),
  notes: text("notes"),
  licenseId: int("license_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentCalendar = typeof contentCalendar.$inferSelect;
export type InsertContentCalendar = typeof contentCalendar.$inferInsert;

// Word Scramble game
export const wordScrambles = mysqlTable("word_scrambles", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD format
  title: varchar("title", { length: 200 }).notNull(),
  words: text("words").notNull(), // JSON: array of { word, scrambled, hint, category }
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WordScramble = typeof wordScrambles.$inferSelect;
export type InsertWordScramble = typeof wordScrambles.$inferInsert;

export const wordScrambleSolves = mysqlTable("word_scramble_solves", {
  id: int("id").autoincrement().primaryKey(),
  wordScrambleId: int("wordScrambleId").notNull(),
  userId: int("userId"),
  userAnswers: text("userAnswers").notNull(), // JSON: array of user's answers
  correctCount: int("correctCount").default(0).notNull(),
  totalWords: int("totalWords").notNull(),
  timeSpent: int("timeSpent"), // seconds
  solvedAt: timestamp("solvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WordScrambleSolve = typeof wordScrambleSolves.$inferSelect;
export type InsertWordScrambleSolve = typeof wordScrambleSolves.$inferInsert;

// Trivia Quiz game
export const triviaQuizzes = mysqlTable("trivia_quizzes", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD format
  title: varchar("title", { length: 200 }).notNull(),
  questions: text("questions").notNull(), // JSON: array of { question, options: [], correctAnswer, explanation }
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TriviaQuiz = typeof triviaQuizzes.$inferSelect;
export type InsertTriviaQuiz = typeof triviaQuizzes.$inferInsert;

export const triviaQuizSolves = mysqlTable("trivia_quiz_solves", {
  id: int("id").autoincrement().primaryKey(),
  triviaQuizId: int("triviaQuizId").notNull(),
  userId: int("userId"),
  userAnswers: text("userAnswers").notNull(), // JSON: array of selected answer indices
  correctCount: int("correctCount").default(0).notNull(),
  totalQuestions: int("totalQuestions").notNull(),
  timeSpent: int("timeSpent"), // seconds
  solvedAt: timestamp("solvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TriviaQuizSolve = typeof triviaQuizSolves.$inferSelect;
export type InsertTriviaQuizSolve = typeof triviaQuizSolves.$inferInsert;

// Mad Libs game
export const madLibs = mysqlTable("mad_libs", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD format
  title: varchar("title", { length: 200 }).notNull(),
  story: text("story").notNull(), // Story template with placeholders
  blanks: text("blanks").notNull(), // JSON: array of { type: "noun"|"verb"|"adjective"|"adverb"|"name", label }
  category: varchar("category", { length: 100 }), // e.g., "Political Satire", "Celebrity News"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MadLib = typeof madLibs.$inferSelect;
export type InsertMadLib = typeof madLibs.$inferInsert;

export const madLibCompletions = mysqlTable("mad_lib_completions", {
  id: int("id").autoincrement().primaryKey(),
  madLibId: int("madLibId").notNull(),
  userId: int("userId"),
  userInputs: text("userInputs").notNull(), // JSON: array of user's word choices
  completedStory: text("completedStory").notNull(), // Final story with user's words filled in
  imageUrl: text("imageUrl"), // AI-generated image based on the completed story
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MadLibCompletion = typeof madLibCompletions.$inferSelect;
export type InsertMadLibCompletion = typeof madLibCompletions.$inferInsert;

export const blockedSources = mysqlTable("blocked_sources", {
  id: int("id").autoincrement().primaryKey(),
  sourceName: varchar("sourceName", { length: 255 }).notNull().unique(),
  sourceUrl: text("sourceUrl"),
  reason: text("reason"),
  licenseId: int("license_id"),
  blockedAt: timestamp("blockedAt").defaultNow().notNull(),
});

export type BlockedSource = typeof blockedSources.$inferSelect;
export type InsertBlockedSource = typeof blockedSources.$inferInsert;

export const rssFeedWeights = mysqlTable("rss_feed_weights", {
  id: int("id").autoincrement().primaryKey(),
  feedUrl: varchar("feedUrl", { length: 500 }).notNull().unique(),
  weight: int("weight").default(50).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastFetchTime: timestamp("lastFetchTime"),
  errorCount: int("errorCount").default(0).notNull(),
  lastError: text("lastError"),
  licenseId: int("license_id"),
  totalFetches: int("total_fetches").default(0),
  successfulFetches: int("successful_fetches").default(0),
  candidatesGenerated: int("candidates_generated").default(0),
  autoDisabled: boolean("auto_disabled").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RssFeedWeight = typeof rssFeedWeights.$inferSelect;
export type InsertRssFeedWeight = typeof rssFeedWeights.$inferInsert;

// ─── Rebalance Log ──────────────────────────────────────────
export const rebalanceLogs = mysqlTable("rebalance_logs", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id"),
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  triggerType: mysqlEnum("triggerType", ["manual", "auto", "initial"]).default("manual").notNull(),
  articleCountSinceLastRebalance: int("articleCountSinceLastRebalance").default(0).notNull(),
  previousWeights: text("previousWeights"), // JSON: { feedUrl: weight }
  newWeights: text("newWeights"), // JSON: { feedUrl: weight }
  projectedDistribution: text("projectedDistribution"), // JSON: { categorySlug: percentage }
  actualDistribution: text("actualDistribution"), // JSON: { categorySlug: percentage }
  confidence: int("confidence").default(0), // 0-100 confidence score
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RebalanceLog = typeof rebalanceLogs.$inferSelect;
export type InsertRebalanceLog = typeof rebalanceLogs.$inferInsert;

// ─── X Auto-Replies ──────────────────────────────────────────
export const xReplies = mysqlTable("x_replies", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id"),
  // The tweet we're replying to
  tweetId: varchar("tweetId", { length: 64 }).notNull(),
  tweetText: text("tweetText").notNull(),
  tweetAuthor: varchar("tweetAuthor", { length: 100 }).notNull(),
  tweetAuthorHandle: varchar("tweetAuthorHandle", { length: 100 }).notNull(),
  tweetLikes: int("tweetLikes").default(0),
  tweetRetweets: int("tweetRetweets").default(0),
  tweetFollowers: int("tweetFollowers").default(0),
  tweetVerifiedType: varchar("tweetVerifiedType", { length: 20 }).default("none"),
  // The keyword that matched this tweet
  keyword: varchar("keyword", { length: 200 }),
  // The article we're linking back to
  articleId: int("articleId"),
  articleSlug: varchar("articleSlug", { length: 600 }),
  articleHeadline: varchar("articleHeadline", { length: 500 }),
  // The generated reply
  replyContent: text("replyContent"),
  // Mode used when this reply was generated: reply or quote_tweet
  replyMode: varchar("replyMode", { length: 20 }).default("quote_tweet"),
  // Status: pending = generated, approved = ready to post, posted = done, failed = error, skipped = manually skipped
  status: mysqlEnum("status", ["pending", "approved", "posted", "failed", "skipped"]).default("pending").notNull(),
  postedTweetId: varchar("postedTweetId", { length: 64 }),
  errorMessage: text("errorMessage"),
  attemptedAt: timestamp("attemptedAt"),
  postedAt: timestamp("postedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type XReply = typeof xReplies.$inferSelect;
export type InsertXReply = typeof xReplies.$inferInsert;

// ─── X Standalone Tweets ──────────────────────────────────────────
// Standalone satirical jokes/observations posted to X without article links
export const xStandaloneTweets = mysqlTable("x_standalone_tweets", {
  id: int("id").autoincrement().primaryKey(),
  content: text("content").notNull(), // The tweet text (max 280 chars)
  inspiredByHeadlines: text("inspiredByHeadlines"), // JSON array of headline strings used as inspiration
  status: mysqlEnum("status", ["pending", "approved", "posting", "posted", "rejected", "failed"]).default("pending").notNull(),
  postedAt: timestamp("postedAt"),
  tweetId: varchar("tweetId", { length: 64 }),
  tweetUrl: varchar("tweetUrl", { length: 255 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type XStandaloneTweet = typeof xStandaloneTweets.$inferSelect;
export type InsertXStandaloneTweet = typeof xStandaloneTweets.$inferInsert;

// ─── CEO Directives ───────────────────────────────────────────────
// Command layer: directives from CEO to engineering team
export const ceoDirectives = mysqlTable("ceo_directives", {
  id: int("id").autoincrement().primaryKey(),
  directiveDate: varchar("directive_date", { length: 20 }).notNull(),
  fromName: varchar("from_name", { length: 100 }).notNull().default("Claude, CEO"),
  priority: mysqlEnum("priority", ["Critical", "High", "Medium", "Low"]).notNull().default("Medium"),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["Pending", "In Progress", "Complete", "Cancelled"]).notNull().default("Pending"),
  completedDate: varchar("completed_date", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CeoDirective = typeof ceoDirectives.$inferSelect;
export type InsertCeoDirective = typeof ceoDirectives.$inferInsert;
// ─── Covered Topics (cross-batch memory) ──────────────────────────────────────
// Tracks topics covered in recent batches to prevent repetition across runs
export const coveredTopics = mysqlTable("covered_topics", {
  id: int("id").autoincrement().primaryKey(),
  topic: varchar("topic", { length: 255 }).notNull(),
  batchDate: varchar("batch_date", { length: 20 }).notNull(),
  licenseId: int("license_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CoveredTopic = typeof coveredTopics.$inferSelect;
export type InsertCoveredTopic = typeof coveredTopics.$inferInsert;

// ─── Affiliate Click Tracking ──────────────────────────────────────────────────
// Logs every click on an Amazon affiliate link for funnel measurement
export const affiliateClicks = mysqlTable("affiliate_clicks", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId"),
  articleSlug: varchar("articleSlug", { length: 200 }),
  targetUrl: varchar("targetUrl", { length: 1000 }).notNull(),
  clickType: varchar("clickType", { length: 50 }).default("amazon").notNull(),
  referrer: varchar("referrer", { length: 500 }),
  userAgent: varchar("userAgent", { length: 500 }),
  licenseId: int("license_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type InsertAffiliateClick = typeof affiliateClicks.$inferInsert;

// ─── Page View Tracking ────────────────────────────────────────────────────────
// Logs article page views with traffic source classification and UTM support
export const pageViews = mysqlTable("page_views", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId"),
  articleSlug: varchar("articleSlug", { length: 200 }),
  source: varchar("source", { length: 50 }),
  medium: varchar("medium", { length: 50 }),
  referrer: varchar("referrer", { length: 500 }),
  path: varchar("path", { length: 500 }),
  licenseId: int("license_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;

// ─── Merch Store ───────────────────────────────────────────────────────────────
// Caches Printify products created per article+product_type combination
export const merchProducts = mysqlTable("merch_products", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  productType: mysqlEnum("productType", ["mug", "shirt", "poster", "case", "canvas", "tote", "hoodie", "mousepad", "candle", "cards", "digital"]).notNull(),
  status: mysqlEnum("status", ["pending", "ready", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  upscaledImageUrl: text("upscaledImageUrl"),
  printifyProductId: varchar("printifyProductId", { length: 255 }),
  printifyShopId: varchar("printifyShopId", { length: 255 }),
  blueprintId: int("blueprintId"),
  mockupUrls: json("mockupUrls"), // string[]
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }),
  sellPrice: decimal("sellPrice", { precision: 10, scale: 2 }).notNull(),
  variantData: json("variantData"), // { id, title, price }[]
  cachedAt: timestamp("cachedAt").defaultNow().notNull(),
}, (table) => ({
  articleProductUnique: uniqueIndex("idx_merch_article_product").on(table.articleId, table.productType),
}));

export type MerchProduct = typeof merchProducts.$inferSelect;
export type InsertMerchProduct = typeof merchProducts.$inferInsert;

// Captures email + newsletter opt-in before checkout
export const merchLeads = mysqlTable("merch_leads", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  articleId: int("articleId").notNull(),
  productType: varchar("productType", { length: 50 }).notNull(),
  newsletterOptIn: boolean("newsletterOptIn").default(true).notNull(),
  converted: boolean("converted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MerchLead = typeof merchLeads.$inferSelect;
export type InsertMerchLead = typeof merchLeads.$inferInsert;

// ─── Attribution & Revenue Pipeline ────────────────────────────────────────

export const adSpend = mysqlTable("ad_spend", {
  id: int("id").autoincrement().primaryKey(),
  channel: mysqlEnum("channel", ["google", "meta", "x", "bing", "reddit", "other"]).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  spendCents: int("spendCents").notNull().default(0),
  impressions: int("impressions").default(0),
  clicks: int("clicks").default(0),
  campaignName: varchar("campaignName", { length: 255 }),
  campaignId: varchar("campaignId", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdSpend = typeof adSpend.$inferSelect;
export type InsertAdSpend = typeof adSpend.$inferInsert;

export const visitorSessions = mysqlTable("visitor_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  visitorId: varchar("visitorId", { length: 64 }),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  utmTerm: varchar("utmTerm", { length: 255 }),
  utmContent: varchar("utmContent", { length: 255 }),
  channel: mysqlEnum("channel", [
    "google_paid", "google_organic", "meta_paid", "meta_organic",
    "x_paid", "x_organic", "bing_paid", "bing_organic",
    "reddit", "newsletter", "direct", "referral", "other",
  ]).notNull().default("direct"),
  landingPage: varchar("landingPage", { length: 500 }).notNull(),
  referrer: varchar("referrer", { length: 500 }),
  userAgent: text("userAgent"),
  ipHash: varchar("ipHash", { length: 64 }),
  pageViews: int("pageViews").default(1).notNull(),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  maxScrollDepth: int("maxScrollDepth").default(0).notNull(),
  newsletterSignup: boolean("newsletterSignup").default(false).notNull(),
  merchLead: boolean("merchLead").default(false).notNull(),
  affiliateClick: boolean("affiliateClick").default(false).notNull(),
  stripePurchase: boolean("stripePurchase").default(false).notNull(),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().onUpdateNow().notNull(),
});
export type VisitorSession = typeof visitorSessions.$inferSelect;
export type InsertVisitorSession = typeof visitorSessions.$inferInsert;

export const conversionEvents = mysqlTable("conversion_events", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  visitorId: varchar("visitorId", { length: 64 }),
  eventType: mysqlEnum("eventType", [
    "page_view",
    "newsletter_signup",
    "merch_lead",
    "affiliate_click",
    "sponsor_click",
    "stripe_checkout_start",
    "stripe_payment_complete",
    "ad_impression",
    "custom",
  ]).notNull(),
  articleId: int("articleId"),
  articleSlug: varchar("articleSlug", { length: 255 }),
  eventValueCents: int("eventValueCents").default(0),
  eventMetadata: json("eventMetadata"),
  channel: mysqlEnum("channel", [
    "google_paid", "google_organic", "meta_paid", "meta_organic",
    "x_paid", "x_organic", "bing_paid", "bing_organic",
    "reddit", "newsletter", "direct", "referral", "other",
  ]).notNull().default("direct"),
  utmSource: varchar("utmSource", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ConversionEvent = typeof conversionEvents.$inferSelect;
export type InsertConversionEvent = typeof conversionEvents.$inferInsert;

export const revenueEvents = mysqlTable("revenue_events", {
  id: int("id").autoincrement().primaryKey(),
  stripeEventId: varchar("stripeEventId", { length: 255 }).notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  revenueType: mysqlEnum("revenueType", [
    "subscription", "one_time", "merch", "sponsorship", "adsense", "other",
  ]).notNull(),
  description: varchar("description", { length: 500 }),
  sessionId: varchar("sessionId", { length: 64 }),
  visitorId: varchar("visitorId", { length: 64 }),
  channel: mysqlEnum("channel", [
    "google_paid", "google_organic", "meta_paid", "meta_organic",
    "x_paid", "x_organic", "bing_paid", "bing_organic",
    "reddit", "newsletter", "direct", "referral", "other",
  ]),
  utmSource: varchar("utmSource", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RevenueEvent = typeof revenueEvents.$inferSelect;
export type InsertRevenueEvent = typeof revenueEvents.$inferInsert;

// ─── Search Engine Performance ────────────────────────────────────────────────
export const searchEnginePerformance = mysqlTable("search_engine_performance", {
  id: int("id").autoincrement().primaryKey(),
  engine: mysqlEnum("engine", ["google", "bing"]).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  query: varchar("query", { length: 500 }),        // null = page-level row
  pageUrl: varchar("pageUrl", { length: 1000 }),   // null = query-level row
  clicks: int("clicks").default(0).notNull(),
  impressions: int("impressions").default(0).notNull(),
  ctr: float("ctr").default(0).notNull(),           // 0.0–1.0
  position: float("position").default(0).notNull(), // avg position
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SearchEnginePerformance = typeof searchEnginePerformance.$inferSelect;
export type InsertSearchEnginePerformance = typeof searchEnginePerformance.$inferInsert;

// ─── Platform Credentials ─────────────────────────────────────────────────────
// Stores API keys for external platforms (Resend, Twilio, etc.)
// White-label compatible: each deployment uses its own credentials stored here.
export const platformCredentials = mysqlTable("platform_credentials", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 64 }).notNull(), // e.g. "resend", "twilio"
  licenseId: int("license_id"),
  apiKey: text("apiKey"),           // primary credential (API key, token)
  apiSecret: text("apiSecret"),     // secondary credential (secret, SID)
  extra: text("extra"),             // JSON blob for additional fields (e.g. from_email, from_name)
  isActive: boolean("isActive").default(true).notNull(),
  // QA-C3: Test Connection status tracking
  isValid: boolean("is_valid"),                           // null = untested, true = valid, false = invalid
  lastTestedAt: timestamp("last_tested_at"),              // when last Test Connection was run
  lastError: text("last_error"),                          // last error message from Test Connection
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  platformLicenseUnique: uniqueIndex("idx_platform_license").on(table.platform, table.licenseId),
}));
export type PlatformCredential = typeof platformCredentials.$inferSelect;
export type InsertPlatformCredential = typeof platformCredentials.$inferInsert;

// ─── Newsletter Send History ──────────────────────────────────────────────────
// Tracks every digest send attempt for CEO dashboard and admin audit trail.
export const newsletterSendHistory = mysqlTable("newsletter_send_history", {
  id: int("id").autoincrement().primaryKey(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  recipientCount: int("recipientCount").default(0).notNull(),
  successCount: int("successCount").default(0).notNull(),
  failCount: int("failCount").default(0).notNull(),
  subject: varchar("subject", { length: 500 }),
  articleCount: int("articleCount").default(0).notNull(),
  isDryRun: boolean("isDryRun").default(false).notNull(),
  triggeredBy: mysqlEnum("triggeredBy", ["cron", "manual"]).default("manual").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NewsletterSendHistory = typeof newsletterSendHistory.$inferSelect;
export type InsertNewsletterSendHistory = typeof newsletterSendHistory.$inferInsert;

// ─── Unified Social Distribution Engine ──────────────────────────────────────

// distribution_queue: one row per article × platform × attempt
// Replaces the ad-hoc socialPosts table for new distribution engine.
// White-label compatible: platform list is data-driven, not hardcoded.
export const distributionQueue = mysqlTable("distribution_queue", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId"),  // nullable: standalone tweets/SMS blasts have no article
  platform: varchar("platform", { length: 32 }).notNull(), // "x", "reddit", "facebook", "instagram", "bluesky", "threads", "linkedin"
  subreddit: varchar("subreddit", { length: 128 }),        // only for reddit rows
  status: mysqlEnum("status", ["pending", "sending", "sent", "failed", "skipped"]).default("pending").notNull(),
  content: text("content"),                                // generated post copy
  postUrl: varchar("postUrl", { length: 1000 }),           // URL of the published post
  scheduledAt: timestamp("scheduledAt"),                   // when to send (null = send ASAP)
  attemptedAt: timestamp("attemptedAt"),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0).notNull(),
  maxAttempts: int("max_attempts").default(3).notNull(),   // QA-C6: max retry attempts
  priority: mysqlEnum("priority", ["high", "normal", "low"]).default("normal").notNull(), // QA-C6
  contentFormat: mysqlEnum("content_format", ["link", "text", "image", "carousel", "reply"]).default("link").notNull(), // QA-C6
  imageUrl: varchar("image_url", { length: 2000 }),       // QA-C6: image to attach to post
  triggeredBy: mysqlEnum("triggeredBy", ["auto", "manual"]).default("auto").notNull(),
  // Engagement metrics — populated by Feedback Collector cron every 6 hours
  platformPostId: varchar("platform_post_id", { length: 255 }),  // native post ID for fetching metrics
  engagementLikes: int("engagement_likes").default(0).notNull(),
  engagementComments: int("engagement_comments").default(0).notNull(),
  engagementShares: int("engagement_shares").default(0).notNull(),
  engagementClicks: int("engagement_clicks").default(0).notNull(),
  engagementCheckedAt: timestamp("engagement_checked_at"),
  removedAt: timestamp("removed_at"),  // set when Reddit detects removal
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DistributionQueueItem = typeof distributionQueue.$inferSelect;
export type InsertDistributionQueueItem = typeof distributionQueue.$inferInsert;

// reddit_subreddit_map: maps article categories → subreddits with weight/rules
export const redditSubredditMap = mysqlTable("reddit_subreddit_map", {
  id: int("id").autoincrement().primaryKey(),
  categorySlug: varchar("categorySlug", { length: 120 }),  // null = applies to all categories
  subreddit: varchar("subreddit", { length: 128 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  weight: int("weight").default(1).notNull(),              // higher = more likely to be chosen
  minKarma: int("minKarma").default(0).notNull(),          // min account karma required
  flairRequired: varchar("flairRequired", { length: 128 }), // required flair text (if any)
  notes: text("notes"),
  // QA-C5: per-subreddit rate limiting and ban detection
  lastPostAt: timestamp("last_post_at"),                  // when we last posted to this sub
  postsToday: int("posts_today").default(0).notNull(),    // posts sent today
  postsTodayDate: varchar("posts_today_date", { length: 10 }), // YYYY-MM-DD for daily reset
  dailyLimit: int("daily_limit").default(2).notNull(),    // max posts per day (default: 2/sub/day)
  totalPosts: int("total_posts").default(0).notNull(),    // lifetime post count
  totalRemovals: int("total_removals").default(0).notNull(), // lifetime removal count
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RedditSubredditMap = typeof redditSubredditMap.$inferSelect;
export type InsertRedditSubredditMap = typeof redditSubredditMap.$inferInsert;

// setup_checklist: version-aware onboarding checklist items
// Each item has a key, a human label, and a completion timestamp.
// White-label: each deployment gets its own checklist state.
export const setupChecklist = mysqlTable("setup_checklist", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(), // e.g. "brand_configured", "x_connected"
  label: varchar("label", { length: 300 }).notNull(),
  description: text("description"),
  section: varchar("section", { length: 64 }),             // e.g. "brand", "social", "seo"
  sortOrder: int("sortOrder").default(0).notNull(),
  isRequired: boolean("isRequired").default(true).notNull(),
  completedAt: timestamp("completedAt"),
  completedBy: varchar("completedBy", { length: 64 }),     // admin user name
  // QA-C4: automatic credential validation and version-aware updates
  checkType: mysqlEnum("check_type", ["manual", "credential", "api_test"]).default("manual").notNull(),
  checkConfig: text("check_config"),                      // JSON: { platform: "x" } for credential checks
  addedInVersion: varchar("added_in_version", { length: 20 }), // e.g. "1.5.0" for "NEW" badges
  setupUrl: varchar("setup_url", { length: 500 }),        // e.g. "/admin/settings/social" for "Set up now" link
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SetupChecklistItem = typeof setupChecklist.$inferSelect;
export type InsertSetupChecklistItem = typeof setupChecklist.$inferInsert;

// ─── SMS Subscribers ────────────────────────────────────────────────────────
// TCPA-compliant: opt_in_source, opt_in_ip, opt_in_at required for legal compliance.
export const smsSubscribers = mysqlTable("sms_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  status: mysqlEnum("status", ["active", "opted_out", "invalid", "blocked"]).default("active").notNull(),
  optInSource: varchar("opt_in_source", { length: 100 }), // "newsletter_form", "merch_checkout", "article_widget"
  optInIp: varchar("opt_in_ip", { length: 45 }),
  optInAt: timestamp("opt_in_at"),
  optOutAt: timestamp("opt_out_at"),
  lastSentAt: timestamp("last_sent_at"),
  weeklyCount: int("weekly_count").default(0),
  totalSent: int("total_sent").default(0),
  totalFailed: int("total_failed").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SmsSubscriber = typeof smsSubscribers.$inferSelect;
export type InsertSmsSubscriber = typeof smsSubscribers.$inferInsert;

// ─── v4.0 Multi-Source Selector Window ──────────────────────────────────────

export const selectorCandidates = mysqlTable("selector_candidates", {
  id: int("id").autoincrement().primaryKey(),
  // Source metadata
  sourceType: mysqlEnum("source_type", ["rss", "google_news", "manual", "x", "reddit", "scraper", "youtube", "event_calendar"]).notNull(),
  sourceName: varchar("source_name", { length: 255 }).notNull(),
  sourceUrl: text("source_url"),
  feedSourceId: int("feed_source_id"),       // FK to rss_feed_weights.id (nullable for non-RSS)
  // Content
  title: varchar("title", { length: 1000 }).notNull(),
  summary: text("summary"),
  publishedDate: varchar("published_date", { length: 50 }),
  // Selector pipeline state
  status: mysqlEnum("status", ["pending", "selected", "rejected", "expired"]).default("pending").notNull(),
  priority: int("priority").default(50).notNull(),   // 0-100; higher = preferred by selector
  batchDate: varchar("batch_date", { length: 10 }),  // YYYY-MM-DD of the batch that processed this
  articleId: int("article_id"),                       // FK to articles.id (set after article creation)
  // Scoring (v4.5.0)
  score: float("score"),                                                          // 0.0 - 1.0 composite quality score
  scoredAt: timestamp("scored_at"),                                               // when scoring ran
  scoreBreakdown: text("score_breakdown"),                                         // JSON breakdown for debugging
  articlePotential: varchar("article_potential", { length: 10 }),                  // "high" | "medium" | "low" | "dead"
  // Lifecycle
  licenseId: int("license_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SelectorCandidate = typeof selectorCandidates.$inferSelect;
export type InsertSelectorCandidate = typeof selectorCandidates.$inferInsert;

// ─── Tagging System ──────────────────────────────────────────────────────────
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  description: text("description"),
  articleCount: int("article_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

export const articleTags = mysqlTable("article_tags", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("article_id").notNull(),
  tagId: int("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  articleTagUnique: uniqueIndex("idx_article_tag").on(table.articleId, table.tagId),
  articleIdx: index("idx_article_tags_article").on(table.articleId),
  tagIdx: index("idx_article_tags_tag").on(table.tagId),
}));
export type ArticleTag = typeof articleTags.$inferSelect;
export type InsertArticleTag = typeof articleTags.$inferInsert;

// ─── Real Image Sourcing ─────────────────────────────────────────────────────
export const imageLicenses = mysqlTable("image_licenses", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("article_id").notNull(),
  source: varchar("source", { length: 50 }).notNull(),  // 'flickr', 'wikimedia', 'unsplash', 'pexels', 'pixabay', 'x_embed', 'instagram_embed'
  sourceUrl: varchar("source_url", { length: 2000 }).notNull(),
  sourceImageId: varchar("source_image_id", { length: 255 }),
  licenseType: varchar("license_type", { length: 100 }).notNull(),
  photographer: varchar("photographer", { length: 255 }),
  attributionText: varchar("attribution_text", { length: 500 }).notNull(),
  commercialUse: boolean("commercial_use").default(true),
  modificationOk: boolean("modification_ok").default(true),
  cdnUrl: varchar("cdn_url", { length: 2000 }),
  embedHtml: text("embed_html"),
  relevanceScore: float("relevance_score"),
  dateSourced: timestamp("date_sourced").defaultNow().notNull(),
  dateLastVerified: timestamp("date_last_verified"),
}, (table) => ({
  sourceIdx: index("idx_image_source").on(table.source),
  articleIdx: index("idx_image_article").on(table.articleId),
}));
export type ImageLicense = typeof imageLicenses.$inferSelect;
export type InsertImageLicense = typeof imageLicenses.$inferInsert;

export const knownAccountScores = mysqlTable("known_account_scores", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 20 }).notNull(),  // 'x', 'instagram'
  handle: varchar("handle", { length: 255 }).notNull(),
  tag: varchar("tag", { length: 255 }).notNull(),
  hitCount: int("hit_count").default(1).notNull(),
  avgRelevance: float("avg_relevance").default(0.5),
  lastHit: timestamp("last_hit"),
}, (table) => ({
  uniqueAccountTag: uniqueIndex("unique_account_tag").on(table.platform, table.handle, table.tag),
  tagLookupIdx: index("idx_tag_lookup").on(table.tag),
}));
export type KnownAccountScore = typeof knownAccountScores.$inferSelect;
export type InsertKnownAccountScore = typeof knownAccountScores.$inferInsert;

// ─── v4.9.0: JS-Tracked Analytics Tables ─────────────────────────────────────
// Client-side (JavaScript-only) page view tracking. Bots don't execute JS,
// so this table contains only real human browser visits.
export const jsPageViews = mysqlTable("js_page_views", {
  id: int("id").autoincrement().primaryKey(),
  path: varchar("path", { length: 2000 }).notNull(),
  referrer: varchar("referrer", { length: 2000 }),
  source: varchar("source", { length: 255 }),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  screenWidth: int("screen_width"),
  ip: varchar("ip", { length: 45 }),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
}, (table) => ({
  viewedAtIdx: index("idx_js_pv_viewed_at").on(table.viewedAt),
  sessionIdx: index("idx_js_pv_session").on(table.sessionId),
  sourceIdx: index("idx_js_pv_source").on(table.source),
  pathIdx: index("idx_js_pv_path").on(table.path),
}));
export type JsPageView = typeof jsPageViews.$inferSelect;
export type InsertJsPageView = typeof jsPageViews.$inferInsert;

// Daily rollup table for fast historical queries.
// Rolled up from js_page_views once per hour by a cron job.
// source='all' rows contain totals across all traffic sources.
export const dailyAnalytics = mysqlTable("daily_analytics", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  uniqueVisitors: int("unique_visitors").notNull().default(0),
  pageViews: int("page_views").notNull().default(0),
  source: varchar("source", { length: 255 }).notNull().default("all"),
}, (table) => ({
  uniqueDateSource: uniqueIndex("unique_date_source").on(table.date, table.source),
  dateIdx: index("idx_daily_analytics_date").on(table.date),
}));
export type DailyAnalytics = typeof dailyAnalytics.$inferSelect;
export type InsertDailyAnalytics = typeof dailyAnalytics.$inferInsert;

// ─── Real Image Sourcing v2: Image Library ────────────────────────────────────
// Stores every validated image downloaded by the Google CSE crawler.
// Used for tag-based reuse: before searching Google, check here first.
export const imageLibrary = mysqlTable("image_library", {
  id: int("id").autoincrement().primaryKey(),
  cdnUrl: varchar("cdn_url", { length: 2000 }).notNull(),
  cdnUrlSocial: varchar("cdn_url_social", { length: 2000 }),
  cdnUrlThumb: varchar("cdn_url_thumb", { length: 2000 }),
  phash: varchar("phash", { length: 64 }),
  sourceDomain: varchar("source_domain", { length: 255 }).notNull(),
  sourceUrl: varchar("source_url", { length: 2000 }).notNull(),
  sourcePageUrl: varchar("source_page_url", { length: 2000 }),
  photographer: varchar("photographer", { length: 255 }),
  tags: json("tags").$type<string[]>().notNull().default([]),
  entities: json("entities").$type<string[]>().notNull().default([]),
  aiDescription: text("ai_description"),
  relevanceScore: float("relevance_score"),
  validationResult: json("validation_result").$type<Record<string, unknown>>(),
  timesUsed: int("times_used").notNull().default(0),
  firstUsedArticleId: int("first_used_article_id"),
  lastUsedAt: datetime("last_used_at"),
  width: int("width"),
  height: int("height"),
  fileSize: int("file_size"),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  phashIdx: index("idx_il_phash").on(table.phash),
  domainIdx: index("idx_il_domain").on(table.sourceDomain),
  createdIdx: index("idx_il_created").on(table.createdAt),
}));
export type ImageLibraryRow = typeof imageLibrary.$inferSelect;
export type InsertImageLibrary = typeof imageLibrary.$inferInsert;

// ─── Real Image Sourcing v2: Domain Whitelist/Blacklist ───────────────────────
export const imageSourceDomains = mysqlTable("image_source_domains", {
  id: int("id").autoincrement().primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  status: mysqlEnum("status", ["whitelisted", "blacklisted", "unknown", "pending_review"]).notNull().default("unknown"),
  category: varchar("category", { length: 100 }),
  licenseType: varchar("license_type", { length: 100 }),
  notes: text("notes"),
  imagesSourced: int("images_sourced").notNull().default(0),
  imagesRejected: int("images_rejected").notNull().default(0),
  lastSourcedAt: datetime("last_sourced_at"),
  reviewedAt: datetime("reviewed_at"),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  statusIdx: index("idx_isd_status").on(table.status),
  domainIdx: index("idx_isd_domain").on(table.domain),
}));
export type ImageSourceDomain = typeof imageSourceDomains.$inferSelect;
export type InsertImageSourceDomain = typeof imageSourceDomains.$inferInsert;

// ─── Custom Domains (White Label Client Routing) ──────────────────────────────
export const customDomains = mysqlTable("custom_domains", {
  id: int("id").autoincrement().primaryKey(),
  clientId: varchar("client_id", { length: 100 }).notNull(),
  customDomain: varchar("custom_domain", { length: 255 }).notNull().unique(),
  publicationName: varchar("publication_name", { length: 255 }).notNull(),
  sslStatus: mysqlEnum("ssl_status", ["pending", "active", "failed"]).notNull().default("pending"),
  verifiedAt: datetime("verified_at"),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  clientIdx: index("idx_cd_client").on(table.clientId),
  domainIdx: index("idx_cd_domain").on(table.customDomain),
}));
export type CustomDomain = typeof customDomains.$inferSelect;
export type InsertCustomDomain = typeof customDomains.$inferInsert;

// ─── Multi-Tenant License System (Block 4) ──────────────────────────────────

// license_users: users that belong to a license (tenant)
export const licenseUsers = mysqlTable("license_users", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  role: mysqlEnum("role", ["owner", "admin", "editor", "viewer"]).default("viewer").notNull(),
  avatarUrl: text("avatarUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  resetTokenHash: varchar("reset_token_hash", { length: 255 }),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  emailLicenseUnique: uniqueIndex("idx_license_user_email").on(table.licenseId, table.email),
}));
export type LicenseUser = typeof licenseUsers.$inferSelect;
export type InsertLicenseUser = typeof licenseUsers.$inferInsert;

// license_settings: per-tenant key-value settings (mirrors workflow_settings but scoped)
export const licenseSettings = mysqlTable("license_settings", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  type: mysqlEnum("type", ["number", "string", "boolean", "json", "text"]).default("string").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  licenseKeyUnique: uniqueIndex("idx_license_setting_key").on(table.licenseId, table.key),
}));
export type LicenseSetting = typeof licenseSettings.$inferSelect;
export type InsertLicenseSetting = typeof licenseSettings.$inferInsert;

// license_sessions: JWT session tracking for license users
export const licenseSessions = mysqlTable("license_sessions", {
  id: int("id").autoincrement().primaryKey(),
  licenseUserId: int("licenseUserId").notNull(),
  licenseId: int("licenseId").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LicenseSession = typeof licenseSessions.$inferSelect;
export type InsertLicenseSession = typeof licenseSessions.$inferInsert;

// ─── Support Articles (Block 5) ─────────────────────────────────────────────
export const supportArticles = mysqlTable("support_articles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }).notNull().default("general"),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SupportArticle = typeof supportArticles.$inferSelect;
export type InsertSupportArticle = typeof supportArticles.$inferInsert;


// ─── Publication Pages (editable content for static pages) ──────────────────
export const publicationPages = mysqlTable("publication_pages", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  pageSlug: varchar("page_slug", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }),
  content: text("content"),
  status: mysqlEnum("status", ["draft", "published"]).default("published"),
  template: varchar("template", { length: 50 }).default("custom"),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: varchar("seo_description", { length: 500 }),
  isSystemPage: boolean("is_system_page").default(false),
  sortOrder: int("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  licensePageUnique: uniqueIndex("idx_license_page").on(table.licenseId, table.pageSlug),
}));
export type PublicationPage = typeof publicationPages.$inferSelect;
export type InsertPublicationPage = typeof publicationPages.$inferInsert;

// sponsor_schedules: day-by-day sponsor bar assignments
export const sponsorSchedules = mysqlTable("sponsor_schedules", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  dayOfWeek: int("day_of_week").notNull(),
  sponsorName: varchar("sponsor_name", { length: 255 }).notNull(),
  sponsorUrl: varchar("sponsor_url", { length: 500 }),
  sponsorTagline: text("sponsor_tagline"),
  logoUrl: varchar("logo_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Sprint 4: New Tables ──────────────────────────────────────────────────

export const generationLog = mysqlTable("generation_log", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("article_id"),
  licenseId: int("license_id"),
  step: mysqlEnum("step", ["image", "seo", "geo"]).notNull(),
  status: mysqlEnum("status", ["success", "failed", "skipped"]).notNull(),
  errorMessage: text("error_message"),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});
export type GenerationLog = typeof generationLog.$inferSelect;

export const networkLinks = mysqlTable("network_links", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type NetworkLink = typeof networkLinks.$inferSelect;

export const impersonationLog = mysqlTable("impersonation_log", {
  id: int("id").autoincrement().primaryKey(),
  impersonatorUserId: varchar("impersonator_user_id", { length: 255 }).notNull(),
  impersonatorEmail: varchar("impersonator_email", { length: 320 }).notNull(),
  targetLicenseId: int("target_license_id").notNull(),
  targetSubdomain: varchar("target_subdomain", { length: 100 }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});
export type ImpersonationLogEntry = typeof impersonationLog.$inferSelect;

export const staffAccounts = mysqlTable("staff_accounts", {
  id: int("id").autoincrement().primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  role: mysqlEnum("role", ["owner", "admin"]).default("admin").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});
export type StaffAccount = typeof staffAccounts.$inferSelect;

export const platformSettings = mysqlTable("platform_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PlatformSetting = typeof platformSettings.$inferSelect;

export const customDomainVerificationLog = mysqlTable("custom_domain_verification_log", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  customDomain: varchar("custom_domain", { length: 255 }).notNull(),
  verified: boolean("verified").notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
  errorMessage: text("error_message"),
});
export type CustomDomainVerificationLogEntry = typeof customDomainVerificationLog.$inferSelect;

export const resellerNetworkLinks = mysqlTable("reseller_network_links", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ResellerNetworkLink = typeof resellerNetworkLinks.$inferSelect;

// ─── Tables from Block 4 manual migrations (aligning schema.ts with live DB) ─

export const candidates = mysqlTable("candidates", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  title: varchar("title", { length: 1000 }),
  sourceUrl: varchar("source_url", { length: 2000 }),
  sourceName: varchar("source_name", { length: 255 }),
  summary: text("summary"),
  status: mysqlEnum("status", ["pending", "used", "ignored"]).default("pending"),
  sourceType: varchar("source_type", { length: 50 }).default("rss"),
  selectorCandidateId: int("selector_candidate_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  licenseStatusIdx: index("idx_license_status").on(table.licenseId, table.status),
}));
export type Candidate = typeof candidates.$inferSelect;

export const rssFeeds = mysqlTable("rss_feeds", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
  name: varchar("name", { length: 255 }),
  category: varchar("category", { length: 100 }),
  isActive: boolean("is_active").default(true),
  lastFetched: timestamp("last_fetched"),
  errorCount: int("error_count").default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type RssFeed = typeof rssFeeds.$inferSelect;

export const articleTemplates = mysqlTable("article_templates", {
  id: int("id").autoincrement().primaryKey(),
  licenseIdOld: int("licenseId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryIdOld: int("categoryId"),
  promptTemplate: text("promptTemplate"),
  headlineTemplate: varchar("headlineTemplate", { length: 500 }),
  writingStyle: text("writingStyle"),
  createdAt: timestamp("createdAt").defaultNow(),
  licenseId: int("license_id"),
  categoryId: int("category_id"),
  headlineFormat: varchar("headline_format", { length: 300 }),
  tone: varchar("tone", { length: 100 }).default("default"),
  targetWordCount: int("target_word_count").default(800),
  requiredElements: text("required_elements"),
  imageStylePrompt: text("image_style_prompt"),
  imageProvider: varchar("image_provider", { length: 50 }),
  imageAspectRatio: varchar("image_aspect_ratio", { length: 10 }).default("16:9"),
  seoTitleFormat: varchar("seo_title_format", { length: 300 }),
  seoKeywordThemes: text("seo_keyword_themes"),
  geoFaqTopics: text("geo_faq_topics"),
  geoKeyTakeawayCount: int("geo_key_takeaway_count").default(5),
  geoFaqCount: int("geo_faq_count").default(5),
  scheduleFrequency: varchar("schedule_frequency", { length: 20 }).default("manual"),
  scheduleDayOfWeek: int("schedule_day_of_week"),
  scheduleHour: int("schedule_hour").default(9),
  scheduleColor: varchar("schedule_color", { length: 7 }).default("#6366f1"),
  isActive: int("is_active").default(1),
  lastUsedAt: timestamp("last_used_at"),
  useCount: int("use_count").default(0),
  articleFormatType: varchar("article_format_type", { length: 50 }),
  sentenceRhythm: varchar("sentence_rhythm", { length: 50 }),
});
export type ArticleTemplate = typeof articleTemplates.$inferSelect;

export const templateScheduleSkips = mysqlTable("template_schedule_skips", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("template_id").notNull(),
  licenseId: int("license_id").notNull(),
  skipDate: varchar("skip_date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueSkip: uniqueIndex("unique_skip").on(table.templateId, table.licenseId, table.skipDate),
}));
export type TemplateScheduleSkip = typeof templateScheduleSkips.$inferSelect;

export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  userId: int("user_id"),
  subject: varchar("subject", { length: 500 }).notNull(),
  message: text("message").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal"),
  category: varchar("category", { length: 100 }).default("general"),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open"),
  referenceNumber: varchar("reference_number", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => ({
  licenseIdx: index("idx_license").on(table.licenseId),
}));
export type SupportTicket = typeof supportTickets.$inferSelect;
