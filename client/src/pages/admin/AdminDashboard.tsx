import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import {
  FileText, Eye, CheckCircle, Clock, XCircle, Workflow, Video,
  TrendingUp, ArrowUpRight, Newspaper, BarChart3, Image as ImageIcon,
  Zap, CalendarClock, MessageSquare, Send, CheckSquare, AlertCircle, AlertTriangle, Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { SkeletonStat, SkeletonTable } from "@/components/SkeletonCard";
import CalendarPreviewWidget from "@/components/CalendarPreviewWidget";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const statCards = [
  { key: "total", label: "Total Articles", icon: FileText, color: "text-foreground", bgColor: "bg-foreground/5", href: "/admin/articles" },
  { key: "published", label: "Published", icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/20", href: "/admin/articles?status=published" },
  { key: "pending", label: "Pending Review", icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/20", href: "/admin/articles?status=pending" },
  { key: "approved", label: "Approved", icon: Eye, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20", href: "/admin/articles?status=approved" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-900/20", href: "/admin/articles?status=rejected" },
];

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`} />
  );
}

function getAlerts(data: NonNullable<ReturnType<typeof useAutomationData>['data']>): string[] {
  const alerts: string[] = [];
  const { workflow, autoApprove, xPostQueue, xReplyEngine } = data;
  if (!workflow.isScheduled) alerts.push("Workflow scheduler is not scheduled");
  if (workflow.isRunning === false && workflow.lastRun?.status === "error") alerts.push("Last workflow run failed");
  if (!xPostQueue.isRunning) alerts.push("X Post Queue is stopped");
  if (xPostQueue.isRunning && xPostQueue.scheduledCount === 0) alerts.push("X Post Queue is empty — no posts scheduled");
  if (xPostQueue.postsToday >= xPostQueue.dailyLimit) alerts.push("X Post Queue daily limit reached");
  if (!xReplyEngine.enabled) alerts.push("Reply Engine is disabled");
  if (autoApprove.enabled && autoApprove.pendingArticleCount > 20) alerts.push(`${autoApprove.pendingArticleCount} articles waiting in pending review`);
  return alerts;
}

function useAutomationData() {
  return trpc.xQueue.automationStatus.useQuery(undefined, { refetchInterval: 30000 });
}

function AutomationStatusPanel() {
  const { data, isLoading } = useAutomationData();

  if (isLoading) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4.5 h-4.5 text-yellow-500" /> Automation Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { workflow, autoApprove, xPostQueue, xReplyEngine } = data;
  const alerts = getAlerts(data);

  function formatRelativeTime(iso: string | null | undefined) {
    if (!iso) return "—";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function formatNextRun(iso: string | null | undefined) {
    if (!iso) return "—";
    const diff = new Date(iso).getTime() - Date.now();
    if (diff < 0) return "overdue";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
    return `in ${Math.floor(hrs / 24)}d`;
  }

  const panelAlertMap: Record<string, string[]> = {
    "Workflow Scheduler": [
      ...(!workflow.isScheduled ? ["Not scheduled"] : []),
      ...(workflow.lastRun?.status === "error" ? ["Last run failed"] : []),
    ],
    "Auto-Approve": [
      ...(autoApprove.enabled && autoApprove.pendingArticleCount > 20 ? [`${autoApprove.pendingArticleCount} pending`] : []),
    ],
    "X Post Queue": [
      ...(!xPostQueue.isRunning ? ["Stopped"] : []),
      ...(xPostQueue.isRunning && xPostQueue.scheduledCount === 0 ? ["Queue empty"] : []),
      ...(xPostQueue.postsToday >= xPostQueue.dailyLimit ? ["Daily limit reached"] : []),
    ],
    "Reply Engine": [
      ...(!xReplyEngine.enabled ? ["Disabled"] : []),
    ],
  };

  const panels = [
    {
      label: "Workflow Scheduler",
      icon: CalendarClock,
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      active: workflow.isScheduled,
      activeLabel: workflow.isRunning ? "Running now" : "Scheduled",
      inactiveLabel: "Not scheduled",
      href: "/admin/settings/schedule",
      rows: [
        { label: "Next run", value: formatNextRun(workflow.nextRun) },
        { label: "Last run", value: workflow.lastRun ? formatRelativeTime(workflow.lastRun.time) : "Never" },
        { label: "Last status", value: workflow.lastRun?.status || "—" },
      ],
    },
    {
      label: "Auto-Approve",
      icon: CheckSquare,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      active: autoApprove.enabled,
      activeLabel: `After ${autoApprove.afterHours}h${autoApprove.autoPublish ? " → auto-publish" : ""}`,
      inactiveLabel: "Disabled",
      href: "/admin/settings/publishing",
      rows: [
        { label: "Pending articles", value: String(autoApprove.pendingArticleCount) },
        { label: "Auto-publish", value: autoApprove.autoPublish ? "On" : "Off" },
        { label: "Checks every", value: "30 min" },
      ],
    },
    {
      label: "X Post Queue",
      icon: Send,
      iconColor: "text-sky-600",
      bgColor: "bg-sky-50 dark:bg-sky-900/20",
      active: xPostQueue.isRunning,
      activeLabel: `Every ${xPostQueue.intervalMinutes}m`,
      inactiveLabel: "Stopped",
      href: "/admin/x-post-queue",
      rows: [
        { label: "Posts today", value: `${xPostQueue.postsToday} / ${xPostQueue.dailyLimit}` },
        { label: "In queue", value: String(xPostQueue.scheduledCount) },
        { label: "Last post", value: formatRelativeTime(xPostQueue.lastPostTime ? new Date(xPostQueue.lastPostTime).toISOString() : null) },
      ],
    },
    {
      label: "Reply Engine",
      icon: MessageSquare,
      iconColor: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
      active: xReplyEngine.enabled,
      activeLabel: `Every ${xReplyEngine.intervalHours}h · ${xReplyEngine.source}`,
      inactiveLabel: "Disabled",
      href: "/admin/x-reply-queue",
      rows: [
        { label: "Daily limit", value: String(xReplyEngine.dailyLimit) },
        { label: "Pending replies", value: String(xReplyEngine.pendingRepliesCount) },
        { label: "Source", value: xReplyEngine.source },
      ],
    },
  ];

  return (
    <Card className="mb-8 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4.5 h-4.5 text-yellow-500" /> Automation Status
          </CardTitle>
          <span className="text-xs text-muted-foreground">Updates every 30s</span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {panels.map((panel) => {
            const Icon = panel.icon;
            const panelAlerts = panelAlertMap[panel.label] || [];
            const hasAlert = panelAlerts.length > 0;
            return (
              <Link key={panel.label} href={panel.href}>
                <div className={`group rounded-xl border transition-all duration-200 p-4 cursor-pointer bg-card hover:shadow-sm ${
                  hasAlert
                    ? "border-amber-300 dark:border-amber-700 hover:border-amber-400"
                    : "border-border hover:border-primary/30"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg ${panel.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${panel.iconColor}`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasAlert && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {panelAlerts[0]}
                        </span>
                      )}
                      {!hasAlert && (
                        <span className={`text-xs font-medium flex items-center ${panel.active ? "text-emerald-600" : "text-muted-foreground"}`}>
                          <StatusDot active={panel.active} />
                          {panel.active ? panel.activeLabel : panel.inactiveLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-semibold mb-2">{panel.label}</p>
                  <div className="space-y-1">
                    {panel.rows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium tabular-nums">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
          {alerts.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-4 mt-1">
              <div className="flex flex-wrap gap-2">
                {alerts.map((alert, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {alert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── v4.0 Candidate Pool Widget ─────────────────────────────────────────────────
function CandidatePoolWidget() {
  const { data: stats, isLoading } = trpc.sources.getCandidateStats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  if (isLoading) return null;
  if (!stats || stats.total === 0) return null;

  const pct = stats.total > 0 ? Math.round((stats.selected / stats.total) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4.5 h-4.5 text-amber-500" /> Selector Candidate Pool
          </CardTitle>
          <span className="text-xs text-muted-foreground">v4.0 · refreshes every 60s</span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.selected}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Selected</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rejected</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.expired}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Expired</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Selection rate</span>
            <span>{pct}% of {stats.total} total</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.articles.stats.useQuery();
  const { data: videoStats, isLoading: videoStatsLoading } = trpc.articles.videoStats.useQuery();
  const { data: batches, isLoading: batchesLoading } = trpc.workflow.list.useQuery({ limit: 5 });
  const { data: categoryStats, isLoading: categoryStatsLoading } = trpc.articles.categoryStats.useQuery();
  const { data: missingImages, isLoading: missingImagesLoading } = trpc.articles.missingImages.useQuery();

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Overview of your satirical news empire.</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonStat key={i} />)
        ) : (
          statCards.map(card => {
            const Icon = card.icon;
            const value = (stats as any)?.[card.key] ?? 0;
            return (
              <Link key={card.key} href={card.href}>
                <Card className="cursor-pointer group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-transparent hover:border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-4.5 h-4.5 ${card.color}`} />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all" />
                    </div>
                    <p className={`text-3xl font-bold tracking-tight ${card.color}`}>{value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 font-medium">{card.label}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* Automation Status */}
      <AutomationStatusPanel />

      {/* Category distribution */}
      {categoryStats && categoryStats.length > 0 && (
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Newspaper className="w-4.5 h-4.5 text-blue-600" /> Articles by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Category</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">Articles</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((cat: any) => (
                    <tr key={cat.categoryId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <Link href={`/category/${cat.categorySlug}`} className="hover:text-primary transition-colors">
                          {cat.categoryName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center tabular-nums font-semibold">{cat.count}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all" 
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">{cat.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video stats */}
      {videoStats && (
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="w-4.5 h-4.5 text-purple-600" /> Video Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-border [&>*]:border-b lg:[&>*]:border-b-0 [&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(3n)]:border-r-0 lg:[&>*]:border-r">
              {[
                { label: "Total Articles", value: videoStats.totalArticles, color: "" },
                { label: "Videos Generated", value: videoStats.videosGenerated, color: "text-emerald-600" },
                { label: "Success Rate", value: `${videoStats.successRate}%`, color: "text-blue-600" },
                { label: "Recent (30d)", value: videoStats.recentVideosGenerated, color: "text-purple-600" },
                { label: "Without Videos", value: videoStats.articlesWithoutVideos, color: "text-amber-600" },
              ].map((item, i) => (
                <div key={i} className="p-4 text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Images Queue */}
      {missingImages && missingImages.length > 0 && (
        <Card className="mb-8 overflow-hidden border-amber-200 dark:border-amber-900/30">
          <CardHeader className="pb-3 border-b border-amber-200 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="w-4.5 h-4.5 text-amber-600" /> Missing Article Images
              </CardTitle>
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-200">{missingImages.length} articles</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Article</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {missingImages.slice(0, 10).map((article: any) => (
                    <tr key={article.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/admin/articles/${article.id}`} className="hover:text-primary transition-colors font-medium text-sm">
                          {article.headline}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={article.status} />
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(article.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <div className="mb-8">
        <CalendarPreviewWidget />
      </div>

      {/* Recent workflow batches */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="w-4.5 h-4.5 text-indigo-600" /> Recent Workflow Batches
            </CardTitle>
            <Link href="/admin/optimizer" className="text-xs text-primary hover:underline font-medium">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!batches || batches.length === 0 ? (
            <div className="py-12 text-center">
              <Workflow className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No workflow batches yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Run the daily workflow to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs hidden sm:table-cell">Events</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">Generated</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs hidden sm:table-cell">Approved</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">{b.batchDate}</td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          status={b.status}
                          variant="workflow"
                          dot={b.status === "gathering" || b.status === "generating" || b.status === "publishing"}
                        />
                      </td>
                      <td className="py-3 px-4 text-center tabular-nums hidden sm:table-cell">{b.totalEvents}</td>
                      <td className="py-3 px-4 text-center tabular-nums">{b.articlesGenerated}</td>
                      <td className="py-3 px-4 text-center tabular-nums hidden sm:table-cell">{b.articlesApproved}</td>
                      <td className="py-3 px-4 text-center tabular-nums">{b.articlesPublished}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* v4.0 Candidate Pool Widget */}
      <CandidatePoolWidget />
      {/* v4.5 Pool Health Widget */}
      <PoolHealthWidget />
      {/* v4.0 Manual Inject Widget */}
      <ManualInjectWidget />
    </AdminLayout>
  );
}

// ─── v4.5 Pool Health Widget ─────────────────────────────────────────────────
function PoolHealthWidget() {
  const { data, isLoading } = trpc.sources.getCandidatePoolHealth.useQuery(undefined, {
    refetchInterval: 120_000,
  });

  if (isLoading) return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-4.5 h-4.5 text-violet-500" /> Pool Health
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-24 bg-muted/40 rounded-lg animate-pulse" />
      </CardContent>
    </Card>
  );

  if (!data || data.total === 0) return null;

  const { tiers, total, history } = data;
  const scored = tiers.high + tiers.medium + tiers.low + tiers.dead;
  const highPct = total > 0 ? Math.round((tiers.high / total) * 100) : 0;
  const medPct = total > 0 ? Math.round((tiers.medium / total) * 100) : 0;
  const lowPct = total > 0 ? Math.round((tiers.low / total) * 100) : 0;
  const deadPct = total > 0 ? Math.round((tiers.dead / total) * 100) : 0;

  // Build sparkline from history (last 24 bars, one per hour)
  const maxBar = history.length > 0 ? Math.max(...history.map(h => h.high + h.medium + h.low), 1) : 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4.5 h-4.5 text-violet-500" /> Pool Health
          </CardTitle>
          <span className="text-xs text-muted-foreground">v4.5 · {total} pending · refreshes every 2m</span>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Tier breakdown */}
        <div className="grid grid-cols-5 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-emerald-600">{tiers.high}</p>
            <p className="text-xs text-muted-foreground mt-0.5">High</p>
            <p className="text-xs text-emerald-600/70">{highPct}%</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600">{tiers.medium}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Medium</p>
            <p className="text-xs text-blue-600/70">{medPct}%</p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-600">{tiers.low}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Low</p>
            <p className="text-xs text-amber-600/70">{lowPct}%</p>
          </div>
          <div>
            <p className="text-xl font-bold text-red-500">{tiers.dead}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Dead</p>
            <p className="text-xs text-red-500/70">{deadPct}%</p>
          </div>
          <div>
            <p className="text-xl font-bold text-muted-foreground">{tiers.unscored}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Unscored</p>
            <p className="text-xs text-muted-foreground/50">—</p>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${highPct}%` }} />
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${medPct}%` }} />
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${lowPct}%` }} />
          <div className="h-full bg-red-400 transition-all" style={{ width: `${deadPct}%` }} />
        </div>

        {/* 24h sparkline */}
        {history.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Ingest rate — last 24 hours</p>
            <div className="flex items-end gap-px h-12">
              {history.map((h, i) => {
                const barH = Math.round(((h.high + h.medium + h.low) / maxBar) * 48);
                const highH = Math.round((h.high / maxBar) * 48);
                const medH = Math.round((h.medium / maxBar) * 48);
                const lowH = barH - highH - medH;
                const label = h.hour.slice(11, 16);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" title={`${label} — H:${h.high} M:${h.medium} L:${h.low}`}>
                    <div className="w-full flex flex-col justify-end" style={{ height: `${barH}px` }}>
                      <div className="w-full bg-emerald-500/80" style={{ height: `${highH}px` }} />
                      <div className="w-full bg-blue-500/80" style={{ height: `${medH}px` }} />
                      <div className="w-full bg-amber-400/80" style={{ height: `${Math.max(0, lowH)}px` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground/50 mt-1">
              <span>{history[0]?.hour.slice(11, 16)}</span>
              <span>{history[history.length - 1]?.hour.slice(11, 16)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── v4.0 Manual Inject Widget ────────────────────────────────────────────────
function ManualInjectWidget() {
  const [entries, setEntries] = useState("");
  const injectMutation = trpc.sources.injectManual.useMutation();
  const handleInject = async () => {
    const lines = entries.split("\n").map((l: string) => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error("Enter at least one topic or URL."); return; }
    const parsed = lines.map((line: string) =>
      line.startsWith("http") ? { title: line, sourceUrl: line } : { title: line }
    );
    try {
      const result = await injectMutation.mutateAsync({ entries: parsed });
      toast.success(`Injected ${result.inserted} candidate(s) into the selector pool.`);
      setEntries("");
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="w-4.5 h-4.5 text-amber-500" /> Manual Topic Injection
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        <p className="text-xs text-muted-foreground">One topic title or URL per line. Injected at priority 80 and considered in the next pipeline run.</p>
        <Textarea
          value={entries}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEntries(e.target.value)}
          placeholder={"Breaking: Scientists discover new element\nhttps://example.com/article-to-satirize"}
          className="min-h-[72px] text-xs font-mono"
        />
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleInject} disabled={injectMutation.isPending || !entries.trim()}>
          {injectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />} Inject into Pool
        </Button>
      </CardContent>
    </Card>
  );
}
