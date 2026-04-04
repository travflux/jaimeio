import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

const HEADING_FONTS = ["Playfair Display","Cormorant Garamond","Merriweather","Lora","Libre Baskerville","EB Garamond","Crimson Text","DM Serif Display","Fraunces","Bodoni Moda","Spectral","Cinzel","Abril Fatface","Josefin Slab","Arvo"];
const BODY_FONTS = ["Inter","DM Sans","Nunito","Open Sans","Lato","Poppins","Raleway","Source Sans Pro","Work Sans","Mulish","Outfit","Plus Jakarta Sans","Roboto","Montserrat","Jost"];

const TEMPLATES = [
  { id: "editorial", name: "Editorial", desc: "Classic newspaper style. Clean columns, strong typography.", bg: "#f8f8f8" },
  { id: "magazine", name: "Magazine", desc: "Colorful and dynamic. Large imagery, bold layouts.", bg: "#faf0e6" },
  { id: "modern", name: "Modern", desc: "Minimal and sharp. Card-based layouts, ample white space.", bg: "#f0f4ff" },
  { id: "minimal", name: "Minimal", desc: "Pure content focus. No distractions, maximum readability.", bg: "#fafafa" },
  { id: "bold", name: "Bold", desc: "High contrast, large type, strong imagery.", bg: "#1a1a1a", textColor: "#fff" },
  { id: "corporate", name: "Corporate", desc: "Professional and trustworthy. Structured layouts.", bg: "#f0f4f8" },
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
    <TenantLayout pageTitle="Branding" pageSubtitle="Publication identity, logos, colors, and fonts" section="Overview" saveAction={handleSave}>

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
