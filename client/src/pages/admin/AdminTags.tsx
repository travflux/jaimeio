import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Hash, Trash2, RefreshCw, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function AdminTags() {
  const utils = trpc.useUtils();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: tags, isLoading } = trpc.tags.list.useQuery({ limit: 200, orderBy: 'count' });
  const { data: cloud } = trpc.tags.cloud.useQuery({ limit: 50 });

  const batchAutoTag = trpc.tags.batchAutoTag.useMutation({
    onSuccess: (result) => {
      toast.success(`Auto-tagging complete: ${result.tagged}/${result.processed} articles tagged.`);
      utils.tags.list.invalidate();
      utils.tags.cloud.invalidate();
    },
    onError: (err) => toast.error(`Auto-tagging failed: ${err.message}`),
  });

  const batchAutoTagAll = trpc.tags.batchAutoTagAll.useMutation({
    onSuccess: (result) => {
      toast.success(`Full tag run complete: ${result.tagged}/${result.processed} articles tagged (${result.total} were untagged).`);
      utils.tags.list.invalidate();
      utils.tags.cloud.invalidate();
    },
    onError: (err) => toast.error(`Full tag run failed: ${err.message}`),
  });

  const recomputeCounts = trpc.tags.recomputeCounts.useMutation({
    onSuccess: () => {
      toast.success('Tag counts updated.');
      utils.tags.list.invalidate();
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const deleteTag = trpc.tags.delete.useMutation({
    onSuccess: () => {
      toast.success('Tag deleted.');
      utils.tags.list.invalidate();
      utils.tags.cloud.invalidate();
      setDeletingId(null);
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`);
      setDeletingId(null);
    },
  });

  const totalTags = tags?.length ?? 0;
  const totalTagged = tags?.reduce((sum, t) => sum + t.articleCount, 0) ?? 0;

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {totalTags} tags · {totalTagged.toLocaleString()} article-tag associations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => recomputeCounts.mutate()}
              disabled={recomputeCounts.isPending}
            >
              {recomputeCounts.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Recount
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => batchAutoTag.mutate({ limit: 100 })}
              disabled={batchAutoTag.isPending || batchAutoTagAll.isPending}
            >
              {batchAutoTag.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Auto-tag (100)
            </Button>
            <Button
              size="sm"
              onClick={() => batchAutoTagAll.mutate()}
              disabled={batchAutoTag.isPending || batchAutoTagAll.isPending}
              title="Tag all untagged published articles (runs until complete)"
            >
              {batchAutoTagAll.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {batchAutoTagAll.isPending ? 'Tagging all…' : 'Tag All Articles'}
            </Button>
          </div>
        </div>

        {/* Tag cloud preview */}
        {cloud && cloud.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tag Cloud Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {cloud.map(tag => (
                  <a
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/70 rounded-full text-xs font-medium transition-colors"
                  >
                    #{tag.name}
                    <span className="text-muted-foreground">({tag.articleCount})</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tag table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !tags || tags.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Hash className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No tags yet.</p>
            <Button onClick={() => batchAutoTag.mutate({ limit: 100 })} disabled={batchAutoTag.isPending}>
              {batchAutoTag.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Auto-tag Published Articles
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tag</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Articles</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tags.map(tag => (
                  <tr key={tag.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">#{tag.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{tag.slug}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={tag.articleCount > 0 ? "secondary" : "outline"} className="text-xs">
                        {tag.articleCount}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/tag/${tag.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="View tag page"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                        <button
                          onClick={() => {
                            setDeletingId(tag.id);
                            deleteTag.mutate({ id: tag.id });
                          }}
                          disabled={deletingId === tag.id}
                          className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                          title="Delete tag"
                        >
                          {deletingId === tag.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
