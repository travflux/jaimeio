import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { FileText, Plus, Lock, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const TEMPLATES: Record<string, { label: string; fields: Array<{ key: string; label: string; type: "text" | "textarea" | "toggle" | "date" | "html"; placeholder?: string }> }> = {
  custom: { label: "Custom Page", fields: [
    { key: "body", label: "Page Content", type: "html", placeholder: "<h1>Your page</h1><p>Content here...</p>" },
  ]},
  contact: { label: "Contact Page", fields: [
    { key: "hero_heading", label: "Hero Heading", type: "text", placeholder: "Get In Touch" },
    { key: "hero_subtext", label: "Hero Subtext", type: "text", placeholder: "We'd love to hear from you." },
    { key: "show_email", label: "Show Email", type: "toggle" },
    { key: "show_phone", label: "Show Phone", type: "toggle" },
    { key: "show_address", label: "Show Address", type: "toggle" },
    { key: "custom_message", label: "Custom Message", type: "textarea" },
  ]},
  advertise: { label: "Advertise Page", fields: [
    { key: "hero_heading", label: "Hero Heading", type: "text" },
    { key: "hero_subtext", label: "Hero Subtext", type: "textarea" },
    { key: "stat_1_label", label: "Stat 1 Label", type: "text" },
    { key: "stat_1_value", label: "Stat 1 Value", type: "text", placeholder: "auto = from DB" },
    { key: "stat_2_label", label: "Stat 2 Label", type: "text" },
    { key: "stat_2_value", label: "Stat 2 Value", type: "text" },
    { key: "stat_3_label", label: "Stat 3 Label", type: "text" },
    { key: "stat_3_value", label: "Stat 3 Value", type: "text" },
    { key: "why_heading", label: "Why Section Heading", type: "text" },
    { key: "why_1_title", label: "Reason 1 Title", type: "text" },
    { key: "why_1_text", label: "Reason 1 Text", type: "textarea" },
    { key: "why_2_title", label: "Reason 2 Title", type: "text" },
    { key: "why_2_text", label: "Reason 2 Text", type: "textarea" },
    { key: "why_3_title", label: "Reason 3 Title", type: "text" },
    { key: "why_3_text", label: "Reason 3 Text", type: "textarea" },
    { key: "form_heading", label: "Form Heading", type: "text" },
    { key: "form_subtext", label: "Form Subtext", type: "textarea" },
  ]},
  about: { label: "About Page", fields: [
    { key: "hero_heading", label: "Hero Heading", type: "text" },
    { key: "hero_subtext", label: "Hero Subtext", type: "textarea" },
    { key: "body", label: "About Content", type: "html" },
    { key: "show_team", label: "Show Team Section", type: "toggle" },
  ]},
  privacy: { label: "Privacy Policy", fields: [
    { key: "effective_date", label: "Effective Date", type: "date" },
    { key: "custom_intro", label: "Introduction", type: "html" },
  ]},
  "sitemap-page": { label: "Site Map", fields: [] },
};

export default function TenantPages() {
  const { licenseId } = useTenantContext();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newTemplate, setNewTemplate] = useState("custom");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageStatus, setPageStatus] = useState<"draft" | "published">("published");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const bodyEditor = useEditor({
    extensions: [StarterKit],
    content: "",
    onUpdate: ({ editor }) => {
      updateField("body", editor.getHTML());
    },
  });

  const { data, refetch } = trpc.pages.list.useQuery();
  const saveMut = trpc.pages.save.useMutation({
    onSuccess: () => { toast.success("Page saved"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = trpc.pages.deletePage.useMutation({
    onSuccess: () => { toast.success("Deleted"); setSelectedId(null); refetch(); },
  });
  const createMut = trpc.pages.create.useMutation({
    onSuccess: (data: any) => { toast.success("Page created"); setCreating(false); setNewTitle(""); setNewSlug(""); refetch(); if (data?.id) setSelectedId(data.id); },
    onError: (e: any) => toast.error(e.message),
  });

  const pages = data?.pages || [];
  const selectedPage = pages.find((p: any) => p.id === selectedId);

  // Load page data when selection changes
  useEffect(() => {
    if (selectedPage) {
      setPageTitle(selectedPage.title);
      setPageSlug(selectedPage.slug);
      setPageStatus(selectedPage.status || "published");
      setSeoTitle(selectedPage.seoTitle || "");
      setSeoDescription(selectedPage.seoDescription || "");
      try {
        const parsed = JSON.parse(selectedPage.content || "{}");
        setFormData(parsed);
      } catch {
        setFormData({ body: selectedPage.content || "" });
      }
    }
  }, [selectedId, selectedPage?.content]);

  useEffect(() => {
    if (bodyEditor && formData.body !== undefined) {
      const current = bodyEditor.getHTML();
      if (current !== formData.body) {
        bodyEditor.commands.setContent(formData.body || "");
      }
    }
  }, [selectedId, formData.body, bodyEditor]);

  const handleSave = (status: "draft" | "published") => {
    if (!selectedPage) return;
    saveMut.mutate({
      id: selectedPage.id,
      title: pageTitle,
      slug: pageSlug,
      content: JSON.stringify(formData),
      status,
      template: selectedPage.template || "custom",
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
    });
  };

  const handleCreate = () => {
    if (!newTitle.trim()) { toast.error("Title required"); return; }
    const slug = newSlug || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, "");
    createMut.mutate({ title: newTitle, slug, template: newTemplate });
  };

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const template = selectedPage ? (TEMPLATES[selectedPage.template] || TEMPLATES.custom) : null;

  return (
    <TenantLayout pageTitle="Pages" pageSubtitle="Manage publication pages" section="Design">
      <div style={{ display: "flex", height: "calc(100vh - 220px)", margin: "-20px", marginTop: -12 }}>
        {/* Left: Page list */}
        <div style={{ width: 260, flexShrink: 0, borderRight: "1px solid #E5E7EB", overflowY: "auto", background: "#fff" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Pages</span>
            <button onClick={() => setCreating(true)} style={{ padding: "4px 10px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ New</button>
          </div>
          {pages.map((p: any) => (
            <div key={p.id} onClick={() => { setSelectedId(p.id); setCreating(false); }}
              style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", borderLeft: selectedId === p.id ? "3px solid #2dd4bf" : "3px solid transparent", background: selectedId === p.id ? "#f0fdfa" : "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {p.isSystemPage && <Lock size={10} color="#9ca3af" />}
                <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{p.title}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>/{p.slug}</span>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: p.status === "published" ? "#d1fae5" : "#fef3c7", color: p.status === "published" ? "#065f46" : "#92400e" }}>{p.status}</span>
              </div>
            </div>
          ))}
          {pages.length === 0 && <p style={{ padding: 16, color: "#9ca3af", fontSize: 12, textAlign: "center" }}>No pages yet</p>}
        </div>

        {/* Right: Editor */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f9fafb" }}>
          {/* Create dialog */}
          {creating && (
            <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", padding: 20, maxWidth: 500 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create New Page</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Title</label>
                <input value={newTitle} onChange={e => { setNewTitle(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }} placeholder="My New Page" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>URL Slug</label>
                <input value={newSlug} onChange={e => setNewSlug(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Template</label>
                <select value={newTemplate} onChange={e => setNewTemplate(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleCreate} disabled={createMut.isPending} style={{ padding: "8px 16px", background: "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {createMut.isPending ? "Creating..." : "Create Page"}
                </button>
                <button onClick={() => setCreating(false)} style={{ padding: "8px 16px", background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* No page selected */}
          {!creating && !selectedPage && (
            <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
              <FileText size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>Select a page to edit or create a new one</p>
            </div>
          )}

          {/* Page editor */}
          {!creating && selectedPage && template && (
            <div>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 }}>{pageTitle || "Untitled"}</h2>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>/{pageSlug} &middot; {template.label}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`/${selectedPage.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, textDecoration: "none", color: "#374151", display: "flex", alignItems: "center", gap: 4 }}><ExternalLink size={12} /> Preview</a>
                  {!selectedPage.isSystemPage && (
                    <button onClick={() => { if (confirm("Delete this page?")) delMut.mutate({ id: selectedPage.id }); }}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ef4444", background: "#fff", fontSize: 12, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={12} /> Delete</button>
                  )}
                </div>
              </div>

              {/* Title + Slug */}
              <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", padding: 16, marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Page Title</label>
                    <input value={pageTitle} onChange={e => setPageTitle(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>URL Slug</label>
                    <input value={pageSlug} onChange={e => setPageSlug(e.target.value)} disabled={selectedPage.isSystemPage} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace" }} />
                  </div>
                </div>
              </div>

              {/* Sitemap: read-only */}
              {selectedPage.template === "sitemap-page" && (
                <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", padding: 20, textAlign: "center", color: "#9ca3af" }}>
                  <p>The sitemap page is auto-generated and cannot be edited.</p>
                </div>
              )}

              {/* Template-specific fields */}
              {selectedPage.template !== "sitemap-page" && template.fields.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", padding: 16, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Content</h3>
                  {template.fields.map(f => (
                    <div key={f.key} style={{ marginBottom: 12 }}>
                      {f.type === "toggle" ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</span>
                          <button onClick={() => updateField(f.key, !formData[f.key])}
                            style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: formData[f.key] ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
                            <span style={{ position: "absolute", top: 2, left: formData[f.key] ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{f.label}</label>
                          {f.type === "html" ? (
                            f.key === "body" && bodyEditor ? (
                              <div>
                                <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: "6px 6px 0 0", flexWrap: "wrap" }}>
                                  {[
                                    { cmd: () => bodyEditor.chain().focus().toggleBold().run(), active: bodyEditor.isActive("bold"), label: "B", style: { fontWeight: 700 } as React.CSSProperties },
                                    { cmd: () => bodyEditor.chain().focus().toggleItalic().run(), active: bodyEditor.isActive("italic"), label: "I", style: { fontStyle: "italic" } as React.CSSProperties },
                                    { cmd: () => bodyEditor.chain().focus().toggleHeading({ level: 2 }).run(), active: bodyEditor.isActive("heading", { level: 2 }), label: "H2", style: {} },
                                    { cmd: () => bodyEditor.chain().focus().toggleHeading({ level: 3 }).run(), active: bodyEditor.isActive("heading", { level: 3 }), label: "H3", style: {} },
                                    { cmd: () => bodyEditor.chain().focus().toggleBulletList().run(), active: bodyEditor.isActive("bulletList"), label: "\u2022 \u2014", style: {} },
                                    { cmd: () => bodyEditor.chain().focus().toggleBlockquote().run(), active: bodyEditor.isActive("blockquote"), label: "\"", style: {} },
                                  ].map((btn, i) => (
                                    <button key={i} onClick={btn.cmd} type="button"
                                      style={{ width: 28, height: 28, borderRadius: 4, border: "1px solid #e5e7eb", background: btn.active ? "#e5e7eb" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", ...btn.style }}>
                                      {btn.label}
                                    </button>
                                  ))}
                                </div>
                                <EditorContent editor={bodyEditor} className="tiptap-pages" />
                                <style>{`.tiptap-pages .ProseMirror { min-height: 300px; padding: 16px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 6px 6px; font-size: 14px; line-height: 1.7; outline: none; }
                                  .tiptap-pages .ProseMirror h2 { font-size: 1.4em; font-weight: 600; margin: 1em 0 0.5em; }
                                  .tiptap-pages .ProseMirror h3 { font-size: 1.2em; font-weight: 600; margin: 1em 0 0.5em; }
                                  .tiptap-pages .ProseMirror p { margin: 0 0 0.75em; }
                                  .tiptap-pages .ProseMirror ul { padding-left: 1.5em; margin: 0 0 0.75em; }
                                  .tiptap-pages .ProseMirror blockquote { border-left: 3px solid #e5e7eb; padding-left: 1em; color: #6b7280; }`}</style>
                              </div>
                            ) : (
                              <textarea value={formData[f.key] || ""} onChange={e => updateField(f.key, e.target.value)} rows={12}
                                placeholder={f.placeholder} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "monospace", resize: "vertical" }} />
                            )
                          ) : f.type === "textarea" ? (
                            <textarea value={formData[f.key] || ""} onChange={e => updateField(f.key, e.target.value)} rows={3}
                              placeholder={f.placeholder} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
                          ) : f.type === "date" ? (
                            <input type="date" value={formData[f.key] || ""} onChange={e => updateField(f.key, e.target.value)}
                              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
                          ) : (
                            <input value={formData[f.key] || ""} onChange={e => updateField(f.key, e.target.value)}
                              placeholder={f.placeholder} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* SEO */}
              <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", padding: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>SEO</h3>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>SEO Title</label>
                  <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder={pageTitle} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>SEO Description</label>
                  <textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} rows={2} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
                </div>
              </div>

              {/* Save buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => handleSave("draft")} disabled={saveMut.isPending}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, color: "#6b7280", cursor: "pointer" }}>
                  Save as Draft
                </button>
                <button onClick={() => handleSave("published")} disabled={saveMut.isPending}
                  style={{ padding: "8px 16px", borderRadius: 6, background: "#111827", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {saveMut.isPending ? "Saving..." : "Save & Publish"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TenantLayout>
  );
}
