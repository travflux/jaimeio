import React from "react";
import TenantLayout from "@/layouts/TenantLayout";

export default function TenantTicket() {
  return (
    <TenantLayout pageTitle="Support Ticket" pageSubtitle="Submit a support request" section="Support">

      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Submit Support Ticket</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Subject</label>
          <input style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} placeholder="Brief description of your issue" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Priority</label>
            <select style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
              <option>Low</option><option>Normal</option><option>High</option><option>Urgent</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Category</label>
            <select style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
              <option>Technical</option><option>Billing</option><option>Content</option><option>Feature Request</option><option>Other</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Description</label>
          <textarea rows={5} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} placeholder="Describe your issue in detail..." />
        </div>
        <button style={{ padding: "10px 20px", borderRadius: 6, background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>Submit Ticket</button>
      </div>
    </TenantLayout>
  );
}
