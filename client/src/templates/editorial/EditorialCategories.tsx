import React from "react";
import { trpc } from "@/lib/trpc";
import type { TemplateProps } from "../shared/types";
import { AdZone, NewsletterBar, PublicationFooter } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";



export function EditorialCategories({ licenseSettings, categories, articles }: TemplateProps) {
  // Count articles per category
  const countMap = new Map<string, number>();
  for (const a of articles) {
    const catName = categories.find(c => c.id === a.categoryId)?.name;
    if (catName) countMap.set(catName, (countMap.get(catName) || 0) + 1);
  }
  // Also count by name match for license-level categories
  for (const a of articles) {
    for (const c of categories) {
      if (c.id < 0) {
        // name match
        const match = categories.find(gc => gc.name.toLowerCase() === c.name.toLowerCase() && gc.id >= 0);
        // Not needed — just show categories regardless
      }
    }
  }

  const siteName = licenseSettings.brand_site_name || "our publication";

  return (
    <>
      <AdZone placement="header" licenseSettings={licenseSettings} />
      <PublicationMasthead licenseSettings={licenseSettings} categories={categories} />
      
      

      {/* Page Header */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 24px" }}>
        <h1 style={{
          fontFamily: "var(--brand-font-heading, Georgia, serif)",
          fontSize: 32, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 8,
        }}>
          Browse Topics
        </h1>
        <p style={{ fontSize: 14, color: "var(--brand-text-secondary)" }}>
          Explore everything {siteName} has to offer
        </p>
      </div>

      {/* Categories Grid */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 48px" }}>
        <div className="categories-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {categories.map(c => (
            <a
              key={c.id}
              href={`/category/${c.slug}`}
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                background: "var(--brand-background)",
                border: "1px solid var(--brand-border)",
                borderRadius: 8,
                overflow: "hidden",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Color accent bar */}
              <div style={{ height: 4, background: c.color || "var(--brand-primary)" }} />
              <div style={{ padding: 20 }}>
                <h2 style={{
                  fontFamily: "var(--brand-font-heading, Georgia, serif)",
                  fontSize: 20, fontWeight: 700, color: "var(--brand-text-primary)", margin: 0,
                }}>
                  {c.name}
                </h2>
                {c.description && (
                  <p style={{ fontSize: 14, color: "var(--brand-text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                    {c.description}
                  </p>
                )}
                <span style={{
                  display: "inline-block", marginTop: 12,
                  fontSize: 12, color: c.color || "var(--brand-primary)",
                  textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600,
                }}>
                  {countMap.get(c.name) || 0} articles
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <NewsletterBar licenseSettings={licenseSettings} />
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />

      <style>{`
        @media (max-width: 1023px) { .categories-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 639px) { .categories-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
