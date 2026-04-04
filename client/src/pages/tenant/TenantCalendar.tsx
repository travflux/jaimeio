import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { ChevronLeft, ChevronRight, X, Zap, PenLine, Eye } from "lucide-react";

function getTemplateSlotsForMonth(templates: any[], year: number, month: number, articles: any[], skippedSlots: any[]): Array<{ date: number; template: any; isFilled: boolean; articleHeadline?: string; articleId?: number }> {
  const slots: Array<{ date: number; template: any; isFilled: boolean; articleHeadline?: string; articleId?: number }> = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (const t of templates) {
    if (t.schedule_frequency === "manual" || !t.schedule_frequency) continue;
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(year, month, day).getDay();
      let isDue = false;
      if (t.schedule_frequency === "daily") isDue = true;
      else if (t.schedule_frequency === "weekly") isDue = t.schedule_day_of_week === dow;
      else if (t.schedule_frequency === "biweekly") { const occs: number[] = []; for (let d = 1; d <= daysInMonth; d++) if (new Date(year, month, d).getDay() === t.schedule_day_of_week) occs.push(d); isDue = occs[0] === day || occs[2] === day; }
      else if (t.schedule_frequency === "monthly") isDue = day === 1;
      if (!isDue) continue;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isSkipped = skippedSlots.some((s: any) => s.templateId === t.id && String(s.skipDate).startsWith(dateStr));
      if (isSkipped) continue;
      const fullDateStr = new Date(year, month, day).toISOString().split("T")[0];
      const match = articles.find((a: any) => a.templateId === t.id && (a.publishedAt || a.createdAt) && new Date(a.publishedAt || a.createdAt).toISOString().split("T")[0] === fullDateStr);
      slots.push({ date: day, template: t, isFilled: !!match, articleHeadline: match?.headline, articleId: match?.id });
    }
  }
  return slots;
}

