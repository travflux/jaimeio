import React from "react";
import TenantLayout from "@/layouts/TenantLayout";

export default function TenantSocialPerformance() {
  return (
    <TenantLayout pageTitle="Social Performance" pageSubtitle="Analytics from social distribution" section="Social Media">

      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Social Performance</h3>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Connect Blotato and publish articles to see social performance metrics here.</p>
      </div>
    </TenantLayout>
  );
}
