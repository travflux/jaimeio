import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Rss, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type SortKey = "health" | "errors" | "weight" | "name";

export default function TenantFeedPerformance() {
  const [sortBy, setSortBy] = useState<SortKey>("health");

  const { data, isLoading, refetch } = trpc.sourceFeeds.getPerformance.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const reactivateMutation = trpc.sourceFeeds.reactivate.useMutation({
    onSuccess: () => {
      toast.success("Feed re-enabled", { description: "The feed has been reactivated." });
      refetch();
    },
    onError: (err) => {
      toast.error("Error", { description: err.message });
    },
  });

  const checkAllMutation = trpc.sourceFeeds.checkAll.useMutation({
    onSuccess: (res) => {
      const msg = "reactivated" in res
        ? `${res.reactivated} feed(s) reactivated.`
        : res.message;
      toast.success("Check complete", { description: msg });
      refetch();
    },
    onError: (err) => {
      toast.error("Error", { description: err.message });
    },
  });

  const stats = data?.stats ?? { total: 0, healthy: 0, unhealthy: 0, disabled: 0 };
  const feeds = data?.feeds ?? [];

  const sorted = [...feeds].sort((a, b) => {
    if (sortBy === "health") {
      const order: Record<string, number> = { healthy: 0, unhealthy: 1, disabled: 2 };
      return (order[a.health] ?? 3) - (order[b.health] ?? 3);
    }
    if (sortBy === "errors") return b.errorCount - a.errorCount;
    if (sortBy === "weight") return b.weight - a.weight;
    if (sortBy === "name") return a.feedUrl.localeCompare(b.feedUrl);
    return 0;
  });

  const kpiCards = [
    { label: "Total Feeds", value: stats.total, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Healthy", value: stats.healthy, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    { label: "Unhealthy (3+ errors)", value: stats.unhealthy, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    { label: "Disabled", value: stats.disabled, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  ];

  const sortTabs: { key: SortKey; label: string }[] = [
    { key: "health", label: "Health" },
    { key: "errors", label: "Errors" },
    { key: "weight", label: "Weight" },
    { key: "name", label: "Name" },
  ];

  function healthBadge(health: string) {
    if (health === "healthy") {
      return (
        <Badge style={{ background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0", fontSize: 11 }}>
          Active
        </Badge>
      );
    }
    if (health === "unhealthy") {
      return (
        <Badge style={{ background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a", fontSize: 11 }}>
          Unhealthy
        </Badge>
      );
    }
    return (
      <Badge style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", fontSize: 11 }}>
        Disabled
      </Badge>
    );
  }

  function formatTime(t: string | null | undefined) {
    if (!t) return "Never";
    try {
      return new Date(t).toLocaleString();
    } catch {
      return String(t);
    }
  }

  function feedName(url: string) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return url.length > 40 ? url.slice(0, 40) + "..." : url;
    }
  }

  return (
    <TenantLayout pageTitle="Feed Performance" pageSubtitle="Monitor RSS feed health and performance metrics">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center" }}>
            <TrendingUp size={20} color="#0284c7" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>Feed Performance</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Monitor RSS feed health and performance metrics</p>
          </div>
        </div>
        {stats.unhealthy > 0 && (
          <Button
            onClick={() => checkAllMutation.mutate({})}
            disabled={checkAllMutation.isPending}
            style={{ background: "#d97706", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
          >
            <RefreshCw size={14} />
            Check &amp; Reactivate
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {kpiCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Sort tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: "#9ca3af", marginRight: 4 }}>Sort by:</span>
        {sortTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSortBy(tab.key)}
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              border: sortBy === tab.key ? "1px solid #3b82f6" : "1px solid #e5e7eb",
              background: sortBy === tab.key ? "#eff6ff" : "#fff",
              color: sortBy === tab.key ? "#2563eb" : "#6b7280",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed List */}
      {isLoading ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", color: "#9ca3af" }}>
          Loading feed data...
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center" }}>
          <Rss size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>No source feeds configured yet.</p>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Add RSS feeds in Source Feeds to start tracking performance.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((feed) => (
            <div
              key={feed.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 16,
              }}
            >
              {/* Top row: icon + name + badge + actions */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Rss size={16} color="#6b7280" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{feedName(feed.feedUrl)}</span>
                      {healthBadge(feed.health)}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, wordBreak: "break-all" }}>{feed.feedUrl}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                  <a href={feed.feedUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      style={{ padding: "4px 8px", fontSize: 11, height: "auto", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <ExternalLink size={11} />
                      Open
                    </Button>
                  </a>
                  {feed.health !== "healthy" && (
                    <Button
                      onClick={() => reactivateMutation.mutate({ feedId: feed.id })}
                      disabled={reactivateMutation.isPending}
                      style={{ padding: "4px 10px", fontSize: 11, height: "auto", background: "#16a34a", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <RefreshCw size={11} />
                      Re-enable
                    </Button>
                  )}
                </div>
              </div>

              {/* Metrics row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Weight</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>{feed.weight}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Errors</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: feed.errorCount > 0 ? "#dc2626" : "#374151" }}>{feed.errorCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Error Rate</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: typeof feed.errorRate === "number" && feed.errorRate > 0.1 ? "#d97706" : "#374151" }}>
                    {typeof feed.errorRate === "number" ? (feed.errorRate * 100).toFixed(1) + "%" : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Fetch</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{formatTime(feed.lastFetchTime)}</div>
                </div>
              </div>

              {/* Last error */}
              {feed.lastError && (
                <div style={{ marginTop: 10, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#dc2626", wordBreak: "break-all" }}>{feed.lastError}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Explainer */}
      <div style={{ marginTop: 32, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>How Feed Health Works</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[
            { term: "Healthy", desc: "Feed fetches successfully with fewer than 3 consecutive errors. Articles are being imported normally." },
            { term: "Unhealthy", desc: "Feed has accumulated 3 or more errors but has not yet been auto-disabled. May need attention." },
            { term: "Auto-Disabled", desc: "Feed was automatically disabled after repeated failures to prevent resource waste. Use Re-enable to restore." },
            { term: "Error Rate", desc: "Percentage of fetch attempts that resulted in an error. High rates (>10%) indicate a problematic feed." },
            { term: "Weight", desc: "Relative priority of this feed when selecting articles for generation. Higher weight = more articles pulled from this source." },
          ].map(({ term, desc }) => (
            <div key={term} style={{ display: "flex", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", minWidth: 110, flexShrink: 0 }}>{term}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </TenantLayout>
  );
}
