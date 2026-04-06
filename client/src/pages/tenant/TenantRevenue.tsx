import React from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { ExternalLink } from "lucide-react";

export default function TenantRevenue() {
  const { data: overview } = trpc.revenue.getOverview.useQuery();
  const { data: topArticles } = trpc.revenue.getTopArticles.useQuery();
  const { data: distribution } = trpc.revenue.getDistributionStats.useQuery();

  const kpis = [
    { label: "Published Articles", value: overview?.publishedArticles || 0, color: "#3b82f6", bg: "#eff6ff" },
    { label: "Total Views", value: overview?.totalViews || 0, color: "#22c55e", bg: "#f0fdf4" },
    { label: "Subscribers", value: overview?.subscribers || 0, color: "#8b5cf6", bg: "#f5f3ff" },
    { label: "Social Posts Sent", value: overview?.socialPostsSent || 0, color: "#2dd4bf", bg: "#f0fdfa" },
  ];

  const revenueSources = [
    { name: "Google AdSense", configured: overview?.adsenseEnabled, note: "Connect in Settings" },
    { name: "Sponsors", configured: overview?.sponsorEnabled, note: "Set up in Sponsor Schedule" },
    { name: "Amazon Associates", configured: overview?.amazonEnabled, note: "Connect in Settings" },
  ];

  const articles = topArticles?.articles || [];
  const maxViews = articles[0]?.views || 1;
  const stats = distribution?.stats || [];

  return (
    <TenantLayout pageTitle="Revenue & Attribution" pageSubtitle="Track content performance across all channels" section="Analytics">
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }} className="rev-kpi-grid">
        {kpis.map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <span style={{ color: k.color, fontSize: 14, fontWeight: 700 }}>#</span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{k.value.toLocaleString()}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Estimates */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Revenue Sources</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {revenueSources.map(s => (
            <div key={s.name} style={{ padding: 16, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{s.name}</p>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: s.configured ? "#d1fae5" : "#f3f4f6", color: s.configured ? "#065f46" : "#9ca3af", fontWeight: 600 }}>
                {s.configured ? "Configured" : "Not set up"}
              </span>
              {!s.configured && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>{s.note}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Top Articles */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top Performing Articles</h2>
        {articles.length === 0 ? (
          <p style={{ textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 13 }}>No articles with view data yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {articles.map((a: any, i: number) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#e5e7eb", width: 28, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{a.headline}</p>
                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    <span>{a.categoryName || "Uncategorized"}</span>
                    <span>{a.views || 0} views</span>
                    <span>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                  </div>
                  <div style={{ height: 3, background: "#f3f4f6", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: "#2dd4bf60", width: Math.round((a.views || 0) / maxViews * 100) + "%" }} />
                  </div>
                </div>
                <a href={"/article/" + a.slug} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, color: "#9ca3af" }}><ExternalLink size={14} /></a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Social Distribution */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Social Distribution</h2>
        {stats.length === 0 ? (
          <p style={{ textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 13 }}>No social posts sent yet</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {stats.map((s: any) => (
              <div key={s.platform} style={{ padding: 16, background: "#f9fafb", borderRadius: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize", marginBottom: 2 }}>{s.platform}</p>
                <p style={{ fontSize: 24, fontWeight: 700 }}>{s.sent}</p>
                <p style={{ fontSize: 11, color: "#9ca3af" }}>posts sent</p>
                {s.failed > 0 && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{s.failed} failed</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@media (max-width: 768px) { .rev-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </TenantLayout>
  );
}
