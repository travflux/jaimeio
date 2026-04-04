import React from "react";
import type { Article, Category } from "./types";

interface ArticleCardProps {
  article: Article;
  size: "hero" | "large" | "medium" | "small" | "mini";
  categories: Category[];
  showImage?: boolean;
  showExcerpt?: boolean;
}

function getCatForArticle(article: Article, categories: Category[]): Category | undefined {
  return categories.find(c => c.id === article.categoryId);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function stripHtml(str: string): string {
  return (str || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  const clean = stripHtml(str);
  return clean.length > max ? clean.slice(0, max - 3) + "..." : clean;
}

export function ArticleCard({ article, size, categories, showImage = true, showExcerpt = true }: ArticleCardProps) {
  const cat = getCatForArticle(article, categories);
  const href = `/article/${article.slug}`;
  const excerpt = article.subheadline || stripHtml(article.body);

  const sizeConfig = {
    hero: { imgRatio: "16/9", headlineSize: 28, excerptLines: 2, excerptLen: 180 },
    large: { imgRatio: "16/9", headlineSize: 22, excerptLines: 2, excerptLen: 140 },
    medium: { imgRatio: "4/3", headlineSize: 18, excerptLines: 1, excerptLen: 100 },
    small: { imgRatio: "1/1", headlineSize: 15, excerptLines: 0, excerptLen: 0 },
    mini: { imgRatio: "1/1", headlineSize: 14, excerptLines: 0, excerptLen: 0 },
  }[size];

  if (size === "small") {
    return (
      <a href={href} style={{ display: "flex", gap: 12, textDecoration: "none", color: "inherit", padding: "8px 0", transition: "transform 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
        {showImage && article.featuredImage && (
          <img src={article.featuredImage} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} loading="lazy" />
        )}
        <div style={{ minWidth: 0 }}>
          {cat && (
            <span style={{
              display: "inline-block", background: cat.color || "var(--brand-primary)", color: "#fff",
              fontSize: 11, textTransform: "uppercase", borderRadius: 4, padding: "2px 8px", marginBottom: 4, fontWeight: 600,
            }}>{cat.name}</span>
          )}
          <h3 style={{ fontSize: sizeConfig.headlineSize, fontFamily: "var(--brand-font-heading, Georgia, serif)", fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.3, margin: 0 }}>
            {article.headline}
          </h3>
          <span style={{ fontSize: 12, color: "var(--brand-text-secondary)", marginTop: 4, display: "block" }}>{formatDate(article.publishedAt)}</span>
        </div>
      </a>
    );
  }

  if (size === "mini") {
    return (
      <a href={href} style={{ display: "block", textDecoration: "none", color: "inherit", padding: "6px 0", transition: "transform 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
        <h4 style={{ fontSize: sizeConfig.headlineSize, fontFamily: "var(--brand-font-heading, Georgia, serif)", fontWeight: 600, color: "var(--brand-text-primary)", lineHeight: 1.3, margin: 0 }}>
          {article.headline}
        </h4>
        <span style={{ fontSize: 12, color: "var(--brand-text-secondary)" }}>{formatDate(article.publishedAt)}</span>
      </a>
    );
  }

  return (
    <a href={href} className="article-card" style={{ display: "block", textDecoration: "none", color: "inherit", transition: "transform 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
      {showImage && article.featuredImage && (
        <div style={{ aspectRatio: sizeConfig.imgRatio, overflow: "hidden", borderRadius: 8, marginBottom: 12 }}>
          <img src={article.featuredImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        </div>
      )}
      {cat && (
        <span style={{
          display: "inline-block", background: cat.color || "var(--brand-primary)", color: "#fff",
          fontSize: 11, textTransform: "uppercase", borderRadius: 4, padding: "2px 8px", marginBottom: 8, fontWeight: 600,
        }}>{cat.name}</span>
      )}
      <h3 style={{
        fontSize: sizeConfig.headlineSize, fontFamily: "var(--brand-font-heading, Georgia, serif)",
        fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.3, margin: "0 0 6px",
      }}>
        {article.headline}
      </h3>
      {showExcerpt && sizeConfig.excerptLen > 0 && (
        <p style={{
          fontSize: 14, color: "var(--brand-text-secondary)", lineHeight: 1.5, margin: "0 0 6px",
          display: "-webkit-box", WebkitLineClamp: sizeConfig.excerptLines, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {truncate(excerpt, sizeConfig.excerptLen)}
        </p>
      )}
      <span style={{ fontSize: 12, color: "var(--brand-text-secondary)", opacity: 0.8 }}>{formatDate(article.publishedAt)}</span>
    </a>
  );
}
