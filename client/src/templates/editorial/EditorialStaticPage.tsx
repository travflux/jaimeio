import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { TemplateProps } from "../shared/types";
import { AdZone, NewsletterBar, PublicationFooter } from "../shared";
import { PublicationMasthead } from "../shared/PublicationMasthead";



// ═══ ADVERTISE PAGE ═══
function AdvertisePage({ licenseSettings }: TemplateProps) {
  const siteName = licenseSettings.brand_site_name || "our publication";
  const email = licenseSettings.brand_contact_email || "";
  const [formData, setFormData] = useState({ name: "", email: "", company: "", message: "" });
  const [sent, setSent] = useState(false);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 36, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 12 }}>
        Advertise with {siteName}
      </h1>
      <p style={{ fontSize: 16, color: "var(--brand-text-secondary)", lineHeight: 1.6, marginBottom: 32 }}>
        Reach our engaged audience of readers who trust {siteName} for quality content.
      </p>

      {/* Stats */}
      <div className="adv-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
        {[
          { label: "Growing Readership", value: "Quality Audience" },
          { label: "Published Articles", value: "Fresh Content Daily" },
          { label: "Newsletter Subscribers", value: "Direct Reach" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--brand-surface)", padding: 20, borderRadius: 8, textAlign: "center", border: "1px solid var(--brand-border)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--brand-primary)", marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "var(--brand-text-secondary)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Why Advertise */}
      <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 24, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 20 }}>
        Why Advertise With Us
      </h2>
      <div className="adv-cards" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 40 }}>
        {[
          { title: "Engaged Audience", text: "Our readers are highly engaged and trust our content." },
          { title: "Premium Placements", text: "Your brand appears alongside quality editorial content." },
          { title: "Measurable Results", text: "Track performance with detailed analytics and reporting." },
        ].map(c => (
          <div key={c.title} style={{ background: "var(--brand-background)", padding: 20, borderRadius: 8, border: "1px solid var(--brand-border)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 6 }}>{c.title}</h3>
            <p style={{ fontSize: 14, color: "var(--brand-text-secondary)", lineHeight: 1.5, margin: 0 }}>{c.text}</p>
          </div>
        ))}
      </div>

      {/* Contact Form */}
      <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 24, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 8 }}>Get In Touch</h2>
      <p style={{ fontSize: 14, color: "var(--brand-text-secondary)", marginBottom: 20 }}>Tell us about your advertising goals.</p>
      {sent ? (
        <div style={{ background: "var(--brand-surface)", padding: 24, borderRadius: 8, textAlign: "center" }}>
          <p style={{ fontWeight: 600, color: "var(--brand-primary)" }}>Thanks! We'll be in touch soon.</p>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); setSent(true); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="Your Name" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid var(--brand-border)", fontSize: 14, background: "var(--brand-background)", color: "var(--brand-text-primary)" }} />
          <input type="email" placeholder="Email" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
            style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid var(--brand-border)", fontSize: 14, background: "var(--brand-background)", color: "var(--brand-text-primary)" }} />
          <input placeholder="Company" value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
            style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid var(--brand-border)", fontSize: 14, background: "var(--brand-background)", color: "var(--brand-text-primary)" }} />
          <textarea placeholder="Tell us about your goals..." rows={4} value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
            style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid var(--brand-border)", fontSize: 14, background: "var(--brand-background)", color: "var(--brand-text-primary)", resize: "vertical" }} />
          <button type="submit" style={{ padding: "12px 24px", borderRadius: 6, border: "none", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", fontWeight: 600, fontSize: 14, cursor: "pointer", alignSelf: "flex-start" }}>
            Send Inquiry
          </button>
        </form>
      )}
      {email && <p style={{ fontSize: 12, color: "var(--brand-text-secondary)", marginTop: 12 }}>Or email us directly: <a href={`mailto:${email}`} style={{ color: "var(--brand-link)" }}>{email}</a></p>}

      <style>{`
        @media (max-width: 768px) { .adv-stats, .adv-cards { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

// ═══ PRIVACY PAGE ═══
function PrivacyPage({ licenseSettings }: TemplateProps) {
  const siteName = licenseSettings.brand_site_name || "this publication";
  const email = licenseSettings.brand_contact_email || "privacy@example.com";
  const business = licenseSettings.brand_business_name || siteName;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 36, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 24 }}>
        Privacy Policy & Terms of Use
      </h1>
      <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--brand-text-primary)" }}>
        <p><strong>Effective Date:</strong> January 1, 2026</p>
        <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 22, marginTop: 32, marginBottom: 12 }}>Privacy Policy</h2>
        <p>{business} ("{siteName}") respects your privacy. This policy explains how we collect, use, and protect your information when you visit our website.</p>
        <h3 style={{ fontSize: 18, marginTop: 24, marginBottom: 8 }}>Information We Collect</h3>
        <ul style={{ paddingLeft: 24 }}>
          <li>Email address (when you subscribe to our newsletter)</li>
          <li>Usage data (page views, reading patterns) via anonymized analytics</li>
          <li>Contact information (when you submit forms)</li>
        </ul>
        <h3 style={{ fontSize: 18, marginTop: 24, marginBottom: 8 }}>How We Use Your Information</h3>
        <ul style={{ paddingLeft: 24 }}>
          <li>To deliver our newsletter and content updates</li>
          <li>To improve our website and content</li>
          <li>To respond to inquiries</li>
        </ul>
        <h3 style={{ fontSize: 18, marginTop: 24, marginBottom: 8 }}>Your Rights</h3>
        <p>You may unsubscribe from our newsletter at any time. To request data deletion, contact us at <a href={`mailto:${email}`} style={{ color: "var(--brand-link)" }}>{email}</a>.</p>

        <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 22, marginTop: 32, marginBottom: 12 }}>Terms of Use</h2>
        <p>By using {siteName}, you agree to these terms. All content is published by {business} and is protected by copyright. Content may not be reproduced without permission.</p>
        <p style={{ marginTop: 16 }}>{siteName} is an AI-powered publication. All articles are works of fiction unless otherwise stated. Any resemblance to real events or persons is coincidental and for entertainment purposes only.</p>

        <h3 style={{ fontSize: 18, marginTop: 24, marginBottom: 8 }}>Contact</h3>
        <p>Questions? Email us at <a href={`mailto:${email}`} style={{ color: "var(--brand-link)" }}>{email}</a>.</p>
      </div>
    </div>
  );
}

// ═══ CONTACT PAGE ═══
function ContactPage({ licenseSettings }: TemplateProps) {
  const siteName = licenseSettings.brand_site_name || "us";
  const email = licenseSettings.brand_contact_email;
  const phone = licenseSettings.brand_phone;
  const address = licenseSettings.brand_address;
  const [formData, setFormData] = useState({ name: "", email: "", subject: "General Inquiry", message: "" });
  const [sent, setSent] = useState(false);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 36, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 12 }}>
        Get In Touch
      </h1>
      <p style={{ fontSize: 16, color: "var(--brand-text-secondary)", lineHeight: 1.6, marginBottom: 32 }}>We'd love to hear from you.</p>

      <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        {/* Contact Info */}
        <div>
          {email && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 4 }}>Email</h3>
              <a href={`mailto:${email}`} style={{ color: "var(--brand-link)", fontSize: 15 }}>{email}</a>
            </div>
          )}
          {phone && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 4 }}>Phone</h3>
              <p style={{ color: "var(--brand-text-secondary)", fontSize: 15 }}>{phone}</p>
            </div>
          )}
          {address && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 4 }}>Address</h3>
              <p style={{ color: "var(--brand-text-secondary)", fontSize: 15 }}>{address}</p>
            </div>
          )}
          {!email && !phone && !address && (
            <p style={{ color: "var(--brand-text-secondary)" }}>Contact information coming soon.</p>
          )}
        </div>

        {/* Form */}
        <div>
          {sent ? (
            <div style={{ background: "var(--brand-surface)", padding: 24, borderRadius: 8, textAlign: "center" }}>
              <p style={{ fontWeight: 600, color: "var(--brand-primary)" }}>Message sent! We'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); setSent(true); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="Your Name" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid var(--brand-border)", fontSize: 14, background: "var(--brand-background)", color: "var(--brand-text-primary)" }} />
              <input type="email" placeholder="Email" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid var(--brand-border)", fontSize: 14, background: "var(--brand-background)", color: "var(--brand-text-primary)" }} />
              <select value={formData.subject} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid var(--brand-border)", fontSize: 14, background: "var(--brand-background)", color: "var(--brand-text-primary)" }}>
                <option>General Inquiry</option>
                <option>Advertising</option>
                <option>Corrections</option>
                <option>Feedback</option>
                <option>Other</option>
              </select>
              <textarea placeholder="Your message..." rows={5} required value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid var(--brand-border)", fontSize: 14, background: "var(--brand-background)", color: "var(--brand-text-primary)", resize: "vertical" }} />
              <button type="submit" style={{ padding: "12px 24px", borderRadius: 6, border: "none", background: "var(--brand-button-bg)", color: "var(--brand-button-text)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

// ═══ SITEMAP PAGE ═══
function SitemapPage({ licenseSettings, categories, articles }: TemplateProps) {
  const siteName = licenseSettings.brand_site_name || "Publication";
  const grouped = new Map<string, typeof articles>();
  for (const a of articles) {
    const month = a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "Undated";
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(a);
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 36, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 32 }}>Site Map</h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--brand-text-primary)" }}>Main Pages</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {[
            { label: "Home", href: "/" }, { label: "About", href: "/about" },
            { label: "Contact", href: "/contact" }, { label: "Advertise", href: "/advertise" },
            { label: "Privacy Policy & Terms", href: "/privacy" }, { label: "Categories", href: "/categories" },
          ].map(p => (
            <li key={p.href} style={{ padding: "4px 0" }}>
              <a href={p.href} style={{ color: "var(--brand-link)", fontSize: 15 }}>{p.label}</a>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--brand-text-primary)" }}>Categories</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {categories.map(c => (
            <li key={c.id} style={{ padding: "4px 0" }}>
              <a href={`/category/${c.slug}`} style={{ color: "var(--brand-link)", fontSize: 15 }}>{c.name}</a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--brand-text-primary)" }}>Recent Articles</h2>
        {Array.from(grouped.entries()).map(([month, arts]) => (
          <div key={month} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--brand-text-secondary)", marginBottom: 8 }}>{month}</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {arts.map(a => (
                <li key={a.id} style={{ padding: "3px 0" }}>
                  <a href={`/article/${a.slug}`} style={{ color: "var(--brand-link)", fontSize: 14 }}>{a.headline}</a>
                  <span style={{ fontSize: 12, color: "var(--brand-text-secondary)", marginLeft: 8 }}>
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

// ═══ ABOUT PAGE ═══
function AboutPage({ licenseSettings }: TemplateProps) {
  const siteName = licenseSettings.brand_site_name || "our publication";
  const business = licenseSettings.brand_business_name || siteName;
  const description = licenseSettings.brand_site_description || "";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--brand-font-heading)", fontSize: 36, fontWeight: 700, color: "var(--brand-text-primary)", marginBottom: 16 }}>
        About {siteName}
      </h1>
      {licenseSettings.brand_tagline && (
        <p style={{ fontSize: 18, fontStyle: "italic", color: "var(--brand-text-secondary)", marginBottom: 24 }}>
          {licenseSettings.brand_tagline}
        </p>
      )}
      <div style={{ fontSize: 16, lineHeight: 1.8, color: "var(--brand-text-primary)" }}>
        {description ? (
          <p>{description}</p>
        ) : (
          <p>{siteName} is a publication by {business}, delivering quality content to our readers.</p>
        )}
        <p style={{ marginTop: 16 }}>{siteName} is powered by JAIME.IO, an AI-driven content platform that helps publishers create, manage, and distribute content at scale.</p>
        {licenseSettings.brand_contact_email && (
          <p style={{ marginTop: 16 }}>
            Want to get in touch? Email us at{" "}
            <a href={`mailto:${licenseSettings.brand_contact_email}`} style={{ color: "var(--brand-link)" }}>
              {licenseSettings.brand_contact_email}
            </a>
            {" "}or visit our <a href="/contact" style={{ color: "var(--brand-link)" }}>contact page</a>.
          </p>
        )}
      </div>
    </div>
  );
}

// ═══ MAIN EXPORT ═══
export function EditorialStaticPage(props: TemplateProps) {
  const { page } = props;

  return (
    <>
      <AdZone placement="header" licenseSettings={props.licenseSettings} />
      <PublicationMasthead licenseSettings={props.licenseSettings} categories={props.categories} />
      
      

      {page === "advertise" && <AdvertisePage {...props} />}
      {page === "privacy" && <PrivacyPage {...props} />}
      {page === "contact" && <ContactPage {...props} />}
      {page === "sitemap" && <SitemapPage {...props} />}
      {page === "about" && <AboutPage {...props} />}

      <NewsletterBar licenseSettings={props.licenseSettings} />
      <PublicationFooter licenseSettings={props.licenseSettings} categories={props.categories} />
    </>
  );
}
