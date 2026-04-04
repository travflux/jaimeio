import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../_core/env";

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * Hash a password using Node's built-in scrypt (no external deps needed).
 * Format: salt:hash (both hex-encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(hashHex, "hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return timingSafeEqual(storedKey, derivedKey);
}

export type LicenseTokenPayload = {
  userId: number;
  licenseId: number;
  email: string;
  role: string;
  type: "license_user";
};

const COOKIE_NAME = "jaimeio_tenant_session";
const TOKEN_EXPIRY = "30d";

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

/**
 * Create a JWT for a license user session.
 */
export async function createLicenseUserToken(payload: Omit<LicenseTokenPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "license_user" as const })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(getSecret());
}

/**
 * Verify and decode a license user JWT.
 */
export async function verifyLicenseUserToken(token: string): Promise<LicenseTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.type !== "license_user") return null;
    return payload as unknown as LicenseTokenPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME as TENANT_COOKIE_NAME };
