import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  RefreshCw, Play, Plus, Trash2, CheckCircle2, XCircle, Clock, AlertCircle,
  Globe, MessageSquare, Facebook, Instagram, TrendingUp, BarChart3, ThumbsUp,
  MessageCircle, Share2, ExternalLink,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

// ─── Platform icons ───────────────────────────────────────────────────────────
const XIcon = () => <span className="font-bold text-sm">𝕏</span>;
const BlueskyIcon = () => <span className="font-bold text-sm">🦋</span>;
const RedditIcon = () => <span className="text-sm">🤖</span>;
const ThreadsIcon = () => <span className="text-sm font-bold">@</span>;
const LinkedInIcon = () => <span className="text-sm font-bold text-blue-700">in</span>;

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  sending: { label: "Sending", variant: "default" },
  sent: { label: "Sent", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  skipped: { label: "Skipped", variant: "outline" },
};

const PLATFORM_LABELS: Record<string, string> = {
  x: "X (Twitter)",
  reddit: "Reddit",
  facebook: "Facebook",
  instagram: "Instagram",
  bluesky: "Bluesky",
  threads: "Threads",
  linkedin: "LinkedIn",
};

const PLATFORM_COLORS: Record<string, string> = {
  x: "#000000",
  reddit: "#FF4500",
  facebook: "#1877F2",
  instagram: "#E1306C",
  bluesky: "#0085FF",
  threads: "#101010",
  linkedin: "#0A66C2",
};

