import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Trash2, Pause, Play, RefreshCw, Loader2 } from "lucide-react";

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

export default function TenantSourceFeeds() {
  const [newUrl, setNewUrl] = useState("");
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const feedsQuery = trpc.sourceFeeds.list.useQuery();
  const addMut = trpc.sourceFeeds.add.useMutation({ onSuccess: () => feedsQuery.refetch() });
  const removeMut = trpc.sourceFeeds.remove.useMutation({ onSuccess: () => feedsQuery.refetch() });
  const toggleMut = trpc.sourceFeeds.toggle.useMutation({ onSuccess: () => feedsQuery.refetch() });
  const fetchNowMut = trpc.sourceFeeds.fetchNow.useMutation({
    onSuccess: () => { setFetchingId(null); feedsQuery.refetch(); },
    onError: () => setFetchingId(null),
  });
  const feeds = feedsQuery.data || [];
  const activeCount = feeds.filter((f: any) => f.enabled).length;

  const addFeed = () => {
    if (!newUrl.trim()) return;
    addMut.mutate({ url: newUrl.trim() });
    setNewUrl("");
  };

  return (
    <TenantLayout pageTitle="Source Feeds" pageSubtitle={`${activeCount} active of ${feeds.length} feeds`} section="Content">
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Add RSS Feed</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://www.vogue.com/feed/rss"
            onKeyDown={e => e.key === "Enter" && addFeed()}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          <button onClick={addFeed} disabled={addMut.isPending}
            style={{ padding: "8px 16px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {addMut.isPending ? "Adding..." : "Add Feed"}
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {feedsQuery.isLoading ? (
          <p style={{ textAlign: "center", padding: 24, color: "#6b7280", fontSize: 13 }}>Loading feeds...</p>
        ) : feeds.length === 0 ? (
          <p style={{ textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 13 }}>No feeds yet. Add your first RSS feed above.</p>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Feed URL</th>
              <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 80 }}>Status</th>
              <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 100 }}>Last Fetched</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 140 }}>Actions</th>
            </tr></thead>
            <tbody>{feeds.map((f: any) => (
              <tr key={f.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 16px" }}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: "#374151", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                    {f.url?.replace(/^https?:\/\//, "").substring(0, 55)}{f.url?.length > 60 ? "..." : ""}
                    <ExternalLink size={11} style={{ color: "#9ca3af", flexShrink: 0 }} />
                  </a>
                  {f.lastError && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{f.lastError.substring(0, 60)}</div>}
                </td>
                <td style={{ padding: "10px 16px", textAlign: "center" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: f.enabled ? "#d1fae5" : f.errorCount > 0 ? "#fee2e2" : "#f3f4f6",
                    color: f.enabled ? "#065f46" : f.errorCount > 0 ? "#991b1b" : "#6b7280" }}>
                    {f.enabled ? "Active" : f.errorCount > 0 ? "Error" : "Paused"}
                  </span>
                </td>
                <td style={{ padding: "10px 16px", textAlign: "center", color: "#6b7280", fontSize: 12 }}>
                  {relativeTime(f.lastFetched)}
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button onClick={() => { setFetchingId(f.id); fetchNowMut.mutate({ feedId: f.id }); }}
                      disabled={fetchingId === f.id}
                      style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: "#6b7280" }}
                      title="Fetch now">
                      {fetchingId === f.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    </button>
                    <button onClick={() => toggleMut.mutate({ feedId: f.id, enabled: !f.enabled })}
                      style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: "#6b7280" }}
                      title={f.enabled ? "Pause" : "Resume"}>
                      {f.enabled ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    <button onClick={() => { if (confirm("Remove this feed?")) removeMut.mutate({ feedId: f.id }); }}
                      style={{ background: "none", border: "1px solid #ef4444", borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: "#ef4444" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </TenantLayout>
  );
}
