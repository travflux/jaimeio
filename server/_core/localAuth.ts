/**
 * Local Authentication Module
 * 
 * Replaces Manus OAuth with a simple username/password login
 * stored in environment variables. Used for Manus-hosted deployments
 * where the OAuth portal is not accessible.
 */

import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import * as db from "../db";

const LOCAL_ADMIN_USERNAME = process.env.LOCAL_ADMIN_USERNAME || "admin";
const LOCAL_ADMIN_PASSWORD_HASH = process.env.LOCAL_ADMIN_PASSWORD_HASH || "";
const LOCAL_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD || "";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "wilder-blueprint-secret-key-change-me";

function getSecretKey() {
  return new TextEncoder().encode(COOKIE_SECRET);
}

async function createLocalSessionToken(username: string): Promise<string> {
  return new SignJWT({
    openId: `local-admin-${username}`,
    appId: "wilder-blueprint-local",
    name: username,
    isLocalAdmin: true,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(getSecretKey());
}

export async function verifyLocalSession(
  cookieValue: string | undefined | null
): Promise<{ openId: string; name: string; isLocalAdmin: boolean } | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.isLocalAdmin) {
      return {
        openId: payload.openId as string,
        name: payload.name as string,
        isLocalAdmin: true,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function registerLocalAuthRoutes(app: Express) {
  // POST /api/auth/login — accepts { username, password }
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    if (username !== LOCAL_ADMIN_USERNAME) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    // Support both bcrypt hash (LOCAL_ADMIN_PASSWORD_HASH) and plain text (LOCAL_ADMIN_PASSWORD)
    if (!LOCAL_ADMIN_PASSWORD_HASH && !LOCAL_ADMIN_PASSWORD) {
      res.status(500).json({ error: "Admin password not configured. Set LOCAL_ADMIN_PASSWORD in environment." });
      return;
    }

    let valid = false;
    if (LOCAL_ADMIN_PASSWORD_HASH) {
      valid = await bcrypt.compare(password, LOCAL_ADMIN_PASSWORD_HASH);
    }
    // Fallback: plain text comparison (for environments where $ chars in hash get corrupted)
    if (!valid && LOCAL_ADMIN_PASSWORD) {
      valid = password === LOCAL_ADMIN_PASSWORD;
    }
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    // Ensure admin user exists in DB with admin role
    await db.upsertUser({
      openId: `local-admin-${username}`,
      name: username,
      email: null,
      loginMethod: "local",
      lastSignedIn: new Date(),
      role: "admin",
    });

    const token = await createLocalSessionToken(username);
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ success: true });
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });

  // GET /api/auth/me — returns current user info
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const cookies = req.headers.cookie ?? "";
    const cookieMap = Object.fromEntries(
      cookies.split(";").map(c => c.trim().split("=").map(decodeURIComponent))
    );
    const session = await verifyLocalSession(cookieMap[COOKIE_NAME]);
    if (!session) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const user = await db.getUserByOpenId(session.openId);
    res.json(user);
  });
}

/**
 * Hash a password for storage in .env
 * Run: node -e "require('bcryptjs').hash('yourpassword', 10).then(console.log)"
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
