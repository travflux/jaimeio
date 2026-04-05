import React from "react";
import type { TemplateProps } from "../shared/types";
import { NewsletterBar, PublicationFooter, ArticleCard } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";

function stripHtml(str: string): string {
  return (str || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadTime(body: string): number {
  return Math.max(1, Math.ceil(stripHtml(body).split(/\s+/).length / 230));
}

export function MagazineArticle({ licenseSettings, categories, currentArticle, articles, mostRead }: TemplateProps) {
  if (!currentArticle) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 28, color: "var(--brand-text-primary)" }}>Article not found</h1>
        <a href="/" style={{ color: "var(--brand-link)", marginTop: 16, display: "inline-block" }}>← Back to home</a>
      </div>
    );
  }

  const article = currentArticle;
  const cat = categories.find(c => c.id === article.categoryId);
  const pubDate = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
  const readTime = estimateReadTime(article.body);

  let faqItems: Array<{ question: string; answer: string }> = [];
  if (article.geoFaq) { try { const p = JSON.parse(article.geoFaq); if (Array.isArray(p)) faqItems = p; } catch {} }

  const related = articles.filter(a => a.id !== article.id).slice(0, 3);

  let tags: string[] = [];
  if (article.tags) { try { const p = JSON.parse(article.tags); if (Array.isArray(p)) tags = p; } catch { tags = article.tags.split(",").map(t => t.trim()).filter(Boolean); } }

  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />

      {/* Full-width hero image */}
      {article.featuredImage && (
        <div style={{ width: "100%", maxHeight: 520, overflow: "hidden" }}>
          <img src={article.featuredImage} alt={article.headline} style={{ width: "100%", height: 520, objectFit: "cover" }} />
        </div>
      )}

      {/* Article content — single column, no sidebar */}
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 60px" }}>
        {cat && (
          <span style={{ display: "inline-block", color: "var(--brand-primary)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>{cat.name}</span>
        )}

        <h1 style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.15, marginBottom: 16 }}>
          {article.headline}
        </h1>

        {article.subheadline && (
          <p style={{ fontSize: 22, color: "var(--brand-text-secondary)", lineHeight: 1.4, marginBottom: 20 }}>{article.subheadline}</p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "var(--brand-text-secondary)", marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid var(--brand-border)" }}>
          <span>{pubDate}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{readTime} min read</span>
        </div>

        {/* GEO Key Takeaway */}
        {article.geoSummary && (
          <div style={{ background: "var(--brand-surface)", borderLeft: "3px solid var(--brand-primary)", padding: 16, marginBottom: 28, borderRadius: 4 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--brand-primary)", fontWeight: 700 }}>Key Takeaway</span>
            <p style={{ fontSize: 15, color: "var(--brand-text-primary)", lineHeight: 1.6, margin: "4px 0 0" }}>{article.geoSummary}</p>
          </div>
        )}

        {/* Article Body */}
        <div className="mag-article-body" style={{ fontSize: 19, lineHeight: 1.85, color: "var(--brand-text-primary)", fontFamily: "var(--brand-font-body)" }} dangerouslySetInnerHTML={{ __html: article.body }} />

        {/* FAQ */}
        {faqItems.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid var(--brand-border)" }}>
            <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 24, marginBottom: 20, color: "var(--brand-text-primary)" }}>Frequently Asked Questions</h2>
            {faqItems.map((item, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: "var(--brand-text-primary)", marginBottom: 6 }}>{item.question}</h4>
                <p style={{ fontSize: 15, color: "var(--brand-text-secondary)", lineHeight: 1.6 }}>{item.answer}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 28 }}>
            {tags.map(tag => (
              <a key={tag} href={"/tag/" + encodeURIComponent(tag)} style={{ padding: "4px 12px", borderRadius: 20, background: "var(--brand-surface)", color: "var(--brand-text-secondary)", fontSize: 13, textDecoration: "none", border: "1px solid var(--brand-border)" }}>{tag}</a>
            ))}
          </div>
        )}

        {/* Author/publication bio */}
        <div style={{ marginTop: 40, padding: 24, background: "var(--brand-surface)", borderRadius: 12, border: "1px solid var(--brand-border)" }}>
          {licenseSettings.brand_logo_url && <img src={licenseSettings.brand_logo_url} alt="" style={{ maxHeight: 36, marginBottom: 8 }} />}
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-text-primary)", marginBottom: 4 }}>{licenseSettings.brand_site_name || "Publication"}</p>
          <p style={{ fontSize: 13, color: "var(--brand-text-secondary)", lineHeight: 1.5 }}>{licenseSettings.brand_site_description || licenseSettings.brand_tagline || ""}</p>
        </div>

        {/* You might also like */}
        {related.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 22, marginBottom: 20, color: "var(--brand-text-primary)" }}>You Might Also Like</h2>
            <div className="mag-related" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {related.map(a => <ArticleCard key={a.id} article={a} size="medium" categories={categories} showImage showExcerpt />)}
            </div>
          </div>
        )}
      </article>

      <NewsletterBar licenseSettings={licenseSettings} />
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />

      <style>{`
        .mag-article-body p { margin-bottom: 1.3em; }
        .mag-article-body h2, .mag-article-body h3 { font-family: var(--brand-font-heading); margin: 1.5em 0 0.5em; }
        .mag-article-body a { color: var(--brand-link); text-decoration: underline; }
        .mag-article-body img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
        .mag-article-body blockquote { border-left: 3px solid var(--brand-primary); padding: 12px 20px; margin: 1.5em 0; background: var(--brand-surface); font-style: italic; }
        @media (max-width: 768px) { .mag-related { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
