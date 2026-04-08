import React from "react";
import TenantLayout from "@/layouts/TenantLayout";

export default function ResellerMissionControl() {
  return (
    <TenantLayout pageTitle="Client Management" pageSubtitle="Manage your sub-tenant publications" section="Account">
      <div style={{ background: "#fff", borderRadius: 8, padding: 32, border: "1px solid #e5e7eb", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Client Management</h2>
        <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 400, margin: "0 auto" }}>
          Reseller client management, sub-tenant provisioning, and white-label configuration tools are coming in a future update.
        </p>
      </div>
    </TenantLayout>
  );
}
