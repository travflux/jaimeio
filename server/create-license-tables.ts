import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function createTables() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }
  
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS licenses (
        id int AUTO_INCREMENT NOT NULL,
        licenseKey varchar(500) NOT NULL,
        clientName varchar(200) NOT NULL,
        email varchar(320) NOT NULL,
        domain varchar(255) NOT NULL,
        tier enum('starter','professional','enterprise') NOT NULL,
        status enum('active','expired','suspended','cancelled') NOT NULL DEFAULT 'active',
        issuedAt timestamp NOT NULL DEFAULT (now()),
        expiresAt timestamp,
        lastValidated timestamp,
        notes text,
        createdAt timestamp NOT NULL DEFAULT (now()),
        updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT licenses_id PRIMARY KEY(id),
        CONSTRAINT licenses_licenseKey_unique UNIQUE(licenseKey)
      )
    `);
    console.log("✓ Created licenses table");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_deployments (
        id int AUTO_INCREMENT NOT NULL,
        licenseId int NOT NULL,
        engineVersion varchar(20) NOT NULL,
        deploymentUrl varchar(500),
        status enum('active','inactive','maintenance') NOT NULL DEFAULT 'active',
        lastCheckIn timestamp,
        articlesGenerated int NOT NULL DEFAULT 0,
        lastArticleDate timestamp,
        deployedAt timestamp NOT NULL DEFAULT (now()),
        updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT client_deployments_id PRIMARY KEY(id)
      )
    `);
    console.log("✓ Created client_deployments table");
    
    console.log("\nTables created successfully!");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}

createTables();
