/**
 * Tests for the image prompt sanitizer.
 *
 * DESIGN: The sanitizer is intentionally narrow - it only removes hard-rejection
 * content (explicit sexual content, extreme hate speech, self-harm terms).
 * Common news vocabulary (violence, crime, death, blood, drug, murder, etc.)
 * is deliberately preserved so satirical/editorial image prompts remain coherent.
 */
import { describe, it, expect } from "vitest";
import { sanitizePrompt, hasProblematicContent, getSafePrompt } from "./promptSanitizer";

describe("Prompt Sanitizer", () => {
  describe("sanitizePrompt - news vocabulary preservation", () => {
    it("preserves violence-related news vocabulary", () => {
      const prompt = "A violent political cartoon with blood and gore imagery";
      const sanitized = sanitizePrompt(prompt);
      expect(sanitized.toLowerCase()).toContain("violent");
      expect(sanitized.toLowerCase()).toContain("blood");
      expect(sanitized.toLowerCase()).toContain("gore");
    });

    it("preserves crime and murder vocabulary", () => {
      const prompt = "A murder mystery crime scene investigation";
      const sanitized = sanitizePrompt(prompt);
      expect(sanitized.toLowerCase()).toContain("murder");
      expect(sanitized.toLowerCase()).toContain("crime");
    });

    it("preserves drug and illegal vocabulary", () => {
      const prompt = "A pharmaceutical drug company with illegal practices";
      const sanitized = sanitizePrompt(prompt);
      expect(sanitized.toLowerCase()).toContain("drug");
      expect(sanitized.toLowerCase()).toContain("illegal");
    });

    it("still removes hard-rejection content: explicit sexual", () => {
      const prompt = "A porn star press conference";
      const sanitized = sanitizePrompt(prompt);
      expect(sanitized.toLowerCase()).not.toContain("porn");
    });

    it("still removes hard-rejection content: nazi", () => {
      const prompt = "A nazi rally cartoon";
      const sanitized = sanitizePrompt(prompt);
      expect(sanitized.toLowerCase()).not.toContain("nazi");
    });

    it("still removes hard-rejection content: suicide", () => {
      const prompt = "A suicide prevention billboard";
      const sanitized = sanitizePrompt(prompt);
      expect(sanitized.toLowerCase()).not.toContain("suicide");
    });

    it("truncates very long prompts", () => {
      const longPrompt = "A ".repeat(600);
      const sanitized = sanitizePrompt(longPrompt);
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });

    it("cleans up multiple spaces", () => {
      const prompt = "A  scene   with   multiple    spaces";
      const sanitized = sanitizePrompt(prompt);
      expect(sanitized).not.toContain("  ");
    });

    it("preserves safe content unchanged", () => {
      const prompt = "A beautiful sunset over mountains";
      const sanitized = sanitizePrompt(prompt);
      expect(sanitized).toContain("beautiful");
      expect(sanitized).toContain("sunset");
      expect(sanitized).toContain("mountains");
    });
  });

  describe("hasProblematicContent - hard-rejection only", () => {
    it("does NOT flag news vocabulary as problematic", () => {
      expect(hasProblematicContent("A violent political cartoon")).toBe(false);
      expect(hasProblematicContent("A brutal murder scene")).toBe(false);
      expect(hasProblematicContent("Drug company boardroom")).toBe(false);
    });

    it("flags explicit sexual content", () => {
      expect(hasProblematicContent("Adult porn content")).toBe(true);
    });

    it("flags extreme hate speech", () => {
      expect(hasProblematicContent("A nazi rally")).toBe(true);
    });

    it("flags self-harm terms", () => {
      expect(hasProblematicContent("A suicide scene")).toBe(true);
    });

    it("does not flag safe content", () => {
      expect(hasProblematicContent("A beautiful landscape")).toBe(false);
      expect(hasProblematicContent("A professional meeting")).toBe(false);
      expect(hasProblematicContent("A news article illustration")).toBe(false);
    });

    it("handles empty strings", () => {
      expect(hasProblematicContent("")).toBe(false);
    });
  });

  describe("getSafePrompt", () => {
    it("preserves news vocabulary and returns wasSanitized=false", () => {
      const result = getSafePrompt("A violent crime scene illustration");
      expect(result.prompt.toLowerCase()).toContain("violent");
      expect(result.prompt.toLowerCase()).toContain("crime");
      expect(result.wasSanitized).toBe(false);
    });

    it("sanitizes hard-rejection content and returns wasSanitized=true", () => {
      const result = getSafePrompt("A nazi rally cartoon");
      expect(result.prompt.toLowerCase()).not.toContain("nazi");
      expect(result.wasSanitized).toBe(true);
    });

    it("does not flag safe content as sanitized", () => {
      const result = getSafePrompt("A beautiful landscape");
      expect(result.prompt).toContain("beautiful");
      expect(result.wasSanitized).toBe(false);
    });

    it("handles professional content unchanged", () => {
      const original = "A professional illustration";
      const result = getSafePrompt(original);
      expect(result.prompt).toBe(original);
    });
  });
});
