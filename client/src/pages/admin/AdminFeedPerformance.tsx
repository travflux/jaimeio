import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, RotateCcw, Rss } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useMemo, useState } from "react";

type SortBy = "articles" | "errors" | "health" | "name";

export default function AdminFeedPerformance() {
  const { data: feedWeights, isLoading, refetch } = trpc.admin.getAllRssFeedWeights.useQuery();
  const toggleFeedEnabled = trpc.admin.toggleRssFeedEnabled.useMutation({
    onSuccess: () => {
      toast.success("Feed status updated");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to update feed: ${error.message}`);
    },
  });
  const checkAndReactivate = trpc.admin.checkAndReactivateDisabledFeeds.useMutation({
    onSuccess: (data) => {
      if (data.reactivated > 0) {
        toast.success(`Reactivated ${data.reactivated} of ${data.checked} disabled feeds`);
      } else {
        toast.info(`Checked ${data.checked} disabled feeds, none were reactivated`);
      }
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to check feeds: ${error.message}`);
    },
  });
  const [sortBy, setSortBy] = useState<SortBy>("health");

  const feedStats = useMemo(() => {
    if (!feedWeights) return [];

    return feedWeights.map((feed) => {
      const errorRate = feed.errorCount > 0 ? ((feed.errorCount / (feed.errorCount + 1)) * 100).toFixed(1) : "0";
      const isDisabled = !feed.enabled;
      const isUnhealthy = feed.errorCount >= 3;

      return {
        ...feed,
        errorRate: parseFloat(errorRate),
        isDisabled,
        isUnhealthy,
      };
    }).sort((a, b) => {
      switch (sortBy) {
        case "articles":
          return b.weight - a.weight;
        case "errors":
          return b.errorCount - a.errorCount;
        case "health":
          // Unhealthy first, then by error count
          if (a.isUnhealthy !== b.isUnhealthy) return a.isUnhealthy ? -1 : 1;
          return b.errorCount - a.errorCount;
        case "name":
          return a.feedUrl.localeCompare(b.feedUrl);
        default:
          return 0;
      }
    });
  }, [feedWeights, sortBy]);

  const stats = useMemo(() => {
    if (!feedStats) return { total: 0, healthy: 0, unhealthy: 0, disabled: 0 };
    return {
      total: feedStats.length,
      healthy: feedStats.filter((f) => !f.isUnhealthy && f.enabled).length,
      unhealthy: feedStats.filter((f) => f.isUnhealthy).length,
      disabled: feedStats.filter((f) => f.isDisabled).length,
    };
  }, [feedStats]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              Feed Performance
            </h1>
            <p className="text-muted-foreground mt-1">Monitor RSS feed health and performance metrics.</p>
          </div>
          {stats.disabled > 0 && (
            <Button
              onClick={() => checkAndReactivate.mutate()}
              disabled={checkAndReactivate.isPending}
              className="shrink-0"
            >
              {checkAndReactivate.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Check & Reactivate ({stats.disabled})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground mt-1">Total Feeds</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.healthy}</div>
                <p className="text-sm text-muted-foreground mt-1">Healthy</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.unhealthy}</div>
                <p className="text-sm text-muted-foreground mt-1">Unhealthy (3+ errors)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{stats.disabled}</div>
                <p className="text-sm text-muted-foreground mt-1">Disabled</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feed List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Feed Status</CardTitle>
                <CardDescription>Detailed performance metrics for each RSS source.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["health", "errors", "articles", "name"] as const).map((sort) => (
                  <Button
                    key={sort}
                    variant={sortBy === sort ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy(sort)}
                    className="capitalize text-xs sm:text-sm"
                  >
                    {sort === "articles" ? "Weight" : sort}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {feedStats.map((feed) => (
                <div
                  key={feed.id}
                  className={`p-4 rounded-lg border ${
                    feed.isUnhealthy
                      ? "border-red-500/50 bg-red-50/30"
                      : feed.isDisabled
                      ? "border-orange-500/50 bg-orange-50/30"
                      : "border-green-500/50 bg-green-50/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <Rss className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="font-mono text-xs sm:text-sm truncate break-all">{feed.feedUrl}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Weight</p>
                          <p className="font-semibold">{feed.weight}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Errors</p>
                          <p className={`font-semibold ${feed.errorCount > 0 ? "text-red-600" : "text-green-600"}`}>
                            {feed.errorCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Error Rate</p>
                          <p className="font-semibold">{feed.errorRate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs sm:text-sm">Last Fetch</p>
                          <p className="font-semibold text-xs">
                            {feed.lastFetchTime
                              ? new Date(feed.lastFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : "Never"}
                          </p>
                        </div>
                      </div>
                      {feed.lastError && (
                        <p className="text-xs text-red-600 mt-2 break-words line-clamp-2">Error: {feed.lastError}</p>
                      )}
                    </div>
                    <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                      {feed.isUnhealthy && (
                        <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          Auto-Disabled
                        </div>
                      )}
                      {feed.enabled ? (
                        <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          <RotateCcw className="w-3 h-3" />
                          Disabled
                        </div>
                      )}
                      {feed.isUnhealthy && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            toggleFeedEnabled.mutate({
                              feedUrl: feed.feedUrl,
                              enabled: true,
                            });
                          }}
                          className="text-xs"
                        >
                          Re-enable
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">How Feed Health Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>Healthy:</strong> Feed is active and fetching articles successfully.
            </p>
            <p>
              <strong>Unhealthy (3+ errors):</strong> Feed has failed 3 or more times in a row and has been automatically disabled to prevent workflow delays.
            </p>
            <p>
              <strong>Auto-Disabled:</strong> When a feed fails 3 consecutive times, it's automatically disabled. Review the error message and click "Re-enable" once the issue is resolved.
            </p>
            <p>
              <strong>Error Rate:</strong> Percentage of fetch attempts that resulted in errors.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
