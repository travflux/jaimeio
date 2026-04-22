import React, { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { trpc } from "@/lib/trpc";

export default function StaffAccounts() {
  const staffQuery = trpc.superAdmin.getStaff.useQuery(undefined, { staleTime: 30000 });
  const staff = staffQuery.data ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ clerkUserId: "", email: "", name: "", role: "admin" as "owner" | "admin" });

  const addMut = trpc.superAdmin.addStaff.useMutation({
    onSuccess: () => { staffQuery.refetch(); setShowAdd(false); setForm({ clerkUserId: "", email: "", name: "", role: "admin" }); },
  });
  const updateMut = trpc.superAdmin.updateStaff.useMutation({
    onSuccess: () => staffQuery.refetch(),
  });

  const roleBadge = (role: string) => {
    const isOwner = role === "owner";
    return (
      <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: isOwner ? "#fef3c7" : "#dbeafe", color: isOwner ? "#92400e" : "#1e40af" }}>
        {role}
      </span>
    );
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" };

  return (
    <AdminLayout pageTitle="Staff Accounts" pageSubtitle="Platform admin team members">
      {/* Add Staff Toggle */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {showAdd ? "Cancel" : "+ Add Staff Member"}
        </button>
      </div>

      {/* Collapsible Add Form */}
      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Add Staff Member</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Clerk User ID</label>
              <input value={form.clerkUserId} onChange={e => setForm({ ...form, clerkUserId: e.target.value })} placeholder="user_2x..." style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@jaime.io" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full Name" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })} style={inputStyle}>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>
          {addMut.error && <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontSize: 12 }}>{addMut.error.message}</div>}
          <div style={{ marginTop: 14 }}>
            <button
              disabled={addMut.isPending || !form.clerkUserId || !form.email || !form.name}
              onClick={() => addMut.mutate(form)}
              style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: addMut.isPending ? "#94a3b8" : "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {addMut.isPending ? "Adding..." : "Add Staff Member"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Name</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Email</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Role</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Active</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Created</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Last Login</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s: any) => (
                <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0f172a" }}>{s.name}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{s.email}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{roleBadge(s.role)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.isActive ? "#22c55e" : "#ef4444" }} />
                      {s.isActive ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 12 }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "-"}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 12 }}>{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : "Never"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <button
                      onClick={() => updateMut.mutate({ id: s.id, isActive: !s.isActive })}
                      disabled={updateMut.isPending}
                      style={{
                        padding: "4px 12px", borderRadius: 6, border: "1px solid", fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: s.isActive ? "#fff" : "#dcfce7",
                        borderColor: s.isActive ? "#fca5a5" : "#86efac",
                        color: s.isActive ? "#dc2626" : "#166534",
                      }}
                    >
                      {s.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{staffQuery.isLoading ? "Loading..." : "No staff accounts found"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}