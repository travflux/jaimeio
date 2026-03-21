import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check, FolderOpen } from "lucide-react";

export default function AdminCategories() {
  const { data: cats } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", color: "#6366f1" });
  const [showNew, setShowNew] = useState(false);

  const createCat = trpc.categories.create.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); setShowNew(false); setForm({ name: "", slug: "", description: "", color: "#6366f1" }); toast.success("Category created"); },
  });
  const updateCat = trpc.categories.update.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); setEditing(null); toast.success("Category updated"); },
  });
  const deleteCat = trpc.categories.delete.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("Category deleted"); },
  });

  const startEdit = (cat: NonNullable<typeof cats>[0]) => {
    setEditing(cat.id);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? "", color: cat.color ?? "#6366f1" });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground text-sm">Manage article categories.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="shadow-sm"><Plus className="w-4 h-4 mr-1" /> New Category</Button>
      </div>

      {showNew && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input type="text" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") }))} className="px-3 py-2 border border-input rounded text-sm bg-background" />
              <input type="text" placeholder="Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="px-3 py-2 border border-input rounded text-sm bg-background" />
              <input type="text" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="px-3 py-2 border border-input rounded text-sm bg-background" />
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded border border-input cursor-pointer" />
                <Button size="sm" onClick={() => createCat.mutate(form)} disabled={!form.name || !form.slug}><Check className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => setShowNew(false)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground w-8">Color</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Slug</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cats?.map(cat => (
                <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  {editing === cat.id ? (
                    <>
                      <td className="py-2 px-4"><input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-6 h-6 rounded cursor-pointer" /></td>
                      <td className="py-2 px-4"><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="px-2 py-1 border border-input rounded text-sm bg-background w-full" /></td>
                      <td className="py-2 px-4"><input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="px-2 py-1 border border-input rounded text-sm bg-background w-full" /></td>
                      <td className="py-2 px-4"><input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="px-2 py-1 border border-input rounded text-sm bg-background w-full" /></td>
                      <td className="py-2 px-4 text-right">
                        <button onClick={() => updateCat.mutate({ id: cat.id, ...form })} className="p-1.5 hover:bg-green-100 rounded text-green-600"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-accent rounded"><X className="w-4 h-4" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4"><div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color ?? "#6366f1" }} /></td>
                      <td className="py-3 px-4 font-medium">{cat.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{cat.slug}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{cat.description}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => startEdit(cat)} className="p-1.5 hover:bg-accent rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm("Delete?")) deleteCat.mutate({ id: cat.id }); }} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
