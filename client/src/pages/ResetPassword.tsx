import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const resetMut = trpc.userManagement.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (e: any) => toast.error(e.message || "Reset failed"),
  });

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ background: "#fff", padding: 32, borderRadius: 12, border: "1px solid #e5e7eb", maxWidth: 400, textAlign: "center" }}>
          <p style={{ fontSize: 15, color: "#ef4444" }}>Invalid reset link. Please request a new password reset.</p>
          <a href="/admin" style={{ display: "inline-block", marginTop: 16, color: "#2dd4bf", fontSize: 13 }}>Back to login</a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ background: "#fff", padding: 32, borderRadius: 12, border: "1px solid #e5e7eb", maxWidth: 400, textAlign: "center" }}>
          <CheckCircle2 size={40} style={{ color: "#22c55e", margin: "0 auto 16px", display: "block" }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Password Reset</h2>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>Your password has been reset. You can now sign in.</p>
          <a href="/admin" style={{ display: "inline-block", padding: "10px 24px", background: "#111827", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Sign In</a>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    resetMut.mutate({ token, newPassword: password });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 12, border: "1px solid #e5e7eb", width: 400 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Set New Password</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Enter your new password below.</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} required />
          </div>
          <button type="submit" disabled={resetMut.isPending}
            style={{ width: "100%", height: 40, borderRadius: 6, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {resetMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Resetting...</> : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
