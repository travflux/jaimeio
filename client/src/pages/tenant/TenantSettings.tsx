import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { useLocation } from "wouter";
import SetupWizardModal from "@/components/wizard/SetupWizardModal";
import {
  Palette, Layout, Bot, CalendarClock, Image, Share2, Mail, Globe,
  DollarSign, Plug, Users, CreditCard, ChevronRight, ExternalLink
} from "lucide-react";

const CARDS = [
  { icon: Palette, title: "Branding", desc: "Site name, logo, colors, fonts, favicon, and publication identity.", tags: ["name", "logo", "colors"], route: "/admin/branding" },
  { icon: Layout, title: "Design & Theme", desc: "Publication template, masthead layout, and homepage sections.", tags: ["template", "masthead", "layout"], route: "/admin/branding" },
  { icon: Bot, title: "Content Engine", desc: "Article volume, AI model, writing style, and custom instructions.", tags: ["AI model", "articles", "tone"], route: "/admin/workflow" },
  { icon: CalendarClock, title: "Publishing", desc: "Auto-publish rules, approval workflow, schedule times, and timezone.", tags: ["schedule", "approval", "timezone"], route: "/admin/workflow" },
  { icon: Image, title: "Images", desc: "Image generation provider, style prompt, watermark, and article images.", tags: ["provider", "style", "watermark"], route: "/admin/workflow" },
  { icon: Share2, title: "Social Distribution", desc: "Blotato connection, platform accounts, posting schedule, and rules.", tags: ["blotato", "social", "schedule"], route: "/admin/distribution" },
  { icon: Mail, title: "Newsletter", desc: "Email newsletter, Resend connection, templates, and subscribers.", tags: ["email", "resend", "template"], route: "/admin/communications" },
  { icon: Globe, title: "SEO & GEO", desc: "Meta defaults, IndexNow, Google Search Console, and GEO optimization.", tags: ["SEO", "GEO", "indexing"], route: "/admin/seo" },
  { icon: DollarSign, title: "Monetization", desc: "Google AdSense, Amazon Associates, sponsorship, and merch store.", tags: ["ads", "sponsors", "revenue"], route: "/admin/adsense" },
  { icon: Plug, title: "Integrations", desc: "All API keys — AI providers, storage, analytics, and third-party services.", tags: ["API keys", "connections"], route: "/admin/api-access" },
  { icon: Users, title: "Users & Access", desc: "Team members, invitations, roles, and access control.", tags: ["team", "invite", "roles"], route: "/admin/users" },
  { icon: CreditCard, title: "Billing", desc: "Subscription plan, usage limits, payment method, and upgrade options.", tags: ["plan", "billing", "upgrade"], route: "/admin/billing" },
];

export default function TenantSettings() {
  const { settings } = useTenantContext();
  const [, navigate] = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <TenantLayout pageTitle="Settings" pageSubtitle="Configure every aspect of your publication">
      {/* Summary bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, background: "#f9fafb", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#6b7280", flexWrap: "wrap", border: "1px solid #e5e7eb" }}>
        <span>Site: <strong style={{ color: "#111827" }}>{settings?.brand_site_name || "—"}</strong></span>
        <span>Template: <strong style={{ color: "#111827", textTransform: "capitalize" }}>{settings?.brand_template || "editorial"}</strong></span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Color:
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: settings?.brand_color_primary || "#000", border: "1px solid #e5e7eb", display: "inline-block" }} />
          <strong style={{ color: "#111827" }}>{settings?.brand_color_primary || "—"}</strong>
        </span>
        <button onClick={() => setWizardOpen(true)}
          style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: "#374151" }}>
          Run Setup Wizard
        </button>
      </div>

      {/* Card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="settings-grid">
        {CARDS.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.title} onClick={() => navigate(card.route)}
              style={{ position: "relative", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2dd4bf"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}>
              <ChevronRight size={14} style={{ position: "absolute", top: 16, right: 16, color: "#d1d5db" }} />
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Icon size={18} style={{ color: "#2dd4bf" }} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{card.title}</h3>
              <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginBottom: 10, paddingRight: 16 }}>{card.desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {card.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6", color: "#9ca3af" }}>{tag}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <SetupWizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />

      <style>{`
        @media (max-width: 1024px) { .settings-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .settings-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </TenantLayout>
  );
}
