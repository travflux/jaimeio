import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = { instagram: "Instagram", twitter: "X/Twitter", x: "X/Twitter", linkedin: "LinkedIn", facebook: "Facebook", threads: "Threads", bluesky: "Bluesky", tiktok: "TikTok" };

type Tab = "queue" | "published" | "failed" | "settings";

export default function TenantSocialQueue() {
  const [tab, setTab] = useState<Tab>("queue");

  const statusMap: Record<string, string[]> = {
    queue: ["pending", "sending"],
    published: ["sent"],
    failed: ["failed"],
  };

  const { data, refetch, isLoading } = trpc.distribution.getQueue.useQuery(
    { status: statusMap[tab] || [], limit: 50 },
    { enabled: tab !== "settings", refetchInterval: tab === "queue" ? 30000 : false }
  );

  const pollMut = trpc.distribution.pollBlotatoStatuses.useMutation({
    onSuccess: (r: any) => { toast.success("Checked " + r.checked + " posts, updated " + r.updated); refetch(); },
  });
  const cancelMut = trpc.distribution.cancelPost.useMutation({ onSuccess: () => { toast.success("Post cancelled"); refetch(); } });
  const retryMut = trpc.distribution.retryPost.useMutation({ onSuccess: () => { toast.success("Post re-queued"); refetch(); } });

  const items = data?.items || [];

  return (
    <TenantLayout pageTitle="Social Queue" pageSubtitle="Manage your social media distribution" section="Distribution"
      headerActions={<button onClick={() => pollMut.mutate()} disabled={pollMut.isPending}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>
        {pollMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Check Status
      </button>}>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid #e5e7eb" }}>
        {([["queue", "Queue"], ["published", "Published"], ["failed", "Failed"], ["settings", "Settings"]] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "transparent",
              borderBottom: tab === id ? "2px solid #2dd4bf" : "2px solid transparent", color: tab === id ? "#111827" : "#9ca3af", marginBottom: -1 }}>
            {label}
            {id === "queue" && data?.total ? <span style={{ marginLeft: 6, background: "#f0fdfa", color: "#0d9488", fontSize: 10, padding: "1px 6px", borderRadius: 999 }}>{data.total}</span> : null}
          </button>
        ))}
      </div>

      {/* Settings tab */}
      {tab === "settings" && (
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, fontSize: 13, color: "#6b7280" }}>
          Distribution settings (Blotato connection, platforms, schedule) are in{" "}
          <a href="/admin/distribution" style={{ color: "#2dd4bf", textDecoration: "underline" }}>the full Distribution page</a> or{" "}
          <a href="/admin/settings" style={{ color: "#2dd4bf", textDecoration: "underline" }}>Settings Hub</a>.
        </div>
      )}

      {/* Queue/Published/Failed */}
      {tab !== "settings" && (
        <>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: 60 }}><Loader2 size={24} className="animate-spin" style={{ color: "#9ca3af", margin: "0 auto" }} /></div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
              <p style={{ fontSize: 14 }}>{tab === "queue" ? "No posts in queue" : tab === "published" ? "No published posts yet" : "No failed posts"}</p>
              {tab === "queue" && <p style={{ fontSize: 12, marginTop: 4 }}>Posts are added automatically when articles are published.</p>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item: any) => (
                <div key={item.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {/* Platform */}
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                    {(item.platform || "?").substring(0, 2)}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                      {item.articleHeadline || "Standalone post"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{PLATFORM_LABELS[item.platform] || item.platform}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                        background: item.status === "sent" ? "#d1fae5" : item.status === "failed" ? "#fee2e2" : "#fef3c7",
                        color: item.status === "sent" ? "#065f46" : item.status === "failed" ? "#991b1b" : "#92400e" }}>
                        {item.status === "sent" ? "Published" : item.status === "failed" ? "Failed" : item.status === "sending" ? "Sending" : "Pending"}
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        {item.sentAt ? new Date(item.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                          : item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </span>
                      {item.errorMessage && <span style={{ fontSize: 11, color: "#ef4444" }}>{item.errorMessage.substring(0, 60)}</span>}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                    {item.postUrl && (
                      <a href={item.postUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, color: "#374151", textDecoration: "none" }}>
                        <ExternalLink size={10} /> View
                      </a>
                    )}
                    {item.status === "failed" && (
                      <button onClick={() => retryMut.mutate({ queueId: item.id })} disabled={retryMut.isPending}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer", color: "#374151" }}>
                        {retryMut.isPending ? "..." : "Retry"}
                      </button>
                    )}
                    {(item.status === "pending" || item.status === "sending") && (
                      <button onClick={() => cancelMut.mutate({ queueId: item.id })} disabled={cancelMut.isPending}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff", fontSize: 11, cursor: "pointer", color: "#ef4444" }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </TenantLayout>
  );
}
