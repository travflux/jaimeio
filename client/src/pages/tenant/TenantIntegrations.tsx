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

interface KeyField { key: string; label: string; tooltip: string; getUrl?: string; getLabel?: string; placeholder?: string; }

const GROUPS: Array<{ title: string; desc: string; fields: KeyField[] }> = [
  { title: "AI & Content Generation", desc: "API keys for article and image generation.", fields: [
    { key: "anthropic_api_key", label: "Anthropic API Key", tooltip: "Claude AI — highest quality.", getUrl: "https://console.anthropic.com", getLabel: "Get Anthropic key" },
    { key: "groq_api_key", label: "Groq API Key", tooltip: "Llama 3.3 — fastest and cheapest.", getUrl: "https://console.groq.com", getLabel: "Get Groq key (free)" },
    { key: "openai_api_key", label: "OpenAI API Key", tooltip: "GPT-4o + DALL-E 3.", getUrl: "https://platform.openai.com/api-keys", getLabel: "Get OpenAI key" },
    { key: "gemini_api_key", label: "Gemini API Key", tooltip: "Google Gemini + Imagen.", getUrl: "https://aistudio.google.com", getLabel: "Get Gemini key (free)" },
    { key: "replicate_api_key", label: "Replicate API Key", tooltip: "Image generation via FLUX.", getUrl: "https://replicate.com/account/api-tokens", getLabel: "Get Replicate key" },
  ]},
  { title: "Distribution & Communications", desc: "Social media and email services.", fields: [
    { key: "blotato_api_key", label: "Blotato API Key", tooltip: "Connects all social accounts.", getUrl: "https://blotato.com/?ref=jaime", getLabel: "Get Blotato key" },
    { key: "resend_api_key", label: "Resend API Key", tooltip: "Email newsletter delivery.", getUrl: "https://resend.com", getLabel: "Get Resend key (free)" },
    { key: "resend_audience_id", label: "Resend Audience ID", tooltip: "Subscribers are synced to this audience. Found in Resend → Audiences.", placeholder: "d0b4c034-15fc-4afe-..." },
  ]},
  { title: "Analytics & Search", desc: "Track performance and search visibility.", fields: [
    { key: "google_analytics_id", label: "Google Analytics ID", tooltip: "GA4 measurement ID (G-XXXXXXXX).", getUrl: "https://analytics.google.com", getLabel: "Set up Analytics", placeholder: "G-XXXXXXXXXX" },
    { key: "indexnow_key", label: "IndexNow API Key", tooltip: "Instant search engine notification on publish.", placeholder: "UUID format" },
  ]},
];

export default function TenantIntegrations() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation({ onSuccess: () => toast.success("Integrations saved") });
  useEffect(() => { if (init) setS(init); }, [init]);
  const upd = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };

  return (
    <TenantLayout pageTitle="Integrations" pageSubtitle="All API keys and third-party connections" section="Settings" saveAction={handleSave}>
      {GROUPS.map(group => (
        <Section key={group.title} title={group.title} desc={group.desc}>
          {group.fields.map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>{f.label} <Tip text={f.tooltip} /></label>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input type={show[f.key] ? "text" : "password"} value={s[f.key] || ""} onChange={e => upd(f.key, e.target.value)}
                    placeholder={f.placeholder || "Enter " + f.label} style={{ ...SS, paddingRight: 36, fontFamily: "monospace", fontSize: 12 }} />
                  <button onClick={() => setShow(p => ({ ...p, [f.key]: !p[f.key] }))} style={{ position: "absolute", right: 8, top: 7, background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                    {show[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                {f.getUrl && <a href={f.getUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>{f.getLabel || "Get key"} <ExternalLink size={10} /></a>}
                {s[f.key] && <span style={{ fontSize: 10, color: "#22c55e" }}>Configured</span>}
              </div>
            </div>
          ))}
        </Section>
      ))}
      <div style={{ marginTop: 24, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 13, color: "#6b7280" }}>Looking for monetization settings?{" "}<a href="/admin/monetization" style={{ color: "#2dd4bf", textDecoration: "underline" }}>Go to Settings → Monetization</a></p>
      </div>
    </TenantLayout>
  );
}
