import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantNotifications() {
  const { licenseId, settings: initSettings } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();

  useEffect(() => { if (initSettings) setS(initSettings); }, [initSettings]);

  const update = (key: string, value: string) => setS(prev => ({ ...prev, [key]: value }));
  const handleSave = async () => {
    if (!licenseId) return;
    await saveMut.mutateAsync({ licenseId, settings: s });
  };

  return (
    <TenantLayout pageTitle="Notifications" pageSubtitle="Configure alert preferences" section="Overview" saveAction={handleSave}>
      
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>Email Alerts</h3>
          
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Workflow completed</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Get notified when a workflow run finishes</div>
              </div>
              <button onClick={() => update("notify_workflow_complete", s["notify_workflow_complete"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["notify_workflow_complete"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["notify_workflow_complete"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Articles pending review</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Get notified when new articles are waiting</div>
              </div>
              <button onClick={() => update("notify_pending_articles", s["notify_pending_articles"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["notify_pending_articles"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["notify_pending_articles"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Workflow failed</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Get alerted if a workflow run fails</div>
              </div>
              <button onClick={() => update("notify_workflow_failed", s["notify_workflow_failed"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["notify_workflow_failed"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["notify_workflow_failed"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Page limit warning</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Get notified at 80% of page limit</div>
              </div>
              <button onClick={() => update("notify_page_limit_warning", s["notify_page_limit_warning"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["notify_page_limit_warning"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["notify_page_limit_warning"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Subscriber milestones</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Notifications at 100, 500, 1000, 5000</div>
              </div>
              <button onClick={() => update("notify_subscriber_milestone", s["notify_subscriber_milestone"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["notify_subscriber_milestone"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["notify_subscriber_milestone"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#111827" }}>Delivery</h3>
          
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Alert Email</label>
              <input value={s["notification_email"] || ""} onChange={e => update("notification_email", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Leave blank to use billing contact email</div>
            </div>
        </div>
    </TenantLayout>
  );
}
