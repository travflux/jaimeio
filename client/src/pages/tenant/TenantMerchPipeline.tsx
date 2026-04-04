import React from "react";
import TenantLayout from "@/layouts/TenantLayout";

export default function TenantMerchPipeline() {
  return (
    <TenantLayout pageTitle="Merch Pipeline" pageSubtitle="Orders and analytics from your shop" section="Monetization">

      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Merch Pipeline</h3>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Configure Printify in Merch Store settings to see orders and analytics here.</p>
      </div>
    </TenantLayout>
  );
}
