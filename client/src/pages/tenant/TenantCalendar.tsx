import React, { useState, useEffect, useMemo } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, X, Plus, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

const COLORS: Record<string, string> = {
  published: "#1D9E75", pending: "#EF9F27", approved: "#3b82f6", draft: "#9ca3af", rejected: "#E53E3E",
  social: "#7F77DD", email: "#378ADD", sms: "#D85A30", sponsorship: "#BA7517", templateSlot: "#534AB7",
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: Date[] = [];
  for (let i = startPad - 1; i >= 0; i--) days.push(new Date(year, month, -i));
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(new Date(year, month + 1, days.length - startPad - last.getDate() + 1));
  return days;
}

function fmt(d: Date) { return d.toISOString().split("T")[0]; }
function relTime(iso: string) { const ms = Date.now() - new Date(iso).getTime(); const h = Math.floor(ms / 3600000); if (h < 1) return "just now"; if (h < 24) return h + "h ago"; return Math.floor(h / 24) + "d ago"; }

type ViewMode = "month" | "week" | "list";

export default function TenantCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => (typeof localStorage !== "undefined" ? localStorage.getItem("calendar_view_mode") as ViewMode : null) || "month");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["all"]));
  const statusMut = trpc.articles.updateStatus.useMutation({ onSuccess: () => { toast.success("Updated"); eventsQuery.refetch(); } });

  useEffect(() => { localStorage.setItem("calendar_view_mode", viewMode); }, [viewMode]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startDate = fmt(new Date(year, month, -7));
  const endDate = fmt(new Date(year, month + 1, 7));

  const eventsQuery = trpc.calendar.getLayeredEvents.useQuery({ startDate, endDate }, { staleTime: 300000 });
  const data = eventsQuery.data;
  const stats = data?.stats;

  // Build day → events map
  const dayEvents = useMemo(() => {
    const map: Record<string, any[]> = {};
    const add = (date: string, type: string, item: any) => { if (!map[date]) map[date] = []; map[date].push({ type, ...item }); };
    for (const a of (data?.articles ?? []) as any[]) { const d = fmt(new Date(a.publishedAt || a.createdAt)); add(d, "article", a); }
    for (const s of (data?.socialPosts ?? []) as any[]) { const d = fmt(new Date(s.scheduledAt || s.sentAt || s.createdAt)); add(d, "social", s); }
    for (const n of (data?.newsletters ?? []) as any[]) { if (n.sentAt) add(fmt(new Date(n.sentAt)), "email", n); }
    for (const t of (data?.templateSlots ?? []) as any[]) { add(t.date, "template", t); }
    return map;
  }, [data]);

  const isFiltered = (type: string) => activeFilters.has("all") || activeFilters.has(type);
  const toggleFilter = (f: string) => {
    if (f === "all") { setActiveFilters(new Set(["all"])); return; }
    const next = new Set(activeFilters); next.delete("all");
    if (next.has(f)) next.delete(f); else next.add(f);
    if (next.size === 0) next.add("all");
    setActiveFilters(next);
  };

  const monthDays = getMonthDays(year, month);
  const today = fmt(new Date());
  const selectedEvents = selectedDate ? (dayEvents[selectedDate] ?? []) : [];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => { setCurrentDate(new Date()); setSelectedDate(fmt(new Date())); };

  return (
    <TenantLayout pageTitle="Content Calendar" pageSubtitle={`${MONTHS[month]} ${year}`} section="Content">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, minWidth: 140, textAlign: "center" }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={14} /></button>
          <button onClick={goToday} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Today</button>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["month", "week", "list"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid", cursor: "pointer", textTransform: "capitalize",
              borderColor: viewMode === v ? "#111827" : "#e5e7eb", background: viewMode === v ? "#111827" : "#fff", color: viewMode === v ? "#fff" : "#6b7280" }}>{v}</button>
          ))}
          <a href="/admin/articles/create" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", fontSize: 12, fontWeight: 600, textDecoration: "none" }}><Plus size={12} /> Add</a>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { label: "Published", count: stats?.articleCount, color: COLORS.published },
          { label: "Social", count: stats?.socialCount, color: COLORS.social },
          { label: "Newsletters", count: stats?.newsletterCount, color: COLORS.email },
          { label: "Sponsorships", count: stats?.sponsorshipCount, color: COLORS.sponsorship },
          { label: "Templates", count: stats?.templateSlotCount, color: COLORS.templateSlot },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            {s.label}: <strong style={{ color: "#111827" }}>{eventsQuery.isLoading ? "—" : s.count ?? 0}</strong>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {["all", "articles", "social", "email", "sms", "sponsorship", "templates"].map(f => (
          <button key={f} onClick={() => toggleFilter(f)} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, border: "1px solid", cursor: "pointer", textTransform: "capitalize",
            borderColor: activeFilters.has(f) ? "#2dd4bf" : "#e5e7eb", background: activeFilters.has(f) ? "#f0fdfa" : "#fff", color: activeFilters.has(f) ? "#0f766e" : "#6b7280" }}>{f}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {viewMode === "month" && (
            <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e5e7eb" }}>
                {DAYS.map(d => <div key={d} style={{ padding: "6px 4px", fontSize: 10, fontWeight: 600, color: "#9ca3af", textAlign: "center", textTransform: "uppercase" }}>{d}</div>)}
              </div>
              {/* Day cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {monthDays.map((day, i) => {
                  const key = fmt(day);
                  const isCurrentMonth = day.getMonth() === month;
                  const isToday = key === today;
                  const isSelected = key === selectedDate;
                  const events = (dayEvents[key] ?? []).filter(e => {
                    if (isFiltered("articles") && e.type === "article") return true;
                    if (isFiltered("social") && e.type === "social") return true;
                    if (isFiltered("email") && e.type === "email") return true;
                    if (isFiltered("templates") && e.type === "template") return true;
                    if (isFiltered("sponsorship") && e.type === "sponsorship") return true;
                    return activeFilters.has("all");
                  });
                  return (
                    <div key={i} onClick={() => setSelectedDate(key)}
                      style={{ minHeight: 80, padding: 4, borderRight: (i + 1) % 7 !== 0 ? "1px solid #f3f4f6" : "none", borderBottom: "1px solid #f3f4f6", cursor: "pointer", opacity: isCurrentMonth ? 1 : 0.4,
                        background: isSelected ? "#f0fdfa" : "transparent", outline: isToday ? "2px solid #2dd4bf" : isSelected ? "1px solid #2dd4bf" : "none", outlineOffset: -1 }}>
                      <div style={{ textAlign: "right", fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "#0f766e" : "#6b7280", marginBottom: 2 }}>{day.getDate()}</div>
                      {events.slice(0, 3).map((e, j) => (
                        <div key={j} style={{ fontSize: 10, padding: "1px 4px", marginBottom: 1, borderRadius: 3, borderLeft: `3px solid ${COLORS[e.status] || COLORS[e.type] || "#9ca3af"}`, background: "#f9fafb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.headline || e.subject || e.content?.substring(0, 30) || e.templateName || e.sponsorName || "Event"}
                        </div>
                      ))}
                      {events.length > 3 && <div style={{ fontSize: 9, color: "#9ca3af", textAlign: "center" }}>+{events.length - 3} more</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "week" && (() => {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(d.getDate() + i); return d; });
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                {weekDays.map(day => {
                  const key = fmt(day);
                  const events = dayEvents[key] ?? [];
                  return (
                    <div key={key} style={{ background: "#fff", borderRadius: 8, border: key === today ? "2px solid #2dd4bf" : "1px solid #e5e7eb", padding: 8, minHeight: 200 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>{DAYS[day.getDay()]} {day.getDate()}</div>
                      {events.map((e, j) => (
                        <div key={j} style={{ fontSize: 11, padding: "4px 6px", marginBottom: 4, borderRadius: 4, borderLeft: `3px solid ${COLORS[e.status] || COLORS[e.type] || "#9ca3af"}`, background: "#f9fafb" }}>
                          <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.headline || e.subject || e.content?.substring(0, 40) || e.templateName || "Event"}</div>
                          {e.status && <span style={{ fontSize: 9, color: "#9ca3af" }}>{e.status}</span>}
                        </div>
                      ))}
                      {events.length === 0 && <div style={{ fontSize: 11, color: "#d1d5db", textAlign: "center", marginTop: 40 }}>No events</div>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {viewMode === "list" && (() => {
            const allDates = Object.keys(dayEvents).filter(d => d >= startDate && d <= endDate).sort();
            return (
              <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                {allDates.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No events in this range</div>}
                {allDates.map(date => (
                  <div key={date}>
                    <div style={{ padding: "8px 16px", background: "#f9fafb", fontSize: 12, fontWeight: 600, color: "#374151", borderBottom: "1px solid #f3f4f6" }}>
                      {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </div>
                    {dayEvents[date].map((e, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid #f3f4f6" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[e.status] || COLORS[e.type] || "#9ca3af", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, flex: 1 }}>{e.headline || e.subject || e.content?.substring(0, 60) || e.templateName || "Event"}</span>
                        {e.status && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#f3f4f6", color: "#6b7280" }}>{e.status}</span>}
                        <span style={{ fontSize: 10, color: "#9ca3af", textTransform: "capitalize" }}>{e.type}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Day detail panel */}
        {selectedDate && (
          <div style={{ width: 260, flexShrink: 0, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", padding: 14, position: "sticky", top: 16, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600 }}>{new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h4>
              <button onClick={() => setSelectedDate(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={14} /></button>
            </div>

            {selectedEvents.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 16 }}>No events this day</p>}

            {/* Articles */}
            {selectedEvents.filter(e => e.type === "article").length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Articles</p>
                {selectedEvents.filter(e => e.type === "article").map((a: any) => (
                  <div key={a.id} style={{ padding: "6px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                    <div style={{ fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.headline}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, background: COLORS[a.status] + "20", color: COLORS[a.status] }}>{a.status}</span>
                      {a.status === "pending" && <>
                        <button onClick={() => statusMut.mutate({ id: a.id, status: "approved" })} style={{ background: "none", border: "none", cursor: "pointer", color: "#22c55e", padding: 2 }} title="Approve"><CheckCircle2 size={13} /></button>
                        <button onClick={() => statusMut.mutate({ id: a.id, status: "rejected" })} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }} title="Reject"><XCircle size={13} /></button>
                      </>}
                      {a.status === "published" && a.slug && <a href={`/article/${a.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af" }}><ExternalLink size={11} /></a>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Social */}
            {selectedEvents.filter(e => e.type === "social").length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Social</p>
                {selectedEvents.filter(e => e.type === "social").map((s: any, i: number) => (
                  <div key={i} style={{ padding: "4px 0", fontSize: 11, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{s.platform}</span> — {s.content?.substring(0, 50)}
                  </div>
                ))}
              </div>
            )}

            {/* Templates */}
            {selectedEvents.filter(e => e.type === "template").length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Template Slots</p>
                {selectedEvents.filter(e => e.type === "template").map((t: any, i: number) => (
                  <div key={i} style={{ padding: "4px 0", fontSize: 11, color: COLORS.templateSlot, borderLeft: "2px dashed " + COLORS.templateSlot, paddingLeft: 8 }}>{t.templateName}</div>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <a href="/admin/articles/create" style={{ display: "block", textAlign: "center", padding: "6px 0", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 11, fontWeight: 600, textDecoration: "none", color: "#374151" }}>+ Create Article</a>
              <a href="/admin/newsletter" style={{ display: "block", textAlign: "center", padding: "6px 0", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 11, fontWeight: 600, textDecoration: "none", color: "#374151" }}>Schedule Newsletter</a>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  );
}
