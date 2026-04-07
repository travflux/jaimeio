import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import {
  FileText, Eye, Users, Send, TrendingUp,
  AlertCircle, BarChart2, Zap, Star,
  Image, Globe, ExternalLink, RefreshCw, Loader2,
} from "lucide-react";

export default function TenantDashboardPage() {
  const { data, isLoading, refetch } = trpc.dashboard.getSnapshot.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  if (isLoading) {
    return (
      <TenantLayout pageTitle="Dashboard" pageSubtitle="Loading..." section="Overview">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <div style={{ textAlign: "center" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#2dd4bf", margin: "0 auto 12px", display: "block" }} />
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading dashboard...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </TenantLayout>
    );
  }

  const alerts = [
    (data?.articles?.missingImage ?? 0) > 0 && {
      message: `${data.articles.missingImage} published articles missing images`,
      href: "/admin/articles?missingImage=true",
      label: "Fix now",
    },
    (data?.articles?.missingGeo ?? 0) > 0 && {
      message: `${data.articles.missingGeo} published articles missing GEO`,
      href: "/admin/articles?missingGeo=true",
      label: "Fix now",
    },
    (data?.articles?.pending ?? 0) > 10 && {
      message: `${data.articles.pending} articles waiting for review`,
      href: "/admin/articles?status=pending",
      label: "Review",
    },
  ].filter(Boolean) as { message: string; href: string; label: string }[];

  const totalSocialSent = Object.values(data?.social ?? {})
    .reduce((sum: number, p: any) => sum + (p.sent ?? 0), 0);

  return (
    <TenantLayout pageTitle="Dashboard" pageSubtitle="Performance overview" section="Overview"
      headerActions={
        <button onClick={() => refetch()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af" }}>
          <RefreshCw size={16} />
        </button>
      }>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {alerts.map((alert, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 13 }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{alert.message}</span>
              <a href={alert.href} style={{ fontWeight: 600, textDecoration: "underline", flexShrink: 0 }}>{alert.label}</a>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total Articles", value: (data?.articles?.total ?? 0).toLocaleString(), sub: `${data?.articles?.thisMonth ?? 0} this month`, icon: FileText, color: "#3b82f6", bg: "#eff6ff", href: "/admin/articles" },
          { label: "Total Views", value: (data?.views?.total ?? 0).toLocaleString(), sub: "all published", icon: Eye, color: "#22c55e", bg: "#f0fdf4", href: "/admin/articles" },
          { label: "Subscribers", value: (data?.newsletter?.subscribers ?? 0).toLocaleString(), sub: "newsletter", icon: Users, color: "#8b5cf6", bg: "#faf5ff", href: "/admin/newsletter" },
          { label: "Social Posts", value: totalSocialSent.toLocaleString(), sub: "sent last 30d", icon: Send, color: "#2dd4bf", bg: "#f0fdfa", href: "/admin/distribution" },
        ].map(kpi => (
          <a key={kpi.label} href={kpi.href} style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", textDecoration: "none", color: "inherit", display: "block", transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#2dd4bf")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <kpi.icon size={16} style={{ color: kpi.color }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>{kpi.value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginTop: 2 }}>{kpi.label}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{kpi.sub}</div>
          </a>
        ))}
      </div>

      {/* Article Production + Needs Attention */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Article Production */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={16} style={{ color: "#2dd4bf" }} /> Article Production
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Published", value: data?.articles?.published ?? 0, color: "#22c55e", href: "/admin/articles?status=published" },
              { label: "Pending", value: data?.articles?.pending ?? 0, color: "#f97316", href: "/admin/articles?status=pending" },
              { label: "Approved", value: data?.articles?.approved ?? 0, color: "#3b82f6", href: "/admin/articles?status=approved" },
              { label: "Draft", value: data?.articles?.draft ?? 0, color: "#9ca3af", href: "/admin/articles?status=draft" },
              { label: "Rejected", value: data?.articles?.rejected ?? 0, color: "#ef4444", href: "/admin/articles?status=rejected" },
            ].map(row => {
              const pct = (data?.articles?.total ?? 0) > 0 ? Math.round(row.value / (data?.articles?.total ?? 1) * 100) : 0;
              return (
                <a key={row.label} href={row.href} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
                  <span style={{ fontSize: 12, color: "#6b7280", width: 70, flexShrink: 0 }}>{row.label}</span>
                  <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 99, background: row.color, width: `${pct}%`, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280", width: 28, textAlign: "right" }}>{row.value}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Needs Attention */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={16} style={{ color: "#2dd4bf" }} /> Needs Attention
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Missing Images", value: data?.articles?.missingImage ?? 0, icon: Image, href: "/admin/articles?missingImage=true", urgent: (data?.articles?.missingImage ?? 0) > 0 },
              { label: "Missing GEO", value: data?.articles?.missingGeo ?? 0, icon: Globe, href: "/admin/articles?missingGeo=true", urgent: (data?.articles?.missingGeo ?? 0) > 5 },
              { label: "Pending Review", value: data?.articles?.pending ?? 0, icon: FileText, href: "/admin/articles?status=pending", urgent: (data?.articles?.pending ?? 0) > 10 },
              { label: "Editor's Picks", value: data?.articles?.editorsPicks ?? 0, icon: Star, href: "/admin/articles", urgent: false },
            ].map(item => (
              <a key={item.label} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, textDecoration: "none", color: "inherit", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: item.urgent ? "#fffbeb" : "#f3f4f6", flexShrink: 0 }}>
                  <item.icon size={14} style={{ color: item.urgent ? "#f59e0b" : "#9ca3af" }} />
                </div>
                <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.urgent ? "#d97706" : "#9ca3af" }}>{item.value}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Top Articles + Trending */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Top Performing */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={16} style={{ color: "#2dd4bf" }} /> Top Performing
            </h2>
            <a href="/admin/articles?status=published" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>View all</a>
          </div>
          {!(data?.topArticles?.length) ? (
            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "24px 0" }}>No articles with views yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.topArticles.map((article: any, i: number) => (
                <div key={article.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#e5e7eb", width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{article.headline}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{(article.views ?? 0).toLocaleString()} views</p>
                    <div style={{ height: 3, background: "#f3f4f6", borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#2dd4bf", borderRadius: 99, width: `${Math.round((article.views ?? 0) / Math.max(1, data.topArticles[0]?.views ?? 1) * 100)}%` }} />
                    </div>
                  </div>
                  {article.slug && (
                    <a href={`/article/${article.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af", flexShrink: 0, marginTop: 2 }}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trending */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>Trending Now</h2>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Updated hourly</span>
          </div>
          {!(data?.trendingArticles?.length) ? (
            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "24px 0" }}>No trending articles yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {data.trendingArticles.map((article: any, i: number) => (
                <div key={article.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ fontSize: 11, color: "#9ca3af", width: 16 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{article.headline}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{(article.views ?? 0).toLocaleString()} views</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Social + Newsletter */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Social */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <Send size={16} style={{ color: "#2dd4bf" }} /> Social Distribution
            </h2>
            <a href="/admin/distribution" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>Manage</a>
          </div>
          {!Object.keys(data?.social ?? {}).length ? (
            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "24px 0" }}>No social posts sent yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(data?.social ?? {}).map(([platform, stats]: [string, any]) => (
                <div key={platform} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, textTransform: "capitalize", width: 80, flexShrink: 0 }}>{platform}</span>
                  <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                    <span style={{ color: "#22c55e" }}>{stats.sent ?? 0} sent</span>
                    {(stats.failed ?? 0) > 0 && <span style={{ color: "#ef4444" }}>{stats.failed} failed</span>}
                    {(stats.pending ?? 0) > 0 && <span style={{ color: "#f59e0b" }}>{stats.pending} queued</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} style={{ color: "#2dd4bf" }} /> Newsletter
            </h2>
            <a href="/admin/newsletter" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>Manage</a>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{(data?.newsletter?.subscribers ?? 0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>total subscribers</div>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 768px) { div[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; } div[style*="1fr 1fr"] { grid-template-columns: 1fr !important; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </TenantLayout>
  );
}
