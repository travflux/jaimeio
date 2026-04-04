import React from "react";
import TenantLayout from "@/layouts/TenantLayout";

export default function TenantFeedPerformance() {
  return (
    <TenantLayout pageTitle="Feed Performance" pageSubtitle="How your feeds are performing" section="Content">

      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Feed Performance</h3>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Performance data will appear once your source feeds have generated articles.</p>
      </div>
    </TenantLayout>
  );
}
