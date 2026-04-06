import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Send, Eye, Video, ImagePlus, FileText, AlertCircle } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";


function TagBadge({ articleId, tag, label, activeColor, isActive }: { articleId: number; tag: string; label: string; activeColor: string; isActive: boolean }) {
  const utils = trpc.useUtils();
  const toggle = trpc.articles.toggleTag.useMutation({
    onSuccess: () => utils.articles.list.invalidate(),
  });
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle.mutate({ articleId, tag: tag as any }); }}
      title={"Click to " + (isActive ? "unmark" : "mark") + " as " + label}
      className={"inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors " + (isActive ? activeColor : "bg-muted text-muted-foreground/50 hover:bg-muted/80")}
      style={{ fontSize: 10 }}
    >
      {label}
    </button>
  );
}

const statusOptions = ["all", "draft", "pending", "approved", "published", "rejected"];

export default function AdminArticles() {
  const searchParams = useSearch();
  const urlStatus = new URLSearchParams(searchParams).get("status");
  const [statusFilter, setStatusFilter] = useState(urlStatus || "all");
  const [noImageFilter, setNoImageFilter] = useState(false);
  const [missingGeo, setMissingGeo] = useState(false);
  const [missingImage, setMissingImage] = useState(false);
  const [search, setSearch] = useState("");
  
  // Update filter when URL changes
  useEffect(() => {
    if (urlStatus && statusOptions.includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
  }, [urlStatus]);
  const { data, isLoading } = trpc.articles.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    noImage: noImageFilter || undefined,
    missingGeo: missingGeo || undefined,
    missingImage: missingImage || undefined,
    limit: 200,
  });
  const utils = trpc.useUtils();
  const updateStatus = trpc.articles.updateStatus.useMutation({
    onSuccess: () => { utils.articles.list.invalidate(); utils.articles.stats.invalidate(); toast.success("Status updated"); },
  });
  const deleteArticle = trpc.articles.delete.useMutation({
    onSuccess: () => { utils.articles.list.invalidate(); utils.articles.stats.invalidate(); toast.success("Article deleted"); },
  });
  const regenerateVideo = trpc.articles.regenerateVideo.useMutation({
    onSuccess: () => { utils.articles.list.invalidate(); toast.success("Video regenerated!"); },
    onError: (e) => toast.error(`Video regeneration failed: ${e.message}`),
  });
  const { data: missingImagesData } = trpc.articles.missingImages.useQuery(undefined, {
    staleTime: 30_000,
  });
  const missingCount = missingImagesData?.length ?? 0;

  const backfillImages = trpc.ai.backfillMissingImages.useMutation({
    onSuccess: (results) => { 
      utils.articles.list.invalidate();
      if (results.started) {
        toast.success(`Backfill started for ${results.total} articles — check the Media tab for progress`);
      } else {
        toast.info(results.message || "Backfill complete");
      }
    },
    onError: (e) => toast.error(`Backfill failed: ${e.message}`),
  });

  const articles = data?.articles ?? [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Articles</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-muted-foreground text-xs lg:text-sm">{data?.total ?? 0} total articles</p>
              {missingCount > 0 && (
                <Link href="/admin/settings/images">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition-colors cursor-pointer">
                    <AlertCircle className="w-3 h-3" />
                    {missingCount} missing {missingCount === 1 ? "image" : "images"}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => backfillImages.mutate()}
            disabled={backfillImages.isPending}
          >
            <ImagePlus className="w-4 h-4 mr-1" /> 
            <span className="hidden sm:inline">{backfillImages.isPending ? "Generating..." : "Backfill Images"}</span>
            <span className="sm:hidden">Images</span>
          </Button>
          <Link href="/admin/articles/new">
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">New Article</span><span className="sm:hidden">New</span></Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setNoImageFilter(false); }} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${statusFilter === s && !noImageFilter ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border hover:bg-accent hover:border-transparent"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button
            onClick={() => { setNoImageFilter(v => !v); if (!noImageFilter) setStatusFilter("all"); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
              noImageFilter
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-card border border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
            }`}
          >
            <ImagePlus className="w-3 h-3" />
            No Image{missingCount > 0 && !noImageFilter ? ` (${missingCount})` : ""}
          </button>
          <button
            onClick={() => { setMissingGeo(v => !v); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
              missingGeo
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-card border border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
            }`}
          >
            Missing GEO
          </button>
          <button
            onClick={() => { setMissingImage(v => !v); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
              missingImage
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-card border border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
            }`}
          >
            Missing Image
          </button>
        </div>
        <input type="text" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} className="sm:ml-auto px-3 py-2 text-sm border border-input rounded-lg bg-background w-full sm:w-56 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
      </div>

      {/* Desktop table view */}
      <Card className="hidden lg:block overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Headline</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Batch</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">Views</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map(a => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/admin/articles/${a.id}`} className="font-medium hover:text-primary line-clamp-1 transition-colors">{a.headline}</Link>
                      <div className="flex items-center gap-1 mt-1">
                        <TagBadge articleId={a.id} tag="editors_pick" label="Editor's Pick" activeColor="bg-teal-100 text-teal-700" isActive={(a as any).isEditorsPick} />
                        <TagBadge articleId={a.id} tag="trending" label="Trending" activeColor="bg-orange-100 text-orange-700" isActive={(a as any).isTrending} />
                        <TagBadge articleId={a.id} tag="featured" label="Featured" activeColor="bg-purple-100 text-purple-700" isActive={(a as any).isFeatured} />
                        <span className="text-[11px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={a.status} variant="article" /></td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{a.batchDate || "—"}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{a.views}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === "pending" && (
                          <>
                            <button onClick={() => updateStatus.mutate({ id: a.id, status: "approved" })} className="p-1.5 hover:bg-green-100 rounded text-green-600" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => updateStatus.mutate({ id: a.id, status: "rejected" })} className="p-1.5 hover:bg-red-100 rounded text-red-600" title="Reject"><XCircle className="w-4 h-4" /></button>
                          </>
                        )}
                        {a.status === "approved" && (
                          <button onClick={() => updateStatus.mutate({ id: a.id, status: "published" })} className="p-1.5 hover:bg-blue-100 rounded text-blue-600" title="Publish"><Send className="w-4 h-4" /></button>
                        )}
                        {a.videoUrl && (
                          <button 
                            onClick={() => { if (confirm("Regenerate video for this article?")) regenerateVideo.mutate({ id: a.id }); }} 
                            className="p-1.5 hover:bg-purple-100 rounded text-purple-600" 
                            title="Regenerate Video"
                            disabled={regenerateVideo.isPending}
                          >
                            <Video className="w-4 h-4" />
                          </button>
                        )}
                        <Link href={`/admin/articles/${a.id}`}><button className="p-1.5 hover:bg-accent rounded"><Pencil className="w-4 h-4" /></button></Link>
                        <button onClick={() => { if (confirm("Delete this article?")) deleteArticle.mutate({ id: a.id }); }} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {articles.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No articles found.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile card view */}
      <div className="lg:hidden space-y-3">
        {articles.map(a => (
          <Card key={a.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Link href={`/admin/articles/${a.id}`} className="font-medium text-sm hover:text-primary leading-snug flex-1">
                  {a.headline}
                </Link>
                <StatusBadge status={a.status} />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                {a.batchDate && <span>Batch: {a.batchDate}</span>}
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {a.views}</span>
              </div>
              <div className="flex items-center gap-2 border-t border-border pt-3">
                {a.status === "pending" && (
                  <>
                    <Button size="sm" variant="outline" className="flex-1 text-green-600 border-green-200 hover:bg-green-50" onClick={() => updateStatus.mutate({ id: a.id, status: "approved" })}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus.mutate({ id: a.id, status: "rejected" })}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
                {a.status === "approved" && (
                  <Button size="sm" variant="outline" className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => updateStatus.mutate({ id: a.id, status: "published" })}>
                    <Send className="w-4 h-4 mr-1" /> Publish
                  </Button>
                )}
                {a.videoUrl && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-purple-600 border-purple-200 hover:bg-purple-50 px-2.5" 
                    onClick={() => { if (confirm("Regenerate video for this article?")) regenerateVideo.mutate({ id: a.id }); }}
                    disabled={regenerateVideo.isPending}
                    title="Regenerate Video"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                )}
                <Link href={`/admin/articles/${a.id}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 px-2.5" onClick={() => { if (confirm("Delete this article?")) deleteArticle.mutate({ id: a.id }); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {articles.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">No articles found.</div>
        )}
      </div>
    </AdminLayout>
  );
}

