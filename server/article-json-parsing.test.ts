import { describe, it, expect } from 'vitest';

describe('Article Body JSON Parsing', () => {
  it('should extract body field from JSON and convert to HTML paragraphs', () => {
    const jsonBody = `{ "headline": "Test Headline", "subheadline": "Test Subheadline", "body": "First paragraph.\\n\\nSecond paragraph with \\"quotes\\".\\n\\nThird paragraph." }`;
    
    const trimmed = jsonBody.trim();
    expect(trimmed.startsWith('{')).toBe(true);
    expect(trimmed.endsWith('}')).toBe(true);
    
    const parsed = JSON.parse(trimmed);
    expect(parsed.body).toBeDefined();
    expect(typeof parsed.body).toBe('string');
    
    let extractedBody = parsed.body.replace(/\\n/g, '\n');
    const paragraphs = extractedBody.split('\n\n').filter((p: string) => p.trim());
    const htmlBody = paragraphs.map((p: string) => `<p>${p.trim()}</p>`).join('');
    
    expect(paragraphs).toHaveLength(3);
    expect(htmlBody).toContain('<p>First paragraph.</p>');
    expect(htmlBody).toContain('<p>Second paragraph with "quotes".</p>');
    expect(htmlBody).toContain('<p>Third paragraph.</p>');
  });

  it('should handle single paragraph', () => {
    const jsonBody = `{ "body": "Single paragraph only." }`;
    
    const parsed = JSON.parse(jsonBody);
    let extractedBody = parsed.body.replace(/\\n/g, '\n');
    const paragraphs = extractedBody.split('\n\n').filter((p: string) => p.trim());
    const htmlBody = paragraphs.map((p: string) => `<p>${p.trim()}</p>`).join('');
    
    expect(paragraphs).toHaveLength(1);
    expect(htmlBody).toBe('<p>Single paragraph only.</p>');
  });

  it('should handle escaped quotes in content', () => {
    const jsonBody = `{ "body": "\\"The data is unequivocal,\\" stated Dr. Smith." }`;
    
    const parsed = JSON.parse(jsonBody);
    let extractedBody = parsed.body.replace(/\\n/g, '\n');
    const paragraphs = extractedBody.split('\n\n').filter((p: string) => p.trim());
    const htmlBody = paragraphs.map((p: string) => `<p>${p.trim()}</p>`).join('');
    
    expect(htmlBody).toBe('<p>"The data is unequivocal," stated Dr. Smith.</p>');
  });

  it('should not parse non-JSON content', () => {
    const regularBody = 'This is regular text, not JSON.';
    
    const trimmed = regularBody.trim();
    expect(trimmed.startsWith('{')).toBe(false);
    // Should return as-is without parsing
  });

  it('should handle empty body field', () => {
    const jsonBody = `{ "headline": "Test", "body": "" }`;
    
    const parsed = JSON.parse(jsonBody);
    let extractedBody = parsed.body.replace(/\\n/g, '\n');
    const paragraphs = extractedBody.split('\n\n').filter((p: string) => p.trim());
    
    expect(paragraphs).toHaveLength(0);
  });
});
