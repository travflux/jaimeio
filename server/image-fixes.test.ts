/**
 * Tests for image generation quality fixes (CEO Directive)
 * Issues 1-7: fallback path, mascot seed, style seeds, LLM prompt,
 * aspect ratio passthrough, sanitizer aggressiveness, and dashboard stats.
 */
import { describe, it, expect } from "vitest";
import { sanitizePrompt, hasProblematicContent, getSafePrompt } from "./_core/promptSanitizer";

// ─── Issue 7: Prompt Sanitizer — reduced aggressiveness ─────────────────────

describe("promptSanitizer — news vocabulary preservation", () => {
  it("preserves 'crime' in image prompts", () => {
    const result = sanitizePrompt("A crime scene investigation illustration");
    expect(result).toContain("crime");
  });

  it("preserves 'death' in image prompts", () => {
    const result = sanitizePrompt("A symbolic illustration of death and taxes");
    expect(result).toContain("death");
  });

  it("preserves 'blood' in image prompts", () => {
    const result = sanitizePrompt("A blood pressure monitor in a doctor's office");
    expect(result).toContain("blood");
  });

  it("preserves 'drug' in image prompts", () => {
    const result = sanitizePrompt("A pharmaceutical drug company boardroom");
    expect(result).toContain("drug");
  });

  it("preserves 'violence' in image prompts", () => {
    const result = sanitizePrompt("A cartoon depicting political violence metaphor");
    expect(result).toContain("violence");
  });

  it("preserves 'illegal' in image prompts", () => {
    const result = sanitizePrompt("An illegal parking ticket cartoon");
    expect(result).toContain("illegal");
  });

  it("preserves 'criminal' in image prompts", () => {
    const result = sanitizePrompt("A criminal court illustration");
    expect(result).toContain("criminal");
  });

  it("preserves 'murder' in image prompts", () => {
    const result = sanitizePrompt("A murder mystery dinner party scene");
    expect(result).toContain("murder");
  });

  it("preserves 'assassination' in image prompts", () => {
    const result = sanitizePrompt("A political assassination attempt cartoon");
    expect(result).toContain("assassination");
  });

  it("still removes hard-rejection content: porn", () => {
    const result = sanitizePrompt("A porn star press conference");
    expect(result).not.toContain("porn");
    expect(result).toContain("adult content");
  });

  it("still removes hard-rejection content: nazi", () => {
    const result = sanitizePrompt("A nazi rally cartoon");
    expect(result).not.toContain("nazi");
    expect(result).toContain("fascist");
  });

  it("still removes hard-rejection content: suicide", () => {
    const result = sanitizePrompt("A suicide prevention billboard illustration");
    expect(result).not.toContain("suicide");
    expect(result).toContain("despair");
  });

  it("does not flag news vocabulary as problematic", () => {
    expect(hasProblematicContent("A crime scene investigation")).toBe(false);
    expect(hasProblematicContent("Drug company boardroom")).toBe(false);
    expect(hasProblematicContent("Political violence metaphor")).toBe(false);
  });

  it("does flag hard-rejection content as problematic", () => {
    expect(hasProblematicContent("A porn star press conference")).toBe(true);
    expect(hasProblematicContent("A nazi rally")).toBe(true);
  });

  it("returns wasSanitized=false for clean news prompts", () => {
    const { wasSanitized } = getSafePrompt("A crime scene investigation illustration");
    expect(wasSanitized).toBe(false);
  });

  it("returns wasSanitized=true for hard-rejection content", () => {
    const { wasSanitized } = getSafePrompt("A nazi rally cartoon");
    expect(wasSanitized).toBe(true);
  });

  it("handles empty prompt gracefully", () => {
    expect(sanitizePrompt("")).toBe("");
  });

  it("truncates prompts over 1000 chars", () => {
    const longPrompt = "A ".repeat(600);
    const result = sanitizePrompt(longPrompt);
    expect(result.length).toBeLessThanOrEqual(1000);
  });
});
