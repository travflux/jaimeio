import React from "react";
import TenantLayout from "@/layouts/TenantLayout";

export default function TenantRevenue() {
  return (
    <TenantLayout pageTitle="Revenue Dashboard" pageSubtitle="Revenue across all monetization sources" section="Monetization">

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[["Total Revenue", "$0"], ["AdSense", "Not configured"], ["Amazon", "Not configured"], ["Sponsors", "Not configured"]].map(([l, v]) => (
          <div key={l} style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Configure AdSense, Amazon Affiliate, or Sponsorship to track revenue.</p>
      </div>
    </TenantLayout>
  );
}
