import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import { Link, useLocation } from "wouter";
import { useBranding } from "@/hooks/useBranding";
import {
  LayoutDashboard, FileText, Sparkles, FolderOpen, Mail,
  ArrowLeft, Loader2, LogOut, Menu, X, Key, TrendingUp,
  Filter, Send, Search, Newspaper, HelpCircle,
  Timer, Zap, Rss, Image, Video, Share2, Globe, Calendar, ShoppingCart, Scale,
  Package, Database, Palette, MessageSquareReply, ClipboardList, Twitter, ShoppingBag, BarChart2,
  ExternalLink, MessageSquare, CheckCircle2, ChevronDown, Layers, ListChecks, Hash, MousePointerClick, Building2, Eye, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import CommandPalette from "@/components/CommandPalette";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  external?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/workflow", icon: Timer, label: "Workflow" },
      { href: "/admin/settings/schedule", icon: Calendar, label: "Schedule" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/articles", icon: FileText, label: "Articles" },
      { href: "/admin/ai", icon: Sparkles, label: "AI Generator" },
      { href: "/admin/categories", icon: FolderOpen, label: "Categories" },
      { href: "/admin/tags", icon: Hash, label: "Tags" },
      { href: "/admin/pages", icon: FileText, label: "Pages" },
      { href: "/admin/source-feeds", icon: Filter, label: "Source Feeds" },
      { href: "/admin/feed-performance", icon: TrendingUp, label: "Feed Performance" },
      { href: "/admin/sources", icon: Layers, label: "Source Manager" },
      { href: "/admin/candidates", icon: ListChecks, label: "Candidates" },
      { href: "/admin/settings/generation", icon: Zap, label: "Generation" },
      { href: "/admin/settings/publishing", icon: Send, label: "Publishing" },
      { href: "/admin/settings/images", icon: Image, label: "Images" },
      { href: "/admin/image-licenses", icon: CheckCircle2, label: "Image Licenses" },
      { href: "/admin/image-sources", icon: Search, label: "Image Sources" },
      { href: "/admin/settings/category-balance", icon: Scale, label: "Category Balance" },
      { href: "/admin/settings/homepage", icon: Globe, label: "Homepage" },
    ],
  },
  {
    label: "Social",
    items: [
      { href: "/admin/social-distribution", icon: Rss, label: "Distribution" },
      { href: "/admin/x-queue", icon: Send, label: "X Post Queue" },
      { href: "/admin/x-reply-queue", icon: MessageSquareReply, label: "X Reply Queue" },
      { href: "/admin/standalone-tweets", icon: Twitter, label: "Standalone Tweets" },
      { href: "/admin/settings/social", icon: Share2, label: "Social Settings" },
      { href: "/admin/newsletter", icon: Mail, label: "Newsletter" },
      { href: "/admin/sms", icon: MessageSquare, label: "SMS" },
    ],
  },
  {
    label: "Monetization",
    items: [
      { href: "/admin/monetization", icon: DollarSign, label: "Overview" },
      { href: "/admin/settings/amazon", icon: ShoppingCart, label: "Amazon Ads" },
      { href: "/admin/settings/sponsor", icon: Zap, label: "Sponsor Settings" },
      { href: "/admin/sponsor-attribution", icon: MousePointerClick, label: "Sponsor Attribution" },
      { href: "/admin/settings/merch", icon: ShoppingBag, label: "Merch Store" },
      { href: "/admin/merch-pipeline", icon: Package, label: "Merch Pipeline" },
      { href: "/admin/settings/promotion", icon: TrendingUp, label: "Promotion" },
    ],
  },

  {
    label: "System",
    items: [
      { href: "/admin/mission-control", icon: Building2, label: "Mission Control" },
      { href: "/admin/support", icon: HelpCircle, label: "Support Articles" },
      { href: "/admin/performance", icon: BarChart2, label: "Performance Dashboard" },
      { href: "/admin/attribution", icon: BarChart2, label: "Attribution" },
      { href: "/admin/search-analytics", icon: TrendingUp, label: "Search Analytics" },
      { href: "/admin/ceo-directives", icon: ClipboardList, label: "CEO Directives" },
      { href: "/admin/settings/branding", icon: Palette, label: "Branding" },
      { href: "/admin/licenses", icon: Key, label: "Licenses" },
      { href: "/admin/deployment-updates", icon: Package, label: "Deployment Updates" },
      { href: "/admin/migration", icon: Database, label: "Migration" },
    ],
  },
  {
    label: "White Label",
    items: [
      { href: "/admin/domains", icon: Globe, label: "Client Domains" },
    ],
  },
];

// Flat list for matching (static — used for breadcrumbs/title lookup)
const allNavItems = navGroups.flatMap(g => g.items);



