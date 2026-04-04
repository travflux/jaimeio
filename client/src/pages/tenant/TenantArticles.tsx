import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { X, Loader2 } from "lucide-react";

function ReviewPanel({ article, categories, onClose, onAction }: { article: any; categories: any[]; onClose: () => void; onAction: () => void }) {
  const approveMut = trpc.articles.updateStatus.useMutation({ onSuccess: onAction });
  const rejectMut = trpc.articles.updateStatus.useMutation({ onSuccess: onAction });
  const updateMut = trpc.articles.update.useMutation();
  const updateImageMut = trpc.articles.updateImage.useMutation();
  const [localArticle, setLocalArticle] = useState(article);
  const geoRefetchQuery = trpc.geo.getArticleGeo.useQuery({ articleId: article.id }, { enabled: false });
  const generateGeo = trpc.geo.generateForArticle.useMutation({
    onSuccess: async (result) => {
      console.log("[GEO Client] onSuccess result:", JSON.stringify(result));
      // Try to use returned data directly
      if (result?.geoSummary || result?.geoFaq) {
        setLocalArticle((prev: any) => ({ ...prev, geoSummary: result.geoSummary ?? prev.geoSummary, geoFaq: result.geoFaq ?? prev.geoFaq }));
      } else {
        // Data was saved to DB but not returned in mutation — refetch via query
        try {
          const fresh = await geoRefetchQuery.refetch();
          if (fresh.data) {
            setLocalArticle((prev: any) => ({
              ...prev,
              geoSummary: fresh.data.geoSummary ?? prev.geoSummary,
              geoFaq: fresh.data.geoFaq ? JSON.stringify(fresh.data.geoFaq) : prev.geoFaq,
            }));
          }
        } catch {}
      }
    },
  });
  const templatesQuery = trpc.templates?.list?.useQuery?.({ licenseId: 7 });
  const templates = (templatesQuery?.data as any[]) || [];
  const articleTemplate = templates.find((t: any) => t.id === article.templateId);
  const [selectedCat, setSelectedCat] = useState(article.categoryId);
  const [imageUrl, setImageUrl] = useState(article.featuredImage || "");
  const [manualUrl, setManualUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [panelTab, setPanelTab] = useState<"review" | "geo">("review");

  const wordCount = article.body ? article.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 230));

  // Parse GEO data
  let geoSummaryItems: string[] = [];
  try { if (localArticle.geoSummary) { const p = JSON.parse(localArticle.geoSummary); geoSummaryItems = Array.isArray(p) ? p : [localArticle.geoSummary]; } } catch { if (localArticle.geoSummary) geoSummaryItems = [localArticle.geoSummary]; }
  let geoFaqItems: Array<{question: string; answer: string}> = [];
  try { if (localArticle.geoFaq) geoFaqItems = JSON.parse(localArticle.geoFaq); } catch {}

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 60 }} onClick={onClose} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 560, maxWidth: "100vw", background: "#fff", zIndex: 70, display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.1)" }}>
        {/* Header with tabs */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: article.status === "published" ? "#d1fae5" : "#fef3c7", color: article.status === "published" ? "#065f46" : "#92400e" }}>{article.status}</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={18} /></button>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setPanelTab("review")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer",
              borderColor: panelTab === "review" ? "#111827" : "#e5e7eb", background: panelTab === "review" ? "#111827" : "#fff", color: panelTab === "review" ? "#fff" : "#6b7280" }}>Review</button>
            <button onClick={() => setPanelTab("geo")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer",
              borderColor: panelTab === "geo" ? "#111827" : "#e5e7eb", background: panelTab === "geo" ? "#111827" : "#fff", color: panelTab === "geo" ? "#fff" : "#6b7280" }}>GEO</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {/* ═══ REVIEW TAB ═══ */}
          {panelTab === "review" && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, color: "#111827", margin: "0 0 6px" }}>{article.headline}</h2>
              {article.subheadline && <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 10px" }}>{article.subheadline}</p>}
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
                <span>{article.createdAt ? new Date(article.createdAt).toLocaleDateString() : ""}</span>
                <span>{readTime} min read</span>
                <span>{wordCount} words</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Category</label>
                <select value={selectedCat || ""} onChange={e => { setSelectedCat(Number(e.target.value)); updateMut.mutate({ id: article.id, categoryId: Number(e.target.value) }); }}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}>
                  <option value="">None</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Template</label>
                {articleTemplate ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, border: "1px solid " + (articleTemplate.schedule_color || "#6366f1"), color: articleTemplate.schedule_color || "#6366f1" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: articleTemplate.schedule_color || "#6366f1" }} />
                    {articleTemplate.name}
                  </span>
                ) : (
                  <select onChange={e => { if (e.target.value) updateMut.mutate({ id: article.id, templateId: parseInt(e.target.value) }); }} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}>
                    <option value="">Assign template...</option>
                    {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>
              {imageUrl ? (
                <img src={imageUrl} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8, marginBottom: 12 }} />
              ) : (
                <div style={{ marginBottom: 12, border: "2px dashed #e5e7eb", borderRadius: 8, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No featured image</p>
                </div>
              )}
              <button onClick={() => setShowUrlInput(!showUrlInput)} style={{ background: "none", border: "none", color: "#2dd4bf", fontSize: 12, cursor: "pointer", textDecoration: "underline", marginBottom: 8, display: "block" }}>
                {showUrlInput ? "Cancel" : "Paste an image URL"}
              </button>
              {showUrlInput && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://..." style={{ flex: 1, height: 36, padding: "0 12px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }} />
                  <button disabled={!manualUrl.trim() || savingImage} onClick={async () => {
                    setSavingImage(true);
                    try { await updateImageMut.mutateAsync({ articleId: article.id, imageUrl: manualUrl.trim() }); setImageUrl(manualUrl.trim()); setManualUrl(""); setShowUrlInput(false); } catch {} finally { setSavingImage(false); }
                  }} style={{ height: 36, padding: "0 14px", background: "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {savingImage ? "..." : "Save"}
                  </button>
                </div>
              )}
              <div style={{ fontSize: 15, lineHeight: 1.8, color: "#374151", maxHeight: 400, overflowY: "auto" }} dangerouslySetInnerHTML={{ __html: article.body || "" }} />
            </>
          )}

          {/* ═══ GEO TAB ═══ */}
          {panelTab === "geo" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>GEO Data</h3>
                <button onClick={() => generateGeo.mutate({ articleId: article.id })} disabled={generateGeo.isPending}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                  {generateGeo.isPending ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Generating...</> : "Generate GEO"}
                </button>
              </div>

              {geoSummaryItems.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Key Takeaways</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {geoSummaryItems.map((item, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: "#2dd4bf", marginTop: 2 }}>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {geoFaqItems.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>FAQs</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {geoFaqItems.map((faq, i) => (
                      <div key={i} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{faq.question}</p>
                        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {geoSummaryItems.length === 0 && geoFaqItems.length === 0 && !generateGeo.isPending && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>
                  <p style={{ fontSize: 14, marginBottom: 4 }}>No GEO data yet</p>
                  <p style={{ fontSize: 12 }}>Click "Generate GEO" to create AI-optimized content for voice search and featured snippets.</p>
                </div>
              )}

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => approveMut.mutate({ id: article.id, status: "published" })} disabled={approveMut.isPending}
            style={{ flex: 1, height: 44, background: "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {approveMut.isPending ? "Publishing..." : "Approve & Publish"}
          </button>
          <button onClick={() => rejectMut.mutate({ id: article.id, status: "rejected" })} disabled={rejectMut.isPending}
            style={{ width: 90, height: 44, background: "#fff", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Reject
          </button>
        </div>
      </div>
    </>
  );
}

export default function TenantArticles() {
  const { licenseId, settings } = useTenantContext();
  const [filter, setFilter] = useState("all");
  const [reviewArticle, setReviewArticle] = useState<any>(null);
  const { data, isLoading, refetch } = trpc.articles.list.useQuery(filter === "all" ? { limit: 50 } : { status: filter, limit: 50 });
  const catsQuery = trpc.categories.list.useQuery();
  const articles = data?.articles || [];
  let licenseCategories = catsQuery.data || [];
  try { if (settings?.categories) { const p = JSON.parse(settings.categories); if (Array.isArray(p) && p.length > 0) licenseCategories = p.map((c: any, i: number) => ({ id: c.id ?? -(i+1), name: c.name, slug: c.slug || "", color: c.color || null })); } } catch {}
  const filters = ["all", "pending", "published", "approved", "draft", "rejected"];

  return (
    <TenantLayout pageTitle="Articles" pageSubtitle={`${data?.total || 0} total articles`} section="Content"
      headerActions={<a href="/admin/articles/create" style={{ height: 34, padding: "0 14px", background: "#2dd4bf", color: "#0f2d5e", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>+ Create Article</a>}>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer", textTransform: "capitalize",
            borderColor: filter === f ? "#2dd4bf" : "#e5e7eb", background: filter === f ? "#2dd4bf" : "#fff", color: filter === f ? "#0f2d5e" : "#6b7280" }}>
            {f}{(() => { const c = f === "all" ? (data?.total || 0) : articles.filter((x: any) => x.status === f).length; return c > 0 ? " (" + c + ")" : ""; })()}
          </button>
        ))}
      </div>
      {isLoading ? <p style={{ color: "#6b7280", padding: 40, textAlign: "center" }}>Loading...</p> : articles.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}><p style={{ fontSize: 16 }}>No articles found</p></div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Article</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 100 }}>Category</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 80 }}>Status</th>
              <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 60 }}>Views</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 80 }}>Action</th>
            </tr></thead>
            <tbody>{articles.map((a: any) => {
              const cat = licenseCategories.find((c: any) => c.id === a.categoryId);
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {a.featuredImage ? <img src={a.featuredImage} style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 48, height: 48, borderRadius: 6, background: "#f3f4f6", flexShrink: 0 }} />}
                      <div><div style={{ fontWeight: 500, color: "#111827" }}>{a.headline?.substring(0, 60)}{a.headline?.length > 60 ? "..." : ""}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}</div></div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px" }}>{cat ? <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: (cat.color || "#6b7280") + "20", color: cat.color || "#6b7280" }}>{cat.name}</span> : <span style={{ fontSize: 11, color: "#9ca3af" }}>—</span>}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: a.status === "published" ? "#d1fae5" : a.status === "pending" ? "#fef3c7" : "#f3f4f6", color: a.status === "published" ? "#065f46" : a.status === "pending" ? "#92400e" : "#6b7280" }}>{a.status}</span>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "center", color: "#6b7280" }}>{a.views || 0}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <button onClick={() => setReviewArticle(a)} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Review</button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      {reviewArticle && <ReviewPanel article={reviewArticle} categories={licenseCategories} onClose={() => setReviewArticle(null)} onAction={() => { setReviewArticle(null); refetch(); }} />}
    </TenantLayout>
  );
}
