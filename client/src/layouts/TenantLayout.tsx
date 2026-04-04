import React, { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useBranding } from "@/hooks/useBranding";
import { useTheme } from "@/contexts/ThemeContext";
import CommandPalette from "@/components/CommandPalette";
import {
  LayoutDashboard, Palette, CreditCard, Users, Mail, Bell, Key, ExternalLink,
  GitBranch, FileText, PenSquare, CalendarDays, LayoutTemplate, FolderOpen,
  Tag, FileStack, Rss, BarChart2, Database, Image, Search, Globe2, Sparkles,
  Share2, List, TrendingUp, DollarSign, Megaphone, ShoppingCart, Star, BarChart,
  Store, Package, Ticket, BookOpen, ChevronRight, X, Menu,
  Twitter, Youtube, Inbox, Moon, Sun
} from "lucide-react";

interface TenantLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  section?: string;
  saveAction?: () => Promise<void>;
  headerActions?: ReactNode;
}

interface NavItem { icon: any; label: string; href: string; badge?: string; badgeColor?: string; external?: boolean; }
interface NavSection { label: string; key: string; items: NavItem[]; }

// Map each section key to its route prefixes
const sectionRoutes: Record<string, string[]> = {
  overview: ["/admin/dashboard", "/admin/branding", "/admin/billing", "/admin/users", "/admin/communications", "/admin/notifications", "/admin/api-access"],
  content: ["/admin/workflow", "/admin/articles", "/admin/calendar", "/admin/templates", "/admin/categories", "/admin/tags", "/admin/pages", "/admin/source-feeds", "/admin/x-listening", "/admin/youtube-listening", "/admin/candidates", "/admin/media-library"],
  seo: ["/admin/seo", "/admin/index-settings", "/admin/geo"],
  social: ["/admin/distribution", "/admin/post-queue", "/admin/social-performance"],
  monetization: ["/admin/revenue", "/admin/adsense", "/admin/amazon", "/admin/sponsorship", "/admin/sponsor-attribution", "/admin/merch-store", "/admin/merch-pipeline"],
  support: ["/admin/ticket"],
};

function getActiveSection(path: string): string {
  for (const [section, routes] of Object.entries(sectionRoutes)) {
    if (routes.some(r => path === r || path.startsWith(r + "/"))) return section;
  }
  return "overview";
}

