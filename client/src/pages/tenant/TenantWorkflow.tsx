import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TenantWorkflow() {
  const { licenseId, settings: initSettings } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("workflow");
  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  const batchesQuery = trpc.workflow.list.useQuery({ limit: 10 }, { staleTime: 30000 });

  useEffect(() => { if (initSettings) setS(initSettings); }, [initSettings]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };

  const tabs = ["workflow", "generation", "ai", "publishing", "schedule", "distribution"];
  const isEnabled = s.workflow_enabled === "true";
  const runNowMut = trpc.workflow.triggerNow.useMutation({ onSuccess: () => { try { alert("Workflow started — articles will appear shortly"); } catch {} } });

  return (
    <TenantLayout pageTitle="Workflow" pageSubtitle="Content production pipeline" section="Content" saveAction={handleSave}>
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "1px solid",
            cursor: "pointer", textTransform: "capitalize",
            borderColor: tab === t ? "#111827" : "#e5e7eb", background: tab === t ? "#111827" : "#fff", color: tab === t ? "#fff" : "#6b7280",
          }}>{t}</button>
        ))}
      </div>

      {tab === "workflow" && (
        <>
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: isEnabled ? "#22c55e" : "#9ca3af" }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Content Production {isEnabled ? "ON" : "OFF"}</span>
              </div>
              <button onClick={() => update("workflow_enabled", isEnabled ? "false" : "true")}
                style={{ width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: isEnabled ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
                <span style={{ position: "absolute", top: 3, left: isEnabled ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            {isEnabled && <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Next run: {s.run_time_1 || "7:00 AM"} {s.workflow_timezone || "America/Los_Angeles"}</p>}
            <button onClick={() => { runNowMut.mutate(); }} disabled={runNowMut.isPending}
              style={{ width: "100%", height: 40, background: "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8, opacity: runNowMut.isPending ? 0.6 : 1 }}>
              {runNowMut.isPending ? "Starting..." : "▶ Run Now"}
            </button>
            {runNowMut.isSuccess && <p style={{ fontSize: 12, color: "#22c55e", marginBottom: 8 }}>Workflow started — check Articles in 3-5 minutes</p>}
            {runNowMut.isError && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>Failed to start workflow</p>}
            <button onClick={() => update("workflow_enabled", isEnabled ? "false" : "true")}
              style={{ width: "100%", height: 36, background: "#fff", color: isEnabled ? "#ef4444" : "#22c55e", border: "1px solid", borderColor: isEnabled ? "#ef4444" : "#22c55e", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {isEnabled ? "Pause Workflow" : "Resume Workflow"}
            </button>
          </div>
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recent Runs</h3>
            {(batchesQuery.data || []).length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>No workflow runs yet. Enable workflow and it will run on schedule.</p>
            ) : (
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Date</th>
                  <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Articles</th>
                  <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Status</th>
                </tr></thead>
                <tbody>
                  {(batchesQuery.data || []).map((b: any) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 0" }}>{b.batchDate}</td>
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
        </>
      )}

      {tab === "generation" && (
        <>
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Writing Style</h3>
            <textarea value={s.writing_style || ""} onChange={e => update("writing_style", e.target.value)} rows={6}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Your publication's editorial voice for all AI-generated articles</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Article Settings</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Target Article Length: ~{s.target_article_length || 800} words</label>
              <input type="range" min={300} max={2000} step={50} value={s.target_article_length || "800"} onChange={e => update("target_article_length", e.target.value)}
                style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Articles Per Batch</label>
              <input type="number" min={1} max={10} value={s.articles_per_batch || "3"} onChange={e => update("articles_per_batch", e.target.value)}
                style={{ width: 80, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>Approval Required</div><div style={{ fontSize: 11, color: "#9ca3af" }}>Articles need manual review before publishing</div></div>
              <button onClick={() => update("approval_required", s.approval_required === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s.approval_required === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
                <span style={{ position: "absolute", top: 2, left: s.approval_required === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "publishing" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Publishing Rules</h3>
          {[
            ["auto_publish", "Auto-Publish", "Publish articles without manual approval"],
            ["require_featured_image", "Require Featured Image", "Articles must have an image before publishing"],
            ["indexnow_on_publish", "IndexNow on Publish", "Notify search engines when articles publish"],
          ].map(([key, label, helper]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{helper}</div></div>
              <button onClick={() => update(key, s[key] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s[key] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
                <span style={{ position: "absolute", top: 2, left: s[key] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "schedule" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Workflow Schedule</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Runs Per Day</label>
            <div style={{ display: "flex", gap: 4 }}>
              {["1", "2", "3"].map(n => (
                <button key={n} onClick={() => update("runs_per_day", n)} style={{
                  padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "1px solid", cursor: "pointer",
                  borderColor: s.runs_per_day === n ? "#111827" : "#e5e7eb", background: s.runs_per_day === n ? "#111827" : "#fff", color: s.runs_per_day === n ? "#fff" : "#6b7280",
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
        </div>
      )}

      {tab === "distribution" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Content Distribution Controls</h3>
          {[
            ["category_quotas_enabled", "Category Quotas", "Distribute articles evenly across your categories"],
            ["topic_cluster_enabled", "Topic Clustering", "Group related topics together in each batch"],
            ["headline_dedup_enabled", "Headline Deduplication", "Prevent similar headlines from appearing in the same batch"],
            ["cross_batch_memory_enabled", "Cross-Batch Memory", "Remember topics for recent days to avoid repetition"],
            ["randomize_feed_sources", "Randomize Feed Order", "Shuffle RSS feed order on each run for varied content"],
          ].map(([key, label, helper]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{helper}</div>
              </div>
              <button onClick={() => update(key, s[key] === "true" ? "false" : "true")}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s[key] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
                <span style={{ position: "absolute", top: 2, left: s[key] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          ))}
          {s.cross_batch_memory_enabled === "true" && (
            <div style={{ marginLeft: 24, marginTop: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Remember topics for:</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input type="number" min={1} max={14} value={s.cross_batch_memory_days || "2"} onChange={e => update("cross_batch_memory_days", e.target.value)}
                  style={{ width: 60, padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
                <span style={{ fontSize: 12, color: "#6b7280" }}>days</span>
              </div>
            </div>
          )}
        </div>
      )}


      {tab === "ai" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>AI Model</h3>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Choose which AI model generates your articles. Auto uses the fastest available model with automatic fallback.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { value: "auto", label: "Auto (Recommended)", desc: "Fastest available model with automatic fallback", badge: "Smart", badgeColor: "#2dd4bf" },
              { value: "groq", label: "Groq — Llama 3.3 70B", desc: "Fastest generation, lowest cost (~$0.001/article)", badge: "Fastest", badgeColor: "#3b82f6" },
              { value: "anthropic", label: "Anthropic — Claude Sonnet", desc: "Highest quality output (~$0.10/article)", badge: "Best Quality", badgeColor: "#8b5cf6" },
              { value: "openai", label: "OpenAI — GPT-4o", desc: "Balanced quality and cost (~$0.03/article)", badge: "Balanced", badgeColor: "#f59e0b" },
              { value: "gemini", label: "Google — Gemini 2.5 Flash", desc: "Fast and affordable (~$0.002/article)", badge: "Affordable", badgeColor: "#22c55e" },
            ].map(option => (
              <div key={option.value} onClick={() => update("llm_provider", option.value)}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 8, border: (s.llm_provider || "auto") === option.value ? "2px solid #2dd4bf" : "1px solid #e5e7eb", cursor: "pointer", background: (s.llm_provider || "auto") === option.value ? "#f0fdfa" : "#fff" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: (s.llm_provider || "auto") === option.value ? "#2dd4bf" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  {(s.llm_provider || "auto") === option.value && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2dd4bf" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{option.label}</span>
                    <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: option.badgeColor + "20", color: option.badgeColor }}>{option.badge}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{option.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12 }}>Changes take effect on the next article generation. Click Save at the top to apply.</p>
        </div>
      )}

    </TenantLayout>
  );
}
