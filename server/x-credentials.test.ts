import { describe, it, expect } from "vitest";

// These tests verify X/Twitter API credential availability.
// They are skipped when credentials are not configured (expected in dev/CI environments).
const hasXCredentials =
  !!process.env.X_API_KEY &&
  !!process.env.X_API_SECRET &&
  !!process.env.X_ACCESS_TOKEN &&
  !!process.env.X_ACCESS_TOKEN_SECRET;

describe("X/Twitter API Credentials", () => {
  it.skipIf(!hasXCredentials)("X_API_KEY environment variable is set", () => {
    const key = process.env.X_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(typeof key).toBe("string");
  });

  it.skipIf(!hasXCredentials)("X_API_SECRET environment variable is set", () => {
    const secret = process.env.X_API_SECRET;
    expect(secret).toBeDefined();
    expect(secret).not.toBe("");
    expect(typeof secret).toBe("string");
  });

  it.skipIf(!hasXCredentials)("X_ACCESS_TOKEN environment variable is set", () => {
    const token = process.env.X_ACCESS_TOKEN;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    expect(typeof token).toBe("string");
  });

  it.skipIf(!hasXCredentials)("X_ACCESS_TOKEN_SECRET environment variable is set", () => {
    const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
    expect(tokenSecret).toBeDefined();
    expect(tokenSecret).not.toBe("");
    expect(typeof tokenSecret).toBe("string");
  });

  it.skipIf(!hasXCredentials)(
    "X API credentials can authenticate with Twitter API",
    { timeout: 15000 },
    async () => {
      const { TwitterApi } = await import("twitter-api-v2");
      const client = new TwitterApi({
        appKey: process.env.X_API_KEY!,
        appSecret: process.env.X_API_SECRET!,
        accessToken: process.env.X_ACCESS_TOKEN!,
        accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
      });
      const me = await client.v2.me();
      expect(me.data).toBeDefined();
      expect(me.data.username).toBeDefined();
      expect(typeof me.data.username).toBe("string");
      console.log(`Authenticated as @${me.data.username}`);
    }
  );
});
