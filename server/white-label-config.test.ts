import { describe, it, expect } from "vitest";
import { getSiteConfig } from "../shared/siteConfig";

describe("White-Label Configuration System", () => {
  it("should return default configuration", () => {
    const config = getSiteConfig();
    
    expect(config.siteName).toBe("Your Publication Name");
    expect(config.tagline).toBe("Your Tagline Here");
    expect(config.description).toContain("satirical");
    expect(config.contact.email).toBe("contact@example.com");
    expect(config.contact.twitter).toBe("@yourbrand");
  });

  it("should have all required configuration fields", () => {
    const config = getSiteConfig();
    
    expect(config).toHaveProperty("siteName");
    expect(config).toHaveProperty("tagline");
    expect(config).toHaveProperty("description");
    expect(config).toHaveProperty("contact");
    expect(config.contact).toHaveProperty("email");
    expect(config.contact).toHaveProperty("twitter");
    expect(config.legal).toHaveProperty("companyName");
  });

  it("should return string values for all text fields", () => {
    const config = getSiteConfig();
    
    expect(typeof config.siteName).toBe("string");
    expect(typeof config.tagline).toBe("string");
    expect(typeof config.description).toBe("string");
    expect(config.siteName.length).toBeGreaterThan(0);
    expect(config.tagline.length).toBeGreaterThan(0);
  });

  it("should have valid contact information", () => {
    const config = getSiteConfig();
    
    expect(config.contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(config.contact.twitter).toBeTruthy();
    expect(config.legal.companyName).toBeTruthy();
  });
});
