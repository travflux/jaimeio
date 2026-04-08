import React, { useState, useEffect, useMemo } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

/* ── Constants ─────────────────────────────────────── */
const COLORS = {
  published: "#1D9E75",
  pending: "#EF9F27",
  approved: "#3B82F6",
  draft: "#9CA3AF",
  rejected: "#E53E3E",
  social: "#7F77DD",
  email: "#378ADD",
  sms: "#D85A30",
  sponsorship: "#BA7517",
  templateSlot: "#534AB7",
} as const;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ── Helpers ────────────────────────────────────────── */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonthDates(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const dates: Date[] = [];
  for (let i = startPad - 1; i >= 0; i--) dates.push(new Date(year, month, -i));
  for (let d = 1; d <= last.getDate(); d++) dates.push(new Date(year, month, d));
  while (dates.length % 7 !== 0) dates.push(new Date(year, month + 1, dates.length - startPad - last.getDate() + 1));
  return dates;
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day); // Sunday start
  return Array.from({ length: 7 }, (_, i) => { const r = new Date(d); r.setDate(d.getDate() + i); return r; });
}

type EventData = {
  articles: Array<{ id: number; headline: string; slug: string; status: string; categoryId: number | null; createdAt: any; publishedAt: any }>;
  socialPosts: Array<{ id: number; content: string | null; platform: string; status: string; scheduledAt: any; sentAt: any }>;
  newsletters: Array<{ id: number; subject: string; status: string | null; sentAt: any; recipientCount: number | null }>;
  sponsorships: Array<{ id: number; sponsorName: string; dayOfWeek: number; isActive: boolean }>;
  templateSlots: Array<{ templateId: number; templateName: string; date: string }>;
};

function getEventsForDate(dateStr: string, data: EventData) {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  return {
    articles: data.articles.filter(a => {
      const dt = a.publishedAt ?? a.createdAt;
      return dt && String(dt).substring(0, 10) === dateStr;
    }),
    socialPosts: data.socialPosts.filter(s => {
      const dt = s.scheduledAt ?? s.sentAt;
      return dt && String(dt).substring(0, 10) === dateStr;
    }),
    newsletters: data.newsletters.filter(n => n.sentAt && String(n.sentAt).substring(0, 10) === dateStr),
    sponsorships: data.sponsorships.filter(sp => sp.dayOfWeek === dow && sp.isActive),
    templateSlots: data.templateSlots.filter(t => t.date === dateStr),
  };
}

type ViewMode = "month" | "week" | "day";

/* ── Chip component (shared by month + week) ───────── */
function EventChip({ label, color, dashed }: { label: string; color: string; dashed?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 2,
      padding: "2px 4px", borderRadius: 4, background: `${color}18`,
      border: dashed ? `1px dashed ${color}` : "none",
      borderLeft: dashed ? undefined : `3px solid ${color}`,
    }}>
      <span style={{
        fontSize: 11, color: "#374151", lineHeight: 1.3,
        whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "break-word",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden",
      }}>{label}</span>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */
