import React from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { trpc } from "@/lib/trpc";

export default function StaffAccounts() {
  const staffQuery = trpc.superAdmin.getStaff.useQuery(undefined, { staleTime: 30000 });
  const staff = staffQuery.data ?? [];

  const roleBadge = (role: string) => {
    const isOwner = role === "owner";
    return (
      <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: isOwner ? "#fef3c7" : "#dbeafe", color: isOwner ? "#92400e" : "#1e40af" }}>
        {role}
      </span>
    );
  };

  return (
    <AdminLayout pageTitle="Staff Accounts" pageSubtitle="Platform admin team members">
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
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{staffQuery.isLoading ? "Loading..." : "No staff accounts found"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
