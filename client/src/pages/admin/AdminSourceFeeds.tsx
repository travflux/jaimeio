"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Plus, RefreshCw, Rss, ShieldBan, BarChart3, Settings2, Globe, Scale, Lock, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { useSettings } from "@/hooks/useSettings";

export default function AdminSourceFeeds() {
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceReason, setNewSourceReason] = useState("");

  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading: settingsLoading, isSaving } = useSettings();
  const { data: blockedSources, refetch: refetchBlocked } = trpc.admin.getBlockedSources.useQuery();
  const { data: settings, refetch: refetchSettings } = trpc.admin.getFeedSettings.useQuery();
  const { data: analytics, refetch: refetchAnalytics } = trpc.admin.getSourceAnalytics.useQuery();
  const { data: feedWeights, refetch: refetchWeights } = trpc.admin.getAllRssFeedWeights.useQuery();
  
  const initializeWeights = trpc.admin.initializeFeedWeights.useMutation({
    onSuccess: () => {
      toast.success("Feed weights initialized from legacy settings");
      refetchWeights();
    },
    onError: (error: any) => {
      toast.error(`Failed to initialize weights: ${error.message}`);
    },
  });

  // Fix 9: Add/remove feeds directly in rss_feed_weights (single source of truth)
  const addFeedMutation = trpc.admin.addRssFeedWeight.useMutation({
    onSuccess: () => {
      toast.success("Feed added");
      refetchWeights();
    },
    onError: (error: any) => {
      toast.error(`Failed to add feed: ${error.message}`);
    },
  });

  const removeFeedMutation = trpc.admin.removeRssFeedWeight.useMutation({
    onSuccess: () => {
      toast.success("Feed removed");
      refetchWeights();
    },
    onError: (error: any) => {
      toast.error(`Failed to remove feed: ${error.message}`);
    },
  });

  const addRssFeed = () => {
    const url = prompt("Enter the full RSS feed URL (e.g., https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml):");
    if (!url) return;
    if (!url.startsWith("http")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }
    if (feedWeights?.some(w => w.feedUrl === url.trim())) {
      toast.error("This feed URL is already in your list");
      return;
    }
    addFeedMutation.mutate({ feedUrl: url.trim(), weight: 50 });
  };

  const removeRssFeed = (feedUrl: string) => {
    if (!confirm(`Remove feed: ${feedUrl}?`)) return;
    removeFeedMutation.mutate({ feedUrl });
  };

  // Legacy: keep rssFeedsList for backward compat display only
  let rssFeedsList: string[] = [];
  try { rssFeedsList = JSON.parse(edits.rss_feeds || "[]"); } catch { rssFeedsList = []; }

  const blockSource = trpc.admin.blockSource.useMutation({
    onSuccess: () => {
      toast.success("Source blocked successfully");
      setNewSourceName("");
      setNewSourceUrl("");
      setNewSourceReason("");
      refetchBlocked();
    },
    onError: (error: any) => {
      toast.error(`Failed to block source: ${error.message}`);
    },
  });

  const unblockSource = trpc.admin.unblockSource.useMutation({
    onSuccess: () => {
      toast.success("Source unblocked successfully");
      refetchBlocked();
    },
    onError: (error: any) => {
      toast.error(`Failed to unblock source: ${error.message}`);
    },
  });

  const updateFeedSettings = trpc.admin.updateFeedSettings.useMutation({
    onSuccess: () => {
      toast.success("Feed settings updated");
      refetchSettings();
    },
    onError: (error: any) => {
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

  const handleBlockSource = () => {
    if (!newSourceName.trim()) {
      toast.error("Source name is required");
      return;
    }
    blockSource.mutate({
      sourceName: newSourceName.trim(),
      sourceUrl: newSourceUrl.trim() || undefined,
      reason: newSourceReason.trim() || undefined,
    });
  };

  const handleUnblockSource = (id: number) => {
    if (confirm("Are you sure you want to unblock this source?")) {
      unblockSource.mutate({ id });
    }
  };

  const handleToggleRandomize = (enabled: boolean) => {
    updateFeedSettings.mutate({
      randomizeOrder: enabled,
      shuffleSeed: (settings?.shuffleSeed || "daily") as "daily" | "random" | "fixed",
    });
  };

  const handleShuffleSeedChange = (seed: "daily" | "random" | "fixed") => {
    updateFeedSettings.mutate({
      randomizeOrder: settings?.randomizeOrder ?? true,
      shuffleSeed: seed,
    });
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Rss className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Source Feed Management</h1>
          <p className="text-muted-foreground text-sm">Add RSS feeds, manage sources, and control how articles are gathered</p>
        </div>
      </div>

      {/* ============================================ */}
      {/* RSS FEED SOURCES - Add/Remove RSS Feeds      */}
      {/* ============================================ */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg lg:text-xl font-semibold">RSS Feed Sources</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasChanges && (
              <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Feed Settings"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addRssFeed}>
              <Plus className="w-4 h-4 mr-1" /> Add Feed
            </Button>
            {rssFeedsList.length > 0 && feedWeights?.length === 0 && (
              <Button variant="outline" size="sm" onClick={() => initializeWeights.mutate()}>
                <RefreshCw className="w-4 h-4 mr-1" /> Initialize Weights
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          These are the RSS feed URLs that the article generator monitors for new stories. Add feeds from news sites you want to use as inspiration for satire articles.          Weights are managed by the <Link href="/admin/settings/category-balance" className="text-primary hover:underline font-medium">Category Balance</Link> system to maintain even distribution across categories.
        </p> {(!feedWeights || feedWeights.length === 0) ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <Rss className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No RSS feeds configured yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add Feed" to add your first news source.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {feedWeights.map((feedData) => {
              const url = feedData.feedUrl;
              const weight = feedData.weight ?? 50;
              const isLocked = !!weightLocks[url];
              return (
                <div key={url} className="p-4 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-start gap-3 mb-3">
                    <Rss className="w-4 h-4 text-orange-500 shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate text-muted-foreground">{url}</p>
                    </div>
                    <button
                      onClick={() => removeRssFeed(url)}
                      className="text-red-500 hover:text-red-700 p-1 shrink-0"
                      title="Remove this feed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
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

        {/* Additional Source Options */}
        <div className="mt-6 pt-4 border-t space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Additional Sources</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Include Google News</Label>
              <p className="text-xs text-muted-foreground">
                Also gather trending stories from Google News in addition to your RSS feeds above
              </p>
            </div>
            <Switch
              checked={edits.use_google_news === "true"}
              onCheckedChange={v => updateEdit("use_google_news", String(v))}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">News Regions</Label>
            <Input
              value={edits.news_regions || "US,GB"}
              onChange={e => updateEdit("news_regions", e.target.value)}
              placeholder="US,GB,AU"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated country codes for Google News. Controls which regional news stories are gathered (e.g., US = United States, GB = United Kingdom, AU = Australia, CA = Canada).
            </p>
          </div>
        </div>
      </Card>

      {/* ============================================ */}
      {/* BLOCK A SOURCE                               */}
      {/* ============================================ */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldBan className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-semibold">Block a Source</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Prevent articles from specific sources from being used in generation. Useful for blocking low-quality or irrelevant news sources.
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-1 block">Source Name</Label>
            <Input
              placeholder="e.g., Breitbart, Daily Mail"
              value={newSourceName}
              onChange={e => setNewSourceName(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">Source URL (optional)</Label>
            <Input
              placeholder="e.g., https://example.com"
              value={newSourceUrl}
              onChange={e => setNewSourceUrl(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">Reason for blocking (optional)</Label>
            <Textarea
              placeholder="e.g., Low-quality content, misinformation"
              value={newSourceReason}
              onChange={e => setNewSourceReason(e.target.value)}
              rows={2}
            />
          </div>
          <Button onClick={handleBlockSource} disabled={blockSource.isPending}>
            {blockSource.isPending ? "Blocking..." : "Block Source"}
          </Button>
        </div>
      </Card>

      {/* ============================================ */}
      {/* SOURCE USAGE ANALYTICS                       */}
      {/* ============================================ */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-green-500" />
          <h2 className="text-xl font-semibold">Source Usage Analytics</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          See which sources are being used most frequently in article generation.
        </p>
        {!analytics || analytics.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No analytics data available yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analytics.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg text-sm">
                <span className="truncate flex-1">{item.source}</span>
                <span className="font-semibold ml-2 shrink-0">{item.count} articles</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ============================================ */}
      {/* BLOCKED SOURCES                              */}
      {/* ============================================ */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldBan className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-semibold">Blocked Sources</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Sources that are currently blocked from article generation.
        </p>
        {!blockedSources || blockedSources.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No blocked sources.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {blockedSources.map((source) => (
              <div key={source.id} className="flex items-start justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-sm border border-red-200 dark:border-red-800">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{source.sourceName}</p>
                  {source.sourceUrl && <p className="text-xs text-muted-foreground truncate">{source.sourceUrl}</p>}
                  {source.reason && <p className="text-xs text-muted-foreground mt-1">{source.reason}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnblockSource(source.id)}
                  disabled={unblockSource.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 shrink-0"
                >
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
    </AdminLayout>
  );
}
