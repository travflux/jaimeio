import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import crypto from "crypto";

export function registerOAuthRoutes(app: Express) {
  // JWT-based admin login replaces Manus OAuth
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Constant-time comparison to prevent timing attacks
    // timingSafeEqual requires same-length buffers, so check length first
    const emailBuf = Buffer.from(email.toLowerCase());
    const adminEmailBuf = Buffer.from((ENV.adminEmail || "").toLowerCase());
    const emailMatch =
      ENV.adminEmail &&
      emailBuf.length === adminEmailBuf.length &&
      crypto.timingSafeEqual(emailBuf, adminEmailBuf);

    const passBuf = Buffer.from(password);
    const adminPassBuf = Buffer.from(ENV.adminPassword || "");
    const passwordMatch =
      ENV.adminPassword &&
      passBuf.length === adminPassBuf.length &&
      crypto.timingSafeEqual(passBuf, adminPassBuf);

    if (!emailMatch || !passwordMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    try {
      const openId = ENV.ownerOpenId || "admin";
      const name = email.split("@")[0];

      // Upsert admin user
      await db.upsertUser({
        openId,
        name,
        email,
        role: "admin",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({ success: true, user: { name, email, role: "admin" } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Keep the old callback route as a no-op redirect
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/admin/login");
  });
}
