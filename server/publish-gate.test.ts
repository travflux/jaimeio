/**
 * Tests for publishGate.ts — the image-required-to-publish rule.
 *
 * Verifies:
 *  1. Article with a featuredImage is always allowed.
 *  2. Article without a featuredImage is allowed when mascot_url is set.
 *  3. Article without a featuredImage is BLOCKED when mascot_url is empty/unset.
 *  4. Blocked result includes a human-readable reason string.
 *  5. Whitespace-only featuredImage is treated as missing.
 *  6. Whitespace-only mascot_url is treated as missing.
 *  7. Re-setting mascot_url unblocks the article.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { checkPublishGate } from "./publishGate";

// Use a fake article ID — checkPublishGate only uses the ID for logging, not DB lookup
const FAKE_ID = 999999;

describe("checkPublishGate", () => {
  beforeAll(async () => {
    // Start with no mascot fallback configured
    await db.setSetting("mascot_url", "");
  });

  afterAll(async () => {
    // Restore mascot_url to empty after tests
    await db.setSetting("mascot_url", "");
  });

  it("allows publish when article has a featuredImage URL", async () => {
    const result = await checkPublishGate(FAKE_ID, "https://cdn.example.com/image.jpg");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows publish when article has no featuredImage but mascot_url is set", async () => {
    await db.setSetting("mascot_url", "https://cdn.example.com/mascot.png");
    const result = await checkPublishGate(FAKE_ID, null);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
    // Restore
    await db.setSetting("mascot_url", "");
  });

  it("blocks publish when article has no featuredImage and mascot_url is empty string", async () => {
    await db.setSetting("mascot_url", "");
    const result = await checkPublishGate(FAKE_ID, null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("blocks publish when article has no featuredImage and mascot_url is not set in DB", async () => {
    // Simulate missing setting by passing undefined as featuredImage
    await db.setSetting("mascot_url", "");
    const result = await checkPublishGate(FAKE_ID, undefined);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("returns a human-readable reason when blocked", async () => {
    await db.setSetting("mascot_url", "");
    const result = await checkPublishGate(FAKE_ID, "");
    expect(result.allowed).toBe(false);
    expect(typeof result.reason).toBe("string");
    expect(result.reason!.length).toBeGreaterThan(20);
  });

  it("treats whitespace-only featuredImage as missing", async () => {
    await db.setSetting("mascot_url", "");
    const result = await checkPublishGate(FAKE_ID, "   ");
    expect(result.allowed).toBe(false);
  });

  it("treats whitespace-only mascot_url as missing", async () => {
    await db.setSetting("mascot_url", "   ");
    const result = await checkPublishGate(FAKE_ID, null);
    expect(result.allowed).toBe(false);
    // Restore
    await db.setSetting("mascot_url", "");
  });

  it("unblocks publish after mascot_url is configured", async () => {
    // Initially blocked
    await db.setSetting("mascot_url", "");
    const blocked = await checkPublishGate(FAKE_ID, null);
    expect(blocked.allowed).toBe(false);

    // Configure mascot — now allowed
    await db.setSetting("mascot_url", "https://cdn.example.com/mascot.png");
    const allowed = await checkPublishGate(FAKE_ID, null);
    expect(allowed.allowed).toBe(true);

    // Restore
    await db.setSetting("mascot_url", "");
  });
});
