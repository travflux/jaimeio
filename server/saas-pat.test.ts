import { describe, it, expect } from "vitest";

describe("SAAS_GITHUB_PAT secret", () => {
  it("should be set in the environment", () => {
    const pat = process.env.SAAS_GITHUB_PAT;
    expect(pat).toBeTruthy();
    expect(pat?.startsWith("ghp_")).toBe(true);
  });
});
