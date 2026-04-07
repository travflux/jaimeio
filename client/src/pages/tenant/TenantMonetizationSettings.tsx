import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantMonetizationSettings() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();

  useEffect(() => { if (init) setS(init); }, [init]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };

  const Toggle = ({ k }: { k: string }) => (
    <button onClick={() => update(k, s[k] === "true" ? "false" : "true")}
      style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s[k] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
      <span style={{ position: "absolute", top: 2, left: s[k] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );

  return (
    <TenantLayout pageTitle="Monetization" pageSubtitle="Configure revenue streams and API credentials" section="Overview" saveAction={handleSave}>

      {/* Google AdSense */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Google AdSense</h3>
          <a href="https://adsense.google.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>AdSense Dashboard ↗</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", marginBottom: 12 }}>
          <div><div style={{ fontSize: 13, fontWeight: 500 }}>Enable AdSense</div><div style={{ fontSize: 11, color: "#9ca3af" }}>Display Google ads on your publication</div></div>
          <Toggle k="adsense_enabled" />
        </div>
        {[
          ["adsense_publisher_id", "Publisher ID", "pub-xxxxxxxxxxxxxxxx"],
          ["adsense_client_id", "Ad Client ID", "ca-pub-xxxxxxxxxxxxxxxx"],
          ["adsense_slot_id", "Ad Slot ID (optional)", "xxxxxxxxxx"],
        ].map(([key, label, placeholder]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{label}</label>
            <input value={s[key] || ""} onChange={e => update(key, e.target.value)} placeholder={placeholder}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace" }} />
          </div>
        ))}
      </div>

      {/* Amazon Associates */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Amazon Associates</h3>
          <a href="https://affiliate-program.amazon.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>Associates Central ↗</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", marginBottom: 12 }}>
          <div><div style={{ fontSize: 13, fontWeight: 500 }}>Enable Amazon Associates</div><div style={{ fontSize: 11, color: "#9ca3af" }}>Earn commissions from product recommendations</div></div>
          <Toggle k="amazon_enabled" />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Associate Tag</label>
          <input value={s.amazon_associate_tag || ""} onChange={e => update("amazon_associate_tag", e.target.value)} placeholder="yourtag-20"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace" }} />
        </div>
      </div>

      {/* Printify Merch */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Merch Store (Printify)</h3>
          <a href="https://printify.com/app/dashboard" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>Printify Dashboard ↗</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", marginBottom: 12 }}>
          <div><div style={{ fontSize: 13, fontWeight: 500 }}>Enable Merch Store</div><div style={{ fontSize: 11, color: "#9ca3af" }}>Sell branded merchandise through your publication</div></div>
          <Toggle k="printify_enabled" />
        </div>
        {[
          ["printify_api_key", "Printify API Key", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "password"],
          ["printify_shop_id", "Shop ID", "12345678", "text"],
        ].map(([key, label, placeholder, type]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{label}</label>
            <input type={type} value={s[key] || ""} onChange={e => update(key, e.target.value)} placeholder={placeholder}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace" }} />
          </div>
        ))}
      </div>

      {/* Sponsorship */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Sponsorship</h3>
          <a href="/admin/sponsor-schedule" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>Manage Schedule ↗</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", marginBottom: 12 }}>
          <div><div style={{ fontSize: 13, fontWeight: 500 }}>Enable Sponsorship</div><div style={{ fontSize: 11, color: "#9ca3af" }}>Show sponsor bars and branded content</div></div>
          <Toggle k="sponsor_enabled" />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Advertising Contact Email</label>
          <input type="email" value={s.sponsor_contact_email || ""} onChange={e => update("sponsor_contact_email", e.target.value)} placeholder="advertising@nikijames.com"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Shown on your Advertise page and in media kit</p>
        </div>
      </div>
    </TenantLayout>
  );
}
