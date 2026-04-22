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

const PRESETS = [
  ["Photorealistic","Professional editorial photography, natural lighting, clean composition, magazine quality"],
  ["Illustrated","Modern illustration style, bold colors, flat design, editorial illustration"],
  ["Luxury","Luxury editorial photography, dramatic lighting, rich textures, premium aesthetic"],
  ["Bold","Bold graphic design, strong typography influence, high contrast colors, modern"],
  ["Minimalist","Clean minimalist photography, white space, simple composition, neutral tones"],
];

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "8px 40px 8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: show ? "inherit" : "monospace", background: "#fff", boxSizing: "border-box" }} />
      <button onClick={() => setShow(s => !s)} type="button"
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 12, padding: "2px 4px" }}>
        {show ? "hide" : "show"}
      </button>
    </div>
  );
}

export default function TenantImageSettings() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation({ onSuccess: () => toast.success("Image settings saved") });
  useEffect(() => { if (init) setS(init); }, [init]);
  const upd = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };

  return (
    <TenantLayout pageTitle="Images" pageSubtitle="Image generation provider, style, and rules" section="Settings" saveAction={handleSave}>
      <Section title="Image Generation" desc="Choose how article images are created.">
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Provider <Tip text="Which AI generates images. Replicate uses FLUX. DALL-E 3 is high quality. Gemini is fast." /></label>
          <select style={SS} value={s.image_provider || "replicate"} onChange={e => upd("image_provider", e.target.value)}>
            {[["replicate","Replicate (FLUX)"],["openai","DALL-E 3 (OpenAI)"],["gemini","Gemini Imagen"],["grok","Grok Aurora"],["none","None"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Provider API Credentials */}
        {(s.image_provider === "replicate" || (!s.image_provider)) && (
          <div style={{ marginBottom: 12, marginTop: 12, padding: 14, background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Replicate API Token</label>
            <PasswordInput value={s.image_provider_replicate_api_key || ""} onChange={v => upd("image_provider_replicate_api_key", v)} placeholder="r8_..." />
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Get your token at <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>replicate.com → Account → API Tokens</a></div>
          </div>
        )}
        {s.image_provider === "openai" && (
          <div style={{ marginBottom: 12, marginTop: 12, padding: 14, background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>OpenAI API Key</label>
            <PasswordInput value={s.image_provider_openai_api_key || ""} onChange={v => upd("image_provider_openai_api_key", v)} placeholder="sk-..." />
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>platform.openai.com → API Keys</a></div>
          </div>
        )}
        {s.image_provider === "gemini" && (
          <div style={{ marginBottom: 12, marginTop: 12, padding: 12, background: "#E1F5EE", borderRadius: 8, border: "1px solid #9FE1CB", fontSize: 12, color: "#085041", lineHeight: 1.5 }}>
            Gemini uses the GEMINI_API_KEY environment variable configured on the server. No additional key entry needed here.
          </div>
        )}
        {s.image_provider === "grok" && (
          <div style={{ marginBottom: 12, marginTop: 12, padding: 12, background: "#E1F5EE", borderRadius: 8, border: "1px solid #9FE1CB", fontSize: 12, color: "#085041", lineHeight: 1.5 }}>
            Grok uses the XAI_API_KEY environment variable configured on the server. No additional key entry needed here.
          </div>
        )}
        {s.image_provider === "custom" && (
          <div style={{ marginBottom: 12, marginTop: 12, padding: 14, background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Custom API URL</label>
              <input value={s.image_provider_custom_api_url || ""} onChange={e => upd("image_provider_custom_api_url", e.target.value)} placeholder="https://your-api.com/generate" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Custom API Key</label>
              <PasswordInput value={s.image_provider_custom_api_key || ""} onChange={v => upd("image_provider_custom_api_key", v)} placeholder="your-api-key" />
            </div>
          </div>
        )}
        {s.image_provider === "none" && (
          <div style={{ marginBottom: 12, marginTop: 12, padding: 12, background: "#FAEEDA", borderRadius: 8, border: "1px solid #F5D89A", fontSize: 12, color: "#78590A", lineHeight: 1.5 }}>
            Image generation is disabled. Select a provider above to enable it.
          </div>
        )}

        <Toggle label="Auto-Generate Images" desc="Every article gets an image automatically" tooltip="When enabled, every generated article automatically gets a featured image." checked={s.auto_generate_images !== "false"} onChange={v => upd("auto_generate_images", v ? "true" : "false")} />
        <KBLink url="https://knowledgebase.getjaime.io/knowledge-base/how-image-generation-works/" label="Read: How Image Generation Works" />
      </Section>

      <Section title="Image Style" desc="Define the visual style for all generated images.">
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Style Prompt <Tip text="Describe the visual style. Added to every generation request." /></label>
          <textarea style={{ ...SS, resize: "vertical", marginTop: 4 }} rows={3} value={s.image_style_prompt || ""} onChange={e => upd("image_style_prompt", e.target.value)} placeholder="e.g. Professional editorial photography, natural lighting, clean backgrounds" />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {PRESETS.map(([name, prompt]) => (
            <button key={name} onClick={() => upd("image_style_prompt", prompt)} style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer", color: "#6b7280" }}>{name}</button>
          ))}
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Negative Prompt <Tip text="Tell the AI what to avoid. Common: text, watermarks, logos, blurry." /></label>
          <textarea style={{ ...SS, resize: "vertical", marginTop: 4 }} rows={2} value={s.image_negative_prompt || ""} onChange={e => upd("image_negative_prompt", e.target.value)} placeholder="e.g. text, watermarks, logos, blurry, low quality" />
        </div>
      </Section>

      <Section title="Image Rules" desc="Size, format, and watermark settings.">
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Aspect Ratio <Tip text="Default shape. 16:9 works best for most layouts." /></label>
          <select style={SS} value={s.image_aspect_ratio || "16:9"} onChange={e => upd("image_aspect_ratio", e.target.value)}>
            {[["16:9","16:9 Landscape"],["1:1","1:1 Square"],["4:3","4:3 Standard"],["9:16","9:16 Portrait"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <Toggle label="Add Watermark" desc="Overlay logo on generated images" tooltip="Overlay your publication logo on all images for brand recognition." checked={s.watermark_enabled === "true"} onChange={v => upd("watermark_enabled", v ? "true" : "false")} />
        {s.watermark_enabled === "true" && (
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Watermark Position</label>
            <select style={SS} value={s.watermark_position || "bottom-right"} onChange={e => upd("watermark_position", e.target.value)}>
              {[["bottom-right","Bottom Right"],["bottom-left","Bottom Left"],["top-right","Top Right"],["top-left","Top Left"],["center","Center"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}
      </Section>
    </TenantLayout>
  );
}
