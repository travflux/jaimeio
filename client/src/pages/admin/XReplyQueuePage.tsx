import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  MessageSquareReply, Play, RefreshCw, CheckCircle2, XCircle,
  Clock, AlertTriangle, Loader2, ExternalLink, Edit2, Check, X, SkipForward,
  Quote, Reply, Users, BadgeCheck, Filter
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ReplyStatus = "pending" | "approved" | "posted" | "failed" | "skipped";
type ReplyMode = "reply" | "quote_tweet";

const STATUS_CONFIG: Record<ReplyStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  posted: { label: "Posted", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Failed", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="w-3 h-3" /> },
  skipped: { label: "Skipped", color: "bg-gray-100 text-gray-600 border-gray-200", icon: <SkipForward className="w-3 h-3" /> },
};

const VERIFIED_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  blue: { label: "Blue ✓", color: "bg-blue-100 text-blue-700 border-blue-200" },
  business: { label: "Business ✓", color: "bg-amber-100 text-amber-700 border-amber-200" },
  government: { label: "Gov ✓", color: "bg-purple-100 text-purple-700 border-purple-200" },
  none: { label: "Unverified", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function ReplyCard({ reply, onRefetch }: { reply: any; onRefetch: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.replyContent || "");

  const updateStatus = trpc.xReply.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateContent = trpc.xReply.updateContent.useMutation({
    onSuccess: () => { toast.success("Reply content updated"); setEditing(false); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });

  const status = reply.status as ReplyStatus;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const tweetUrl = `https://x.com/i/web/status/${reply.tweetId}`;
  const charCount = editContent.length;
  const isQuoteTweet = reply.replyMode === "quote_tweet";
  const verifiedInfo = VERIFIED_TYPE_LABELS[reply.tweetVerifiedType || "none"] || VERIFIED_TYPE_LABELS.none;

  return (
    <Card className="border border-border/60">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </Badge>
            {/* Mode badge */}
            <Badge variant="outline" className={`text-xs flex items-center gap-1 ${isQuoteTweet ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
              {isQuoteTweet ? <Quote className="w-3 h-3" /> : <Reply className="w-3 h-3" />}
              {isQuoteTweet ? "Quote Tweet" : "Reply"}
            </Badge>
            {reply.keyword && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                🔑 {reply.keyword}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground text-right space-y-0.5">
            <div title="Generated at">📝 {new Date(reply.createdAt).toLocaleString()}</div>
            {reply.attemptedAt && (
              <div title="Last attempt at" className={reply.status === "failed" ? "text-red-500" : ""}>
                🕐 {new Date(reply.attemptedAt).toLocaleString()}
              </div>
            )}
            {reply.postedAt && (
              <div title="Posted at" className="text-green-600">
                ✅ {new Date(reply.postedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Original tweet */}
        <div className="bg-muted/40 rounded-md p-3 text-sm space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">@{reply.tweetAuthorHandle}</span>
              {/* Follower count */}
              {(reply.tweetFollowers ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> {formatFollowers(reply.tweetFollowers)}
                </span>
              )}
              {/* Verified badge */}
              {reply.tweetVerifiedType && reply.tweetVerifiedType !== "none" && (
                <Badge variant="outline" className={`text-xs flex items-center gap-1 ${verifiedInfo.color}`}>
                  <BadgeCheck className="w-3 h-3" /> {verifiedInfo.label}
                </Badge>
              )}
            </div>
            <a href={tweetUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View tweet <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-muted-foreground line-clamp-3">{reply.tweetText}</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>❤️ {reply.tweetLikes?.toLocaleString()}</span>
            <span>🔁 {reply.tweetRetweets?.toLocaleString()}</span>
          </div>
        </div>

        {/* Reply content */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isQuoteTweet ? "Quote Tweet" : "Reply"}
            </span>
            {!editing && status !== "posted" && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setEditContent(reply.replyContent || ""); setEditing(true); }}>
                <Edit2 className="w-3 h-3 mr-1" /> Edit
              </Button>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="text-sm min-h-[80px] resize-none"
                maxLength={280}
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs ${charCount > 260 ? "text-red-500" : "text-muted-foreground"}`}>
                  {charCount}/280
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                  <Button size="sm" className="h-7 px-3 text-xs" onClick={() => updateContent.mutate({ id: reply.id, replyContent: editContent })}
                    disabled={updateContent.isPending || charCount === 0 || charCount > 280}>
                    {updateContent.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className={`text-sm rounded-md p-3 ${isQuoteTweet ? "bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800" : "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"}`}>
              {reply.replyContent || <span className="text-muted-foreground italic">No reply generated</span>}
            </p>
          )}
        </div>

        {/* Article link */}
        {reply.articleHeadline && (
          <div className="text-xs text-muted-foreground">
            📰 Linked article: <span className="font-medium">{reply.articleHeadline}</span>
          </div>
        )}

        {/* Error message */}
        {reply.errorMessage && (
          <div className="text-xs text-red-600 bg-red-50 rounded p-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {reply.errorMessage}
          </div>
        )}

        {/* Posted tweet link */}
        {reply.postedTweetId && (
          <a href={`https://x.com/i/web/status/${reply.postedTweetId}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-green-600 hover:underline flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> View posted {isQuoteTweet ? "quote tweet" : "reply"} on X
          </a>
        )}

        {/* Actions */}
        {status !== "posted" && (
          <div className="flex gap-2 flex-wrap pt-1">
            {status === "failed" && (
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => updateStatus.mutate({ id: reply.id, status: "pending" })}
                disabled={updateStatus.isPending}>
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            )}
            {status !== "skipped" && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-muted-foreground"
                onClick={() => updateStatus.mutate({ id: reply.id, status: "skipped" })}
                disabled={updateStatus.isPending}>
                <SkipForward className="w-3 h-3 mr-1" /> Skip
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function XReplyQueuePage() {
  const [activeTab, setActiveTab] = useState("all");
  const [intervalInput, setIntervalInput] = useState("120");
  const [minFollowersInput, setMinFollowersInput] = useState("1000");
  const [maxFollowersInput, setMaxFollowersInput] = useState("4999");
  const [maxEngagementsInput, setMaxEngagementsInput] = useState("2");
  const [maxFailedQueueInput, setMaxFailedQueueInput] = useState("50");
  const [maxPostedQueueInput, setMaxPostedQueueInput] = useState("100");
  const [maxPendingQueueInput, setMaxPendingQueueInput] = useState("50");
  const [linkProbabilityInput, setLinkProbabilityInput] = useState("50");
  const [autoIntervalHoursInput, setAutoIntervalHoursInput] = useState("4");

  const replies = trpc.xReply.list.useQuery(
    { limit: 100 },
    { refetchInterval: 30000 }
  );
  const settings = trpc.xReply.getSettings.useQuery();
  const todayCount = trpc.xReply.getTodayCount.useQuery(undefined, { refetchInterval: 30000 });

  const updateSettings = trpc.xReply.updateSettings.useMutation({
    onSuccess: () => { toast.success("Settings saved"); settings.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (settings.data?.intervalMinutes) {
      setIntervalInput(String(settings.data.intervalMinutes));
    }
    if (settings.data?.minFollowers !== undefined) {
      setMinFollowersInput(String(settings.data.minFollowers));
    }
    if (settings.data?.maxFollowers !== undefined) {
      setMaxFollowersInput(String(settings.data.maxFollowers));
    }
    if (settings.data?.maxEngagementsPerUser !== undefined) {
      setMaxEngagementsInput(String(settings.data.maxEngagementsPerUser));
    }
    if (settings.data?.maxFailedQueue !== undefined) setMaxFailedQueueInput(String(settings.data.maxFailedQueue));
    if (settings.data?.maxPostedQueue !== undefined) setMaxPostedQueueInput(String(settings.data.maxPostedQueue));
    if (settings.data?.maxPendingQueue !== undefined) setMaxPendingQueueInput(String(settings.data.maxPendingQueue));
  }, [settings.data?.intervalMinutes, settings.data?.minFollowers, settings.data?.maxFollowers, settings.data?.maxEngagementsPerUser, settings.data?.maxFailedQueue, settings.data?.maxPostedQueue, settings.data?.maxPendingQueue]);

  const linkProbabilityQuery = trpc.xReply.getLinkProbability.useQuery();
  const setLinkProbability = trpc.xReply.setLinkProbability.useMutation({
    onSuccess: () => { toast.success("Link probability saved"); linkProbabilityQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const autoIntervalQuery = trpc.xReply.getAutoIntervalHours.useQuery();
  const setAutoIntervalHours = trpc.xReply.setAutoIntervalHours.useMutation({
    onSuccess: () => { toast.success("Auto-run interval saved & scheduler restarted"); autoIntervalQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const purgeFailedQueue = trpc.xReply.purgeFailedQueue.useMutation({
    onSuccess: (data) => { toast.success(`Purged ${data.deleted} failed ${data.deleted === 1 ? 'reply' : 'replies'}`); replies.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  useEffect(() => {
    if (linkProbabilityQuery.data?.value !== undefined) setLinkProbabilityInput(String(linkProbabilityQuery.data.value));
  }, [linkProbabilityQuery.data?.value]);
  useEffect(() => {
    if (autoIntervalQuery.data?.value !== undefined) setAutoIntervalHoursInput(String(autoIntervalQuery.data.value));
  }, [autoIntervalQuery.data?.value]);
  const postNextReply = trpc.xReply.postNextReply.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Reply posted to X!");
      } else {
        // Simplify common Twitter error messages
        const raw = data.error || "Unknown error";
        const friendly = raw.includes("not allowed") || raw.includes("403")
          ? "Twitter blocked this reply. Try switching to Mentions mode in Settings."
          : raw.includes("daily limit") || raw.includes("Daily limit")
          ? "Daily post limit reached. Check your limit in Settings."
          : raw.includes("No pending") || raw.includes("no pending")
          ? "No replies are queued. Run a Full Cycle first to generate some."
          : raw.includes("credentials") || raw.includes("401")
          ? "X credentials are missing or expired. Check Settings > X Credentials."
          : "Could not post reply. Check the Failed tab for details.";
        toast.error(friendly);
      }
      replies.refetch();
      todayCount.refetch();
    },
    onError: (e) => toast.error("Something went wrong. Try again."),
  });
  const triggerCycle = trpc.xReply.triggerCycle.useMutation({
    onSuccess: (data) => {
      if (data.repliesPosted > 0) {
        toast.success(`Posted ${data.repliesPosted} ${data.repliesPosted === 1 ? "reply" : "replies"} to X.`);
      } else if (data.repliesGenerated > 0) {
        toast.info(`Generated ${data.repliesGenerated} ${data.repliesGenerated === 1 ? "reply" : "replies"} — ready to post.`);
      } else if (data.error) {
        // Simplify common error messages
        const raw = data.error;
        const friendly = raw.includes("not allowed") || raw.includes("403")
          ? "Twitter blocked posting. Try switching to Mentions mode in Settings."
          : raw.includes("daily limit") || raw.includes("Daily limit")
          ? "Daily post limit reached for today."
          : raw.includes("disabled") || raw.includes("Disabled")
          ? "Auto-engagement is turned off. Enable it in Settings."
          : raw.includes("credentials") || raw.includes("401")
          ? "X credentials are missing or expired. Check Settings > X Credentials."
          : raw.includes("No mentions") || raw.includes("no mentions")
          ? "No new mentions to reply to right now."
          : raw.includes("No tweets") || raw.includes("no tweets")
          ? "No matching tweets found for current keywords."
          : "Cycle ran — nothing to post right now.";
        toast.info(friendly);
      } else {
        toast.info("Cycle ran — nothing to post right now.");
      }
      replies.refetch();
      todayCount.refetch();
    },
    onError: (e) => toast.error("Something went wrong. Try again."),
  });

  const allReplies = replies.data || [];
  const filteredReplies = activeTab === "all" ? allReplies : allReplies.filter(r => r.status === activeTab);

  const counts = {
    all: allReplies.length,
    pending: allReplies.filter(r => r.status === "pending").length,
    posted: allReplies.filter(r => r.status === "posted").length,
    failed: allReplies.filter(r => r.status === "failed").length,
    skipped: allReplies.filter(r => r.status === "skipped").length,
  };

  const currentMode = settings.data?.mode ?? "quote_tweet";

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquareReply className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight">X Engagement Queue</h1>
              <p className="text-muted-foreground text-xs lg:text-sm mt-0.5">
                Auto-engage with trending tweets using article keywords
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right text-sm">
              <div className="font-medium">{todayCount.data ?? 0} / {settings.data?.dailyLimit ?? 10}</div>
              <div className="text-muted-foreground text-xs">posts today</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => postNextReply.mutate()}
              disabled={postNextReply.isPending}
              title="Post the next pending reply immediately (no new search/generation)"
            >
              {postNextReply.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <SkipForward className="w-4 h-4 mr-1" />}
              Reply Next Now
            </Button>
            <Button onClick={() => triggerCycle.mutate()} disabled={triggerCycle.isPending} size="sm">
              {triggerCycle.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              Run Full Cycle
            </Button>
          </div>
        </div>

        {/* Settings Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Settings</CardTitle>
            <CardDescription>Control how the auto-engagement engine operates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading settings...
              </div>
            ) : (
              <>
                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto-Engagement Enabled</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Automatically search for and engage with relevant tweets
                    </p>
                  </div>
                  <Switch
                    checked={settings.data?.enabled ?? false}
                    onCheckedChange={(v) => updateSettings.mutate({ enabled: v })}
                    disabled={updateSettings.isPending}
                  />
                </div>

                {/* ── Source selector ── */}
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-2">
                    Engagement Source
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    <strong>Keyword Search</strong> finds trending public tweets matching your articles (requires paid API tier to reply). <strong>Mentions</strong> replies to accounts that tag your brand handle — works on Free tier.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => updateSettings.mutate({ source: "keyword_search" })}
                      disabled={updateSettings.isPending}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 text-sm transition-all ${
                        (settings.data?.source ?? "keyword_search") === "keyword_search"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                          : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                      }`}
                    >
                      <Filter className="w-5 h-5" />
                      <div className="text-center">
                        <div className="font-medium">Keyword Search</div>
                        <div className="text-xs opacity-75">Requires paid API tier</div>
                      </div>
                    </button>
                    <button
                      onClick={() => updateSettings.mutate({ source: "mentions" })}
                      disabled={updateSettings.isPending}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 text-sm transition-all ${
                        settings.data?.source === "mentions"
                          ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                          : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                      }`}
                    >
                      <MessageSquareReply className="w-5 h-5" />
                      <div className="text-center">
                        <div className="font-medium">Mentions</div>
                        <div className="text-xs opacity-75">Works on Free tier ✓</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* ── Mode selector ── */}
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-2">
                    Engagement Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Quote tweets are publicly visible and not blocked by Twitter's anti-spam system. Replies may be blocked for low-engagement accounts.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => updateSettings.mutate({ mode: "quote_tweet" })}
                      disabled={updateSettings.isPending}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 text-sm transition-all ${
                        currentMode === "quote_tweet"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                          : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                      }`}
                    >
                      <Quote className="w-5 h-5" />
                      <div className="text-center">
                        <div className="font-medium">Quote Tweet</div>
                        <div className="text-xs opacity-75">Recommended — not blocked</div>
                      </div>
                    </button>
                    <button
                      onClick={() => updateSettings.mutate({ mode: "reply" })}
                      disabled={updateSettings.isPending}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 text-sm transition-all ${
                        currentMode === "reply"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300"
                          : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                      }`}
                    >
                      <Reply className="w-5 h-5" />
                      <div className="text-center">
                        <div className="font-medium">Reply</div>
                        <div className="text-xs opacity-75">May be blocked by Twitter</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* ── Follower filters ── */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Label className="font-medium">Author Filters</Label>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Only engage with tweets from accounts within these parameters. Helps target relevant audiences and avoid anti-spam triggers.
                  </p>

                  {/* Min / Max followers — numeric inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Min Followers
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          className="w-full h-8 text-sm"
                          value={minFollowersInput}
                          min={0}
                          onChange={e => setMinFollowersInput(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => { const v = parseInt(minFollowersInput, 10); if (!isNaN(v)) updateSettings.mutate({ minFollowers: v }); }}
                          disabled={updateSettings.isPending}
                        >
                          {updateSettings.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">0 = no minimum</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Max Followers
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          className="w-full h-8 text-sm"
                          value={maxFollowersInput}
                          min={0}
                          onChange={e => setMaxFollowersInput(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => { const v = parseInt(maxFollowersInput, 10); if (!isNaN(v)) updateSettings.mutate({ maxFollowers: v }); }}
                          disabled={updateSettings.isPending}
                        >
                          {updateSettings.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">0 = no maximum</p>
                    </div>
                  </div>

                  {/* Max engagements per user */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-sm flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Max Engagements Per User
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        className="w-full h-8 text-sm"
                        value={maxEngagementsInput}
                        min={1}
                        max={100}
                        onChange={e => setMaxEngagementsInput(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => { const v = parseInt(maxEngagementsInput, 10); if (!isNaN(v) && v >= 1) updateSettings.mutate({ maxEngagementsPerUser: v }); }}
                        disabled={updateSettings.isPending}
                      >
                        {updateSettings.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Max times to reply to the same user. Default: 2</p>
                  </div>

                  {/* Verified only */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <Label className="text-sm flex items-center gap-1.5">
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified Accounts Only
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Only engage with blue ✓, business ✓, or government ✓ verified accounts
                      </p>
                    </div>
                    <Switch
                      checked={settings.data?.verifiedOnly ?? false}
                      onCheckedChange={(v) => updateSettings.mutate({ verifiedOnly: v })}
                      disabled={updateSettings.isPending}
                    />
                  </div>
                </div>

                {/* Daily limit */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Daily Post Limit</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                      {settings.data?.dailyLimit ?? 10} posts/day
                    </span>
                  </div>
                  <Slider
                    min={1} max={50} step={1}
                    value={[settings.data?.dailyLimit ?? 10]}
                    onValueChange={([v]) => updateSettings.mutate({ dailyLimit: v })}
                    disabled={updateSettings.isPending}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span><span>Conservative: 10</span><span>Aggressive: 50</span>
                  </div>
                </div>

                {/* Interval */}
                <div className="space-y-2">
                  <Label className="font-medium">Run Interval</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      value={intervalInput}
                      onChange={(e) => setIntervalInput(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSettings.mutate({ intervalMinutes: parseInt(intervalInput) })}
                      disabled={updateSettings.isPending}
                    >
                      {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">How often the reply engine searches for new tweets to engage with.</p>
                </div>

                {/* Queue Size Limits */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Queue Size Limits</Label>
                  <p className="text-xs text-muted-foreground">Older entries beyond these limits are automatically pruned at the end of each cycle.</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-28 text-muted-foreground">Max Failed</span>
                      <Input
                        type="number" min={1} max={500}
                        value={maxFailedQueueInput}
                        onChange={(e) => setMaxFailedQueueInput(e.target.value)}
                        className="w-20"
                      />
                      <Button variant="outline" size="sm"
                        onClick={() => { const v = parseInt(maxFailedQueueInput, 10); if (!isNaN(v) && v >= 1) updateSettings.mutate({ maxFailedQueue: v }); }}
                        disabled={updateSettings.isPending}
                      >Set</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-28 text-muted-foreground">Max Posted</span>
                      <Input
                        type="number" min={1} max={1000}
                        value={maxPostedQueueInput}
                        onChange={(e) => setMaxPostedQueueInput(e.target.value)}
                        className="w-20"
                      />
                      <Button variant="outline" size="sm"
                        onClick={() => { const v = parseInt(maxPostedQueueInput, 10); if (!isNaN(v) && v >= 1) updateSettings.mutate({ maxPostedQueue: v }); }}
                        disabled={updateSettings.isPending}
                      >Set</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-28 text-muted-foreground">Max Pending</span>
                      <Input
                        type="number" min={1} max={500}
                        value={maxPendingQueueInput}
                        onChange={(e) => setMaxPendingQueueInput(e.target.value)}
                        className="w-20"
                      />
                      <Button variant="outline" size="sm"
                        onClick={() => { const v = parseInt(maxPendingQueueInput, 10); if (!isNaN(v) && v >= 1) updateSettings.mutate({ maxPendingQueue: v }); }}
                        disabled={updateSettings.isPending}
                      >Set</Button>
                    </div>
                  </div>
                </div>

                {/* Reply Content & Auto-Run */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Reply Content</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Article Link Probability</span>
                      <span className="text-sm font-medium">{linkProbabilityInput}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={0} max={100} step={5}
                        value={linkProbabilityInput}
                        onChange={(e) => setLinkProbabilityInput(e.target.value)}
                        className="flex-1 accent-primary"
                      />
                      <Button variant="outline" size="sm"
                        onClick={() => { const v = parseInt(linkProbabilityInput, 10); if (!isNaN(v)) setLinkProbability.mutate({ value: v }); }}
                        disabled={setLinkProbability.isPending}
                      >{setLinkProbability.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">0% = all replies are pure engagement (no links). 100% = all replies include an article link. 50% = mix.</p>
                  </div>
                </div>

                {/* Auto-Run Interval */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Auto-Run Schedule</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-28">Every (hours)</span>
                    <Input
                      type="number" min={1} max={24}
                      value={autoIntervalHoursInput}
                      onChange={(e) => setAutoIntervalHoursInput(e.target.value)}
                      className="w-20"
                    />
                    <Button variant="outline" size="sm"
                      onClick={() => { const v = parseInt(autoIntervalHoursInput, 10); if (!isNaN(v) && v >= 1 && v <= 24) setAutoIntervalHours.mutate({ value: v }); }}
                      disabled={setAutoIntervalHours.isPending}
                    >{setAutoIntervalHours.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">The engine automatically checks for new mentions and replies on this schedule. Default: every 4 hours.</p>
                </div>

                {/* Danger Zone */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Danger Zone</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => { if (confirm("Permanently delete all failed replies? This cannot be undone.")) purgeFailedQueue.mutate(); }}
                      disabled={purgeFailedQueue.isPending}
                    >
                      {purgeFailedQueue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purge Failed Queue"}
                    </Button>
                    <span className="text-xs text-muted-foreground">Permanently deletes all failed replies from the queue.</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Reply Queue */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="all" className="flex-shrink-0">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="pending" className="flex-shrink-0">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="posted" className="flex-shrink-0">Posted ({counts.posted})</TabsTrigger>
              <TabsTrigger value="failed" className="flex-shrink-0">Failed ({counts.failed})</TabsTrigger>
              <TabsTrigger value="skipped" className="flex-shrink-0">Skipped ({counts.skipped})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {replies.isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading queue...
                </div>
              ) : filteredReplies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquareReply className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No posts yet</p>
                  <p className="text-sm mt-1">Click "Run Now" to start the first cycle</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredReplies.map(reply => (
                    <ReplyCard key={reply.id} reply={reply} onRefetch={replies.refetch} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
}
