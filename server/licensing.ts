/**
 * Satire Engine Licensing System
 * 
 * Manages license keys, validation, and version tracking for white-label deployments.
 */

import crypto from "crypto";

export interface License {
  key: string;
  clientName: string;
  email: string;
  domain: string;
  issuedAt: Date;
  expiresAt?: Date;
  tier: "starter" | "professional" | "enterprise";
  features: {
    maxArticlesPerMonth: number;
    multiUser: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
  };
}

export interface LicenseValidationResult {
  valid: boolean;
  license?: License;
  error?: string;
}

// Secret key for license signing (in production, use environment variable)
const LICENSE_SECRET = process.env.SATIRE_ENGINE_LICENSE_SECRET || "satire-engine-v1-secret-key";

/**
 * Generate a license key for a client
 */
export function generateLicenseKey(
  clientName: string,
  email: string,
  domain: string,
  tier: License["tier"] = "professional",
  validityMonths?: number
): License {
  const issuedAt = new Date();
  const expiresAt = validityMonths
    ? new Date(issuedAt.getTime() + validityMonths * 30 * 24 * 60 * 60 * 1000)
    : undefined;

  // Generate unique license key
  const payload = {
    client: clientName,
    email,
    domain,
    tier,
    issued: issuedAt.toISOString(),
    expires: expiresAt?.toISOString(),
  };

  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(payloadStr)
    .digest("hex")
    .substring(0, 16);

  const keyData = Buffer.from(payloadStr).toString("base64");
  const licenseKey = `HAMBRY-${tier.toUpperCase().substring(0, 3)}-${signature}-${keyData}`;

  const features = getTierFeatures(tier);

  return {
    key: licenseKey,
    clientName,
    email,
    domain,
    issuedAt,
    expiresAt,
    tier,
    features,
  };
}

/**
 * Validate a license key
 */
export function validateLicenseKey(licenseKey: string): LicenseValidationResult {
  try {
    // Parse license key format: HAMBRY-{TIER}-{SIGNATURE}-{PAYLOAD}
    const parts = licenseKey.split("-");
    if (parts.length < 4 || parts[0] !== "HAMBRY") {
      return { valid: false, error: "Invalid license key format" };
    }

    const [, tierPrefix, signature, ...payloadParts] = parts;
    const payloadBase64 = payloadParts.join("-");

    // Decode payload
    const payloadStr = Buffer.from(payloadBase64, "base64").toString("utf-8");
    const payload = JSON.parse(payloadStr);

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", LICENSE_SECRET)
      .update(payloadStr)
      .digest("hex")
      .substring(0, 16);

    if (signature !== expectedSignature) {
      return { valid: false, error: "Invalid license signature" };
    }

    // Check expiration
    if (payload.expires) {
      const expiresAt = new Date(payload.expires);
      if (expiresAt < new Date()) {
        return { valid: false, error: "License has expired" };
      }
    }

    // Reconstruct license object
    const license: License = {
      key: licenseKey,
      clientName: payload.client,
      email: payload.email,
      domain: payload.domain,
      issuedAt: new Date(payload.issued),
      expiresAt: payload.expires ? new Date(payload.expires) : undefined,
      tier: payload.tier,
      features: getTierFeatures(payload.tier),
    };

    return { valid: true, license };
  } catch (error) {
    return { valid: false, error: "Failed to parse license key" };
  }
}

/**
 * Get features for a license tier
 */
function getTierFeatures(tier: License["tier"]): License["features"] {
  const tiers = {
    starter: {
      maxArticlesPerMonth: 100,
      multiUser: false,
      customBranding: true,
      prioritySupport: false,
      apiAccess: false,
    },
    professional: {
      maxArticlesPerMonth: 500,
      multiUser: true,
      customBranding: true,
      prioritySupport: true,
      apiAccess: true,
    },
    enterprise: {
      maxArticlesPerMonth: -1, // Unlimited
      multiUser: true,
      customBranding: true,
      prioritySupport: true,
      apiAccess: true,
    },
  };

  return tiers[tier];
}

/**
 * Check if a license allows a specific feature
 */
export function hasFeature(license: License, feature: keyof License["features"]): boolean {
  return license.features[feature] === true || license.features[feature] === -1;
}

/**
 * Get license info for display
 */
export function getLicenseInfo(license: License): string {
  const lines = [
    `License Tier: ${license.tier.toUpperCase()}`,
    `Client: ${license.clientName}`,
    `Domain: ${license.domain}`,
    `Issued: ${license.issuedAt.toLocaleDateString()}`,
  ];

  if (license.expiresAt) {
    const daysRemaining = Math.floor(
      (license.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    lines.push(`Expires: ${license.expiresAt.toLocaleDateString()} (${daysRemaining} days remaining)`);
  } else {
    lines.push("Expires: Never (Lifetime License)");
  }

  lines.push("\nFeatures:");
  if (license.features.maxArticlesPerMonth === -1) {
    lines.push("  • Unlimited articles per month");
  } else {
    lines.push(`  • ${license.features.maxArticlesPerMonth} articles per month`);
  }
  if (license.features.multiUser) lines.push("  • Multi-user support");
  if (license.features.customBranding) lines.push("  • Custom branding");
  if (license.features.prioritySupport) lines.push("  • Priority support");
  if (license.features.apiAccess) lines.push("  • API access");

  return lines.join("\n");
}

// Example usage and testing
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🔑 Satire Engine License Generator\n");

  // Generate a sample license
  const license = generateLicenseKey(
    "TechSatire Inc",
    "admin@techsatire.com",
    "techsatire.com",
    "professional",
    12 // 12 months validity
  );

  console.log("Generated License:");
  console.log(getLicenseInfo(license));
  console.log("\nLicense Key:");
  console.log(license.key);

  // Validate the license
  console.log("\n\nValidating License...");
  const validation = validateLicenseKey(license.key);
  if (validation.valid && validation.license) {
    console.log("✅ License is valid!");
    console.log(getLicenseInfo(validation.license));
  } else {
    console.log(`❌ License validation failed: ${validation.error}`);
  }

  // Test invalid license
  console.log("\n\nTesting Invalid License...");
  const invalidValidation = validateLicenseKey("HAMBRY-PRO-invalid-key");
  console.log(`Result: ${invalidValidation.valid ? "Valid" : "Invalid"}`);
  if (!invalidValidation.valid) {
    console.log(`Error: ${invalidValidation.error}`);
  }
}
