import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { HelpCircle } from "lucide-react";
import { toast } from "sonner";

const HEADING_FONTS = ["Playfair Display","Cormorant Garamond","Merriweather","Lora","Libre Baskerville","EB Garamond","Crimson Text","DM Serif Display","Fraunces","Bodoni Moda","Spectral","Cinzel","Abril Fatface","Josefin Slab","Arvo"];
const BODY_FONTS = ["Inter","DM Sans","Nunito","Open Sans","Lato","Poppins","Raleway","Source Sans Pro","Work Sans","Mulish","Outfit","Plus Jakarta Sans","Roboto","Montserrat","Jost"];

const TEMPLATES = [
  { id: "editorial", name: "Editorial", desc: "Classic newspaper layout with hero article, grid, and sidebar.", bestFor: "News, politics, finance", available: true },
  { id: "magazine", name: "Magazine", desc: "Full-bleed hero image, category rows, lifestyle-first layout.", bestFor: "Lifestyle, fashion, culture", available: true },
  { id: "modern", name: "Modern", desc: "Card-based, clean navigation, lots of white space.", bestFor: "Tech, startups, SaaS", available: true },
  { id: "minimal", name: "Minimal", desc: "Typography-first, no images, pure reading experience.", bestFor: "Writers, essayists, thought leaders", available: true },
  { id: "corporate", name: "Corporate", desc: "Structured sidebar, muted palette, industry-focused.", bestFor: "B2B, professional services", available: true },
  { id: "creative", name: "Personal / Creative", desc: "Author-centered, essay format, intimate newsletter CTA.", bestFor: "Bloggers, creators, personal brands", available: true },
];

