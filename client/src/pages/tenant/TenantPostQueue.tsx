import React from "react";
import TenantLayout from "@/layouts/TenantLayout";

export default function TenantPostQueue() {
  return (
    <TenantLayout pageTitle="Post Queue" pageSubtitle="Scheduled social media posts" section="Social Media">

      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Post Queue</h3>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Posts are auto-created when articles publish. Configure Blotato in Distribution settings.</p>
      </div>
    </TenantLayout>
  );
}
