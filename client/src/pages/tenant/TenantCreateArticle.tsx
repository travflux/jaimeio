import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2, Image as ImageIcon, X } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function TenantCreateArticle() {
  const { licenseId, settings } = useTenantContext();
  const [, navigate] = useLocation();

  // Shared data
  const catsQuery = trpc.categories.list.useQuery();
  const templatesQuery = trpc.templates?.list?.useQuery?.({ licenseId }, { enabled: !!licenseId });
  const categories = (catsQuery.data || []) as any[];
  const templates = ((templatesQuery?.data as any[]) || []);

  // Write tab state
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [templateId, setTemplateId] = useState<number | undefined>();
  const [status, setStatus] = useState<"draft" | "pending" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [isEditorsPick, setIsEditorsPick] = useState(false);
  const [isTrending, setIsTrending] = useState(false);

  // Tiptap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    onUpdate: ({ editor: e }) => setBody(e.getHTML()),
  });

  // Mutations
  const createMut = trpc.articles.create.useMutation({
    onSuccess: (data: any) => { toast.success("Article created"); navigate("/admin/articles/" + data.id); },
    onError: (e: any) => { toast.error("Failed: " + e.message); setSaving(false); },
  });

  const handleCreate = () => {
    if (!headline.trim()) { toast.error("Headline is required"); return; }
    setSaving(true);
    const slug = headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80) + "-" + Math.random().toString(36).slice(2, 5);
    createMut.mutate({ headline, subheadline, body, slug, status, categoryId, featuredImage: imageUrl || undefined, isEditorsPick: isEditorsPick || undefined, isTrending: isTrending || undefined });
  };

  return (
    <TenantLayout pageTitle="Create Article" pageSubtitle="Create a new article" section="Content">
      {/* ═══ WRITE ═══ */}
      {(() => { /* Write content */ return (
        <div style={{ display: "flex", gap: 20 }}>
          {/* Left column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Headline *</label>
              <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Enter a compelling headline..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 16, fontWeight: 600 }} />
              <div style={{ textAlign: "right", fontSize: 11, color: headline.length > 100 ? "#ef4444" : "#9ca3af", marginTop: 2 }}>{headline.length} / 120</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Subheadline</label>
              <input value={subheadline} onChange={e => setSubheadline(e.target.value)} placeholder="Optional subheadline or deck..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 14 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Article Body</label>
              {/* Tiptap toolbar */}
              {editor && (
                <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: "6px 6px 0 0", flexWrap: "wrap" }}>
                  {[
                    { cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), label: "B", style: { fontWeight: 700 } as React.CSSProperties },
                    { cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), label: "I", style: { fontStyle: "italic" } as React.CSSProperties },
                    { cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), label: "H2", style: {} },
                    { cmd: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), label: "H3", style: {} },
                    { cmd: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), label: "•—", style: {} },
                    { cmd: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), label: "1.", style: {} },
                    { cmd: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), label: '"', style: {} },
                    { cmd: () => editor.chain().focus().setHorizontalRule().run(), active: false, label: "—", style: {} },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.cmd} type="button"
                      style={{ width: 28, height: 28, borderRadius: 4, border: "1px solid #e5e7eb", background: btn.active ? "#e5e7eb" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", ...btn.style }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
              <EditorContent editor={editor} className="tiptap-create" />
            </div>
          </div>

          {/* Right column */}
          <div style={{ width: 300, flexShrink: 0 }}>
            {/* Featured Image */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 14, border: "1px solid #e5e7eb", marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>Featured Image</label>
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL (https://...)"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, marginBottom: 6 }} />
              {imageUrl && <img src={imageUrl} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6, marginBottom: 6 }} onError={e => (e.currentTarget.style.display = "none")} />}
            </div>

            {/* Category */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 14, border: "1px solid #e5e7eb", marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>Category</label>
              <select value={categoryId ?? ""} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}>
                <option value="">Select category...</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Template */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 14, border: "1px solid #e5e7eb", marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>Template</label>
              <select value={templateId ?? ""} onChange={e => setTemplateId(e.target.value ? Number(e.target.value) : undefined)}
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}>
                <option value="">No template (use defaults)</option>
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>Applies format, voice, and image style</p>
            </div>

            {/* Status */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 14, border: "1px solid #e5e7eb", marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>Status</label>
              <div style={{ display: "flex", gap: 4 }}>
                {(["draft", "pending", "published"] as const).map(s => (
                  <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid", cursor: "pointer", textTransform: "capitalize",
                    borderColor: status === s ? "#2dd4bf" : "#e5e7eb", background: status === s ? "#f0fdfa" : "#fff", color: status === s ? "#0f766e" : "#6b7280" }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Editor Pick & Trending */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 14, border: "1px solid #e5e7eb", marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 10 }}>Flags</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#374151" }}>{"Editor\u2019s Pick"}</span>
                  <button onClick={() => setIsEditorsPick(!isEditorsPick)} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative", background: isEditorsPick ? "#2dd4bf" : "#d1d5db", transition: "background 0.2s" }}>
                    <span style={{ position: "absolute", top: 2, left: isEditorsPick ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#374151" }}>Trending</span>
                  <button onClick={() => setIsTrending(!isTrending)} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative", background: isTrending ? "#2dd4bf" : "#d1d5db", transition: "background 0.2s" }}>
                    <span style={{ position: "absolute", top: 2, left: isTrending ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Save */}
            <button onClick={handleCreate} disabled={saving}
              style={{ width: "100%", height: 44, borderRadius: 6, background: saving ? "#9ca3af" : "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Article →"}
            </button>
          </div>
        </div>
      ); })()}

      <style>{`
        .tiptap-create .ProseMirror { min-height: 400px; padding: 16px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 6px 6px; font-size: 14px; line-height: 1.7; outline: none; }
        .tiptap-create .ProseMirror h2 { font-size: 1.4em; font-weight: 600; margin: 1em 0 0.5em; }
        .tiptap-create .ProseMirror h3 { font-size: 1.2em; font-weight: 600; margin: 1em 0 0.5em; }
        .tiptap-create .ProseMirror p { margin: 0 0 0.75em; }
        .tiptap-create .ProseMirror ul, .tiptap-create .ProseMirror ol { padding-left: 1.5em; margin: 0 0 0.75em; }
        .tiptap-create .ProseMirror blockquote { border-left: 3px solid #e5e7eb; padding-left: 1em; color: #6b7280; margin: 0 0 0.75em; }
        .tiptap-create .ProseMirror hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
        .tiptap-create .ProseMirror p.is-editor-empty:first-child::before { content: "Start writing your article..."; color: #9ca3af; float: left; height: 0; pointer-events: none; }
      `}</style>
    </TenantLayout>
  );
}
