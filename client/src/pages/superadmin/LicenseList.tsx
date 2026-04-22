import React, { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function LicenseList() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const licensesQuery = trpc.superAdmin.getLicenses.useQuery(undefined, { staleTime: 30000 });
  const licenses = licensesQuery.data ?? [];

  const filtered = licenses.filter(lic => {
    const q = search.toLowerCase();
    return !q || (lic.siteName || "").toLowerCase().includes(q) || (lic.subdomain || "").toLowerCase().includes(q) || (lic.email || "").toLowerCase().includes(q) || (lic.clientName || "").toLowerCase().includes(q);
  });

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
    <AdminLayout pageTitle="All Licenses" pageSubtitle={`${licenses.length} total licenses`}>
      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name, subdomain, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 400, padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>ID</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Site Name</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Subdomain</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Email</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Tier</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Articles</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lic => (
                <tr key={lic.id} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => navigate(`/superadmin/licenses/${lic.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12 }}>#{lic.id}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0f172a" }}>{lic.siteName || lic.clientName}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{lic.subdomain || "-"}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{lic.email}</td>
                  <td style={{ padding: "12px 16px" }}>{tierBadge(lic.tier)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>{lic.articleCount}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(lic.status)}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 12 }}>{lic.createdAt ? new Date(lic.createdAt).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{licensesQuery.isLoading ? "Loading..." : "No licenses match your search"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
