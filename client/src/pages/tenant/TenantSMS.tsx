import React, { useState, useEffect } from "react";
import { MessageSquare, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

type TemplateType = "newsletter_url" | "breaking_news" | "custom";

interface SmsTemplate {
  id: number;
  name: string;
  templateText: string;
  templateType: TemplateType;
  isActive: boolean;
  sendDelayMinutes: number;
}

interface EditorState {
  id?: number;
  name: string;
  templateText: string;
  templateType: TemplateType;
  sendDelayMinutes: number;
}

const EMPTY_EDITOR: EditorState = {
  name: "",
  templateText: "",
  templateType: "newsletter_url",
  sendDelayMinutes: 0,
};

const TYPE_LABELS: Record<TemplateType, string> = {
  newsletter_url: "Newsletter URL",
  breaking_news: "Breaking News",
  custom: "Custom",
};

const TYPE_COLORS: Record<TemplateType, string> = {
  newsletter_url: "#2dd4bf",
  breaking_news: "#ef4444",
  custom: "#8b5cf6",
};

const VARIABLES = ["{site_name}", "{newsletter_url}", "{article_title}", "{site_url}"];

export default function TenantSMS() {
  const { licenseId, settings } = useTenantContext();
  const [showSmsConfig, setShowSmsConfig] = useState(false);
  const [smsConfig, setSmsConfig] = useState({ sms_enabled: '', twilio_account_sid: '', twilio_auth_token: '', twilio_from_number: '' });
  const saveSmsConfigMut = trpc.licenseSettings.setBulk.useMutation({ onSuccess: () => toast.success("SMS settings saved") });

  useEffect(() => {
    if (settings) setSmsConfig({
      sms_enabled: settings.sms_enabled || 'false',
      twilio_account_sid: settings.twilio_account_sid || '',
      twilio_auth_token: settings.twilio_auth_token || '',
      twilio_from_number: settings.twilio_from_number || '',
    });
  }, [settings]);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const utils = trpc.useUtils();

  const templatesQuery = trpc.smsTemplates.getTemplates.useQuery();
  const templates: SmsTemplate[] = (templatesQuery.data as any)?.templates || [];

  const saveMut = trpc.smsTemplates.saveTemplate.useMutation({
    onSuccess: () => {
      toast.success(editor?.id ? "Template updated" : "Template created");
      utils.smsTemplates.getTemplates.invalidate();
      setEditor(null);
    },
    onError: (err: any) => toast.error("Save failed", { description: err.message }),
  });

  const deleteMut = trpc.smsTemplates.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      utils.smsTemplates.getTemplates.invalidate();
    },
    onError: (err: any) => toast.error("Delete failed", { description: err.message }),
  });

  const handleSave = () => {
    if (!editor) return;
    if (!editor.name.trim()) { toast.error("Template name is required"); return; }
    if (!editor.templateText.trim()) { toast.error("Message text is required"); return; }
    saveMut.mutate({
      id: editor.id,
      name: editor.name,
      templateText: editor.templateText,
      templateType: editor.templateType,
      sendDelayMinutes: editor.sendDelayMinutes,
    });
  };

  const handleEdit = (t: SmsTemplate) => {
    setEditor({ id: t.id, name: t.name, templateText: t.templateText, templateType: t.templateType, sendDelayMinutes: t.sendDelayMinutes });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this template?")) return;
    deleteMut.mutate({ id });
  };

  const charCount = editor ? editor.templateText.length : 0;
  const overLimit = charCount > 160;

  return (
    <TenantLayout
      pageTitle="SMS Templates"
      pageSubtitle="Manage automated SMS messages sent to subscribers"
      section="Distribution"
      headerActions={
        <button
          onClick={() => setEditor(EMPTY_EDITOR)}
          style={{ height: 34, padding: "0 14px", background: "#111827", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> New Template
        </button>
      }
    >
      {/* Header icon row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare size={20} color="#16a34a" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>SMS Templates</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Create and manage reusable SMS message templates</div>
        </div>
      </div>

      {/* Variables reference bar */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Variables:</span>
        {VARIABLES.map(v => (
          <code key={v} style={{ fontSize: 11, background: "#e2e8f0", color: "#0f172a", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>{v}</code>
        ))}
      </div>


      {/* SMS Settings — collapsible */}
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 16, overflow: "hidden" }}>
        <button onClick={() => setShowSmsConfig(!showSmsConfig)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>SMS Settings</span>
          </div>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{showSmsConfig ? "\u25be" : "\u25b8"} {smsConfig.sms_enabled === "true" ? "Enabled" : "Disabled"}</span>
        </button>
        {showSmsConfig && (
          <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>Enable SMS</div></div>
              <button onClick={() => setSmsConfig(p => ({ ...p, sms_enabled: p.sms_enabled === "true" ? "false" : "true" }))}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: smsConfig.sms_enabled === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
                <span style={{ position: "absolute", top: 2, left: smsConfig.sms_enabled === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            {smsConfig.sms_enabled === "true" && [
              { key: "twilio_account_sid", label: "Twilio Account SID", type: "text", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
              { key: "twilio_auth_token", label: "Twilio Auth Token", type: "password", placeholder: "Your auth token" },
              { key: "twilio_from_number", label: "From Number", type: "text", placeholder: "+1234567890" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={(smsConfig as any)[f.key] || ""} onChange={e => setSmsConfig(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: f.type === "password" ? "monospace" : "inherit" }} />
              </div>
            ))}
            <button onClick={() => { if (licenseId) saveSmsConfigMut.mutate({ licenseId, settings: smsConfig }); }}
              disabled={saveSmsConfigMut.isPending}
              style={{ marginTop: 8, padding: "8px 16px", background: "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saveSmsConfigMut.isPending ? "Saving..." : "Save SMS Settings"}
            </button>
          </div>
        )}
      </div>

      {/* Inline editor */}
      {editor && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
            {editor.id ? "Edit Template" : "New Template"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4, color: "#374151" }}>Template Name</label>
              <input
                value={editor.name}
                onChange={e => setEditor(prev => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="e.g. Newsletter Dispatch"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4, color: "#374151" }}>Type</label>
              <select
                value={editor.templateType}
                onChange={e => setEditor(prev => prev ? { ...prev, templateType: e.target.value as TemplateType } : prev)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" }}>
                <option value="newsletter_url">Newsletter URL</option>
                <option value="breaking_news">Breaking News</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {editor.templateType === "newsletter_url" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4, color: "#374151" }}>Send Delay (minutes after publish)</label>
              <input
                type="number"
                min={0}
                value={editor.sendDelayMinutes}
                onChange={e => setEditor(prev => prev ? { ...prev, sendDelayMinutes: parseInt(e.target.value) || 0 } : prev)}
                style={{ width: 160, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Message</label>
              <span style={{ fontSize: 11, color: overLimit ? "#ef4444" : "#6b7280", fontWeight: overLimit ? 600 : 400 }}>
                {charCount}/160{overLimit ? " — over limit" : ""}
              </span>
            </div>
            <textarea
              value={editor.templateText}
              onChange={e => setEditor(prev => prev ? { ...prev, templateText: e.target.value } : prev)}
              placeholder="Type your SMS message. Use variables like {site_name} or {newsletter_url}"
              rows={4}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: overLimit ? "1px solid #ef4444" : "1px solid #e5e7eb", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
            />
            {overLimit && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
                Message exceeds 160 characters and may be split into multiple SMS segments.
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saveMut.isPending}
              style={{ height: 34, padding: "0 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saveMut.isPending ? 0.6 : 1 }}>
              {saveMut.isPending ? "Saving..." : "Save Template"}
            </button>
            <button
              onClick={() => setEditor(null)}
              style={{ height: 34, padding: "0 14px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {templatesQuery.isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <MessageSquare size={32} color="#d1d5db" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 4 }}>No SMS templates yet</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Click &quot;New Template&quot; to create your first SMS template.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {templates.map((t: SmsTemplate) => {
            const tLen = t.templateText.length;
            const tColor = TYPE_COLORS[t.templateType] || "#6b7280";
            const tLabel = TYPE_LABELS[t.templateType] || t.templateType;
            return (
              <div key={t.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{t.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: tColor + "22", color: tColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {tLabel}
                    </span>
                    {t.templateType === "newsletter_url" && t.sendDelayMinutes > 0 && (
                      <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
                        +{t.sendDelayMinutes}m delay
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => handleEdit(t)}
                      style={{ height: 30, padding: "0 10px", background: "#f3f4f6", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#374151" }}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{ height: 30, padding: "0 10px", background: "#fff0f0", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#ef4444" }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#374151", background: "#f9fafb", borderRadius: 6, padding: "10px 12px", marginBottom: 6, lineHeight: 1.5 }}>
                  {t.templateText}
                </div>
                <div style={{ fontSize: 11, color: tLen > 160 ? "#ef4444" : "#9ca3af" }}>
                  {tLen} characters{tLen > 160 ? " (multi-segment)" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TenantLayout>
  );
}
