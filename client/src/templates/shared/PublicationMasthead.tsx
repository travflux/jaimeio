import React from "react";
import type { LicenseSettings, Category } from "./types";

interface PublicationMastheadProps {
  licenseSettings: LicenseSettings;
  categories: Category[];
}

export function PublicationMasthead({ licenseSettings, categories }: PublicationMastheadProps) {
  const siteName = licenseSettings.brand_site_name || "Publication";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).toUpperCase();

  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <>
      {/* ── Masthead Bar ──────────────────────────────────── */}
      <header style={{ background: "var(--brand-background)", borderBottom: "1px solid var(--brand-border)" }}>
        <div className="pub-masthead-inner" style={{
          maxWidth: 1280, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center", padding: "16px 24px", gap: 16,
        }}>
          {/* Left: Date */}
          <span className="pub-masthead-date" style={{
            fontSize: 12, color: "var(--brand-text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {today}
          </span>

          {/* Center: Logo + Tagline */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {licenseSettings.brand_logo_url ? (
              <a href="/">
                <img
                  src={licenseSettings.brand_logo_url}
                  alt={siteName}
                  style={{ maxHeight: 72, maxWidth: 280, objectFit: "contain", display: "block" }}
                />
              </a>
            ) : (
              <a href="/" style={{
                textDecoration: "none",
                fontFamily: "var(--brand-font-heading, Georgia, serif)",
                fontSize: "clamp(24px, 4vw, 48px)",
                fontWeight: 700,
                color: "var(--brand-primary)",
                letterSpacing: "-0.5px",
                lineHeight: 1,
                textAlign: "center",
              }}>
                {siteName}
              </a>
            )}
            {licenseSettings.brand_tagline && (
              <p style={{
                fontSize: 11,
                fontStyle: "normal",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "var(--brand-text-secondary)",
                margin: "6px 0 0 0",
                textAlign: "center",
              }}>
                {licenseSettings.brand_tagline}
              </p>
            )}
          </div>

          {/* Right: Search */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
            <a href="/search" aria-label="Search" style={{
              color: "var(--brand-text-secondary)", padding: 8,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* ── Category Nav Bar ──────────────────────────────── */}
      <nav style={{ background: "var(--brand-nav-bg)" }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 24px",
          display: "flex", justifyContent: "center", alignItems: "center",
          overflowX: "auto", gap: 0, scrollbarWidth: "none" as any, msOverflowStyle: "none" as any,
        }}>
          {categories.map(c => {
            const href = `/category/${c.slug}`;
            const isActive = currentPath === href;
            return (
              <a
                key={c.id}
                href={href}
                className={`pub-nav-link${isActive ? " active" : ""}`}
              >
                {c.name}
              </a>
            );
          })}
          <span style={{ color: "#ffffff", opacity: 0.3, padding: "0 8px" }}>|</span>
          <a
            href="/latest"
            className={`pub-nav-link${currentPath === "/latest" ? " active" : ""}`}
            style={{ color: "var(--brand-primary)" }}
          >
            LATEST
          </a>
        </div>
      </nav>

      <style>{`
        .pub-nav-link {
          padding: 12px 18px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #ffffff;
          text-decoration: none;
          border-bottom: 2px solid transparent;
          transition: color 0.15s ease, border-color 0.15s ease;
          white-space: nowrap;
          display: inline-block;
        }
        .pub-nav-link:hover {
          color: var(--brand-primary) !important;
          border-bottom-color: var(--brand-primary) !important;
        }
        .pub-nav-link.active {
          color: var(--brand-primary) !important;
          border-bottom-color: var(--brand-primary) !important;
        }
        @media (max-width: 768px) {
          .pub-masthead-date { display: none !important; }
          .pub-masthead-inner { grid-template-columns: 1fr auto !important; }
        }
        nav div::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
