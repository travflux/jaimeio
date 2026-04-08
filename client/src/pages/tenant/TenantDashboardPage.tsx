import { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText, Eye, Users, Send, AlertCircle, BarChart2, Zap, Star,
  Image, Globe, ExternalLink, RefreshCw, Loader2, Play, Mail,
  PenLine, CheckCircle2, XCircle, Lightbulb, Activity
} from "lucide-react";

function Skeleton({ w, h }: { w?: string; h?: number }) {
  return <div style={{ width: w || "100%", height: h || 16, borderRadius: 4, background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />;
}

function KpiCard({ label, value, sub, color, href, loading }: { label: string; value: string | number; sub?: string; color: string; href?: string; loading?: boolean }) {
  const inner = (
    <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", transition: "border-color 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2dd4bf")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}>
      {loading ? <><Skeleton h={12} w="60%" /><Skeleton h={28} w="40%" /><Skeleton h={10} w="80%" /></> : <>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
      </>}
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</a> : inner;
}

export default function TenantDashboardPage() {
  const [tab, setTab] = useState("content");
  const fast = trpc.dashboard.getFastSnapshot.useQuery(undefined, { staleTime: 15000 });
  const full = trpc.dashboard.getSnapshot.useQuery(undefined, { staleTime: 60000 });
  const runMut = trpc.workflow.runProductionLoop.useMutation({ onSuccess: () => toast.success("Generation run started"), onError: (e: any) => toast.error(e.message) });
  const statusMut = trpc.articles.updateStatus.useMutation({ onSuccess: () => { toast.success("Updated"); fast.refetch(); full.refetch(); } });
  const f = fast.data;
  const d = full.data;

  const TABS = ["Content", "Social", "Communications", "Monetization"];

  return (
    <TenantLayout pageTitle="Dashboard" pageSubtitle="Performance overview" section="Content">
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t.toLowerCase())} style={{ padding: "7px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer",
            borderColor: tab === t.toLowerCase() ? "#111827" : "#e5e7eb", background: tab === t.toLowerCase() ? "#111827" : "#fff", color: tab === t.toLowerCase() ? "#fff" : "#6b7280" }}>{t}</button>
        ))}
      </div>

      {tab !== "content" && (
        <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>
          <p style={{ fontSize: 15 }}>{tab.charAt(0).toUpperCase() + tab.slice(1)} analytics coming soon.</p>
        </div>
      )}

      {tab === "content" && (
        <div style={{ display: "flex", gap: 20 }}>
          {/* Left column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* KPI Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <KpiCard label="Published" value={f?.published ?? "—"} sub={`${f?.todayCount ?? 0} today`} color="#1D9E75" loading={fast.isLoading} href="/admin/articles?status=published" />
              <KpiCard label="Pending Review" value={f?.pending ?? "—"} sub={f && f.pending > 0 ? "Review now →" : "All clear"} color={f && f.pending > 0 ? "#D97706" : "#22c55e"} loading={fast.isLoading} href="/admin/articles?status=pending" />
              <KpiCard label="Candidate Pool" value={f?.candidatePoolDepth ?? "—"} sub={f && f.candidatePoolDepth < 10 ? "Pool low — add feeds" : "Candidates ready"} color={f && f.candidatePoolDepth < 10 ? "#DC2626" : "#3b82f6"} loading={fast.isLoading} href="/admin/candidates" />
              <KpiCard label="Loop Status" value={f?.loopEnabled ? "Active" : "Paused"} sub={f?.loopEnabled ? "Auto-generating" : "Enable in settings"} color={f?.loopEnabled ? "#1D9E75" : "#DC2626"} loading={fast.isLoading} href="/admin/workflow" />
            </div>

            {/* Alert strip */}
            {f && (f.pending > 0 || f.missingImages > 0 || f.missingGeo > 0 || f.candidatePoolDepth < 10) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FEF3C7", border: "1px solid #F59E0B", marginBottom: 16 }}>
                <AlertCircle size={14} style={{ color: "#92400E", marginTop: 2 }} />
                {f.pending > 0 && <a href="/admin/articles?status=pending" style={{ fontSize: 12, color: "#92400E", textDecoration: "underline" }}>{f.pending} pending review</a>}
                {f.missingImages > 0 && <span style={{ fontSize: 12, color: "#92400E" }}>{f.missingImages} missing images</span>}
                {f.missingGeo > 0 && <span style={{ fontSize: 12, color: "#92400E" }}>{f.missingGeo} missing GEO</span>}
                {f.candidatePoolDepth < 10 && <a href="/admin/source-feeds" style={{ fontSize: 12, color: "#92400E", textDecoration: "underline" }}>Pool low</a>}
              </div>
            )}

            {/* Pending Review */}
            {d?.articles?.pending && Number(d.articles.pending) > 0 && (
              <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><FileText size={14} /> Pending Review</h3>
                  <a href="/admin/articles?status=pending" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>View all →</a>
                </div>
                <p style={{ fontSize: 12, color: "#6b7280" }}>Review pending articles from the Articles page.</p>
              </div>
            )}

            {/* Top Articles */}
            {d?.topArticles && d.topArticles.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><TrendingUp size={14} /> Top Articles</h3>
                {d.topArticles.slice(0, 4).map((a: any, i: number) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 3 ? "1px solid #f3f4f6" : "none" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#e5e7eb", width: 18 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.headline}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{(a.views ?? 0).toLocaleString()} views</div>
                    </div>
                    {a.slug && <a href={`/article/${a.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af" }}><ExternalLink size={12} /></a>}
                  </div>
                ))}
              </div>
            )}

            {/* Content Health */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Zap size={14} /> Content Health</h3>
              {fast.isLoading ? <Skeleton h={60} /> : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div style={{ textAlign: "center", padding: 10, borderRadius: 6, background: f && f.missingImages > 0 ? "#fef2f2" : "#f9fafb" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: f && f.missingImages > 0 ? "#dc2626" : "#374151" }}>{f?.missingImages ?? 0}</div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>Missing Images</div>
                  </div>
                  <div style={{ textAlign: "center", padding: 10, borderRadius: 6, background: f && f.missingGeo > 0 ? "#fffbeb" : "#f9fafb" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: f && f.missingGeo > 0 ? "#d97706" : "#374151" }}>{f?.missingGeo ?? 0}</div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>Missing GEO</div>
                  </div>
                  <div style={{ textAlign: "center", padding: 10, borderRadius: 6, background: f && f.missingSeo > 0 ? "#fffbeb" : "#f9fafb" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: f && f.missingSeo > 0 ? "#d97706" : "#374151" }}>{f?.missingSeo ?? 0}</div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>Missing SEO</div>
                  </div>
                </div>
              )}
            </div>

            {/* Social Distribution */}
            {d?.social && Object.keys(d.social).length > 0 && (
              <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Send size={14} /> Social Distribution</h3>
                {Object.entries(d.social).map(([platform, stats]: [string, any]) => (
                  <div key={platform} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, textTransform: "capitalize", width: 80 }}>{platform}</span>
                    <span style={{ fontSize: 12, color: "#22c55e" }}>{stats.sent ?? 0} sent</span>
                    {(stats.failed ?? 0) > 0 && <span style={{ fontSize: 12, color: "#ef4444" }}>{stats.failed} failed</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ width: 260, flexShrink: 0 }}>
            {/* AI Insights */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 14, border: "1px solid #e5e7eb", marginBottom: 12 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Lightbulb size={13} style={{ color: "#f59e0b" }} /> AI Insights</h4>
              {full.isLoading ? <Skeleton h={40} /> : (
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                  {f && f.candidatePoolDepth < 10 && <p style={{ marginBottom: 6 }}>Your candidate pool is low. Add more RSS feeds to increase content variety.</p>}
                  {f && f.missingImages > 5 && <p style={{ marginBottom: 6 }}>{f.missingImages} articles need images. Run a backfill to improve engagement.</p>}
                  {f && f.pending > 10 && <p style={{ marginBottom: 6 }}>You have {f.pending} pending articles. Clearing the queue keeps your calendar on track.</p>}
                  {(!f || (f.candidatePoolDepth >= 10 && f.missingImages <= 5 && f.pending <= 10)) && <p>Your publication is running smoothly.</p>}
                  <p style={{ fontSize: 10, color: "#d1d5db", marginTop: 6 }}>Updated hourly</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 14, border: "1px solid #e5e7eb", marginBottom: 12 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Quick Actions</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => runMut.mutate()} disabled={runMut.isPending}
                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer", color: "#374151" }}>
                  {runMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run Generation
                </button>
                <a href="/admin/newsletter" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, textDecoration: "none", color: "#374151" }}>
                  <Mail size={12} /> Send Newsletter
                </a>
                <a href="/admin/articles/create" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, textDecoration: "none", color: "#374151" }}>
                  <PenLine size={12} /> Create Article
                </a>
              </div>
            </div>

            {/* System Health */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 14, border: "1px solid #e5e7eb" }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Activity size={13} /> System Health</h4>
              {fast.isLoading ? <Skeleton h={80} /> : (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: f?.loopEnabled ? "#22c55e" : "#ef4444" }} />
                    Loop: {f?.loopEnabled ? "Active" : "Paused"}
                  </div>
                  {d?.newsletter && <div style={{ padding: "4px 0" }}>Subscribers: {d.newsletter.subscribers ?? 0}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    </TenantLayout>
  );
}
