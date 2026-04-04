import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { TemplateProps } from "../shared/types";
import { AdZone, SponsorBar, NewsletterBar, PublicationFooter, ArticleCard, BreakingTicker } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";
import { EditorialArticle } from "../editorial/EditorialArticle";
import { EditorialCategory } from "../editorial/EditorialCategory";
import { EditorialCategories } from "../editorial/EditorialCategories";
import { EditorialDiscover } from "../editorial/EditorialDiscover";
import { EditorialStaticPage } from "../editorial/EditorialStaticPage";
import { magazineStyles } from "./magazineStyles";



function EmptyState({ licenseSettings }: Pick<TemplateProps, "licenseSettings">) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const mutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { setStatus("success"); setEmail(""); },
  });
  const siteName = licenseSettings.brand_site_name || "our publication";

  return (
    <div style={{ textAlign: "center", padding: "80px 24px", maxWidth: 480, margin: "0 auto" }}>
      {licenseSettings.brand_logo_url && (
        <img src={licenseSettings.brand_logo_url} alt={siteName} style={{ maxHeight: 64, margin: "0 auto 24px", opacity: 0.6 }} />
      )}
      <h2 style={{
        fontFamily: "var(--brand-font-heading, Georgia, serif)",
        fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700,
        color: "var(--brand-text-primary)", marginBottom: 12,
      }}>
        We're just getting started
      </h2>
      <p className="mag-body-text" style={{ color: "var(--brand-text-secondary)", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
        Check back soon for content from {siteName}.
      </p>
      {status === "success" ? (
        <p style={{ color: "var(--brand-primary)", fontWeight: 600 }}>You're subscribed! Welcome to {siteName}.</p>
      ) : (
        <form onSubmit={e => { e.preventDefault(); if (email.trim() && consent) mutation.mutate({ email: email.trim() }); }}
          style={{ background: "var(--brand-surface)", padding: 24, borderRadius: 12, border: "1px solid var(--brand-border)" }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "var(--brand-text-primary)" }}>Be the first to know — subscribe</p>
          <div className="mag-newsletter-form">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
              style={{ flex: 1, padding: "10px 14px", borderRadius: 6, border: "1px solid var(--brand-border)", fontSize: 16, background: "var(--brand-background)", color: "var(--brand-text-primary)" }} />
            <button type="submit" disabled={mutation.isPending || !consent}
              style={{ padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", fontWeight: 600, fontSize: 14, cursor: consent ? "pointer" : "not-allowed", opacity: consent ? 1 : 0.6 }}>
              Subscribe
            </button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", margin: "8px 0 0 0", fontSize: 12, color: "var(--brand-text-secondary)" }}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
              style={{ width: 14, height: 14, minWidth: 14, cursor: "pointer", accentColor: "var(--brand-primary)", margin: 0 }} />
            <span>I agree to the <a href="/privacy" style={{ color: "var(--brand-link)", textDecoration: "underline" }}>Privacy Policy</a>.</span>
          </label>
        </form>
      )}
    </div>
  );
}

function MagazineHomepage({ licenseSettings, articles, categories, mostRead }: TemplateProps) {
  const latestArticles = articles.slice(0, 5);
  const featured = articles[0];
  const sideArticles = articles.slice(1, 3);
  const gridArticles = articles.slice(3, 15);
  const mostReadArticles = mostRead || [];

  return (
    <>
      {/* Skip to content */}
      <a href="#main-content" style={{
        position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden",
      }} onFocus={e => Object.assign(e.currentTarget.style, { position: "fixed", left: "16px", top: "16px", width: "auto", height: "auto", padding: "8px 16px", background: "var(--brand-primary)", color: "var(--brand-nav-text)", zIndex: 9999, borderRadius: 4, fontSize: 14, fontWeight: 600 })}
        onBlur={e => Object.assign(e.currentTarget.style, { position: "absolute", left: "-9999px", width: "1px", height: "1px" })}>
        Skip to main content
      </a>

      <AdZone placement="header" licenseSettings={licenseSettings} />
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      
      
      <BreakingTicker articles={latestArticles} />
      <SponsorBar licenseSettings={licenseSettings} />

      {articles.length === 0 ? (
        <EmptyState licenseSettings={licenseSettings} />
      ) : (
        <>
          {/* Hero Section */}
          <section id="main-content" style={{ maxWidth: 1280, margin: "0 auto", padding: 24 }}>
            <div className="mag-hero-grid">
              <div>
                {featured && <ArticleCard article={featured} size="hero" categories={categories} showImage showExcerpt />}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {sideArticles.map((a, i) => (
                  <React.Fragment key={a.id}>
                    {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--brand-border)", margin: "8px 0" }} />}
                    <ArticleCard article={a} size="small" categories={categories} />
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>

          <AdZone placement="article" licenseSettings={licenseSettings} />

          {/* Main Content + Sidebar */}
          <div className="mag-main-layout">
            <div>
              {/* Latest Grid */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <h2 style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: 20, fontWeight: 700, color: "var(--brand-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Latest</h2>
                  <div style={{ flex: 1, height: 1, background: "var(--brand-border)" }} />
                </div>
                <div className="mag-article-grid">
                  {gridArticles.map(a => (
                    <ArticleCard key={a.id} article={a} size="medium" categories={categories} showImage showExcerpt />
                  ))}
                </div>
              </div>

              {/* Most Read */}
              {mostReadArticles.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <h2 style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: 20, fontWeight: 700, color: "var(--brand-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Most Read</h2>
                    <div style={{ flex: 1, height: 1, background: "var(--brand-border)" }} />
                  </div>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {mostReadArticles.slice(0, 5).map((a, i) => (
                      <li key={a.id}>
                        {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--brand-border)", margin: "12px 0" }} />}
                        <a href={`/article/${a.slug}`} style={{ display: "flex", alignItems: "flex-start", gap: 16, textDecoration: "none", color: "inherit", padding: "4px 0" }}>
                          <span style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: 32, fontWeight: 700, color: "var(--brand-primary)", lineHeight: 1, minWidth: 32 }}>{i + 1}</span>
                          <div>
                            <h3 className="mag-body-text" style={{ fontSize: 15, fontFamily: "var(--brand-font-heading, Georgia, serif)", fontWeight: 600, color: "var(--brand-text-primary)", lineHeight: 1.3, margin: 0 }}>{a.headline}</h3>
                            <span style={{ fontSize: 12, color: "var(--brand-text-secondary)" }}>
                              {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                            </span>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ background: "var(--brand-surface)", padding: 20, borderRadius: 8, border: "1px solid var(--brand-border)" }}>
                <h3 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--brand-text-primary)" }}>Newsletter</h3>
                <p className="mag-body-text" style={{ fontSize: 13, color: "var(--brand-text-secondary)", marginBottom: 12 }}>Get updates from {licenseSettings.brand_site_name || "us"}</p>
                <a href="#newsletter" className="mag-touch-target" style={{ display: "block", textAlign: "center", padding: "8px 16px", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Subscribe</a>
              </div>
              <AdZone placement="sidebar" licenseSettings={licenseSettings} />
            </aside>
          </div>
        </>
      )}

      <div id="newsletter">
        <NewsletterBar licenseSettings={licenseSettings} />
      </div>
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />
    </>
  );
}

export function MagazineTemplate(props: TemplateProps) {
  const { page } = props;

  return (
    <div style={{
      fontFamily: "var(--brand-font-body, -apple-system, BlinkMacSystemFont, sans-serif)",
      color: "var(--brand-text-primary)",
      background: "var(--brand-background)",
      minHeight: "100vh",
    }}>
      <style dangerouslySetInnerHTML={{ __html: magazineStyles }} />
      {page === "home" && <MagazineHomepage {...props} />}
      {page === "article" && <EditorialArticle {...props} />}
      {page === "category" && <EditorialCategory {...props} />}
      {page === "categories" && <EditorialCategories {...props} />}
      {page === "latest" && <EditorialDiscover variant="latest" {...props} />}
      {page === "most-read" && <EditorialDiscover variant="most-read" {...props} />}
      {page === "trending" && <EditorialDiscover variant="trending" {...props} />}
      {page === "editors-picks" && <EditorialDiscover variant="editors-picks" {...props} />}
      {page === "advertise" && <EditorialStaticPage {...props} />}
      {page === "privacy" && <EditorialStaticPage {...props} />}
      {page === "contact" && <EditorialStaticPage {...props} />}
      {page === "sitemap" && <EditorialStaticPage {...props} />}
      {page === "about" && <EditorialStaticPage {...props} />}
      {page === "search" && <MagazineHomepage {...props} />}
    </div>
  );
}
