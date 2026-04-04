import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantIndexSettings() {
  const { licenseId, settings: initSettings } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();

  useEffect(() => { if (initSettings) setS(initSettings); }, [initSettings]);

  const update = (key: string, value: string) => setS(prev => ({ ...prev, [key]: value }));
  const handleSave = async () => {
    if (!licenseId) return;
    await saveMut.mutateAsync({ licenseId, settings: s });
  };

  return (
    <TenantLayout pageTitle="Index Settings" pageSubtitle="IndexNow, Analytics, Clarity, Search Console" section="SEO & GEO" saveAction={handleSave}>
      
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>IndexNow</h3>
          
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>IndexNow Enabled</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Notify search engines when articles publish</div>
              </div>
              <button onClick={() => update("indexnow_enabled", s["indexnow_enabled"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["indexnow_enabled"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["indexnow_enabled"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>IndexNow API Key</label>
              <input value={s["indexnow_key"] || ""} onChange={e => update("indexnow_key", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>Google Analytics 4</h3>
          
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>GA4 Measurement ID</label>
              <input value={s["ga4_id"] || ""} onChange={e => update("ga4_id", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Format: G-XXXXXXXXXX</div>
            </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>Microsoft Clarity</h3>
          
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Clarity Project ID</label>
              <input value={s["clarity_id"] || ""} onChange={e => update("clarity_id", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>From clarity.microsoft.com</div>
            </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>Google Search Console</h3>
          
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Verification Meta Tag</label>
              <input value={s["gsc_verification_meta"] || ""} onChange={e => update("gsc_verification_meta", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Paste the content= value</div>
            </div>
        </div>
    </TenantLayout>
  );
}
