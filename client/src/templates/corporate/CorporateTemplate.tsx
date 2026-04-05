import React from "react";
import type { TemplateProps } from "../shared/types";
import { NewsletterBar, PublicationFooter, ArticleCard, AdZone } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";
import { EditorialArticle } from "../editorial/EditorialArticle";
import { EditorialCategory } from "../editorial/EditorialCategory";
import { EditorialCategories } from "../editorial/EditorialCategories";
import { EditorialDiscover } from "../editorial/EditorialDiscover";
import { EditorialStaticPage } from "../editorial/EditorialStaticPage";

function CorporateHome({ licenseSettings, articles, categories, mostRead }: TemplateProps) {
  const featured = articles[0];
  const gridArticles = articles.slice(1, 13);
  const mostReadList = mostRead || [];
  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 60px" }}>
        {/* Featured article */}
        {featured && (
          <a href={"/article/" + featured.slug} style={{ textDecoration: "none", color: "inherit", display: "grid", gridTemplateColumns: featured.featuredImage ? "1fr 1fr" : "1fr", gap: 24, marginBottom: 40, padding: 24, background: "var(--brand-surface)", borderRadius: 8, border: "1px solid var(--brand-border)" }}>
            {featured.featuredImage && <img src={featured.featuredImage} alt="" style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 6 }} />}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {(() => { const cat = categories.find(c => c.id === featured.categoryId); return cat ? <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--brand-primary)", fontWeight: 700, marginBottom: 8 }}>{cat.name}</span> : null; })()}
              <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 28, fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.2, marginBottom: 12 }}>{featured.headline}</h2>
              {featured.subheadline && <p style={{ fontSize: 16, color: "var(--brand-text-secondary)", lineHeight: 1.5 }}>{featured.subheadline}</p>}
            </div>
          </a>
        )}

        {/* Two-column layout: articles + sidebar */}
        <div className="corp-layout" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 40 }}>
          <div className="corp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {gridArticles.map(a => (
              <ArticleCard key={a.id} article={a} size="medium" categories={categories} showImage showExcerpt />
            ))}
          </div>
          <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ background: "var(--brand-surface)", padding: 20, borderRadius: 8, border: "1px solid var(--brand-border)" }}>
              <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--brand-text-primary)" }}>Newsletter</h3>
              <a href="#newsletter" style={{ display: "block", textAlign: "center", padding: "8px 16px", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Subscribe</a>
            </div>
            {mostReadList.length > 0 && (
              <div>
                <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--brand-text-primary)" }}>Most Read</h3>
                {mostReadList.slice(0, 5).map((a, i) => (
                  <div key={a.id}>
                    {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--brand-border)", margin: "8px 0" }} />}
                    <a href={"/article/" + a.slug} style={{ display: "flex", gap: 12, textDecoration: "none", color: "inherit", padding: "4px 0" }}>
                      <span style={{ fontFamily: "var(--brand-font-heading)", fontSize: 24, fontWeight: 700, color: "var(--brand-primary)", minWidth: 24 }}>{i+1}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--brand-text-primary)", lineHeight: 1.3 }}>{a.headline}</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
            <AdZone placement="sidebar" licenseSettings={licenseSettings} />
          </aside>
        </div>
        {articles.length === 0 && <p style={{ textAlign: "center", padding: 60, color: "var(--brand-text-secondary)" }}>No articles published yet.</p>}
      </div>
      <div id="newsletter"><NewsletterBar licenseSettings={licenseSettings} /></div>
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />
      <style>{`
        @media (max-width: 1024px) { .corp-layout { grid-template-columns: 1fr !important; } .corp-grid { grid-template-columns: 1fr !important; } }
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
      {page === "category" && <EditorialCategory {...props} />}
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
