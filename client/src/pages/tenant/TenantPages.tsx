import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { ExternalLink } from "lucide-react";

const PAGES = [
  { type: "advertise", name: "Advertise", path: "/advertise" },
  { type: "privacy", name: "Privacy Policy & Terms", path: "/privacy" },
  { type: "contact", name: "Contact", path: "/contact" },
  { type: "about", name: "About", path: "/about" },
  { type: "sitemap", name: "Site Map", path: "/sitemap-page" },
];

export default function TenantPages() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string|null>(null);
  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  useEffect(() => { if (init) setS(init); }, [init]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));

  const savePage = async (type: string) => {
    if (!licenseId) return;
    const keys = ["_title", "_content", "_meta_title", "_meta_description", "_show_in_footer"];
    const settings: Record<string, string> = {};
    keys.forEach(k => { const key = "page_" + type + k; if (s[key] !== undefined) settings[key] = s[key]; });
    await saveMut.mutateAsync({ licenseId, settings });
  };

  return (
    <TenantLayout pageTitle="Pages" pageSubtitle="Edit publication pages" section="Content">
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {PAGES.map(p => (
          <div key={p.type}>
            <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontWeight: 500, flex: 1, fontSize: 13 }}>{p.name}</span>
              <span style={{ color: "#6b7280", fontSize: 12, marginRight: 12 }}>{p.path}</span>
              <a href={"https://" + hostname + p.path} target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af", marginRight: 8 }}><ExternalLink size={14} /></a>
              <button onClick={() => setExpanded(expanded === p.type ? null : p.type)} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>
                {expanded === p.type ? "Close" : "Edit"}
              </button>
            </div>
            {expanded === p.type && (
              <div style={{ padding: "12px 16px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, display: "block", marginBottom: 2 }}>Page Title</label>
                  <input value={s["page_"+p.type+"_title"] || ""} onChange={e => update("page_"+p.type+"_title", e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, display: "block", marginBottom: 2 }}>Content</label>
                  <textarea value={s["page_"+p.type+"_content"] || ""} onChange={e => update("page_"+p.type+"_content", e.target.value)} rows={3} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, display: "block", marginBottom: 2 }}>Meta Title</label>
                    <input value={s["page_"+p.type+"_meta_title"] || ""} onChange={e => update("page_"+p.type+"_meta_title", e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, display: "block", marginBottom: 2 }}>Meta Description</label>
                    <input value={s["page_"+p.type+"_meta_description"] || ""} onChange={e => update("page_"+p.type+"_meta_description", e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  </div>
                </div>
                <button onClick={() => savePage(p.type)} disabled={saveMut.isPending} style={{ padding: "6px 14px", borderRadius: 6, background: "#111827", color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
                  {saveMut.isPending ? "Saving..." : "Save Page"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </TenantLayout>
  );
}
