import React, { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Shield, Users, ScrollText, FileText,
  BarChart3, ClipboardList, ChevronRight, Menu, X
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Mission Control", href: "/superadmin" },
  { icon: FileText, label: "Licenses", href: "/superadmin/licenses" },
  { icon: Users, label: "Staff Accounts", href: "/superadmin/staff" },
  { icon: BarChart3, label: "Performance", href: "/superadmin/performance" },
  { icon: ClipboardList, label: "Generation Log", href: "/superadmin/generation-log" },
  { icon: ScrollText, label: "Impersonation Log", href: "/superadmin/impersonation-log" },
];

export default function AdminLayout({ children, pageTitle, pageSubtitle }: AdminLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/superadmin") return location === "/superadmin";
    return location === href || location.startsWith(href + "/");
  };

  const sidebar = (
    <aside style={{ width: 240, background: "#0f172a", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 50, color: "#94a3b8", fontSize: 13 }}>
      {/* Header */}
      <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>JAIME.IO</div>
            <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.1em" }}>SUPER ADMIN</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8,
              textDecoration: "none", fontSize: 13, fontWeight: active ? 600 : 400, transition: "all 0.15s",
              color: active ? "#ffffff" : "#94a3b8",
              background: active ? "rgba(99,102,241,0.15)" : "transparent",
              borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#e2e8f0"; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#475569", textAlign: "center" }}>
        JAIME.IO PLATFORM ADMIN
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <div className="sa-sidebar-desktop" style={{ width: 240, flexShrink: 0 }}>{sidebar}</div>
      {sidebarOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} onClick={() => setSidebarOpen(false)} />}
      <div className="sa-sidebar-mobile" style={{ display: "none", position: "fixed", left: 0, top: 0, zIndex: 50, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.2s" }}>{sidebar}</div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{ height: 56, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="sa-menu-btn" style={{ display: "none", background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4 }} onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Super Admin</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e", fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
              Platform Online
            </span>
          </div>
        </div>

        {/* Page header */}
        {pageTitle && (
          <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 24px" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>{pageTitle}</h1>
            {pageSubtitle && <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>{pageSubtitle}</p>}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>{children}</div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .sa-sidebar-desktop { display: none !important; }
          .sa-sidebar-mobile { display: block !important; }
          .sa-menu-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}