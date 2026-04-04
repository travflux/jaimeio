import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantDistribution() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  useEffect(() => { if (init) setS(init); }, [init]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };

  const template = s.blotato_post_template || "{headline}\n\n{url}";
  const preview = template.replace("{headline}", "Your Article Headline Here").replace("{url}", "https://example.com/article/sample").replace("{summary}", "A brief excerpt...").replace("{category}", "Category");

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      <button onClick={() => update(k, s[k] === "true" ? "false" : "true")}
        style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s[k] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
        <span style={{ position: "absolute", top: 2, left: s[k] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );

  return (
    <TenantLayout pageTitle="Distribution" pageSubtitle="Blotato social media integration" section="Social Media" saveAction={handleSave}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Blotato Connection</h3>
        <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>API Key</label>
        <input type="password" value={s.blotato_api_key || ""} onChange={e => update("blotato_api_key", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Platforms</h3>
        <Toggle k="blotato_x_enabled" label="X / Twitter" />
        <Toggle k="blotato_instagram_enabled" label="Instagram" />
        <Toggle k="blotato_linkedin_enabled" label="LinkedIn" />
        <Toggle k="blotato_facebook_enabled" label="Facebook" />
        <Toggle k="blotato_threads_enabled" label="Threads" />
      </div>
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Post Template</h3>
        <textarea value={s.blotato_post_template || ""} onChange={e => update("blotato_post_template", e.target.value)} rows={3}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical", marginBottom: 8 }} placeholder="{headline}\n{url}" />
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>Variables: {"{headline}"} {"{url}"} {"{summary}"} {"{category}"}</div>
        <div style={{ background: "#f9fafb", padding: 12, borderRadius: 6, fontSize: 12, color: "#374151", whiteSpace: "pre-wrap" }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#6b7280" }}>Preview:</div>
          {preview}
        </div>
      </div>
    </TenantLayout>
  );
}
