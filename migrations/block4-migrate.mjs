// Block 4: Run migration inside Docker container (Node + mysql2)
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("No DATABASE_URL"); process.exit(1); }

// Parse connection from DATABASE_URL
const url = new URL(DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 4000,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true },
});

const statements = [
  "ALTER TABLE licenses ADD COLUMN subdomain VARCHAR(100) DEFAULT NULL",
  "ALTER TABLE licenses ADD COLUMN maxUsers INT DEFAULT 5 NOT NULL",
  "ALTER TABLE licenses ADD COLUMN features JSON DEFAULT NULL",
  "ALTER TABLE licenses ADD COLUMN logoUrl TEXT DEFAULT NULL",
  "ALTER TABLE licenses ADD COLUMN primaryColor VARCHAR(7) DEFAULT '#0f2d5e'",
  "CREATE UNIQUE INDEX idx_license_subdomain ON licenses (subdomain)",
  `CREATE TABLE IF NOT EXISTS license_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    licenseId INT NOT NULL,
    email VARCHAR(320) NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL,
    role ENUM('owner', 'admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
    avatarUrl TEXT,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    lastLoginAt TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_license_user_email (licenseId, email)
  )`,
  `CREATE TABLE IF NOT EXISTS license_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    licenseId INT NOT NULL,
    \`key\` VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    type ENUM('number', 'string', 'boolean', 'json', 'text') NOT NULL DEFAULT 'string',
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_license_setting_key (licenseId, \`key\`)
  )`,
  `CREATE TABLE IF NOT EXISTS license_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    licenseUserId INT NOT NULL,
    licenseId INT NOT NULL,
    tokenHash VARCHAR(64) NOT NULL,
    expiresAt TIMESTAMP NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

for (let i = 0; i < statements.length; i++) {
  try {
    await conn.execute(statements[i]);
    console.log(`[${i + 1}/${statements.length}] OK`);
  } catch (e) {
    if (e.message.includes("Duplicate column name") || e.message.includes("Duplicate key name") || e.message.includes("already exists")) {
      console.log(`[${i + 1}/${statements.length}] SKIP (already exists)`);
    } else {
      console.log(`[${i + 1}/${statements.length}] WARN: ${e.message}`);
    }
  }
}

await conn.end();
console.log("\nMigration complete!");
