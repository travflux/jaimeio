import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

const TABS = ["Overview", "Publications", "Social", "Email", "Web & SEO", "Advertising", "AI Insights"];

function KPI({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 8, padding: 16, borderLeft: "4px solid " + color, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

export default function TenantDashboardPage() {
  const [tab, setTab] = useState("Overview");
  const { licenseId, settings } = useTenantContext();
  const stats = trpc.articles.stats.useQuery();
  const articlesQuery = trpc.articles.list.useQuery({ limit: 10, status: "published" });
  const batchesQuery = trpc.workflow.list.useQuery({ limit: 5 });
  const d = stats.data;
  const articles = articlesQuery.data?.articles || [];

  return (
    <TenantLayout pageTitle="Dashboard" pageSubtitle="Performance overview" section="Overview">
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer", whiteSpace: "nowrap",
            borderColor: tab === t ? "#111827" : "#e5e7eb", background: tab === t ? "#111827" : "#fff", color: tab === t ? "#fff" : "#6b7280" }}>{t}</button>
        ))}
      </div>

      {tab === "Overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <KPI label="Articles This Month" value={d?.thisMonth || 0} sub={`${d?.published || 0} published · ${d?.pending || 0} pending`} color="#2dd4bf" />
            <KPI label="Total Articles" value={d?.total || 0} sub={`${d?.approved || 0} approved`} color="#f97316" />
            <KPI label="Total Views" value={d?.viewsTotal || 0} sub="All time" color="#8b5cf6" />
            <KPI label="Workflow Runs" value={(batchesQuery.data || []).length} sub="Recent batches" color="#06b6d4" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="Article Status">
              {[["Published", d?.published || 0, "#22c55e"], ["Pending", d?.pending || 0, "#f97316"], ["Approved", d?.approved || 0, "#3b82f6"], ["Draft", d?.draft || 0, "#9ca3af"], ["Rejected", d?.rejected || 0, "#ef4444"]].map(([l, v, c]) => (
                <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c as string }} /><span style={{ flex: 1, fontSize: 13 }}>{l as string}</span><span style={{ fontWeight: 600, fontSize: 13 }}>{v as number}</span>
                </div>
              ))}
            </Card>
            <Card title="Top Categories">
              {(d?.categoryBreakdown || []).slice(0, 5).map((c: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{c.name || "Uncategorized"}</span><span style={{ fontWeight: 600, fontSize: 13 }}>{c.count}</span>
                </div>
              ))}
              {(!d?.categoryBreakdown || d.categoryBreakdown.length === 0) && <p style={{ color: "#9ca3af", fontSize: 13 }}>No data yet</p>}
            </Card>
          </div>
          <Card title="Recent Published Articles">
            {articles.length > 0 ? articles.slice(0, 5).map((a: any) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 13 }}>{a.headline?.substring(0, 60)}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ""}</span>
              </div>
            )) : <p style={{ color: "#9ca3af", fontSize: 13 }}>No published articles yet</p>}
          </Card>
          <Card title="System Alerts">
            <div style={{ fontSize: 13 }}>
              {!settings?.blotato_api_key && <div style={{ padding: "6px 0", color: "#f59e0b" }}>⚠ Blotato not connected — social distribution disabled</div>}
              {!settings?.image_provider && <div style={{ padding: "6px 0", color: "#f59e0b" }}>⚠ No image provider configured</div>}
              {settings?.workflow_enabled !== "true" && <div style={{ padding: "6px 0", color: "#9ca3af" }}>ℹ Workflow is paused</div>}
              {settings?.blotato_api_key && settings?.image_provider && settings?.workflow_enabled === "true" && <div style={{ padding: "6px 0", color: "#22c55e" }}>✓ All systems operational</div>}
            </div>
          </Card>
        </>
      )}

      {tab === "Publications" && (
        <Card title="Published Articles">
          {articles.length > 0 ? (
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Headline</th>
                <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Status</th>
                <th style={{ textAlign: "center", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Views</th>
                <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Date</th>
              </tr></thead>
              <tbody>{(articlesQuery.data?.articles || []).map((a: any) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 0" }}>{a.headline?.substring(0, 50)}</td>
                  <td style={{ padding: "8px 0" }}><span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: a.status === "published" ? "#d1fae5" : "#fef3c7", color: a.status === "published" ? "#065f46" : "#92400e" }}>{a.status}</span></td>
                  <td style={{ padding: "8px 0", textAlign: "center" }}>{a.views || 0}</td>
                  <td style={{ padding: "8px 0", color: "#6b7280", fontSize: 12 }}>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ""}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p style={{ color: "#9ca3af", fontSize: 13 }}>No articles yet — run your first workflow</p>}
        </Card>
      )}

      {tab === "Social" && (
        <Card title="Social Distribution">
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
            {settings?.blotato_api_key ? "Blotato connected — posts distributed automatically on publish" : "Connect Blotato in Distribution settings to enable social posting"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {["X/Twitter", "Instagram", "LinkedIn"].map(p => (
              <div key={p} style={{ padding: 12, background: "#f9fafb", borderRadius: 6, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{settings?.["blotato_" + p.toLowerCase().replace(/[^a-z]/g, "") + "_enabled"] === "true" ? "Enabled" : "Disabled"}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "Email" && (
        <Card title="Newsletter">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 12, background: "#f9fafb", borderRadius: 6 }}><div style={{ fontSize: 11, color: "#6b7280" }}>Subscribers</div><div style={{ fontSize: 20, fontWeight: 700 }}>0</div></div>
            <div style={{ padding: 12, background: "#f9fafb", borderRadius: 6 }}><div style={{ fontSize: 11, color: "#6b7280" }}>Last Digest</div><div style={{ fontSize: 14, fontWeight: 600 }}>Not sent yet</div></div>
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>Configure email in Communications settings to start collecting subscribers.</p>
        </Card>
      )}

      {tab === "Web & SEO" && (
        <>
          <Card title="GEO Status">
            <p style={{ fontSize: 13, color: "#6b7280" }}>GEO optimization is {settings?.geo_enabled === "true" ? "enabled" : "disabled"}. Generate GEO data in GEO Settings.</p>
          </Card>
          <Card title="Sitemap">
            <div style={{ fontFamily: "monospace", fontSize: 13, padding: "8px 12px", background: "#f9fafb", borderRadius: 6 }}>
              https://{typeof window !== "undefined" ? window.location.hostname : ""}/sitemap.xml
            </div>
          </Card>
          <Card title="IndexNow">
            <p style={{ fontSize: 13, color: "#6b7280" }}>Auto-submit: {settings?.indexnow_auto_submit === "true" ? "Enabled" : "Disabled"}</p>
          </Card>
        </>
      )}

      {tab === "Advertising" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Google AdSense"><p style={{ fontSize: 13, color: "#6b7280" }}>{settings?.adsense_enabled === "true" ? "Connected" : "Not configured"}</p></Card>
          <Card title="Amazon Affiliate"><p style={{ fontSize: 13, color: "#6b7280" }}>{settings?.amazon_enabled === "true" ? "Tag: " + (settings?.amazon_associate_tag || "—") : "Not configured"}</p></Card>
          <Card title="Sponsorship"><p style={{ fontSize: 13, color: "#6b7280" }}>{settings?.sponsor_enabled === "true" ? "Active" : "Not configured"}</p></Card>
          <Card title="Merch Store"><p style={{ fontSize: 13, color: "#6b7280" }}>{settings?.merch_enabled === "true" ? "Active" : "Not configured"}</p></Card>
        </div>
      )}

      {tab === "AI Insights" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            <KPI label="Articles Generated" value={d?.thisMonth || 0} sub="This month" color="#8b5cf6" />
            <KPI label="Image Provider" value={settings?.image_provider || "None"} sub="Current provider" color="#f97316" />
            <KPI label="Workflow Batches" value={(batchesQuery.data || []).length} sub="Total runs" color="#2dd4bf" />
          </div>
          <Card title="Recent Workflow Runs">
            {(batchesQuery.data || []).length > 0 ? (batchesQuery.data || []).map((b: any) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 13 }}>{b.batchDate}</span>
                <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: b.status === "completed" ? "#d1fae5" : "#fef3c7", color: b.status === "completed" ? "#065f46" : "#92400e" }}>{b.status}</span>
              </div>
            )) : <p style={{ color: "#9ca3af", fontSize: 13 }}>No workflow runs yet</p>}
          </Card>
        </>
      )}

      <style>{`@media (max-width: 768px) { div[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; } div[style*="repeat(3"] { grid-template-columns: 1fr !important; } }`}</style>
    </TenantLayout>
  );
}
