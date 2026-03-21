/**
 * Admin Attribution — Ad Spend & Revenue Attribution Dashboard
 * Tabs: Overview | Ad Spend | Revenue | Article Attribution | Real-Time | Integrations | Search Performance
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, RefreshCw, ChevronDown } from "lucide-react";

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function fmtRoas(roas: number): string {
  return roas === Infinity || isNaN(roas) ? "∞" : `${roas.toFixed(2)}x`;
}
function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function thirtyDaysAgo(): string {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
}

const CHANNELS = ["google", "meta", "x", "bing", "reddit", "other"] as const;
type Channel = typeof CHANNELS[number];
const REVENUE_TYPES = ["subscription", "one_time", "merch", "sponsorship", "adsense", "other"] as const;

// ─── Mobile Card Row helper ────────────────────────────────────────────────────
function MobileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-xs text-right max-w-[55%] break-words">{value}</span>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data, isLoading, refetch } = trpc.attribution.overview.useQuery({ startDate, endDate });
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No attribution data for this period.</p><p className="text-sm mt-1">Add ad spend entries and ensure tracking is live.</p></div>;
  }
  const totals = (data as any[]).reduce((acc, row) => ({
    spend: acc.spend + (row.spendCents ?? 0),
    revenue: acc.revenue + (row.revenueCents ?? 0),
    visitors: acc.visitors + (row.visitors ?? 0),
    conversions: acc.conversions + (row.conversions ?? 0),
  }), { spend: 0, revenue: 0, visitors: 0, conversions: 0 });
  const totalRoas = totals.spend > 0 ? totals.revenue / totals.spend : Infinity;
  const totalCpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Spend", value: fmtUsd(totals.spend) },
          { label: "Total Revenue", value: fmtUsd(totals.revenue) },
          { label: "Blended ROAS", value: fmtRoas(totalRoas) },
          { label: "Avg CPA", value: totalCpa > 0 ? fmtUsd(totalCpa) : "—" },
        ].map(k => (
          <Card key={k.label}>
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">{k.label}</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><p className="text-xl font-bold">{k.value}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Channel","Spend","Revenue","ROAS","Visitors","Conversions","CPA","Impressions","Clicks"].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(data as any[]).map(row => {
              const roas = row.spendCents > 0 ? row.revenueCents / row.spendCents : Infinity;
              const cpa = row.conversions > 0 ? row.spendCents / row.conversions : 0;
              return (
                <tr key={row.channel} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium capitalize">{row.channel}</td>
                  <td className="px-3 py-2">{fmtUsd(row.spendCents ?? 0)}</td>
                  <td className="px-3 py-2">{fmtUsd(row.revenueCents ?? 0)}</td>
                  <td className="px-3 py-2"><Badge variant={roas >= 2 ? "default" : "secondary"}>{fmtRoas(roas)}</Badge></td>
                  <td className="px-3 py-2">{(row.visitors ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{(row.conversions ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{cpa > 0 ? fmtUsd(cpa) : "—"}</td>
                  <td className="px-3 py-2">{(row.impressions ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{(row.clicks ?? 0).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {(data as any[]).map(row => {
          const roas = row.spendCents > 0 ? row.revenueCents / row.spendCents : Infinity;
          const cpa = row.conversions > 0 ? row.spendCents / row.conversions : 0;
          return (
            <Card key={row.channel}>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm capitalize">{row.channel}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <MobileRow label="Spend" value={fmtUsd(row.spendCents ?? 0)} />
                <MobileRow label="Revenue" value={fmtUsd(row.revenueCents ?? 0)} />
                <MobileRow label="ROAS" value={<Badge variant={roas >= 2 ? "default" : "secondary"}>{fmtRoas(roas)}</Badge>} />
                <MobileRow label="Visitors" value={(row.visitors ?? 0).toLocaleString()} />
                <MobileRow label="Conversions" value={(row.conversions ?? 0).toLocaleString()} />
                <MobileRow label="CPA" value={cpa > 0 ? fmtUsd(cpa) : "—"} />
                <MobileRow label="Impressions" value={(row.impressions ?? 0).toLocaleString()} />
                <MobileRow label="Clicks" value={(row.clicks ?? 0).toLocaleString()} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-3 h-3 mr-1" />Refresh</Button>
      </div>
    </div>
  );
}

// ─── Ad Spend ─────────────────────────────────────────────────────────────────
function AdSpendTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.attribution.adSpend.list.useQuery({ startDate, endDate });
  const createMut = trpc.attribution.adSpend.create.useMutation({
    onSuccess: () => { utils.attribution.adSpend.list.invalidate(); toast.success("Entry added"); setForm(emptyForm()); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.attribution.adSpend.delete.useMutation({
    onSuccess: () => { utils.attribution.adSpend.list.invalidate(); toast.success("Entry deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const emptyForm = () => ({ date: todayStr(), channel: "google" as Channel, platform: "", campaignName: "", spendCents: "", impressions: "", clicks: "", notes: "" });
  const [form, setForm] = useState(emptyForm());
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.platform.trim()) { toast.error("Platform is required"); return; }
    createMut.mutate({
      date: form.date, channel: form.channel, platform: form.platform.trim(),
      campaignName: form.campaignName.trim() || undefined,
      spendCents: Math.round(parseFloat(form.spendCents || "0") * 100),
      impressions: form.impressions ? parseInt(form.impressions) : undefined,
      clicks: form.clicks ? parseInt(form.clicks) : undefined,
      notes: form.notes.trim() || undefined,
    });
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Add Ad Spend Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Channel</Label>
              <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v as Channel }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Platform</Label><Input placeholder="e.g. Google Ads" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Campaign</Label><Input placeholder="optional" value={form.campaignName} onChange={e => setForm(f => ({ ...f, campaignName: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Spend ($)</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={form.spendCents} onChange={e => setForm(f => ({ ...f, spendCents: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Impressions</Label><Input type="number" min="0" placeholder="optional" value={form.impressions} onChange={e => setForm(f => ({ ...f, impressions: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Clicks</Label><Input type="number" min="0" placeholder="optional" value={form.clicks} onChange={e => setForm(f => ({ ...f, clicks: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Notes</Label><Input placeholder="optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="col-span-1 sm:col-span-2 md:col-span-4 flex justify-end">
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}Add Entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Date","Channel","Platform","Campaign","Spend","Impressions","Clicks","Notes",""].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {(data as any[] ?? []).length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No entries for this period</td></tr>
                ) : (data as any[]).map(row => (
                  <tr key={row.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2 capitalize">{row.channel}</td>
                    <td className="px-3 py-2">{row.platform}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.campaignName ?? "—"}</td>
                    <td className="px-3 py-2 font-medium">{fmtUsd(row.spendCents ?? 0)}</td>
                    <td className="px-3 py-2">{(row.impressions ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2">{(row.clicks ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[150px] truncate">{row.notes ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate({ id: row.id })} disabled={deleteMut.isPending}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {(data as any[] ?? []).length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No entries for this period</p>
            ) : (data as any[]).map(row => (
              <Card key={row.id}>
                <CardContent className="px-4 py-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm capitalize">{row.channel} — {row.platform}</p>
                      <p className="text-xs text-muted-foreground">{row.date}{row.campaignName ? ` · ${row.campaignName}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{fmtUsd(row.spendCents ?? 0)}</span>
                      <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate({ id: row.id })} disabled={deleteMut.isPending}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <MobileRow label="Impressions" value={(row.impressions ?? 0).toLocaleString()} />
                  <MobileRow label="Clicks" value={(row.clicks ?? 0).toLocaleString()} />
                  {row.notes && <MobileRow label="Notes" value={row.notes} />}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Revenue ──────────────────────────────────────────────────────────────────
function RevenueTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.attribution.revenue.list.useQuery({ startDate, endDate });
  const createMut = trpc.attribution.revenue.create.useMutation({
    onSuccess: () => { utils.attribution.revenue.list.invalidate(); toast.success("Revenue event added"); setForm(emptyForm()); },
    onError: (e) => toast.error(e.message),
  });
  const emptyForm = () => ({ amountCents: "", revenueType: "one_time" as typeof REVENUE_TYPES[number], description: "" });
  const [form, setForm] = useState(emptyForm());
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ amountCents: Math.round(parseFloat(form.amountCents || "0") * 100), revenueType: form.revenueType, description: form.description.trim() || undefined });
  };
  const total = useMemo(() => (data as any[] ?? []).reduce((s, r) => s + (r.amountCents ?? 0), 0), [data]);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Log Revenue Event</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Amount ($)</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amountCents} onChange={e => setForm(f => ({ ...f, amountCents: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Type</Label>
              <Select value={form.revenueType} onValueChange={v => setForm(f => ({ ...f, revenueType: v as typeof REVENUE_TYPES[number] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REVENUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Description</Label><Input placeholder="e.g. Sponsor payment Jan" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}Log Revenue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div> : (
        <>
          <div className="text-right text-sm font-medium">Period total: <span className="text-lg font-bold">{fmtUsd(total)}</span></div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Date","Amount","Type","Description","Channel","Session"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {(data as any[] ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No revenue events for this period</td></tr>
                ) : (data as any[]).map(row => (
                  <tr key={row.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2">{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2 font-medium">{fmtUsd(row.amountCents ?? 0)}</td>
                    <td className="px-3 py-2"><Badge variant="outline">{row.revenueType}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground">{row.description ?? "—"}</td>
                    <td className="px-3 py-2 capitalize">{row.channel ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.sessionId ? row.sessionId.slice(0, 8) + "…" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {(data as any[] ?? []).length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No revenue events for this period</p>
            ) : (data as any[]).map(row => (
              <Card key={row.id}>
                <CardContent className="px-4 py-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-sm">{fmtUsd(row.amountCents ?? 0)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline">{row.revenueType}</Badge>
                  </div>
                  {row.description && <MobileRow label="Description" value={row.description} />}
                  <MobileRow label="Channel" value={<span className="capitalize">{row.channel ?? "—"}</span>} />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Article Attribution ──────────────────────────────────────────────────────
function ArticleAttributionTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data, isLoading } = trpc.attribution.articleAttribution.useQuery({ startDate, endDate });
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  const rows = data as any[] ?? [];
  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Article Slug","Views","Conversions","Conv. Rate"].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No article attribution data for this period</td></tr>
            ) : rows.map(row => {
              const rate = row.views > 0 ? ((row.conversions / row.views) * 100).toFixed(1) : "0.0";
              return (
                <tr key={row.articleSlug} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs max-w-[300px] truncate">
                    <a href={`/article/${row.articleSlug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{row.articleSlug}</a>
                  </td>
                  <td className="px-3 py-2">{(row.views ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{(row.conversions ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2"><Badge variant={parseFloat(rate) > 1 ? "default" : "secondary"}>{rate}%</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">No article attribution data for this period</p>
        ) : rows.map(row => {
          const rate = row.views > 0 ? ((row.conversions / row.views) * 100).toFixed(1) : "0.0";
          return (
            <Card key={row.articleSlug}>
              <CardContent className="px-4 py-3">
                <a href={`/article/${row.articleSlug}`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-mono hover:underline block mb-2 truncate">{row.articleSlug}</a>
                <MobileRow label="Views" value={(row.views ?? 0).toLocaleString()} />
                <MobileRow label="Conversions" value={(row.conversions ?? 0).toLocaleString()} />
                <MobileRow label="Conv. Rate" value={<Badge variant={parseFloat(rate) > 1 ? "default" : "secondary"}>{rate}%</Badge>} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Real-Time ────────────────────────────────────────────────────────────────
function RealTimeTab() {
  const { data, isLoading, refetch } = trpc.attribution.recentSessions.useQuery({ limit: 50 });
  const sessions = data as any[] ?? [];
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Last 50 visitor sessions</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-3 h-3 mr-1" />Refresh</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Session","Channel","Landing Page","Referrer","Views","Duration","Scroll","Conversions","Started"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No sessions yet</td></tr>
                ) : sessions.map(s => {
                  const convFlags = [s.newsletterSignup && "newsletter", s.merchLead && "merch", s.affiliateClick && "affiliate", s.stripePurchase && "stripe"].filter(Boolean);
                  return (
                    <tr key={s.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-xs">{s.sessionId?.slice(0, 8)}…</td>
                      <td className="px-3 py-2 capitalize">{s.channel ?? "direct"}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate text-xs">{s.landingPage ?? "/"}</td>
                      <td className="px-3 py-2 max-w-[150px] truncate text-xs text-muted-foreground">{s.referrer ?? "—"}</td>
                      <td className="px-3 py-2">{s.pageViews ?? 1}</td>
                      <td className="px-3 py-2">{s.durationSeconds ? `${s.durationSeconds}s` : "—"}</td>
                      <td className="px-3 py-2">{s.maxScrollDepth ? `${s.maxScrollDepth}%` : "—"}</td>
                      <td className="px-3 py-2">
                        {convFlags.length > 0 ? convFlags.map(f => <Badge key={f as string} variant="default" className="mr-1 text-xs">{f}</Badge>) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{s.createdAt ? new Date(s.createdAt).toLocaleTimeString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sessions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No sessions yet</p>
            ) : sessions.map(s => {
              const convFlags = [s.newsletterSignup && "newsletter", s.merchLead && "merch", s.affiliateClick && "affiliate", s.stripePurchase && "stripe"].filter(Boolean);
              return (
                <Card key={s.id}>
                  <CardContent className="px-4 py-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-mono text-xs font-medium">{s.sessionId?.slice(0, 8)}…</p>
                        <p className="text-xs text-muted-foreground capitalize">{s.channel ?? "direct"} · {s.createdAt ? new Date(s.createdAt).toLocaleTimeString() : "—"}</p>
                      </div>
                      {convFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                          {convFlags.map(f => <Badge key={f as string} variant="default" className="text-xs">{f}</Badge>)}
                        </div>
                      )}
                    </div>
                    <MobileRow label="Landing" value={<span className="text-xs truncate">{s.landingPage ?? "/"}</span>} />
                    <MobileRow label="Views" value={s.pageViews ?? 1} />
                    <MobileRow label="Duration" value={s.durationSeconds ? `${s.durationSeconds}s` : "—"} />
                    <MobileRow label="Scroll" value={s.maxScrollDepth ? `${s.maxScrollDepth}%` : "—"} />
                    {s.referrer && <MobileRow label="Referrer" value={<span className="text-xs truncate">{s.referrer}</span>} />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Integrations ─────────────────────────────────────────────────────────────
function IntegrationsTab() {
  const utils = trpc.useUtils();
  const { data: syncStatus, isLoading: syncLoading } = trpc.attribution.sync.status.useQuery();
  const { data: adsense } = trpc.attribution.sync.adsenseStatus.useQuery();
  const { data: printify } = trpc.attribution.sync.printifyStatus.useQuery();
  const triggerMut = trpc.attribution.sync.trigger.useMutation({
    onSuccess: (r) => {
      utils.attribution.sync.status.invalidate();
      const msgs = Object.entries(r.results).map(([ch, res]: any) => `${ch}: ${res.success ? `$${((res.spendCents ?? 0) / 100).toFixed(2)}` : res.error}`).join(' | ');
      toast.success(`Sync complete — ${msgs || 'no data'}`);
    },
    onError: (e) => toast.error(e.message),
  });

  function StatusBadge({ configured, lastStatus }: { configured: boolean; lastStatus?: string | null }) {
    if (!configured) return <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>;
    if (!lastStatus) return <Badge variant="outline">Ready</Badge>;
    return lastStatus === 'success'
      ? <Badge className="bg-green-600 text-white">Active</Badge>
      : <Badge variant="destructive">Error</Badge>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ad Spend Sources</CardTitle>
            <Button size="sm" variant="outline" onClick={() => triggerMut.mutate({})} disabled={triggerMut.isPending}>
              {triggerMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Sync Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {syncLoading ? <Loader2 className="animate-spin" /> : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">{["Platform","Status","Last Sync","Last Date","Detail"].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>
                    {Object.entries(syncStatus ?? {}).map(([ch, s]: any) => (
                      <tr key={ch} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-2 capitalize font-medium">{ch === 'x' ? 'X (Twitter)' : ch === 'google' ? 'Google Ads' : 'Meta Ads'}</td>
                        <td className="px-3 py-2"><StatusBadge configured={s.configured} lastStatus={s.lastStatus} /></td>
                        <td className="px-3 py-2 text-muted-foreground">{s.lastRun ? new Date(s.lastRun).toLocaleString() : '—'}</td>
                        <td className="px-3 py-2">{s.lastDate ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">{s.lastDetail ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {Object.entries(syncStatus ?? {}).map(([ch, s]: any) => (
                  <div key={ch} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{ch === 'x' ? 'X (Twitter)' : ch === 'google' ? 'Google Ads' : 'Meta Ads'}</span>
                      <StatusBadge configured={s.configured} lastStatus={s.lastStatus} />
                    </div>
                    <MobileRow label="Last Sync" value={s.lastRun ? new Date(s.lastRun).toLocaleString() : '—'} />
                    <MobileRow label="Last Date" value={s.lastDate ?? '—'} />
                    {s.lastDetail && <MobileRow label="Detail" value={s.lastDetail} />}
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-3">Auto-syncs daily at 6:00 AM UTC. Configure credentials in Settings → Secrets.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue Sources</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { name: "Stripe", type: "Webhook", configured: false, lastActivity: "Automatic on payment" },
              { name: "Google AdSense", type: "API Pull", configured: adsense?.configured ?? false, lastActivity: adsense?.lastRun ? new Date(adsense.lastRun).toLocaleString() : '—', lastStatus: adsense?.lastStatus },
              { name: "Printify", type: "Webhook", configured: printify?.configured ?? false, lastActivity: printify?.lastWebhook ? new Date(printify.lastWebhook).toLocaleString() : '—', lastStatus: printify?.configured ? 'success' : null },
              { name: "Manual Entry", type: "Admin UI", configured: true, lastActivity: "Revenue tab → Log Revenue", lastStatus: 'success' },
            ].map(src => (
              <div key={src.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border rounded-lg p-3">
                <div>
                  <p className="font-medium text-sm">{src.name}</p>
                  <p className="text-xs text-muted-foreground">{src.type} · {src.lastActivity}</p>
                </div>
                <StatusBadge configured={src.configured} lastStatus={(src as any).lastStatus ?? null} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Webhook Endpoints</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Stripe Webhook URL</p>
            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">{window.location.origin}/api/webhooks/stripe</code>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Printify Webhook URL</p>
            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">{window.location.origin}/api/webhooks/printify</code>
          </div>
          <p className="text-xs text-muted-foreground">Register these URLs in your payment provider dashboards. Set STRIPE_WEBHOOK_SECRET and PRINTIFY_WEBHOOK_SECRET in Settings → Secrets.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Search Performance ───────────────────────────────────────────────────────
function SearchPerformanceTab() {
  const { data: syncStatus, refetch: refetchSync } = trpc.attribution.searchSyncStatus.useQuery();
  const triggerSync = trpc.attribution.triggerSearchSync.useMutation({
    onSuccess: () => { toast.success("Both engines synced"); refetchSync(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const triggerGscSync = trpc.attribution.triggerGscSync.useMutation({
    onSuccess: (r) => {
      if (r.success) toast.success(`GSC synced — ${r.queryRows ?? 0} queries, ${r.pageRows ?? 0} pages`);
      else toast.error(`GSC sync failed: ${r.error ?? "unknown error"}`);
      refetchSync();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const triggerBingSync = trpc.attribution.triggerBingSync.useMutation({
    onSuccess: (r) => {
      if (r.success) toast.success(`Bing synced — ${r.queryRows ?? 0} queries, ${r.pageRows ?? 0} pages`);
      else toast.error(`Bing sync failed: ${r.error ?? "unknown error"}`);
      refetchSync();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const [engine, setEngine] = useState<"all" | "google" | "bing">("all");
  const [type, setType] = useState<"all" | "query" | "page">("all");
  const thirtyAgo = useMemo(() => thirtyDaysAgo(), []);
  const today = useMemo(() => todayStr(), []);
  const { data: summary } = trpc.attribution.searchSummary.useQuery({ startDate: thirtyAgo, endDate: today });
  const { data: rows, isLoading } = trpc.attribution.searchPerformance.useQuery({ engine, type, startDate: thirtyAgo, endDate: today, limit: 200 });

  const fmtNum = (n: number | null | undefined) => n == null ? "—" : Number(n).toLocaleString();
  const fmtPct = (n: number | null | undefined) => n == null ? "—" : (Number(n) * 100).toFixed(1) + "%";
  const fmtPos = (n: number | null | undefined) => n == null ? "—" : Number(n).toFixed(1);

  const anySyncing = triggerSync.isPending || triggerGscSync.isPending || triggerBingSync.isPending;

  type SyncRow = { engine: string; configured: boolean; lastSync: string | null; lastQueryRows: number; lastPageRows: number; lastError: string | null; onSync: () => void; isSyncing: boolean };
  const syncRows: SyncRow[] = syncStatus
    ? [
        { engine: "Google (GSC)", ...(syncStatus as any).gsc, onSync: () => triggerGscSync.mutate(), isSyncing: triggerGscSync.isPending },
        { engine: "Bing", ...(syncStatus as any).bing, onSync: () => triggerBingSync.mutate(), isSyncing: triggerBingSync.isPending },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base">Search Engine Sync</CardTitle>
            <Button size="sm" variant="outline" onClick={() => triggerSync.mutate()} disabled={anySyncing} className="sm:flex-shrink-0">
              {triggerSync.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Sync Both
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!syncStatus ? (
            <p className="text-sm text-muted-foreground">Loading sync status…</p>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">{["Engine","Configured","Last Sync","Query Rows","Page Rows","Last Error",""].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>
                    {syncRows.map(s => (
                      <tr key={s.engine} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{s.engine}</td>
                        <td className="px-3 py-2">{s.configured ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.lastSync ? new Date(s.lastSync).toLocaleString() : "Never"}</td>
                        <td className="px-3 py-2">{s.lastQueryRows.toLocaleString()}</td>
                        <td className="px-3 py-2">{s.lastPageRows.toLocaleString()}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs max-w-xs truncate">{s.lastError ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={s.onSync} disabled={anySyncing}>
                            {s.isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Sync
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {syncRows.map(s => (
                  <div key={s.engine} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{s.engine}</span>
                      <div className="flex items-center gap-2">
                        {s.configured ? <Badge variant="default">Configured</Badge> : <Badge variant="secondary">Not configured</Badge>}
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2" onClick={s.onSync} disabled={anySyncing}>
                          {s.isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Sync
                        </Button>
                      </div>
                    </div>
                    <MobileRow label="Last Sync" value={s.lastSync ? new Date(s.lastSync).toLocaleString() : "Never"} />
                    <MobileRow label="Query Rows" value={s.lastQueryRows.toLocaleString()} />
                    <MobileRow label="Page Rows" value={s.lastPageRows.toLocaleString()} />
                    {s.lastError && <MobileRow label="Last Error" value={<span className="text-destructive text-xs">{s.lastError}</span>} />}
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-3">Data syncs daily at 7 AM UTC when Google Search Console or Bing Webmaster credentials are configured.</p>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["google", "bing"] as const).flatMap(eng => {
            const s = (summary as Record<string, { totalClicks?: number; totalImpressions?: number } | null>)[eng];
            return [
              { label: `${eng === "google" ? "Google" : "Bing"} Clicks`, value: fmtNum(s?.totalClicks) },
              { label: `${eng === "google" ? "Google" : "Bing"} Impressions`, value: fmtNum(s?.totalImpressions) },
            ];
          }).map(({ label, value }) => (
            <Card key={label}><CardContent className="pt-3 px-3 pb-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></CardContent></Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={engine} onValueChange={v => setEngine(v as typeof engine)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Engines</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="bing">Bing</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={v => setType(v as typeof type)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="query">Queries</SelectItem>
            <SelectItem value="page">Pages</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Performance Data (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">{["Engine","Date","Query / Page","Clicks","Impressions","CTR","Position"].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>
                    {!(rows as any[])?.length ? (
                      <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No data yet — configure API credentials and trigger a sync</td></tr>
                    ) : (rows as any[]).map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 capitalize">{r.engine}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.date}</td>
                        <td className="px-3 py-2 max-w-xs truncate text-xs">{r.query ?? r.pageUrl ?? "—"}</td>
                        <td className="px-3 py-2 font-medium">{fmtNum(r.clicks)}</td>
                        <td className="px-3 py-2">{fmtNum(r.impressions)}</td>
                        <td className="px-3 py-2">{fmtPct(r.ctr)}</td>
                        <td className="px-3 py-2">{fmtPos(r.position)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {!(rows as any[])?.length ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No data yet — configure API credentials and trigger a sync</p>
                ) : (rows as any[]).map((r, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono truncate max-w-[70%]">{r.query ?? r.pageUrl ?? "—"}</span>
                      <span className="text-xs text-muted-foreground capitalize ml-2">{r.engine}</span>
                    </div>
                    <MobileRow label="Date" value={r.date} />
                    <MobileRow label="Clicks" value={fmtNum(r.clicks)} />
                    <MobileRow label="Impressions" value={fmtNum(r.impressions)} />
                    <MobileRow label="CTR" value={fmtPct(r.ctr)} />
                    <MobileRow label="Position" value={fmtPos(r.position)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const TABS = ["Overview", "Ad Spend", "Revenue", "Article Attribution", "Real-Time", "Integrations", "Search Performance"] as const;
type Tab = typeof TABS[number];

export default function AdminAttribution() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [startDate, setStartDate] = useState(thirtyDaysAgo());
  const [endDate, setEndDate] = useState(todayStr());
  const [mobileTabOpen, setMobileTabOpen] = useState(false);

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Attribution & Revenue</h1>
            <p className="text-sm text-muted-foreground">Track ad spend, revenue, and channel performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-32 text-sm" />
            <span className="text-muted-foreground text-sm">→</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-32 text-sm" />
          </div>
        </div>

        {/* Mobile tab selector (dropdown) */}
        <div className="md:hidden relative">
          <button
            onClick={() => setMobileTabOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 border rounded-lg bg-background text-sm font-medium"
          >
            <span>{activeTab}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${mobileTabOpen ? "rotate-180" : ""}`} />
          </button>
          {mobileTabOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-lg bg-background shadow-lg overflow-hidden">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setMobileTabOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm border-b last:border-0 transition-colors ${activeTab === tab ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop tab bar */}
        <div className="hidden md:flex gap-1 border-b overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>

        <div>
          {activeTab === "Overview" && <OverviewTab startDate={startDate} endDate={endDate} />}
          {activeTab === "Ad Spend" && <AdSpendTab startDate={startDate} endDate={endDate} />}
          {activeTab === "Revenue" && <RevenueTab startDate={startDate} endDate={endDate} />}
          {activeTab === "Article Attribution" && <ArticleAttributionTab startDate={startDate} endDate={endDate} />}
          {activeTab === "Real-Time" && <RealTimeTab />}
          {activeTab === "Integrations" && <IntegrationsTab />}
          {activeTab === "Search Performance" && <SearchPerformanceTab />}
        </div>
      </div>
    </AdminLayout>
  );
}
