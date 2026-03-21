import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Share2, Sparkles, Loader2, Send, ExternalLink, CheckCircle, AlertTriangle, Zap, Trash2 } from "lucide-react";

const platforms = ["twitter", "facebook", "linkedin", "instagram", "threads"] as const;

export default function SocialMediaComposer() {
  const { data: publishedArticles } = trpc.articles.list.useQuery({ status: "published", limit: 20 });
  const { data: posts, isLoading: postsLoading } = trpc.social.list.useQuery({});
  const { data: settingsRaw } = trpc.settings.list.useQuery();
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<Record<string, string> | null>(null);
  const [sendingToFeedHive, setSendingToFeedHive] = useState(false);
  const [sendingPostId, setSendingPostId] = useState<number | null>(null);
  const [useInterval, setUseInterval] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const utils = trpc.useUtils();

  const settings: Record<string, string> = {};
  if (settingsRaw) {
    for (const s of settingsRaw) settings[s.key] = s.value;
  }

  // Check if any FeedHive trigger URL is configured
  const hasPlatformTrigger = (platform: string) => !!settings[`feedhive_trigger_url_${platform}`];
  const hasAnyTrigger = !!settings.feedhive_trigger_url || platforms.some(p => hasPlatformTrigger(p));
  const feedHiveConfigured = hasAnyTrigger;
  const configuredPlatformCount = platforms.filter(p => hasPlatformTrigger(p)).length;
  const selectedArt = publishedArticles?.articles.find(a => a.id === selectedArticle);

  const generatePosts = trpc.ai.generateSocialPosts.useMutation({
    onSuccess: (data) => { setGeneratedPosts(data); toast.success("Social posts generated!"); },
    onError: (e) => toast.error(e.message),
  });

  const bulkCreate = trpc.social.bulkCreate.useMutation({
    onSuccess: () => { utils.social.list.invalidate(); setGeneratedPosts(null); toast.success("Posts saved to queue!"); },
  });

  const updateStatus = trpc.social.updateStatus.useMutation({
    onSuccess: () => { utils.social.list.invalidate(); toast.success("Status updated"); },
  });

  // Delete mutation - to be implemented in backend

  const handleGenerate = () => {
    if (!selectedArt) return;
    const articleUrl = `${window.location.origin}/article/${selectedArt.slug}`;
    generatePosts.mutate({ headline: selectedArt.headline, subheadline: selectedArt.subheadline ?? undefined, slug: selectedArt.slug, articleUrl });
  };

  const handleSavePosts = () => {
    if (!generatedPosts || !selectedArticle) return;
    const postList = platforms.map(p => ({
      articleId: selectedArticle,
      platform: p,
      content: generatedPosts[p] || "",
      status: "draft" as const,
    }));
    bulkCreate.mutate({ posts: postList });
  };

  const handleSendToFeedHive = async (post: { id: number; content: string; articleId: number | null; platform: string }) => {
    if (!feedHiveConfigured) {
      toast.error("FeedHive trigger URL not configured. Check Configuration section below.");
      return;
    }
    const platformHasTrigger = hasPlatformTrigger(post.platform) || !!settings.feedhive_trigger_url;
    if (!platformHasTrigger) {
      toast.error(`No FeedHive trigger URL configured for ${post.platform}.`);
      return;
    }
    setSendingPostId(post.id);
    try {
      const article = publishedArticles?.articles.find(a => a.id === post.articleId);
      const payload: Record<string, any> = { text: post.content, platform: post.platform };
      if (article?.featuredImage && settings.feedhive_include_image !== "false") {
        payload.media_urls = [article.featuredImage];
      }

      const res = await fetch("/api/workflow/feedhive/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "hambry-workflow-default-key",
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Sent to FeedHive (${post.platform})!`);
        updateStatus.mutate({ id: post.id, status: "posted" });
      } else {
        toast.error(`FeedHive error (${post.platform}): ${result.feedhiveResponse || "Unknown error"}`);
      }
    } catch (e: any) {
      toast.error(`Failed to send: ${e.message}`);
    } finally {
      setSendingPostId(null);
    }
  };

  const handleBulkSendToFeedHive = async () => {
    if (!feedHiveConfigured) {
      toast.error("FeedHive trigger URL not configured.");
      return;
    }
    const draftPosts = posts?.filter(p => p.status === "draft") || [];
    if (draftPosts.length === 0) {
      toast.info("No draft posts to send.");
      return;
    }
    setSendingToFeedHive(true);
    try {
      const feedhivePosts = draftPosts.map(p => {
        const article = publishedArticles?.articles.find(a => a.id === p.articleId);
        const payload: Record<string, any> = {
          text: p.content,
          socialPostId: p.id,
          articleId: p.articleId,
          platform: p.platform,
        };
        if (article?.featuredImage && settings.feedhive_include_image !== "false") {
          payload.media_urls = [article.featuredImage];
        }
        return payload;
      });

      const res = await fetch("/api/workflow/feedhive/bulk-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "hambry-workflow-default-key",
        },
        body: JSON.stringify({ 
          posts: feedhivePosts,
          intervalMinutes: useInterval ? intervalMinutes : undefined
        }),
      });
      const result = await res.json();
      if (result.sent > 0) {
        toast.success(`Sent ${result.sent}/${result.total} posts to FeedHive!`);
        utils.social.list.invalidate();
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} posts failed to send.`);
      }
    } catch (e: any) {
      toast.error(`Bulk send failed: ${e.message}`);
    } finally {
      setSendingToFeedHive(false);
    }
  };

  const draftCount = posts?.filter(p => p.status === "draft").length || 0;

  return (
    <div className="space-y-6">
      {/* FeedHive Connection Status */}
      <Card className={`border-l-4 ${feedHiveConfigured ? "border-l-green-500" : "border-l-amber-500"}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {feedHiveConfigured ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">FeedHive Connected</p>
                    <p className="text-xs text-muted-foreground">
                      {configuredPlatformCount > 0
                        ? `${configuredPlatformCount} platform${configuredPlatformCount !== 1 ? "s" : ""} configured${settings.feedhive_trigger_url ? " (+ default fallback)" : ""}.`
                        : "Default trigger URL configured."}
                      {" "}Posts sent as {settings.feedhive_mode === "publish" ? "published posts" : "drafts for review"}.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700">FeedHive Not Connected</p>
                    <p className="text-xs text-muted-foreground">
                      Set your FeedHive trigger URLs in the Configuration section below to enable automatic posting.
                    </p>
                  </div>
                </>
              )}
            </div>
            <a
              href="https://app.feedhive.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Open FeedHive <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Post Composer</CardTitle>
            <CardDescription>Generate AI-powered social media posts from published articles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Select Article</label>
              <select value={selectedArticle ?? ""} onChange={e => setSelectedArticle(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-3 py-2 border border-input rounded text-sm bg-background">
                <option value="">Choose a published article...</option>
                {publishedArticles?.articles.map(a => <option key={a.id} value={a.id}>{a.headline}</option>)}
              </select>
            </div>

            {selectedArt && (
              <div className="p-3 bg-muted/50 rounded border border-border">
                <p className="text-xs text-muted-foreground mb-1">Selected Article</p>
                <p className="text-sm font-medium">{selectedArt.headline}</p>
                {selectedArt.subheadline && <p className="text-xs text-muted-foreground mt-1">{selectedArt.subheadline}</p>}
              </div>
            )}

            <Button onClick={handleGenerate} disabled={!selectedArticle || generatePosts.isPending} className="w-full">
              {generatePosts.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-1" /> Generate Posts for All Platforms</>}
            </Button>

            {generatedPosts && (
              <div className="space-y-3 mt-4">
                {platforms.map(p => (
                  <div key={p} className="p-3 bg-muted rounded border border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {p === "twitter" ? "X (Twitter)" : p}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{generatedPosts[p]}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={handleSavePosts} disabled={bulkCreate.isPending} className="flex-1">
                    {bulkCreate.isPending ? "Saving..." : "Save to Queue"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Post Queue</CardTitle>
                <CardDescription>Manage and distribute social media posts.</CardDescription>
              </div>
              {draftCount > 0 && feedHiveConfigured && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      id="use-interval"
                      checked={useInterval}
                      onChange={(e) => setUseInterval(e.target.checked)}
                      className="w-4 h-4 rounded border-input"
                    />
                    <label htmlFor="use-interval" className="text-muted-foreground cursor-pointer">Interval</label>
                    {useInterval && (
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-input rounded text-sm"
                      />
                    )}
                    {useInterval && <span className="text-xs text-muted-foreground">min</span>}
                  </div>
                  <Button size="sm" onClick={handleBulkSendToFeedHive} disabled={sendingToFeedHive}>
                    {sendingToFeedHive ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                    {useInterval ? `Send ${draftCount} (${intervalMinutes}m apart)` : `Send All (${draftCount})`}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {posts.map(post => (
                  <div key={post.id} className="p-3 bg-muted/50 rounded border border-border">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {post.platform === "twitter" ? "X" : post.platform}
                        </span>
                        <StatusBadge status={post.status} />
                      </div>
                      <div className="flex items-center gap-1">
                        {post.status === "draft" && feedHiveConfigured && (
                          <button
                            onClick={() => handleSendToFeedHive(post)}
                            disabled={sendingPostId === post.id}
                            className="p-1 hover:bg-blue-100 rounded text-blue-600 text-xs"
                            title="Send to FeedHive"
                          >
                            {sendingPostId === post.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          </button>
                        )}
                        {/* Delete button - to be implemented */}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No posts in queue. Generate some above!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    posted: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}
