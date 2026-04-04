import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TenantUsers() {
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("admin");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const usersQuery = trpc.userManagement.listMine.useQuery();
  const inviteMut = trpc.userManagement.invite.useMutation({
    onSuccess: () => {
      toast.success(`Invitation sent to ${email}`);
      setShowInvite(false);
      setName("");
      setEmail("");
      usersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMut = trpc.userManagement.delete.useMutation({
    onSuccess: () => {
      toast.success("User removed");
      setDeleteId(null);
      usersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const meQuery = trpc.tenantAuth.me.useQuery();
  const currentUserId = meQuery.data?.id;

  const users = usersQuery.data || [];

  const handleInvite = () => {
    if (!name.trim() || !email.trim()) return;
    inviteMut.mutate({ email: email.trim(), name: name.trim(), role });
  };

  return (
    <TenantLayout pageTitle="Users" pageSubtitle={users.length + " members"} section="Overview"
      headerActions={<button onClick={() => setShowInvite(true)} style={{ height: 34, padding: "0 14px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Invite User</button>}>
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {usersQuery.isLoading ? (
          <p style={{ textAlign: "center", padding: 24, color: "#6b7280", fontSize: 13 }}>Loading users...</p>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Name</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Email</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Role</th>
              <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 90 }}>Status</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 60 }}></th>
            </tr></thead>
            <tbody>{users.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f2d5e", fontSize: 12, fontWeight: 700 }}>
                      {u.name?.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 16px", color: "#6b7280" }}>{u.email}</td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#dbeafe", color: "#1e40af" }}>{u.role}</span>
                </td>
                <td style={{ padding: "10px 16px", textAlign: "center" }}>
                  {u.lastLoginAt ? (
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0" }}>Active</span>
                  ) : (
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>Invited</span>
                  )}
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  {u.id !== currentUserId && (
                    <button onClick={() => { setDeleteId(u.id); setDeleteName(u.name); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }}
                      title="Remove user">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Invite Panel */}
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
                <select value={role} onChange={e => setRole(e.target.value as any)} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Admins have full access. Editors can manage content. Viewers are read-only.</div>
              </div>
              <button onClick={handleInvite} disabled={inviteMut.isPending || !name.trim() || !email.trim()}
                style={{ width: "100%", height: 44, borderRadius: 6, background: inviteMut.isPending ? "#9ca3af" : "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {inviteMut.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : "Send Invitation"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId !== null && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 80 }} onClick={() => setDeleteId(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 420, maxWidth: "90vw", background: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", zIndex: 90, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Remove {deleteName}?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>They will lose access immediately. This cannot be undone.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteId(null)}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => deleteMut.mutate({ userId: deleteId })} disabled={deleteMut.isPending}
                style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {deleteMut.isPending ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </>
      )}
    </TenantLayout>
  );
}
