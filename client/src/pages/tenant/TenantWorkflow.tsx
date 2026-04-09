import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TenantWorkflow() {
  const { licenseId, settings: initSettings } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  const recentRunsQuery = trpc.workflow.getRecentRuns.useQuery(undefined, { staleTime: 30000 });

  useEffect(() => { if (initSettings) setS(initSettings); }, [initSettings]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));

  const saveSection = async (keys: string[]) => {
    if (!licenseId) return;
    const settings: Record<string, string> = {};
    for (const k of keys) if (s[k] !== undefined) settings[k] = s[k];
    await saveMut.mutateAsync({ licenseId, settings });
    toast.success("Settings saved");
  };

  const isEnabled = s.workflow_enabled === "true";
  const runNowMut = trpc.workflow.runProductionLoop.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Workflow complete: ${data.articlesGenerated} articles generated`);
      recentRunsQuery.refetch();
    },
    onError: (err: any) => { toast.error("Workflow failed: " + err.message); },
  });

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange}
      style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: value ? "#2dd4bf" : "#d1d5db", position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );

  const Section = ({ title, children, onSave }: { title: string; children: React.ReactNode; onSave?: () => void }) => (
    <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
        {onSave && (
          <button onClick={onSave} disabled={saveMut.isPending}
            style={{ padding: "6px 14px", borderRadius: 6, background: "#111827", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: saveMut.isPending ? 0.6 : 1 }}>
            {saveMut.isPending ? "Saving..." : "Save"}
          </button>
        )}
      </div>
      {children}
    </div>
  );

  const SettingRow = ({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {helper && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{helper}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <TenantLayout pageTitle="Production Loop" pageSubtitle="Content production pipeline and scheduling" section="Content Engine">
      {/* 1. Content Production */}
      <Section title="Content Production" onSave={() => saveSection(["workflow_enabled", "max_daily_articles"])}>
        <SettingRow label="Enable Content Production" helper="Toggle the automated production loop on or off">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: isEnabled ? "#22c55e" : "#9ca3af" }} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>{isEnabled ? "ON" : "OFF"}</span>
            <Toggle value={isEnabled} onChange={() => update("workflow_enabled", isEnabled ? "false" : "true")} />
          </div>
        </SettingRow>
        <SettingRow label="Max Daily Articles" helper="Maximum articles to generate per day">
          <input type="number" min={1} max={50} value={s.max_daily_articles || "10"} onChange={e => update("max_daily_articles", e.target.value)}
            style={{ width: 80, padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, textAlign: "center" }} />
        </SettingRow>
        <div style={{ marginTop: 16 }}>
          <button onClick={() => { runNowMut.mutate(); }} disabled={runNowMut.isPending}
            style={{ width: "100%", height: 40, background: "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: runNowMut.isPending ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {runNowMut.isPending ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Running...</> : "Run Now"}
          </button>
          {runNowMut.isSuccess && <p style={{ fontSize: 12, color: "#22c55e", marginTop: 8 }}>Workflow completed successfully</p>}
          {runNowMut.isError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>Workflow failed to run</p>}
        </div>
      </Section>

      {/* 2. Approval Workflow */}
      <Section title="Approval Workflow" onSave={() => saveSection(["approval_required", "auto_publish"])}>
        <SettingRow label="Approval Required" helper="Articles need manual review before publishing">
          <Toggle value={s.approval_required === "true"} onChange={() => update("approval_required", s.approval_required === "true" ? "false" : "true")} />
        </SettingRow>
        <SettingRow label="Auto-Publish" helper="Automatically publish approved articles">
          <Toggle value={s.auto_publish === "true"} onChange={() => update("auto_publish", s.auto_publish === "true" ? "false" : "true")} />
        </SettingRow>
      </Section>

      {/* 3. Content Rules */}
      <Section title="Content Rules" onSave={() => saveSection(["min_score_to_publish", "require_featured_image", "require_geo"])}>
        <SettingRow label="Minimum Score to Publish" helper="Candidates below this score are skipped (0.0 - 1.0)">
          <input type="number" min={0} max={1} step={0.05} value={s.min_score_to_publish || "0.40"} onChange={e => update("min_score_to_publish", e.target.value)}
            style={{ width: 80, padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, textAlign: "center" }} />
        </SettingRow>
        <SettingRow label="Require Featured Image" helper="Articles must have an image before publishing">
          <Toggle value={s.require_featured_image === "true"} onChange={() => update("require_featured_image", s.require_featured_image === "true" ? "false" : "true")} />
        </SettingRow>
        <SettingRow label="Require GEO Summary" helper="Articles must have a GEO summary before publishing">
          <Toggle value={s.require_geo === "true"} onChange={() => update("require_geo", s.require_geo === "true" ? "false" : "true")} />
        </SettingRow>
      </Section>

      {/* 4. Schedule */}
      <Section title="Schedule" onSave={() => saveSection(["runs_per_day", "run_time_1", "run_time_2", "run_time_3", "workflow_timezone", "publish_window_start", "publish_window_end"])}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Runs Per Day</label>
          <div style={{ display: "flex", gap: 4 }}>
            {["1", "2", "3"].map(n => (
              <button key={n} onClick={() => update("runs_per_day", n)} style={{
                padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "1px solid", cursor: "pointer",
                borderColor: (s.runs_per_day || "1") === n ? "#111827" : "#e5e7eb", background: (s.runs_per_day || "1") === n ? "#111827" : "#fff", color: (s.runs_per_day || "1") === n ? "#fff" : "#6b7280",
              }}>{n}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Run Time 1</label>
          <input type="time" value={s.run_time_1 || "07:00"} onChange={e => update("run_time_1", e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
        </div>
        {(parseInt(s.runs_per_day || "1") >= 2) && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Run Time 2</label>
            <input type="time" value={s.run_time_2 || "14:00"} onChange={e => update("run_time_2", e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          </div>
        )}
        {(parseInt(s.runs_per_day || "1") >= 3) && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Run Time 3</label>
            <input type="time" value={s.run_time_3 || "20:00"} onChange={e => update("run_time_3", e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Timezone</label>
          <input value={s.workflow_timezone || "America/Los_Angeles"} onChange={e => update("workflow_timezone", e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Publish Window Start (hour)</label>
            <input type="number" min={0} max={23} value={s.publish_window_start || "6"} onChange={e => update("publish_window_start", e.target.value)}
              style={{ width: 80, padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, textAlign: "center" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Publish Window End (hour)</label>
            <input type="number" min={0} max={23} value={s.publish_window_end || "22"} onChange={e => update("publish_window_end", e.target.value)}
              style={{ width: 80, padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, textAlign: "center" }} />
          </div>
        </div>
      </Section>

      {/* 5. Recent Runs */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recent Runs</h3>
        {recentRunsQuery.isLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}><Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#9ca3af" }} /></div>
        ) : (recentRunsQuery.data || []).length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 13 }}>No recent runs. Enable workflow and it will run on schedule, or click Run Now above.</p>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Date</th>
              <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Articles</th>
              <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Status</th>
            </tr></thead>
            <tbody>
              {(recentRunsQuery.data || []).map((b: any) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 0" }}>{b.batchDate || (b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—")}</td>
                  <td style={{ padding: "8px 0" }}>{b.articlesGenerated || 0}</td>
                  <td style={{ padding: "8px 0" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: b.status === "completed" ? "#d1fae5" : b.status === "failed" ? "#fee2e2" : "#dbeafe",
                      color: b.status === "completed" ? "#065f46" : b.status === "failed" ? "#991b1b" : "#1e40af" }}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </TenantLayout>
  );
}
