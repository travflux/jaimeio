import React from "react";
import TenantLayout from "@/layouts/TenantLayout";

export default function TenantSponsorAttribution() {
  return (
    <TenantLayout pageTitle="Sponsor Attribution" pageSubtitle="Sponsor click and performance tracking" section="Monetization">

      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sponsor Attribution</h3>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Configure a sponsor in Sponsorship settings to see click and performance data here.</p>
      </div>
    </TenantLayout>
  );
}
