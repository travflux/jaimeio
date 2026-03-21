/**
 * Enhanced article card for search results with highlighted snippets
 */

import { Link } from "wouter";
import { Calendar, Eye } from "lucide-react";
import { Badge } from "./ui/badge";

interface SearchResultCardProps {
  article: {
    id: number;
    headline: string;
    subheadline: string | null;
    slug: string;
    featuredImage: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    categoryId: number | null;
    snippet?: string;
    score?: number;
    matchedFields?: string[];
  };
  categoryName?: string;
  query?: string;
}

export default function SearchResultCard({ article, categoryName, query }: SearchResultCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Highlight query terms in text
  const highlightText = (text: string, searchQuery?: string) => {
    if (!searchQuery) return text;
    
    const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    let result = text;
    
    for (const word of words) {
      const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>');
    }
    
    return result;
  };

  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  return (
    <Link href={`/article/${article.slug}`}>
      <article className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-200 h-full flex flex-col">
        {article.featuredImage && (
          <div className="relative aspect-[16/9] overflow-hidden bg-muted">
            <img
              src={article.featuredImage}
              alt={article.headline}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {categoryName && (
              <Badge className="absolute top-3 left-3 bg-primary/90 hover:bg-primary">
                {categoryName}
              </Badge>
            )}
            {article.score && article.score > 0 && (
              <div className="absolute top-3 right-3 bg-background/90 text-foreground text-xs px-2 py-1 rounded-full font-medium">
                {Math.round(article.score)}% match
              </div>
            )}
          </div>
        )}

        <div className="p-5 flex-1 flex flex-col">
          <h3 
            className="font-headline text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2"
            dangerouslySetInnerHTML={{ __html: highlightText(article.headline, query) }}
          />

          {article.snippet && (
            <p 
              className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1"
              dangerouslySetInnerHTML={{ __html: highlightText(article.snippet, query) }}
            />
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(article.publishedAt || article.createdAt)}</span>
            </div>
            
            {article.matchedFields && article.matchedFields.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-primary font-medium">Matched:</span>
                <span>{article.matchedFields.join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
