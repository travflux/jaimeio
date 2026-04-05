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

function MinimalHome({ licenseSettings, articles, categories }: TemplateProps) {
  const featured = articles[0];
  const list = articles.slice(1, 20);

  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 60px" }}>
        {/* Featured */}
        {featured && (
          <div style={{ marginBottom: 48, paddingBottom: 48, borderBottom: "1px solid var(--brand-border)" }}>
            {getCatName(featured, categories) && <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--brand-primary)", marginBottom: 10, display: "block" }}>{getCatName(featured, categories)}</span>}
            <a href={"/article/" + featured.slug} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <h1 style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.15, margin: "0 0 12px" }}>{featured.headline}</h1>
              {featured.subheadline && <p style={{ fontSize: 20, color: "var(--brand-text-secondary)", lineHeight: 1.5, margin: "0 0 12px" }}>{featured.subheadline}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "var(--brand-text-secondary)", opacity: 0.6 }}>
                <span>{featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</span>
                <span style={{ color: "var(--brand-primary)", fontWeight: 500 }}>Read →</span>
              </div>
            </a>
          </div>
        )}

        {/* Article List */}
        {list.map(a => (
          <a key={a.id} href={"/article/" + a.slug} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ flex: 1 }}>
              {getCatName(a, categories) && <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--brand-primary)", marginBottom: 4, display: "block" }}>{getCatName(a, categories)}</span>}
              <h2 style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: 18, fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.3, margin: "0 0 4px" }}>{a.headline}</h2>
              {a.subheadline && <p style={{ fontSize: 14, color: "var(--brand-text-secondary)", lineHeight: 1.5, margin: 0 }}>{a.subheadline.substring(0, 120)}</p>}
              <span style={{ fontSize: 12, color: "var(--brand-text-secondary)", opacity: 0.5, marginTop: 6, display: "block" }}>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
            </div>
            {a.featuredImage && (
              <div style={{ width: 88, height: 88, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "#f3f4f6" }}>
                <img src={a.featuredImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </a>
        ))}

        {articles.length === 0 && (<div style={{ textAlign: "center", padding: "80px 24px" }}><h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 22, fontWeight: 600, color: "var(--brand-text-secondary)", marginBottom: 8 }}>Content coming soon</h2><p style={{ fontSize: 14, color: "var(--brand-text-secondary)", opacity: 0.6 }}>{licenseSettings.brand_site_name || "This publication"} is setting up. Check back shortly.</p></div>)}
      </div>
      <NewsletterBar licenseSettings={licenseSettings} />
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />
    </>
  );
}

export function MinimalTemplate(props: TemplateProps) {
  const { page } = props;
  return (
    <div style={{ fontFamily: "var(--brand-font-body)", color: "var(--brand-text-primary)", background: "#FAFAF8", minHeight: "100vh" }}>
      {page === "home" && <MinimalHome {...props} />}
      {page === "article" && <EditorialArticle {...props} />}
      {page === "category" && <EditorialCategory {...props} />}
      {page === "categories" && <EditorialCategories {...props} />}
      {page === "latest" && <EditorialDiscover variant="latest" {...props} />}
      {page === "most-read" && <EditorialDiscover variant="most-read" {...props} />}
      {page === "trending" && <EditorialDiscover variant="trending" {...props} />}
      {page === "editors-picks" && <EditorialDiscover variant="editors-picks" {...props} />}
      {(page === "advertise" || page === "privacy" || page === "contact" || page === "sitemap" || page === "about") && <EditorialStaticPage {...props} />}
      {page === "search" && <MinimalHome {...props} />}
    </div>
  );
}
