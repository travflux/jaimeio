/**
 * Article content validation module
 * Validates article bodies before publishing to catch JSON, malformed HTML, and other issues
 */

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validate article body content
 * Returns validation result with warnings and errors
 */
export function validateArticleBody(body: string | null | undefined): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
  };

  // Check for empty content
  if (!body || body.trim().length === 0) {
    result.valid = false;
    result.errors.push('Article body is empty');
    return result;
  }

  const trimmed = body.trim();

  // Check for raw JSON content
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.body || parsed.headline || parsed.subheadline) {
        result.valid = false;
        result.errors.push('Article body contains raw JSON. Please extract the content before publishing.');
        return result;
      }
    } catch {
      // Not valid JSON, continue with other checks
    }
  }

  // Check for very short content (less than 100 characters)
  if (trimmed.length < 100) {
    result.warnings.push('Article body is very short (less than 100 characters). Consider adding more content.');
  }

  // Check for missing HTML paragraphs (if content doesn't have <p> tags)
  if (!trimmed.includes('<p>') && !trimmed.includes('<div>') && trimmed.length > 200) {
    result.warnings.push('Article body may need paragraph formatting. Consider wrapping content in <p> tags.');
  }

  // Check for unclosed HTML tags
  const openTags = (trimmed.match(/<[^/][^>]*>/g) || []).length;
  const closeTags = (trimmed.match(/<\/[^>]+>/g) || []).length;
  if (openTags !== closeTags) {
    result.warnings.push(`Possible unclosed HTML tags detected (${openTags} opening, ${closeTags} closing).`);
  }

  // Check for escaped characters that should be unescaped
  if (trimmed.includes('\\n') || trimmed.includes('\\t') || trimmed.includes('\\"')) {
    result.warnings.push('Article body contains escaped characters (\\n, \\t, \\"). These may display incorrectly.');
  }

  return result;
}

/**
 * Validate article headline
 */
export function validateArticleHeadline(headline: string | null | undefined): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
  };

  if (!headline || headline.trim().length === 0) {
    result.valid = false;
    result.errors.push('Article headline is empty');
    return result;
  }

  const trimmed = headline.trim();

  // Check headline length
  if (trimmed.length < 10) {
    result.warnings.push('Headline is very short (less than 10 characters).');
  }

  if (trimmed.length > 200) {
    result.warnings.push('Headline is very long (over 200 characters). Consider shortening for better SEO.');
  }

  // Check for JSON in headline
  if (trimmed.startsWith('{')) {
    result.valid = false;
    result.errors.push('Headline contains JSON or malformed content.');
  }

  return result;
}

/**
 * Validate complete article before publishing
 */
export function validateArticle(article: {
  headline?: string | null;
  body?: string | null;
  featuredImage?: string | null;
}): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
  };

  // Validate headline
  const headlineValidation = validateArticleHeadline(article.headline);
  result.warnings.push(...headlineValidation.warnings);
  result.errors.push(...headlineValidation.errors);
  if (!headlineValidation.valid) {
    result.valid = false;
  }

  // Validate body
  const bodyValidation = validateArticleBody(article.body);
  result.warnings.push(...bodyValidation.warnings);
  result.errors.push(...bodyValidation.errors);
  if (!bodyValidation.valid) {
    result.valid = false;
  }

  // Check for featured image
  if (!article.featuredImage || article.featuredImage.trim().length === 0) {
    result.warnings.push('Article has no featured image. This may affect social media sharing.');
  }

  return result;
}
