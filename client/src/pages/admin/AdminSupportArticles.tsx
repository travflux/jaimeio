import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Eye, EyeOff, Save, X, Loader2, BookOpen, ExternalLink } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function AdminSupportArticles() {
  const articlesQuery = trpc.support.list.useQuery();
  const articles = articlesQuery.data ?? [];
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slug: "", title: "", content: "", category: "general", isPublic: true });

  const createMut = trpc.support.create.useMutation({
    onSuccess: () => { toast.success("Article created"); articlesQuery.refetch(); setCreating(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.support.update.useMutation({
    onSuccess: () => { toast.success("Article updated"); articlesQuery.refetch(); setEditing(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.support.delete.useMutation({
    onSuccess: () => { toast.success("Article deleted"); articlesQuery.refetch(); },
  });

  const resetForm = () => setForm({ slug: "", title: "", content: "", category: "general", isPublic: true });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-headline">Support Articles</h1>
            <p className="text-sm text-muted-foreground">Manage help articles for publication setup</p>
          </div>
          <Button onClick={() => { setCreating(true); resetForm(); }}>
            <Plus className="w-4 h-4 mr-2" /> New Article
          </Button>
        </div>

        {(creating || editing) && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{creating ? "Create" : "Edit"} Article</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="Slug (e.g. how-to-get-dalle-api-key)" value={form.slug}
                    onChange={e => set("slug", e.target.value)} disabled={!!editing} />
                  <Input placeholder="Title" value={form.title} onChange={e => set("title", e.target.value)} />
                  <Input placeholder="Category" value={form.category} onChange={e => set("category", e.target.value)} />
                </div>
                <textarea
                  className="w-full min-h-[300px] p-3 border rounded-lg bg-background text-sm font-mono"
                  placeholder="Markdown content..."
                  value={form.content}
                  onChange={e => set("content", e.target.value)}
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isPublic} onChange={e => set("isPublic", e.target.checked)} />
                    Public
                  </label>
                  <div className="flex-1" />
                  <Button variant="ghost" onClick={() => { setCreating(false); setEditing(null); }}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button
                    disabled={createMut.isPending || updateMut.isPending}
                    onClick={() => {
                      if (creating) createMut.mutate(form);
                      else if (editing) updateMut.mutate({ id: editing, title: form.title, content: form.content, category: form.category, isPublic: form.isPublic });
                    }}>
                    <Save className="w-4 h-4 mr-1" /> {creating ? "Create" : "Save"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {articles.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No support articles yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left px-4 py-2.5">Title</th>
                    <th className="text-left px-4 py-2.5">Slug</th>
                    <th className="text-left px-4 py-2.5">Category</th>
                    <th className="text-center px-4 py-2.5">Status</th>
                    <th className="text-right px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a: any) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{a.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.slug}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">{a.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.isPublic ? (
                          <Eye className="w-4 h-4 text-green-600 inline" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground inline" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7" asChild>
                            <a href={"/support/" + a.slug} target="_blank" rel="noopener">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7"
                            onClick={async () => {
                              const full = await (window as any).__trpcClient?.support.getBySlug.query({ slug: a.slug });
                              // Fallback: refetch via query
                              setEditing(a.id);
                              setForm({ slug: a.slug, title: a.title, content: full?.content || "", category: a.category, isPublic: a.isPublic });
                            }}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-destructive"
                            onClick={() => { if (confirm("Delete " + a.title + "?")) deleteMut.mutate({ id: a.id }); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
