import { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  TrendingUp, Eye, Users, DollarSign, Play, RefreshCw, Mail, PenLine,
  Sparkles, AlertCircle, CheckCircle2, XCircle, Activity, ExternalLink,
  Send, BarChart2, Loader2, MessageCircle, CreditCard,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";

/* ── Helpers ─────────────────────────────────────────── */
function Skeleton({ width = "100%", height = 16, dark }: { width?: string | number; height?: number; dark?: boolean }) {
  return (
    <div style={{
      width, height, borderRadius: 4,
      background: dark
        ? "linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%)"
        : "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    }} />
  );
}

function KpiCard({ icon, label, value, sub, change, positive, loading, href }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  change?: string; positive?: boolean; loading?: boolean; href?: string;
}) {
  const inner = (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16, flex: 1, minWidth: 0 }}>
      {loading ? (
        <><Skeleton height={12} width="50%" /><div style={{ height: 8 }} /><Skeleton height={28} width="35%" /><div style={{ height: 6 }} /><Skeleton height={10} width="70%" /></>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
            {change && <span style={{ fontSize: 12, fontWeight: 500, color: positive ? "#059669" : "#DC2626" }}>{positive ? "\u2191" : "\u2192"} {change}</span>}
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{value}</div>
          <div style={{ fontSize: 13, color: "#6B7280" }}>{label}</div>
          {sub && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>}
        </>
      )}
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0, display: "flex" }}>{inner}</a> : inner;
}

function SectionCard({ title, right, children, loading, empty, emptyMsg }: {
  title: string; right?: React.ReactNode; children: React.ReactNode;
  loading?: boolean; empty?: boolean; emptyMsg?: string;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{title}</h3>
        {right}
      </div>
      {loading ? <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={20} />)}</div>
        : empty ? <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: 24 }}>{emptyMsg || "No data yet"}</p>
        : children}
    </div>
  );
}

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n); }
function pct(a: number, b: number) { if (!b) return "0%"; return Math.round(((a - b) / Math.max(b, 1)) * 100) + "%"; }

const SOURCE_LABELS: Record<string, string> = { rss: "RSS Feeds", google_news: "Google News", reddit: "Reddit", x: "X (Twitter)", youtube: "YouTube", manual: "Manual", scraper: "Web Scraper" };
const PLATFORM_LABELS: Record<string, string> = { x: "X (Twitter)", reddit: "Reddit", bluesky: "Bluesky", linkedin: "LinkedIn", facebook: "Facebook", instagram: "Instagram", threads: "Threads" };

