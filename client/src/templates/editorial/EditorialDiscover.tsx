import React from "react";
import type { TemplateProps } from "../shared/types";
import { AdZone, NewsletterBar, PublicationFooter, ArticleCard } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";

interface DiscoverProps extends TemplateProps {
  variant: "latest" | "most-read" | "trending" | "editors-picks";
}

const CONFIG = {
  "latest": { title: "Latest", subtitle: "The most recent stories" },
  "most-read": { title: "Most Read", subtitle: "The stories our readers love most" },
  "trending": { title: "Trending Now", subtitle: "What everyone is talking about" },
  "editors-picks": { title: "Editor's Picks", subtitle: "Handpicked stories from our editorial team" },
};



function LatestLayout({ articles, categories }: { articles: TemplateProps["articles"]; categories: TemplateProps["categories"] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {articles.map((a, i) => (
        <div key={a.id}>
          {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--brand-border)", margin: "16px 0" }} />}
          <ArticleCard article={a} size="small" categories={categories} showImage showExcerpt />
        </div>
      ))}
      {articles.length === 0 && (
        <p style={{ textAlign: "center", padding: "40px 0", color: "var(--brand-text-secondary)" }}>No articles yet.</p>
      )}
    </div>
  );
}

function MostReadLayout({ articles, categories }: { articles: TemplateProps["articles"]; categories: TemplateProps["categories"] }) {
  // Sort by viewCount descending
  const sorted = [...articles].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {sorted.map((a, i) => (
        <li key={a.id}>
          {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--brand-border)", margin: "12px 0" }} />}
          <a href={`/article/${a.slug}`} style={{ display: "flex", alignItems: "flex-start", gap: 16, textDecoration: "none", color: "inherit", padding: "8px 0" }}>
            <span style={{ fontFamily: "var(--brand-font-heading)", fontSize: 36, fontWeight: 700, color: "var(--brand-primary)", lineHeight: 1, minWidth: 40 }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 17, fontFamily: "var(--brand-font-heading)", fontWeight: 600, color: "var(--brand-text-primary)", lineHeight: 1.3, margin: "0 0 4px" }}>{a.headline}</h3>
              <span style={{ fontSize: 12, color: "var(--brand-text-secondary)" }}>
                {a.viewCount ? `${a.viewCount.toLocaleString()} readers` : ""}
                {a.publishedAt ? ` · ${new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
              </span>
            </div>
            {a.featuredImage && (
              <img src={a.featuredImage} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} loading="lazy" />
            )}
          </a>
        </li>
      ))}
      {sorted.length === 0 && (
        <p style={{ textAlign: "center", padding: "40px 0", color: "var(--brand-text-secondary)" }}>No articles yet.</p>
      )}
    </ol>
  );
}

function GridLayout({ articles, categories, badge }: { articles: TemplateProps["articles"]; categories: TemplateProps["categories"]; badge?: { text: string; color: string } }) {
  return (
    <>
      <div className="disc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {articles.map(a => (
          <div key={a.id} style={{ position: "relative" }}>
            {badge && (
              <span style={{
                position: "absolute", top: 12, left: 12, zIndex: 1,
                background: badge.color, color: "#fff", fontSize: 11,
                fontWeight: 700, textTransform: "uppercase", padding: "2px 8px",
                borderRadius: 4, letterSpacing: "0.04em",
              }}>{badge.text}</span>
            )}
            <ArticleCard article={a} size="medium" categories={categories} showImage showExcerpt />
          </div>
        ))}
      </div>
      {articles.length === 0 && (
        <p style={{ textAlign: "center", padding: "40px 0", color: "var(--brand-text-secondary)" }}>
          {badge?.text === "Editor's Pick"
            ? "No editor's picks yet. Check back soon!"
            : "No articles yet."}
        </p>
      )}
    </>
  );
}

export function EditorialDiscover({ variant, licenseSettings, articles, categories, mostRead }: DiscoverProps) {
  const config = CONFIG[variant];
  const siteName = licenseSettings.brand_site_name || "our publication";

  return (
    <>
      <AdZone placement="header" licenseSettings={licenseSettings} />
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      
      

      {/* Page Header */}
      <section style={{ background: "var(--brand-surface)", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 36, fontWeight: 700, color: "var(--brand-primary)", marginBottom: 8 }}>
            {config.title}
          </h1>
          <p style={{ fontSize: 16, color: "var(--brand-text-secondary)" }}>
            {config.subtitle.replace("{brand_site_name}", siteName)}
          </p>
        </div>
      </section>

      {/* Main Content + Sidebar */}
      <div className="disc-layout" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 48px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 40 }}>
        <div>
          {variant === "latest" && <LatestLayout articles={articles} categories={categories} />}
          {variant === "most-read" && <MostReadLayout articles={articles} categories={categories} />}
          {variant === "trending" && <GridLayout articles={articles} categories={categories} badge={{ text: "Trending", color: "#f97316" }} />}
          {variant === "editors-picks" && <GridLayout articles={articles} categories={categories} badge={{ text: "Editor's Pick", color: "#14b8a6" }} />}
        </div>
        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "var(--brand-surface)", padding: 20, borderRadius: 8, border: "1px solid var(--brand-border)" }}>
            <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--brand-text-primary)" }}>Newsletter</h3>
            <p style={{ fontSize: 13, color: "var(--brand-text-secondary)", marginBottom: 12 }}>Stay updated.</p>
            <a href="#newsletter" style={{ display: "block", textAlign: "center", padding: "8px 16px", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Subscribe</a>
          </div>
          <AdZone placement="sidebar" licenseSettings={licenseSettings} />
        </aside>
      </div>

      <div id="newsletter"><NewsletterBar licenseSettings={licenseSettings} /></div>
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />

      <style>{`
        @media (max-width: 1023px) {
          .disc-layout { grid-template-columns: 1fr !important; }
          .disc-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 639px) {
          .disc-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
