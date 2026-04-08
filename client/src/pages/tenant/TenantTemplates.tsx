import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { X, Copy, Trash2, Play, Pencil } from "lucide-react";

const TONES = ["default", "Authoritative", "Conversational", "Inspirational", "Educational", "Bold", "Analytical"];
const FREQUENCIES = [["manual", "Manual"], ["daily", "Daily"], ["weekly", "Weekly"], ["biweekly", "Biweekly"], ["monthly", "Monthly"]];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TenantTemplates() {
  const { licenseId, settings } = useTenantContext();
  const templatesQuery = trpc.templates?.list?.useQuery?.({ licenseId }, { enabled: !!licenseId });
  const createMut = trpc.templates?.create?.useMutation?.({ onSuccess: () => templatesQuery?.refetch?.() });
  const deleteMut = trpc.templates?.delete?.useMutation?.({ onSuccess: () => templatesQuery?.refetch?.() });
  const dupMut = trpc.templates?.duplicate?.useMutation?.({ onSuccess: () => templatesQuery?.refetch?.() });
  const updateMut = trpc.templates?.update?.useMutation?.({ onSuccess: () => templatesQuery?.refetch?.() });
  const templates = (templatesQuery?.data as any[]) || [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [tab, setTab] = useState("content");
  const [f, setF] = useState<Record<string, any>>({});
  const upd = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  const resetForm = () => { setF({}); setEditId(null); setShowForm(false); setTab("content"); };
  const startEdit = (t: any) => { setF(t); setEditId(t.id); setShowForm(true); setTab("content"); };

  const handleSave = async () => {
    if (!f.name?.trim()) return;
    if (editId) {
      await updateMut?.mutateAsync?.({ id: editId, licenseId, name: f.name, description: f.description, promptTemplate: f.promptTemplate, headlineFormat: f.headline_format || f.headlineFormat, tone: f.tone, targetWordCount: f.target_word_count || f.targetWordCount, scheduleFrequency: f.schedule_frequency || f.scheduleFrequency, scheduleColor: f.schedule_color || f.scheduleColor, articleFormatType: f.article_format_type || f.articleFormatType, sentenceRhythm: f.sentence_rhythm || f.sentenceRhythm });
    } else {
      await createMut?.mutateAsync?.({ licenseId, name: f.name, description: f.description, promptTemplate: f.promptTemplate, headlineFormat: f.headline_format, tone: f.tone, targetWordCount: f.target_word_count, categoryId: f.category_id, imageStylePrompt: f.image_style_prompt, scheduleFrequency: f.schedule_frequency, scheduleDayOfWeek: f.schedule_day_of_week, scheduleHour: f.schedule_hour, scheduleColor: f.schedule_color, articleFormatType: f.article_format_type, sentenceRhythm: f.sentence_rhythm });
    }
    resetForm();
  };

  const tabs = ["content", "image", "seo-geo", "schedule"];

  return (
    <TenantLayout pageTitle="Article Templates" pageSubtitle={`${templates.length} templates`} section="Content"
      headerActions={<button onClick={() => { resetForm(); setShowForm(true); }} style={{ height: 34, padding: "0 14px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>New Template</button>}>

      {/* Template Form */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>{editId ? "Edit Template" : "New Template"}</h3>
            <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer", textTransform: "capitalize",
                borderColor: tab === t ? "#111827" : "#e5e7eb", background: tab === t ? "#111827" : "#fff", color: tab === t ? "#fff" : "#6b7280" }}>
                {t === "seo-geo" ? "SEO & GEO" : t === "image" ? "Image Style" : t}
              </button>
            ))}
          </div>

          {tab === "content" && (<>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Template Name *</label>
              <input value={f.name || ""} onChange={e => upd("name", e.target.value)} placeholder="The Upgrade Series" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Headline Format</label>
              <input value={f.headline_format || f.headlineFormat || ""} onChange={e => upd("headline_format", e.target.value)} placeholder="The Upgrade Series: {topic}" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Use {"{topic}"} where the AI inserts the subject</div></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Prompt Structure *</label>
              <textarea value={f.promptTemplate || ""} onChange={e => upd("promptTemplate", e.target.value)} rows={5} placeholder="Write an article about {topic}. Structure: ..." style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Tone</label>
                <select value={f.tone || "default"} onChange={e => upd("tone", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  {TONES.map(t => <option key={t} value={t}>{t === "default" ? "Use publication default" : t}</option>)}</select></div>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Target Words</label>
                <input type="number" min={400} max={2000} value={f.target_word_count || f.targetWordCount || 800} onChange={e => upd("target_word_count", parseInt(e.target.value))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Article Format</label>
                <select value={f.article_format_type || f.articleFormatType || ""} onChange={e => upd("article_format_type", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="">Use default</option>
                  <option value="news-report">News Report</option><option value="feature">Feature</option><option value="listicle">Listicle</option>
                  <option value="how-to">How-To Guide</option><option value="qa">Q&A</option><option value="opinion">Opinion / Column</option>
                  <option value="roundup">Roundup</option><option value="profile">Profile</option><option value="data-story">Data Story</option>
                </select>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Structural archetype for articles from this template</div></div>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Sentence Rhythm</label>
                <select value={f.sentence_rhythm || f.sentenceRhythm || ""} onChange={e => upd("sentence_rhythm", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="">Use default</option>
                  <option value="short-punchy">Short & Punchy (&lt;15 words)</option>
                  <option value="long-flowing">Long & Flowing (&gt;25 words)</option>
                  <option value="varied">Varied (mix)</option>
                  <option value="fragment-led">Fragment-Led</option>
                  <option value="academic">Academic</option>
                </select>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Prose cadence — short feels like wire copy, varied like magazine</div></div>
            </div>
          </>)}

          {tab === "image" && (<>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Image Style Prompt</label>
              <textarea value={f.image_style_prompt || ""} onChange={e => upd("image_style_prompt", e.target.value)} rows={3} placeholder="Clean aspirational flat-lay photography..." style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Overrides the global image prompt for this template</div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Image Provider</label>
                <select value={f.image_provider || ""} onChange={e => upd("image_provider", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="">Use global setting</option><option value="openai">OpenAI</option><option value="replicate">Replicate</option><option value="gemini">Gemini</option><option value="grok">Grok</option></select></div>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Aspect Ratio</label>
                <select value={f.image_aspect_ratio || "16:9"} onChange={e => upd("image_aspect_ratio", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="16:9">16:9</option><option value="1:1">1:1</option><option value="4:5">4:5</option></select></div>
            </div>
          </>)}

          {tab === "seo-geo" && (<>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>SEO Title Format</label>
              <input value={f.seo_title_format || ""} onChange={e => upd("seo_title_format", e.target.value)} placeholder="{series_name}: {headline} | {site_name}" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Target Keywords</label>
              <input value={f.seo_keyword_themes || ""} onChange={e => upd("seo_keyword_themes", e.target.value)} placeholder="luxury lifestyle, career growth" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Key Takeaway Count</label>
                <select value={f.geo_key_takeaway_count || 5} onChange={e => upd("geo_key_takeaway_count", parseInt(e.target.value))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value={0}>Use global</option><option value={3}>3</option><option value={5}>5</option><option value={7}>7</option></select></div>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>FAQ Count</label>
                <select value={f.geo_faq_count || 5} onChange={e => upd("geo_faq_count", parseInt(e.target.value))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value={0}>Use global</option><option value={3}>3</option><option value={5}>5</option><option value={7}>7</option><option value={10}>10</option></select></div>
            </div>
          </>)}

          {tab === "schedule" && (<>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Series Color</label>
                <input type="color" value={f.schedule_color || "#6366f1"} onChange={e => upd("schedule_color", e.target.value)} style={{ width: 48, height: 36, borderRadius: 6, border: "1px solid #e5e7eb", cursor: "pointer" }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Frequency</label>
                <select value={f.schedule_frequency || "manual"} onChange={e => upd("schedule_frequency", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  {FREQUENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            {(f.schedule_frequency === "weekly" || f.schedule_frequency === "biweekly") && (
              <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Day of Week</label>
                <div style={{ display: "flex", gap: 4 }}>{DAYS.map((d, i) => (
                  <button key={i} onClick={() => upd("schedule_day_of_week", i)} style={{ padding: "6px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, border: "1px solid", cursor: "pointer",
                    borderColor: f.schedule_day_of_week === i ? "#111827" : "#e5e7eb", background: f.schedule_day_of_week === i ? "#111827" : "#fff", color: f.schedule_day_of_week === i ? "#fff" : "#6b7280" }}>{d}</button>
                ))}</div></div>
            )}
            <div><label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Publish Hour</label>
              <select value={f.schedule_hour || 9} onChange={e => upd("schedule_hour", parseInt(e.target.value))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                {Array.from({ length: 17 }, (_, i) => i + 6).map(h => <option key={h} value={h}>{h > 12 ? h - 12 : h} {h >= 12 ? "PM" : "AM"}</option>)}</select></div>
          </>)}

          <button onClick={handleSave} disabled={createMut?.isPending || updateMut?.isPending}
            style={{ width: "100%", height: 40, background: "#111827", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 16 }}>
            {createMut?.isPending || updateMut?.isPending ? "Saving..." : editId ? "Save Changes" : "Create Template"}
          </button>
        </div>
      )}

      {/* Template List */}
      {templates.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {templates.map((t: any) => (
            <div key={t.id} style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden", borderLeft: "4px solid " + (t.schedule_color || "#6366f1") }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{t.name}</div>
                    {t.description && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{t.description.substring(0, 60)}</div>}
                  </div>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: t.is_active ? "#d1fae5" : "#f3f4f6", color: t.is_active ? "#065f46" : "#6b7280" }}>
                    {t.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, background: "#f3f4f6", color: "#6b7280" }}>{t.schedule_frequency || "Manual"}</span>
                  <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, background: "#f3f4f6", color: "#6b7280" }}>{t.target_word_count || 800}w</span>
                  <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, background: "#f3f4f6", color: "#6b7280" }}>Used {t.use_count || 0}x</span>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                  <a href="/admin/articles/create" style={{ padding: "4px 10px", borderRadius: 4, background: "#2dd4bf", color: "#0f2d5e", fontSize: 11, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 2 }}><Play size={10} /> Use</a>
                  <button onClick={() => startEdit(t)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}><Pencil size={10} /> Edit</button>
                  <button onClick={() => dupMut?.mutate?.({ id: t.id, licenseId })} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}><Copy size={10} /> Dup</button>
                  <button onClick={() => { if (confirm("Delete this template?")) deleteMut?.mutate?.({ id: t.id, licenseId }); }} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #ef4444", background: "#fff", fontSize: 11, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", gap: 2 }}><Trash2 size={10} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 40, border: "1px solid #e5e7eb", textAlign: "center" }}>
          <p style={{ fontSize: 15, color: "#374151", marginBottom: 4 }}>No templates yet</p>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>Templates save your editorial formulas for consistent content series.</p>
          <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Create First Template</button>
        </div>
      )}
    </TenantLayout>
  );
}