/* ── Component ───────────────────────────────────────── */
export default function TenantDashboardPage() {
  const { licenseId } = useTenantContext();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"content" | "social" | "communications" | "monetization">("content");

  // Queries
  const fast = trpc.dashboard.getFastSnapshot.useQuery(undefined, { staleTime: 30000 });
  const full = trpc.dashboard.getSnapshot.useQuery(undefined, { enabled: activeTab === "content", staleTime: 60000 });
  const social = trpc.dashboard.getSocialSnapshot.useQuery(undefined, { enabled: activeTab === "social", staleTime: 60000 });
  const comms = trpc.dashboard.getCommsSnapshot.useQuery(undefined, { enabled: activeTab === "communications", staleTime: 60000 });
  const monet = trpc.dashboard.getMonetizationSnapshot.useQuery(undefined, { enabled: activeTab === "monetization", staleTime: 60000 });

  // Mutations
  const utils = trpc.useUtils();
  const invalidDash = () => { utils.dashboard.getFastSnapshot.invalidate(); utils.dashboard.getSnapshot.invalidate(); };
  const approveMut = trpc.articles.approve.useMutation({ onSuccess: () => { invalidDash(); utils.articles.list.invalidate(); toast.success("Approved"); }, onError: (e) => toast.error(e.message) });
  const rejectMut = trpc.articles.reject.useMutation({ onSuccess: () => { invalidDash(); utils.articles.list.invalidate(); toast.success("Rejected"); }, onError: (e) => toast.error(e.message) });
  const backfillMut = trpc.articles.backfillEnrichment.useMutation({ onSuccess: (d) => toast.success((d as any).message), onError: (e) => toast.error(e.message) });
  const runGenMut = trpc.workflow.runProductionLoop.useMutation({ onSuccess: () => toast.success("Generation started"), onError: (e) => toast.error(e.message) });

  const f = fast.data;
  const d = full.data as any;
  const s = social.data as any;
  const c = comms.data as any;
  const m = monet.data as any;

  const byDay = (d?.articles?.byDay ?? []).map((r: any) => ({
    day: new Date(r.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    Published: r.published ?? 0, Pending: r.pending ?? 0, Rejected: r.rejected ?? 0,
  }));

  const TABS = ["content", "social", "communications", "monetization"] as const;

  return (
    <TenantLayout pageTitle="Dashboard" pageSubtitle="Performance overview" section="Content">
      <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 200px)" }}>
        {/* ══════════ MAIN COLUMN ══════════ */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 14,
                fontWeight: activeTab === tab ? 500 : 400,
                background: activeTab === tab ? "#111827" : "transparent",
                color: activeTab === tab ? "#fff" : "#6B7280", textTransform: "capitalize",
              }}>{tab}</button>
            ))}
          </div>

          {/* Alert strip (content tab) */}
          {activeTab === "content" && f && (f.pending > 0 || f.missingGeo > 0 || f.candidatePoolDepth < 10) && (
            <div style={{ background: "#FFFBEB", border: "1px solid #F59E0B", borderRadius: 8, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#92400E" }}>
              <AlertCircle size={16} />
              <span>
                {f.pending > 0 && <><strong>{f.pending} articles</strong> pending review &middot; </>}
                {f.missingGeo > 0 && <><strong>{f.missingGeo}</strong> missing GEO &middot; </>}
                {f.candidatePoolDepth < 10 && <>Pool low ({f.candidatePoolDepth} remaining)</>}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {f.pending > 0 && <a href="/admin/articles?status=pending" style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #2DD4BF", borderRadius: 6, color: "#0F766E", textDecoration: "none" }}>Review</a>}
              </div>
            </div>
          )}

          {/* ── CONTENT TAB ── */}
          {activeTab === "content" && (
            <>
              {/* KPI cards */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <KpiCard icon={<TrendingUp size={16} color="#059669" />} label="Published" value={f ? String(f.published) : "\u2014"} sub={`${f?.todayCount ?? 0} today \u00b7 ${f?.pending ?? 0} pending`} loading={fast.isLoading} href="/admin/articles?status=published" />
                <KpiCard icon={<Eye size={16} color="#3B82F6" />} label="Total views" value={d?.views ? fmt(d.views.total) : "\u2014"} sub={d?.articles ? `${d.articles.thisMonth} this month` : undefined} loading={full.isLoading} />
                <KpiCard icon={<Users size={16} color="#8B5CF6" />} label="Subscribers" value={d?.newsletter ? String(d.newsletter.subscribers) : "\u2014"} loading={full.isLoading} />
                <KpiCard icon={<DollarSign size={16} color="#F59E0B" />} label="Candidate pool" value={f ? String(f.candidatePoolDepth) : "\u2014"} sub={f && f.candidatePoolDepth < 10 ? "Pool low" : "Ready"} loading={fast.isLoading} href="/admin/candidates" />
              </div>

              {/* Chart + Pending review row */}
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                {/* 7-day chart */}
                <div style={{ flex: 3 }}>
                  <SectionCard title="Article output \u2014 7 days" right={<a href="/admin/calendar" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>View calendar \u2192</a>} loading={full.isLoading} empty={byDay.length === 0} emptyMsg="No activity this week">
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={byDay} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis hide allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="Published" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Pending" stroke="#EF9F27" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Rejected" stroke="#E53E3E" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                      {[["Published", "#1D9E75"], ["Pending", "#EF9F27"], ["Rejected", "#E53E3E"]].map(([l, c]) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />{l}
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>

                {/* Pending review */}
                <div style={{ flex: 2 }}>
                  <SectionCard title="Pending review" right={f && f.pending > 0 ? <a href="/admin/articles?status=pending" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>View all {f.pending} \u2192</a> : undefined} loading={full.isLoading} empty={!d?.pendingArticles?.length} emptyMsg="No articles pending review \u2713">
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(d?.pendingArticles ?? []).slice(0, 5).map((a: any) => (
                        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF9F27", flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.headline}</span>
                          <button onClick={() => approveMut.mutate({ id: a.id })} disabled={approveMut.isPending} title="Approve" style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #D1FAE5", background: "#F0FDF4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}><CheckCircle2 size={14} /></button>
                          <button onClick={() => rejectMut.mutate({ id: a.id })} disabled={rejectMut.isPending} title="Reject" style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626" }}><XCircle size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              </div>

              {/* Top articles + Content health + Source performance */}
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                {/* Top performing */}
                <div style={{ flex: 1 }}>
                  <SectionCard title="Top performing" loading={full.isLoading} empty={!d?.topArticles?.length} emptyMsg="No published articles yet">
                    {(d?.topArticles ?? []).slice(0, 4).map((a: any, i: number) => (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 3 ? "1px solid #F3F4F6" : "none" }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#E5E7EB", width: 20 }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.headline}</span>
                        <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "monospace" }}>{fmt(a.views ?? 0)}</span>
                      </div>
                    ))}
                  </SectionCard>
                </div>

                {/* Content health */}
                <div style={{ flex: 1 }}>
                  <SectionCard title="Content health" right={<a href="/admin/articles" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>Fix all \u2192</a>} loading={fast.isLoading}>
                    {[
                      { label: "Missing images", value: f?.missingImages ?? 0, bad: (f?.missingImages ?? 0) > 0 },
                      { label: "Missing GEO", value: f?.missingGeo ?? 0, bad: (f?.missingGeo ?? 0) > 0 },
                      { label: "Missing SEO", value: f?.missingSeo ?? 0, bad: (f?.missingSeo ?? 0) > 0 },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>{item.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: item.bad ? "#DC2626" : "#059669" }}>{item.value}</span>
                      </div>
                    ))}
                  </SectionCard>
                </div>

                {/* Source performance */}
                <div style={{ flex: 1 }}>
                  <SectionCard title="Source performance" right={<a href="/admin/source-feeds" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>Configure \u2192</a>} loading={full.isLoading} empty={!d?.sourcePerformance?.length} emptyMsg="No candidate data">
                    {(() => {
                      const sp = d?.sourcePerformance ?? [];
                      const maxV = Math.max(1, ...sp.map((s: any) => s.candidateCount));
                      return sp.map((s: any) => (
                        <div key={s.sourceType} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: "#6B7280", width: 70, flexShrink: 0 }}>{SOURCE_LABELS[s.sourceType] || s.sourceType}</span>
                          <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", background: "#2DD4BF", borderRadius: 99, width: `${(s.candidateCount / maxV) * 100}%` }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: "monospace", color: "#6B7280", width: 24, textAlign: "right" }}>{s.candidateCount}</span>
                        </div>
                      ));
                    })()}
                  </SectionCard>
                </div>
              </div>
            </>
          )}

          {/* ── SOCIAL TAB ── */}
          {activeTab === "social" && (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <KpiCard icon={<Send size={16} color="#7F77DD" />} label="Posts this week" value={s ? String(s.postsThisWeek) : "\u2014"} loading={social.isLoading} />
                <KpiCard icon={<TrendingUp size={16} color="#059669" />} label="Total engagement" value={s ? fmt(s.totalEngagement) : "\u2014"} loading={social.isLoading} />
                <KpiCard icon={<Eye size={16} color="#3B82F6" />} label="Total reach" value={s ? fmt(s.totalReachThisWeek) : "\u2014"} loading={social.isLoading} />
                <KpiCard icon={<BarChart2 size={16} color="#F59E0B" />} label="Posts queued" value={s ? String(s.postsQueued) : "\u2014"} loading={social.isLoading} />
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                {/* Platform breakdown */}
                <div style={{ flex: 1 }}>
                  <SectionCard title="Platforms" right={<a href="/admin/distribution" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>Manage \u2192</a>} loading={social.isLoading} empty={!s?.platforms?.length} emptyMsg="No social accounts connected">
                    {(s?.platforms ?? []).map((p: any) => (
                      <div key={p.platform} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                        <span style={{ fontSize: 12, fontWeight: 500, textTransform: "capitalize", width: 80 }}>{PLATFORM_LABELS[p.platform] || p.platform}</span>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>{p.posts} posts</span>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>{p.likes} likes</span>
                        <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "#F0FDF4", color: "#059669" }}>{p.status}</span>
                      </div>
                    ))}
                  </SectionCard>
                </div>

                {/* Post queue */}
                <div style={{ flex: 1 }}>
                  <SectionCard title="Recent posts" loading={social.isLoading} empty={!s?.postQueue?.length} emptyMsg="No posts in queue">
                    {(s?.postQueue ?? []).map((p: any) => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, textTransform: "capitalize", color: "#7F77DD", width: 60 }}>{p.platform}</span>
                        <span style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.content?.substring(0, 60) || "Post"}</span>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: p.status === "sent" ? "#F0FDF4" : p.status === "failed" ? "#FEF2F2" : "#EFF6FF", color: p.status === "sent" ? "#059669" : p.status === "failed" ? "#DC2626" : "#3B82F6" }}>{p.status}</span>
                      </div>
                    ))}
                  </SectionCard>
                </div>
              </div>

              {/* X Reply Stats */}
              <SectionCard title="X Reply Engine" right={<span style={{ fontSize: 12, color: "#6B7280" }}>{s?.xReplyStats?.repliesTotalWeek ?? 0} replies this week</span>} loading={social.isLoading} empty={!s?.xReplyStats?.recentReplies?.length} emptyMsg="No replies sent yet">
                {(s?.xReplyStats?.recentReplies ?? []).map((r: any) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, flexShrink: 0 }}>@</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>@{r.originalHandle}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.replyText}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>{r.likesOnOriginal ?? 0} likes</span>
                  </div>
                ))}
              </SectionCard>
            </>
          )}

          {/* ── COMMUNICATIONS TAB ── */}
          {activeTab === "communications" && (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <KpiCard icon={<Mail size={16} color="#378ADD" />} label="Subscribers" value={c ? String(c.subscribersTotal) : "\u2014"} sub={c ? `+${c.subscribersThisWeek} this week` : undefined} loading={comms.isLoading} />
                <KpiCard icon={<Eye size={16} color="#059669" />} label="Open rate" value={c?.openRateLastSend != null ? `${c.openRateLastSend}%` : "\u2014"} sub="Last send" loading={comms.isLoading} />
                <KpiCard icon={<TrendingUp size={16} color="#3B82F6" />} label="Click rate" value={c?.clickRateLastSend != null ? `${c.clickRateLastSend}%` : "\u2014"} sub="Last send" loading={comms.isLoading} />
                <KpiCard icon={<MessageCircle size={16} color="#D85A30" />} label="SMS subscribers" value={c ? String(c.smsSubscribers) : "\u2014"} loading={comms.isLoading} />
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                {/* Newsletter history */}
                <div style={{ flex: 2 }}>
                  <SectionCard title="Newsletter send history" right={<a href="/admin/newsletter" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>Compose new \u2192</a>} loading={comms.isLoading} empty={!c?.sendHistory?.length} emptyMsg="No newsletters sent yet">
                    {(c?.sendHistory ?? []).map((s: any) => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Mail size={14} color="#378ADD" /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.subject}</div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>{s.sentAt ? new Date(s.sentAt).toLocaleDateString() : "Draft"} &middot; {s.recipientCount} recipients</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>{s.openRate}% open</div>
                          <div style={{ fontSize: 11, color: "#6B7280" }}>{s.opens} opens &middot; {s.clicks} clicks</div>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                </div>

                {/* Comms Health */}
                <div style={{ flex: 1 }}>
                  <SectionCard title="Communications health" loading={comms.isLoading}>
                    {c?.commsHealth && [
                      { label: "Resend API", ok: c.commsHealth.resendConnected },
                      { label: "Twilio SMS", ok: c.commsHealth.twilioConnected },
                      { label: "From email", value: c.commsHealth.fromEmail },
                      { label: "From name", value: c.commsHealth.fromName },
                      { label: "SMS daily limit", value: c.commsHealth.smsDailyLimit },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>{item.label}</span>
                        {"ok" in item
                          ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: item.ok ? "#F0FDF4" : "#F3F4F6", color: item.ok ? "#059669" : "#94A3B8" }}>{item.ok ? "Connected" : "Not connected"}</span>
                          : <span style={{ fontSize: 12, color: item.value ? "#374151" : "#94A3B8" }}>{item.value || "Not set"}</span>
                        }
                      </div>
                    ))}
                  </SectionCard>
                </div>
              </div>
            </>
          )}

          {/* ── MONETIZATION TAB ── */}
          {activeTab === "monetization" && (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <KpiCard icon={<DollarSign size={16} color="#F59E0B" />} label="Est. revenue" value={m ? `$${m.revenueThisWeek}` : "\u2014"} sub="This week" loading={monet.isLoading} />
                <KpiCard icon={<CreditCard size={16} color="#8B5CF6" />} label="Sponsor revenue" value={m ? `$${m.sponsorRevenueThisWeek}` : "\u2014"} loading={monet.isLoading} />
                <KpiCard icon={<TrendingUp size={16} color="#2DD4BF" />} label="Affiliate clicks" value={m ? String(m.affiliateClicksThisWeek) : "\u2014"} change={m ? pct(m.affiliateClicksThisWeek, m.affiliateClicksPrevWeek) : undefined} positive={(m?.affiliateClicksThisWeek ?? 0) >= (m?.affiliateClicksPrevWeek ?? 0)} loading={monet.isLoading} />
                <KpiCard icon={<BarChart2 size={16} color="#3B82F6" />} label="AdSense" value={m ? `$${m.adsenseThisWeek}` : "\u2014"} loading={monet.isLoading} />
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                {/* Active sponsorships */}
                <div style={{ flex: 1 }}>
                  <SectionCard title="Active sponsorships" right={<a href="/admin/sponsorship" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>Schedule \u2192</a>} loading={monet.isLoading} empty={!m?.activeSponsorships?.length} emptyMsg="No active sponsorships">
                    {(m?.activeSponsorships ?? []).map((sp: any) => (
                      <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{sp.sponsorName}</span>
                        <span style={{ fontSize: 11, color: "#6B7280" }}>Day {sp.dayOfWeek}</span>
                      </div>
                    ))}
                  </SectionCard>
                </div>

                {/* Monetization setup */}
                <div style={{ flex: 1 }}>
                  <SectionCard title="Monetization setup" right={<a href="/admin/amazon" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>Configure \u2192</a>} loading={monet.isLoading}>
                    {m?.monetizationSetup && [
                      { label: "Sponsorships", ok: m.monetizationSetup.sponsorshipsActive },
                      { label: "Amazon affiliate", ok: m.monetizationSetup.amazonConnected },
                      { label: "Associate tag", value: m.monetizationSetup.associateTag },
                      { label: "Product placement", value: m.monetizationSetup.productPlacement },
                      { label: "AdSense", ok: m.monetizationSetup.adsenseConfigured },
                      { label: "Merch store", ok: m.monetizationSetup.merchConfigured },
                      { label: "PA API status", value: m.monetizationSetup.paApiStatus },
                      { label: "Min rating", value: m.monetizationSetup.minProductRating },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>{item.label}</span>
                        {"ok" in item
                          ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: item.ok ? "#F0FDF4" : "#F3F4F6", color: item.ok ? "#059669" : "#94A3B8" }}>{item.ok ? "Active" : "Not configured"}</span>
                          : <span style={{ fontSize: 12, color: item.value ? "#374151" : "#94A3B8" }}>{item.value || "Not set"}</span>
                        }
                      </div>
                    ))}
                  </SectionCard>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ══════════ RIGHT SIDEBAR — DARK NAVY ══════════ */}
        <div style={{ width: 280, flexShrink: 0, background: "#0F2D5E", borderRadius: "12px 12px 0 0", padding: "20px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* AI Insight */}
          <div style={{ background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.3)", borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Sparkles size={14} color="#2DD4BF" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#2DD4BF" }}>AI insight</span>
            </div>
            <p style={{ fontSize: 13, color: "#E2E8F0", margin: "0 0 8px", lineHeight: 1.5 }}>
              {d?.aiTips?.[0] ?? "Generating insights for your publication..."}
            </p>
            <a href="/admin/articles/create" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>Create article \u2192</a>
          </div>

          {/* Action needed */}
          {f && f.candidatePoolDepth < 10 && (
            <div style={{ background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.2)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <AlertCircle size={14} color="#2DD4BF" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#2DD4BF" }}>Action needed</span>
              </div>
              <p style={{ fontSize: 13, color: "#E2E8F0", margin: "0 0 8px", lineHeight: 1.5 }}>
                Candidate pool low ({f.candidatePoolDepth} remaining). Add more RSS feeds or enable additional sources.
              </p>
              <a href="/admin/source-feeds" style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>Configure feeds \u2192</a>
            </div>
          )}

          {/* System Health */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>System Health</div>
            {full.isLoading ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <Skeleton width={80} height={12} dark /><Skeleton width={60} height={12} dark />
              </div>
            )) : (() => {
              const h = d?.systemHealth;
              if (!h) return null;
              return [
                { label: "Production loop", value: h.loopEnabled ? (h.loopRunning ? "Running\u2026" : "Active") : "Paused", color: h.loopEnabled ? "#10B981" : "#EF4444" },
                { label: "LLM provider", value: h.llmProvider ?? "\u2014", color: "#94A3B8" },
                { label: "Image provider", value: (!h.imageProvider || h.imageProvider === "none") ? "Not configured" : h.imageProvider, color: "#94A3B8" },
                { label: "RSS feeds", value: `${h.rssFeedCount} active${h.rssFeedErrors > 0 ? ` \u00b7 ${h.rssFeedErrors} failing` : ""}`, color: h.rssFeedErrors > 0 ? "#EF4444" : "#10B981" },
                { label: "Blotato", value: h.blatotatoEnabled ? "Connected" : "Not connected", color: h.blatotatoEnabled ? "#10B981" : "#64748B" },
                { label: "Resend", value: h.emailEnabled ? "Connected" : "Not connected", color: h.emailEnabled ? "#10B981" : "#64748B" },
                { label: "S3 storage", value: h.s3Enabled ? "Online" : "Not configured", color: h.s3Enabled ? "#10B981" : "#64748B" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color }}>{value}</span>
                </div>
              ));
            })()}
          </div>

          {/* Quick Actions */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Quick Actions</div>
            {[
              { icon: <Play size={14} />, label: "Run generation now", action: () => runGenMut.mutate(), loading: runGenMut.isPending },
              { icon: <RefreshCw size={14} />, label: "Backfill missing GEO", action: () => backfillMut.mutate(), loading: backfillMut.isPending },
              { icon: <Mail size={14} />, label: "Send newsletter", action: () => navigate("/admin/newsletter") },
              { icon: <PenLine size={14} />, label: "Create article", action: () => navigate("/admin/articles/create") },
            ].map(({ icon, label, action, loading }) => (
              <button key={label} onClick={action} disabled={loading} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 8,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer", color: "#E2E8F0", fontSize: 13, textAlign: "left" as const, opacity: loading ? 0.7 : 1,
              }}>
                <span style={{ color: "#2DD4BF", flexShrink: 0 }}>{icon}</span>
                <span>{loading ? "Running\u2026" : label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    </TenantLayout>
  );
}