// ─── Queue Tab ────────────────────────────────────────────────────────────────
function QueueTab() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: stats, refetch: refetchStats } = trpc.distribution.queueStats.useQuery();
  const { data: queue, refetch: refetchQueue, isLoading } = trpc.distribution.queue.useQuery(
    { status: statusFilter || undefined, limit: 50 }
  );
  const processQueue = trpc.distribution.processQueue.useMutation({
    onSuccess: (results) => {
      const sent = results.filter((r: any) => r.success).length;
      const failed = results.filter((r: any) => !r.success).length;
      toast.success(`Queue processed: ${sent} sent, ${failed} failed`);
      refetchStats();
      refetchQueue();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: "pending", label: "Pending", icon: Clock, color: "text-yellow-600" },
          { key: "sending", label: "Sending", icon: RefreshCw, color: "text-blue-600" },
          { key: "sent", label: "Sent", icon: CheckCircle2, color: "text-green-600" },
          { key: "failed", label: "Failed", icon: XCircle, color: "text-red-600" },
          { key: "skipped", label: "Skipped", icon: AlertCircle, color: "text-gray-500" },
        ].map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === key ? "" : key)}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color}`} />
              <div>
                <div className="text-2xl font-bold">{(stats as any)?.[key] ?? 0}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={() => processQueue.mutate({ limit: 10 })} disabled={processQueue.isPending} size="sm">
          <Play className="h-4 w-4 mr-2" />
          {processQueue.isPending ? "Processing…" : "Process Queue (10)"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => { refetchStats(); refetchQueue(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {["pending", "sending", "sent", "failed", "skipped"].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter && <Badge variant="secondary" className="cursor-pointer" onClick={() => setStatusFilter("")}>Filtering: {statusFilter} ×</Badge>}
      </div>

      {/* Queue table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : !queue?.items?.length ? (
            <div className="p-8 text-center text-muted-foreground">No items{statusFilter ? ` with status "${statusFilter}"` : ""}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left p-3 font-medium">Article</th>
                    <th className="text-left p-3 font-medium">Platform</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Engagement</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Created</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Post URL</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.items.map((item: any) => {
                    const s = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
                    const totalEngagement = (item.engagementLikes ?? 0) + (item.engagementComments ?? 0) + (item.engagementShares ?? 0);
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <span className="font-mono text-xs text-muted-foreground">#{item.articleId}</span>
                          {item.errorMessage && <div className="text-xs text-red-500 mt-1 max-w-xs truncate">{item.errorMessage}</div>}
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                          {item.subreddit && <div className="text-xs text-muted-foreground">r/{item.subreddit}</div>}
                        </td>
                        <td className="p-3">
                          <Badge variant={s.variant}>{s.label}</Badge>
                          {item.retryCount > 0 && <span className="text-xs text-muted-foreground ml-1">({item.retryCount} retries)</span>}
                          {item.removedAt && <div className="text-xs text-red-500 mt-1">Removed</div>}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {item.status === "sent" && totalEngagement > 0 ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span title="Likes">❤️ {item.engagementLikes}</span>
                              <span title="Comments">💬 {item.engagementComments}</span>
                              <span title="Shares">🔁 {item.engagementShares}</span>
                            </div>
                          ) : item.status === "sent" ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : null}
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {item.postUrl ? (
                            <a href={item.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block max-w-[200px]">
                              View post
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Performance Tab ──────────────────────────────────────────────────────────
function PerformanceTab() {
  const { data: perf, isLoading } = trpc.distribution.performance.useQuery();

  const platformChartData = useMemo(() => {
    if (!perf?.byPlatform) return [];
    return Object.entries(perf.byPlatform as Record<string, { posts: number; totalEngagement: number; failed: number }>).map(([platform, data]) => ({
      platform: PLATFORM_LABELS[platform] ?? platform,
      key: platform,
      posts: data.posts,
      engagement: data.totalEngagement,
      failed: data.failed,
    }));
  }, [perf]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading performance data…</div>;
  }

  if (!perf || !perf.totalPosts) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No performance data yet</p>
        <p className="text-sm mt-1">Performance metrics appear after articles are distributed to social platforms.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts (7d)", value: perf.totalPosts ?? 0, icon: Globe, color: "text-blue-600" },
          { label: "Total Engagement", value: perf.totalEngagement ?? 0, icon: ThumbsUp, color: "text-green-600" },
          { label: "Avg Engagement/Post", value: perf.avgEngagement ? perf.avgEngagement.toFixed(1) : "0", icon: TrendingUp, color: "text-purple-600" },
          { label: "Failed Posts (7d)", value: perf.failedPosts ?? 0, icon: XCircle, color: "text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform comparison chart */}
      {platformChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posts by Platform (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={platformChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="posts" name="Posts Sent" radius={[4, 4, 0, 0]}>
                  {platformChartData.map((entry) => (
                    <Cell key={entry.key} fill={PLATFORM_COLORS[entry.key] ?? "#6366f1"} />
                  ))}
                </Bar>
                <Bar dataKey="engagement" name="Engagement" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top 10 performing posts */}
      {perf.topPosts && perf.topPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performing Posts (Last 7 Days)</CardTitle>
            <CardDescription className="text-xs">Ranked by total engagement (likes + comments + shares)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Platform</th>
                    <th className="text-left p-3 font-medium">Article</th>
                    <th className="text-left p-3 font-medium">
                      <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> Likes</span>
                    </th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> Comments</span>
                    </th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">
                      <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> Shares</span>
                    </th>
                    <th className="text-left p-3 font-medium">Total</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {perf.topPosts.map((post: any, i: number) => (
                    <tr key={post.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                      <td className="p-3">
                        <span className="font-medium text-xs">{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
                        {post.subreddit && <div className="text-xs text-muted-foreground">r/{post.subreddit}</div>}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">#{post.articleId}</td>
                      <td className="p-3 font-medium">{post.engagementLikes ?? 0}</td>
                      <td className="p-3 hidden md:table-cell">{post.engagementComments ?? 0}</td>
                      <td className="p-3 hidden md:table-cell">{post.engagementShares ?? 0}</td>
                      <td className="p-3 font-bold text-green-600">
                        {(post.engagementLikes ?? 0) + (post.engagementComments ?? 0) + (post.engagementShares ?? 0)}
                      </td>
                      <td className="p-3">
                        {post.postUrl && (
                          <a href={post.postUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Removed / failed posts */}
      {perf.removedPosts && perf.removedPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-600">Removed / Failed Posts (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left p-3 font-medium">Platform</th>
                    <th className="text-left p-3 font-medium">Article</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.removedPosts.map((post: any) => (
                    <tr key={post.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium text-xs">{PLATFORM_LABELS[post.platform] ?? post.platform}</td>
                      <td className="p-3 text-xs text-muted-foreground">#{post.articleId}</td>
                      <td className="p-3 text-xs text-red-500 max-w-xs truncate">{post.errorMessage ?? (post.removedAt ? "Removed by platform" : "Failed")}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {post.removedAt ? new Date(post.removedAt).toLocaleDateString() : post.sentAt ? new Date(post.sentAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Platforms Tab ────────────────────────────────────────────────────────────
const PLATFORM_CONFIGS = [
  {
    key: "x",
    label: "X (Twitter)",
    icon: XIcon,
    description: "Posts via env vars X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET",
    fields: [],
    envBased: true,
  },
  {
    key: "reddit",
    label: "Reddit",
    icon: RedditIcon,
    description: "Posts to subreddits defined in the Subreddits tab. Uses reddit_client_id/secret settings.",
    fields: [],
    envBased: true,
  },
  {
    key: "bluesky",
    label: "Bluesky",
    icon: BlueskyIcon,
    description: "Posts via AT Protocol. Requires identifier (handle) and app password.",
    fields: [
      { key: "identifier", label: "Handle (e.g. hambry.bsky.social)", placeholder: "yourhandle.bsky.social" },
      { key: "password", label: "App Password", placeholder: "xxxx-xxxx-xxxx-xxxx", isSecret: true },
    ],
    envBased: false,
  },
  {
    key: "facebook",
    label: "Facebook Page",
    icon: Facebook,
    description: "Posts to a Facebook Page via Graph API.",
    fields: [
      { key: "pageId", label: "Page ID", placeholder: "123456789" },
      { key: "pageAccessToken", label: "Page Access Token", placeholder: "EAABwz…", isSecret: true },
    ],
    envBased: false,
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    description: "Posts image+caption to Instagram Business account via Graph API.",
    fields: [
      { key: "igUserId", label: "IG User ID", placeholder: "17841400…" },
      { key: "pageAccessToken", label: "Page Access Token", placeholder: "EAABwz…", isSecret: true },
    ],
    envBased: false,
  },
  {
    key: "threads",
    label: "Threads",
    icon: ThreadsIcon,
    description: "Posts to Threads via Meta's Threads API. Uses same OAuth token as Instagram/Facebook.",
    fields: [
      { key: "threadsUserId", label: "Threads User ID", placeholder: "1234567890" },
      { key: "accessToken", label: "Access Token", placeholder: "EAABwz…", isSecret: true },
    ],
    envBased: false,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: LinkedInIcon,
    description: "Posts to a LinkedIn Organization page via LinkedIn API v2. Requires Organization ID and OAuth token.",
    fields: [
      { key: "orgId", label: "Organization ID", placeholder: "12345678" },
      { key: "accessToken", label: "OAuth Access Token", placeholder: "AQV…", isSecret: true },
    ],
    envBased: false,
  },
];

function PlatformCard({ config, settings }: { config: typeof PLATFORM_CONFIGS[0]; settings: Record<string, string | null> }) {
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const isEnabled = settings[`dist_enabled_${config.key}`] === "true";

  const saveSettings = trpc.distribution.saveSettings.useMutation({
    onSuccess: () => toast.success(`${config.label} settings saved`),
    onError: (e) => toast.error(e.message),
  });

  const upsertCred = trpc.distribution.upsertPlatformCredential.useMutation({
    onSuccess: () => toast.success(`${config.label} credentials saved`),
    onError: (e) => toast.error(e.message),
  });

  const testConn = trpc.distribution.testPlatformConnection.useMutation({
    onSuccess: (result) => {
      setTestResult({
        success: result.success,
        message: result.success
          ? `✅ Connected${result.username ? ` as ${result.username}` : ""}`
          : `❌ ${result.error ?? "Connection failed"}`,
      });
    },
    onError: (e) => setTestResult({ success: false, message: `❌ ${e.message}` }),
  });

  const { data: cred } = trpc.distribution.getPlatformCredential.useQuery({ platform: config.key });

  const toggleEnabled = () => {
    saveSettings.mutate({ [`dist_enabled_${config.key}`]: isEnabled ? "false" : "true" });
  };

  const saveCreds = () => {
    const extra = JSON.stringify(extraFields);
    upsertCred.mutate({ platform: config.key, extra, isActive: true });
  };

  const handleTest = () => {
    setTestResult(null);
    testConn.mutate({ platform: config.key, credentials: extraFields });
  };

  const getFieldValue = (key: string) => {
    if (extraFields[key] !== undefined) return extraFields[key];
    try { return JSON.parse((cred as any)?.extra ?? "{}")[key] ?? ""; } catch { return ""; }
  };

  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon />
            <CardTitle className="text-base">{config.label}</CardTitle>
            {isEnabled && <Badge variant="default" className="text-xs">Enabled</Badge>}
          </div>
          <Switch checked={isEnabled} onCheckedChange={toggleEnabled} disabled={saveSettings.isPending} />
        </div>
        <CardDescription className="text-xs">{config.description}</CardDescription>
      </CardHeader>
      {!config.envBased && config.fields.length > 0 && (
        <CardContent className="space-y-3">
          {config.fields.map(f => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input
                type={f.isSecret ? "password" : "text"}
                placeholder={f.placeholder}
                value={getFieldValue(f.key)}
                onChange={e => setExtraFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={saveCreds} disabled={upsertCred.isPending}>
              {upsertCred.isPending ? "Saving…" : "Save Credentials"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleTest} disabled={testConn.isPending}>
              {testConn.isPending ? "Testing…" : "Test Connection"}
            </Button>
          </div>
          {testResult && (
            <p className={`text-xs mt-1 ${testResult.success ? "text-green-600" : "text-red-600"}`}>
              {testResult.message}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function PlatformsTab() {
  const { data: settings } = trpc.distribution.getSettings.useQuery();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PLATFORM_CONFIGS.map(config => (
        <PlatformCard key={config.key} config={config} settings={settings ?? {}} />
      ))}
    </div>
  );
}

// ─── Subreddits Tab ───────────────────────────────────────────────────────────
function SubredditsTab() {
  const { data: subreddits, refetch } = trpc.distribution.getSubredditMap.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const [newSub, setNewSub] = useState({ subreddit: "", categorySlug: "", weight: "1", notes: "" });

  const upsert = trpc.distribution.upsertSubreddit.useMutation({
    onSuccess: () => { toast.success("Saved"); refetch(); setNewSub({ subreddit: "", categorySlug: "", weight: "1", notes: "" }); },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.distribution.deleteSubreddit.useMutation({
    onSuccess: () => { toast.success("Deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = (item: any) => {
    upsert.mutate({ id: item.id, subreddit: item.subreddit, isActive: !item.isActive });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Subreddit</CardTitle>
          <CardDescription className="text-xs">Map subreddits to categories. Leave category blank for all articles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Subreddit</Label>
              <Input placeholder="r/satire" value={newSub.subreddit} onChange={e => setNewSub(p => ({ ...p, subreddit: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category (optional)</Label>
              <Select value={newSub.categorySlug} onValueChange={v => setNewSub(p => ({ ...p, categorySlug: v }))}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories?.map((c: any) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Weight (1-5)</Label>
              <Input type="number" min="1" max="5" value={newSub.weight} onChange={e => setNewSub(p => ({ ...p, weight: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input placeholder="Optional notes" value={newSub.notes} onChange={e => setNewSub(p => ({ ...p, notes: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <Button size="sm" onClick={() => upsert.mutate({ subreddit: newSub.subreddit.replace(/^r\//, ""), categorySlug: newSub.categorySlug || null, weight: parseInt(newSub.weight) || 1, notes: newSub.notes || null, isActive: true })} disabled={!newSub.subreddit || upsert.isPending}>
            <Plus className="h-4 w-4 mr-2" />{upsert.isPending ? "Adding…" : "Add Subreddit"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {!subreddits?.length ? (
            <div className="p-8 text-center text-muted-foreground">No subreddits configured yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left p-3 font-medium">Subreddit</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Weight</th>
                    <th className="text-left p-3 font-medium">Active</th>
                    <th className="text-left p-3 font-medium">Notes</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {subreddits.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium">r/{item.subreddit}</td>
                      <td className="p-3 text-muted-foreground">{item.categorySlug ?? <span className="italic">All</span>}</td>
                      <td className="p-3">{item.weight ?? 1}</td>
                      <td className="p-3">
                        <Switch checked={item.isActive ?? true} onCheckedChange={() => toggleActive(item)} />
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{item.notes ?? "—"}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => del.mutate({ id: item.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const { data: settings, refetch } = trpc.distribution.getSettings.useQuery();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  const saveSettings = trpc.distribution.saveSettings.useMutation({
    onSuccess: () => { toast.success("Settings saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const platforms = ["x", "reddit", "facebook", "instagram", "bluesky", "threads", "linkedin"];

  const getValue = (key: string) => localSettings[key] ?? settings?.[key] ?? "";
  const set = (key: string, value: string) => setLocalSettings(p => ({ ...p, [key]: value }));

  const save = () => {
    const toSave: Record<string, string> = {};
    for (const p of platforms) {
      toSave[`dist_enabled_${p}`] = getValue(`dist_enabled_${p}`) || "false";
      const limit = getValue(`dist_daily_limit_${p}`);
      if (limit) toSave[`dist_daily_limit_${p}`] = limit;
      // Auto-approve toggle per platform
      toSave[`dist_auto_approve_${p}`] = getValue(`dist_auto_approve_${p}`) || "false";
    }
    // Reply engine toggle (X only)
    toSave["x_reply_engine_enabled"] = getValue("x_reply_engine_enabled") || "false";
    Object.assign(toSave, localSettings);
    saveSettings.mutate(toSave);
  };

  const HARD_LIMITS: Record<string, number> = {
    x: 48, reddit: 10, facebook: 5, instagram: 3, threads: 10, bluesky: 15, linkedin: 3,
  };

  return (
    <div className="space-y-4">
      {/* Daily limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Posting Limits</CardTitle>
          <CardDescription className="text-xs">
            Hard safety limits enforced by the Rate Governor. These prevent platform bans and cannot be exceeded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platforms.map(p => (
              <div key={p} className="space-y-1">
                <Label className="text-xs capitalize">{PLATFORM_LABELS[p] ?? p}</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="1"
                    max={HARD_LIMITS[p] ?? 10}
                    placeholder={String(HARD_LIMITS[p] ?? 10)}
                    value={getValue(`dist_daily_limit_${p}`)}
                    onChange={e => set(`dist_daily_limit_${p}`, e.target.value)}
                    className="h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">/{HARD_LIMITS[p] ?? 10}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Auto-approve toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Approve per Platform</CardTitle>
          <CardDescription className="text-xs">
            When enabled, new queue entries for that platform are automatically sent without manual review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platforms.map(p => (
              <div key={p} className="flex items-center justify-between p-2 border rounded-md">
                <Label className="text-xs capitalize">{PLATFORM_LABELS[p] ?? p}</Label>
                <Switch
                  checked={getValue(`dist_auto_approve_${p}`) === "true"}
                  onCheckedChange={v => set(`dist_auto_approve_${p}`, v ? "true" : "false")}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* X Reply Engine toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">X Reply Engine</CardTitle>
          <CardDescription className="text-xs">
            Automatically reply to trending topics with brand-voice commentary. X only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={getValue("x_reply_engine_enabled") === "true"}
              onCheckedChange={v => set("x_reply_engine_enabled", v ? "true" : "false")}
            />
            <Label className="text-sm">Enable X Reply Engine</Label>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saveSettings.isPending}>
        {saveSettings.isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSocialDistribution() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Social Distribution</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Unified queue for X, Reddit, Facebook, Instagram, Bluesky, Threads, and LinkedIn
          </p>
        </div>

        <Tabs defaultValue="queue">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="subreddits">Subreddits</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-4"><QueueTab /></TabsContent>
          <TabsContent value="performance" className="mt-4"><PerformanceTab /></TabsContent>
          <TabsContent value="platforms" className="mt-4"><PlatformsTab /></TabsContent>
          <TabsContent value="subreddits" className="mt-4"><SubredditsTab /></TabsContent>
          <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
