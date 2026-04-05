import React from "react";
import type { TemplateProps } from "../shared/types";
import { AdZone, NewsletterBar, PublicationFooter, ArticleCard } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";
import { EditorialArticle } from "../editorial/EditorialArticle";
import { EditorialCategory } from "../editorial/EditorialCategory";
import { EditorialCategories } from "../editorial/EditorialCategories";
import { EditorialDiscover } from "../editorial/EditorialDiscover";
import { EditorialStaticPage } from "../editorial/EditorialStaticPage";

function ModernHome({ licenseSettings, articles, categories, mostRead }: TemplateProps) {
  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div className="modern-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {articles.slice(0, 18).map(a => (
            <a key={a.id} href={"/article/" + a.slug} style={{ textDecoration: "none", color: "inherit", background: "var(--brand-surface)", borderRadius: 12, overflow: "hidden", border: "1px solid var(--brand-border)", transition: "box-shadow 0.2s" }}>
              {a.featuredImage && <img src={a.featuredImage} alt="" style={{ width: "100%", height: 200, objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />}
              <div style={{ padding: 20 }}>
                {(() => { const cat = categories.find(c => c.id === a.categoryId); return cat ? <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--brand-primary)", fontWeight: 600, letterSpacing: "0.05em" }}>{cat.name}</span> : null; })()}
                <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 18, fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.3, margin: "6px 0 8px" }}>{a.headline}</h3>
                {a.subheadline && <p style={{ fontSize: 14, color: "var(--brand-text-secondary)", lineHeight: 1.5, margin: 0 }}>{a.subheadline.substring(0, 120)}</p>}
                <p style={{ fontSize: 12, color: "var(--brand-text-secondary)", opacity: 0.7, marginTop: 10 }}>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</p>
              </div>
            </a>
          ))}
        </div>
        {articles.length === 0 && <p style={{ textAlign: "center", padding: 60, color: "var(--brand-text-secondary)" }}>No articles published yet.</p>}
      </div>
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
    <div style={{ fontFamily: "var(--brand-font-body)", color: "var(--brand-text-primary)", background: "var(--brand-background)", minHeight: "100vh" }}>
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
