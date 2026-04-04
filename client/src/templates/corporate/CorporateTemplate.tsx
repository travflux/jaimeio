import React from "react";
import type { TemplateProps } from "../shared/types";
import { PublicationFooter } from "../shared";
export function CorporateTemplate({ licenseSettings, categories }: TemplateProps) {
  const siteName = licenseSettings.brand_site_name || "Publication";
  return (
    <div style={{ fontFamily: "var(--brand-font-body)", color: "var(--brand-text-primary)", background: "var(--brand-background)", minHeight: "100vh" }}>
      <div style={{ background: "var(--brand-background)", borderBottom: "1px solid var(--brand-border)", padding: "16px 0", textAlign: "center" }}>
        {licenseSettings.brand_logo_url ? <a href="/"><img src={licenseSettings.brand_logo_url} alt={siteName} style={{ maxHeight: 48 }} /></a> : <a href="/" style={{ textDecoration: "none", fontFamily: "var(--brand-font-heading)", fontSize: 28, fontWeight: 700, color: "var(--brand-primary)" }}>{siteName}</a>}
      </div>
      <div style={{ background: "var(--brand-surface)", borderBottom: "2px solid var(--brand-primary)", padding: "32px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 24, color: "var(--brand-primary)", marginBottom: 8 }}>Corporate Template</h2>
        <p style={{ color: "var(--brand-text-secondary)" }}>Coming soon.</p>
        <a href="/" style={{ display: "inline-block", marginTop: 16, padding: "8px 20px", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>View Publication →</a>
      </div>
      <PublicationFooter licenseSettings={licenseSettings} categories={categories} />
    </div>
  );
}
