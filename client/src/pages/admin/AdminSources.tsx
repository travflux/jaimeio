/**
 * AdminSources — v4.0 Source Management Page
 *
 * Shows all configured content sources (RSS, Google News, X, Reddit, YouTube, Web Scraper)
 * with enable/disable toggles, priority weight controls, Fetch Now buttons,
 * and a candidate pool stats widget broken down by source type.
 */

import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Zap, Rss, Search, Twitter, MessageCircle, Youtube, Globe } from "lucide-react";

// ─── Source type metadata ─────────────────────────────────────────────────────

const SOURCE_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  rss: {
    label: "RSS Feeds",
    icon: <Rss className="w-4 h-4" />,
    description: "Configured RSS/Atom feeds polled every 30 minutes.",
  },
  google_news: {
    label: "Google News",
    icon: <Search className="w-4 h-4" />,
    description: "Google News RSS feeds based on configured search queries.",
  },
  x: {
    label: "X / Twitter",
    icon: <Twitter className="w-4 h-4" />,
    description: "X API v2 search/recent results for configured keywords.",
  },
  reddit: {
    label: "Reddit",
    icon: <MessageCircle className="w-4 h-4" />,
    description: "Reddit hot posts from configured subreddits.",
  },
  youtube: {
    label: "YouTube",
    icon: <Youtube className="w-4 h-4" />,
    description: "YouTube Data API v3 — channel videos and search queries.",
  },
  scraper: {
    label: "Web Scraper",
    icon: <Globe className="w-4 h-4" />,
    description: "Custom CSS-selector scrapers for configured websites.",
  },
};

// ─── Stats widget ─────────────────────────────────────────────────────────────

