import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantMerchStore() {
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
    <TenantLayout pageTitle="Merch Store" pageSubtitle="Printify shop configuration" section="Monetization" saveAction={handleSave}>
      
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>Shop Status</h3>
          
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Shop Enabled</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Creates a /shop page on your publication</div>
              </div>
              <button onClick={() => update("merch_enabled", s["merch_enabled"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["merch_enabled"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["merch_enabled"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>Printify Configuration</h3>
          
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Printify API Key</label>
              <input type="password" value={s["printify_api_key"] || ""} onChange={e => update("printify_api_key", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Shop ID</label>
              <input value={s["printify_shop_id"] || ""} onChange={e => update("printify_shop_id", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Shop Title</label>
              <input value={s["merch_shop_title"] || ""} onChange={e => update("merch_shop_title", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Shop Description</label>
              <textarea value={s["merch_shop_description"] || ""} onChange={e => update("merch_shop_description", e.target.value)} rows={3}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
              
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Show in Navigation</div>
                
              </div>
              <button onClick={() => update("merch_show_in_nav", s["merch_show_in_nav"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["merch_show_in_nav"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["merch_show_in_nav"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Nav Label</label>
              <input value={s["merch_nav_label"] || ""} onChange={e => update("merch_nav_label", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Default: Shop</div>
            </div>
        </div>
    </TenantLayout>
  );
}
