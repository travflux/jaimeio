import { describe, it, expect } from "vitest";

describe("Social post character limit validation", () => {
  it("should truncate posts longer than 260 characters while preserving the link", () => {
    const articleUrl = "https://example.com/article/test-slug-123";
    
    // Simulate a post that's too long (300+ characters)
    const longPost = "This is an incredibly long satirical post that goes on and on about the absurdity of modern politics and how everything is completely ridiculous and we should all just laugh at the chaos because what else can we do in this timeline anyway right? " + articleUrl;
    
    expect(longPost.length).toBeGreaterThan(260);
    
    // Simulate the truncation logic from workflow.ts
    let postContent = longPost;
    if (postContent.length > 260) {
      const linkMatch = postContent.match(/(https?:\/\/[^\s]+)$/);
      const link = linkMatch ? linkMatch[1] : articleUrl;
      const maxTextLength = 260 - link.length - 1;
      const textPortion = postContent.replace(/(https?:\/\/[^\s]+)$/, "").trim();
      postContent = textPortion.slice(0, maxTextLength).trim() + " " + link;
    }
    
    expect(postContent.length).toBeLessThanOrEqual(260);
    expect(postContent).toContain(articleUrl);
    expect(postContent.endsWith(articleUrl)).toBe(true);
  });
  
  it("should leave posts under 260 characters unchanged", () => {
    const articleUrl = "https://example.com/article/test-slug-123";
    const shortPost = "Short satirical post about politics. " + articleUrl;
    
    expect(shortPost.length).toBeLessThan(260);
    
    // Simulate the truncation logic
    let postContent = shortPost;
    if (postContent.length > 260) {
      const linkMatch = postContent.match(/(https?:\/\/[^\s]+)$/);
      const link = linkMatch ? linkMatch[1] : articleUrl;
      const maxTextLength = 260 - link.length - 1;
      const textPortion = postContent.replace(/(https?:\/\/[^\s]+)$/, "").trim();
      postContent = textPortion.slice(0, maxTextLength).trim() + " " + link;
    }
    
    expect(postContent).toBe(shortPost);
    expect(postContent.length).toBeLessThanOrEqual(260);
  });
  
  it("should handle posts exactly at 260 characters", () => {
    const articleUrl = "https://example.com/article/test-slug-123";
    // Create a post that's exactly 260 characters
    const textLength = 260 - articleUrl.length - 1; // -1 for the space
    const exactPost = "a".repeat(textLength) + " " + articleUrl;
    
    expect(exactPost.length).toBe(260);
    
    // Simulate the truncation logic
    let postContent = exactPost;
    if (postContent.length > 260) {
      const linkMatch = postContent.match(/(https?:\/\/[^\s]+)$/);
      const link = linkMatch ? linkMatch[1] : articleUrl;
      const maxTextLength = 260 - link.length - 1;
      const textPortion = postContent.replace(/(https?:\/\/[^\s]+)$/, "").trim();
      postContent = textPortion.slice(0, maxTextLength).trim() + " " + link;
    }
    
    expect(postContent).toBe(exactPost);
    expect(postContent.length).toBe(260);
  });
});
