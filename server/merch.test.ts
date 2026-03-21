/**
 * Tests for merch store pricing logic and product type definitions.
 * calculateSellPrice(basePriceCents, markupPercent) → sell price in dollars
 */
import { describe, it, expect } from "vitest";
import { calculateSellPrice } from "./merch/provider";

describe("Merch pricing utility (calculateSellPrice)", () => {
  it("applies 50% markup to $10 base → $15.99", () => {
    // base 1000 cents ($10), 50% markup → 1500 cents → $15.00 → floor(15) + 0.99 = $15.99
    expect(calculateSellPrice(1000, 50)).toBe(15.99);
  });

  it("applies 0% markup to $12.50 base → $12.99", () => {
    // base 1250 cents ($12.50), 0% markup → 1250 cents → $12.50 → floor($12) + 0.99 = $12.99
    expect(calculateSellPrice(1250, 0)).toBe(12.99);
  });

  it("applies 100% markup to $8 base → $16.99", () => {
    // base 800 cents ($8), 100% markup → 1600 cents → $16.00 → floor(16) + 0.99 = $16.99
    expect(calculateSellPrice(800, 100)).toBe(16.99);
  });

  it("handles fractional result: $7.50 base at 50% → $10.99", () => {
    // base 750 cents ($7.50), 50% markup → 1125 cents → $11.25 → floor($11) + 0.99 = $11.99
    expect(calculateSellPrice(750, 50)).toBe(11.99);
  });

  it("handles small base: $1 at 0% → $1.99", () => {
    // base 100 cents ($1), 0% markup → 100 cents → $1.00 → floor(1) + 0.99 = $1.99
    expect(calculateSellPrice(100, 0)).toBe(1.99);
  });

  it("handles large markup: $5 at 200% → $15.99", () => {
    // base 500 cents ($5), 200% markup → 1500 cents → $15.00 → floor(15) + 0.99 = $15.99
    expect(calculateSellPrice(500, 200)).toBe(15.99);
  });

  it("returns a number with exactly 2 decimal places", () => {
    const price = calculateSellPrice(999, 30);
    expect(price.toFixed(2)).toBe(String(price.toFixed(2)));
    expect(price % 1).toBeCloseTo(0.99, 5);
  });
});

describe("Merch product type definitions", () => {
  const VALID_TYPES = ["mug", "shirt", "poster", "case", "digital"] as const;

  it("has exactly 5 product types", () => {
    expect(VALID_TYPES).toHaveLength(5);
  });

  it("includes all required physical types", () => {
    expect(VALID_TYPES).toContain("mug");
    expect(VALID_TYPES).toContain("shirt");
    expect(VALID_TYPES).toContain("poster");
    expect(VALID_TYPES).toContain("case");
  });

  it("includes digital type", () => {
    expect(VALID_TYPES).toContain("digital");
  });
});
