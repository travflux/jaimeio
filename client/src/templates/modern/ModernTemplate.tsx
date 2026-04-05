import React from "react";
import type { TemplateProps, Article, Category } from "../shared/types";
import { NewsletterBar, PublicationFooter } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";
import { EditorialArticle } from "../editorial/EditorialArticle";
import { EditorialCategory } from "../editorial/EditorialCategory";
import { EditorialCategories } from "../editorial/EditorialCategories";
import { EditorialDiscover } from "../editorial/EditorialDiscover";
import { EditorialStaticPage } from "../editorial/EditorialStaticPage";

function getCatName(a: Article, cats: Category[]): string | null {
  const c = cats.find(c => c.id === a.categoryId);
  return c?.name || null;
}

function ModernHome({ licenseSettings, articles, categories }: TemplateProps) {
  const featured = articles[0];
  const grid = articles.slice(1, 7);
  const more = articles.slice(7, 13);

  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />

      {/* Hero */}
      {featured && (
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 24px" }}>
          <a href={"/article/" + featured.slug} style={{ textDecoration: "none", color: "inherit", display: "block", position: "relative", borderRadius: 16, overflow: "hidden", background: "#f3f4f6" }}>
            {featured.featuredImage ? (
              <img src={featured.featuredImage} alt="" style={{ width: "100%", height: 420, objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />
            ) : (
              <div style={{ width: "100%", height: 420, background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)" }} />
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 32 }}>
              {getCatName(featured, categories) && <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.8)", marginBottom: 8, display: "block" }}>{getCatName(featured, categories)}</span>}
              <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, maxWidth: 800, margin: 0 }}>{featured.headline}</h1>
              {featured.subheadline && <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 18, marginTop: 8, maxWidth: 640, lineHeight: 1.4 }}>{featured.subheadline}</p>}
            </div>
          </a>
        </section>
      )}

      {/* Article Cards */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "8px 24px 48px" }}>
        <div className="modern-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[...grid, ...more].map(a => (
            <a key={a.id} href={"/article/" + a.slug} style={{ textDecoration: "none", color: "inherit", background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)")}>
              <div style={{ aspectRatio: "16/10", background: "#f3f4f6", overflow: "hidden" }}>
                {a.featuredImage && <img src={a.featuredImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }} onError={e => (e.currentTarget.style.display = "none")} />}
              </div>
              <div style={{ padding: 20 }}>
                {getCatName(a, categories) && <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand-primary)", marginBottom: 6, display: "block" }}>{getCatName(a, categories)}</span>}
                <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 17, fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.35, margin: "0 0 8px" }}>{a.headline}</h3>
                {a.subheadline && <p style={{ fontSize: 14, color: "var(--brand-text-secondary)", lineHeight: 1.5, margin: 0 }}>{a.subheadline.substring(0, 100)}{a.subheadline.length > 100 ? "..." : ""}</p>}
                <p style={{ fontSize: 12, color: "var(--brand-text-secondary)", opacity: 0.6, marginTop: 12 }}>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
              </div>
            </a>
          ))}
        </div>
        {articles.length === 0 && (<div style={{ textAlign: "center", padding: "80px 24px" }}><h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 22, fontWeight: 600, color: "var(--brand-text-secondary)", marginBottom: 8 }}>Content coming soon</h2><p style={{ fontSize: 14, color: "var(--brand-text-secondary)", opacity: 0.6 }}>{licenseSettings.brand_site_name || "This publication"} is setting up. Check back shortly.</p></div>)}

        {/* Explore Topics */}
        {categories.length > 0 && (
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #f3f4f6" }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--brand-text-secondary)", opacity: 0.6, marginBottom: 16 }}>Explore Topics</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {categories.map(cat => (
                <a key={cat.id} href={"/category/" + cat.slug} style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #e5e7eb", fontSize: 13, color: "var(--brand-text-primary)", textDecoration: "none", transition: "border-color 0.15s, color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand-primary)"; e.currentTarget.style.color = "var(--brand-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "var(--brand-text-primary)"; }}>
                  {cat.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      <NewsletterBar licenseSettings={licenseSettings} />
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />

      <style>{`
        @media (max-width: 1024px) { .modern-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .modern-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}

export function ModernTemplate(props: TemplateProps) {
  const { page } = props;
  return (
    <div style={{ fontFamily: "var(--brand-font-body)", color: "var(--brand-text-primary)", background: "#fff", minHeight: "100vh" }}>
      {page === "home" && <ModernHome {...props} />}
      {page === "article" && <EditorialArticle {...props} />}
      {page === "category" && <EditorialCategory {...props} />}
      {page === "categories" && <EditorialCategories {...props} />}
      {page === "latest" && <EditorialDiscover variant="latest" {...props} />}
      {page === "most-read" && <EditorialDiscover variant="most-read" {...props} />}
      {page === "trending" && <EditorialDiscover variant="trending" {...props} />}
      {page === "editors-picks" && <EditorialDiscover variant="editors-picks" {...props} />}
      {(page === "advertise" || page === "privacy" || page === "contact" || page === "sitemap" || page === "about") && <EditorialStaticPage {...props} />}
      {page === "search" && <ModernHome {...props} />}
    </div>
  );
}
