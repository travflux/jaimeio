import React, { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useBranding } from "@/hooks/useBranding";
import { useTenantContext } from "@/hooks/useTenantContext";
import { StagingBanner } from "@/components/StagingBanner";
import CommandPalette from "@/components/CommandPalette";
import SetupWizardModal from "@/components/wizard/SetupWizardModal";
import {
  LayoutDashboard, FileText, PenLine, Sparkles, Inbox, CalendarDays, Image,
  Rss, Share2, Send, Mail, BarChart2, TrendingUp, DollarSign,
  Settings, Users, CreditCard, LifeBuoy, ExternalLink, Search,
  ChevronRight, X, Menu, MessageCircle, PieChart
} from "lucide-react";

// Platform icons not in lucide — use generic
const Twitter = ({ size = 14, ...props }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
const Youtube = ({ size = 14, ...props }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>;

interface TenantLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  section?: string;
  saveAction?: () => Promise<void>;
  headerActions?: ReactNode;
}

interface NavItem { icon: any; label: string; href: string; external?: boolean; }
interface NavSection { label: string; key: string; icon: any; items: NavItem[]; }

const NAV_SECTIONS: NavSection[] = [
  { label: "CONTENT", key: "content", icon: FileText, items: [
    { icon: FileText, label: "Articles", href: "/admin/articles" },
    { icon: PenLine, label: "Create Article", href: "/admin/articles/create" },
    { icon: CalendarDays, label: "Content Calendar", href: "/admin/calendar" },
    { icon: Sparkles, label: "AI Generator", href: "/admin/generator" },
    { icon: CalendarDays, label: "Article Templates", href: "/admin/templates" },
  ]},
  { label: "SOURCES", key: "sources", icon: Rss, items: [
    { icon: Rss, label: "Source Feeds", href: "/admin/source-feeds" },
    { icon: Inbox, label: "Candidates", href: "/admin/candidates" },
    { icon: Twitter, label: "X Listening", href: "/admin/x-listening" },
    { icon: MessageCircle, label: "Reddit", href: "/admin/reddit-listening" },
    { icon: Youtube, label: "YouTube", href: "/admin/youtube-listening" },
    { icon: BarChart2, label: "Feed Performance", href: "/admin/feed-performance" },
    { icon: PieChart, label: "Category Balance", href: "/admin/category-balance" },
  ]},
  { label: "CONTENT ENGINE", key: "engine", icon: Sparkles, items: [
    { icon: Sparkles, label: "Writing & Voice", href: "/admin/content-engine" },
    { icon: Image, label: "Image Generation", href: "/admin/image-settings" },
    { icon: TrendingUp, label: "Production Loop", href: "/admin/workflow" },
    { icon: Share2, label: "Distribution", href: "/admin/distribution" },
    { icon: Search, label: "SEO & GEO", href: "/admin/seo" },
  ]},
  { label: "COMMUNICATIONS", key: "comms", icon: Mail, items: [
    { icon: Mail, label: "Newsletter", href: "/admin/newsletter" },
    { icon: MessageCircle, label: "SMS Templates", href: "/admin/sms-templates" },
  ]},
  { label: "DESIGN", key: "design", icon: Settings, items: [
    { icon: Settings, label: "Branding", href: "/admin/branding" },
    { icon: Settings, label: "Theme", href: "/admin/design" },
    { icon: FileText, label: "Pages", href: "/admin/pages" },
    { icon: PieChart, label: "Tags & Categories", href: "/admin/categories" },
  ]},
  { label: "MONETIZATION", key: "monetization", icon: DollarSign, items: [
    { icon: DollarSign, label: "Sponsorship", href: "/admin/sponsorship" },
    { icon: DollarSign, label: "AdSense", href: "/admin/adsense" },
    { icon: DollarSign, label: "Amazon", href: "/admin/amazon" },
    { icon: DollarSign, label: "Merch", href: "/admin/merch-store" },
  ]},
  { label: "ACCOUNT", key: "account", icon: Users, items: [
    { icon: Users, label: "Users", href: "/admin/users" },
    { icon: CreditCard, label: "Billing", href: "/admin/billing" },
    { icon: Settings, label: "API Access", href: "/admin/api-access" },
    { icon: LifeBuoy, label: "Support", href: "/admin/ticket" },
  ]},
];


function getActiveSection(path: string): string {
  for (const sec of NAV_SECTIONS) {
    if (sec.items.some(item => path === item.href || path.startsWith(item.href + "/"))) return sec.key;
  }
  if (path.startsWith("/admin/workflow") || path.startsWith("/admin/settings") || path.startsWith("/admin/branding") || path.startsWith("/admin/seo") || path.startsWith("/admin/geo")) return "settings";
  return "";
}

export default function TenantLayout({ children, pageTitle, pageSubtitle, section, saveAction, headerActions }: TenantLayoutProps) {
  const [location] = useLocation();
  const { branding } = useBranding();
  const { license } = useTenantContext();
  const isEnterprise = (license as any)?.tier === "enterprise";
  const statsQuery = trpc.articles.stats.useQuery(undefined, { staleTime: 60000 });
  const pendingCount = statsQuery.data?.pending || 0;
  const pubName = branding.siteName || "Publication";
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const pubUrl = "https://" + hostname;

  React.useEffect(() => { document.title = pubName + " Portal"; }, [pubName]);
  React.useEffect(() => {
    const faviconUrl = branding.faviconUrl;
    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = faviconUrl;
    }
  }, [branding.faviconUrl]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Collapsible sections — open the one containing the active route
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const active = getActiveSection(location);
    return active ? { [active]: true } : { content: true };
  });

  useEffect(() => {
    const active = getActiveSection(location);
    if (active) setOpenSections(prev => ({ ...prev, [active]: true }));
  }, [location]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(o => !o); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  const isActive = (href: string) => location === href;
  const initials = pubName.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();

  const handleSave = async () => { if (!saveAction) return; setSaving(true); try { await saveAction(); } finally { setSaving(false); } };

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
        <button onClick={() => setWizardOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1f2937", borderRadius: 6, padding: "8px 10px", border: "none", color: "#9ca3af", marginBottom: 8, cursor: "pointer", width: "100%", fontSize: 12 }}>
          <CalendarDays size={14} />
          <span style={{ flex: 1, textAlign: "left" }}>Setup Wizard</span>
          <span style={{ background: "#2dd4bf", color: "#0f2d5e", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>START</span>
        </button>
        <div onClick={() => setCmdOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f2937", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
          <Search size={14} style={{ color: "#6b7280" }} />
          <span style={{ color: "#6b7280", flex: 1 }}>Search...</span>
          <span style={{ fontSize: 9, color: "#4b5563", border: "1px solid #374151", borderRadius: 3, padding: "1px 4px" }}>&#8984;K</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {/* Dashboard — standalone top-level item */}
        <div style={{ padding: "0 6px", marginBottom: 4 }}>
          <Link href="/admin/dashboard" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, textDecoration: "none",
            color: isActive("/admin/dashboard") ? "#ffffff" : "#9ca3af",
            background: isActive("/admin/dashboard") ? "#1f2937" : "transparent",
            borderLeft: isActive("/admin/dashboard") ? "2px solid #2dd4bf" : "2px solid transparent",
            fontSize: 12, transition: "background 0.1s",
          }}
            onMouseEnter={e => { if (!isActive("/admin/dashboard")) e.currentTarget.style.background = "#1f2937"; }}
            onMouseLeave={e => { if (!isActive("/admin/dashboard")) e.currentTarget.style.background = "transparent"; }}>
            <LayoutDashboard size={14} style={{ color: isActive("/admin/dashboard") ? "#ffffff" : "#9ca3af" }} />
            <span style={{ flex: 1 }}>Dashboard</span>
          </Link>
        </div>

        {/* Collapsible sections */}
        {NAV_SECTIONS.map(sec => {
          const isOpen = openSections[sec.key] || false;
          const SectionIcon = sec.icon;
          return (
            <div key={sec.key} style={{ marginBottom: 2 }}>
              <button onClick={() => toggleSection(sec.key)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: "none", background: "none", cursor: "pointer", padding: "7px 14px", color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                <ChevronRight size={10} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                {sec.label}
              </button>
              {isOpen && (
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
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Enterprise-only: White Label section */}
        {isEnterprise && (() => {
          const wlOpen = openSections["whitelabel"] || false;
          const wlItems = [
            { icon: Settings, label: "White Label", href: "/admin/white-label" },
            { icon: Users, label: "Client Management", href: "/admin/clients" },
          ];
          return (
            <div style={{ marginBottom: 2 }}>
              <button onClick={() => toggleSection("whitelabel")} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: "none", background: "none", cursor: "pointer", padding: "7px 14px", color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                <ChevronRight size={10} style={{ transform: wlOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                WHITE LABEL
              </button>
              {wlOpen && (
                <div style={{ padding: "0 6px" }}>
                  {wlItems.map(item => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, textDecoration: "none", color: active ? "#ffffff" : "#9ca3af", background: active ? "#1f2937" : "transparent", borderLeft: active ? "2px solid #2dd4bf" : "2px solid transparent", fontSize: 12, transition: "background 0.1s" }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#1f2937"; }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                        <Icon size={14} style={{ color: active ? "#ffffff" : "#9ca3af" }} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}



        {/* View Publication */}
        <div style={{ padding: "0 6px", marginTop: 4 }}>
          <a href={pubUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, textDecoration: "none", color: "#9ca3af", fontSize: 13, fontWeight: 500, transition: "background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#1f2937")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <ExternalLink size={15} /> View Publication
          </a>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#4b5563", textAlign: "center", lineHeight: 1.6 }}>
        POWERED BY JAIME.IO<br />A product of JANICCO
      </div>
    </aside>
  );

  const isStagingEnv = typeof window !== "undefined" && (window as any).__JAIME_ENV === "staging";

  return (
    <>
    <StagingBanner />
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb", paddingTop: isStagingEnv ? 32 : 0 }}>
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
      <SetupWizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />

      <style>{`
        @media (max-width: 1024px) {
          .tenant-sidebar-desktop { display: none !important; }
          .tenant-sidebar-mobile { display: block !important; }
          .tenant-menu-btn { display: block !important; }
        }
      `}</style>
    </div>
    </>
  );
}
