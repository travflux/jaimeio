import React from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantWhiteLabel() {
  const { settings } = useTenantContext();

  return (
    <TenantLayout pageTitle="White Label" pageSubtitle="Custom portal branding for your clients" section="Account">
      <div style={{ background: "#fff", borderRadius: 8, padding: 32, border: "1px solid #e5e7eb", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🏷️</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>White Label Settings</h2>
        <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 400, margin: "0 auto" }}>
          Custom portal branding, domain configuration, and client management tools are coming in a future update.
        </p>
      </div>
    </TenantLayout>
  );
}
