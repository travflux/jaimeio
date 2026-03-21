import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function dropTables() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }
  try {
    await db.execute(sql`DROP TABLE IF EXISTS client_deployments`);
    console.log("✓ Dropped client_deployments");
    await db.execute(sql`DROP TABLE IF EXISTS licenses`);
    console.log("✓ Dropped licenses");
    console.log("\nTables dropped successfully. Run 'pnpm db:push' to recreate them.");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}

dropTables();