function CandidateStatsWidget() {
  const { data: rows, isLoading, refetch } = trpc.sources.getCandidateStatsBySource.useQuery();
  const { data: globalStats } = trpc.sources.getCandidateStats.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading stats...
      </div>
    );
  }

  // Aggregate by source type
  const bySource: Record<string, Record<string, number>> = {};
  for (const row of rows ?? []) {
    const src = row.sourceType ?? "rss";
    if (!bySource[src]) bySource[src] = {};
    bySource[src][row.status] = Number(row.count);
  }

  const sourceTypes = Object.keys(bySource).sort();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Candidate Pool</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {globalStats && (
            <>
              <span className="text-green-600 font-medium">{globalStats.pending} pending</span>
              <span>·</span>
              <span>{globalStats.selected} selected</span>
              <span>·</span>
              <span>{globalStats.total} total</span>
            </>
          )}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {sourceTypes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No candidates in pool yet. Enable sources and click Fetch Now.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sourceTypes.map((src) => {
            const meta = SOURCE_META[src];
            const counts = bySource[src];
            const pending = counts["pending"] ?? 0;
            const selected = counts["selected"] ?? 0;
            const rejected = counts["rejected"] ?? 0;
            const expired = counts["expired"] ?? 0;
            return (
              <div key={src} className="rounded-lg border bg-card p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {meta?.icon}
                  <span>{meta?.label ?? src}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {pending > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-100 text-green-700">{pending} pending</Badge>}
                  {selected > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{selected} selected</Badge>}
                  {rejected > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-red-50 text-red-600">{rejected} rejected</Badge>}
                  {expired > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 text-muted-foreground">{expired} expired</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Source row ───────────────────────────────────────────────────────────────

interface SourceRowProps {
  sourceKey: string;
  enabled: boolean;
  onToggle: () => void;
  onFetchNow: () => Promise<void>;
  isFetching: boolean;
  note?: string;
  settingsLink?: string;
}

function SourceRow({ sourceKey, enabled, onToggle, onFetchNow, isFetching, note, settingsLink }: SourceRowProps) {
  const meta = SOURCE_META[sourceKey];
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          {meta?.icon ?? <Globe className="w-4 h-4" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{meta?.label ?? sourceKey}</span>
            {!enabled && <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">Disabled</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{note ?? meta?.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {settingsLink && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <a href={settingsLink}>Configure</a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onFetchNow}
          disabled={isFetching || !enabled}
        >
          {isFetching ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
          Fetch Now
        </Button>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSources() {
  // Load configs
  const { data: rssFeeds } = trpc.setup.getRssFeeds.useQuery();
  const { data: googleNewsData, refetch: refetchGoogleNews } = trpc.sources.getGoogleNewsTopics.useQuery();
  const { data: xData, refetch: refetchX } = trpc.sources.getXListenerConfig.useQuery();
  const { data: redditData, refetch: refetchReddit } = trpc.sources.getRedditConfig.useQuery();
  const { data: youtubeData, refetch: refetchYoutube } = trpc.sources.getYouTubeConfig.useQuery();
  const { data: scraperData, refetch: refetchScraper } = trpc.sources.getWebScraperConfig.useQuery();

  // Save mutations for enable/disable toggles
  const saveGoogleNews = trpc.sources.saveGoogleNewsTopics.useMutation();
  const saveX = trpc.sources.saveXListenerConfig.useMutation();
  const saveReddit = trpc.sources.saveRedditConfig.useMutation();
  const saveYoutube = trpc.sources.saveYouTubeConfig.useMutation();
  const saveScraper = trpc.sources.saveWebScraperConfig.useMutation();

  // Fetch now mutations
  const fetchGoogleNow = trpc.sources.fetchGoogleNewsNow.useMutation();
  const fetchXNow = trpc.sources.fetchXNow.useMutation();
  const fetchRedditNow = trpc.sources.fetchRedditNow.useMutation();
  const fetchYoutubeNow = trpc.sources.fetchYouTubeNow.useMutation();
  const fetchScraperNow = trpc.sources.fetchWebScraperNow.useMutation();

  // RSS fetch (uses the rss-bridge directly)
  const [rssFetching, setRssFetching] = useState(false);

  const handleRssFetchNow = async () => {
    setRssFetching(true);
    try {
      toast.info("RSS feeds are polled automatically every 30 minutes. Use Source Feeds to manage them.");
    } finally {
      setRssFetching(false);
    }
  };

  const handleFetch = async (
    mutation: { mutateAsync: () => Promise<{ inserted?: number; success?: boolean }> },
    label: string,
    refetch?: () => void
  ) => {
    try {
      const result = await mutation.mutateAsync();
      const inserted = (result as any).inserted ?? 0;
      toast.success(inserted > 0 ? `${label}: ${inserted} new candidates added.` : `${label}: No new candidates.`);
      refetch?.();
    } catch (e: any) {
      toast.error(`${label} fetch failed: ${e.message}`);
    }
  };

  const handleToggle = async (
    currentEnabled: boolean,
    saveFn: (enabled: boolean) => Promise<void>,
    label: string,
    refetch: () => void
  ) => {
    try {
      await saveFn(!currentEnabled);
      toast.success(`${label} ${!currentEnabled ? "enabled" : "disabled"}.`);
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">Source Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all content sources feeding the v4.0 candidate pipeline. Enable/disable sources, trigger manual fetches, and monitor candidate pool health.
          </p>
        </div>

        {/* Candidate pool stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Candidate Pool Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateStatsWidget />
          </CardContent>
        </Card>

        {/* Source list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sources</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* RSS */}
            <SourceRow
              sourceKey="rss"
              enabled={true}
              onToggle={() => toast.info("RSS feeds are always active. Manage feeds in Source Feeds.")}
              onFetchNow={handleRssFetchNow}
              isFetching={rssFetching}
              note={`${rssFeeds?.length ?? 0} feeds configured. Always active.`}
              settingsLink="/admin/source-feeds"
            />

            {/* Google News */}
            <SourceRow
              sourceKey="google_news"
              enabled={googleNewsData?.enabled ?? true}
              onToggle={() =>
                handleToggle(
                  googleNewsData?.enabled ?? true,
                  async (enabled) => {
                    await saveGoogleNews.mutateAsync({
                      topics: googleNewsData?.topics ?? "",
                      enabled,
                    });
                  },
                  "Google News",
                  refetchGoogleNews
                )
              }
              onFetchNow={() => handleFetch(fetchGoogleNow as any, "Google News", refetchGoogleNews)}
              isFetching={fetchGoogleNow.isPending}
              note={`${(googleNewsData?.topics ?? "").split("\n").filter(Boolean).length} queries configured.`}
              settingsLink="/admin/setup"
            />

            {/* X / Twitter */}
            <SourceRow
              sourceKey="x"
              enabled={xData?.enabled ?? false}
              onToggle={() =>
                handleToggle(
                  xData?.enabled ?? false,
                  async (enabled) => {
                    await saveX.mutateAsync({
                      queries: xData?.queries ?? "",
                      enabled,
                    });
                  },
                  "X Listener",
                  refetchX
                )
              }
              onFetchNow={() => handleFetch(fetchXNow as any, "X Listener", refetchX)}
              isFetching={fetchXNow.isPending}
              note={`${(xData?.queries ?? "").split("\n").filter(Boolean).length} queries configured.`}
              settingsLink="/admin/setup"
            />

            {/* Reddit */}
            <SourceRow
              sourceKey="reddit"
              enabled={redditData?.enabled ?? false}
              onToggle={() =>
                handleToggle(
                  redditData?.enabled ?? false,
                  async (enabled) => {
                    await saveReddit.mutateAsync({
                      subreddits: redditData?.subreddits ?? "",
                      enabled,
                    });
                  },
                  "Reddit Listener",
                  refetchReddit
                )
              }
              onFetchNow={() => handleFetch(fetchRedditNow as any, "Reddit", refetchReddit)}
              isFetching={fetchRedditNow.isPending}
              note={`${(redditData?.subreddits ?? "").split("\n").filter(Boolean).length} subreddits configured.`}
              settingsLink="/admin/setup"
            />

            {/* YouTube */}
            <SourceRow
              sourceKey="youtube"
              enabled={youtubeData?.enabled ?? false}
              onToggle={() =>
                handleToggle(
                  youtubeData?.enabled ?? false,
                  async (enabled) => {
                    await saveYoutube.mutateAsync({
                      channels: youtubeData?.channels ?? "",
                      searchQueries: youtubeData?.searchQueries ?? "",
                      enabled,
                    });
                  },
                  "YouTube Agent",
                  refetchYoutube
                )
              }
              onFetchNow={() => handleFetch(fetchYoutubeNow as any, "YouTube", refetchYoutube)}
              isFetching={fetchYoutubeNow.isPending}
              note={
                youtubeData?.hasApiKey === false
                  ? "API key missing — add YOUTUBE_API_KEY to enable."
                  : `${(youtubeData?.channels ?? "").split("\n").filter(Boolean).length} channels, ${(youtubeData?.searchQueries ?? "").split("\n").filter(Boolean).length} queries.`
              }
              settingsLink="/admin/setup"
            />

            {/* Web Scraper */}
            <SourceRow
              sourceKey="scraper"
              enabled={scraperData?.enabled ?? false}
              onToggle={() =>
                handleToggle(
                  scraperData?.enabled ?? false,
                  async (enabled) => {
                    await saveScraper.mutateAsync({
                      configs: scraperData?.configs ?? "[]",
                      enabled,
                    });
                  },
                  "Web Scraper",
                  refetchScraper
                )
              }
              onFetchNow={() => handleFetch(fetchScraperNow as any, "Web Scraper", refetchScraper)}
              isFetching={fetchScraperNow.isPending}
              note={(() => {
                try {
                  const arr = JSON.parse(scraperData?.configs ?? "[]");
                  return `${arr.length} scraper(s) configured.`;
                } catch {
                  return "0 scrapers configured.";
                }
              })()}
              settingsLink="/admin/setup"
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
