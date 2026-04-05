import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Building2, Users, Key, TrendingUp, Plus, FileText,
  CheckCircle2, AlertCircle, Clock, XCircle, ChevronDown,
  Trash2, UserPlus, Globe, ExternalLink, DollarSign, Loader2,
} from "lucide-react";

/* ── Tier configs ──────────────────────────────────────────────── */
const tierColors: Record<string, string> = {
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  professional: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  enterprise: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};
const statusConfig: Record<string, { icon: any; color: string }> = {
  active:    { icon: CheckCircle2, color: "text-green-600" },
  expired:   { icon: Clock,        color: "text-yellow-600" },
  suspended: { icon: AlertCircle,  color: "text-red-600" },
  cancelled: { icon: XCircle,      color: "text-gray-500" },
};

/* ── KPI Card ──────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold font-headline mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Inline User Panel ─────────────────────────────────────────── */
function UserPanel({ licenseId }: { licenseId: number }) {
  const usersQuery = trpc.userManagement.listByLicense.useQuery({ licenseId });
  const users = usersQuery.data ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "" });

  const createMut = trpc.userManagement.create.useMutation({
    onSuccess: () => { toast.success("User added"); usersQuery.refetch(); setShowAdd(false); setForm({ email: "", name: "", password: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.userManagement.delete.useMutation({
    onSuccess: () => { toast.success("User removed"); usersQuery.refetch(); },
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team ({users.length})</p>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>
      {showAdd && (
        <div className="flex gap-2 items-end">
          <Input placeholder="Name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="h-8 text-xs" />
          <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="h-8 text-xs" />
          <Input placeholder="Password" type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} className="h-8 text-xs" />
          <Button size="sm" className="h-8 shrink-0" disabled={createMut.isPending}
            onClick={() => createMut.mutate({ licenseId, ...form, role: "editor" })}>
            {createMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
          </Button>
        </div>
      )}
      {users.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No users yet</p>
      ) : (
        <div className="divide-y">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between py-1.5 text-xs">
              <div>
                <span className="font-medium">{u.name}</span>
                <span className="text-muted-foreground ml-2">{u.email}</span>
                {u.lastLoginAt && (
                  <span className="text-muted-foreground ml-2">Last login: {new Date(u.lastLoginAt).toLocaleDateString()}</span>
                )}
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                onClick={() => { if (confirm("Remove user " + u.email + "?")) deleteMut.mutate({ id: u.id }); }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Create License Panel ──────────────────────────────────────── */
function CreateLicensePanel({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientName: "", email: "", domain: "", subdomain: "",
    tier: "professional" as "starter" | "professional" | "enterprise",
    maxUsers: 10, notes: "",
    ownerName: "", ownerEmail: "", ownerPassword: "",
  });
  const [error, setError] = useState("");

  const createLicense = trpc.licenseManagement.create.useMutation({
    onError: (e) => setError(e.message),
  });
  const createUser = trpc.userManagement.create.useMutation();

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await createLicense.mutateAsync({
        clientName: form.clientName,
        email: form.email,
        domain: form.domain || form.subdomain + ".getjaime.io",
        subdomain: form.subdomain,
        tier: form.tier,
        maxUsers: form.maxUsers,
        notes: form.notes || undefined,
      });
      // Now find the license ID and create the owner user
      // We need to refetch to get the ID
      toast.success("License created: " + result.licenseKey);
      onCreated();
      setOpen(false);
      setForm({ clientName: "", email: "", domain: "", subdomain: "", tier: "professional", maxUsers: 10, notes: "", ownerName: "", ownerEmail: "", ownerPassword: "" });
    } catch {}
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" className="w-full border-dashed h-12">
        <Plus className="w-4 h-4 mr-2" /> Create New License
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-headline flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create New License
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Publication Name</label>
              <Input value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder="Acme News" required className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Contact Email</label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="admin@acme.com" required className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Subdomain</label>
              <div className="flex items-center gap-1">
                <Input value={form.subdomain} onChange={e => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="acme" required className="h-9 text-sm font-mono flex-1" />
                <span className="text-xs text-muted-foreground shrink-0">.getjaime.io</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">License Type</label>
              <select value={form.tier} onChange={e => set("tier", e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm h-9">
                <option value="enterprise">Enterprise</option>
                <option value="professional">Professional</option>
                <option value="starter">Starter</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Max Users</label>
              <Input type="number" value={form.maxUsers} onChange={e => set("maxUsers", parseInt(e.target.value) || 5)} min={1} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Custom Domain (optional)</label>
              <Input value={form.domain} onChange={e => set("domain", e.target.value)} placeholder="news.acme.com" className="h-9 text-sm font-mono" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createLicense.isPending}>
              {createLicense.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Create License
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Main Mission Control Page ─────────────────────────────────── */
export default function MissionControl() {
  const statsQuery = trpc.licenseManagement.stats.useQuery();
  const licensesQuery = trpc.licenseManagement.list.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const stats = statsQuery.data;
  const licenses = licensesQuery.data ?? [];
  const providersData = trpc.system.getLLMProviders.useQuery().data;
  const testLLMMut = trpc.system.testLLMRouting.useMutation();

  const activeLicenses = licenses.filter((l: any) => l.status === "active");

  const deleteMut = trpc.licenseManagement.delete.useMutation({
    onSuccess: () => { toast.success("License cancelled"); licensesQuery.refetch(); statsQuery.refetch(); },
  });

  const tierSummary = stats?.tierBreakdown?.map((t: any) => `${t.count} ${t.tier}`).join(" / ") || "";

  return (
    <div className="min-h-screen">
      {/* ── Dark Header ─────────────────────────────────────────── */}
      <div className="px-8 py-6"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/jaimeio-logo-dark.png" alt="JAIME.IO" className="h-8 opacity-90" />
            <div>
              <h1 className="text-xl font-bold font-headline text-white">Mission Control</h1>
              <p className="text-slate-400 text-xs">Platform administration</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div className="text-center">
              <p className="text-slate-400">Licenses</p>
              <p className="text-white font-bold text-lg">{stats?.totalLicenses ?? "..."}</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className="text-slate-400">Active</p>
              <p className="text-emerald-400 font-bold text-lg">{stats?.activeLicenses ?? "..."}</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className="text-slate-400">Users</p>
              <p className="text-white font-bold text-lg">{stats?.totalUsers ?? "..."}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '200px', paddingTop: '40px' }}>
      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard icon={Key} label="Total Licenses" value={stats?.totalLicenses ?? "..."} sub={tierSummary}
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <KpiCard icon={CheckCircle2} label="Active" value={stats?.activeLicenses ?? "..."}
          color="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
        <KpiCard icon={FileText} label="Articles (All)" value="-" sub="This month"
          color="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
        <KpiCard icon={Users} label="Total Users" value={stats?.totalUsers ?? "..."}
          color="bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" />
        <KpiCard icon={DollarSign} label="MRR" value="-" sub="Coming soon"
          color="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <KpiCard icon={TrendingUp} label="New This Month" value="-"
          color="bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" />
      </div>

      {/* ── Tenant Table ────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-headline">All Publications</CardTitle>
            <span className="text-xs text-muted-foreground">{licenses.length} total</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {licenses.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Building2 className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-medium">No publications yet</p>
              <p className="text-sm">Create your first license below.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-medium">Publication</th>
                    <th className="text-left px-4 py-2.5 font-medium">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Users</th>
                    <th className="text-left px-4 py-2.5 font-medium">Pages</th>
                    <th className="text-left px-4 py-2.5 font-medium">Created</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((l: any) => {
                    const sc = statusConfig[l.status] || statusConfig.active;
                    const StatusIcon = sc.icon;
                    const isExpanded = expandedId === l.id;
                    return (
                      <>
                        <tr key={l.id} className={"border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors" + (isExpanded ? " bg-muted/20" : "")}
                          onClick={() => setExpandedId(isExpanded ? null : l.id)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div>
                                <p className="font-medium">{l.clientName}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {l.subdomain ? l.subdomain + ".getjaime.io" : l.domain}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className={tierColors[l.tier] || ""}>{l.tier}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <StatusIcon className={"w-3.5 h-3.5 " + sc.color} />
                              <span className="capitalize text-xs">{l.status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{l.userCount}</td>
                          <td className="px-4 py-3 text-center">
                            {l.tier === "enterprise" ? (
                              <span title="Enterprise — billed per page at $6.95" className="cursor-help">{"\u221e"}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">0 / 500</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                              {l.subdomain && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                                  <a href={"https://" + l.subdomain + ".getjaime.io"} target="_blank" rel="noopener">
                                    <ExternalLink className="w-3 h-3 mr-1" /> Visit
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                                onClick={() => { if (confirm("Cancel license for " + l.clientName + "?")) deleteMut.mutate({ id: l.id }); }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                              <ChevronDown className={"w-4 h-4 text-muted-foreground transition-transform " + (isExpanded ? "rotate-180" : "")} />
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={l.id + "-detail"}>
                            <td colSpan={7} className="px-4 py-4 bg-muted/10 border-b">
                              <div className="grid grid-cols-4 gap-4 mb-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground block">License Key</span>
                                  <span className="font-mono">{l.licenseKey}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Contact</span>
                                  <span>{l.email}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Max Users</span>
                                  <span>{l.maxUsers}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Domain</span>
                                  <span className="font-mono">{l.domain}</span>
                                </div>
                              </div>
                              <UserPanel licenseId={l.id} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create License Panel ────────────────────────────────── */}
      <CreateLicensePanel onCreated={() => { licensesQuery.refetch(); statsQuery.refetch(); }} />
      </div>

      {/* ── AI Provider Status ──────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-headline">AI Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {providersData && Object.entries(providersData).map(([name, info]: [string, any]) => (
              <div key={name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${info.available ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-sm capitalize font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">{info.model}</span>
                </div>
                <Badge variant={info.available ? "default" : "outline"} className="text-xs">
                  {info.available ? `$${info.costPer1k}/article` : "Not configured"}
                </Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3"
            onClick={() => testLLMMut.mutate()} disabled={testLLMMut.isPending}>
            {testLLMMut.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testing...</> : "Test LLM Routing"}
          </Button>
          {testLLMMut.data && (
            <p className="text-xs text-muted-foreground mt-2">
              Using <strong>{testLLMMut.data.provider}</strong> — "{testLLMMut.data.response?.substring(0, 60)}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div style={{ background: "#0f2d5e", padding: "16px 0", textAlign: "center" as const }}>
        <p style={{ color: "white", fontSize: 12, margin: 0 }}>
          POWERED BY JAIME.IO &nbsp;|&nbsp; A product of JANICCO &nbsp;|&nbsp; Need support?{" "}
          <a href="mailto:support@janicco.com" style={{ color: "#2dd4bf", textDecoration: "underline" }}>support@janicco.com</a>
        </p>
      </div>
    </div>
  );
}
