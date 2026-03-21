import { describe, it, expect, beforeEach } from "vitest";
import { generateLicenseKey, validateLicenseKey, getLicenseInfo } from "./licensing";

describe("License Management", () => {
  describe("generateLicenseKey", () => {
    it("should generate a valid license key", () => {
      const license = generateLicenseKey(
        "Test Client",
        "test@example.com",
        "example.com",
        "professional",
        12
      );
      
      expect(license.key).toBeTruthy();
      expect(license.key).toContain("-");
      expect(license.issuedAt).toBeInstanceOf(Date);
      expect(license.expiresAt).toBeInstanceOf(Date);
    });
    
    it("should generate different keys for different clients", () => {
      const license1 = generateLicenseKey("Client A", "a@example.com", "a.com", "starter", 12);
      const license2 = generateLicenseKey("Client B", "b@example.com", "b.com", "starter", 12);
      
      expect(license1.key).not.toBe(license2.key);
    });
    
    it("should generate lifetime license when validityMonths is undefined", () => {
      const license = generateLicenseKey(
        "Test Client",
        "test@example.com",
        "example.com",
        "enterprise"
      );
      
      expect(license.expiresAt).toBeUndefined();
    });
    
    it("should calculate correct expiration date", () => {
      const license = generateLicenseKey(
        "Test Client",
        "test@example.com",
        "example.com",
        "professional",
        12
      );
      
      const monthsDiff = license.expiresAt
        ? (license.expiresAt.getTime() - license.issuedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
        : 0;
      
      expect(monthsDiff).toBeCloseTo(12, 0);
    });
  });
  
  describe("validateLicenseKey", () => {
    it("should validate a valid license key", () => {
      const license = generateLicenseKey(
        "Test Client",
        "test@example.com",
        "example.com",
        "professional",
        12
      );
      
      const validation = validateLicenseKey(license.key);
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });
    
    it("should reject invalid format", () => {
      const validation = validateLicenseKey("invalid-key");
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe("Invalid license key format");
    });
    
    it("should reject tampered key", () => {
      const license = generateLicenseKey(
        "Test Client",
        "test@example.com",
        "example.com",
        "professional",
        12
      );
      
      // Tamper with the key
      const parts = license.key.split(".");
      parts[0] = parts[0].slice(0, -5) + "XXXXX";
      const tamperedKey = parts.join(".");
      
      const validation = validateLicenseKey(tamperedKey);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe("Failed to parse license key");
    });
    
    it("should detect expired licenses", () => {
      const license = generateLicenseKey(
        "Test Client",
        "test@example.com",
        "example.com",
        "professional",
        -1 // Expired 1 month ago
      );
      
      const validation = validateLicenseKey(license.key);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe("License has expired");
    });
  });
  
  describe("parseLicenseKey", () => {
    it("should parse a valid license key", () => {
      const license = generateLicenseKey(
        "Test Client",
        "test@example.com",
        "example.com",
        "professional",
        12
      );
      
      const validation = validateLicenseKey(license.key);
      expect(validation.valid).toBe(true);
      expect(validation.license?.clientName).toBe("Test Client");
      expect(validation.license?.email).toBe("test@example.com");
      expect(validation.license?.domain).toBe("example.com");
      expect(validation.license?.tier).toBe("professional");
    });
    
    it("should return error for invalid key", () => {
      const validation = validateLicenseKey("invalid-key");
      expect(validation.valid).toBe(false);
      expect(validation.license).toBeUndefined();
    });
    
    it("should handle lifetime licenses", () => {
      const license = generateLicenseKey(
        "Test Client",
        "test@example.com",
        "example.com",
        "enterprise"
      );
      
      const validation = validateLicenseKey(license.key);
      expect(validation.valid).toBe(true);
      expect(validation.license?.expiresAt).toBeUndefined();
    });
  });
  
  describe("License Tiers", () => {
    it("should support all tier types", () => {
      const tiers: Array<"starter" | "professional" | "enterprise"> = ["starter", "professional", "enterprise"];
      
      tiers.forEach(tier => {
        const license = generateLicenseKey(
          "Test Client",
          "test@example.com",
          "example.com",
          tier,
          12
        );
        
        const validation = validateLicenseKey(license.key);
        expect(validation.valid).toBe(true);
        expect(validation.license?.tier).toBe(tier);
      });
    });
  });
});
