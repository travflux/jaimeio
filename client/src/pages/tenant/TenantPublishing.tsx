import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { HelpCircle, ExternalLink, Eye, EyeOff } from "lucide-react";

function Tip({ text }: { text: string }) {
  const [v, setV] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <HelpCircle size={13} style={{ color: "#9ca3af", cursor: "pointer", marginLeft: 4 }}
        onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)} onClick={() => setV(x => !x)} />
      {v && <span style={{ position: "absolute", left: 20, top: 0, zIndex: 50, width: 260, background: "#fff", color: "#374151", fontSize: 12, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb", padding: 12, lineHeight: 1.5, pointerEvents: "auto" }}
        onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)}>{text}</span>}
    </span>
  );
}
function KBLink({ url, label }: { url: string; label: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#2dd4bf", textDecoration: "none", marginTop: 12 }}><ExternalLink size={11} /> {label}</a>;
}
function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (<div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 24, marginBottom: 16 }}><h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{title}</h2><p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>{desc}</p>{children}</div>);
}
function Toggle({ label, desc, tooltip, checked, onChange }: { label: string; desc: string; tooltip: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}><div><div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center" }}>{label}<Tip text={tooltip} /></div><div style={{ fontSize: 11, color: "#9ca3af" }}>{desc}</div></div>
    <button onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: checked ? "#2dd4bf" : "#d1d5db", position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} /></button></div>);
}
const SS: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" };

const TIMEZONES = ["America/Los_Angeles","America/Denver","America/Chicago","America/New_York","America/Anchorage","Pacific/Honolulu","America/Phoenix","America/Boise","America/Detroit","America/Indiana/Indianapolis","UTC","Europe/London","Europe/Paris","Europe/Berlin","Europe/Moscow","Asia/Dubai","Asia/Kolkata","Asia/Singapore","Asia/Tokyo","Asia/Shanghai","Australia/Sydney","Pacific/Auckland"];

export default function TenantPublishing() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation({ onSuccess: () => toast.success("Publishing settings saved") });
  useEffect(() => { if (init) setS(init); }, [init]);
  const upd = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };

  return (
    <TenantLayout pageTitle="Publishing" pageSubtitle="Approval, scheduling, and content rules" section="Settings" saveAction={handleSave}>
      <Section title="Approval Workflow" desc="Control how articles move from draft to published.">
        <Toggle label="Auto-Publish Articles" desc="Publish without manual review" tooltip="When enabled, AI articles publish automatically. When disabled, every article requires manual approval." checked={s.auto_publish === "true"} onChange={v => upd("auto_publish", v ? "true" : "false")} />
        <Toggle label="Require Featured Image" desc="Block publishing without an image" tooltip="Articles cannot publish without a featured image." checked={s.require_featured_image === "true"} onChange={v => upd("require_featured_image", v ? "true" : "false")} />
        <Toggle label="IndexNow on Publish" desc="Notify search engines instantly" tooltip="Automatically notify Google, Bing, Yandex when articles publish. Speeds up indexing." checked={s.indexnow_on_publish !== "false"} onChange={v => upd("indexnow_on_publish", v ? "true" : "false")} />
        <KBLink url="https://knowledgebase.getjaime.io/knowledge-base/auto-publish-vs-manual-approval/" label="Read: Auto-Publish vs Manual Approval" />
      </Section>

      <Section title="Publishing Schedule" desc="When articles generate and publish.">
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Timezone <Tip text="Used for daily limits, batch dates, and scheduled publishing." /></label>
          <select style={SS} value={s.workflow_timezone || "America/Los_Angeles"} onChange={e => upd("workflow_timezone", e.target.value)}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Publish Window Start <Tip text="Earliest hour articles can auto-publish." /></label>
            <select style={SS} value={s.publish_window_start || "6"} onChange={e => upd("publish_window_start", e.target.value)}>
              {Array.from({length:24},(_,i)=>i).map(h => <option key={h} value={String(h)}>{String(h).padStart(2,"0")}:00</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Publish Window End <Tip text="Latest hour articles can auto-publish." /></label>
            <select style={SS} value={s.publish_window_end || "22"} onChange={e => upd("publish_window_end", e.target.value)}>
              {Array.from({length:24},(_,i)=>i).map(h => <option key={h} value={String(h)}>{String(h).padStart(2,"0")}:00</option>)}
            </select>
          </div>
        </div>
        <KBLink url="https://knowledgebase.getjaime.io/knowledge-base/setting-publication-timezone/" label="Read: Setting Publication Timezone" />
      </Section>

      <Section title="Content Rules" desc="Quality controls for generated articles.">
        <Toggle label="Enable Deduplication" desc="Prevent duplicate topics within 7 days" tooltip="Prevents the AI from writing about the same topic twice." checked={s.headline_dedup_enabled !== "false"} onChange={v => upd("headline_dedup_enabled", v ? "true" : "false")} />
        <Toggle label="Category Clustering" desc="Spread articles across categories" tooltip="Distributes articles evenly across categories per day." checked={s.category_quotas_enabled === "true"} onChange={v => upd("category_quotas_enabled", v ? "true" : "false")} />
        <Toggle label="Cross-Batch Memory" desc="Remember topics across days" tooltip="Remembers recent topics to avoid repetition across multiple days." checked={s.cross_batch_memory_enabled !== "false"} onChange={v => upd("cross_batch_memory_enabled", v ? "true" : "false")} />
      </Section>
    </TenantLayout>
  );
}
