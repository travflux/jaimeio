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
  return cats.find(c => c.id === a.categoryId)?.name || null;
}

function CreativeHome({ licenseSettings, articles, categories }: TemplateProps) {
  const featured = articles[0];
  const recent = articles.slice(1, 7);
  const siteName = licenseSettings.brand_site_name || "Publication";
  const tagline = licenseSettings.brand_tagline || "";
  const logoUrl = licenseSettings.brand_logo_light_url || licenseSettings.brand_logo_url;

  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
        {/* Author Header */}
        <div style={{ textAlign: "center", padding: "48px 0 40px", borderBottom: "1px solid var(--brand-border)" }}>
          {logoUrl ? (
            <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", margin: "0 auto 12px", border: "2px solid var(--brand-primary)" }}>
              <img src={logoUrl} alt={siteName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />
            </div>
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 12px", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{siteName.charAt(0)}</span>
            </div>
          )}
          <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 24, fontWeight: 700, color: "var(--brand-text-primary)" }}>{siteName}</h1>
          {tagline && <p style={{ color: "var(--brand-text-secondary)", marginTop: 6, fontSize: 15 }}>{tagline}</p>}
        </div>

        {/* Featured Essay */}
        {featured && (
          <div style={{ padding: "40px 0", borderBottom: "1px solid var(--brand-border)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--brand-primary)", marginBottom: 10, display: "block" }}>Latest Essay</span>
            <a href={"/article/" + featured.slug} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.2, margin: "0 0 12px" }}>{featured.headline}</h2>
              {featured.subheadline && <p style={{ fontSize: 18, color: "var(--brand-text-secondary)", lineHeight: 1.5, margin: "0 0 12px" }}>{featured.subheadline}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--brand-text-secondary)", opacity: 0.6 }}>
                <span>{featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</span>
                <span>·</span>
                <span style={{ color: "var(--brand-primary)", fontWeight: 500 }}>Read essay →</span>
              </div>
            </a>
          </div>
        )}

        {/* Recent Writing — 2 column */}
        {recent.length > 0 && (
          <div style={{ padding: "40px 0" }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--brand-text-secondary)", opacity: 0.6, marginBottom: 24 }}>Recent Writing</h2>
            <div className="creative-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              {recent.map(a => (
                <a key={a.id} href={"/article/" + a.slug} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  {getCatName(a, categories) && <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--brand-primary)", marginBottom: 6, display: "block" }}>{getCatName(a, categories)}</span>}
                  <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 17, fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.3, margin: "0 0 6px" }}>{a.headline}</h3>
                  {a.subheadline && <p style={{ fontSize: 13, color: "var(--brand-text-secondary)", lineHeight: 1.5, margin: 0 }}>{a.subheadline.substring(0, 100)}</p>}
                  <span style={{ fontSize: 12, color: "var(--brand-text-secondary)", opacity: 0.5, marginTop: 6, display: "block" }}>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {articles.length === 0 && (<div style={{ textAlign: "center", padding: "80px 24px" }}><h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 22, fontWeight: 600, color: "var(--brand-text-secondary)", marginBottom: 8 }}>Content coming soon</h2><p style={{ fontSize: 14, color: "var(--brand-text-secondary)", opacity: 0.6 }}>{siteName} is setting up. Check back shortly.</p></div>)}
      </div>

      <NewsletterBar licenseSettings={licenseSettings} />
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />

      <style>{`
        @media (max-width: 640px) { .creative-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}

export function CreativeTemplate(props: TemplateProps) {
  const { page } = props;
  return (
    <div style={{ fontFamily: "var(--brand-font-body)", color: "var(--brand-text-primary)", background: "#fff", minHeight: "100vh" }}>
      {page === "home" && <CreativeHome {...props} />}
      {page === "article" && <EditorialArticle {...props} />}
      {page === "category" && <EditorialCategory {...props} />}
      {page === "categories" && <EditorialCategories {...props} />}
      {page === "latest" && <EditorialDiscover variant="latest" {...props} />}
      {page === "most-read" && <EditorialDiscover variant="most-read" {...props} />}
      {page === "trending" && <EditorialDiscover variant="trending" {...props} />}
      {page === "editors-picks" && <EditorialDiscover variant="editors-picks" {...props} />}
      {(page === "advertise" || page === "privacy" || page === "contact" || page === "sitemap" || page === "about") && <EditorialStaticPage {...props} />}
      {page === "search" && <CreativeHome {...props} />}
    </div>
  );
}
