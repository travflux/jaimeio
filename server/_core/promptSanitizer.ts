/**
 * Prompt sanitizer for image generation
 * Removes or replaces content that triggers API safety filters.
 *
 * DESIGN INTENT:
 * This sanitizer is intentionally narrow. It only targets words that are
 * genuinely likely to trigger hard safety rejections from image APIs.
 * It does NOT replace common news vocabulary (crime, drug, death, blood, etc.)
 * because satirical and editorial news images legitimately need these concepts.
 *
 * Words like "crime", "drug", "death", "blood", "illegal", "criminal" are
 * standard journalism vocabulary and must NOT be replaced — doing so produces
 * incoherent image prompts (e.g., "offense" instead of "crime scene").
 */

// Only replace words that reliably trigger hard safety rejections
const REPLACEMENTS: Record<string, string> = {
  // Explicit sexual content
  "porn": "adult content",
  "xxx": "adult content",
  "erotic": "romantic",
  "nude": "unclothed figure",
  "naked": "bare",
  // Extreme hate speech
  "nazi": "fascist",
  "hitler": "dictator",
  // Self-harm (specific clinical terms)
  "suicide": "despair",
  "self-harm": "distress",
};

// Patterns for hard-rejection content only (not news vocabulary)
const HARD_REJECTION_PATTERNS = [
  /\b(porn|xxx|erotic|nude|naked|hentai)\b/gi,
  /\b(nazi|hitler|genocide|ethnic cleansing)\b/gi,
  /\b(suicide|self-harm)\b/gi,
];

/**
 * Sanitize a prompt by replacing only hard-rejection content.
 * Common news vocabulary (crime, death, blood, drug, violence, etc.) is preserved.
 */
export function sanitizePrompt(prompt: string): string {
  if (!prompt) return prompt;

  let sanitized = prompt;

  // Replace known hard-rejection words with safe alternatives
  Object.entries(REPLACEMENTS).forEach(([problematic, safe]) => {
    const regex = new RegExp(`\\b${problematic.replace("-", "\\-")}\\b`, "gi");
    sanitized = sanitized.replace(regex, safe);
  });

  // Remove any remaining hard-rejection patterns
  HARD_REJECTION_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "");
  });

  // Clean up multiple spaces
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // Ensure prompt is not too long (most providers cap at 1000 chars)
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000).trim();
  }

  // If sanitization removed nearly everything, return a generic fallback
  if (sanitized.length < 10) {
    return "A professional illustration for a news article";
  }

  return sanitized;
}

/**
 * Check if a prompt contains hard-rejection content
 */
export function hasProblematicContent(prompt: string): boolean {
  if (!prompt) return false;
  for (const pattern of HARD_REJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      return true;
    }
  }
  return false;
}

/**
 * Get a safe version of a prompt with a warning flag
 */
export function getSafePrompt(prompt: string): { prompt: string; wasSanitized: boolean } {
  const hadProblematicContent = hasProblematicContent(prompt);
  const sanitized = sanitizePrompt(prompt);
  return {
    prompt: sanitized,
    wasSanitized: hadProblematicContent || sanitized !== prompt,
  };
}
