/**
 * Utility functions for generating Schema.org structured data
 * These help search engines understand page content and enable rich results
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ArticleSchemaData {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  publisher: string;
  publisherLogo: string;
  url: string;
}

/**
 * Generate BreadcrumbList schema for navigation hierarchy
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url,
    })),
  };
}

/**
 * Generate FAQPage schema for FAQ content
 */
export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}

/**
 * Generate Article schema for news/blog articles
 */
export function generateArticleSchema(data: ArticleSchemaData) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": data.headline,
    "description": data.description,
    "image": data.image,
    "datePublished": data.datePublished,
    "dateModified": data.dateModified || data.datePublished,
    "author": {
      "@type": "Organization",
      "name": data.author,
    },
    "publisher": {
      "@type": "Organization",
      "name": data.publisher,
      "logo": {
        "@type": "ImageObject",
        "url": data.publisherLogo,
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": data.url,
    },
  };
}

/**
 * Add schema markup to page head
 */
export function addSchemaMarkup(schema: any, id?: string) {
  let script = document.querySelector(`script[type="application/ld+json"]${id ? `[data-schema-id="${id}"]` : ''}`) as HTMLScriptElement;
  
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    if (id) {
      script.setAttribute('data-schema-id', id);
    }
    document.head.appendChild(script);
  }
  
  script.textContent = JSON.stringify(schema);
}

/**
 * Remove schema markup from page
 */
export function removeSchemaMarkup(id: string) {
  const script = document.querySelector(`script[type="application/ld+json"][data-schema-id="${id}"]`);
  if (script) {
    script.remove();
  }
}
