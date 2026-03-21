import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Share2, Sparkles, Loader2, Send, ExternalLink, CheckCircle, AlertTriangle, Zap } from "lucide-react";

const platforms = ["twitter", "facebook", "linkedin", "instagram", "threads"] as const;

export default function AdminSocial() {
  const { data: publishedArticles } = trpc.articles.list.useQuery({ status: "published", limit: 20 });
  const { data: posts, isLoading: postsLoading } = trpc.social.list.useQuery({});
  const { data: settingsRaw } = trpc.settings.list.useQuery();
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<Record<string, string> | null>(null);
  const [sendingToFeedHive, setSendingToFeedHive] = useState(false);
  const [sendingPostId, setSendingPostId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const settings: Record<string, string> = {};
  if (settingsRaw) {
    for (const s of settingsRaw) settings[s.key] = s.value;
  }

  // Check if any FeedHive trigger URL is configured (platform-specific or default)
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
      toast.error("FeedHive trigger URL not configured. Go to Workflow > Social Media to set it up.");
      return;
    }
    // Check if this specific platform has a trigger URL (or default fallback)
    const platformHasTrigger = hasPlatformTrigger(post.platform) || !!settings.feedhive_trigger_url;
    if (!platformHasTrigger) {
      toast.error(`No FeedHive trigger URL configured for ${post.platform}. Go to Workflow > Social Media to set it up.`);
      return;
    }
    setSendingPostId(post.id);
    try {
      // Find the article to get the featured image
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
        body: JSON.stringify({ posts: feedhivePosts }),
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
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Share2 className="w-6 h-6" /> Social Media</h1>
          <p className="text-muted-foreground text-sm">Generate, manage, and distribute social media posts via FeedHive.</p>
        </div>
        {draftCount > 0 && feedHiveConfigured && (
          <Button onClick={handleBulkSendToFeedHive} disabled={sendingToFeedHive}>
            {sendingToFeedHive ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
            Send All Drafts to FeedHive ({draftCount})
          </Button>
        )}
      </div>

      {/* FeedHive Connection Status */}
      <Card className={`mb-6 border-l-4 ${feedHiveConfigured ? "border-l-green-500" : "border-l-amber-500"}`}>
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
                      Set your FeedHive trigger URLs in <span className="font-medium">Workflow &gt; Social Media</span> to enable automatic posting.
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
                <CardDescription>
                  {draftCount > 0 ? `${draftCount} draft${draftCount > 1 ? "s" : ""} ready to send` : "All posts sent"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="text-center py-8">
                <Share2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No social posts yet.</p>
                <p className="text-xs text-muted-foreground">Generate posts from a published article to get started.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {posts.map(p => (
                  <div key={p.id} className="p-3 bg-muted/50 rounded border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {p.platform === "twitter" ? "X (Twitter)" : p.platform}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.status === "posted" ? "bg-green-100 text-green-700" :
                        p.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>{p.status}</span>
                    </div>
                    <p className="text-xs line-clamp-3 whitespace-pre-wrap">{p.content}</p>
                    {p.status === "draft" && (
                      <div className="mt-2 flex items-center gap-2">
                        {feedHiveConfigured && (hasPlatformTrigger(p.platform) || !!settings.feedhive_trigger_url) && (
                          <button
                            onClick={() => handleSendToFeedHive(p)}
                            disabled={sendingPostId === p.id}
                            className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                          >
                            {sendingPostId === p.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            Send to FeedHive
                            {hasPlatformTrigger(p.platform) && <span className="text-[10px] text-green-600 ml-1">({p.platform === "twitter" ? "X" : p.platform})</span>}
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus.mutate({ id: p.id, status: "posted" })}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <CheckCircle className="w-3 h-3" /> Mark Posted
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
