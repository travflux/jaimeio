import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { X } from "lucide-react";

export default function TenantCreateArticle() {
  const { licenseId, settings } = useTenantContext();
  const [tab, setTab] = useState("write");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [templateId, setTemplateId] = useState<number | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [topic, setTopic] = useState("");
  const [targetLength, setTargetLength] = useState("800");
  const createMut = trpc.articles.create.useMutation();
  const catsQuery = trpc.categories.list.useQuery();
  const templatesQuery = trpc.templates?.list?.useQuery?.({ licenseId }, { enabled: !!licenseId });
  const templates = (templatesQuery?.data as any[]) || [];

  let licenseCats: any[] = [];
  try { if (settings?.categories) licenseCats = JSON.parse(settings.categories).map((c: any, i: number) => ({ id: -(i + 1), name: c.name })); } catch {}
  const categories = licenseCats.length > 0 ? licenseCats : (catsQuery.data || []);

  // Read templateId from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("templateId");
    if (tid) {
      const t = templates.find((t: any) => t.id === parseInt(tid));
      if (t) selectTemplate(t);
    }
  }, [templates]);

  const selectTemplate = (t: any) => {
    setSelectedTemplate(t);
    setTemplateId(t.id);
    if (t.category_id || t.categoryId) setCategoryId(t.category_id || t.categoryId);
    if (t.promptTemplate) setTopic(t.promptTemplate);
    if (t.target_word_count || t.targetWordCount) setTargetLength(String(t.target_word_count || t.targetWordCount || 800));
  };

  const clearTemplate = () => { setSelectedTemplate(null); setTemplateId(undefined); };

  const handleSave = async (status: string) => {
    if (!headline.trim() || !body.trim()) return;
    const slug = headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80) + "-" + Math.random().toString(36).slice(2, 7);
    await createMut.mutateAsync({
      headline, subheadline, body, slug, status,
      categoryId, featuredImage: imageUrl || undefined,
    });
    window.location.href = "/admin/articles";
  };

  return (
    <TenantLayout pageTitle="Create Article" pageSubtitle="Write or generate a new article" section="Content"
      headerActions={<>
        <button onClick={() => handleSave("draft")} disabled={createMut.isPending} style={{ height: 34, padding: "0 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save as Draft</button>
        <button onClick={() => handleSave("published")} disabled={createMut.isPending} style={{ height: 34, padding: "0 14px", borderRadius: 6, border: "none", background: "#2dd4bf", color: "#0f2d5e", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Publish Now</button>
      </>}>

      {/* Template Picker */}
      {templates.length > 0 && !selectedTemplate && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Start from a template</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {templates.filter((t: any) => t.is_active).map((t: any) => (
              <button key={t.id} onClick={() => selectTemplate(t)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.schedule_color || "#6366f1", flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Template Banner */}
      {selectedTemplate && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f0fdfa", border: "1px solid #2dd4bf", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedTemplate.schedule_color || "#6366f1" }} />
          <span style={{ fontWeight: 600 }}>Using: {selectedTemplate.name}</span>
          <button onClick={clearTemplate} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {["write", "ai"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "1px solid", cursor: "pointer",
            borderColor: tab === t ? "#111827" : "#e5e7eb", background: tab === t ? "#111827" : "#fff", color: tab === t ? "#fff" : "#6b7280" }}>
            {t === "write" ? "Write Manually" : "AI Generator"}
          </button>
        ))}
      </div>

      {tab === "write" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          <div>
            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Article headline..." style={{ width: "100%", fontSize: 20, fontWeight: 600, padding: "12px 0", border: "none", borderBottom: "1px solid #e5e7eb", outline: "none", marginBottom: 8 }} />
            <input value={subheadline} onChange={e => setSubheadline(e.target.value)} placeholder="Subheadline..." style={{ width: "100%", fontSize: 15, padding: "8px 0", border: "none", borderBottom: "1px solid #e5e7eb", outline: "none", color: "#6b7280", marginBottom: 16 }} />
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your article here..." rows={20} style={{ width: "100%", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 16, lineHeight: 1.8, resize: "vertical" }} />
          </div>
          <div>
            <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Article Settings</h4>
              <select value={categoryId || ""} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, marginBottom: 8 }}>
                <option value="">Select Category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb" }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Featured Image</h4>
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL (https://...)" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, marginBottom: 8 }} />
              {imageUrl && <img src={imageUrl} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6 }} onError={e => (e.currentTarget.style.display = "none")} />}
            </div>
          </div>
        </div>
      )}

      {tab === "ai" && (
        <div style={{ maxWidth: 640 }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Topic</h3>
            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={4} placeholder={selectedTemplate ? selectedTemplate.promptTemplate?.substring(0, 200) : "What should this article be about?"} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
          </div>
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Settings</h3>
            <select value={categoryId || ""} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, marginBottom: 8 }}>
              <option value="">Select Category</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Target length: ~{targetLength} words</label>
            <input type="range" min={300} max={1500} step={50} value={targetLength} onChange={e => setTargetLength(e.target.value)} style={{ width: "100%" }} />
          </div>
          <button onClick={async () => { if (!topic.trim()) return; try { const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + Math.random().toString(36).slice(2, 5); await createMut.mutateAsync({ headline: topic.trim(), subheadline: "", body: "<p>" + topic + "</p>", slug, status: "pending", categoryId, featuredImage: imageUrl || undefined }); window.location.href = "/admin/articles"; } catch {} }} disabled={!topic.trim() || createMut.isPending} style={{ width: "100%", height: 44, borderRadius: 6, background: !topic.trim() || createMut.isPending ? "#9ca3af" : "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 14, fontWeight: 700, cursor: !topic.trim() ? "not-allowed" : "pointer" }}>
            Generate Article
          </button>
        </div>
      )}
    </TenantLayout>
  );
}
