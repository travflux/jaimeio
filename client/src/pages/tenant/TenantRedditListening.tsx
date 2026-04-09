import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantRedditListening() {
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
    <TenantLayout pageTitle="Reddit Listening" pageSubtitle="Monitor Reddit for content ideas and trending discussions" section="Content" saveAction={handleSave}>

        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>Reddit Monitoring</h3>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Reddit Listening Enabled</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Monitor Reddit for content ideas and trending discussions</div>
              </div>
              <button onClick={() => update("reddit_listener_enabled", s["reddit_listener_enabled"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["reddit_listener_enabled"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["reddit_listener_enabled"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>

            {s["reddit_listener_enabled"] === "true" && (
              <div style={{ background: "#d1fae5", border: "1px solid #a7f3d0", borderRadius: 8, padding: 12, marginTop: 8, marginBottom: 12, fontSize: 13, color: "#065f46" }}>
                Reddit listening uses the public Reddit JSON API -- no API keys required.
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Subreddits to Monitor</label>
              <textarea value={s["reddit_listener_subreddits"] || ""} onChange={e => update("reddit_listener_subreddits", e.target.value)} rows={4}
                placeholder={"r/ultrarunning\nr/trailrunning\nr/running"}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Enter subreddit names one per line. Include the r/ prefix. Max 50 subreddits.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Keywords to Track</label>
              <textarea value={s["reddit_listener_keywords"] || ""} onChange={e => update("reddit_listener_keywords", e.target.value)} rows={3}
                placeholder={"trail running\nultramarathon\ngear review"}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Reddit posts containing these keywords will be added to your candidate pool. One per line.</div>
            </div>
        </div>
    </TenantLayout>
  );
}
