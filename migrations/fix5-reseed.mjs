// Fix 5: Clean re-seed with corrected test accounts
import mysql from "mysql2/promise";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("No DATABASE_URL"); process.exit(1); }

const url = new URL(DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 4000,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true },
});

console.log("Cleaning old seed data...\n");

// Delete old license_users and licenses from Block 4 seed
await conn.execute("DELETE FROM license_sessions");
await conn.execute("DELETE FROM license_users");
await conn.execute("DELETE FROM license_settings");
// Keep any pre-existing license (id=1) from before Block 4 but delete our seeded ones
await conn.execute("DELETE FROM licenses WHERE subdomain IS NOT NULL");
console.log("Old seed data cleaned.\n");

// ─── License 1: Wilder Blueprint (Enterprise) ──────────────────────────────
const [r1] = await conn.execute(
  `INSERT INTO licenses (licenseKey, clientName, email, domain, subdomain, tier, maxUsers, features, status, primaryColor)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    "JIO-WILD-ER01-ENTP-RISE",
    "Wilder Blueprint",
    "adam@wilderblueprint.com",
    "wilderblueprint.com",
    "wilderblueprint",
    "enterprise",
    50,
    JSON.stringify({ analytics: true, api: true, whiteLabel: true, customDomain: true, prioritySupport: true }),
    "active",
    "#0f2d5e",
  ]
);
const wilderId = r1.insertId;
console.log(`Created: Wilder Blueprint (enterprise) id=${wilderId}, subdomain=wilderblueprint`);

// ─── License 2: Niki James (Professional) ───────────────────────────────────
const [r2] = await conn.execute(
  `INSERT INTO licenses (licenseKey, clientName, email, domain, subdomain, tier, maxUsers, features, status, primaryColor)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    "JIO-NIKI-JAM3-PR0F-SNLL",
    "Niki James",
    "niki@nikijames.com",
    "nikijames.com",
    "nikijames",
    "professional",
    10,
    JSON.stringify({ analytics: true, api: true, whiteLabel: false, customDomain: true, prioritySupport: false }),
    "active",
    "#7c3aed",
  ]
);
const nikiId = r2.insertId;
console.log(`Created: Niki James (professional) id=${nikiId}, subdomain=nikijames`);

// ─── Users for Wilder Blueprint ─────────────────────────────────────────────
const wilderHash = await hashPassword("Wilder@2026!");
await conn.execute(
  "INSERT INTO license_users (licenseId, email, passwordHash, name, role, isActive) VALUES (?, ?, ?, ?, ?, TRUE)",
  [wilderId, "adam@wilderblueprint.com", wilderHash, "Adam Wilder", "editor"]
);
console.log("  Created user: Adam Wilder (adam@wilderblueprint.com) for Wilder Blueprint");

// ─── Users for Niki James ───────────────────────────────────────────────────
const nikiHash = await hashPassword("NikiJames2026!");
await conn.execute(
  "INSERT INTO license_users (licenseId, email, passwordHash, name, role, isActive) VALUES (?, ?, ?, ?, ?, TRUE)",
  [nikiId, "niki@nikijames.com", nikiHash, "Niki James", "editor"]
);
console.log("  Created user: Niki James (niki@nikijames.com) for Niki James");

await conn.end();

console.log("\n=== Seed Complete ===\n");
console.log("Super Admin:");
console.log("  URL: app.getjaime.io");
console.log("  Email: jconway@janicco.com (from ADMIN_EMAIL env)");
console.log("  -> Redirects to /admin/mission-control\n");
console.log("Wilder Blueprint (Enterprise):");
console.log("  URL: wilderblueprint.getjaime.io");
console.log("  Email: adam@wilderblueprint.com");
console.log("  Password: Wilder@2026!");
console.log("  -> Redirects to /dashboard\n");
console.log("Niki James (Professional):");
console.log("  URL: nikijames.getjaime.io");
console.log("  Email: niki@nikijames.com");
console.log("  Password: NikiJames2026!");
console.log("  -> Redirects to /dashboard");
