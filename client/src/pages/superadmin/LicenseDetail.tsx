import React, { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { trpc } from "@/lib/trpc";

export default function LicenseDetail({ licenseId }: { licenseId: number }) {
  const licenseQuery = trpc.superAdmin.getLicense.useQuery({ licenseId }, { staleTime: 30000 });
  const updateMutation = trpc.superAdmin.updateLicense.useMutation({ onSuccess: () => licenseQuery.refetch() });
  const impersonateMutation = trpc.superAdmin.startImpersonation.useMutation();

  const data = licenseQuery.data;
  const lic = data?.license;
  const settings = data?.settings ?? {};
  const articleStats = data?.articleStats ?? [];
  const recentBatches = data?.recentBatches ?? [];

  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editTier, setEditTier] = useState<string | null>(null);

  const handleSave = async () => {
    const updates: any = {};
    if (editStatus) updates.status = editStatus;
    if (editTier) updates.tier = editTier;
    if (Object.keys(updates).length > 0) {
      await updateMutation.mutateAsync({ licenseId, ...updates });
      setEditStatus(null);
      setEditTier(null);
    }
  };

  const handleLoginAs = async () => {
    if (!lic) return;
    try {
      const result = await impersonateMutation.mutateAsync({ targetLicenseId: lic.id, targetSubdomain: lic.subdomain || "" });
      window.open(result.loginUrl, "_blank");
    } catch (err) {
      console.error("Impersonation failed:", err);
    }
  };

  if (licenseQuery.isLoading) return <AdminLayout pageTitle="License Detail"><div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading...</div></AdminLayout>;
  if (!lic) return <AdminLayout pageTitle="License Not Found"><div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>License #{licenseId} not found.</div></AdminLayout>;

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: "#dcfce7", text: "#166534" },
      expired: { bg: "#fef3c7", text: "#92400e" },
      suspended: { bg: "#fee2e2", text: "#991b1b" },
      cancelled: { bg: "#f1f5f9", text: "#475569" },
    };
    const c = colors[status] || colors.active;
    return <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text }}>{status}</span>;
  };

  return (
    <AdminLayout pageTitle={lic.clientName || lic.subdomain || `License #${lic.id}`} pageSubtitle={lic.subdomain ? `${lic.subdomain}.getjaime.io` : lic.domain}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* License Info */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>License Info</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["ID", `#${lic.id}`],
              ["Client Name", lic.clientName],
              ["Email", lic.email],
              ["Domain", lic.domain],
              ["Subdomain", lic.subdomain || "-"],
              ["Created", lic.createdAt ? new Date(lic.createdAt).toLocaleString() : "-"],
              ["Updated", lic.updatedAt ? new Date(lic.updatedAt).toLocaleString() : "-"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>{label}</span>
                <span style={{ color: "#0f172a", fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>Status</span>
              {statusBadge(lic.status)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Change Status</label>
              <select value={editStatus || lic.status} onChange={e => setEditStatus(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}>
                {["active", "expired", "suspended", "cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Change Tier</label>
              <select value={editTier || lic.tier} onChange={e => setEditTier(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}>
                {["starter", "professional", "enterprise"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={handleSave} disabled={updateMutation.isPending} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: updateMutation.isPending ? 0.6 : 1 }}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={handleLoginAs} disabled={impersonateMutation.isPending} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #6366f1", background: "#fff", color: "#6366f1", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {impersonateMutation.isPending ? "Opening..." : "Login As This Client"}
            </button>
          </div>
        </div>
      </div>

      {/* Article Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Article Stats</h3>
          {articleStats.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No articles</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {(articleStats as any[]).map((s: any) => (
                <div key={s.status} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b", textTransform: "capitalize" }}>{s.status}</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{Number(s.count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Key Settings</h3>
          {Object.keys(settings).length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No settings configured</p>
          ) : (
            <div style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto" }}>
              {Object.entries(settings).slice(0, 20).map(([key, value]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, gap: 8 }}>
                  <span style={{ color: "#64748b", fontFamily: "monospace", flexShrink: 0 }}>{key}</span>
                  <span style={{ color: "#0f172a", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{String(value)}</span>
                </div>
              ))}
              {Object.keys(settings).length > 20 && <p style={{ fontSize: 11, color: "#94a3b8" }}>...and {Object.keys(settings).length - 20} more</p>}
            </div>
          )}
        </div>
      </div>

      {/* Recent Batches */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Recent Workflow Batches</h3>
        </div>
        {recentBatches.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No batches</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11 }}>Date</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11 }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: 11 }}>Events</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: 11 }}>Generated</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: 11 }}>Published</th>
              </tr>
            </thead>
            <tbody>
              {(recentBatches as any[]).map((b: any) => (
                <tr key={b.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px" }}>{b.batchDate}</td>
                  <td style={{ padding: "10px 16px" }}><span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#475569" }}>{b.status}</span></td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>{b.totalEvents}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>{b.articlesGenerated}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>{b.articlesPublished}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
