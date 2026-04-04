import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { X } from "lucide-react";

const PLANS = [
  { id: "essential", name: "Essential", price: "$149/mo", pages: "100 pages/month", features: ["AI content generation", "1 publication", "Email newsletter", "Basic analytics"] },
  { id: "standard", name: "Standard", price: "$249/mo", pages: "250 pages/month", features: ["Everything in Essential", "Social distribution", "GEO optimization", "Priority support"] },
  { id: "professional", name: "Professional", price: "$497/mo", pages: "500 pages/month", features: ["Everything in Standard", "API access", "Custom domain", "Advanced analytics"] },
  { id: "enterprise", name: "Enterprise", price: "Contact us", pages: "Unlimited pages", features: ["Everything in Professional", "Sub-licenses (reseller)", "Dedicated support", "Custom integrations"] },
];

export default function TenantBilling() {
  const [showPanel, setShowPanel] = useState(false);
  const currentPlan = "professional";

  return (
    <TenantLayout pageTitle="Billing" pageSubtitle="Plan, invoices, and payment management" section="Overview">
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Current Plan</h3>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Professional</div>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>$497 / month</div>
        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "#d1fae5", color: "#065f46" }}>Active</span>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={() => setShowPanel(true)} style={{ padding: "8px 16px", borderRadius: 6, background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>Change Plan</button>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Invoice History</h3>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>No invoices yet. Invoices will appear here once billing is configured.</p>
      </div>

      {showPanel && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 60 }} onClick={() => setShowPanel(false)} />
          <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 480, maxWidth: "100vw", background: "#fff", zIndex: 70, display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Change Your Plan</h2>
              <button onClick={() => setShowPanel(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {PLANS.map(plan => (
                <div key={plan.id} style={{ border: plan.id === currentPlan ? "2px solid #2dd4bf" : "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 12, position: "relative" }}>
                  {plan.id === currentPlan && <span style={{ position: "absolute", top: 8, right: 8, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "#d1fae5", color: "#065f46" }}>Current Plan</span>}
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{plan.name}</div>
                  <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>{plan.price}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>{plan.pages}</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                    {plan.features.map(f => <li key={f} style={{ fontSize: 12, color: "#6b7280", padding: "2px 0" }}>• {f}</li>)}
                  </ul>
                  {plan.id !== currentPlan && (
                    <button onClick={() => plan.id === "enterprise" ? window.open("mailto:sales@getjaime.io") : setShowPanel(false)}
                      style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {plan.id === "enterprise" ? "Contact Us" : PLANS.indexOf(plan) > PLANS.findIndex(p => p.id === currentPlan) ? "Upgrade" : "Downgrade"}
                    </button>
                  )}
                </div>
              ))}
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12 }}>Changes take effect immediately. Need help? Contact support@janicco.com</p>
            </div>
          </div>
        </>
      )}
    </TenantLayout>
  );
}
