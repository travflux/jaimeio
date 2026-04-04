import React from "react";
import TenantLayout from "@/layouts/TenantLayout";

export default function TenantSourceManager() {
  return (
    <TenantLayout pageTitle="Source Manager" pageSubtitle="Manage all content sources" section="Content">

      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Source Manager</h3>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Manage RSS feeds, X Listening, and YouTube sources from one place.</p>
      </div>
    </TenantLayout>
  );
}
