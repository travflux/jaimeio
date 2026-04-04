import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Copy } from "lucide-react";

export default function TenantSEO() {
  const { licenseId, settings: init, isLoading } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  useEffect(() => { if (init) setS(init); }, [init]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };

  if (isLoading) return <TenantLayout pageTitle="SEO Settings" section="SEO & GEO"><p style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading...</p></TenantLayout>;

  const previewTitle = (s.meta_title_template || "{title} | {site}").replace("{title}", "Sample Article").replace("{site}", s.brand_site_name || "Publication");

  const Toggle = ({ k, label, helper }: { k: string; label: string; helper?: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
      <div><div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>{helper && <div style={{ fontSize: 11, color: "#9ca3af" }}>{helper}</div>}</div>
      <button onClick={() => update(k, s[k] === "true" ? "false" : "true")}
        style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s[k] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
        <span style={{ position: "absolute", top: 2, left: s[k] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

  return (
    <TenantLayout pageTitle="SEO Settings" pageSubtitle="Search engine optimization and indexing" section="SEO & GEO" saveAction={handleSave}>
      {/* Meta Defaults */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Meta Defaults</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Meta Title Template</label>
          <input value={s.meta_title_template || ""} onChange={e => update("meta_title_template", e.target.value)} placeholder="{title} | {site}" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Variables: {"{title}"} {"{site}"} {"{category}"}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Default Meta Description <span style={{ fontSize: 10, color: "#9ca3af" }}>({(s.brand_description || "").length}/160)</span></label>
          <textarea value={s.brand_description || ""} onChange={e => update("brand_description", e.target.value)} rows={2} maxLength={160} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Default OG Image URL</label>
          <input value={s.brand_og_image || ""} onChange={e => update("brand_og_image", e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Google Analytics ID</label>
            <input value={s.google_analytics_id || ""} onChange={e => update("google_analytics_id", e.target.value)} placeholder="G-XXXXXXXXXX" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Google Tag Manager ID</label>
            <input value={s.google_tag_manager_id || ""} onChange={e => update("google_tag_manager_id", e.target.value)} placeholder="GTM-XXXXXXX" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          </div>
        </div>
        {/* Google Preview */}
        <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Google Search Preview:</div>
          <div style={{ fontSize: 16, color: "#1a0dab", fontFamily: "arial" }}>{previewTitle}</div>
          <div style={{ fontSize: 12, color: "#006621" }}>https://{hostname}/article/example</div>
          <div style={{ fontSize: 13, color: "#545454" }}>{(s.brand_description || "").substring(0, 160) || "Article description will appear here..."}</div>
        </div>
      </div>

      {/* IndexNow */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>IndexNow</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Notify search engines immediately when new articles are published.</p>
        <Toggle k="indexnow_auto_submit" label="Auto-submit on publish" helper="Automatically notify search engines when articles are published" />
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>IndexNow Key</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={s.indexnow_key || ""} onChange={e => update("indexnow_key", e.target.value)} placeholder="Auto-generated UUID" style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace" }} readOnly />
            <button onClick={() => copyToClipboard(s.indexnow_key || "")} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}><Copy size={14} /></button>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Key file served at: https://{hostname}/{s.indexnow_key || "[key]"}.txt</div>
        </div>
      </div>

      {/* Sitemap */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sitemap</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", background: "#f9fafb", borderRadius: 6 }}>
          <span style={{ fontSize: 13, fontFamily: "monospace", flex: 1 }}>https://{hostname}/sitemap.xml</span>
          <button onClick={() => copyToClipboard("https://" + hostname + "/sitemap.xml")} style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer" }}><Copy size={12} /></button>
        </div>
        <Toggle k="sitemap_include_articles" label="Include Articles" helper="Add all published articles to sitemap" />
        <Toggle k="sitemap_include_categories" label="Include Categories" helper="Add category pages to sitemap" />
        <Toggle k="sitemap_include_tags" label="Include Tags" helper="Add tag pages to sitemap" />
      </div>

      {/* Robots.txt */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Robots.txt</h3>
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {[["allow", "Allow All"], ["block", "Block All"], ["custom", "Custom"]].map(([v, l]) => (
            <button key={v} onClick={() => update("robots_txt_mode", v)} style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer",
              borderColor: (s.robots_txt_mode || "allow") === v ? "#111827" : "#e5e7eb",
              background: (s.robots_txt_mode || "allow") === v ? "#111827" : "#fff",
              color: (s.robots_txt_mode || "allow") === v ? "#fff" : "#6b7280",
            }}>{l}</button>
          ))}
        </div>
        {s.robots_txt_mode === "custom" && (
          <textarea value={s.robots_txt_custom || ""} onChange={e => update("robots_txt_custom", e.target.value)} rows={4} placeholder="User-agent: *\nAllow: /" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace", resize: "vertical" }} />
        )}
      </div>

      {/* Google Search Console */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Google Search Console</h3>
        {[
          ["gsc_client_id", "Client ID"],
          ["gsc_client_secret", "Client Secret"],
          ["gsc_refresh_token", "Refresh Token"],
          ["gsc_site_identifier", "Site Identifier"],
        ].map(([k, label]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{label}</label>
            <input type="password" value={s[k] || ""} onChange={e => update(k, e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          </div>
        ))}
      </div>
    </TenantLayout>
  );
}