export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // On tenant subdomains, check tenant auth; on app domain, check super admin auth
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isAppDomain = hostname === "app.getjaime.io" || hostname === "localhost" || hostname === "127.0.0.1";
  const superAdminAuth = useAuth();
  const tenantMeQuery = trpc.tenantAuth.me.useQuery(undefined, { 
    retry: false, refetchOnWindowFocus: false, enabled: !isAppDomain 
  });
  
  // Use the appropriate auth based on domain
  const user = isAppDomain ? superAdminAuth.user : (tenantMeQuery.data || superAdminAuth.user);
  const loading = isAppDomain ? superAdminAuth.loading : (tenantMeQuery.isLoading && superAdminAuth.loading);
  const isAuthenticated = isAppDomain ? superAdminAuth.isAuthenticated : (!!tenantMeQuery.data || superAdminAuth.isAuthenticated);
  const logout = superAdminAuth.logout;
  const { branding } = useBranding();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Collapsible group state — auto-expand the group containing the active page
  const getActiveGroupLabel = () => {
    for (const group of navGroups) {
      if (group.items.some(item => location === item.href || (item.href !== "/admin" && location.startsWith(item.href)))) {
        return group.label;
      }
    }
    return "Overview";
  };
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set([getActiveGroupLabel()]));
  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // Generate breadcrumbs from current path
  const breadcrumbs = location.split("/").filter(Boolean).map((segment, index, array) => {
    const path = "/" + array.slice(0, index + 1).join("/");
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    return { path, label };
  });

  // Get current page title from nav items
  const currentPage = allNavItems.find(
    item => location === item.href || (item.href !== "/admin" && location.startsWith(item.href))
  );

  useEffect(() => { setSidebarOpen(false); }, [location]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading admin panel...</p>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    window.location.href = isAppDomain ? "/admin/login" : "/admin";
    return null;
  }

  // On app domain: require admin role. On tenant subdomains: any authenticated tenant user can access.
  if (isAppDomain && user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
          <Link href="/"><Button variant="outline">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  // On tenant subdomains, show a minimal sidebar with just key navigation
  const tenantSidebarContent = !isAppDomain ? (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to site
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent">
            <X className="w-5 h-5" />
          </button>
        </div>
        <h2 className="text-sm font-semibold text-sidebar-foreground">{branding.siteName || "Publication"}</h2>
        <p className="text-xs text-sidebar-foreground/50">Tenant Portal</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          <Link href="/admin/dashboard" className={"flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors " + (location === "/admin/dashboard" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50")}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/admin/articles" className={"flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors " + (location.startsWith("/admin/articles") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50")}>
            <FileText className="w-4 h-4" /> Articles
          </Link>
          <Link href="/admin/settings" className={"flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors " + (location === "/admin/settings" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50")}>
            <Settings className="w-4 h-4" /> Settings
          </Link>
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors">
            <Eye className="w-4 h-4" /> View Publication
          </Link>
        </div>
      </nav>
    </>
  ) : null;

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to site
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <div className="w-12 h-12 rounded-xl bg-[oklch(0.20_0.04_270)] flex items-center justify-center shrink-0 shadow-sm">
              <img
                src={branding.logoUrl}
                alt={branding.siteName}
                className="w-10 h-10 object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Newspaper className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <div>
            <h2 className="font-headline text-base font-bold leading-tight">{branding.siteName}</h2>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider font-medium">Admin</p>
          </div>
        </div>
      </div>

      {/* Setup Wizard — pinned at top for easy access */}
      <div className="px-3 pt-3 pb-1">
        <Link
          href="/admin/setup"
          className={`
            w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 border
            ${
              location === "/admin/setup" || location.startsWith("/admin/setup")
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
            }
          `}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">Setup Wizard</span>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 bg-primary/20 px-1.5 py-0.5 rounded">Start</span>
        </Link>
      </div>

      {/* Search trigger */}
      <div className="px-3 pt-1 pb-1">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/50 text-xs hover:bg-sidebar-accent transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden sm:inline-flex text-[10px] font-mono bg-sidebar px-1.5 py-0.5 rounded border border-sidebar-border">⌘K</kbd>
        </button>
      </div>

      {/* Nav groups — collapsible */}
      <nav className="flex-1 py-2 overflow-y-auto px-2">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items;
          // Hide the entire group if it has no visible items
          if (visibleItems.length === 0) return null;
          const isExpanded = expandedGroups.has(group.label);
          const hasActive = visibleItems.some(item => location === item.href || (item.href !== "/admin" && location.startsWith(item.href)));
          return (
            <div key={group.label} className={gi > 0 ? "mt-1" : ""}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  hasActive ? "text-primary" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
                } hover:bg-sidebar-accent/50`}
              >
                <span>{group.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
              </button>
              {isExpanded && (
                <div className="mt-0.5 mb-1">
                  {visibleItems.map(item => {
                    const isActive = !item.external && (location === item.href || (item.href !== "/admin" && location.startsWith(item.href)));
                    const cls = `
                          flex items-center gap-2.5 px-3 py-2 lg:py-1.5 text-[13px] rounded-lg mb-0.5 transition-all duration-150
                          ${isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          }
                        `;
                    return item.external ? (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cls}
                      >
                        <item.icon className="w-4 h-4 shrink-0 opacity-60" />
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cls}
                      >
                        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "" : "opacity-60"}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* CEO Dashboard moved to System nav group */}

      {/* User footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sidebar-accent transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary-foreground">{(user?.name || "A")[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{user?.name || "Admin"}</p>
            <p className="text-[10px] text-sidebar-foreground/50">Administrator</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); logout(); }}
            className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors opacity-0 group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      <div className="min-h-screen flex bg-muted/30">
        {/* Mobile header bar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md hover:bg-accent" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Newspaper className="w-3 h-3 text-primary-foreground" />
            </div>
            <h2 className="font-headline text-base font-bold">{currentPage?.label || "Admin"}</h2>
          </div>
          <button onClick={() => setCommandPaletteOpen(true)} className="p-1.5 rounded-md hover:bg-accent">
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 h-screen z-50 lg:z-auto
          w-64 lg:w-[240px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col shrink-0
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          {tenantSidebarContent || sidebarContent}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          <div className="p-4 lg:p-8 max-w-[1200px]">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 1 && (
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center gap-1.5">
                    {index > 0 && <span className="text-border">/</span>}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-foreground font-medium">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.path} className="hover:text-foreground transition-colors">{crumb.label}</Link>
                    )}
                  </div>
                ))}
              </nav>
            )}
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
