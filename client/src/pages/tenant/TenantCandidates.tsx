import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Sparkles, Loader2, ExternalLink, RefreshCw, Inbox } from "lucide-react";

const potentialColors: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  medium: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  low: { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" },
};

function scoreColor(s: number) { return s >= 0.7 ? "#22c55e" : s >= 0.4 ? "#f59e0b" : "#d1d5db"; }

export default function TenantCandidates() {
  const [statusTab, setStatusTab] = useState("pending");
  const [potentialFilter, setPotentialFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const countsQuery = trpc.selectorCandidates.getCounts.useQuery(undefined, { staleTime: 30000 });
  const counts = countsQuery.data || { pending: 0, selected: 0, rejected: 0, expired: 0, high: 0, medium: 0, low: 0, sources: [] as string[] };

  const { data, refetch, isLoading } = trpc.selectorCandidates.list.useQuery(
    { status: statusTab, potential: potentialFilter === "all" ? undefined : potentialFilter, source: sourceFilter || undefined, limit: 50 },
    { staleTime: 15000 }
  );

  const genMut = trpc.workflow.generateFromCandidate.useMutation({
    onSuccess: (_: any, vars: any) => {
      setGeneratingIds(p => { const n = new Set(p); n.delete(vars.candidateId); return n; });
      toast.success("Article generated");
      refetch();
    },
    onError: (err: any, vars: any) => {
      setGeneratingIds(p => { const n = new Set(p); n.delete(vars.candidateId); return n; });
      toast.error("Failed: " + err.message);
    },
  });

  const rejectMut = trpc.selectorCandidates.ignore.useMutation({ onSuccess: () => refetch() });

  const handleGen = (id: number) => { setGeneratingIds(p => new Set(p).add(id)); genMut.mutate({ candidateId: id }); };

  const handleBulk = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm("Generate " + selectedIds.size + " article(s)? This may take several minutes.")) return;
    setBulkGenerating(true);
    for (const id of Array.from(selectedIds)) {
      setGeneratingIds(p => new Set(p).add(id));
      try { await genMut.mutateAsync({ candidateId: id }); } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
    setBulkGenerating(false);
    setSelectedIds(new Set());
    toast.success("Bulk generation complete");
  };

  const toggle = (id: number) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => { if (data?.candidates) setSelectedIds(new Set(data.candidates.map((c: any) => c.id))); };

  const candidates = data?.candidates || [];
  const total = data?.total || 0;

  return (
    <TenantLayout pageTitle="Candidates" pageSubtitle={total + " " + statusTab + " candidates"} section="Content"
      headerActions={<button onClick={() => refetch()} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}><RefreshCw size={12} /> Refresh</button>}>

      {/* Subtitle with counts */}
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
        {counts.pending} pending · {counts.selected} selected · {counts.rejected} rejected
      </p>

      {/* Status + Source selects */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select value={statusTab} onChange={e => { setStatusTab(e.target.value); setSelectedIds(new Set()); }}
          style={{ height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff", cursor: "pointer" }}>
          {[["pending","Pending"], ["selected","Selected"], ["rejected","Rejected"], ["expired","Expired"]].map(([val, label]) => (
            <option key={val} value={val}>{label} ({counts[val as keyof typeof counts] as number || 0})</option>
          ))}
        </select>
        {counts.sources && counts.sources.length > 0 && (
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            style={{ height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff", cursor: "pointer" }}>
            <option value="">All Sources</option>
            {(counts.sources as string[]).map((src: string) => <option key={src} value={src}>{src}</option>)}
          </select>
        )}
      </div>

      {/* Filters + Bulk */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all", "All Potential"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]].map(([f, label]) => (
          <button key={f} onClick={() => setPotentialFilter(f)}
            style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: "1px solid", cursor: "pointer", textTransform: "capitalize",
              borderColor: potentialFilter === f ? "#2dd4bf" : "#e5e7eb", background: potentialFilter === f ? "#f0fdfa" : "#fff", color: potentialFilter === f ? "#0d9488" : "#6b7280" }}>
            {label}{f !== "all" && counts[f as keyof typeof counts] !== undefined ? ` (${counts[f as keyof typeof counts]})` : ""}
          </button>
        ))}
        {statusTab === "pending" && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            {selectedIds.size > 0 ? (<>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{selectedIds.size} selected</span>
              <button onClick={() => setSelectedIds(new Set())} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer" }}>Clear</button>
              <button onClick={handleBulk} disabled={bulkGenerating}
                style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "#111827", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                {bulkGenerating ? <><Loader2 size={11} className="animate-spin" /> Generating...</> : <><Sparkles size={11} /> Generate {selectedIds.size}</>}
              </button>
            </>) : (
              <button onClick={selectAll} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer" }}>Select All</button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Loader2 size={24} className="animate-spin" style={{ color: "#9ca3af", margin: "0 auto" }} /></div>
      ) : candidates.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <Inbox size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>No {statusTab} candidates</p>
          {statusTab === "pending" && <p style={{ fontSize: 12, marginTop: 4 }}>Run your workflow to fetch candidates from RSS feeds.</p>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {candidates.map((c: any) => {
            const isGen = generatingIds.has(c.id);
            const isSel = selectedIds.has(c.id);
            const score = c.score || 0;
            const pot = c.article_potential || "low";
            const pc = potentialColors[pot] || potentialColors.low;

            return (
              <div key={c.id} style={{ background: isSel ? "#f0fdfa" : "#fff", border: isSel ? "1px solid #2dd4bf" : "1px solid #e5e7eb", borderRadius: 8, padding: 16, opacity: isGen ? 0.6 : 1, transition: "border-color 0.15s" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {statusTab === "pending" && (
                    <button onClick={() => toggle(c.id)} disabled={isGen} style={{ background: "none", border: "none", cursor: "pointer", marginTop: 2, flexShrink: 0 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, border: isSel ? "2px solid #2dd4bf" : "2px solid #d1d5db", background: isSel ? "#2dd4bf" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isSel && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                      </div>
                    </button>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", lineHeight: 1.4, margin: "0 0 6px" }}>{c.title}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6", color: "#6b7280" }}>{c.source_type || "RSS"} · {c.source_name || "Unknown"}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: pc.bg, color: pc.text, border: "1px solid " + pc.border, fontWeight: 600, textTransform: "capitalize" }}>{pot}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{c.created_at ? new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                      {c.source_url && <a href={c.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#2dd4bf", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }} onClick={e => e.stopPropagation()}>Source <ExternalLink size={9} /></a>}
                    </div>
                    {/* Score bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: "#f3f4f6", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: scoreColor(score), width: Math.round(score * 100) + "%", transition: "width 0.3s" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#9ca3af", minWidth: 28, textAlign: "right" }}>{Math.round(score * 100)}%</span>
                    </div>
                  </div>
                  {statusTab === "pending" && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                      <button onClick={() => rejectMut.mutate({ candidateId: c.id })} disabled={isGen}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff", fontSize: 11, cursor: "pointer", color: "#ef4444" }}>Dismiss</button>
                      <button onClick={() => handleGen(c.id)} disabled={isGen}
                        style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "#111827", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        {isGen ? <Loader2 size={11} className="animate-spin" /> : <><Sparkles size={11} /> Generate</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TenantLayout>
  );
}
