import React from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

function KpiCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e2e8f0", flex: "1 1 200px", minWidth: 180 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default function SuperAdminMissionControl() {
  const [, navigate] = useLocation();
  const statsQuery = trpc.superAdmin.getPlatformStats.useQuery(undefined, { staleTime: 30000 });
  const licensesQuery = trpc.superAdmin.getLicenses.useQuery(undefined, { staleTime: 30000 });
  const impersonateMutation = trpc.superAdmin.startImpersonation.useMutation();

  const stats = statsQuery.data;
  const licenses = licensesQuery.data ?? [];

  const handleLoginAs = async (licenseId: number, subdomain: string) => {
    try {
      const result = await impersonateMutation.mutateAsync({ targetLicenseId: licenseId, targetSubdomain: subdomain });
      window.open(result.loginUrl, "_blank");
    } catch (err) {
      console.error("Impersonation failed:", err);
    }
  };

  const tierBadge = (tier: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      starter: { bg: "#dbeafe", text: "#1e40af" },
      professional: { bg: "#fae8ff", text: "#86198f" },
      enterprise: { bg: "#fef3c7", text: "#92400e" },
    };
    const c = colors[tier] || colors.starter;
    return <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text }}>{tier}</span>;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: "#dcfce7", text: "#166534" },
      expired: { bg: "#fef3c7", text: "#92400e" },
      suspended: { bg: "#fee2e2", text: "#991b1b" },
      cancelled: { bg: "#f1f5f9", text: "#475569" },
    };
    const c = colors[status] || colors.active;
    return <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text }}>{status}</span>;
  };

  return (
    <AdminLayout pageTitle="Mission Control" pageSubtitle="Platform overview and license health">
      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Total Licenses" value={stats?.totalLicenses ?? "..."} color="#0f172a" />
        <KpiCard label="Active Licenses" value={stats?.activeLicenses ?? "..."} color="#16a34a" />
        <KpiCard label="Total Articles" value={stats?.totalArticles ?? "..."} color="#2563eb" />
        <KpiCard label="Articles This Week" value={stats?.articlesThisWeek ?? "..."} color="#9333ea" />
      </div>

      {/* License Health Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>License Health</h2>
          <button onClick={() => navigate("/superadmin/licenses")} style={{ fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View All &rarr;</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Site Name</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Subdomain</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Tier</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Articles</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Loop</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic) => (
                <tr key={lic.id} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => navigate(`/superadmin/licenses/${lic.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0f172a" }}>{lic.siteName || lic.subdomain}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{lic.subdomain || "-"}</td>
                  <td style={{ padding: "12px 16px" }}>{tierBadge(lic.tier)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>{lic.articleCount}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: lic.loopEnabled ? "#22c55e" : "#d1d5db" }} />
                      {lic.loopEnabled ? "On" : "Off"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(lic.status)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLoginAs(lic.id, lic.subdomain || ""); }}
                      style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#6366f1", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#6366f1"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#6366f1"; }}>
                      Login As
                    </button>
                  </td>
                </tr>
              ))}
              {licenses.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{licensesQuery.isLoading ? "Loading..." : "No licenses found"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
