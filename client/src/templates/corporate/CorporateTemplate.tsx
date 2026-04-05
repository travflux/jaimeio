import React from "react";
import type { TemplateProps, Article, Category } from "../shared/types";
import { NewsletterBar, PublicationFooter, AdZone, ArticleCard } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";
import { EditorialArticle } from "../editorial/EditorialArticle";
import { EditorialCategories } from "../editorial/EditorialCategories";
import { EditorialDiscover } from "../editorial/EditorialDiscover";
import { EditorialStaticPage } from "../editorial/EditorialStaticPage";

function getCatName(a: Article, cats: Category[]): string | null {
  return cats.find(c => c.id === a.categoryId)?.name || null;
}

function CorporateHome({ licenseSettings, articles, categories, mostRead }: TemplateProps) {
  const lead = articles[0];
  const topStories = articles.slice(1, 5);
  const gridArticles = articles.slice(5, 14);
  const mostReadList = mostRead || [];

  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 48px" }}>
        {/* Lead Story + Top Stories */}
        <div className="corp-hero" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 40 }}>
          {/* Lead Story */}
          {lead && (
            <a href={"/article/" + lead.slug} style={{ textDecoration: "none", color: "inherit", display: "block", background: "var(--brand-surface)", borderRadius: 8, overflow: "hidden", border: "1px solid var(--brand-border)", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--brand-border)")}>
              {lead.featuredImage && (
                <div style={{ overflow: "hidden" }}>
                  <img src={lead.featuredImage} alt="" style={{ width: "100%", height: 340, objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              <div style={{ padding: 24 }}>
                {getCatName(lead, categories) && <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--brand-primary)", marginBottom: 8, display: "block" }}>{getCatName(lead, categories)}</span>}
                <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 26, fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.25, margin: "0 0 12px" }}>{lead.headline}</h1>
                {lead.subheadline && <p style={{ fontSize: 15, color: "var(--brand-text-secondary)", lineHeight: 1.5 }}>{lead.subheadline}</p>}
              </div>
            </a>
          )}

          {/* Top Stories sidebar */}
          <div style={{ background: "var(--brand-surface)", borderRadius: 8, border: "1px solid var(--brand-border)", padding: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--brand-text-secondary)", opacity: 0.6, borderBottom: "1px solid var(--brand-border)", paddingBottom: 12, marginBottom: 16 }}>Top Stories</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {topStories.map((a, i) => (
                <a key={a.id} href={"/article/" + a.slug} style={{ display: "flex", gap: 12, alignItems: "flex-start", textDecoration: "none", color: "inherit" }}>
                  <span style={{ fontFamily: "var(--brand-font-heading)", fontSize: 28, fontWeight: 700, color: "var(--brand-border)", lineHeight: 1, minWidth: 28, flexShrink: 0 }}>{i + 1}</span>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-text-primary)", lineHeight: 1.35, margin: 0 }}>{a.headline}</h3>
                    {getCatName(a, categories) && <span style={{ fontSize: 11, color: "var(--brand-text-secondary)", opacity: 0.7, marginTop: 4, display: "block" }}>{getCatName(a, categories)}</span>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Latest Coverage heading */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--brand-text-secondary)", opacity: 0.6, borderBottom: "1px solid var(--brand-border)", paddingBottom: 12, marginBottom: 24 }}>Latest Coverage</div>

        {/* Main grid + sidebar */}
        <div className="corp-layout" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32 }}>
          <div className="corp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {gridArticles.map(a => (
              <a key={a.id} href={"/article/" + a.slug} style={{ textDecoration: "none", color: "inherit", background: "var(--brand-surface)", borderRadius: 8, overflow: "hidden", border: "1px solid var(--brand-border)", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--brand-border)")}>
                {a.featuredImage && <img src={a.featuredImage} alt="" style={{ width: "100%", height: 160, objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />}
                <div style={{ padding: 16 }}>
                  {getCatName(a, categories) && <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand-primary)", marginBottom: 4, display: "block" }}>{getCatName(a, categories)}</span>}
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-text-primary)", lineHeight: 1.35, margin: "0 0 6px" }}>{a.headline}</h3>
                  <p style={{ fontSize: 11, color: "var(--brand-text-secondary)", opacity: 0.6 }}>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Sidebar */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "var(--brand-surface)", padding: 20, borderRadius: 8, border: "1px solid var(--brand-border)" }}>
              <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 15, fontWeight: 700, marginBottom: 12, color: "var(--brand-text-primary)" }}>Newsletter</h3>
              <p style={{ fontSize: 13, color: "var(--brand-text-secondary)", marginBottom: 12 }}>Industry insights delivered weekly.</p>
              <a href="#newsletter" style={{ display: "block", textAlign: "center", padding: "8px 16px", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Subscribe</a>
            </div>
            {mostReadList.length > 0 && (
              <div style={{ background: "var(--brand-surface)", padding: 20, borderRadius: 8, border: "1px solid var(--brand-border)" }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--brand-text-secondary)", opacity: 0.6, marginBottom: 12 }}>Most Read</h3>
                {mostReadList.slice(0, 5).map((a, i) => (
                  <div key={a.id}>
                    {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--brand-border)", margin: "8px 0" }} />}
                    <a href={"/article/" + a.slug} style={{ display: "flex", gap: 10, textDecoration: "none", color: "inherit", padding: "4px 0" }}>
                      <span style={{ fontFamily: "var(--brand-font-heading)", fontSize: 22, fontWeight: 700, color: "var(--brand-primary)", minWidth: 22, lineHeight: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--brand-text-primary)", lineHeight: 1.35 }}>{a.headline}</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
            <AdZone placement="sidebar" licenseSettings={licenseSettings} />
          </aside>
        </div>
        {articles.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 22, fontWeight: 600, color: "var(--brand-text-secondary)", marginBottom: 8 }}>Content coming soon</h2>
            <p style={{ fontSize: 14, color: "var(--brand-text-secondary)", opacity: 0.6 }}>{licenseSettings.brand_site_name || "This publication"} is setting up. Check back shortly.</p>
          </div>
        )}
      </div>

      <div id="newsletter"><NewsletterBar licenseSettings={licenseSettings} /></div>
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />

      <style>{`
        @media (max-width: 1024px) {
          .corp-hero { grid-template-columns: 1fr !important; }
          .corp-layout { grid-template-columns: 1fr !important; }
          .corp-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) { .corp-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}

function CorporateCategory({ licenseSettings, articles, categories, currentCategory, mostRead }: TemplateProps) {
  const cat = currentCategory;
  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 48px" }}>
        <div style={{ borderBottom: "2px solid var(--brand-primary)", paddingBottom: 16, marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--brand-text-secondary)", opacity: 0.6 }}>Category</span>
          <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 32, fontWeight: 700, color: "var(--brand-text-primary)", margin: "4px 0 0" }}>{cat?.name || "Articles"}</h1>
          {cat?.description && <p style={{ fontSize: 15, color: "var(--brand-text-secondary)", marginTop: 8, lineHeight: 1.5 }}>{cat.description}</p>}
        </div>
        <div className="corp-cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {articles.map(a => (
            <a key={a.id} href={"/article/" + a.slug} style={{ textDecoration: "none", color: "inherit", background: "var(--brand-surface)", borderRadius: 8, overflow: "hidden", border: "1px solid var(--brand-border)" }}>
              {a.featuredImage && <img src={a.featuredImage} alt="" style={{ width: "100%", height: 180, objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />}
              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--brand-text-primary)", lineHeight: 1.35, margin: "0 0 6px" }}>{a.headline}</h3>
                {a.subheadline && <p style={{ fontSize: 13, color: "var(--brand-text-secondary)", lineHeight: 1.4, margin: 0 }}>{a.subheadline.substring(0, 100)}</p>}
              </div>
            </a>
          ))}
        </div>
        {articles.length === 0 && <p style={{ textAlign: "center", padding: 40, color: "var(--brand-text-secondary)" }}>No articles in this category yet.</p>}
      </div>
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />
      <style>{`
        @media (max-width: 1024px) { .corp-cat-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .corp-cat-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}

export function CorporateTemplate(props: TemplateProps) {
  const { page } = props;
  return (
    <div style={{ fontFamily: "var(--brand-font-body)", color: "var(--brand-text-primary)", background: "var(--brand-background)", minHeight: "100vh" }}>
      {page === "home" && <CorporateHome {...props} />}
      {page === "article" && <EditorialArticle {...props} />}
      {page === "category" && <CorporateCategory {...props} />}
      {page === "categories" && <EditorialCategories {...props} />}
      {page === "latest" && <EditorialDiscover variant="latest" {...props} />}
      {page === "most-read" && <EditorialDiscover variant="most-read" {...props} />}
      {page === "trending" && <EditorialDiscover variant="trending" {...props} />}
      {page === "editors-picks" && <EditorialDiscover variant="editors-picks" {...props} />}
      {(page === "advertise" || page === "privacy" || page === "contact" || page === "sitemap" || page === "about") && <EditorialStaticPage {...props} />}
      {page === "search" && <CorporateHome {...props} />}
    </div>
  );
}
