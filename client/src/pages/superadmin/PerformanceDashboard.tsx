import React from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { trpc } from "@/lib/trpc";

export default function PerformanceDashboard() {
  const statsQuery = trpc.superAdmin.getPlatformStats.useQuery(undefined, { staleTime: 30000 });
  const genQuery = trpc.superAdmin.getGenerationStats.useQuery(undefined, { staleTime: 30000 });
  const stats = statsQuery.data;
  const gen = genQuery.data;

  const kpis = stats ? [
    { label: "Total Licenses", value: stats.totalLicenses, color: "#6366f1" },
    { label: "Active Licenses", value: stats.activeLicenses, color: "#22c55e" },
    { label: "Total Articles", value: stats.totalArticles, color: "#8b5cf6" },
    { label: "Articles This Week", value: stats.articlesThisWeek, color: "#f59e0b" },
    { label: "Total Candidates", value: stats.totalCandidates, color: "#06b6d4" },
  ] : [];

  const articlesByDay = gen?.articlesByDay ?? [];
  const maxCount = Math.max(...articlesByDay.map((d: any) => Number(d.count)), 1);

  return (
    <AdminLayout pageTitle="Performance Dashboard" pageSubtitle="Platform-wide generation metrics">
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value?.toLocaleString()}</div>
          </div>
        ))}
        {kpis.length === 0 && <div style={{ padding: 20, color: "#94a3b8" }}>Loading stats...</div>}
      </div>

      {/* Articles by Day - SVG Bar Chart */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Articles Generated (Last 7 Days)</h3>
        {articlesByDay.length > 0 ? (
          <svg viewBox={`0 0 ${articlesByDay.length * 60 + 20} 180`} style={{ width: "100%", maxWidth: 500, height: 180 }}>
            {articlesByDay.map((d: any, i: number) => {
              const barH = (Number(d.count) / maxCount) * 130;
              return (
                <g key={i}>
                  <rect x={i * 60 + 10} y={150 - barH} width={40} height={barH} rx={4} fill="#6366f1" opacity={0.85} />
                  <text x={i * 60 + 30} y={145 - barH} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">{d.count}</text>
                  <text x={i * 60 + 30} y={170} textAnchor="middle" fontSize="9" fill="#94a3b8">
                    {d.date ? new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <div style={{ padding: 20, color: "#94a3b8", fontSize: 13 }}>{genQuery.isLoading ? "Loading..." : "No article data for the last 7 days"}</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Article Status Breakdown */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Articles by Status</h3>
          {(gen?.articlesByStatus ?? []).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(gen?.articlesByStatus ?? []).map((s: any, i: number) => {
                const colors: Record<string, string> = { published: "#22c55e", draft: "#f59e0b", archived: "#94a3b8", scheduled: "#6366f1" };
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors[s.status] || "#94a3b8" }} />
                      {s.status}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{Number(s.count).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color: "#94a3b8", fontSize: 13 }}>No data</div>}
        </div>

        {/* Candidate Sources */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Candidate Sources</h3>
          {(gen?.topCandidateSources ?? []).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(gen?.topCandidateSources ?? []).map((s: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>{s.sourceType}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{Number(s.count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <div style={{ color: "#94a3b8", fontSize: 13 }}>No data</div>}
        </div>
      </div>

      {/* Recent Batches */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Recent Workflow Batches</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>ID</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>License</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Articles</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {(gen?.recentBatches ?? []).map((b: any) => {
                const statusColors: Record<string, { bg: string; text: string }> = {
                  completed: { bg: "#dcfce7", text: "#166534" },
                  running: { bg: "#dbeafe", text: "#1e40af" },
                  pending: { bg: "#fef3c7", text: "#92400e" },
                  failed: { bg: "#fee2e2", text: "#991b1b" },
                };
                const sc = statusColors[b.status] || statusColors.pending;
                return (
                  <tr key={b.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>#{b.id}</td>
                    <td style={{ padding: "10px 16px", color: "#475569" }}>License #{b.licenseId}</td>
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>{b.status}</span>
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600 }}>{b.articleCount ?? "-"}</td>
                    <td style={{ padding: "10px 16px", color: "#64748b", fontSize: 12 }}>{b.createdAt ? new Date(b.createdAt).toLocaleString() : "-"}</td>
                  </tr>
                );
              })}
              {(gen?.recentBatches ?? []).length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{genQuery.isLoading ? "Loading..." : "No recent batches"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}