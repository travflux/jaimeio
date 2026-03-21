import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Send, Trash2 } from "lucide-react";

const platforms = ["twitter", "facebook", "linkedin", "instagram", "threads"] as const;

export default function SocialMediaComposer() {
  const { data: publishedArticles } = trpc.articles.list.useQuery({ status: "published", limit: 20 });
  const { data: posts, isLoading: postsLoading } = trpc.social.list.useQuery({});
  const { data: settingsRaw } = trpc.settings.list.useQuery();
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<Record<string, string> | null>(null);
  const utils = trpc.useUtils();

  const settings: Record<string, string> = {};
  if (settingsRaw) {
    for (const s of settingsRaw) settings[s.key] = s.value;
  }

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

  const deleteMut = trpc.social.delete.useMutation({
    onSuccess: () => { utils.social.list.invalidate(); toast.success("Post deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleGenerate = () => {
    if (!selectedArt) return;
    const articleUrl = `${window.location.origin}/article/${selectedArt.slug}?utm_source=x&utm_medium=social&utm_campaign=article-link`;
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

  const draftCount = posts?.filter(p => p.status === "draft").length || 0;

  return (
    <div className="space-y-6">
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
                        {post.status === "draft" && (
                          <button
                            onClick={() => { if (confirm("Delete this post?")) deleteMut.mutate({ id: post.id }); }}
                            className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                            title="Delete post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
