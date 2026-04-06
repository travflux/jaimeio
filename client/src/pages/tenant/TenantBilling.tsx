import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";

const PLANS = [
  { key: "starter", name: "Essential", price: 9.95, articles: 100, productId: "prod_UBhIt9OYFXKi6K",
    features: ["100 articles/month", "1 publication", "All 6 templates", "Social distribution", "Newsletter", "SEO & GEO"] },
  { key: "professional", name: "Professional", price: 7.95, articles: 500, productId: "prod_UBhJUW1IxzCU0y", popular: true,
    features: ["500 articles/month", "1 publication", "All 6 templates", "Social distribution", "Newsletter", "SEO & GEO", "Priority support", "Custom domain"] },
];

export default function TenantBilling() {
  const [changing, setChanging] = useState<string | null>(null);
  const { data } = trpc.billing.getStatus.useQuery();
  const changeMut = trpc.billing.changePlan.useMutation({
    onSuccess: () => { toast.success("Plan updated"); setChanging(null); },
    onError: (e: any) => { toast.error(e.message); setChanging(null); },
  });

  const currentPlan = data?.plan || "professional";
  const used = data?.articlesUsedThisMonth || 0;
  const limit = data?.articlesLimit || 500;

  return (
    <TenantLayout pageTitle="Billing & Plan" pageSubtitle="Manage your subscription and usage" section="Account">
      {/* Usage */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>This Month</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Articles Generated</p>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{used}</p>
            <p style={{ fontSize: 11, color: "#9ca3af" }}>of {limit} included</p>
            <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: used/limit > 0.9 ? "#ef4444" : used/limit > 0.7 ? "#f59e0b" : "#22c55e", width: Math.min(100, Math.round(used/limit*100)) + "%", transition: "width 0.3s" }} />
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Current Plan</p>
            <p style={{ fontSize: 24, fontWeight: 700, textTransform: "capitalize" }}>{currentPlan === "starter" ? "Essential" : currentPlan}</p>
            <p style={{ fontSize: 11, color: "#9ca3af" }}>${PLANS.find(p => p.key === currentPlan)?.price || "—"}/month</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Billing</p>
            <a href="mailto:billing@getjaime.io" style={{ fontSize: 12, color: "#2dd4bf", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}><ExternalLink size={12} /> Contact billing</a>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {PLANS.map(plan => {
          const isCurrent = plan.key === currentPlan;
          return (
            <div key={plan.key} style={{ background: "#fff", border: isCurrent ? "2px solid #2dd4bf" : "1px solid #e5e7eb", borderRadius: 12, padding: 24, position: "relative" }}>
              {isCurrent && <span style={{ position: "absolute", top: -10, left: 16, background: "#2dd4bf", color: "#0f2d5e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>Current Plan</span>}
              {plan.popular && !isCurrent && <span style={{ position: "absolute", top: -10, left: 16, background: "#f3f4f6", color: "#6b7280", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, border: "1px solid #e5e7eb" }}>Most Popular</span>}
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 700 }}>${plan.price}</span>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>/month</span>
              </div>
              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>{plan.articles} articles per month</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: "#22c55e", marginTop: 2 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => { if (!isCurrent) { setChanging(plan.key); changeMut.mutate({ planKey: plan.key, stripeProductId: plan.productId }); } }}
                disabled={isCurrent || changing === plan.key}
                style={{ width: "100%", height: 40, borderRadius: 6, border: isCurrent ? "1px solid #e5e7eb" : "none", background: isCurrent ? "#fff" : "#111827", color: isCurrent ? "#9ca3af" : "#fff", fontSize: 13, fontWeight: 600, cursor: isCurrent ? "default" : "pointer" }}>
                {changing === plan.key ? <><Loader2 size={14} className="animate-spin" /> Updating...</> : isCurrent ? "Current Plan" : "Switch to " + plan.name}
              </button>
            </div>
          );
        })}
      </div>

      {/* Enterprise */}
      <div style={{ background: "linear-gradient(135deg, #f0fdfa, #ecfdf5)", border: "1px solid #99f6e4", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Enterprise</h3>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>$6,950/month — unlimited publications, 1,000 articles, white label reselling</p>
        </div>
        <a href="mailto:sales@getjaime.io?subject=Enterprise Plan Inquiry" style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#111827", textDecoration: "none" }}>Contact Sales</a>
      </div>
    </TenantLayout>
  );
}
