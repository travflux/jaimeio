import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";

export default function TenantXReplyQueue() {
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [procId, setProcId] = useState<number | null>(null);

  const { data, refetch, isLoading } = trpc.xReplies.getPending.useQuery();
  const approveMut = trpc.xReplies.approve.useMutation({ onSuccess: () => { toast.success("Reply approved"); setProcId(null); setEditId(null); refetch(); } });
  const rejectMut = trpc.xReplies.reject.useMutation({ onSuccess: () => { toast.success("Reply rejected"); setProcId(null); refetch(); } });

  const replies = data?.replies || [];

  return (
    <TenantLayout pageTitle="X Reply Queue" pageSubtitle="Review AI-drafted replies before posting" section="Distribution"
      headerActions={<button onClick={() => refetch()} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}><RefreshCw size={12} /> Refresh</button>}>

      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "#0369a1", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>𝕏</span> X Listening is active — AI drafts replies to relevant mentions. Review each before posting.
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Loader2 size={24} className="animate-spin" style={{ color: "#9ca3af", margin: "0 auto" }} /></div>
      ) : replies.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <p style={{ fontSize: 14 }}>No pending replies</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>When X listening finds relevant mentions, AI-drafted replies will appear here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {replies.map((r: any) => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              {/* Original tweet */}
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>@{r.originalAuthor || "unknown"}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{r.originalTweetDate ? new Date(r.originalTweetDate).toLocaleDateString() : ""}</span>
                  {r.originalTweetUrl && <a href={r.originalTweetUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto" }}><ExternalLink size={12} style={{ color: "#9ca3af" }} /></a>}
                </div>
                <p style={{ fontSize: 13, color: "#6b7280" }}>{r.originalTweetText || "Original tweet"}</p>
              </div>
              {/* Draft */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>AI Draft Reply</span>
                  <button onClick={() => { if (editId === r.id) setEditId(null); else { setEditId(r.id); setEditText(r.draftText); } }} style={{ fontSize: 11, color: "#2dd4bf", background: "none", border: "none", cursor: "pointer" }}>
                    {editId === r.id ? "Cancel edit" : "Edit reply"}
                  </button>
                </div>
                {editId === r.id ? (
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} maxLength={280}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "none", fontFamily: "inherit" }} />
                ) : (
                  <p style={{ fontSize: 13, background: "#f9fafb", borderRadius: 6, padding: 12 }}>{r.draftText}</p>
                )}
                <p style={{ fontSize: 10, color: "#9ca3af", textAlign: "right", marginTop: 4 }}>{(editId === r.id ? editText : r.draftText || "").length}/280</p>
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setProcId(r.id); rejectMut.mutate({ replyId: r.id }); }} disabled={procId === r.id}
                  style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff", fontSize: 12, cursor: "pointer", color: "#ef4444" }}>Reject</button>
                <button onClick={() => { setProcId(r.id); approveMut.mutate({ replyId: r.id, finalText: editId === r.id ? editText : r.draftText }); }} disabled={procId === r.id}
                  style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#111827", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {procId === r.id ? "..." : "Approve & Post"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </TenantLayout>
  );
}