export default function TenantCalendar() {
  const { licenseId } = useTenantContext();
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (typeof localStorage !== "undefined" ? localStorage.getItem("calendar_view_mode") as ViewMode : null) || "month"
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(new Date()));

  useEffect(() => { localStorage.setItem("calendar_view_mode", viewMode); }, [viewMode]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startDate = useMemo(() => toDateStr(new Date(year, month, -7)), [year, month]);
  const endDate = useMemo(() => toDateStr(new Date(year, month + 1, 7)), [year, month]);

  const eventsQuery = trpc.calendar.getLayeredEvents.useQuery(
    { startDate, endDate },
    { enabled: !!licenseId, staleTime: 300000 }
  );

  const utils = trpc.useUtils();
  const approveMut = trpc.articles.approve.useMutation({
    onSuccess: () => { eventsQuery.refetch(); utils.dashboard.getFastSnapshot.invalidate(); utils.dashboard.getSnapshot.invalidate(); toast.success("Approved"); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMut = trpc.articles.reject.useMutation({
    onSuccess: () => { eventsQuery.refetch(); utils.dashboard.getFastSnapshot.invalidate(); utils.dashboard.getSnapshot.invalidate(); toast.success("Rejected"); },
    onError: (e) => toast.error(e.message),
  });

  const data = eventsQuery.data as EventData | undefined;
  const stats = (eventsQuery.data as any)?.stats;
  const today = toDateStr(new Date());

  const prevPeriod = () => setCurrentDate(d => {
    const n = new Date(d);
    if (viewMode === "month") n.setMonth(n.getMonth() - 1);
    else if (viewMode === "week") n.setDate(n.getDate() - 7);
    else n.setDate(n.getDate() - 1);
    return n;
  });
  const nextPeriod = () => setCurrentDate(d => {
    const n = new Date(d);
    if (viewMode === "month") n.setMonth(n.getMonth() + 1);
    else if (viewMode === "week") n.setDate(n.getDate() + 7);
    else n.setDate(n.getDate() + 1);
    return n;
  });
  const goToday = () => { setCurrentDate(new Date()); setSelectedDate(toDateStr(new Date())); };

  const selectedEvents = selectedDate && data ? getEventsForDate(selectedDate, data) : null;
  const navBtnStyle: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 };

  return (
    <TenantLayout pageTitle="Content Calendar" pageSubtitle={viewMode === "day" ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : `${MONTHS[month]} ${year}`} section="Content">
      <div style={{ display: "flex", height: "calc(100vh - 220px)", overflow: "hidden", margin: "-20px", marginTop: -12 }}>
        {/* ═══ MAIN AREA ═══ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header bar — dark navy */}
          <div style={{ background: "#0F2D5E", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button onClick={prevPeriod} style={navBtnStyle}><ChevronLeft size={16} /></button>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 15, minWidth: 160, textAlign: "center" }}>
              {viewMode === "day"
                ? currentDate.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })
                : `${MONTHS[month]} ${year}`}
            </span>
            <button onClick={nextPeriod} style={navBtnStyle}><ChevronRight size={16} /></button>
            <button onClick={goToday} style={{ ...navBtnStyle, fontSize: 12, padding: "4px 10px", width: "auto" }}>Today</button>

            {/* View toggle */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: 2, marginLeft: 8 }}>
              {(["month", "week", "day"] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)} style={{
                  padding: "4px 12px", border: "none", cursor: "pointer", fontSize: 13, borderRadius: 4,
                  fontWeight: viewMode === m ? 600 : 400,
                  background: viewMode === m ? "#fff" : "transparent",
                  color: viewMode === m ? "#0F2D5E" : "rgba(255,255,255,0.7)",
                  textTransform: "capitalize",
                }}>{m}</button>
              ))}
            </div>

            <a href="/admin/articles/create" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "#2DD4BF", color: "#0F2D5E", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
              <Plus size={12} /> Add
            </a>
          </div>

          {/* Stats strip */}
          <div style={{ padding: "8px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", gap: 20, flexShrink: 0 }}>
            {eventsQuery.isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ width: 60, height: 28, background: "#F3F4F6", borderRadius: 4 }} />
            )) : [
              { label: "Articles", value: stats?.articleCount ?? 0, color: COLORS.published },
              { label: "Social", value: stats?.socialCount ?? 0, color: COLORS.social },
              { label: "Newsletters", value: stats?.newsletterCount ?? 0, color: COLORS.email },
              { label: "Sponsorships", value: stats?.sponsorshipCount ?? 0, color: COLORS.sponsorship },
              { label: "Templates", value: stats?.templateSlotCount ?? 0, color: COLORS.templateSlot },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ padding: "6px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
            {[
              { color: COLORS.published, label: "Published" },
              { color: COLORS.pending, label: "Pending" },
              { color: COLORS.social, label: "Social" },
              { color: COLORS.email, label: "Newsletter" },
              { color: COLORS.sponsorship, label: "Sponsorship" },
              { color: COLORS.templateSlot, label: "Template" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#374151" }}>
                <span style={{ width: 8, height: 8, borderRadius: l.label === "Template" ? 2 : "50%", background: l.color, display: "inline-block", border: l.label === "Template" ? `1px dashed ${l.color}` : "none" }} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Loading / Error */}
          {eventsQuery.isLoading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", fontSize: 14 }}>Loading calendar...</div>
          )}
          {eventsQuery.isError && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ color: "#EF4444", fontSize: 13 }}>Failed to load calendar events</span>
              <button onClick={() => eventsQuery.refetch()} style={{ padding: "6px 14px", background: "#2DD4BF", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Retry</button>
            </div>
          )}

          {/* ═══ MONTH VIEW ═══ */}
          {!eventsQuery.isLoading && !eventsQuery.isError && viewMode === "month" && (() => {
            const dates = getMonthDates(year, month);
            return (
              <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                  {DAYS.map(d => <div key={d} style={{ padding: "6px 0", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#6B7280" }}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid #E5E7EB", borderRight: "none", borderBottom: "none" }}>
                  {dates.map((date, i) => {
                    const ds = toDateStr(date);
                    const isCur = date.getMonth() === month;
                    const isTd = ds === today;
                    const isSel = ds === selectedDate;
                    const ev = data ? getEventsForDate(ds, data) : null;
                    return (
                      <div key={i} onClick={() => setSelectedDate(ds)} style={{
                        borderRight: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB",
                        padding: "4px 6px", minHeight: 80, cursor: "pointer",
                        background: isSel ? "#F0FDF9" : isTd ? "#F0FDF4" : "#fff",
                        opacity: isCur ? 1 : 0.35,
                        outline: isTd ? `2px solid ${COLORS.published}` : isSel ? "2px solid #2DD4BF" : "none", outlineOffset: -2,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: isTd ? 700 : 400, color: isTd ? COLORS.published : "#374151", textAlign: "right", marginBottom: 2 }}>{date.getDate()}</div>
                        {ev?.articles.map(a => <EventChip key={`a${a.id}`} label={a.headline} color={a.status === "published" ? COLORS.published : COLORS.pending} />)}
                        {ev?.socialPosts.map(s => <EventChip key={`s${s.id}`} label={`${s.platform} · ${(s.content || "").substring(0, 30)}`} color={COLORS.social} />)}
                        {ev?.newsletters.map(n => <EventChip key={`n${n.id}`} label={n.subject} color={COLORS.email} />)}
                        {ev?.sponsorships.map(sp => <EventChip key={`sp${sp.id}`} label={sp.sponsorName} color={COLORS.sponsorship} />)}
                        {ev?.templateSlots.map(t => <EventChip key={`t${t.templateId}-${ds}`} label={t.templateName} color={COLORS.templateSlot} dashed />)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ═══ WEEK VIEW ═══ */}
          {!eventsQuery.isLoading && !eventsQuery.isError && viewMode === "week" && (() => {
            const weekDates = getWeekDates(currentDate);
            return (
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                  {weekDates.map((date, i) => {
                    const ds = toDateStr(date);
                    const isTd = ds === today;
                    const isSel = ds === selectedDate;
                    const ev = data ? getEventsForDate(ds, data) : null;
                    return (
                      <div key={i} onClick={() => setSelectedDate(ds)} style={{
                        background: "#fff", borderRadius: 8,
                        border: isTd ? `2px solid ${COLORS.published}` : isSel ? "2px solid #2DD4BF" : "1px solid #E5E7EB",
                        padding: 8, cursor: "pointer", minHeight: 140,
                      }}>
                        <div style={{ textAlign: "center", marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{DAYS[date.getDay()]}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: isTd ? COLORS.published : "#374151" }}>{date.getDate()}</div>
                        </div>
                        {ev?.articles.map(a => (
                          <div key={`a${a.id}`} style={{ marginBottom: 4, padding: "5px 7px", borderRadius: 6, background: `${a.status === "published" ? COLORS.published : COLORS.pending}15`, borderLeft: `3px solid ${a.status === "published" ? COLORS.published : COLORS.pending}` }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#1F2937", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden", lineHeight: 1.4 }}>{a.headline}</div>
                            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{a.status}</div>
                          </div>
                        ))}
                        {ev?.socialPosts.map(s => (
                          <div key={`s${s.id}`} style={{ marginBottom: 4, padding: "5px 7px", borderRadius: 6, background: `${COLORS.social}15`, borderLeft: `3px solid ${COLORS.social}` }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#1F2937", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden", lineHeight: 1.4 }}>{s.platform} · {(s.content || "").substring(0, 40)}</div>
                          </div>
                        ))}
                        {ev?.sponsorships.map(sp => (
                          <div key={`sp${sp.id}`} style={{ marginBottom: 4, padding: "5px 7px", borderRadius: 6, background: `${COLORS.sponsorship}15`, borderLeft: `3px solid ${COLORS.sponsorship}` }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#1F2937", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.4 }}>{sp.sponsorName}</div>
                          </div>
                        ))}
                        {ev?.templateSlots.map(t => (
                          <div key={`t${t.templateId}`} style={{ marginBottom: 4, padding: "5px 7px", borderRadius: 6, border: `1px dashed ${COLORS.templateSlot}`, background: `${COLORS.templateSlot}10` }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#1F2937", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.4 }}>{t.templateName}</div>
                          </div>
                        ))}
                        {(!ev || (ev.articles.length + ev.socialPosts.length + ev.sponsorships.length + ev.templateSlots.length === 0)) && (
                          <div style={{ fontSize: 11, color: "#D1D5DB", textAlign: "center", marginTop: 20 }}>No events</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ═══ DAY VIEW ═══ */}
          {!eventsQuery.isLoading && !eventsQuery.isError && viewMode === "day" && (() => {
            const ds = toDateStr(currentDate);
            const ev = data ? getEventsForDate(ds, data) : null;
            const isTd = ds === today;
            const secHead = (title: string, href?: string) => (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 6px", borderBottom: "1px solid #F3F4F6", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</span>
                {href && <a href={href} style={{ fontSize: 12, color: "#2DD4BF", textDecoration: "none" }}>+ add</a>}
              </div>
            );
            return (
              <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
                <div style={{ padding: "12px 0", marginBottom: 8, borderBottom: "2px solid #E5E7EB" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 }}>
                    {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    {isTd && <span style={{ marginLeft: 8, fontSize: 12, color: COLORS.published, fontWeight: 500 }}>Today</span>}
                  </h3>
                </div>

                {secHead("Articles", "/admin/articles/create")}
                {(!ev?.articles.length) && <p style={{ color: "#9CA3AF", fontSize: 13, margin: "0 0 16px" }}>No articles today</p>}
                {ev?.articles.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #F9FAFB" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.status === "published" ? COLORS.published : COLORS.pending, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827", lineHeight: 1.4 }}>{a.headline}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{a.status}</div>
                    </div>
                    {a.status === "pending" && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => approveMut.mutate({ id: a.id })} disabled={approveMut.isPending} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${COLORS.published}`, background: "transparent", cursor: "pointer", color: COLORS.published, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{"✓"}</button>
                        <button onClick={() => rejectMut.mutate({ id: a.id })} disabled={rejectMut.isPending} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #EF4444", background: "transparent", cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{"✗"}</button>
                      </div>
                    )}
                    {a.status === "published" && <span style={{ fontSize: 11, padding: "2px 8px", background: `${COLORS.published}20`, color: COLORS.published, borderRadius: 20, fontWeight: 500 }}>live</span>}
                  </div>
                ))}

                {secHead("Social", "/admin/distribution")}
                {(!ev?.socialPosts.length) && <p style={{ color: "#9CA3AF", fontSize: 13, margin: "0 0 16px" }}>No social posts today</p>}
                {ev?.socialPosts.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #F9FAFB" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.social, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{s.platform}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{(s.content || "").substring(0, 80)}</div>
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500, background: s.status === "sent" ? `${COLORS.published}20` : `${COLORS.social}20`, color: s.status === "sent" ? COLORS.published : COLORS.social }}>{s.status}</span>
                  </div>
                ))}

                {ev && ev.sponsorships.length > 0 && <>
                  {secHead("Revenue")}
                  {ev.sponsorships.map(sp => (
                    <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F9FAFB" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.sponsorship, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{sp.sponsorName}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: "2px 8px", background: `${COLORS.sponsorship}20`, color: COLORS.sponsorship, borderRadius: 20, fontWeight: 500 }}>active</span>
                    </div>
                  ))}
                </>}
              </div>
            );
          })()}
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div style={{ width: 220, flexShrink: 0, borderLeft: "1px solid #E5E7EB", overflowY: "auto", background: "#fff", padding: 16 }}>
          {!selectedDate || !data ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Select a day</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>Click any date to see events</div>
              {[
                { label: "Create article", href: "/admin/articles/create", color: COLORS.published },
                { label: "Schedule newsletter", href: "/admin/newsletter", color: COLORS.email },
                { label: "Add sponsorship", href: "/admin/sponsorship", color: COLORS.sponsorship },
              ].map(a => (
                <a key={a.label} href={a.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 6, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, textDecoration: "none", color: "#374151", fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.color }} />{a.label}
                </a>
              ))}
            </>
          ) : (() => {
            const ev = selectedEvents!;
            const selDate = new Date(selectedDate + "T12:00:00");
            const total = ev.articles.length + ev.socialPosts.length + ev.newsletters.length + ev.sponsorships.length + ev.templateSlots.length;
            return (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{selDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>{selectedDate === today ? "Today · " : ""}{total} event{total !== 1 ? "s" : ""}</div>
                </div>

                {ev.articles.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Articles</div>
                    {ev.articles.map(a => (
                      <div key={a.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.status === "published" ? COLORS.published : COLORS.pending, flexShrink: 0, marginTop: 3 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#111827", lineHeight: 1.4, wordBreak: "break-word" }}>{a.headline}</div>
                            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{a.status}</div>
                          </div>
                          {a.status === "pending" && (
                            <div style={{ display: "flex", gap: 3 }}>
                              <button onClick={() => approveMut.mutate({ id: a.id })} disabled={approveMut.isPending} style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${COLORS.published}`, background: "transparent", cursor: "pointer", color: COLORS.published, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{"✓"}</button>
                              <button onClick={() => rejectMut.mutate({ id: a.id })} disabled={rejectMut.isPending} style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid #EF4444", background: "transparent", cursor: "pointer", color: "#EF4444", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{"✗"}</button>
                            </div>
                          )}
                          {a.status === "published" && <span style={{ fontSize: 10, padding: "1px 6px", background: `${COLORS.published}20`, color: COLORS.published, borderRadius: 20 }}>live</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {ev.socialPosts.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Social</div>
                    {ev.socialPosts.map(s => (
                      <div key={s.id} style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.social, flexShrink: 0, marginTop: 3 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{s.platform}</div>
                          <div style={{ fontSize: 11, color: "#6B7280", wordBreak: "break-word" }}>{(s.content || "").substring(0, 60)}</div>
                        </div>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: s.status === "sent" ? `${COLORS.published}20` : `${COLORS.social}20`, color: s.status === "sent" ? COLORS.published : COLORS.social }}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {ev.sponsorships.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Revenue</div>
                    {ev.sponsorships.map(sp => (
                      <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.sponsorship, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#111827", flex: 1 }}>{sp.sponsorName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {ev.templateSlots.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Templates</div>
                    {ev.templateSlots.map(t => (
                      <div key={`${t.templateId}-${selectedDate}`} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, paddingLeft: 8, borderLeft: `2px dashed ${COLORS.templateSlot}` }}>
                        <span style={{ fontSize: 12, color: COLORS.templateSlot }}>{t.templateName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {total === 0 && <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: 16 }}>No events this day</p>}

                <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #F3F4F6" }}>
                  {[
                    { label: "Create article", href: "/admin/articles/create", color: COLORS.published },
                    { label: "Schedule newsletter", href: "/admin/newsletter", color: COLORS.email },
                    { label: "Add sponsorship", href: "/admin/sponsorship", color: COLORS.sponsorship },
                  ].map(a => (
                    <a key={a.label} href={a.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 6, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, textDecoration: "none", color: "#374151", fontSize: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.color }} />{a.label}
                    </a>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </TenantLayout>
  );
}
