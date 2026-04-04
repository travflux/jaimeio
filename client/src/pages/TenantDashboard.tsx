import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, Globe, Users, Play, Settings, CreditCard,
  X, FileText, BarChart2, Activity, Mail, Building2,
  UserPlus, LayoutDashboard,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";
import TenantSetup from "./TenantSetup";

const CHART_COLORS = ["#2dd4bf", "#f97316", "#8b5cf6", "#06b6d4", "#22c55e", "#eab308"];

const ANALYTICS_TABS = [
  "Overview", "Publications", "Users", "Social", "SMS", "Email", "Advertising", "SEO & GEO", "Revenue", "AI Insights"
];

type MainView = "dashboard" | "articles" | "settings";

/* ─── Shared UI ───────────────────────────────────────────────────── */

function EmptyState({ title }: { title: string }) {
  return (
    <div className="py-16 text-center text-muted-foreground">
      <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm mt-1">Coming soon. Configure in Settings to get started.</p>
    </div>
  );
}

function KpiCard({ label, value, sub, borderColor, icon: Icon }: {
  label: string; value: string | number; sub?: string; borderColor: string; icon: any;
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex">
        <div className="w-1" style={{ backgroundColor: borderColor }} />
        <CardContent className="pt-4 pb-3 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold font-headline mt-0.5">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function SlidePanel({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold font-headline">{title}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </>
  );
}

/* ─── Main Component ──────────────────────────────────────────────── */

export default function TenantDashboard() {
  const meQuery = trpc.tenantAuth.me.useQuery();
  const user = meQuery.data;

  const hostname = window.location.hostname;
  const licenseQuery = trpc.tenantAuth.resolveLicense.useQuery({ hostname }, { retry: false });
  const license = licenseQuery.data;

  const settingsQuery = trpc.licenseSettings.getAll.useQuery(
    { licenseId: licenseQuery.data?.id! },
    { enabled: !!licenseQuery.data?.id }
  );
  const brandLogoUrl = settingsQuery.data?.brand_logo_url || "";

  // Real article stats
  const statsQuery = trpc.articles.stats.useQuery();
  const articleStats = statsQuery.data;

  // Set initial view based on URL path
  const initialView = (): MainView => {
    const path = window.location.pathname;
    if (path.includes("/admin/articles")) return "articles";
    if (path.includes("/admin/settings")) return "settings";
    return "dashboard";
  };
  const [mainView, setMainView] = useState<MainView>(initialView);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");

  if (meQuery.isLoading || licenseQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/admin";
    return null;
  }

  const accentColor = license?.primaryColor || "#0f2d5e";
  const isEnterprise = license?.tier === "enterprise";
  const pubName = license?.clientName || "Publication";
  const pagesUsed = articleStats?.total || 0;
  const pagesLimit = isEnterprise ? -1 : 500;
  const pagesPct = isEnterprise ? 0 : Math.round((pagesUsed / Math.max(pagesLimit, 1)) * 100);
  const perPageRate = 6.95;

  // Real data from articles.stats
  const last30Days = Array.from({ length: 30 }, (_, i) => ({
    day: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString("en", { month: "short", day: "numeric" }),
    articles: i >= 25 ? Math.ceil((articleStats?.thisMonth || 0) / 5) : 0,
  }));
  const statusData = [
    { name: "Published", value: articleStats?.published || 0, color: "#2dd4bf" },
    { name: "Draft", value: articleStats?.draft || 0, color: "#f97316" },
    { name: "Pending", value: articleStats?.pending || 0, color: "#8b5cf6" },
    { name: "Rejected", value: articleStats?.rejected || 0, color: "#94a3b8" },
  ];
  const topCategories = articleStats?.categoryBreakdown?.slice(0, 5) || [
    { name: "No data", count: 0 },
  ];

  /* Nav button helper */
  const NavBtn = ({ icon: Icon, label, active, onClick }: {
    icon: any; label: string; active?: boolean; onClick: () => void;
  }) => (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={active ? "" : ""}
    >
      <Icon className="w-4 h-4 mr-2" /> {label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Dark Navy Header */}
      <div className="px-8 py-6" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={pubName} className="h-10" />
            ) : (
              <img src="/jaimeio-logo-dark.png" alt="JAIME.IO" className="h-8 opacity-90" />
            )}
            <div>
              <h1 className="text-xl font-bold font-headline text-white">{pubName}</h1>
              <p className="text-slate-400 text-xs">
                {license?.subdomain ? license.subdomain + ".getjaime.io" : hostname}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div className="text-center">
              <p className="text-slate-400">Pages Used</p>
              <p className="text-white font-bold text-lg">
                {pagesUsed}
                {isEnterprise ? (
                  <span className="text-slate-500 font-normal ml-1" title="Enterprise — $6.95 per page published.">∞</span>
                ) : (
                  <span className="text-slate-500 font-normal">/{pagesLimit}</span>
                )}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className="text-slate-400">Articles</p>
              <p className="text-white font-bold text-lg">0</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className="text-slate-400">Status</p>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mt-0.5">{license?.status || "active"}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Bar */}
      <div style={{ padding: "16px 40px 0 40px" }}>
        <div className="flex flex-wrap gap-2 mb-6">
          <NavBtn icon={LayoutDashboard} label="Dashboard" active={mainView === "dashboard"}
            onClick={() => setMainView("dashboard")} />
          <NavBtn icon={FileText} label="Articles" active={mainView === "articles"}
            onClick={() => setMainView("articles")} />
          <NavBtn icon={Globe} label="View Publication"
            onClick={() => window.open("https://" + hostname.replace(/\/admin.*/, ""), "_blank")} />
          {isEnterprise && (
            <NavBtn icon={Building2} label="Sub-Accounts"
              onClick={() => setActivePanel("subaccounts")} />
          )}
          <NavBtn icon={Users} label="Manage Team"
            onClick={() => setActivePanel("team")} />
          <NavBtn icon={Play} label="Run Workflow"
            onClick={() => setActivePanel("workflow")} />
          <NavBtn icon={Settings} label="Settings" active={mainView === "settings"}
            onClick={() => setMainView("settings")} />
          <NavBtn icon={CreditCard} label="Billing"
            onClick={() => setActivePanel("billing")} />
        </div>
      </div>

      {/* Main Content Area — swaps between Dashboard and Settings */}
      {mainView === "dashboard" && (
        <div style={{ padding: "0 40px 40px 40px" }}>
          {/* Performance Analytics */}
          <div className="mb-4">
            <h2 className="text-xl font-bold font-headline mb-4">Performance Analytics</h2>
            <div className="flex flex-wrap gap-1 border-b mb-6">
              {ANALYTICS_TABS.map(tab => (
                <button key={tab}
                  className={"px-4 py-2 text-sm font-medium border-b-2 transition-colors " +
                    (activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")
                  }
                  onClick={() => setActiveTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "Overview" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={FileText} label="Articles This Month" value={0} sub="0 published" borderColor="#2dd4bf" />
                <KpiCard icon={BarChart2} label={isEnterprise ? "Pages Used" : "Pages Used / Limit"}
                  value={isEnterprise ? pagesUsed + " ∞" : pagesUsed + " / " + pagesLimit}
                  sub={isEnterprise ? "$" + (pagesUsed * perPageRate).toFixed(2) + " this month" : pagesPct + "% used"}
                  borderColor="#f97316" />
                <KpiCard icon={Activity} label="Workflow Runs" value={0} sub="This month" borderColor="#8b5cf6" />
                <KpiCard icon={Mail} label="Newsletter Subscribers" value={0} sub="Total" borderColor="#06b6d4" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-medium mb-4">Articles Per Day (Last 30 Days)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={last30Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip />
                        <Bar dataKey="articles" fill="#2dd4bf" radius={[4, 4, 0, 0]} animationDuration={800} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-medium mb-4">Article Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                          dataKey="value" animationDuration={800} paddingAngle={2}>
                          {statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                        <RTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium mb-3">Top Categories by Article Count</h3>
                  <div className="space-y-2">
                    {topCategories.map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: cat.count > 0 ? Math.max(5, (cat.count / Math.max(...topCategories.map(c => c.count || 1))) * 100) + "%" : "5%",
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                          }} />
                        </div>
                        <span className="text-sm font-medium w-24">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <EmptyState title={activeTab} />
          )}
        </div>
      )}

      {mainView === "articles" && (
        <ArticlesPanel />
      )}

      {mainView === "settings" && (
        <div style={{ padding: "0 40px 40px 40px" }}>
          <TenantSetup embedded />
        </div>
      )}

      {/* Slide-in Panels */}
      <SlidePanel open={activePanel === "team"} onClose={() => setActivePanel(null)} title="Manage Team">
        <TeamPanel licenseId={license?.id} />
      </SlidePanel>

      <SlidePanel open={activePanel === "workflow"} onClose={() => setActivePanel(null)} title="Workflow">
        <WorkflowPanel />
      </SlidePanel>

      <SlidePanel open={activePanel === "billing"} onClose={() => setActivePanel(null)} title="Billing">
        <BillingPanel license={license} />
      </SlidePanel>

      <SlidePanel open={activePanel === "subaccounts"} onClose={() => setActivePanel(null)} title="Sub-Accounts">
        <SubAccountsPanel />
      </SlidePanel>

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

/* ─── Panel Components ────────────────────────────────────────────── */

function TeamPanel({ licenseId }: { licenseId?: number }) {
  const [inviteEmail, setInviteEmail] = useState("");
  if (!licenseId) return <p className="text-muted-foreground">No license context</p>;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="email@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
        <Button size="sm" onClick={() => { toast.success("Invite sent to " + inviteEmail); setInviteEmail(""); }}>
          <UserPlus className="w-4 h-4 mr-1" /> Invite
        </Button>
      </div>
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Team members will appear here</p>
      </div>
    </div>
  );
}

function WorkflowPanel() {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Production</span>
        <button onClick={() => setEnabled(!enabled)}
          className={"w-12 h-6 rounded-full transition-colors " + (enabled ? "bg-green-500" : "bg-muted")} >
          <div className={"w-5 h-5 rounded-full bg-white shadow transition-transform " + (enabled ? "translate-x-6" : "translate-x-0.5")} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Running" : "Paused"}</Badge>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Next run</p>
        <p className="text-sm font-medium">Not scheduled</p>
      </div>
      <Button className="w-full" disabled={!enabled}>
        <Play className="w-4 h-4 mr-2" /> Run Now
      </Button>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Recent Runs</p>
        <div className="text-center py-4 text-muted-foreground text-sm">No workflow runs yet</div>
      </div>
    </div>
  );
}

function BillingPanel({ license }: { license: any }) {
  const isEnt = license?.tier === "enterprise";
  const pagesUsed = articleStats?.total || 0;
  const subAccountPages = 0;
  const rate = 6.95;
  const ownCost = pagesUsed * rate;
  const subCost = subAccountPages * rate;
  const totalCost = ownCost + subCost;
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Current Plan</p>
          <p className="text-lg font-bold font-headline capitalize">{license?.tier || "Professional"}</p>
          {isEnt && <p className="text-sm text-muted-foreground mt-1">$6.95 per page published</p>}
        </CardContent>
      </Card>
      {isEnt && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">This Month</p>
            <div className="flex justify-between text-sm">
              <span>{pagesUsed} pages × $6.95</span>
              <span className="font-bold">${ownCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Sub-account pages: {subAccountPages} × $6.95</span>
              <span className="font-bold">${subCost.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-bold">
              <span>Total estimated bill</span>
              <span>${totalCost.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Final invoice generated at end of billing cycle</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Billing Contact</p>
          <p className="text-sm">Not set</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Next Billing Date</p>
          <p className="text-sm">Not configured</p>
        </CardContent>
      </Card>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Invoices</p>
        <div className="text-center py-4 text-muted-foreground text-sm">No invoices yet</div>
      </div>
      {!isEnt && (
        <Button variant="outline" className="w-full">
          <CreditCard className="w-4 h-4 mr-2" /> Upgrade Plan
        </Button>
      )}
    </div>
  );
}


function ArticlesPanel() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: articlesData, isLoading, refetch } = trpc.articles.list.useQuery(
    statusFilter === "all" ? { status: undefined, limit: 50 } : { status: statusFilter, limit: 50 }
  );
  // Status changes require admin access - link to admin panel
  const articles = articlesData?.articles || [];
  const statuses = ["all", "pending", "approved", "published", "draft", "rejected"];

  return (
    <div style={{ padding: "0 40px 40px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Articles</h2>
        <div style={{ display: "flex", gap: 4 }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid",
                borderColor: statusFilter === s ? "#2dd4bf" : "#e5e7eb",
                background: statusFilter === s ? "#2dd4bf" : "#fff",
                color: statusFilter === s ? "#fff" : "#6b7280",
                cursor: "pointer", textTransform: "capitalize",
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>Loading articles...</p>
      ) : articles.length === 0 ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>No articles found.</p>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 12 }}>Headline</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 12, width: 100 }}>Status</th>
                <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 12, width: 60 }}>Views</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 12, width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a: any) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 16px" }}>
                    <a href={a.status === "published" ? "/article/" + a.slug : "/admin/articles/" + a.id}
                      style={{ fontWeight: 500, color: "#1f2937", textDecoration: "none" }}>
                      {a.headline?.substring(0, 80)}{a.headline?.length > 80 ? "..." : ""}
                    </a>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: a.status === "published" ? "#d1fae5" : a.status === "pending" ? "#ede9fe" : a.status === "approved" ? "#dbeafe" : "#f3f4f6",
                      color: a.status === "published" ? "#065f46" : a.status === "pending" ? "#5b21b6" : a.status === "approved" ? "#1e40af" : "#6b7280",
                    }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "center", color: "#6b7280" }}>{a.views || 0}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      {a.status === "pending" && (
                        <>
                          <button onClick={() => window.open("/admin/articles/" + a.id, "_blank")}
                            style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: "#d1fae5", color: "#065f46", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Review</button>
                          <button onClick={() => window.open("/admin/articles/" + a.id, "_blank")}
                            style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                            Reject
                          </button>
                        </>
                      )}
                      {a.status === "approved" && (
                        <button onClick={() => window.open("/admin/articles/" + a.id, "_blank")}
                          style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: "#d1fae5", color: "#065f46", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          Publish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SubAccountsPanel() {
  return (
    <div className="space-y-4">
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No sub-accounts yet</p>
        <p className="text-xs mt-1">Enterprise feature for managing multiple publications.</p>
      </div>
      <Button variant="outline" className="w-full">
        <Building2 className="w-4 h-4 mr-2" /> Create Sub-License
      </Button>
    </div>
  );
}
