import React, { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function LicenseList() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subdomain: "", tier: "starter" as const, ownerEmail: "", ownerName: "", siteName: "" });
  const licensesQuery = trpc.superAdmin.getLicenses.useQuery(undefined, { staleTime: 30000 });
  const licenses = licensesQuery.data ?? [];
  const createMut = trpc.superAdmin.createLicense.useMutation({
    onSuccess: () => { licensesQuery.refetch(); setShowCreate(false); setForm({ subdomain: "", tier: "starter", ownerEmail: "", ownerName: "", siteName: "" }); },
  });

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

  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" };

  return (
    <AdminLayout pageTitle="All Licenses" pageSubtitle={`${licenses.length} total licenses`}>
      {/* Search + Create */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name, subdomain, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240, maxWidth: 400, padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
        />
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Create License
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCreate(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Create New License</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Subdomain</label>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <input value={form.subdomain} onChange={e => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="my-site" style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
                  <span style={{ padding: "8px 12px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderLeft: "none", borderTopRightRadius: 6, borderBottomRightRadius: 6, fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>.getjaime.io</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Site Name</label>
                <input value={form.siteName} onChange={e => setForm({ ...form, siteName: e.target.value })} placeholder="My Awesome Site" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Owner Name</label>
                <input value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} placeholder="John Doe" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Owner Email</label>
                <input type="email" value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })} placeholder="john@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Tier</label>
                <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value as any })} style={inputStyle}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              {createMut.error && <div style={{ padding: "8px 12px", borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontSize: 12 }}>{createMut.error.message}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer", color: "#475569" }}>Cancel</button>
                <button
                  disabled={createMut.isPending || !form.subdomain || !form.ownerEmail || !form.ownerName || !form.siteName}
                  onClick={() => createMut.mutate(form)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: createMut.isPending ? "#94a3b8" : "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {createMut.isPending ? "Creating..." : "Create License"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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