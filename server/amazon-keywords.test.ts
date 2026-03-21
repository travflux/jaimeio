import { describe, it, expect } from "vitest";
import { generateAmazonKeywords, getFallbackKeywords } from "./amazonKeywords";

describe("Amazon Keywords Generation", () => {
  it("should generate keywords for Tech category articles", () => {
    const keywords = generateAmazonKeywords({
      title: "New AI-Powered Smartphone Revolutionizes Mobile Computing",
      content: "Latest smartphone features advanced AI processor, high-resolution camera, and innovative software capabilities.",
      category: "Tech",
    });

    expect(keywords).toContain("electronics");
    expect(keywords).toContain("gadgets");
    expect(keywords).toContain("humor");
    expect(keywords).toContain("satire");
  });

  it("should generate keywords for Business category articles", () => {
    const keywords = generateAmazonKeywords({
      title: "Startup Raises $100M for Revolutionary Business Model",
      content: "New company disrupts traditional business practices with innovative productivity tools and management software.",
      category: "Business",
    });

    expect(keywords).toContain("business books");
    expect(keywords).toContain("productivity tools");
    expect(keywords).toContain("humor");
    expect(keywords).toContain("satire");
  });

  it("should generate keywords for Wellness category articles", () => {
    const keywords = generateAmazonKeywords({
      title: "New Fitness Trend Promises Instant Results",
      content: "Revolutionary workout program combines fitness equipment with supplement regimen for optimal health benefits.",
      category: "Wellness",
    });

    expect(keywords).toContain("health supplements");
    expect(keywords).toContain("fitness equipment");
    expect(keywords).toContain("fitness");
    expect(keywords).toContain("humor");
  });

  it("should extract product-related keywords from content", () => {
    const keywords = generateAmazonKeywords({
      title: "Review: The Best Coffee Makers of 2026",
      content: "We tested dozens of coffee makers, kitchen gadgets, and brewing equipment to find the perfect device for your morning routine.",
      category: "Lifestyle",
    });

    // Should include lifestyle category keywords
    expect(keywords).toContain("home decor");
    expect(keywords).toContain("kitchen gadgets");
    // Should extract product terms from content
    expect(keywords).toContain("device");
    expect(keywords).toContain("equipment");
  });

  it("should always include satire baseline keywords", () => {
    const keywords = generateAmazonKeywords({
      title: "Generic Article Title",
      content: "Generic article content without specific product mentions.",
      category: "Opinion",
    });

    expect(keywords).toContain("humor");
    expect(keywords).toContain("satire");
    expect(keywords).toContain("comedy");
  });

  it("should handle articles without category", () => {
    const keywords = generateAmazonKeywords({
      title: "Article Without Category",
      content: "This article has no category assigned but mentions books and gadgets.",
    });

    expect(keywords).toContain("book");
    expect(keywords).toContain("gadget");
    expect(keywords).toContain("humor");
    expect(keywords).toContain("satire");
  });

  it("should limit keywords to maximum of 8", () => {
    const keywords = generateAmazonKeywords({
      title: "Ultimate Guide to Books, Devices, Tools, Equipment, Gear, Products, Software, Apps, Games, and Toys",
      content: "This article mentions many product terms: book, device, tool, equipment, gear, product, software, app, game, toy, gadget, accessory, supplement, vitamin, protein, fitness, workout, camera, phone, laptop, tablet, watch, headphones.",
      category: "Tech",
    });

    const keywordArray = keywords.split(", ");
    expect(keywordArray.length).toBeLessThanOrEqual(8);
  });

  it("should deduplicate keywords", () => {
    const keywords = generateAmazonKeywords({
      title: "Book Review: Best Books About Books",
      content: "This book about books discusses many books and book-related topics.",
      category: "Opinion",
    });

    const keywordArray = keywords.split(", ");
    const uniqueKeywords = new Set(keywordArray);
    expect(keywordArray.length).toBe(uniqueKeywords.size);
  });

  it("should return fallback keywords", () => {
    const fallback = getFallbackKeywords();
    expect(fallback).toBe("books, humor, satire, comedy, political, entertainment, lifestyle, gifts");
  });

  it("should handle case-insensitive category matching", () => {
    const keywords1 = generateAmazonKeywords({
      title: "Test Article",
      content: "Test content",
      category: "TECH",
    });

    const keywords2 = generateAmazonKeywords({
      title: "Test Article",
      content: "Test content",
      category: "tech",
    });

    expect(keywords1).toBe(keywords2);
  });
});
