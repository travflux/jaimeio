import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { HelpCircle, ExternalLink, Eye, EyeOff } from "lucide-react";

function Tip({ text }: { text: string }) {
  const [v, setV] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <HelpCircle size={13} style={{ color: "#9ca3af", cursor: "pointer", marginLeft: 4 }}
        onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)} onClick={() => setV(x => !x)} />
      {v && <span style={{ position: "absolute", left: 20, top: 0, zIndex: 50, width: 260, background: "#fff", color: "#374151", fontSize: 12, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb", padding: 12, lineHeight: 1.5, pointerEvents: "auto" }}
        onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)}>{text}</span>}
    </span>
  );
}
function KBLink({ url, label }: { url: string; label: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#2dd4bf", textDecoration: "none", marginTop: 12 }}><ExternalLink size={11} /> {label}</a>;
}
function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 24, marginBottom: 16 }}><h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{title}</h2><p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>{desc}</p>{children}</div>);
}
function Toggle({ label, desc, tooltip, checked, onChange }: { label: string; desc: string; tooltip: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}><div><div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center" }}>{label}<Tip text={tooltip} /></div><div style={{ fontSize: 11, color: "#9ca3af" }}>{desc}</div></div>
    <button onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: checked ? "#2dd4bf" : "#d1d5db", position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} /></button></div>);
}
const SS: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" };

export default function TenantDesignTheme() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation({ onSuccess: () => toast.success("Design settings saved") });
  useEffect(() => { if (init) setS(init); }, [init]);
  const upd = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };

  return (
    <TenantLayout pageTitle="Design & Theme" pageSubtitle="Template, masthead, and homepage layout" section="Settings" saveAction={handleSave}>
      <Section title="Publication Template" desc="Choose the overall layout of your publication.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }} className="dt-grid">
          {[["editorial","Editorial","News, finance, real estate"],["magazine","Magazine","Lifestyle, fashion, culture"],["modern","Modern","Tech, startups, SaaS"],["minimal","Minimal","Writers, essayists"],["corporate","Corporate","B2B, professional services"],["creative","Personal / Creative","Bloggers, creators"]].map(([id,name,desc]) => (
            <div key={id} onClick={() => upd("brand_template", id)} style={{ padding: 12, borderRadius: 8, border: (s.brand_template || "editorial") === id ? "2px solid #2dd4bf" : "1px solid #e5e7eb", cursor: "pointer", background: (s.brand_template || "editorial") === id ? "#f0fdfa" : "#fff" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{desc}</div>
            </div>
          ))}
        </div>
        <KBLink url="https://knowledgebase.getjaime.io/knowledge-base/choosing-your-publication-template/" label="Read: Choosing Your Template" />
      </Section>

      <Section title="Masthead Layout" desc="Controls for the top navigation area.">
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Logo Position <Tip text="Where your logo appears. Center for lifestyle, left for news." /></label>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>{["left","center","right"].map(v => (
            <button key={v} onClick={() => upd("masthead_logo_position", v)} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer", textTransform: "capitalize", borderColor: (s.masthead_logo_position || "center") === v ? "#2dd4bf" : "#e5e7eb", background: (s.masthead_logo_position || "center") === v ? "#f0fdfa" : "#fff", color: (s.masthead_logo_position || "center") === v ? "#0d9488" : "#6b7280" }}>{v}</button>
          ))}</div>
        </div>
        <Toggle label="Show Tagline" desc="Tagline text below publication name" tooltip="Show or hide the tagline in the masthead." checked={s.masthead_show_tagline !== "false"} onChange={v => upd("masthead_show_tagline", v ? "true" : "false")} />
        <Toggle label="Show Date" desc="Current date in the masthead" tooltip="Common in news publications." checked={s.masthead_show_date !== "false"} onChange={v => upd("masthead_show_date", v ? "true" : "false")} />
        <Toggle label="Show Search" desc="Search icon in navigation" tooltip="Search icon in the masthead nav bar." checked={s.masthead_show_search !== "false"} onChange={v => upd("masthead_show_search", v ? "true" : "false")} />
        <Toggle label="Breaking News Ticker" desc="Scrolling headline ticker" tooltip="Scrolling ticker with recent headlines. Disable for cleaner minimal designs." checked={s.breaking_ticker_enabled !== "false"} onChange={v => upd("breaking_ticker_enabled", v ? "true" : "false")} />
      </Section>

      <Section title="Homepage Sections" desc="Toggle which sections appear on your homepage.">
        <Toggle label="Hero Article" desc="Large featured article at the top" tooltip="The large featured article at the top of the homepage." checked={s.homepage_show_hero !== "false"} onChange={v => upd("homepage_show_hero", v ? "true" : "false")} />
        <Toggle label="Latest News Grid" desc="Grid of recent articles" tooltip="The grid of recent articles below the hero." checked={s.homepage_show_grid !== "false"} onChange={v => upd("homepage_show_grid", v ? "true" : "false")} />
        <Toggle label="Sidebar" desc="Right sidebar with newsletter and most-read" tooltip="Disable for a full-width layout." checked={s.homepage_show_sidebar !== "false"} onChange={v => upd("homepage_show_sidebar", v ? "true" : "false")} />
        <Toggle label="Newsletter Bar" desc="Email signup bar above footer" tooltip="Email signup bar above the footer." checked={s.homepage_show_newsletter_bar !== "false"} onChange={v => upd("homepage_show_newsletter_bar", v ? "true" : "false")} />
        <Toggle label="Trending Section" desc="Currently trending articles" tooltip="Section showing trending articles." checked={s.homepage_show_trending !== "false"} onChange={v => upd("homepage_show_trending", v ? "true" : "false")} />
        <KBLink url="https://knowledgebase.getjaime.io/knowledge-base/controlling-homepage-sections/" label="Read: Controlling Homepage Sections" />
      </Section>
      <style>{`@media (max-width: 640px) { .dt-grid { grid-template-columns: 1fr !important; } }`}</style>
    </TenantLayout>
  );
}
