import React, { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { trpc } from "@/lib/trpc";

export default function GenerationLog() {
  const [licenseId, setLicenseId] = useState<number | undefined>();
  const [step, setStep] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  const logQuery = trpc.superAdmin.getGenerationLog.useQuery(
    { licenseId, step, status, limit: 100 },
    { staleTime: 15000, refetchInterval: 30000 }
  );
  const licensesQuery = trpc.superAdmin.getLicenses.useQuery(undefined, { staleTime: 60000 });
  const logs = logQuery.data ?? [];
  const licenses = licensesQuery.data ?? [];

  const selectStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", minWidth: 140 };

  const statusBadge = (s: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      success: { bg: "#dcfce7", text: "#166534" },
      failed: { bg: "#fee2e2", text: "#991b1b" },
      skipped: { bg: "#f1f5f9", text: "#475569" },
      pending: { bg: "#fef3c7", text: "#92400e" },
      running: { bg: "#dbeafe", text: "#1e40af" },
    };
    const c = colors[s] || { bg: "#f1f5f9", text: "#475569" };
    return <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text }}>{s}</span>;
  };

  const stepBadge = (s: string) => {
    const colors: Record<string, string> = {
      selector: "#6366f1", writer: "#8b5cf6", editor: "#06b6d4", publisher: "#22c55e", image: "#f59e0b",
    };
    return (
      <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: (colors[s] || "#94a3b8") + "20", color: colors[s] || "#475569" }}>
        {s}
      </span>
    );
  };

  return (
    <AdminLayout pageTitle="Generation Log" pageSubtitle="Real-time content pipeline activity (auto-refreshes every 30s)">
      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select value={licenseId ?? ""} onChange={e => setLicenseId(e.target.value ? Number(e.target.value) : undefined)} style={selectStyle}>
          <option value="">All Licenses</option>
          {licenses.map(l => <option key={l.id} value={l.id}>{l.siteName || l.subdomain || `#${l.id}`}</option>)}
        </select>
        <select value={step ?? ""} onChange={e => setStep(e.target.value || undefined)} style={selectStyle}>
          <option value="">All Steps</option>
          <option value="selector">Selector</option>
          <option value="writer">Writer</option>
          <option value="editor">Editor</option>
          <option value="publisher">Publisher</option>
          <option value="image">Image</option>
        </select>
        <select value={status ?? ""} onChange={e => setStatus(e.target.value || undefined)} style={selectStyle}>
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
        </select>
        <button onClick={() => logQuery.refetch()} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer", color: "#475569" }}>
          Refresh
        </button>
        {logQuery.isFetching && <span style={{ fontSize: 12, color: "#6366f1" }}>Updating...</span>}
      </div>

      {/* Log Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Time</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>License</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Step</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Message</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any, i: number) => (
                <tr key={log.id || i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>
                    {log.attemptedAt ? new Date(log.attemptedAt).toLocaleString() : "-"}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#475569" }}>#{log.licenseId}</td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}>{stepBadge(log.step)}</td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}>{statusBadge(log.status)}</td>
                  <td style={{ padding: "10px 16px", color: "#475569", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.message || log.error || "-"}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", color: "#64748b", fontSize: 12 }}>
                    {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "-"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{logQuery.isLoading ? "Loading..." : "No log entries found"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}