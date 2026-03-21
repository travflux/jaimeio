/**
 * Tests for CEO Directives DB helpers
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";

describe("CEO Directives", () => {
  beforeEach(async () => {
    // Clean up any directives created by tests
    const existing = await db.listCeoDirectives();
    for (const d of existing) {
      if (d.subject.startsWith("[TEST]")) {
        await db.deleteCeoDirective(d.id);
      }
    }
  });

  it("should create a directive and retrieve it", async () => {
    await db.createCeoDirective({
      directiveDate: "2026-02-27",
      fromName: "CEO",
      priority: "High",
      subject: "[TEST] Launch Reddit integration",
      body: "Integrate Reddit auto-poster with manual approval queue.",
      status: "Pending",
    });

    const directives = await db.listCeoDirectives();
    const created = directives.find(d => d.subject === "[TEST] Launch Reddit integration");
    expect(created).toBeDefined();
    expect(created!.priority).toBe("High");
    expect(created!.status).toBe("Pending");
    expect(created!.fromName).toBe("CEO");
  });

  it("should update directive status", async () => {
    await db.createCeoDirective({
      directiveDate: "2026-02-27",
      fromName: "CEO",
      priority: "Critical",
      subject: "[TEST] Fix X API rate limits",
      body: "Investigate and resolve X API rate limit issues.",
      status: "Pending",
    });

    const before = await db.listCeoDirectives();
    const directive = before.find(d => d.subject === "[TEST] Fix X API rate limits");
    expect(directive).toBeDefined();

    await db.updateCeoDirectiveStatus(directive!.id, "In Progress");

    const after = await db.listCeoDirectives();
    const updated = after.find(d => d.id === directive!.id);
    expect(updated!.status).toBe("In Progress");
  });

  it("should mark directive as complete with a date", async () => {
    await db.createCeoDirective({
      directiveDate: "2026-02-27",
      fromName: "CEO",
      priority: "Medium",
      subject: "[TEST] Submit sitemap to Google",
      body: "Submit sitemap.xml to Google Search Console.",
      status: "Pending",
    });

    const before = await db.listCeoDirectives();
    const directive = before.find(d => d.subject === "[TEST] Submit sitemap to Google");
    expect(directive).toBeDefined();

    await db.updateCeoDirectiveStatus(directive!.id, "Complete", "2026-02-28");

    const after = await db.listCeoDirectives();
    const updated = after.find(d => d.id === directive!.id);
    expect(updated!.status).toBe("Complete");
    expect(updated!.completedDate).toBe("2026-02-28");
  });

  it("should delete a directive", async () => {
    await db.createCeoDirective({
      directiveDate: "2026-02-27",
      fromName: "CEO",
      priority: "Low",
      subject: "[TEST] Directive to delete",
      body: "This directive should be deleted.",
      status: "Cancelled",
    });

    const before = await db.listCeoDirectives();
    const directive = before.find(d => d.subject === "[TEST] Directive to delete");
    expect(directive).toBeDefined();

    await db.deleteCeoDirective(directive!.id);

    const after = await db.listCeoDirectives();
    const deleted = after.find(d => d.id === directive!.id);
    expect(deleted).toBeUndefined();
  });

  it("should list directives and return them in an array", async () => {
    await db.createCeoDirective({
      directiveDate: "2026-02-27",
      fromName: "CEO",
      priority: "Low",
      subject: "[TEST] List check directive",
      body: "Verifying list returns an array.",
      status: "Pending",
    });

    const directives = await db.listCeoDirectives();
    expect(Array.isArray(directives)).toBe(true);
    expect(directives.length).toBeGreaterThanOrEqual(1);
    const found = directives.find(d => d.subject === "[TEST] List check directive");
    expect(found).toBeDefined();
    expect(found!.priority).toBe("Low");
  });
});
