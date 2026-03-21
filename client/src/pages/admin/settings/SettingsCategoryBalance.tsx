import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Scale, BarChart3, RefreshCw, Lock, Unlock, Play,
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus,
  Info, History, Target, Zap, Settings2, ArrowRight, ArrowUpDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Cell, Legend, Tooltip as RechartsTooltip, PieChart, Pie,
} from "recharts";

// ─── Color palette for categories ────────────────────────────
const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#14b8a6",
];

function getCategoryColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

// ─── Gap Status Badge ────────────────────────────────────────
function GapBadge({ status, gap }: { status: string; gap: number }) {
  if (status === "over") {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <TrendingUp className="w-3 h-3" /> +{gap.toFixed(1)}%
      </Badge>
    );
  }
  if (status === "under") {
    return (
      <Badge className="text-xs gap-1 bg-amber-500 hover:bg-amber-600">
        <TrendingDown className="w-3 h-3" /> {gap.toFixed(1)}%
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs gap-1">
      <Minus className="w-3 h-3" /> Balanced
    </Badge>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function SettingsCategoryBalance() {
  const [activeTab, setActiveTab] = useState("overview");

  // ─── Data Queries ──────────────────────────────────────────
  const { data: settings, refetch: refetchSettings } = trpc.categoryBalance.getSettings.useQuery();
  const { data: distribution, isLoading: distLoading } = trpc.categoryBalance.getDistribution.useQuery();
  const { data: gapAnalysis, isLoading: gapLoading } = trpc.categoryBalance.getGapAnalysis.useQuery();
  const { data: recommendation, isLoading: recLoading, refetch: refetchRec } = trpc.categoryBalance.getRecommendation.useQuery();
  const { data: rebalanceLogs } = trpc.categoryBalance.getRebalanceLogs.useQuery();
  const { data: feedPublishRate } = trpc.categoryBalance.getFeedPublishRate.useQuery();
  const { data: autoCheck } = trpc.categoryBalance.checkAutoRebalance.useQuery();

  // ─── Mutations ─────────────────────────────────────────────
  const updateSettings = trpc.categoryBalance.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      refetchSettings();
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const applyRebalance = trpc.categoryBalance.applyRebalance.useMutation({
    onSuccess: () => {
      toast.success("Weights rebalanced successfully!");
      refetchRec();
      refetchSettings();
    },
    onError: (e: any) => toast.error(`Rebalance failed: ${e.message}`),
  });

  const toggleLock = trpc.categoryBalance.toggleWeightLock.useMutation({
    onSuccess: () => {
      refetchSettings();
      refetchRec();
    },
  });

  // ─── Local Settings State ─────────────────────────────────
  const [localSettings, setLocalSettings] = useState<{
    triggerCount?: number;
    maxWeightChange?: number;
    cooldownHours?: number;
    minArticlesThreshold?: number;
    fingerprintWindow?: number;
  }>({});

  const effectiveSettings = useMemo(() => ({
    triggerCount: localSettings.triggerCount ?? settings?.triggerCount ?? 50,
    maxWeightChange: localSettings.maxWeightChange ?? settings?.maxWeightChange ?? 20,
    cooldownHours: localSettings.cooldownHours ?? settings?.cooldownHours ?? 6,
    minArticlesThreshold: localSettings.minArticlesThreshold ?? settings?.minArticlesThreshold ?? 25,
    fingerprintWindow: localSettings.fingerprintWindow ?? settings?.fingerprintWindow ?? 200,
  }), [localSettings, settings]);

  const hasSettingsChanges = Object.keys(localSettings).length > 0;

  function saveSettings() {
    updateSettings.mutate(localSettings);
    setLocalSettings({});
  }

  // ─── Chart Data ────────────────────────────────────────────
  const distributionChartData = useMemo(() => {
    if (!gapAnalysis) return [];
    return gapAnalysis.map((cat: any, i: number) => ({
      name: cat.categoryName,
      current: cat.percentage,
      target: cat.targetPercentage,
      fill: getCategoryColor(i),
    }));
  }, [gapAnalysis]);

  const projectedChartData = useMemo(() => {
    if (!recommendation) return [];
    const cats = Object.keys(recommendation.targetDistribution);
    return cats.map((slug, i) => ({
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      current: recommendation.currentDistribution[slug] || 0,
      projected: recommendation.projectedDistribution[slug] || 0,
      target: recommendation.targetDistribution[slug] || 0,
      fill: getCategoryColor(i),
    }));
  }, [recommendation]);

  // ─── Feed changes summary ─────────────────────────────────
  const feedChanges = useMemo(() => {
    if (!recommendation) return { increases: [], decreases: [], unchanged: [] };
    const increases = recommendation.feeds.filter((f: any) => f.weightChange > 0).sort((a: any, b: any) => b.weightChange - a.weightChange);
    const decreases = recommendation.feeds.filter((f: any) => f.weightChange < 0).sort((a: any, b: any) => a.weightChange - b.weightChange);
    const unchanged = recommendation.feeds.filter((f: any) => f.weightChange === 0);
    return { increases, decreases, unchanged };
  }, [recommendation]);

  const isLoading = distLoading || gapLoading || recLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Category Balance</h1>
              <p className="text-muted-foreground text-sm">Optimize feed weights for uniform article distribution</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autoCheck && (
              <Badge variant={autoCheck.should ? "default" : "secondary"} className="text-xs">
                {autoCheck.should ? "Auto-rebalance ready" : autoCheck.reason}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {recommendation && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground mb-1">Current Gap</div>
                <div className="text-2xl font-bold">{recommendation.currentGap}%</div>
                <div className="text-xs text-muted-foreground">deviation from target</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground mb-1">Projected Gap</div>
                <div className={`text-2xl font-bold ${recommendation.projectedGap < recommendation.currentGap ? 'text-green-600' : 'text-red-500'}`}>{recommendation.projectedGap}%</div>
                <div className="text-xs text-muted-foreground">after rebalance</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground mb-1">Improvement</div>
                <div className={`text-2xl font-bold ${recommendation.improvement > 0 ? 'text-green-600' : recommendation.improvement < 0 ? 'text-red-500' : ''}`}>{recommendation.improvement > 0 ? '+' : ''}{recommendation.improvement}%</div>
                <div className="text-xs text-muted-foreground">gap reduction</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                <div className="text-2xl font-bold">{recommendation.confidence}%</div>
                <div className="text-xs text-muted-foreground">
                  {recommendation.feedsAnalyzed} feeds, {recommendation.feedsBelowThreshold} building
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="overview" className="flex-shrink-0">
              <BarChart3 className="w-4 h-4 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="optimize" className="flex-shrink-0">
              <Target className="w-4 h-4 mr-1.5" /> Optimize
            </TabsTrigger>
            <TabsTrigger value="feeds" className="flex-shrink-0">
              <ArrowUpDown className="w-4 h-4 mr-1.5" /> Feeds
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-shrink-0">
              <Settings2 className="w-4 h-4 mr-1.5" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* ─── Overview Tab ─────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Category Distribution</CardTitle>
                <CardDescription>Current article distribution vs target (equal distribution)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={distributionChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" />
                      <RechartsTooltip
                        contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8 }}
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                      />
                      <Legend />
                      <Bar dataKey="current" name="Current" radius={[4, 4, 0, 0]}>
                        {distributionChartData.map((_: any, i: number) => (
                          <Cell key={i} fill={getCategoryColor(i)} />
                        ))}
                      </Bar>
                      <Bar dataKey="target" name="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.4} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gap Analysis Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gap Analysis</CardTitle>
                <CardDescription>Categories ranked by deviation from target distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {gapLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Category</th>
                          <th className="text-right py-2 px-3 font-medium">Articles</th>
                          <th className="text-right py-2 px-3 font-medium">Current %</th>
                          <th className="text-right py-2 px-3 font-medium">Target %</th>
                          <th className="text-right py-2 px-3 font-medium">Gap</th>
                          <th className="text-center py-2 px-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gapAnalysis
                          ?.sort((a: any, b: any) => Math.abs(b.gap) - Math.abs(a.gap))
                          .map((cat: any, i: number) => (
                            <tr key={cat.categorySlug} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2.5 px-3 font-medium flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: cat.categoryColor }}
                                />
                                {cat.categoryName}
                              </td>
                              <td className="text-right py-2.5 px-3 tabular-nums">{cat.articleCount}</td>
                              <td className="text-right py-2.5 px-3 tabular-nums">{cat.percentage.toFixed(1)}%</td>
                              <td className="text-right py-2.5 px-3 tabular-nums text-muted-foreground">
                                {cat.targetPercentage.toFixed(1)}%
                              </td>
                              <td className="text-right py-2.5 px-3 tabular-nums">
                                <span className={cat.gap > 0 ? "text-red-500" : cat.gap < 0 ? "text-amber-500" : ""}>
                                  {cat.gap > 0 ? "+" : ""}{cat.gap.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-center py-2.5 px-3">
                                <GapBadge status={cat.status} gap={cat.gap} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Optimize Tab ─────────────────────────────── */}
          <TabsContent value="optimize" className="space-y-6">
            {/* Projected vs Current */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Optimization Preview</CardTitle>
                    <CardDescription>
                      Projected distribution after applying recommended weight changes
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchRec()}
                      disabled={recLoading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1.5 ${recLoading ? "animate-spin" : ""}`} />
                      Recalculate
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => applyRebalance.mutate({ triggerType: "manual" })}
                      disabled={applyRebalance.isPending || !recommendation || recommendation.improvement <= 0}
                    >
                      {applyRebalance.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-1.5" />
                      )}
                      Apply Rebalance
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {recLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={projectedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" />
                      <RechartsTooltip
                        contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8 }}
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                      />
                      <Legend />
                      <Bar dataKey="current" name="Current" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.5} />
                      <Bar dataKey="projected" name="Projected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="target" name="Target" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.3} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Recommended Weight Changes */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Increases */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Weight Increases ({feedChanges.increases.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {feedChanges.increases.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No increases recommended</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {feedChanges.increases.map((feed: any) => (
                        <div key={feed.feedId} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="truncate max-w-[200px]" title={feed.feedUrl}>
                            {feed.feedDomain}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-muted-foreground">{feed.currentWeight}</span>
                            <ArrowRight className="w-3 h-3 text-green-500" />
                            <span className="tabular-nums font-medium text-green-600">{feed.recommendedWeight}</span>
                            <Badge variant="secondary" className="text-xs">+{feed.weightChange}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Decreases */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Weight Decreases ({feedChanges.decreases.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {feedChanges.decreases.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No decreases recommended</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {feedChanges.decreases.map((feed: any) => (
                        <div key={feed.feedId} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="truncate max-w-[200px]" title={feed.feedUrl}>
                            {feed.feedDomain}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-muted-foreground">{feed.currentWeight}</span>
                            <ArrowRight className="w-3 h-3 text-red-500" />
                            <span className="tabular-nums font-medium text-red-600">{feed.recommendedWeight}</span>
                            <Badge variant="destructive" className="text-xs">{feed.weightChange}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Rebalance History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" /> Rebalance History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!rebalanceLogs || rebalanceLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No rebalance history yet. Run your first optimization above.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {rebalanceLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {log.triggerType === "auto" ? (
                            <Zap className="w-4 h-4 text-primary" />
                          ) : (
                            <Play className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium capitalize">{log.triggerType} rebalance</span>
                            <Badge variant="secondary" className="text-xs">
                              Confidence: {log.confidence}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{log.notes}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.triggeredAt).toLocaleString()} · {log.articleCountSinceLastRebalance} articles since previous
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Feeds Tab ────────────────────────────────── */}
          <TabsContent value="feeds" className="space-y-6">
            {/* Feed Publish Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Feed Performance</CardTitle>
                <CardDescription>Article output and weight lock status per feed source</CardDescription>
              </CardHeader>
              <CardContent>
                {!feedPublishRate ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Feed</th>
                          <th className="text-right py-2 px-3 font-medium">Weight</th>
                          <th className="text-right py-2 px-3 font-medium">Total</th>
                          <th className="text-right py-2 px-3 font-medium">7d</th>
                          <th className="text-right py-2 px-3 font-medium">30d</th>
                          <th className="text-center py-2 px-3 font-medium">Status</th>
                          <th className="text-center py-2 px-3 font-medium">Lock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedPublishRate
                          .filter((f: any) => f.totalArticles > 0 || f.enabled)
                          .sort((a: any, b: any) => b.totalArticles - a.totalArticles)
                          .map((feed: any) => {
                            const isLocked = settings?.weightLocks?.[feed.feedUrl] ?? false;
                            const belowThreshold = feed.totalArticles < (settings?.minArticlesThreshold ?? 25);
                            return (
                              <tr key={feed.feedId} className="border-b last:border-0 hover:bg-muted/50">
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate max-w-[200px]" title={feed.feedUrl}>
                                      {feed.feedDomain}
                                    </span>
                                    {!feed.enabled && (
                                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="text-right py-2.5 px-3 tabular-nums">{feed.weight}</td>
                                <td className="text-right py-2.5 px-3 tabular-nums">{feed.totalArticles}</td>
                                <td className="text-right py-2.5 px-3 tabular-nums">{feed.last7Days}</td>
                                <td className="text-right py-2.5 px-3 tabular-nums">{feed.last30Days}</td>
                                <td className="text-center py-2.5 px-3">
                                  {belowThreshold ? (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200">
                                          Building Profile
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Needs {(settings?.minArticlesThreshold ?? 25) - feed.totalArticles} more articles for reliable fingerprint</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : feed.errorCount > 5 ? (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="w-3 h-3 mr-1" /> Errors
                                    </Badge>
                                  ) : (
                                    <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-200">
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                                    </Badge>
                                  )}
                                </td>
                                <td className="text-center py-2.5 px-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => toggleLock.mutate({ feedUrl: feed.feedUrl, locked: !isLocked })}
                                  >
                                    {isLocked ? (
                                      <Lock className="w-4 h-4 text-amber-500" />
                                    ) : (
                                      <Unlock className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </Button>
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
          </TabsContent>

          {/* ─── Settings Tab ─────────────────────────────── */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Rebalance Configuration</CardTitle>
                    <CardDescription>Control how and when automatic rebalancing occurs</CardDescription>
                  </div>
                  {hasSettingsChanges && (
                    <Button size="sm" onClick={saveSettings} disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                      Save Changes
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Auto-Rebalance Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Auto-Rebalance</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Automatically optimize feed weights after every {effectiveSettings.triggerCount} articles
                    </p>
                  </div>
                  <Switch
                    checked={settings?.autoRebalanceEnabled ?? false}
                    onCheckedChange={(checked) => updateSettings.mutate({ autoRebalanceEnabled: checked })}
                  />
                </div>

                <Separator />

                {/* Trigger Count */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Trigger Count</Label>
                    <span className="text-sm tabular-nums font-medium">{effectiveSettings.triggerCount} articles</span>
                  </div>
                  <Slider
                    value={[effectiveSettings.triggerCount]}
                    onValueChange={([v]) => setLocalSettings(s => ({ ...s, triggerCount: v }))}
                    min={10}
                    max={200}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of new articles before auto-rebalance triggers.
                    Currently {settings?.articlesSinceLastRebalance ?? 0} articles since last rebalance.
                  </p>
                </div>

                <Separator />

                {/* Max Weight Change */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Max Weight Change Per Cycle</Label>
                    <span className="text-sm tabular-nums font-medium">±{effectiveSettings.maxWeightChange}%</span>
                  </div>
                  <Slider
                    value={[effectiveSettings.maxWeightChange]}
                    onValueChange={([v]) => setLocalSettings(s => ({ ...s, maxWeightChange: v }))}
                    min={5}
                    max={50}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limits how much a single feed's weight can change in one rebalance cycle.
                  </p>
                </div>

                <Separator />

                {/* Cooldown Period */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Cooldown Period</Label>
                    <span className="text-sm tabular-nums font-medium">{effectiveSettings.cooldownHours} hours</span>
                  </div>
                  <Slider
                    value={[effectiveSettings.cooldownHours]}
                    onValueChange={([v]) => setLocalSettings(s => ({ ...s, cooldownHours: v }))}
                    min={1}
                    max={48}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum time between auto-rebalance cycles to prevent oscillation.
                  </p>
                </div>

                <Separator />

                {/* Fingerprint Window */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Fingerprint Window</Label>
                    <span className="text-sm tabular-nums font-medium">{effectiveSettings.fingerprintWindow} articles</span>
                  </div>
                  <Slider
                    value={[effectiveSettings.fingerprintWindow]}
                    onValueChange={([v]) => setLocalSettings(s => ({ ...s, fingerprintWindow: v }))}
                    min={50}
                    max={500}
                    step={25}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of recent articles per feed used to calculate its category fingerprint.
                  </p>
                </div>

                <Separator />

                {/* Minimum Articles Threshold */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Minimum Articles Threshold</Label>
                    <span className="text-sm tabular-nums font-medium">{effectiveSettings.minArticlesThreshold} articles</span>
                  </div>
                  <Slider
                    value={[effectiveSettings.minArticlesThreshold]}
                    onValueChange={([v]) => setLocalSettings(s => ({ ...s, minArticlesThreshold: v }))}
                    min={5}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Feeds with fewer articles than this are excluded from optimization (shown as "Building Profile").
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
