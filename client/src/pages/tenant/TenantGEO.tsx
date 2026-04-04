import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function TenantGEO() {
  const { licenseId, settings: init, isLoading } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  const statsQuery = trpc.geo?.stats?.useQuery?.(undefined, { staleTime: 30000 });
  const backfillMut = trpc.geo?.generateBulk?.useMutation?.();
  const [backfillRunning, setBackfillRunning] = useState(false);
  const backfillStatusQuery = trpc.geo?.backfillStatus?.useQuery?.(undefined, {
    refetchInterval: backfillRunning ? 3000 : false,
    enabled: backfillRunning,
  });
  const bfState = backfillStatusQuery?.data;

  React.useEffect(() => {
    if (bfState && !bfState.isRunning && backfillRunning) {
      setBackfillRunning(false);
      statsQuery?.refetch?.();
    }
  }, [bfState?.isRunning, backfillRunning]);

  useEffect(() => { if (init) setS(init); }, [init]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };
  const geoEnabled = s.geo_enabled === "true";

  const Toggle = ({ k, label, helper }: { k: string; label: string; helper?: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
      <div><div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>{helper && <div style={{ fontSize: 11, color: "#9ca3af" }}>{helper}</div>}</div>
      <button onClick={() => update(k, s[k] === "true" ? "false" : "true")}
        style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s[k] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
        <span style={{ position: "absolute", top: 2, left: s[k] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );

  if (isLoading) return <TenantLayout pageTitle="GEO Settings" section="SEO & GEO"><p style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading...</p></TenantLayout>;

  return (
    <TenantLayout pageTitle="GEO Settings" pageSubtitle="Generative Engine Optimization for AI search" section="SEO & GEO" saveAction={handleSave}>
      {/* Master Toggle */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>GEO Optimization</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Optimize articles for AI search engines like ChatGPT, Perplexity, and Google AI Overviews.</p>
        <Toggle k="geo_enabled" label="Enable GEO" helper="Adds Key Takeaways + FAQ sections to every article" />
      </div>

      {geoEnabled && (
        <>
          {/* Content Sections */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Content Sections</h3>
            <Toggle k="geo_key_takeaways_enabled" label="Key Takeaways" helper="Summary bullet points for AI citation" />
            {s.geo_key_takeaways_enabled === "true" && (
              <div style={{ marginLeft: 24, marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 500 }}>Number of takeaways:</label>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {["3", "5", "7"].map(n => (
                    <button key={n} onClick={() => update("geo_takeaway_count", n)} style={{ padding: "4px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer",
                      borderColor: (s.geo_takeaway_count || "5") === n ? "#111827" : "#e5e7eb", background: (s.geo_takeaway_count || "5") === n ? "#111827" : "#fff", color: (s.geo_takeaway_count || "5") === n ? "#fff" : "#6b7280" }}>{n}</button>
                  ))}
                </div>
              </div>
            )}
            <Toggle k="geo_faq_enabled" label="FAQ Section" helper="Frequently Asked Questions for rich snippets" />
            {s.geo_faq_enabled === "true" && (
              <div style={{ marginLeft: 24, marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 500 }}>Number of FAQs:</label>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {["3", "5", "7", "10"].map(n => (
                    <button key={n} onClick={() => update("geo_faq_count", n)} style={{ padding: "4px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer",
                      borderColor: (s.geo_faq_count || "4") === n ? "#111827" : "#e5e7eb", background: (s.geo_faq_count || "4") === n ? "#111827" : "#fff", color: (s.geo_faq_count || "4") === n ? "#fff" : "#6b7280" }}>{n}</button>
                  ))}
                </div>
              </div>
            )}
            <Toggle k="geo_speakable_enabled" label="Speakable Markup" helper="Schema.org SpeakableSpecification for voice assistants" />
            <Toggle k="geo_signals_enabled" label="GEO Signals" helper="Structured data signals for AI discovery" />
          </div>

          {/* Prompt Injection */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>GEO Prompt Instructions</h3>
            <textarea value={s.geo_prompt_injection || ""} onChange={e => update("geo_prompt_injection", e.target.value)} rows={5}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }}
              placeholder="Instructions added to every article generation prompt for GEO optimization..." />
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>These instructions are appended to every article generation prompt.</div>
          </div>

          {/* Backfill */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>GEO Backfill</h3>
            {statsQuery?.data && (
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{statsQuery.data.articlesWithGeo}</div><div style={{ fontSize: 11, color: "#6b7280" }}>With GEO</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{statsQuery.data.totalArticles - statsQuery.data.articlesWithGeo}</div><div style={{ fontSize: 11, color: "#6b7280" }}>Without GEO</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{statsQuery.data.averageScore}</div><div style={{ fontSize: 11, color: "#6b7280" }}>Avg Score</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{statsQuery.data.coverage}%</div><div style={{ fontSize: 11, color: "#6b7280" }}>Coverage</div></div>
              </div>
            )}
            {/* Progress display */}
            {backfillRunning && bfState?.isRunning && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  <span>Processing {bfState.processed} of {bfState.total}...</span>
                  <span>{bfState.succeeded} succeeded · {bfState.failed} failed</span>
                </div>
                <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#2dd4bf", borderRadius: 4, width: bfState.total > 0 ? ((bfState.processed / bfState.total) * 100) + "%" : "0%", transition: "width 0.3s" }} />
                </div>
              </div>
            )}
            <button onClick={() => { backfillMut?.mutate?.({}); setBackfillRunning(true); }} disabled={backfillRunning || backfillMut?.isPending}
              style={{ width: "100%", height: 40, background: backfillRunning ? "#9ca3af" : "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: backfillRunning ? "not-allowed" : "pointer" }}>
              {backfillRunning ? "Running... (" + (bfState?.processed || 0) + "/" + (bfState?.total || "?") + ")" : "Generate GEO for All Articles"}
            </button>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6, textAlign: "center" }}>This will use LLM credits for each article processed.</p>
          </div>

          {/* Preview */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Preview — What GEO Adds to Articles</h3>
            <div style={{ background: "#f0fdfa", borderLeft: "3px solid #2dd4bf", padding: 12, borderRadius: "0 6px 6px 0", marginBottom: 16 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#2dd4bf", fontWeight: 700, marginBottom: 4 }}>KEY TAKEAWAY</div>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: 0 }}>A concise summary that AI search engines can directly cite when answering user queries about this topic.</p>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>What is GEO optimization?</div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>GEO (Generative Engine Optimization) structures your content so AI tools like ChatGPT, Perplexity, and Google AI Overviews can accurately read, cite, and feature your articles in their responses.</p>
            </div>
          </div>
        </>
      )}
    </TenantLayout>
  );
}
