import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { X } from "lucide-react";

export default function TenantUsers() {
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const users = [{ id: 8, name: "Niki James", email: "niki@nikijames.com", role: "editor", lastLogin: "Active now", isBilling: true }];

  return (
    <TenantLayout pageTitle="Users" pageSubtitle={users.length + " members"} section="Overview"
      headerActions={<button onClick={() => setShowInvite(true)} style={{ height: 34, padding: "0 14px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Invite User</button>}>
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Name</th>
            <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Email</th>
            <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Role</th>
            <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Last Login</th>
          </tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "10px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f2d5e", fontSize: 12, fontWeight: 700 }}>{u.name.split(" ").map(w=>w[0]).join("")}</div>
                  <span style={{ fontWeight: 500 }}>{u.name}</span>
                  {u.isBilling && <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: "#d1fae5", color: "#065f46" }}>billing</span>}
                </div>
              </td>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>{u.email}</td>
              <td style={{ padding: "10px 16px" }}><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#dbeafe", color: "#1e40af" }}>{u.role}</span></td>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>{u.lastLogin}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {showInvite && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 60 }} onClick={() => setShowInvite(false)} />
          <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 480, maxWidth: "100vw", background: "#fff", zIndex: 70, display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Invite a Team Member</h2>
              <button onClick={() => setShowInvite(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Full Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Email Address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Role</label>
                <select style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 14 }}><option>Admin</option></select>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>All team members have admin access to this publication</div>
              </div>
              <button onClick={() => setShowInvite(false)} style={{ width: "100%", height: 44, borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Send Invitation</button>
            </div>
          </div>
        </>
      )}
    </TenantLayout>
  );
}
