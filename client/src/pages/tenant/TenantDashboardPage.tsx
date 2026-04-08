import { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText, Eye, Users, Send, AlertCircle, BarChart2, Zap, Star,
  Image, Globe, ExternalLink, RefreshCw, Loader2, Play, Mail,
  PenLine, CheckCircle2, XCircle, Lightbulb, Activity, TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function Skeleton({ w, h }: { w?: string; h?: number }) {
  return <div style={{ width: w || "100%", height: h || 16, borderRadius: 4, background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />;
}

function KpiCard({ label, value, sub, color, href, loading }: { label: string; value: string | number; sub?: string; color: string; href?: string; loading?: boolean }) {
  const inner = (
    <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", transition: "border-color 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2dd4bf")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}>
      {loading ? <><Skeleton h={12} w="60%" /><div style={{ height: 6 }} /><Skeleton h={28} w="40%" /><div style={{ height: 4 }} /><Skeleton h={10} w="80%" /></> : <>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
      </>}
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</a> : inner;
}

const SOURCE_LABELS: Record<string, string> = { rss: "RSS Feeds", google_news: "Google News", reddit: "Reddit", x: "X (Twitter)", youtube: "YouTube", manual: "Manual", scraper: "Web Scraper" };

export default function TenantDashboardPage() {
  const [tab, setTab] = useState("content");
  const fast = trpc.dashboard.getFastSnapshot.useQuery(undefined, { staleTime: 15000 });
  const full = trpc.dashboard.getSnapshot.useQuery(undefined, { staleTime: 60000 });
  const runMut = trpc.workflow.runProductionLoop.useMutation({ onSuccess: () => toast.success("Generation run started"), onError: (e: any) => toast.error(e.message) });
  const utils = trpc.useUtils();
  const approveMut = trpc.articles.approve.useMutation({ onSuccess: () => { toast.success("Approved"); utils.dashboard.getSnapshot.invalidate(); utils.dashboard.getFastSnapshot.invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const rejectMut = trpc.articles.reject.useMutation({ onSuccess: () => { toast.success("Rejected"); utils.dashboard.getSnapshot.invalidate(); utils.dashboard.getFastSnapshot.invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const backfillGeoMut = trpc.geo.generateBulk.useMutation({ onSuccess: () => toast.success("GEO backfill started"), onError: (e: any) => toast.error(e.message) });
  const f = fast.data;
  const d = full.data;

  const TABS = ["Content", "Social", "Communications", "Monetization"];

  const byDay = (d?.articles?.byDay ?? []).map((r: any) => ({
    day: new Date(r.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    Published: r.published ?? 0,
    Pending: r.pending ?? 0,
    Rejected: r.rejected ?? 0,
  }));

  const sourcePerf = (d as any)?.sourcePerformance ?? [];
  const maxSource = Math.max(1, ...sourcePerf.map((s: any) => s.candidateCount));

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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FEF3C7", border: "1px solid #F59E0B", marginBottom: 16, alignItems: "center" }}>
                <AlertCircle size={14} style={{ color: "#92400E", flexShrink: 0 }} />
                {f.pending > 0 && <a href="/admin/articles?status=pending" style={{ fontSize: 12, color: "#92400E", textDecoration: "underline" }}>{f.pending} pending review</a>}
                {f.missingImages > 0 && <span style={{ fontSize: 12, color: "#92400E" }}>{f.missingImages} missing images</span>}
                {f.missingGeo > 0 && <span style={{ fontSize: 12, color: "#92400E" }}>{f.missingGeo} missing GEO</span>}
                {f.candidatePoolDepth < 10 && <a href="/admin/source-feeds" style={{ fontSize: 12, color: "#92400E", textDecoration: "underline" }}>Pool low</a>}
              </div>
            )}

            {/* Pending Review */}
            {d?.pendingArticles && d.pendingArticles.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><AlertCircle size={14} style={{ color: "#D97706" }} /> Pending Review</h3>
                {d.pendingArticles.map((a: any) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.headline}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}</div>
                    </div>
                    <button onClick={() => approveMut.mutate({ id: a.id })} disabled={approveMut.isPending} style={{ background: "none", border: "none", cursor: "pointer", color: "#22c55e", padding: 2 }} title="Approve"><CheckCircle2 size={15} /></button>
                    <button onClick={() => rejectMut.mutate({ id: a.id })} disabled={rejectMut.isPending} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }} title="Reject"><XCircle size={15} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* 7-Day Activity Chart */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><BarChart2 size={14} /> 7-Day Activity</h3>
              {full.isLoading ? <Skeleton h={160} /> : byDay.length > 0 && byDay.some((d: any) => d.Published > 0 || d.Pending > 0 || d.Rejected > 0) ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={byDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Published" fill="#1D9E75" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Pending" fill="#EF9F27" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Rejected" fill="#E53E3E" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No activity this week</div>
              )}
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                {[["Published", "#1D9E75"], ["Pending", "#EF9F27"], ["Rejected", "#E53E3E"]].map(([label, color]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />{label}
                  </div>
                ))}
              </div>
            </div>

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

            {/* Content Health + Source Performance row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {/* Content Health */}
              <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Zap size={13} /> Content Health</h3>
                {fast.isLoading ? <Skeleton h={60} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Missing Images", value: f?.missingImages ?? 0, bad: (f?.missingImages ?? 0) > 0, href: "/admin/articles?missingImage=true" },
                      { label: "Missing GEO", value: f?.missingGeo ?? 0, bad: (f?.missingGeo ?? 0) > 0, href: "/admin/articles?missingGeo=true" },
                      { label: "Missing SEO", value: f?.missingSeo ?? 0, bad: (f?.missingSeo ?? 0) > 0, href: "/admin/articles" },
                    ].map(item => (
                      <a key={item.label} href={item.href} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{item.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: item.bad ? "#dc2626" : "#22c55e" }}>{item.value}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Source Performance */}
              <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Source Performance</h3>
                {full.isLoading ? <Skeleton h={60} /> : sourcePerf.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 16 }}>No candidate data this week</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {sourcePerf.map((s: any) => (
                      <div key={s.sourceType} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#6b7280", width: 70, flexShrink: 0 }}>{SOURCE_LABELS[s.sourceType] || s.sourceType}</span>
                        <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "#2dd4bf", borderRadius: 99, width: `${(s.candidateCount / maxSource) * 100}%` }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280", width: 24, textAlign: "right" }}>{s.candidateCount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  {((d as any)?.aiTips ?? []).length > 0
                    ? ((d as any).aiTips as string[]).map((tip, i) => <p key={i} style={{ marginBottom: 6 }}>{tip}</p>)
                    : <p style={{ fontStyle: "italic" }}>Generating insights for your publication...</p>
                  }
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
                <button onClick={() => backfillGeoMut.mutate()} disabled={backfillGeoMut.isPending}
                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer", color: "#374151" }}>
                  {backfillGeoMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />} Backfill GEO
                </button>
              </div>
            </div>

            {/* System Health */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 14, border: "1px solid #e5e7eb" }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Activity size={13} /> System Health</h4>
              {fast.isLoading ? <Skeleton h={80} /> : (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: (d?.systemHealth?.loopEnabled ?? f?.loopEnabled) ? "#22c55e" : "#ef4444" }} />
                    Loop: {(d?.systemHealth?.loopEnabled ?? f?.loopEnabled) ? "Active" : "Paused"}
                  </div>
                  {d?.systemHealth && <>
                    <div style={{ padding: "4px 0" }}>LLM: {d.systemHealth.llmProvider}</div>
                    <div style={{ padding: "4px 0" }}>Images: {d.systemHealth.imageProvider}</div>
                    <div style={{ padding: "4px 0" }}>RSS Feeds: {d.systemHealth.rssFeedCount}{d.systemHealth.rssFeedErrors > 0 && <span style={{ color: "#ef4444" }}> ({d.systemHealth.rssFeedErrors} errors)</span>}</div>
                    <div style={{ padding: "4px 0" }}>Email: {d.systemHealth.emailEnabled ? "Configured" : "Not set"}</div>
                    <div style={{ padding: "4px 0" }}>S3: {d.systemHealth.s3Enabled ? "Configured" : "Not set"}</div>
                  </>}
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
