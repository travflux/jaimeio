import React from "react";
import type { TemplateProps } from "../shared/types";
import { AdZone, NewsletterBar, PublicationFooter, ArticleCard } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";

function ShareButtons({ headline, slug }: { headline: string; slug: string }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/article/${slug}` : "";
  const text = encodeURIComponent(headline);
  const encodedUrl = encodeURIComponent(url);

  const btnStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
    borderRadius: 6, border: "1px solid var(--brand-border)", background: "var(--brand-background)",
    color: "var(--brand-text-secondary)", fontSize: 13, textDecoration: "none", cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <a href={`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" style={btnStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        Share
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" style={btnStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
        Share
      </a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" style={btnStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
        Share
      </a>
      <button onClick={() => { navigator.clipboard.writeText(url); }} style={{ ...btnStyle, border: "1px solid var(--brand-border)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
        Copy
      </button>
    </div>
  );
}



function stripHtml(str: string): string {
  return (str || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadTime(body: string): number {
  const words = stripHtml(body).split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 230));
}

export function EditorialArticle({ licenseSettings, categories, currentArticle, articles, mostRead }: TemplateProps) {
  if (!currentArticle) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 28, color: "var(--brand-text-primary)" }}>Article not found</h1>
        <p style={{ color: "var(--brand-text-secondary)", marginTop: 8 }}>The article you're looking for doesn't exist.</p>
        <a href="/" style={{ color: "var(--brand-link)", marginTop: 16, display: "inline-block" }}>← Back to home</a>
      </div>
    );
  }

  const article = currentArticle;
  const cat = categories.find(c => c.id === article.categoryId);
  const pubDate = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
  const readTime = estimateReadTime(article.body);

  // Parse FAQ
  let faqItems: Array<{ question: string; answer: string }> = [];
  if (article.geoFaq) {
    try {
      const parsed = JSON.parse(article.geoFaq);
      if (Array.isArray(parsed)) faqItems = parsed;
    } catch { /* ignore */ }
  }

  // Related articles: same category, excluding current
  const related = articles
    .filter(a => a.id !== article.id && a.categoryId === article.categoryId)
    .slice(0, 3);
  const relatedFallback = related.length >= 3 ? related : [
    ...related,
    ...articles.filter(a => a.id !== article.id && !related.some(r => r.id === a.id)).slice(0, 3 - related.length)
  ];

  // Parse tags
  let tags: string[] = [];
  if (article.tags) {
    try {
      const parsed = JSON.parse(article.tags);
      if (Array.isArray(parsed)) tags = parsed;
    } catch {
      tags = article.tags.split(",").map(t => t.trim()).filter(Boolean);
    }
  }

  // Insert ad after 3rd paragraph
  function renderBodyWithAd(html: string): React.ReactNode {
    const paragraphs = html.split(/<\/p>/i);
    if (paragraphs.length <= 3) {
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }
    const before = paragraphs.slice(0, 3).join("</p>") + "</p>";
    const after = paragraphs.slice(3).join("</p>");
    return (
      <>
        <div dangerouslySetInnerHTML={{ __html: before }} />
        <AdZone placement="article" licenseSettings={licenseSettings} className="my-6" />
        <div dangerouslySetInnerHTML={{ __html: after }} />
      </>
    );
  }

  return (
    <>
      <AdZone placement="header" licenseSettings={licenseSettings} />
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      
      

      {/* Article Header */}
      <header style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 0" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: "var(--brand-text-secondary)", marginBottom: 16 }}>
          <a href="/" style={{ color: "var(--brand-link)", textDecoration: "none" }}>Home</a>
          {cat && <> &rsaquo; <a href={`/category/${cat.slug}`} style={{ color: "var(--brand-link)", textDecoration: "none" }}>{cat.name}</a></>}
          <span style={{ opacity: 0.6 }}> &rsaquo; {article.headline.length > 50 ? article.headline.slice(0, 50) + "..." : article.headline}</span>
        </nav>

        {cat && (
          <span style={{
            display: "inline-block", background: cat.color || "var(--brand-primary)", color: "#fff",
            fontSize: 11, textTransform: "uppercase", borderRadius: 4, padding: "2px 8px", marginBottom: 12, fontWeight: 600,
          }}>{cat.name}</span>
        )}

        <h1 style={{
          fontFamily: "var(--brand-font-heading, Georgia, serif)",
          fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700,
          color: "var(--brand-text-primary)", lineHeight: 1.2, marginBottom: 12,
        }}>
          {article.headline}
        </h1>

        {article.subheadline && (
          <p style={{ fontSize: 20, color: "var(--brand-text-secondary)", lineHeight: 1.4, marginBottom: 16 }}>
            {article.subheadline}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14, color: "var(--brand-text-secondary)", marginBottom: 16, flexWrap: "wrap" }}>
          <span>{pubDate}</span>
          <span>·</span>
          <span>{readTime} min read</span>
        </div>

        <ShareButtons headline={article.headline} slug={article.slug} />
      </header>

      {/* Featured Image */}
      {article.featuredImage && (
        <div style={{ maxWidth: 1280, margin: "24px auto 0", padding: "0 24px" }}>
          <img src={article.featuredImage} alt={article.altText || article.headline || ""} style={{
            width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8,
          }} />
        </div>
      )}

      {/* Two-column layout */}
      <div className="article-layout" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 48px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 40 }}>
        <article>
          {/* GEO Key Takeaways */}
          {article.geoSummary && (() => {
            let items: string[] = [];
            try { const p = JSON.parse(article.geoSummary); if (Array.isArray(p)) items = p; } catch { if (article.geoSummary) items = [article.geoSummary]; }
            if (items.length === 0) return null;
            return (
              <div style={{ background: "var(--brand-surface)", borderLeft: "3px solid var(--brand-primary)", padding: 16, marginBottom: 24, borderRadius: 4 }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--brand-primary)", fontWeight: 700, display: "block", marginBottom: 8 }}>Key Takeaways</span>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {items.map((item: string, i: number) => (
                    <li key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 15, color: "var(--brand-text-primary)", lineHeight: 1.6 }}>
                      <span style={{ color: "var(--brand-primary)", marginTop: 2, flexShrink: 0 }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Article Body */}
          <div className="article-body" style={{
            fontSize: 18, lineHeight: 1.8, color: "var(--brand-text-primary)",
            fontFamily: "var(--brand-font-body, -apple-system, sans-serif)",
            maxWidth: 680,
          }}>
            {renderBodyWithAd(article.body)}
          </div>

          {/* GEO FAQ */}
          {faqItems.length > 0 && (
            <div style={{ marginTop: 40, paddingTop: 32, borderTop: "1px solid var(--brand-border)" }}>
              <h2 style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: 22, marginBottom: 24, color: "var(--brand-text-primary)" }}>Frequently Asked Questions</h2>
              {faqItems.map((item, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--brand-border)", margin: "20px 0" }} />}
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: "var(--brand-text-primary)", marginBottom: 8 }}>{item.question}</h4>
                  <p style={{ fontSize: 15, color: "var(--brand-text-secondary)", lineHeight: 1.6 }}>{item.answer}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 32 }}>
              {tags.map(tag => (
                <a key={tag} href={`/tag/${encodeURIComponent(tag)}`} style={{
                  padding: "4px 12px", borderRadius: 20, background: "var(--brand-surface)",
                  color: "var(--brand-text-secondary)", fontSize: 13, textDecoration: "none",
                  border: "1px solid var(--brand-border)",
                }}>{tag}</a>
              ))}
            </div>
          )}

          {/* Source Attribution */}
          {(article.sourceUrl || article.sourceName) && (
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--brand-border)" }}>
              <p style={{ fontSize: 12, color: "var(--brand-text-secondary)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 500 }}>Source:</span>
                {article.sourceUrl ? (
                  <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "var(--brand-link)", textDecoration: "none" }}>
                    {article.sourceName || "View original"}
                  </a>
                ) : <span>{article.sourceName}</span>}
                <span style={{ color: "var(--brand-text-secondary)", opacity: 0.5 }}>
                  — Written by {licenseSettings.brand_site_name || "our editorial team"} based on publicly available information.
                </span>
              </p>
            </div>
          )}

          {/* Share again */}
          <div style={{ marginTop: 32 }}>
            <ShareButtons headline={article.headline} slug={article.slug} />
          </div>

          {/* Related Articles */}
          {relatedFallback.length > 0 && (
            <div style={{ marginTop: 40, paddingTop: 32, borderTop: "1px solid var(--brand-border)" }}>
              <h2 style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: 20, marginBottom: 20, color: "var(--brand-text-primary)" }}>Related Articles</h2>
              <div className="related-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {relatedFallback.slice(0, 3).map(a => (
                  <ArticleCard key={a.id} article={a} size="medium" categories={categories} showImage showExcerpt />
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 24, alignSelf: "start", display: "flex", flexDirection: "column", gap: 24 }}>
          <AdZone placement="sidebar" licenseSettings={licenseSettings} />
          <div style={{ background: "var(--brand-surface)", padding: 20, borderRadius: 8, border: "1px solid var(--brand-border)" }}>
            <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--brand-text-primary)" }}>Newsletter</h3>
            <p style={{ fontSize: 13, color: "var(--brand-text-secondary)", marginBottom: 12 }}>Stay updated with the latest.</p>
            <a href="#newsletter" style={{ display: "block", textAlign: "center", padding: "8px 16px", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Subscribe</a>
          </div>
          {/* Most Read */}
          {(mostRead || []).length > 0 && (
            <div>
              <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--brand-text-primary)" }}>Most Read</h3>
              {(mostRead || []).slice(0, 5).map((a, i) => (
                <div key={a.id}>
                  {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--brand-border)", margin: "8px 0" }} />}
                  <ArticleCard article={a} size="mini" categories={categories} />
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <div id="newsletter">
        <NewsletterBar licenseSettings={licenseSettings} />
      </div>
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />

      <style>{`
        .article-body p { margin-bottom: 1.2em; }
        .article-body h2, .article-body h3 { font-family: var(--brand-font-heading, Georgia, serif); margin: 1.5em 0 0.5em; color: var(--brand-text-primary); }
        .article-body h2 { font-size: 1.5em; }
        .article-body h3 { font-size: 1.25em; }
        .article-body a { color: var(--brand-link); text-decoration: underline; }
        .article-body img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
        .article-body blockquote { border-left: 3px solid var(--brand-primary); padding: 12px 20px; margin: 1.5em 0; background: var(--brand-surface); border-radius: 0 4px 4px 0; font-style: italic; }
        .article-body ul, .article-body ol { padding-left: 1.5em; margin-bottom: 1.2em; }
        .article-body li { margin-bottom: 0.3em; }
        @media (max-width: 1024px) {
          .article-layout { grid-template-columns: 1fr !important; }
          .related-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .related-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
