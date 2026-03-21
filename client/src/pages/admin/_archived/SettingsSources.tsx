import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Rss, Plus, Trash2, RefreshCw, Shuffle, AlertCircle, CheckCircle2, Clock, Scale, Lock } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SettingsSources() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();
  const { data: feedWeights, refetch: refetchWeights } = trpc.admin.getAllRssFeedWeights.useQuery();
  const { data: settings, refetch: refetchSettings } = trpc.admin.getFeedSettings.useQuery();
  const utils = trpc.useUtils();
  const updateFeedSettings = trpc.admin.updateFeedSettings.useMutation({
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await utils.admin.getFeedSettings.cancel();
      // Snapshot old data
      const oldData = utils.admin.getFeedSettings.getData();
      // Optimistically update cache with proper types
      utils.admin.getFeedSettings.setData(undefined, {
        randomizeOrder: newData.randomizeOrder,
        shuffleSeed: newData.shuffleSeed,
        randomizeFeedSources: newData.randomizeFeedSources ?? false,
      } as any);
      return { oldData };
    },
    onSuccess: () => {
      toast.success("Feed settings updated");
      refetchSettings();
    },
    onError: (error: any, _variables, context: any) => {
      // Rollback on error
      if (context?.oldData) {
        utils.admin.getFeedSettings.setData(undefined, context.oldData);
      }
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
  // Weight locks from Category Balance
  const { data: weightLocksSetting } = trpc.settings.get.useQuery({ key: "weight_locks" });
  const weightLocks: Record<string, boolean> = (() => {
    try {
      const raw = typeof weightLocksSetting === 'string' ? weightLocksSetting : weightLocksSetting?.value;
      return JSON.parse(raw || "{}");
    } catch { return {}; }
  })();
  const toggleRssFeedEnabled = trpc.admin.toggleRssFeedEnabled.useMutation({
    onSuccess: () => {
      toast.success("Feed status updated");
      refetchWeights();
    },
    onError: (error: any) => {
      toast.error(`Failed to update feed status: ${error.message}`);
    },
  });
  const initializeWeights = trpc.admin.initializeFeedWeights.useMutation({
    onSuccess: () => {
      toast.success("Feed weights initialized");
      refetchWeights();
    },
    onError: (error: any) => {
      toast.error(`Failed to initialize weights: ${error.message}`);
    },
  });

  let rssFeedsList: string[] = [];
  try { rssFeedsList = JSON.parse(edits.rss_feeds || "[]"); } catch { rssFeedsList = []; }

  const addRssFeed = () => {
    const url = prompt("Enter RSS feed URL:");
    if (!url) return;
    const updated = [...rssFeedsList, url.trim()];
    updateEdit("rss_feeds", JSON.stringify(updated));
  };

  const removeRssFeed = (index: number) => {
    const updated = rssFeedsList.filter((_, i) => i !== index);
    updateEdit("rss_feeds", JSON.stringify(updated));
  };

  const formatLastFetchTime = (timestamp: string | Date | null | undefined) => {
    if (!timestamp) return "Never";
    const dateStr = typeof timestamp === 'string' ? timestamp : timestamp?.toISOString?.();
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="News Sources"
        description="Manage RSS feeds and supplementary news sources."
        icon={<Rss className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">RSS Feed Sources</CardTitle>
                  <CardDescription>Manage the news feeds the workflow monitors.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addRssFeed}>
                  <Plus className="w-4 h-4 mr-1" /> Add Feed
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rssFeedsList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No RSS feeds configured.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {rssFeedsList.map((url, i) => {
                    const feedData = feedWeights?.find(w => w.feedUrl === url);
                    const weight = feedData?.weight ?? 50;
                    const isLocked = !!weightLocks[url];
                    const isEnabled = feedData?.enabled ?? true;
                    const errorCount = feedData?.errorCount ?? 0;
                    const lastFetchTime = feedData?.lastFetchTime;
                    const lastError = feedData?.lastError;
                    
                    return (
                      <div key={i} className={`p-3 bg-muted/50 rounded-lg border ${errorCount > 0 ? 'border-red-500/50' : 'border-border/50'} space-y-2 ${!isEnabled ? 'opacity-60' : ''}`}>
                        <div className="flex items-start gap-2">
                          <Rss className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                          <span className="truncate flex-1 font-mono text-xs">{url}</span>
                          <div className="flex gap-1 shrink-0">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(enabled) => {
                                toggleRssFeedEnabled.mutate({ feedUrl: url, enabled });
                              }}
                              className="scale-75"
                            />
                            <button onClick={() => removeRssFeed(i)} className="text-red-500 hover:text-red-700 p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Health Status */}
                        <div className="ml-5 space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            {errorCount > 0 ? (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                <span className="text-red-600 font-medium">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                <span className="text-green-600 font-medium">Healthy</span>
                              </>
                            )}
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatLastFetchTime(lastFetchTime as any)}
                            </span>
                          </div>
                          {lastError && (
                            <p className="text-red-600 text-xs truncate">Error: {lastError}</p>
                          )}
                        </div>
                        
                        {/* Weight Display (read-only, managed by Category Balance) */}
                        <div className="space-y-1.5 ml-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-medium">Weight: {weight}</Label>
                              {isLocked && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  <Lock className="w-2.5 h-2.5" /> Locked
                                </span>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Scale className="w-3 h-3" /> Managed by Category Balance
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${weight}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground">To adjust weights, go to <Link href="/admin/settings/category-balance" className="text-primary hover:underline">Category Balance</Link>.</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {rssFeedsList.length > 0 && feedWeights?.length === 0 && (
                <Button variant="outline" size="sm" onClick={() => initializeWeights.mutate()} className="w-full mt-3">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Initialize Weights
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Sources</CardTitle>
              <CardDescription>Configure supplementary news sources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Include Google News</label>
                  <p className="text-xs text-muted-foreground">Gather trending stories from Google News</p>
                </div>
                <Switch
                  checked={edits.use_google_news === "true"}
                  onCheckedChange={v => updateEdit("use_google_news", String(v))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">News Regions</label>
                <input
                  type="text"
                  value={edits.news_regions || "US,GB"}
                  onChange={e => updateEdit("news_regions", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                  placeholder="US,GB,AU"
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated region codes (e.g., US, GB, AU, CA).</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feed Behavior Settings */}
        <Card className="mt-6 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Shuffle className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Feed Behavior Settings</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Control how articles from your RSS feeds are ordered and processed. These settings help prevent the same sources from dominating your content.
          </p>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Randomize Feed Source Order</Label>
                <p className="text-sm text-muted-foreground">
                  When <span className="font-medium text-foreground">ON</span>: RSS feeds are queried in a random order each time, so no single source always gets priority.
                  When <span className="font-medium text-foreground">OFF</span>: Feeds are queried in the order listed above (top to bottom).
                </p>
              </div>
              <Switch
                checked={settings?.randomizeFeedSources ?? false}
                onCheckedChange={(enabled) => {
                  updateFeedSettings.mutate({
                    randomizeFeedSources: enabled,
                    randomizeOrder: settings?.randomizeOrder ?? true,
                    shuffleSeed: (settings?.shuffleSeed || "daily") as "daily" | "random" | "fixed",
                  });
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Shuffle Article Order</Label>
                <p className="text-sm text-muted-foreground">
                  When <span className="font-medium text-foreground">ON</span>: Collected articles are shuffled before being sent to the AI generator, preventing clusters of similar stories.
                  When <span className="font-medium text-foreground">OFF</span>: Articles are processed in the order they were collected from feeds.
                </p>
              </div>
              <Switch
                checked={settings?.randomizeOrder ?? true}
                onCheckedChange={(enabled) => {
                  updateFeedSettings.mutate({
                    randomizeOrder: enabled,
                    randomizeFeedSources: settings?.randomizeFeedSources ?? false,
                    shuffleSeed: (settings?.shuffleSeed || "daily") as "daily" | "random" | "fixed",
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Shuffle Seed Strategy</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Controls how articles are shuffled. <span className="font-medium text-foreground">Daily</span> uses the same seed each day (consistent shuffling). <span className="font-medium text-foreground">Random</span> reshuffles every time. <span className="font-medium text-foreground">Fixed</span> uses a permanent seed.
              </p>
              <div className="flex gap-2">
                {(['daily', 'random', 'fixed'] as const).map((seed) => (
                  <Button
                    key={seed}
                    variant={settings?.shuffleSeed === seed ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      updateFeedSettings.mutate({
                        shuffleSeed: seed,
                        randomizeOrder: settings?.randomizeOrder ?? true,
                        randomizeFeedSources: settings?.randomizeFeedSources ?? false,
                      });
                    }}
                    className="capitalize"
                  >
                    {seed}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
