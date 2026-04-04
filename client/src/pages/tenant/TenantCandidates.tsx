import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { ExternalLink, X, Zap, Loader2 } from "lucide-react";

function CandidatePanel({ candidate, onClose, onAction }: { candidate: any; onClose: () => void; onAction: () => void }) {
  const ignoreMut = trpc.selectorCandidates.ignore.useMutation({ onSuccess: onAction });
  const generateMut = trpc.workflow.generateFromCandidate.useMutation({
    onSuccess: () => { onAction(); },
  });
  const domain = candidate.source_url ? new URL(candidate.source_url).hostname.replace("www.", "").replace("news.google.com", "Google News") : "";
  const summary = (candidate.summary || "").replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 60 }} onClick={onClose} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 560, maxWidth: "100vw", background: "#fff", zIndex: 70, display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.1)" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Review Candidate</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: candidate.source_type === "rss" ? "#dbeafe" : candidate.source_type === "x" ? "#fce7f3" : candidate.source_type === "youtube" ? "#fee2e2" : "#f3f4f6", color: candidate.source_type === "rss" ? "#1e40af" : candidate.source_type === "x" ? "#9d174d" : candidate.source_type === "youtube" ? "#991b1b" : "#374151" }}>
              {candidate.source_type === "rss" ? "RSS" : candidate.source_type === "x" ? "X/Twitter" : candidate.source_type === "youtube" ? "YouTube" : (candidate.source_type?.toUpperCase() || "RSS")}
            </span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{candidate.source_name || domain}</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : ""}</span>
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: "#111827", marginBottom: 12 }}>
            {candidate.title || "Untitled"}
          </h3>

          {candidate.source_url && (
            <a href={candidate.source_url} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "#2dd4bf", marginBottom: 16, textDecoration: "none" }}>
              Read original article <ExternalLink size={12} />
            </a>
          )}

          {summary && (
            <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8, fontSize: 14, color: "#374151", lineHeight: 1.6, marginBottom: 16 }}>
              {summary.substring(0, 500)}{summary.length > 500 ? "..." : ""}
            </div>
          )}

          {!summary && (
            <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>No summary available from this feed.</p>
          )}

          {candidate.score && (
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
              Relevance Score: <strong>{Math.round(candidate.score * 100) / 100}</strong>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => generateMut.mutate({ candidateId: candidate.id })}
            disabled={generateMut.isPending}
            style={{ flex: 1, height: 44, background: generateMut.isPending ? "#9ca3af" : "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: generateMut.isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {generateMut.isPending ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Zap size={16} /> Generate Article</>}
          </button>
          <button onClick={() => ignoreMut.mutate({ candidateId: candidate.id })} disabled={ignoreMut.isPending}
            style={{ width: 120, height: 44, background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {ignoreMut.isPending ? "Ignoring..." : "Ignore"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function TenantCandidates() {
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<any>(null);
  const candidatesQuery = trpc.selectorCandidates.list.useQuery({ status: filter, limit: 50 });
  const candidates = candidatesQuery.data || [];

  const filters = ["pending", "selected", "rejected", "expired"];

  return (
    <TenantLayout pageTitle="Candidates" pageSubtitle={`${candidates.length} ${filter} candidates`} section="Content">
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer", textTransform: "capitalize",
            borderColor: filter === f ? "#111827" : "#e5e7eb", background: filter === f ? "#111827" : "#fff", color: filter === f ? "#fff" : "#6b7280",
          }}>{f}</button>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {candidatesQuery.isLoading ? (
          <p style={{ textAlign: "center", padding: 24, color: "#6b7280", fontSize: 13 }}>Loading candidates...</p>
        ) : candidates.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
            <p style={{ fontSize: 14, marginBottom: 4 }}>No {filter} candidates</p>
            <p style={{ fontSize: 12 }}>Candidates are sourced from RSS feeds during workflow runs.</p>
          </div>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 60 }}>Source</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Title</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 100 }}>Date</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 80 }}>Action</th>
            </tr></thead>
            <tbody>{candidates.map((c: any) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                onClick={() => setSelected(c)}
                onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: c.source_type === "rss" ? "#dbeafe" : c.source_type === "x" ? "#fce7f3" : c.source_type === "youtube" ? "#fee2e2" : "#f3f4f6",
                    color: c.source_type === "rss" ? "#1e40af" : c.source_type === "x" ? "#9d174d" : c.source_type === "youtube" ? "#991b1b" : "#374151" }}>
                    {c.source_type === "rss" ? "RSS" : c.source_type === "x" ? "X" : c.source_type === "youtube" ? "YT" : (c.source_type?.toUpperCase() || "RSS")}
                  </span>
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ fontWeight: 500, color: "#111827" }}>{(c.title || "Untitled").substring(0, 70)}{(c.title || "").length > 70 ? "..." : ""}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{c.source_name || ""}</div>
                </td>
                <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: 12 }}>
                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  <button onClick={e => { e.stopPropagation(); setSelected(c); }}
                    style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer", color: "#374151" }}>
                    Review
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {selected && <CandidatePanel candidate={selected} onClose={() => setSelected(null)} onAction={() => { setSelected(null); candidatesQuery.refetch(); }} />}
    </TenantLayout>
  );
}