function loadFont(font: string) {
  if (!font || typeof document === "undefined") return;
  const id = "gf-" + font.replace(/\s/g, "-");
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s/g, "+")}&display=swap`;
  document.head.appendChild(link);
}


function BrandingTip({ text }: { text: string }) {
  const [v, setV] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span style={{ color: "#9ca3af", cursor: "pointer", marginLeft: 4, fontSize: 13 }}
        onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)} onClick={() => setV(x => !x)}>&#9432;</span>
      {v && <span style={{ position: "absolute", left: 20, top: 0, zIndex: 50, width: 260, background: "#fff", color: "#374151", fontSize: 12, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb", padding: 12, lineHeight: 1.5, pointerEvents: "auto" }}
        onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)}>{text}</span>}
    </span>
  );
}

function BrandingToggle({ label, desc, tooltip, checked, onChange }: { label: string; desc: string; tooltip: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center" }}>{label}<BrandingTip text={tooltip} /></div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: checked ? "#2dd4bf" : "#d1d5db", position: "relative", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );
}

export default function TenantBranding() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  const regenMut = trpc.branding.regeneratePalette.useMutation();

  useEffect(() => { if (init) setS(init); }, [init]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const utils = trpc.useUtils();
  const handleSave = async () => {
    if (!licenseId) return;
    await saveMut.mutateAsync({ licenseId, settings: s });
    await regenMut.mutateAsync({ licenseId });
    // Invalidate all branding caches so publication reflects changes immediately
    utils.branding.get.invalidate();
  };

  useEffect(() => { if (s.brand_heading_font) loadFont(s.brand_heading_font); }, [s.brand_heading_font]);
  useEffect(() => { if (s.brand_body_font) loadFont(s.brand_body_font); }, [s.brand_body_font]);

  const selectedTemplate = s.brand_template || "editorial";

  return (
    <TenantLayout pageTitle="Branding" pageSubtitle="Publication identity, logos, colors, and fonts" section="Settings" saveAction={handleSave}>
      <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>
        <a href="/admin/settings" style={{ color: "#9ca3af", textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.color = "#374151")} onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>Settings</a>
        <span>›</span>
        <span style={{ color: "#374151" }}>Design & Branding</span>
      </nav>

      {/* Template Selection */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Publication Template</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Choose the visual style for your publication</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => update("brand_template", t.id)} style={{
              border: selectedTemplate === t.id ? "2px solid #2dd4bf" : "1px solid #e5e7eb",
              borderRadius: 8, overflow: "hidden", background: "#fff", cursor: "pointer", textAlign: "left", padding: 0, position: "relative",
            }}>
              {selectedTemplate === t.id && <span style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>✓</span>}
              <div style={{ height: 60, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", color: t.textColor || "#374151", fontSize: 11, fontWeight: 600 }}>{t.name}</div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Publication Identity */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Publication Identity</h3>
        {[["brand_site_name", "Site Name"], ["brand_tagline", "Tagline"]].map(([k, l]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{l}</label>
            <input value={s[k] || ""} onChange={e => update(k, e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Description</label>
          <textarea value={s.brand_description || ""} onChange={e => update("brand_description", e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
        </div>
      </div>

      {/* Logos */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Logos</h3>
        {[["brand_logo_light_url", "Light Logo URL", "#fff"], ["brand_logo_dark_url", "Dark Logo URL", "#111827"], ["brand_favicon_url", "Favicon URL", "#fff"]].map(([k, l, bg]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{l}</label>
            <input value={s[k] || ""} onChange={e => update(k, e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
            {s[k] && <div style={{ marginTop: 6, padding: 8, background: bg, borderRadius: 6, border: "1px solid #e5e7eb", display: "inline-block" }}>
              <img src={s[k]} alt="" style={{ maxWidth: k === "brand_favicon_url" ? 32 : 200, maxHeight: k === "brand_favicon_url" ? 32 : 60, objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
            </div>}
          </div>
        ))}
      </div>

      {/* Colors & Fonts */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Colors & Fonts</h3>
        {[["brand_color_primary", "Primary Color"], ["brand_color_secondary", "Secondary Color"]].map(([k, l]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{l}</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={s[k] || "#000000"} onChange={e => update(k, e.target.value)} style={{ width: 40, height: 34, padding: 0, border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }} />
              <input value={s[k] || ""} onChange={e => update(k, e.target.value)} placeholder="#000000" style={{ width: 120, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: s[k] || "#ccc", border: "1px solid #e5e7eb" }} />
            </div>
          </div>
        ))}

        <button onClick={() => { if (licenseId) regenMut.mutate({ licenseId }); }} disabled={regenMut.isPending}
          style={{ width: "100%", height: 40, background: "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16, opacity: regenMut.isPending ? 0.6 : 1 }}>
          {regenMut.isPending ? "Applying..." : "Apply Colors to Publication"}
        </button>
        {regenMut.isSuccess && <p style={{ fontSize: 12, color: "#22c55e", marginBottom: 12 }}>Colors updated — refresh your publication to see changes</p>}

        {/* Font selectors */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Heading Font</label>
          <select value={s.brand_heading_font || ""} onChange={e => { update("brand_heading_font", e.target.value); loadFont(e.target.value); }}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
            <option value="">Select a heading font...</option>
            {HEADING_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {s.brand_heading_font && (
            <div style={{ marginTop: 6, padding: 12, background: "#f9fafb", borderRadius: 6, fontFamily: `'${s.brand_heading_font}', serif`, fontSize: 24, fontWeight: 700 }}>The Quick Brown Fox</div>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Body Font</label>
          <select value={s.brand_body_font || ""} onChange={e => { update("brand_body_font", e.target.value); loadFont(e.target.value); }}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
            <option value="">Select a body font...</option>
            {BODY_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {s.brand_body_font && (
            <div style={{ marginTop: 6, padding: 12, background: "#f9fafb", borderRadius: 6, fontFamily: `'${s.brand_body_font}', sans-serif`, fontSize: 14, lineHeight: 1.6 }}>Intelligence is the new luxury. The best content comes from clarity of thought.</div>
          )}
        </div>
      </div>

      {/* Business & Contact Information */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Business & Contact Information</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Required for CAN-SPAM email compliance. Toggle to show on Contact page.</p>
        {[
          { key: "business_name", label: "Business / Brand Name", placeholder: "Niki James LLC", type: "text", note: "" },
          { key: "business_address", label: "Physical Mailing Address", placeholder: "123 Main St, Los Angeles, CA 90001", type: "text", note: "Must be a valid physical address — required by CAN-SPAM law" },
          { key: "business_email", label: "Contact Email", placeholder: "hello@nikijames.com", type: "email", note: "" },
          { key: "business_phone", label: "Phone Number (optional)", placeholder: "+1 (310) 555-0000", type: "text", note: "" },
          { key: "business_website", label: "Website URL", placeholder: "https://nikijames.com", type: "url", note: "" },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>{field.label}</label>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <span>Show on Contact</span>
                <input type="checkbox" checked={s[`${field.key}_show_on_contact`] === "true"} onChange={e => update(`${field.key}_show_on_contact`, e.target.checked ? "true" : "false")} />
              </label>
            </div>
            <input type={field.type} value={s[field.key] || ""} onChange={e => update(field.key, e.target.value)} placeholder={field.placeholder}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
            {field.note && <p style={{ fontSize: 11, color: "#d97706", marginTop: 4 }}>&#9888; {field.note}</p>}
          </div>
        ))}
      </div>


      {/* Masthead Layout */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Masthead Layout</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Controls for the top navigation area</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Logo Position</label>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>{["left","center","right"].map(v => (
            <button key={v} onClick={() => update("masthead_logo_position", v)} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer", textTransform: "capitalize" as const, borderColor: (s.masthead_logo_position || "center") === v ? "#2dd4bf" : "#e5e7eb", background: (s.masthead_logo_position || "center") === v ? "#f0fdfa" : "#fff", color: (s.masthead_logo_position || "center") === v ? "#0d9488" : "#6b7280" }}>{v}</button>
          ))}</div>
        </div>
        <BrandingToggle label="Show Tagline" desc="Tagline text below publication name" tooltip="Show or hide the tagline in the masthead." checked={s.masthead_show_tagline !== "false"} onChange={v => update("masthead_show_tagline", v ? "true" : "false")} />
        <BrandingToggle label="Show Date" desc="Current date in the masthead" tooltip="Common in news publications." checked={s.masthead_show_date !== "false"} onChange={v => update("masthead_show_date", v ? "true" : "false")} />
        <BrandingToggle label="Show Search" desc="Search icon in navigation" tooltip="Search icon in the masthead nav bar." checked={s.masthead_show_search !== "false"} onChange={v => update("masthead_show_search", v ? "true" : "false")} />
        <BrandingToggle label="Breaking News Ticker" desc="Scrolling headline ticker" tooltip="Scrolling ticker with recent headlines. Disable for cleaner minimal designs." checked={s.breaking_ticker_enabled !== "false"} onChange={v => update("breaking_ticker_enabled", v ? "true" : "false")} />
      </div>

      {/* Homepage Sections */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Homepage Sections</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Toggle which sections appear on your homepage</p>
        <BrandingToggle label="Hero Article" desc="Large featured article at the top" tooltip="The large featured article at the top of the homepage." checked={s.homepage_show_hero !== "false"} onChange={v => update("homepage_show_hero", v ? "true" : "false")} />
        <BrandingToggle label="Latest News Grid" desc="Grid of recent articles" tooltip="The grid of recent articles below the hero." checked={s.homepage_show_grid !== "false"} onChange={v => update("homepage_show_grid", v ? "true" : "false")} />
        <BrandingToggle label="Sidebar" desc="Right sidebar with newsletter and most-read" tooltip="Disable for a full-width layout." checked={s.homepage_show_sidebar !== "false"} onChange={v => update("homepage_show_sidebar", v ? "true" : "false")} />
        <BrandingToggle label="Newsletter Bar" desc="Email signup bar above footer" tooltip="Email signup bar above the footer." checked={s.homepage_show_newsletter_bar !== "false"} onChange={v => update("homepage_show_newsletter_bar", v ? "true" : "false")} />
        <BrandingToggle label="Trending Section" desc="Currently trending articles" tooltip="Section showing trending articles." checked={s.homepage_show_trending !== "false"} onChange={v => update("homepage_show_trending", v ? "true" : "false")} />
      </div>

      {/* Social Media Links */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Social Media Links</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>These appear as icons in your publication footer and newsletter. Enter full URLs.</p>
        {[
          { key: "social_instagram_url", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
          { key: "social_x_url", label: "X (Twitter)", placeholder: "https://x.com/yourhandle" },
          { key: "social_linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourprofile" },
          { key: "social_facebook_url", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
          { key: "social_tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@yourhandle" },
          { key: "social_pinterest_url", label: "Pinterest", placeholder: "https://pinterest.com/yourprofile" },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{field.label}</label>
            <input value={s[field.key] || ""} onChange={e => update(field.key, e.target.value)} placeholder={field.placeholder}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          </div>
        ))}
      </div>

      {/* Custom Domain */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Custom Domain</h3>
        <input value={s.custom_domain || ""} onChange={e => update("custom_domain", e.target.value)} placeholder="news.yourdomain.com"
          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, marginBottom: 12 }} />
        <div style={{ background: "#eff6ff", padding: 12, borderRadius: 6, fontSize: 12, color: "#1e40af" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Point your domain to us:</div>
          <div>Type: <strong>CNAME</strong></div>
          <div>Name: <strong>@ (or www)</strong></div>
          <div>Value: <strong>publications.getjaime.io</strong></div>
        </div>
      </div>
    </TenantLayout>
  );
}
