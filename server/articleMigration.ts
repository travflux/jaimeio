/**
 * Article migration utilities
 * Bulk parse JSON article bodies and update database
 */

import * as db from './db';

export interface MigrationResult {
  totalArticles: number;
  jsonArticles: number;
  updatedCount: number;
  failedCount: number;
  details: Array<{
    id: number;
    headline: string;
    status: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Parse JSON body and extract content
 */
function parseJsonBody(body: string): string | null {
  const trimmed = body.trim();
  
  // Check if body is JSON
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null; // Not JSON
  }

  try {
    const parsed = JSON.parse(trimmed);
    
    // Check if it has a body field
    if (!parsed.body || typeof parsed.body !== 'string') {
      return null; // Not the expected JSON format
    }

    // Extract body field and convert escaped newlines to HTML paragraphs
    let extractedBody = parsed.body.replace(/\\n/g, '\n');
    const paragraphs = extractedBody.split('\n\n').filter((p: string) => p.trim());
    const htmlBody = paragraphs.map((p: string) => `<p>${p.trim()}</p>`).join('');

    return htmlBody;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return null;
  }
}

/**
 * Migrate all articles with JSON bodies
 * Returns detailed results of the migration
 */
export async function migrateJsonArticles(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalArticles: 0,
    jsonArticles: 0,
    updatedCount: 0,
    failedCount: 0,
    details: [],
  };

  // Fetch all articles (no status filter to get all)
  const { articles: allArticles } = await db.listArticles({ limit: 10000 });
  result.totalArticles = allArticles.length;

  for (const article of allArticles) {
    const parsedBody = parseJsonBody(article.body);

    if (parsedBody) {
      result.jsonArticles++;

      try {
        // Update the article with parsed body
        await db.updateArticle(article.id, { body: parsedBody });

        result.updatedCount++;
        result.details.push({
          id: article.id,
          headline: article.headline,
          status: article.status,
          success: true,
        });
      } catch (e) {
        result.failedCount++;
        result.details.push({
          id: article.id,
          headline: article.headline,
          status: article.status,
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }
  }

  return result;
}

/**
 * Preview articles that would be migrated (dry run)
 */
export async function previewMigration(): Promise<{
  totalArticles: number;
  articlesNeedingMigration: Array<{
    id: number;
    headline: string;
    status: string;
    bodyPreview: string;
  }>;
}> {
  const { articles: allArticles } = await db.listArticles({ limit: 10000 });
  const articlesNeedingMigration: Array<{
    id: number;
    headline: string;
    status: string;
    bodyPreview: string;
  }> = [];

  for (const article of allArticles) {
    const parsedBody = parseJsonBody(article.body);

    if (parsedBody) {
      articlesNeedingMigration.push({
        id: article.id,
        headline: article.headline,
        status: article.status,
        bodyPreview: article.body.substring(0, 200) + '...',
      });
    }
  }

  return {
    totalArticles: allArticles.length,
    articlesNeedingMigration,
  };
}
