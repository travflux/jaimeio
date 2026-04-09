import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantXListening() {
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
    <TenantLayout pageTitle="X Listening" pageSubtitle="Monitor X/Twitter for article topics" section="Content" saveAction={handleSave}>
      
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>X/Twitter Monitoring</h3>
          
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>X Listening Enabled</div>
                
              </div>
              <button onClick={() => update("x_listening_enabled", s["x_listening_enabled"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["x_listening_enabled"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["x_listening_enabled"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Keywords</label>
              <input value={s["x_listening_keywords"] || ""} onChange={e => update("x_listening_keywords", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Comma-separated keywords to monitor</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Accounts to Monitor</label>
              <textarea value={s["x_listening_accounts"] || ""} onChange={e => update("x_listening_accounts", e.target.value)} rows={3}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>One @handle per line</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Min Engagement</label>
              <input type="number" value={s["x_listening_min_engagement"] || ""} onChange={e => update("x_listening_min_engagement", e.target.value)}
                style={{ width: 120, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Only surface posts with X+ likes</div>
            </div>
            {s["x_listening_enabled"] === "true" && (
              <div style={{ marginTop: 16, padding: 16, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#111827" }}>API Credentials</h4>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>Required for X/Twitter API access. Get these from <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>developer.twitter.com</a></div>
                {[
                  ["x_api_key", "API Key"],
                  ["x_api_secret", "API Secret"],
                  ["x_access_token", "Access Token"],
                  ["x_access_token_secret", "Access Token Secret"],
                ].map(([key, label]) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{label}</label>
                    <input type="password" value={s[key] || ""} onChange={e => update(key, e.target.value)}
                      placeholder={"Enter " + label.toLowerCase()}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace" }} />
                  </div>
                ))}
              </div>
            )}
        </div>
    </TenantLayout>
  );
}
