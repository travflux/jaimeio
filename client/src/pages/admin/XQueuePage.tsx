import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Play, Pause, SkipForward, RefreshCw, CheckCircle2, XCircle,
  Clock, Send, AlertTriangle, Loader2, ListPlus, Trash2, Twitter, Settings2, RotateCcw
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function XQueuePage() {
  const [intervalInput, setIntervalInput] = useState("15");

  // Queries
  const queueStatus = trpc.xQueue.status.useQuery(undefined, { refetchInterval: 10000 });
  // Removed separate credential check - using queueStatus.hasCredentials instead
  const socialPosts = trpc.social.list.useQuery({ status: "scheduled" });
  const draftPosts = trpc.social.list.useQuery({ status: "draft" });
  const autoQueueSetting = trpc.settings.get.useQuery({ key: "x_auto_queue_on_publish" });
  const failedPosts = trpc.social.list.useQuery({ status: "failed" });

  // Mutations
  const startQueue = trpc.xQueue.start.useMutation({
    onSuccess: () => {
      toast.success("Queue Started", { description: "X post queue is now running." });
      queueStatus.refetch();
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });
  const stopQueue = trpc.xQueue.stop.useMutation({
    onSuccess: () => {
      toast.success("Queue Stopped", { description: "X post queue has been paused." });
      queueStatus.refetch();
    },
  });
  const updateInterval = trpc.xQueue.updateInterval.useMutation({
    onSuccess: () => {
      toast.success("Interval Updated", { description: `Posts will now go out every ${intervalInput} minutes.` });
      queueStatus.refetch();
    },
  });
  const postNext = trpc.xQueue.postNext.useMutation({
    onSuccess: (data) => {
      if (data.posted) {
        toast.success("Tweet Posted!", { description: `Tweet ID: ${data.tweetId}` });
      } else {
        toast.error("Not Posted", { description: data.error || "No posts in queue" });
      }
      socialPosts.refetch();
      queueStatus.refetch();
    },
  });
  const queueAllDrafts = trpc.xQueue.queueAllDrafts.useMutation({
    onSuccess: (data) => {
      toast.success("Posts Queued", { description: `${data.queued} draft posts moved to queue.` });
      socialPosts.refetch();
      draftPosts.refetch();
    },
  });
  const dequeue = trpc.xQueue.dequeue.useMutation({
    onSuccess: () => {
      toast.success("Post Removed", { description: "Post moved back to drafts." });
      socialPosts.refetch();
      draftPosts.refetch();
    },
  });
  const updateAutoQueue = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Setting Updated", { description: "Auto-queue preference saved." });
      autoQueueSetting.refetch();
    },
  });
  const retryFailed = trpc.xQueue.retryFailed.useMutation({
    onSuccess: (data) => {
      if (data.retried > 0) {
        toast.success("Posts Re-queued", { description: `${data.retried} failed post${data.retried === 1 ? '' : 's'} moved back to queue.` });
      } else {
        toast.info("No Failed Posts", { description: "There are no failed posts to retry." });
      }
      socialPosts.refetch();
      failedPosts.refetch();
      queueStatus.refetch();
    },
    onError: (e) => toast.error("Retry Failed", { description: e.message }),
  });

  useEffect(() => {
    if (queueStatus.data) {
      setIntervalInput(String(queueStatus.data.intervalMinutes));
    }
  }, [queueStatus.data]);

  const status = queueStatus.data;
  const scheduledPosts = socialPosts.data?.filter((p: any) => p.platform === "twitter") || [];
  const twitterDrafts = draftPosts.data?.filter((p: any) => p.platform === "twitter") || [];
  const twitterFailed = failedPosts.data?.filter((p: any) => p.platform === "twitter") || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight">X Post Queue</h1>
              <p className="text-muted-foreground text-xs lg:text-sm">
                Drip-publish articles directly to X/Twitter on a timed schedule
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {twitterFailed.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => retryFailed.mutate()}
                disabled={retryFailed.isPending}
              >
                {retryFailed.isPending ? (
                  <Loader2 className="h-4 w-4 sm:mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 sm:mr-1" />
                )}
                <span className="hidden sm:inline">Retry Failed</span>
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs px-1">{twitterFailed.length}</Badge>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                queueStatus.refetch();
                socialPosts.refetch();
                draftPosts.refetch();
                failedPosts.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Credential Status */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-base">API Connection</CardTitle>
            <CardDescription className="text-xs">X/Twitter API credential status</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {queueStatus.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking credentials...
              </div>
            ) : status?.hasCredentials ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>Connected</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>Not connected</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You need to configure your X API credentials. Go to the Settings panel in the Management UI
                  and set <code className="bg-muted px-1 rounded">X_API_KEY</code>, <code className="bg-muted px-1 rounded">X_API_SECRET</code>,
                  <code className="bg-muted px-1 rounded">X_ACCESS_TOKEN</code>, and <code className="bg-muted px-1 rounded">X_ACCESS_TOKEN_SECRET</code>.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue Controls */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-base">Queue Controls</CardTitle>
            <CardDescription className="text-xs">Manage the automated posting schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Row */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                {status?.isRunning ? (
                  <Badge className="bg-green-600">
                    <Play className="h-3 w-3 mr-1" /> Running
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Pause className="h-3 w-3 mr-1" /> Paused
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Posts Today:</span>
                <Badge variant="outline">
                  {status?.postsToday ?? 0} / {status?.dailyLimit ?? 48}
                </Badge>
              </div>
              {status?.lastPostTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Last post: {new Date(status.lastPostTime).toLocaleString()}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {status?.isRunning ? (
                <Button
                  variant="destructive"
                  onClick={() => stopQueue.mutate()}
                  disabled={stopQueue.isPending}
                >
                  {stopQueue.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Pause className="h-4 w-4 mr-1" />}
                  Pause Queue
                </Button>
              ) : (
                <Button
                  onClick={() => startQueue.mutate({ intervalMinutes: parseInt(intervalInput) })}
                  disabled={startQueue.isPending || !status?.hasCredentials}
                >
                  {startQueue.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                  Start Queue
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => postNext.mutate()}
                disabled={postNext.isPending || !status?.hasCredentials}
              >
                {postNext.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <SkipForward className="h-4 w-4 mr-1" />}
                Post Next Now
              </Button>
            </div>

            {/* Interval Setting */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
              <span className="text-sm font-medium whitespace-nowrap">Post every:</span>
              <Select
                value={intervalInput}
                onValueChange={(val) => {
                  setIntervalInput(val);
                  updateInterval.mutate({ minutes: parseInt(val) });
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="360">6 hours</SelectItem>
                  <SelectItem value="720">12 hours</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
              {updateInterval.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {/* Auto-Queue Toggle */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="auto-queue" className="text-sm font-medium cursor-pointer">
                Auto-queue new posts on publish
              </Label>
              <Switch
                id="auto-queue"
                checked={autoQueueSetting.data?.value === "true"}
                onCheckedChange={(checked) => {
                  updateAutoQueue.mutate({
                    key: "x_auto_queue_on_publish",
                    value: checked ? "true" : "false",
                  });
                }}
                disabled={updateAutoQueue.isPending}
              />
              <span className="text-xs text-muted-foreground ml-auto">
                {autoQueueSetting.data?.value === "true" ? "Enabled" : "Disabled"}
              </span>
            </div>

            {/* Daily Limit Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              <AlertTriangle className="h-4 w-4" />
              X Free tier allows ~1,500 posts/month (~48/day). The queue auto-pauses at the daily limit.
            </div>
          </CardContent>
        </Card>

        {/* Queue Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scheduled (In Queue) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    In Queue
                  </CardTitle>
                  <CardDescription>{scheduledPosts.length} posts waiting to be published</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {socialPosts.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : scheduledPosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No posts in queue</p>
                  <p className="text-sm mt-1">Queue draft posts or publish new articles to add to the queue.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {scheduledPosts.map((post: any) => (
                    <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-3">{post.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Article #{post.articleId} · Queued {new Date(post.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-red-600"
                        onClick={() => dequeue.mutate({ postId: post.id })}
                        title="Remove from queue"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Drafts (Available to Queue) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ListPlus className="h-5 w-5" />
                    Draft Posts
                  </CardTitle>
                  <CardDescription>{twitterDrafts.length} X/Twitter drafts available</CardDescription>
                </div>
                {twitterDrafts.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => queueAllDrafts.mutate()}
                    disabled={queueAllDrafts.isPending}
                  >
                    {queueAllDrafts.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <ListPlus className="h-4 w-4 mr-1" />
                    )}
                    Queue All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {draftPosts.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : twitterDrafts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No draft posts</p>
                  <p className="text-sm mt-1">Publish articles to auto-generate social media posts.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {twitterDrafts.map((post: any) => (
                    <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-3">{post.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Article #{post.articleId} · Created {new Date(post.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <RecentPostsCard />
      </div>
    </AdminLayout>
  );
}

function FileIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function RecentPostsCard() {
  const recentPosts = trpc.social.list.useQuery({ status: "posted" });
  const postedPosts = recentPosts.data?.filter((p: any) => p.platform === "twitter").slice(0, 10) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Recently Posted
        </CardTitle>
        <CardDescription>Last 10 tweets posted via the queue</CardDescription>
      </CardHeader>
      <CardContent>
        {recentPosts.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : postedPosts.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No posts have been sent yet.</p>
        ) : (
          <div className="space-y-2">
            {postedPosts.map((post: any) => (
              <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{post.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.attemptedAt && <span className="text-muted-foreground">Attempted {new Date(post.attemptedAt).toLocaleString()} · </span>}
                    <span className="text-green-600">Posted {post.postedAt ? new Date(post.postedAt).toLocaleString() : "recently"}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
