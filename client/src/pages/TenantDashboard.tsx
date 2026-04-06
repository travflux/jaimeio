import React from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  FileText, Eye, Users, Send, TrendingUp,
  Image, Globe, Star, AlertCircle, ExternalLink,
  BarChart2, Zap, Loader2
} from "lucide-react";

export default function TenantDashboard() {
  const { data, isLoading } = trpc.dashboard.getSnapshot.useQuery(undefined, {
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <TenantLayout pageTitle="Dashboard">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <div style={{ textAlign: "center" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#2dd4bf", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading dashboard...</p>
          </div>
        </div>
      </TenantLayout>
    );
  }

  const alerts = [
    data?.articles.missingImage > 0 && {
      type: "warning" as const,
      message: `${data.articles.missingImage} published article${data.articles.missingImage === 1 ? "" : "s"} missing images`,
      action: "/admin/articles?missingImage=true",
      actionLabel: "Fix now",
    },
    data?.articles.missingGeo > 0 && {
      type: "warning" as const,
      message: `${data.articles.missingGeo} published article${data.articles.missingGeo === 1 ? "" : "s"} missing GEO optimization`,
      action: "/admin/articles?missingGeo=true",
      actionLabel: "Fix now",
    },
    data?.articles.pending > 10 && {
      type: "info" as const,
      message: `${data.articles.pending} articles waiting for review`,
      action: "/admin/articles?status=pending",
      actionLabel: "Review",
    },
  ].filter(Boolean) as Array<{ type: string; message: string; action: string; actionLabel: string }>;

  const kpis = [
    { label: "Total Articles", value: data?.articles.total ?? 0, sub: `${data?.articles.thisMonth ?? 0} this month`, icon: FileText, color: "#3b82f6", bg: "#eff6ff", href: "/admin/articles" },
    { label: "Total Views", value: (data?.views.total ?? 0).toLocaleString(), sub: "all published articles", icon: Eye, color: "#22c55e", bg: "#f0fdf4", href: "/admin/articles" },
    { label: "Subscribers", value: data?.newsletter.subscribers ?? 0, sub: "newsletter subscribers", icon: Users, color: "#a855f7", bg: "#faf5ff", href: "/admin/communications" },
    { label: "Social Posts", value: Object.values(data?.social ?? {}).reduce((s: number, p: any) => s + (p.sent || 0), 0), sub: "sent last 30 days", icon: Send, color: "#14b8a6", bg: "#f0fdfa", href: "/admin/distribution" },
  ];

  const statusRows = [
    { label: "Published", value: data?.articles.published ?? 0, color: "#22c55e", href: "/admin/articles?status=published" },
    { label: "Pending Review", value: data?.articles.pending ?? 0, color: "#f59e0b", href: "/admin/articles?status=pending" },
    { label: "Approved", value: data?.articles.approved ?? 0, color: "#3b82f6", href: "/admin/articles?status=approved" },
    { label: "Draft", value: data?.articles.draft ?? 0, color: "#9ca3af", href: "/admin/articles?status=draft" },
    { label: "Rejected", value: data?.articles.rejected ?? 0, color: "#ef4444", href: "/admin/articles?status=rejected" },
  ];

  const needsAttention = [
    { label: "Missing Images", value: data?.articles.missingImage ?? 0, icon: Image, href: "/admin/articles?missingImage=true", urgent: (data?.articles.missingImage ?? 0) > 0 },
    { label: "Missing GEO", value: data?.articles.missingGeo ?? 0, icon: Globe, href: "/admin/articles?missingGeo=true", urgent: (data?.articles.missingGeo ?? 0) > 5 },
    { label: "Pending Review", value: data?.articles.pending ?? 0, icon: FileText, href: "/admin/articles?status=pending", urgent: (data?.articles.pending ?? 0) > 10 },
    { label: "Editor's Picks", value: data?.articles.editorsPicks ?? 0, icon: Star, href: "/admin/articles", urgent: false },
  ];

  return (
    <TenantLayout pageTitle="Dashboard" pageSubtitle="Publication overview and key metrics">

      {/* System Alerts */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {alerts.map((alert, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 8,
              border: `1px solid ${alert.type === "warning" ? "#fcd34d" : "#93c5fd"}`,
              background: alert.type === "warning" ? "#fffbeb" : "#eff6ff",
              color: alert.type === "warning" ? "#92400e" : "#1e40af", fontSize: 13,
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{alert.message}</span>
              <Link href={alert.action} style={{ fontWeight: 600, textDecoration: "underline", flexShrink: 0, color: "inherit" }}>
                {alert.actionLabel}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }} className="kpi-grid">
        {kpis.map(kpi => (
          <Link key={kpi.label} href={kpi.href} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20,
              cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2dd4bf"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <kpi.icon size={16} style={{ color: kpi.color }} />
              </div>
              <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{kpi.value}</p>
              <p style={{ fontSize: 12, fontWeight: 500, margin: "2px 0 0", color: "#111827" }}>{kpi.label}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>{kpi.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Article Production + Needs Attention */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }} className="two-col-grid">
        {/* Article Production */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={16} style={{ color: "#2dd4bf" }} /> Article Production
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {statusRows.map(row => (
              <Link key={row.label} href={row.href} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
                <span style={{ fontSize: 12, color: "#6b7280", width: 100 }}>{row.label}</span>
                <div style={{ flex: 1, height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: row.color, width: `${data?.articles.total ? Math.max(2, Math.round(row.value / data.articles.total * 100)) : 0}%`, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: "monospace", width: 32, textAlign: "right", color: "#6b7280" }}>{row.value}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Needs Attention */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={16} style={{ color: "#2dd4bf" }} /> Needs Attention
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {needsAttention.map(item => (
              <Link key={item.label} href={item.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 8, textDecoration: "none", color: "inherit", transition: "background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: item.urgent ? "#fffbeb" : "#f3f4f6" }}>
                  <item.icon size={14} style={{ color: item.urgent ? "#f59e0b" : "#9ca3af" }} />
                </div>
                <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.urgent ? "#d97706" : "#9ca3af" }}>{item.value}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Top Articles + Trending */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }} className="two-col-grid">
        {/* Top Performing */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={16} style={{ color: "#2dd4bf" }} /> Top Performing
            </h2>
            <Link href="/admin/articles" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>View all</Link>
          </div>
          {!data?.topArticles?.length ? (
            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 20 }}>No articles with views yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.topArticles.map((article: any, i: number) => (
                <div key={article.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#e5e7eb", width: 20, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, margin: 0 }}>{article.headline}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{(article.views ?? 0).toLocaleString()} views</span>
                    </div>
                    <div style={{ height: 3, background: "#f3f4f6", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "rgba(45,212,191,0.4)", borderRadius: 2, width: `${Math.round((article.views ?? 0) / Math.max(1, data.topArticles[0]?.views ?? 1) * 100)}%` }} />
                    </div>
                  </div>
                  <a href={`/article/${article.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af", flexShrink: 0, marginTop: 2 }}>
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trending Now */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              Trending Now
            </h2>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Updated hourly</span>
          </div>
          {!data?.trendingArticles?.length ? (
            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 20 }}>No trending articles yet — views will populate this</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.trendingArticles.map((article: any, i: number) => (
                <div key={article.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, transition: "background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", width: 16 }}>{i + 1}</span>
                  <p style={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{article.headline}</p>
                  <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{(article.views ?? 0).toLocaleString()} views</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Social Distribution + Newsletter */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="two-col-grid">
        {/* Social by Platform */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <Send size={16} style={{ color: "#2dd4bf" }} /> Social Distribution
            </h2>
            <Link href="/admin/distribution" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>Manage queue</Link>
          </div>
          {!Object.keys(data?.social ?? {}).length ? (
            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 20 }}>No social posts sent yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(data?.social ?? {}).map(([platform, stats]: [string, any]) => (
                <div key={platform} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, textTransform: "capitalize", width: 80 }}>{platform}</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#22c55e" }}>{stats.sent} sent</span>
                    {stats.failed > 0 && <span style={{ fontSize: 12, color: "#ef4444" }}>· {stats.failed} failed</span>}
                    {stats.pending > 0 && <span style={{ fontSize: 12, color: "#f59e0b" }}>· {stats.pending} queued</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} style={{ color: "#2dd4bf" }} /> Newsletter
            </h2>
            <Link href="/admin/communications" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>Manage</Link>
          </div>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{(data?.newsletter.subscribers ?? 0).toLocaleString()}</p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>total subscribers</p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .kpi-grid { grid-template-columns: 1fr !important; } .two-col-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 1024px) { .two-col-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </TenantLayout>
  );
}
