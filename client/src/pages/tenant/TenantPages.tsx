import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";

const DEFAULT_SLUGS = ["advertise", "privacy", "contact", "sitemap-page", "about"];

export default function TenantPages() {
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, refetch } = trpc.pages.list.useQuery();
  const saveMut = trpc.pages.save.useMutation({
    onSuccess: () => { toast.success("Page saved"); setSaving(false); setEditing(null); setCreating(false); refetch(); },
    onError: (e: any) => { toast.error("Failed: " + e.message); setSaving(false); },
  });
  const delMut = trpc.pages.deletePage.useMutation({ onSuccess: () => { toast.success("Page deleted"); refetch(); } });

  const openEditor = (page: any) => {
    setEditing(page); setCreating(false);
    setTitle(page.title || page.slug); setSlug(page.slug);
    let c = page.content || "";
    try { const parsed = JSON.parse(c); c = parsed.body || JSON.stringify(parsed, null, 2); } catch {}
    setContent(c);
  };

  const openCreator = () => {
    setEditing(null); setCreating(true);
    setTitle(""); setSlug(""); setContent("<h1>New Page</h1>\n<p>Start writing...</p>");
  };

  const handleSave = () => {
    if (!title.trim() || !slug.trim()) { toast.error("Title and slug required"); return; }
    setSaving(true);
    saveMut.mutate({ id: editing?.id, title, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"), content: JSON.stringify({ body: content }), isPublished: true });
  };

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (creating) setSlug(v.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-"));
  };

  const pages = data?.pages || [];

  // Editor view
  if (editing || creating) {
    return (
      <TenantLayout pageTitle={creating ? "New Page" : "Edit: " + (editing?.title || "")} section="Content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={() => { setEditing(null); setCreating(false); }} style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>← Back to Pages</button>
          <div style={{ display: "flex", gap: 8 }}>
            {editing && <a href={"/" + editing.slug} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, textDecoration: "none", color: "#374151" }}><ExternalLink size={12} /> Preview</a>}
            <button onClick={handleSave} disabled={saving} style={{ padding: "6px 16px", borderRadius: 6, background: "#111827", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Save Page"}
            </button>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Page Title</label>
              <input value={title} onChange={e => handleTitleChange(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} placeholder="e.g. Advertise With Us" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>URL Slug</label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>/</span>
                <input value={slug} onChange={e => setSlug(e.target.value)} disabled={editing && DEFAULT_SLUGS.includes(editing.slug)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace" }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 11, color: "#9ca3af" }}>Page Content — HTML supported</div>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            style={{ width: "100%", height: 400, padding: 16, border: "none", fontSize: 13, fontFamily: "monospace", resize: "vertical", outline: "none" }}
            placeholder="<h1>Title</h1>\n<p>Content...</p>" />
        </div>
      </TenantLayout>
    );
  }

  // List view
  return (
    <TenantLayout pageTitle="Pages" pageSubtitle={pages.length + " pages"} section="Content"
      headerActions={<button onClick={openCreator} style={{ height: 34, padding: "0 14px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ New Page</button>}>

      {/* Default Pages */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", marginBottom: 8 }}>Default Pages</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {pages.filter((p: any) => DEFAULT_SLUGS.includes(p.slug)).map((page: any) => (
            <div key={page.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{page.title}</p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>/{page.slug}</p>
              </div>
              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "#d1fae5", color: "#065f46" }}>Published</span>
              <a href={"/" + page.slug} target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af", padding: 4 }}><ExternalLink size={14} /></a>
              <button onClick={() => openEditor(page)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer" }}>Edit</button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Pages */}
      {pages.filter((p: any) => !DEFAULT_SLUGS.includes(p.slug)).length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", marginBottom: 8 }}>Custom Pages</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pages.filter((p: any) => !DEFAULT_SLUGS.includes(p.slug)).map((page: any) => (
              <div key={page.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{page.title}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>/{page.slug}</p>
                </div>
                <a href={"/" + page.slug} target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af", padding: 4 }}><ExternalLink size={14} /></a>
                <button onClick={() => openEditor(page)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer" }}>Edit</button>
                <button onClick={() => { if (confirm("Delete " + page.title + "?")) delMut.mutate({ id: page.id }); }}
                  style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #ef4444", background: "#fff", fontSize: 11, cursor: "pointer", color: "#ef4444" }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pages.length === 0 && <p style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>No pages yet. Default pages will be created automatically.</p>}
    </TenantLayout>
  );
}
