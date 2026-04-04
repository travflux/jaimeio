import React from "react";
import { Twitter, Instagram, Linkedin, Facebook, Globe, ExternalLink } from "lucide-react";
import type { LicenseSettings, Category } from "./types";

interface PublicationFooterProps {
  licenseSettings: LicenseSettings;
  categories: Category[];
}

function SocialIconLink({ platform, url }: { platform: string; url: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    twitter: <Twitter size={16} />,
    x: <Twitter size={16} />,
    instagram: <Instagram size={16} />,
    linkedin: <Linkedin size={16} />,
    facebook: <Facebook size={16} />,
    tiktok: <ExternalLink size={16} />,
    pinterest: <ExternalLink size={16} />,
  };
  const icon = iconMap[platform.toLowerCase()] || <ExternalLink size={16} />;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Follow on ${platform}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "var(--brand-footer-text)",
        opacity: 0.7,
        transition: "opacity 0.15s",
        textDecoration: "none",
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
    >
      {icon}
    </a>
  );
}

function parseSocialLinks(licenseSettings: LicenseSettings): Array<{ platform: string; url: string }> {
  const links: Array<{ platform: string; url: string }> = [];

  // Try blotato_platforms JSON first
  try {
    if (licenseSettings.blotato_platforms) {
      const platforms = JSON.parse(licenseSettings.blotato_platforms);
      if (Array.isArray(platforms)) {
        for (const p of platforms) {
          if (p.enabled && p.url) {
            links.push({ platform: p.platform || p.name || "", url: p.url });
          }
        }
      }
    }
  } catch { /* ignore */ }

  // Also check individual social URL settings
  const socialKeys: Array<[string, string]> = [
    ["social_x_url", "x"],
    ["social_instagram_url", "instagram"],
    ["social_linkedin_url", "linkedin"],
    ["social_facebook_url", "facebook"],
    ["social_tiktok_url", "tiktok"],
    ["social_pinterest_url", "pinterest"],
  ];
  for (const [key, platform] of socialKeys) {
    const url = licenseSettings[key];
    if (url && !links.some(l => l.platform.toLowerCase() === platform)) {
      links.push({ platform, url });
    }
  }

  return links;
}

export function PublicationFooter({ licenseSettings, categories }: PublicationFooterProps) {
  const siteName = licenseSettings.brand_site_name || "Publication";
  const year = new Date().getFullYear();
  const socialLinks = parseSocialLinks(licenseSettings);
  const footerCats = categories.slice(0, 5);

  const linkStyle: React.CSSProperties = {
    color: "var(--brand-footer-text)",
    opacity: 0.8,
    fontSize: 14,
    textDecoration: "none",
    display: "block",
    padding: "3px 0",
    transition: "opacity 0.15s",
  };

  const colHeadStyle: React.CSSProperties = {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    opacity: 0.6,
    marginBottom: 16,
    color: "var(--brand-footer-text)",
  };

  return (
    <footer style={{ background: "var(--brand-footer-bg)", color: "var(--brand-footer-text)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px 0" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }}>

          {/* Column 1 — Brand + Social */}
          <div>
            {licenseSettings.brand_logo_dark_url ? (
              <img src={licenseSettings.brand_logo_dark_url} alt={siteName} style={{ maxHeight: 48, marginBottom: 12, objectFit: "contain" }} />
            ) : licenseSettings.brand_logo_url ? (
              <img src={licenseSettings.brand_logo_url} alt={siteName} style={{ maxHeight: 48, marginBottom: 12, objectFit: "contain" }} />
            ) : (
              <div style={{ fontFamily: "var(--brand-font-heading, Georgia, serif)", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{siteName}</div>
            )}
            {licenseSettings.brand_tagline && (
              <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16, lineHeight: 1.5 }}>{licenseSettings.brand_tagline}</p>
            )}
            {/* Social icons */}
            {(socialLinks.length > 0 || licenseSettings.brand_website_url) && (
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {socialLinks.map(s => (
                  <SocialIconLink key={s.platform} platform={s.platform} url={s.url} />
                ))}
                {licenseSettings.brand_website_url && (
                  <SocialIconLink platform="website" url={licenseSettings.brand_website_url} />
                )}
              </div>
            )}
          </div>

          {/* Column 2 — Categories */}
          <div>
            <h4 style={colHeadStyle}>Categories</h4>
            {footerCats.map(c => (
              <a key={c.id} href={`/category/${c.slug}`} style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}>{c.name}</a>
            ))}
            <a href="/categories" style={{ ...linkStyle, marginTop: 8, fontWeight: 600 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}>Explore More →</a>
          </div>

          {/* Column 3 — Discover */}
          <div>
            <h4 style={colHeadStyle}>Discover</h4>
            {[
              { label: "Latest", href: "/latest" },
              { label: "Most Read", href: "/most-read" },
              { label: "Trending Now", href: "/trending" },
              { label: "Editor's Picks", href: "/editors-picks" },
              { label: "Browse Topics", href: "/categories" },
            ].map(l => (
              <a key={l.href} href={l.href} style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}>{l.label}</a>
            ))}
          </div>

          {/* Column 4 — Quick Links */}
          <div>
            <h4 style={colHeadStyle}>Quick Links</h4>
            {[
              { label: "Advertise", href: "/advertise" },
              { label: "Privacy Policy & Terms", href: "/privacy" },
              { label: "Site Map", href: "/sitemap-page" },
              { label: "Contact", href: "/contact" },
            ].map(l => (
              <a key={l.href} href={l.href} style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}>{l.label}</a>
            ))}
          </div>
        </div>

        {/* Copyright Section */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", padding: "20px 0", marginTop: 48 }}>
          {/* Row 1: Copyright left + Powered by right */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--brand-footer-text)", opacity: 0.6 }}>
              © {year} {siteName}. All rights reserved.
            </span>
            <span style={{ fontSize: 11, color: "var(--brand-footer-text)", opacity: 0.5 }}>
              <a href="https://www.getjaime.io" target="_blank" rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "none" }}>Powered by JAIME.IO</a>
              {" | "}
              <a href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Admin</a>
            </span>
          </div>
          {/* Row 2: Disclaimer */}
          <p style={{
            fontSize: 11,
            color: "var(--brand-footer-text)",
            opacity: 0.4,
            margin: 0,
            lineHeight: 1.5,
            textAlign: "left",
          }}>
            {siteName} is a news publication. All articles are works of fiction.
            Any resemblance to real events or persons is coincidental and for
            entertainment purposes only.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; text-align: center; }
        }
      `}</style>
    </footer>
  );
}
