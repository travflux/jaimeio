import React from "react";
import type { TemplateProps } from "../shared/types";
import { NewsletterBar, PublicationFooter } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";
import { EditorialArticle } from "../editorial/EditorialArticle";
import { EditorialCategory } from "../editorial/EditorialCategory";
import { EditorialCategories } from "../editorial/EditorialCategories";
import { EditorialDiscover } from "../editorial/EditorialDiscover";
import { EditorialStaticPage } from "../editorial/EditorialStaticPage";

function MinimalHome({ licenseSettings, articles, categories }: TemplateProps) {
  return (
    <>
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 60px" }}>
        {articles.slice(0, 20).map((a, i) => (
          <div key={a.id}>
            {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--brand-border)", margin: "28px 0" }} />}
            <a href={"/article/" + a.slug} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <h2 style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: 26, fontWeight: 700, color: "var(--brand-text-primary)", lineHeight: 1.25, marginBottom: 6 }}>{a.headline}</h2>
              <p style={{ fontSize: 13, color: "var(--brand-text-secondary)", opacity: 0.7, marginBottom: 8 }}>
                {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                {(() => { const cat = categories.find(c => c.id === a.categoryId); return cat ? " · " + cat.name : ""; })()}
              </p>
              {a.subheadline && <p style={{ fontSize: 16, color: "var(--brand-text-secondary)", lineHeight: 1.6 }}>{a.subheadline}</p>}
            </a>
          </div>
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
    <div style={{ fontFamily: "var(--brand-font-body)", color: "var(--brand-text-primary)", background: "var(--brand-background)", minHeight: "100vh" }}>
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
