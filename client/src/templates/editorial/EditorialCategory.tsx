import React from "react";
import type { TemplateProps } from "../shared/types";
import { AdZone, NewsletterBar, PublicationFooter, ArticleCard } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";



export function EditorialCategory({ licenseSettings, articles, categories, currentCategory, mostRead }: TemplateProps) {
  const cat = currentCategory;

  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      
      

      {/* Category Hero */}
      <section style={{ background: "var(--brand-surface)", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <h1 style={{
            fontFamily: "var(--brand-font-heading, Georgia, serif)",
            fontSize: 36, fontWeight: 700, color: "var(--brand-primary)", marginBottom: 8,
          }}>
            {cat?.name || "Category"}
          </h1>
          {cat?.description && (
            <p style={{ fontSize: 16, color: "var(--brand-text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
              {cat.description}
            </p>
          )}
          <span style={{ fontSize: 14, color: "var(--brand-text-secondary)" }}>
            {articles.length} article{articles.length !== 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {/* Main content */}
      <div className="cat-layout" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 48px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 40 }}>
        <div>
          <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {articles.map(a => (
              <ArticleCard key={a.id} article={a} size="medium" categories={categories} showImage showExcerpt />
            ))}
          </div>
          {articles.length === 0 && (
            <p style={{ textAlign: "center", padding: "40px 0", color: "var(--brand-text-secondary)", fontSize: 15 }}>
              No articles in this category yet.
            </p>
          )}
        </div>

        {/* Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "var(--brand-surface)", padding: 20, borderRadius: 8, border: "1px solid var(--brand-border)" }}>
            <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--brand-text-primary)" }}>Newsletter</h3>
            <p style={{ fontSize: 13, color: "var(--brand-text-secondary)", marginBottom: 12 }}>Stay updated with the latest.</p>
            <a href="#newsletter" style={{ display: "block", textAlign: "center", padding: "8px 16px", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Subscribe</a>
          </div>
          <AdZone placement="sidebar" licenseSettings={licenseSettings} />
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
        @media (max-width: 1024px) {
          .cat-layout { grid-template-columns: 1fr !important; }
          .cat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .cat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
