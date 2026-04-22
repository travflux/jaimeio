import React from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { trpc } from "@/lib/trpc";

export default function ImpersonationLogPage() {
  const logQuery = trpc.superAdmin.getImpersonationLog.useQuery(undefined, { staleTime: 30000 });
  const logs = logQuery.data ?? [];

  return (
    <AdminLayout pageTitle="Impersonation Log" pageSubtitle="Audit trail of admin login-as sessions">
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Admin Email</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Target Subdomain</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Target License ID</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Started At</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Ended At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry: any) => (
                <tr key={entry.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", color: "#0f172a", fontWeight: 500 }}>{entry.impersonatorEmail}</td>
                  <td style={{ padding: "12px 16px", color: "#6366f1", fontWeight: 500 }}>{entry.targetSubdomain}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>#{entry.targetLicenseId}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 12 }}>{entry.startedAt ? new Date(entry.startedAt).toLocaleString() : "-"}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 12 }}>{entry.endedAt ? new Date(entry.endedAt).toLocaleString() : <span style={{ color: "#f59e0b", fontWeight: 500 }}>Active</span>}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{logQuery.isLoading ? "Loading..." : "No impersonation sessions recorded"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
