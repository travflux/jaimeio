import { Link } from "wouter";
import type { Article } from "../../../drizzle/schema";
import { useBranding } from "../hooks/useBranding";

interface ArticleCardProps {
  article: Article;
  variant?: "featured" | "standard" | "compact" | "list" | "mini";
  categoryName?: string;
  categoryColor?: string; // Hex color code for the category
}

export default function ArticleCard({ article, variant = "standard", categoryName, categoryColor = "#6366f1" }: ArticleCardProps) {
  const timeAgo = getTimeAgo(article.publishedAt || article.createdAt);
  const { branding } = useBranding();

  // Ensure categoryColor is a valid hex color
  const validColor = categoryColor && /^#[0-9A-F]{6}$/i.test(categoryColor) ? categoryColor : "#6366f1";

  if (variant === "featured") {
    return (
      <Link href={`/article/${article.slug}`} className="group block">
        <article className="card-hover rounded-sm overflow-hidden">
          {article.featuredImage ? (
            <div className="aspect-[16/9] overflow-hidden rounded-sm mb-3 sm:mb-5 relative">
              <img
                src={article.featuredImage}
                alt={article.headline}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                loading="eager"
              />
              {categoryName && (
                <span className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm px-2.5 py-1 rounded-sm shadow-lg" style={{ backgroundColor: validColor }}>
                  {categoryName}
                </span>
              )}
            </div>
          ) : (
            <div className="aspect-[16/9] rounded-sm mb-3 sm:mb-5 flex items-center justify-center relative overflow-hidden bg-muted/60">
              <img
                src={branding.logoUrl}
                alt={branding.siteName}
                className="w-1/4 h-auto opacity-25 group-hover:opacity-40 transition-opacity duration-500"
                loading="lazy"
              />
              {categoryName && (
                <span className="absolute top-3 left-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-white px-2.5 py-1 rounded-sm" style={{ backgroundColor: validColor }}>
                  {categoryName}
                </span>
              )}
            </div>
          )}
          {!article.featuredImage && categoryName && (
            <span className="inline-block text-[13px] font-semibold uppercase tracking-[0.12em] text-white px-2 py-0.5 rounded-sm" style={{ backgroundColor: validColor }}>
              {categoryName}
            </span>
          )}
          <h3 className="font-headline text-2xl sm:text-[2.25rem] font-black mt-1.5 sm:mt-2 group-hover:text-primary transition-colors duration-300 leading-[1.12] tracking-[-0.02em]">
            {article.headline}
          </h3>
          {article.subheadline && (
            <p className="text-muted-foreground mt-1.5 sm:mt-2.5 text-[15px] sm:text-[16px] leading-relaxed line-clamp-2">
              {article.subheadline}
            </p>
          )}
          <p className="meta-text mt-2 sm:mt-3">
            {timeAgo}{article.views ? ` · ${article.views} views` : ""}
          </p>
        </article>
      </Link>
    );
  }

  if (variant === "mini") {
    // Minimal linked headline — no padding, no border, for ticker and dense lists
    return (
      <Link href={`/article/${article.slug}`} className="group inline hover:text-primary transition-colors duration-200 font-headline text-[15px] font-semibold leading-snug">
        {article.headline}
      </Link>
    );
  }

  if (variant === "list") {
    // Headline-only list item with hover left-rule — used in sidebar widgets
    return (
      <Link href={`/article/${article.slug}`} className="group block py-3 border-b border-border/40 last:border-0">
        <article className="pl-3 border-l-2 border-transparent group-hover:border-primary transition-colors duration-200">
          {categoryName && (
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: validColor }}>
              {categoryName}
            </span>
          )}
          <h3 className="font-headline text-[14px] font-semibold leading-snug group-hover:text-primary transition-colors duration-200 mt-0.5 line-clamp-2">
            {article.headline}
          </h3>
          <p className="meta-text mt-1">{timeAgo}</p>
        </article>
      </Link>
    );
  }

  if (variant === "compact") {
    // Horizontal thumbnail + headline card — used in hero secondary column
    return (
      <Link href={`/article/${article.slug}`} className="group block">
        <article className="flex gap-3 py-3 border-b border-border/40 last:border-0 card-hover">
          {/* Thumbnail */}
          <div className="w-20 sm:w-24 shrink-0">
            {article.featuredImage ? (
              <div className="aspect-[4/3] overflow-hidden rounded-sm">
                <img
                  src={article.featuredImage}
                  alt={article.headline}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-sm bg-muted/60 flex items-center justify-center overflow-hidden">
                <img
                  src={branding.logoUrl}
                  alt={branding.siteName}
                  className="w-2/3 h-auto opacity-25 group-hover:opacity-40 transition-opacity duration-500"
                  loading="lazy"
                />
              </div>
            )}
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            {categoryName && (
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: validColor }}>
                {categoryName}
              </span>
            )}
            <h3 className="font-headline text-[14px] sm:text-[15px] font-bold leading-snug group-hover:text-primary transition-colors duration-300 line-clamp-3 mt-0.5">
              {article.headline}
            </h3>
            <p className="meta-text mt-1">{timeAgo}</p>
          </div>
        </article>
      </Link>
    );
  }

  // Standard card — flat, content-forward, no border-l accent
  return (
    <Link href={`/article/${article.slug}`} className="group block pb-4 border-b border-border/40">
      <article className="card-hover">
        {article.featuredImage ? (
          <div className="aspect-[16/10] overflow-hidden rounded-sm mb-2.5 sm:mb-3 relative">
            <img
              src={article.featuredImage}
              alt={article.headline}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {categoryName && (
              <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm px-2 py-0.5 rounded-sm shadow-md" style={{ backgroundColor: validColor }}>
                {categoryName}
              </span>
            )}
          </div>
        ) : (
          <div className="aspect-[16/10] rounded-sm mb-2.5 sm:mb-3 flex items-center justify-center relative overflow-hidden bg-muted/60">
            <img
              src={branding.logoUrl}
              alt={branding.siteName}
              className="w-1/3 h-auto opacity-30 group-hover:opacity-50 transition-opacity duration-500"
              loading="lazy"
            />
            {categoryName && (
              <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white px-2 py-0.5 rounded-sm" style={{ backgroundColor: validColor }}>
                {categoryName}
              </span>
            )}
          </div>
        )}
        {!article.featuredImage && categoryName && (
          <span className="inline-block text-[13px] font-semibold uppercase tracking-[0.12em] text-white px-2 py-0.5 rounded-sm" style={{ backgroundColor: validColor }}>
            {categoryName}
          </span>
        )}
        <h3 className="font-headline text-base sm:text-lg font-bold mt-1 group-hover:text-primary transition-colors duration-300 leading-snug tracking-[-0.005em]">
          {article.headline}
        </h3>
        {article.subheadline && (
          <p className="text-muted-foreground text-[14px] sm:text-[15px] mt-1 sm:mt-1.5 line-clamp-2 leading-relaxed">
            {article.subheadline}
          </p>
        )}
        <p className="meta-text mt-1.5 sm:mt-2">{timeAgo}</p>
      </article>
    </Link>
  );
}

function getTimeAgo(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
