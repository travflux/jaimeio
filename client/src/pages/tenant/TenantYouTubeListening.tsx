import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantYouTubeListening() {
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
    <TenantLayout pageTitle="YouTube Listening" pageSubtitle="Monitor YouTube channels for content" section="Content" saveAction={handleSave}>
      
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>YouTube Monitoring</h3>
          
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>YouTube Listening Enabled</div>
                
              </div>
              <button onClick={() => update("youtube_listening_enabled", s["youtube_listening_enabled"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["youtube_listening_enabled"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["youtube_listening_enabled"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Keywords</label>
              <input value={s["youtube_listening_keywords"] || ""} onChange={e => update("youtube_listening_keywords", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>One keyword per line</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>YouTube Channel IDs</label>
              <textarea value={s["youtube_listening_channels"] || ""} onChange={e => update("youtube_listening_channels", e.target.value)} rows={3}
                placeholder="UCxxxxxxxxxxxxxxxxxxxxxx (one per line)"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>One channel ID per line (UCxxxxxxxxxxxxxxxxxxxxxxxxx). Find yours in YouTube Studio → Settings → Channel → Basic Info</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Max Videos per Run</label>
              <input type="number" value={s["youtube_listening_max_videos"] || ""} onChange={e => update("youtube_listening_max_videos", e.target.value)}
                style={{ width: 120, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>1-20</div>
            </div>
            {s["youtube_listening_enabled"] === "true" && (
              <div style={{ marginTop: 16, padding: 16, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#111827" }}>API Key</h4>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>YouTube Data API Key</label>
                  <input type="password" value={s["youtube_api_key"] || ""} onChange={e => update("youtube_api_key", e.target.value)}
                    placeholder="Enter your YouTube Data API v3 key"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace" }} />
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    Get your API key from the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>Google Cloud Console</a>. Enable the YouTube Data API v3 in your project.
                  </div>
                </div>
              </div>
            )}
        </div>
    </TenantLayout>
  );
}
