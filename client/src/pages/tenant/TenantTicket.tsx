import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { Loader2, ExternalLink, BookOpen, Send } from "lucide-react";

export default function TenantTicket() {
  const { licenseId } = useTenantContext();
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("normal");
  const [category, setCategory] = useState("technical");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const submitMut = trpc.support.submitTicket.useMutation({
    onSuccess: () => {
      toast.success("Ticket submitted — we'll respond within 24 hours");
      setSubject(""); setDescription("");
      setSending(false);
    },
    onError: (err: any) => {
      toast.error("Failed to submit. Email support@getjaime.io directly.");
      setSending(false);
    },
  });

  const handleSubmit = () => {
    if (!subject.trim() || !description.trim()) { toast.error("Please fill in subject and description"); return; }
    setSending(true);
    submitMut.mutate({ subject, priority, category, description, licenseId: licenseId || undefined });
  };

  return (
    <TenantLayout pageTitle="Support" pageSubtitle="Get help with your publication" section="Support">

      {/* Knowledge Base */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={16} style={{ color: "#2dd4bf" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Knowledge Base</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Find answers before submitting a ticket</div>
          </div>
        </div>
        <a href="https://knowledgebase.getjaime.io" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", textDecoration: "none" }}>
          <ExternalLink size={12} /> Search KB
        </a>
      </div>

      {/* Ticket Form */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Submit Support Ticket</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Subject *</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} placeholder="Brief description of your issue" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
              <option value="technical">Technical</option><option value="billing">Billing</option><option value="content">Content</option><option value="feature">Feature Request</option><option value="other">Other</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Description *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} placeholder="Describe your issue in detail..." />
        </div>
        <button onClick={handleSubmit} disabled={sending}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 6, background: sending ? "#9ca3af" : "#111827", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: sending ? "wait" : "pointer" }}>
          {sending ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <><Send size={14} /> Submit Ticket</>}
        </button>
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#9ca3af" }}>
          Or email us directly at <a href="mailto:support@getjaime.io" style={{ color: "#2dd4bf" }}>support@getjaime.io</a>
        </p>
      </div>
    </TenantLayout>
  );
}