export default function TenantCalendar() {
  const { licenseId } = useTenantContext();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedSlot, setSelectedSlot] = useState<{ template: any; date: Date } | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const articlesQuery = trpc.articles.list.useQuery({ limit: 200 });
  const templatesQuery = trpc.templates?.list?.useQuery?.({ licenseId }, { enabled: !!licenseId });
  const skippedQuery = trpc.templates?.getSkippedSlots?.useQuery?.({ licenseId, month: month + 1, year }, { enabled: !!licenseId });
  const generateMut = trpc.workflow?.generateFromCandidate?.useMutation?.();
  const skipMut = trpc.templates?.skipSlot?.useMutation?.({ onSuccess: () => skippedQuery?.refetch?.() });
  const articles = articlesQuery.data?.articles || [];
  const templates = (templatesQuery?.data as any[]) || [];
  const skippedSlots = (skippedQuery?.data as any[]) || [];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month).toLocaleDateString("en", { month: "long", year: "numeric" });
  const today = new Date();
  const templateSlots = getTemplateSlotsForMonth(templates, year, month, articles, skippedSlots);

  const getArticlesForDay = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    return articles.filter((a: any) => { const d = a.publishedAt || a.createdAt; return d && new Date(d).toISOString().split("T")[0] === dateStr; });
  };
  const getSlotsForDay = (day: number) => templateSlots.filter(s => s.date === day);

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <TenantLayout pageTitle="Content Calendar" pageSubtitle={monthName} section="Content"
      headerActions={<>
        <button onClick={prev} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}><ChevronLeft size={16} /></button>
        <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Today</button>
        <button onClick={next} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}><ChevronRight size={16} /></button>
      </>}>
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e5e7eb" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} style={{ padding: 8, textAlign: "center", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {Array.from({ length: firstDay }, (_, i) => <div key={"e" + i} style={{ minHeight: 90, borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6" }} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayArticles = getArticlesForDay(day);
            const daySlots = getSlotsForDay(day);
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div key={day} style={{ minHeight: 90, padding: 4, borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", background: isToday ? "#f0fdfa" : "transparent" }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "#2dd4bf" : "#374151", textAlign: "right", marginBottom: 2 }}>{day}</div>
                {daySlots.map((s, si) => (
                  <div key={"s" + si} onClick={() => s.isFilled && s.articleId ? setSelectedArticle(articles.find((a: any) => a.id === s.articleId)) : setSelectedSlot({ template: s.template, date: new Date(year, month, day) })}
                    style={{ fontSize: 9, padding: "1px 4px", marginBottom: 1, borderRadius: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer",
                      background: s.isFilled ? s.template.schedule_color : "transparent",
                      color: s.isFilled ? "#fff" : s.template.schedule_color,
                      border: s.isFilled ? "none" : "1px dashed " + s.template.schedule_color }}>
                    {s.isFilled ? s.template.name + ": " + (s.articleHeadline || "").substring(0, 15) : s.template.name}
                  </div>
                ))}
                {dayArticles.filter(a => !daySlots.some(s => s.isFilled && s.articleId === a.id)).slice(0, 2).map((a: any) => (
                  <div key={a.id} onClick={() => setSelectedArticle(a)}
                    style={{ fontSize: 9, padding: "1px 4px", marginBottom: 1, borderRadius: 3, cursor: "pointer",
                      background: a.status === "published" ? "#d1fae5" : a.status === "pending" ? "#fef3c7" : "#f3f4f6",
                      color: a.status === "published" ? "#065f46" : a.status === "pending" ? "#92400e" : "#6b7280",
                      overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {a.headline?.substring(0, 20)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Template Legend */}
      {templates.filter((t: any) => t.schedule_frequency && t.schedule_frequency !== "manual").length > 0 && (
        <div style={{ marginTop: 12, padding: "12px 16px", background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Template Series</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {templates.filter((t: any) => t.schedule_frequency && t.schedule_frequency !== "manual").map((t: any) => {
              const filled = templateSlots.filter(s => s.template.id === t.id && s.isFilled).length;
              const total = templateSlots.filter(s => s.template.id === t.id).length;
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: "1px solid " + (t.schedule_color || "#6366f1"), fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.schedule_color || "#6366f1" }} />
                  <span style={{ fontWeight: 500 }}>{t.name}</span>
                  <span style={{ color: "#6b7280" }}>{filled}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Article Detail Panel */}
      {selectedArticle && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 60 }} onClick={() => setSelectedArticle(null)} />
          <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 440, maxWidth: "100vw", background: "#fff", zIndex: 70, display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Article Detail</h2>
              <button onClick={() => setSelectedArticle(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {selectedArticle.image_url && (
                <img src={selectedArticle.image_url} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 16, objectFit: "cover", maxHeight: 200 }} />
              )}
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: selectedArticle.status === "published" ? "#d1fae5" : selectedArticle.status === "pending" ? "#fef3c7" : "#f3f4f6",
                  color: selectedArticle.status === "published" ? "#065f46" : selectedArticle.status === "pending" ? "#92400e" : "#6b7280" }}>
                  {selectedArticle.status}
                </span>
                {selectedArticle.categoryName && (
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "#f3f4f6", color: "#374151" }}>
                    {selectedArticle.categoryName}
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, color: "#111827", marginBottom: 8 }}>
                {selectedArticle.headline || "Untitled"}
              </h3>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                {(selectedArticle.publishedAt || selectedArticle.createdAt) ? new Date(selectedArticle.publishedAt || selectedArticle.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : ""}
              </p>
              {selectedArticle.excerpt && (
                <div style={{ padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                  {selectedArticle.excerpt}
                </div>
              )}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
              <a href={"/tenant/articles?article=" + selectedArticle.id}
                style={{ flex: 1, height: 40, border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff" }}>
                <Eye size={14} /> View in Articles
              </a>
            </div>
          </div>
        </>
      )}

      {/* Template Slot Panel */}
      {selectedSlot && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 60 }} onClick={() => setSelectedSlot(null)} />
          <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 400, maxWidth: "100vw", background: "#fff", zIndex: 70, display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: selectedSlot.template.schedule_color || "#6366f1" }} />
                  <h2 style={{ fontSize: 16, fontWeight: 700 }}>{selectedSlot.template.name}</h2>
                </div>
                <button onClick={() => setSelectedSlot(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                Scheduled for {selectedSlot.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
            <div style={{ flex: 1, padding: 20 }}>
              {selectedSlot.template.promptTemplate && (
                <div style={{ padding: 12, background: "#f9fafb", borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Editorial Formula</p>
                  <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{selectedSlot.template.promptTemplate?.substring(0, 300)}{selectedSlot.template.promptTemplate?.length > 300 ? "..." : ""}</p>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={async () => {
                  setIsGenerating(true);
                  try {
                    await generateMut?.mutateAsync?.({ candidateId: 1, templateId: selectedSlot.template.id, categoryId: selectedSlot.template.category_id || selectedSlot.template.categoryId });
                    setSelectedSlot(null);
                    articlesQuery.refetch();
                  } catch {} finally { setIsGenerating(false); }
                }} disabled={isGenerating}
                  style={{ width: "100%", height: 44, background: isGenerating ? "#9ca3af" : "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Zap size={16} /> {isGenerating ? "Generating..." : "Generate Article Now"}
                </button>
                <a href={"/admin/articles/create?templateId=" + selectedSlot.template.id}
                  style={{ width: "100%", height: 44, border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: "none", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff" }}>
                  <PenLine size={16} /> Write Manually
                </a>
                <button onClick={async () => {
                  const skipDate = selectedSlot.date.toISOString().split("T")[0];
                  await skipMut?.mutateAsync?.({ templateId: selectedSlot.template.id, skipDate, licenseId });
                  setSelectedSlot(null);
                }} style={{ width: "100%", height: 40, background: "none", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>
                  Skip This Slot
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </TenantLayout>
  );
}
