import React, { useState, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantCommunications() {
  const { licenseId, settings: initSettings } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();

  useEffect(() => { if (initSettings) setS(initSettings); }, [initSettings]);

  const update = (key: string, value: string) => setS(prev => ({ ...prev, [key]: value }));
  const [testEmail, setTestEmail] = useState("");
  const sendTestMut = trpc.newsletter.sendTest.useMutation({
    onSuccess: (result: any) => {
      if (result.success) { toast.success("Test email sent! Check your inbox."); setTestEmail(""); }
      else { toast.error("Send failed", { description: result.error }); }
    },
    onError: (err: any) => toast.error("Send failed", { description: err.message }),
  });
  const handleSave = async () => {
    if (!licenseId) return;
    await saveMut.mutateAsync({ licenseId, settings: s });
  };

  return (
    <TenantLayout pageTitle="Communications" pageSubtitle="Email and SMS configuration" section="Settings" saveAction={handleSave}>
      <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>
        <a href="/admin/settings" style={{ color: "#9ca3af", textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.color = "#374151")} onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>Settings</a>
        <span>›</span>
        <span style={{ color: "#374151" }}>Communications</span>
      </nav>
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Email (Resend)</h3>
            <a href="https://resend.com/dashboard" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              Resend Dashboard ↗
            </a>
          </div>
          
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Email Enabled</div>
                
              </div>
              <button onClick={() => update("resend_enabled", s["resend_enabled"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["resend_enabled"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["resend_enabled"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Resend API Key</label>
              <input type="password" value={s["resend_api_key"] || ""} onChange={e => update("resend_api_key", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Resend Segment ID</label>
              <input value={s["resend_segment_id"] || ""} onChange={e => update("resend_segment_id", e.target.value)}
                placeholder="d0b4c034-15fc-4afe-8a7f-7e4ae2864a9b"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff", fontFamily: "monospace" }} />
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Found in Resend → Audiences → Segments. Newsletter sends target this segment.</p>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>From Name</label>
              <input value={s["resend_from_name"] || ""} onChange={e => update("resend_from_name", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>From Email</label>
              <input value={s["resend_from_email"] || ""} onChange={e => update("resend_from_email", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>SMS (Twilio)</h3>
            <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              Twilio Console ↗
            </a>
          </div>
          
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>SMS Enabled</div>
                
              </div>
              <button onClick={() => update("twilio_enabled", s["twilio_enabled"] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s["twilio_enabled"] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: s["twilio_enabled"] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Twilio Account SID</label>
              <input type="password" value={s["twilio_account_sid"] || ""} onChange={e => update("twilio_account_sid", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Twilio Auth Token</label>
              <input type="password" value={s["twilio_auth_token"] || ""} onChange={e => update("twilio_auth_token", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Twilio From Number</label>
              <input value={s["twilio_from_number"] || ""} onChange={e => update("twilio_from_number", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }} />
              
            </div>
        </div>

      {/* Newsletter Template */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginTop: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Newsletter Template</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Choose the visual style for your newsletter emails</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { name: "editorial", label: "Editorial", desc: "Classic newspaper style with serif masthead", color: "#111827" },
            { name: "modern", label: "Modern", desc: "Card-based with gradient header", color: "#1e3a5f" },
            { name: "magazine", label: "Magazine", desc: "Image-heavy with bold typography", color: "#92400e" },
            { name: "minimal", label: "Minimal", desc: "Text-only, ultra-clean layout", color: "#6b7280" },
            { name: "bold", label: "Bold", desc: "Dark background with bright accents", color: "#000" },
            { name: "corporate", label: "Corporate", desc: "Professional B2B layout", color: "#0f2d5e" },
          ].map(t => (
            <button key={t.name} onClick={() => { update("newsletter_template", t.name); if (licenseId) { saveMut.mutate({ licenseId, settings: { ...s, newsletter_template: t.name } }); try { alert("Template saved: " + t.label); } catch {} } }}
              style={{ border: (s.newsletter_template || "editorial") === t.name ? "2px solid #2dd4bf" : "1px solid #e5e7eb", borderRadius: 8, padding: 0, cursor: "pointer", background: "#fff", textAlign: "left", overflow: "hidden", position: "relative" }}>
              {(s.newsletter_template || "editorial") === t.name && <span style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}>✓</span>}
              <div style={{ height: 40, background: t.color }} />
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.label}</div>
                <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.3 }}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>


      {/* Send Test Email */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginTop: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Send Test Email</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Verify your email configuration by sending a test message</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            onKeyDown={e => { if (e.key === "Enter" && testEmail.includes("@")) sendTestMut.mutate({ toEmail: testEmail }); }}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          <button onClick={() => sendTestMut.mutate({ toEmail: testEmail })}
            disabled={sendTestMut.isPending || !testEmail.includes("@")}
            style={{ padding: "8px 16px", borderRadius: 6, background: sendTestMut.isPending ? "#9ca3af" : "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {sendTestMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Test</>}
          </button>
        </div>
      </div>
    </TenantLayout>
  );
}