export default function TenantLayout({ children, pageTitle, pageSubtitle, section, saveAction, headerActions }: TenantLayoutProps) {
  const [location] = useLocation();
  const { branding } = useBranding();
  const statsQuery = trpc.articles.stats.useQuery(undefined, { staleTime: 60000 });
  const pendingCount = statsQuery.data?.pending || 0;
  const pubName = branding.siteName || "Publication";

  // Set browser tab title to "{Publication} Portal"
  React.useEffect(() => {
    document.title = pubName + " Portal";
  }, [pubName]);

  // Set favicon to tenant's favicon
  React.useEffect(() => {
    const faviconUrl = branding.faviconUrl;
    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = faviconUrl;
    }
  }, [branding.faviconUrl]);
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const pubUrl = `https://${hostname}`;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Smart accordion: only one section open, follows active route
  const [expandedSection, setExpandedSection] = useState(() => getActiveSection(location));

  useEffect(() => {
    setExpandedSection(getActiveSection(location));
  }, [location]);

  // Command palette (Cmd+K / Ctrl+K)
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(o => !o); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSectionClick = (key: string) => {
    // Can't collapse the active section; clicking collapsed section expands it
    if (key !== expandedSection) setExpandedSection(key);
  };

  const navSections: NavSection[] = [
    { label: "OVERVIEW", key: "overview", items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
      { icon: Palette, label: "Branding", href: "/admin/branding" },
      { icon: CreditCard, label: "Billing", href: "/admin/billing" },
      { icon: Users, label: "Users", href: "/admin/users" },
      { icon: Mail, label: "Communications", href: "/admin/communications" },
      { icon: Bell, label: "Notifications", href: "/admin/notifications" },
      { icon: Key, label: "API Access", href: "/admin/api-access" },
      { icon: ExternalLink, label: "View Publication", href: pubUrl, external: true },
    ]},
    { label: "CONTENT", key: "content", items: [
      { icon: GitBranch, label: "Workflow", href: "/admin/workflow" },
      { icon: FileText, label: "Articles", href: "/admin/articles", badge: pendingCount > 0 ? String(pendingCount) : undefined, badgeColor: "#f59e0b" },
      { icon: PenSquare, label: "Create Article", href: "/admin/articles/create" },
      { icon: CalendarDays, label: "Content Calendar", href: "/admin/calendar" },
      { icon: LayoutTemplate, label: "Article Templates", href: "/admin/templates" },
      { icon: FolderOpen, label: "Categories", href: "/admin/categories" },
      { icon: Tag, label: "Tags", href: "/admin/tags" },
      { icon: FileStack, label: "Pages", href: "/admin/pages" },
      { icon: Rss, label: "Source Feeds", href: "/admin/source-feeds" },
      { icon: Twitter, label: "X Listening", href: "/admin/x-listening" },
      { icon: Youtube, label: "YouTube Listening", href: "/admin/youtube-listening" },
      { icon: Inbox, label: "Candidates", href: "/admin/candidates" },
      { icon: Image, label: "Media Library", href: "/admin/media-library" },
    ]},
    { label: "SEO & GEO", key: "seo", items: [
      { icon: Search, label: "SEO Settings", href: "/admin/seo" },
      { icon: Globe2, label: "Index Settings", href: "/admin/index-settings" },
      { icon: Sparkles, label: "GEO Settings", href: "/admin/geo" },
    ]},
    { label: "SOCIAL MEDIA", key: "social", items: [
      { icon: Share2, label: "Distribution", href: "/admin/distribution" },
      { icon: List, label: "Post Queue", href: "/admin/post-queue" },
      { icon: TrendingUp, label: "Performance", href: "/admin/social-performance" },
    ]},
    { label: "MONETIZATION", key: "monetization", items: [
      { icon: DollarSign, label: "Revenue Dashboard", href: "/admin/revenue" },
      { icon: Megaphone, label: "Google AdSense", href: "/admin/adsense" },
      { icon: ShoppingCart, label: "Amazon Affiliate", href: "/admin/amazon" },
      { icon: Star, label: "Sponsorship", href: "/admin/sponsorship" },
      { icon: BarChart, label: "Sponsor Attribution", href: "/admin/sponsor-attribution" },
      { icon: Store, label: "Merch Store", href: "/admin/merch-store" },
      { icon: Package, label: "Merch Pipeline", href: "/admin/merch-pipeline" },
    ]},
    { label: "SUPPORT", key: "support", items: [
      { icon: Ticket, label: "Open a Ticket", href: "/admin/ticket" },
      { icon: BookOpen, label: "Knowledgebase", href: "https://knowledgebase.getjaime.io", external: true },
    ]},
  ];

  const isActive = (href: string) => location === href || (href !== "/admin/dashboard" && location.startsWith(href));
  const initials = pubName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

  const handleSave = async () => {
    if (!saveAction) return;
    setSaving(true);
    try { await saveAction(); } finally { setSaving(false); }
  };

  const sidebar = (
    <aside style={{ width: 240, background: "#111827", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 50, color: "#9ca3af", fontSize: 12, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", color: "#2dd4bf", fontWeight: 700, fontSize: 14 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f9fafb" }}>{pubName}</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>ADMIN</div>
          </div>
        </div>
        <Link href="/admin/settings" style={{ display: "flex", alignItems: "center", gap: 8, background: "#1f2937", borderRadius: 6, padding: "8px 10px", textDecoration: "none", color: "#9ca3af", marginBottom: 8 }}>
          <CalendarDays size={14} />
          <span style={{ flex: 1 }}>Setup Wizard</span>
          <span style={{ background: "#2dd4bf", color: "#0f2d5e", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>START</span>
        </Link>
        <div onClick={() => setCmdOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f2937", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
          <Search size={14} style={{ color: "#6b7280" }} />
          <span style={{ color: "#6b7280", flex: 1 }}>Search...</span>
          <span style={{ fontSize: 9, color: "#4b5563", border: "1px solid #374151", borderRadius: 3, padding: "1px 4px" }}>⌘K</span>
        </div>
      </div>

      {/* Nav Sections */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {navSections.map(sec => {
          const isExpanded = expandedSection === sec.key;
          return (
            <div key={sec.key} style={{ marginBottom: 4 }}>
              <button onClick={() => handleSectionClick(sec.key)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: "none", background: "none", cursor: "pointer", padding: "6px 14px", color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                <ChevronRight size={10} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                {sec.label}
              </button>
              {isExpanded && (
                <div style={{ padding: "0 6px" }}>
                  {sec.items.map(item => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    if (item.external) {
                      return (
                        <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, textDecoration: "none", color: "#9ca3af", fontSize: 12, transition: "background 0.1s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#1f2937")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <Icon size={14} />{item.label}
                        </a>
                      );
                    }
                    return (
                      <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, textDecoration: "none", color: active ? "#ffffff" : "#9ca3af", background: active ? "#1f2937" : "transparent", borderLeft: active ? "2px solid #2dd4bf" : "2px solid transparent", fontSize: 12, transition: "background 0.1s" }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#1f2937"; }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                        <Icon size={14} style={{ color: active ? "#ffffff" : "#9ca3af" }} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge && <span style={{ background: item.badgeColor || "#6b7280", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>{item.badge}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#4b5563", textAlign: "center", lineHeight: 1.6 }}>
        POWERED BY JAIME.IO<br />A product of JANICCO
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
      <div className="tenant-sidebar-desktop" style={{ width: 240, flexShrink: 0 }}>{sidebar}</div>
      {sidebarOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} onClick={() => setSidebarOpen(false)} />}
      <div className="tenant-sidebar-mobile" style={{ display: "none", position: "fixed", left: 0, top: 0, zIndex: 50, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.2s" }}>{sidebar}</div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", marginLeft: 0 }}>
        <div style={{ height: 52, background: "#111827", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", color: "#fff", fontSize: 13, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="tenant-menu-btn" style={{ display: "none", background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4 }} onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <span style={{ fontWeight: 600 }}>{pubName} <span style={{ fontWeight: 400, color: "#9ca3af" }}>Portal</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12 }}>
            <span style={{ color: "#9ca3af" }}>{statsQuery.data?.total || 0} articles</span>
            <span style={{ color: "#9ca3af" }}>{statsQuery.data?.published || 0} published</span>
            <button onClick={() => { try { const ctx = document.querySelector("[data-theme-toggle]"); if (ctx) (ctx as any).click(); } catch {} const root = document.documentElement; const isDark = root.classList.contains("dark"); root.classList.toggle("dark"); localStorage.setItem("jaime-theme", isDark ? "light" : "dark") }}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 4 }} title="Toggle dark mode">
              {typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e", fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />Active
            </span>
          </div>
        </div>

        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 20px", fontSize: 11, color: "#9ca3af" }}>
          <span>Admin</span>
          {section && <><span style={{ color: "#d1d5db", margin: "0 6px" }}>/</span><span>{section}</span></>}
          {pageTitle && <><span style={{ color: "#d1d5db", margin: "0 6px" }}>/</span><span style={{ color: "#111827", fontWeight: 500 }}>{pageTitle}</span></>}
        </div>

        {pageTitle && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>{pageTitle}</h1>
              {pageSubtitle && <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{pageSubtitle}</p>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {headerActions}
              {saveAction && (
                <button onClick={handleSave} disabled={saving} style={{ height: 34, padding: "0 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <style>{`
        @media (max-width: 1024px) {
          .tenant-sidebar-desktop { display: none !important; }
          .tenant-sidebar-mobile { display: block !important; }
          .tenant-menu-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
