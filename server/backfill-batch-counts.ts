/**
 * Backfill Batch Counts Script
 * 
 * This script recalculates articlesApproved, articlesPublished, and articlesRejected
 * for all workflow batches based on the actual article statuses in the database.
 */

import * as db from "./db";
import { getDb } from "./db";
import { articles, workflowBatches } from "../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";

async function backfillBatchCounts() {
  console.log("Starting batch counts backfill...\n");
  
  const database = await getDb();
  if (!database) {
    console.error("Failed to connect to database");
    return;
  }

  // Get all batches
  const batches = await db.listWorkflowBatches(1000);
  console.log(`Found ${batches.length} batches to process\n`);

  for (const batch of batches) {
    console.log(`Processing batch ${batch.id} (${batch.batchDate})...`);
    
    // Get all articles for this batch
    const batchArticles = await database
      .select()
      .from(articles)
      .where(eq(articles.batchDate, batch.batchDate));

    // Count by status
    const statusCounts = {
      approved: batchArticles.filter(a => a.status === "approved").length,
      published: batchArticles.filter(a => a.status === "published").length,
      rejected: batchArticles.filter(a => a.status === "rejected").length,
      pending: batchArticles.filter(a => a.status === "pending").length,
      draft: batchArticles.filter(a => a.status === "draft").length,
    };

    console.log(`  Articles: ${batchArticles.length} total`);
    console.log(`  - Approved: ${statusCounts.approved}`);
    console.log(`  - Published: ${statusCounts.published}`);
    console.log(`  - Rejected: ${statusCounts.rejected}`);
    console.log(`  - Pending: ${statusCounts.pending}`);
    console.log(`  - Draft: ${statusCounts.draft}`);

    // Update batch with correct counts
    await db.updateWorkflowBatch(batch.id, {
      articlesGenerated: batchArticles.length,
      articlesApproved: statusCounts.approved,
      articlesPublished: statusCounts.published,
      articlesRejected: statusCounts.rejected,
    });

    console.log(`  ✓ Updated batch ${batch.id}\n`);
  }

  console.log("Backfill complete!");
}

// Run the script
backfillBatchCounts().catch(err => {
  console.error("Error during backfill:", err);
  process.exit(1);
});
