// Block 4: Seed test data for multi-tenant system
// Run inside Docker container: node /app/block4-seed.mjs
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

console.log("Seeding Block 4 test data...\n");

// ─── License 1: Wilder Blueprint (Enterprise) ──────────────────────────────
const [existing1] = await conn.execute("SELECT id FROM licenses WHERE subdomain = 'wilder'");
let wilderId;
if (existing1.length > 0) {
  wilderId = existing1[0].id;
  console.log(`License 'wilder' already exists (id=${wilderId}), skipping...`);
} else {
  const [r] = await conn.execute(
    `INSERT INTO licenses (licenseKey, clientName, email, domain, subdomain, tier, maxUsers, features, status, primaryColor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "JIO-WILD-ER01-ENTP-RISE",
      "Wilder Blueprint",
      "admin@wilderblueprint.com",
      "wilderblueprint.com",
      "wilder",
      "enterprise",
      50,
      JSON.stringify({ analytics: true, api: true, whiteLabel: true, customDomain: true, prioritySupport: true }),
      "active",
      "#0f2d5e",
    ]
  );
  wilderId = r.insertId;
  console.log(`Created license: Wilder Blueprint (enterprise) id=${wilderId}`);
}

// ─── License 2: Niki James (Professional) ───────────────────────────────────
const [existing2] = await conn.execute("SELECT id FROM licenses WHERE subdomain = 'nikijames'");
let nikiId;
if (existing2.length > 0) {
  nikiId = existing2[0].id;
  console.log(`License 'nikijames' already exists (id=${nikiId}), skipping...`);
} else {
  const [r] = await conn.execute(
    `INSERT INTO licenses (licenseKey, clientName, email, domain, subdomain, tier, maxUsers, features, status, primaryColor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "JIO-NIKI-JAM3-PR0F-SNLL",
      "Niki James Media",
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
  nikiId = r.insertId;
  console.log(`Created license: Niki James Media (professional) id=${nikiId}`);
}

// ─── License 3: Demo Starter ────────────────────────────────────────────────
const [existing3] = await conn.execute("SELECT id FROM licenses WHERE subdomain = 'demo'");
let demoId;
if (existing3.length > 0) {
  demoId = existing3[0].id;
  console.log(`License 'demo' already exists (id=${demoId}), skipping...`);
} else {
  const [r] = await conn.execute(
    `INSERT INTO licenses (licenseKey, clientName, email, domain, subdomain, tier, maxUsers, features, status, primaryColor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "JIO-DEMO-STRT-FREE-TIER",
      "Demo Account",
      "demo@getjaime.io",
      "demo.getjaime.io",
      "demo",
      "starter",
      3,
      JSON.stringify({ analytics: false, api: false, whiteLabel: false, customDomain: false, prioritySupport: false }),
      "active",
      "#059669",
    ]
  );
  demoId = r.insertId;
  console.log(`Created license: Demo Account (starter) id=${demoId}`);
}

// ─── Users for Wilder Blueprint ─────────────────────────────────────────────
const wilderUsers = [
  { email: "jconway@janicco.com", name: "Jaime Conway", role: "owner", password: "Succe55@2026" },
  { email: "editor@wilderblueprint.com", name: "Sarah Editor", role: "editor", password: "Editor123!" },
  { email: "viewer@wilderblueprint.com", name: "Mike Viewer", role: "viewer", password: "Viewer123!" },
];

for (const u of wilderUsers) {
  const [exists] = await conn.execute(
    "SELECT id FROM license_users WHERE licenseId = ? AND email = ?",
    [wilderId, u.email]
  );
  if (exists.length > 0) {
    console.log(`  User ${u.email} already exists, skipping...`);
    continue;
  }
  const hash = await hashPassword(u.password);
  await conn.execute(
    "INSERT INTO license_users (licenseId, email, passwordHash, name, role, isActive) VALUES (?, ?, ?, ?, ?, TRUE)",
    [wilderId, u.email, hash, u.name, u.role]
  );
  console.log(`  Created user: ${u.name} (${u.role}) for Wilder Blueprint`);
}

// ─── Users for Niki James ───────────────────────────────────────────────────
const nikiUsers = [
  { email: "niki@nikijames.com", name: "Niki James", role: "owner", password: "NikiJames2026!" },
  { email: "assistant@nikijames.com", name: "Alex Assistant", role: "admin", password: "Assistant2026!" },
];

for (const u of nikiUsers) {
  const [exists] = await conn.execute(
    "SELECT id FROM license_users WHERE licenseId = ? AND email = ?",
    [nikiId, u.email]
  );
  if (exists.length > 0) {
    console.log(`  User ${u.email} already exists, skipping...`);
    continue;
  }
  const hash = await hashPassword(u.password);
  await conn.execute(
    "INSERT INTO license_users (licenseId, email, passwordHash, name, role, isActive) VALUES (?, ?, ?, ?, ?, TRUE)",
    [nikiId, u.email, hash, u.name, u.role]
  );
  console.log(`  Created user: ${u.name} (${u.role}) for Niki James`);
}

// ─── Users for Demo ─────────────────────────────────────────────────────────
const demoUsers = [
  { email: "demo@getjaime.io", name: "Demo User", role: "owner", password: "Demo2026!" },
];

for (const u of demoUsers) {
  const [exists] = await conn.execute(
    "SELECT id FROM license_users WHERE licenseId = ? AND email = ?",
    [demoId, u.email]
  );
  if (exists.length > 0) {
    console.log(`  User ${u.email} already exists, skipping...`);
    continue;
  }
  const hash = await hashPassword(u.password);
  await conn.execute(
    "INSERT INTO license_users (licenseId, email, passwordHash, name, role, isActive) VALUES (?, ?, ?, ?, ?, TRUE)",
    [demoId, u.email, hash, u.name, u.role]
  );
  console.log(`  Created user: ${u.name} (${u.role}) for Demo`);
}

await conn.end();
console.log("\nSeed complete!");
console.log("\nTest accounts:");
console.log("  Wilder Blueprint (enterprise): wilder.getjaime.io");
console.log("    - jconway@janicco.com / Succe55@2026 (owner)");
console.log("    - editor@wilderblueprint.com / Editor123! (editor)");
console.log("  Niki James Media (professional): nikijames.getjaime.io");
console.log("    - niki@nikijames.com / NikiJames2026! (owner)");
console.log("  Demo (starter): demo.getjaime.io");
console.log("    - demo@getjaime.io / Demo2026! (owner)");
