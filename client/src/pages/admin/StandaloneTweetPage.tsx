import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Zap, Check, X, Trash2, Send, RefreshCw, Settings2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700 border-yellow-300",
  approved: "bg-blue-500/20 text-blue-700 border-blue-300",
  posting: "bg-purple-500/20 text-purple-700 border-purple-300",
  posted: "bg-green-500/20 text-green-700 border-green-300",
  rejected: "bg-gray-500/20 text-gray-600 border-gray-300",
  failed: "bg-red-500/20 text-red-700 border-red-300",
};

export default function StandaloneTweetPage() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "posted" | "rejected" | "failed">("pending");
  const [generateCount, setGenerateCount] = useState(5);

  const { data: tweets = [], isLoading } = trpc.standaloneTweet.list.useQuery({ status: activeTab }, { refetchInterval: 15000 });
  const { data: settings } = trpc.standaloneTweet.getSettings.useQuery();
  const { data: countToday } = trpc.standaloneTweet.countToday.useQuery(undefined, { refetchInterval: 30000 });

  const invalidate = () => {
    utils.standaloneTweet.list.invalidate();
    utils.standaloneTweet.countToday.invalidate();
  };

  const generate = trpc.standaloneTweet.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.generated} tweets`, { description: data.autoApproved > 0 ? `${data.autoApproved} auto-approved` : "Pending review" });
      invalidate();
    },
    onError: (e) => toast.error("Generation failed", { description: e.message }),
  });

  const approve = trpc.standaloneTweet.approve.useMutation({
    onSuccess: () => { toast.success("Tweet approved"); invalidate(); },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const reject = trpc.standaloneTweet.reject.useMutation({
    onSuccess: () => { toast.success("Tweet rejected"); invalidate(); },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const deleteTweet = trpc.standaloneTweet.delete.useMutation({
    onSuccess: () => { toast.success("Tweet deleted"); invalidate(); },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const postNext = trpc.standaloneTweet.postNext.useMutation({
    onSuccess: (data) => {
      if (data.posted > 0) toast.success("Tweet posted successfully!");
      else if (data.skipped > 0) toast("Nothing to post", { description: "No approved tweets in queue" });
      else toast.error("Post failed", { description: data.errors[0] });
      invalidate();
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const saveSettings = trpc.standaloneTweet.saveSettings.useMutation({
    onSuccess: () => { toast.success("Settings saved"); utils.standaloneTweet.getSettings.invalidate(); },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  return (
    <AdminLayout>
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Standalone Tweet Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Punchy satirical jokes generated from recent headlines — no article links, pure brand voice.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold">{countToday?.count ?? 0}</div>
            <div className="text-xs text-muted-foreground">posted today</div>
          </div>
          <Button
            onClick={() => postNext.mutate()}
            disabled={postNext.isPending}
            variant="outline"
            size="sm"
          >
            {postNext.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post Next
          </Button>
          <Button
            onClick={() => generate.mutate({ count: generateCount })}
            disabled={generate.isPending}
            size="sm"
          >
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Generate {generateCount}
          </Button>
        </div>
      </div>

      {/* Settings Card */}
      {settings && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="st-enabled" className="flex flex-col gap-1">
                  <span>Enabled</span>
                  <span className="text-xs text-muted-foreground font-normal">Auto-post on schedule</span>
                </Label>
                <Switch
                  id="st-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(v) => saveSettings.mutate({ enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="st-auto" className="flex flex-col gap-1">
                  <span>Auto-Approve</span>
                  <span className="text-xs text-muted-foreground font-normal">Skip manual review</span>
                </Label>
                <Switch
                  id="st-auto"
                  checked={settings.autoApprove}
                  onCheckedChange={(v) => saveSettings.mutate({ autoApprove: v })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="st-limit" className="flex flex-col gap-1 shrink-0">
                  <span>Daily Limit</span>
                  <span className="text-xs text-muted-foreground font-normal">Max tweets/day</span>
                </Label>
                <Input
                  id="st-limit"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={settings.dailyLimit}
                  className="w-20"
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1 && v <= 50) saveSettings.mutate({ dailyLimit: v });
                  }}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="st-schedule-time" className="flex flex-col gap-1 shrink-0">
                  <span className="text-sm">Schedule Time</span>
                  <span className="text-xs text-muted-foreground font-normal">Daily generation time</span>
                </Label>
                <Input
                  id="st-schedule-time"
                  type="time"
                  defaultValue={settings.scheduleTime}
                  className="w-32"
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (/^\d{2}:\d{2}$/.test(v)) saveSettings.mutate({ scheduleTime: v });
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="st-batch-size" className="flex flex-col gap-1 shrink-0">
                  <span className="text-sm">Batch Size</span>
                  <span className="text-xs text-muted-foreground font-normal">Tweets per run</span>
                </Label>
                <Input
                  id="st-batch-size"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={settings.batchSize}
                  className="w-20"
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1 && v <= 20) saveSettings.mutate({ batchSize: v });
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tweet Queue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tweet Queue</CardTitle>
          <CardDescription>Review, approve, or reject generated tweets before they post.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="posted">Posted</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            {(["pending", "approved", "posted", "rejected", "failed"] as const).map((tab) => (
              <TabsContent key={tab} value={tab}>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tweets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No {tab} tweets.
                    {tab === "pending" && (
                      <div className="mt-2">
                        <Button variant="outline" size="sm" onClick={() => generate.mutate({ count: generateCount })}>
                          <Zap className="h-3 w-3 mr-1" /> Generate some now
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tweets.map((tweet) => (
                      <div key={tweet.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-relaxed flex-1">{tweet.content}</p>
                          <Badge className={`shrink-0 text-xs border ${STATUS_COLORS[tweet.status] ?? ""}`} variant="outline">
                            {tweet.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(tweet.createdAt).toLocaleString()}
                            {tweet.tweetUrl && (
                              <a href={tweet.tweetUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline">
                                View on X
                              </a>
                            )}
                          </span>
                          <div className="flex gap-2">
                            {tweet.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-green-600 border-green-300 hover:bg-green-50"
                                  onClick={() => approve.mutate({ id: tweet.id })} disabled={approve.isPending}>
                                  <Check className="h-3 w-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => reject.mutate({ id: tweet.id })} disabled={reject.isPending}>
                                  <X className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {tweet.status === "approved" && (
                              <Button size="sm" variant="outline" className="h-7 px-2"
                                onClick={() => postNext.mutate()} disabled={postNext.isPending}>
                                <Send className="h-3 w-3 mr-1" /> Post Now
                              </Button>
                            )}
                            {tweet.status === "rejected" && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                                onClick={() => approve.mutate({ id: tweet.id })} disabled={approve.isPending}>
                                <RefreshCw className="h-3 w-3 mr-1" /> Re-approve
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-red-600"
                              onClick={() => deleteTweet.mutate({ id: tweet.id })} disabled={deleteTweet.isPending}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
