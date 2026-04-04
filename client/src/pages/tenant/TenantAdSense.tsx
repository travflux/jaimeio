import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { HelpCircle } from "lucide-react";

function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 4 }}>
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(!show)}
        style={{ width: 16, height: 16, borderRadius: "50%", background: "#e5e7eb", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        <HelpCircle size={10} style={{ color: "#6b7280" }} />
      </button>
      {show && (
        <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#111827", color: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 12, lineHeight: 1.5, width: 260, zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {text}
        </div>
      )}
    </span>
  );
}

export default function TenantAdSense() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  useEffect(() => { if (init) setS(init); }, [init]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };

  return (
    <TenantLayout pageTitle="Google AdSense" pageSubtitle="Ad unit configuration" section="Monetization" saveAction={handleSave}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>AdSense Setup</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>AdSense Enabled</span>
          <button onClick={() => update("adsense_enabled", s.adsense_enabled === "true" ? "false" : "true")}
            style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s.adsense_enabled === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
            <span style={{ position: "absolute", top: 2, left: s.adsense_enabled === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", marginBottom: 4 }}>
            Publisher ID <Tip text="Your unique Google AdSense account identifier. Starts with ca-pub- followed by numbers. Find it in AdSense under Account > Account information." />
          </label>
          <input value={s.adsense_publisher_id || ""} onChange={e => update("adsense_publisher_id", e.target.value)} placeholder="ca-pub-XXXXXXXXXXXXXXXX"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
        </div>
      </div>
      {s.adsense_enabled === "true" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Ad Units</h3>
          {[
            ["adsense_unit_header", "Header Banner", "Appears at the top of every page, above your masthead. Highest visibility. Recommended: 728x90 Leaderboard or 970x90 Billboard."],
            ["adsense_unit_sidebar", "Sidebar", "Appears in the right sidebar next to article content. Recommended: 300x250 Medium Rectangle."],
            ["adsense_unit_article", "In-Article", "Appears inside article body after the 3rd paragraph. Highest click-through rate. Recommended: responsive ad unit."],
            ["adsense_unit_footer", "Footer", "Appears at the bottom before footer. Recommended: 728x90 Leaderboard."],
          ].map(([k, label, tip]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", marginBottom: 4 }}>
                {label} Ad Unit <Tip text={tip} />
              </label>
              <input value={s[k] || ""} onChange={e => update(k, e.target.value)} placeholder="Ad unit ID"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
            </div>
          ))}
        </div>
      )}
    </TenantLayout>
  );
}
