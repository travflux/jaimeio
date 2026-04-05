import React from "react";
import type { TemplateProps } from "../shared/types";
import { NewsletterBar, PublicationFooter, ArticleCard } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";

export function MagazineCategory({ licenseSettings, articles, categories, currentCategory }: TemplateProps) {
  const cat = currentCategory;

  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />

      {/* Full-bleed category hero */}
      <section style={{ background: cat?.color || "var(--brand-primary)", padding: "56px 24px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, color: "#fff", marginBottom: 8 }}>
          {cat?.name || "Category"}
        </h1>
        {cat?.description && (
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.85)", maxWidth: 600, margin: "0 auto", lineHeight: 1.5 }}>{cat.description}</p>
        )}
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 12 }}>
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </p>
      </section>

      {/* Articles grid — no sidebar */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 60px" }}>
        {articles.length === 0 ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "var(--brand-text-secondary)", fontSize: 15 }}>No articles in this category yet.</p>
        ) : (
          <div className="mag-cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {articles.map(a => (
              <ArticleCard key={a.id} article={a} size="medium" categories={categories} showImage showExcerpt />
            ))}
          </div>
        )}
      </div>

      <NewsletterBar licenseSettings={licenseSettings} />
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />

      <style>{`
        @media (max-width: 1024px) { .mag-cat-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .mag-cat-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
