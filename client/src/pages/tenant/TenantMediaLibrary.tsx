import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Eye, Download, Trash2, X } from "lucide-react";

export default function TenantMediaLibrary() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("settings");
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const saveMut = trpc.licenseSettings.setBulk.useMutation();

  // Backfill
  const backfillMut = trpc.ai.backfillMissingImages.useMutation();
  const backfillStatusQuery = trpc.ai.backfillImagesStatus.useQuery(undefined, {
    refetchInterval: backfillMut.isSuccess ? 3000 : false,
  });
  const bfStatus = backfillStatusQuery.data;

  // Library - query articles with images
  const articlesQuery = trpc.articles.list.useQuery(
    { limit: 100 },
    { enabled: tab === "library" }
  );
  const articlesWithImages = (articlesQuery.data?.articles || []).filter((a: any) => a.featuredImage);

  useEffect(() => { if (init) setS(init); }, [init]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const handleSave = async () => { if (licenseId) await saveMut.mutateAsync({ licenseId, settings: s }); };
  const togglePass = (k: string) => setShowPass(p => ({ ...p, [k]: !p[k] }));

  const tabs = ["settings", "library", "image-licenses", "image-sources", "video"];
  const provider = s.image_provider || "replicate";

  const PasswordInput = ({ k, label, placeholder }: { k: string; label: string; placeholder?: string }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{label}</label>
      <div style={{ display: "flex", gap: 4 }}>
        <input type={showPass[k] ? "text" : "password"} value={s[k] || ""} onChange={e => update(k, e.target.value)} placeholder={placeholder}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
        <button onClick={() => togglePass(k)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer" }}>
          {showPass[k] ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );

  const Toggle = ({ k, label, helper }: { k: string; label: string; helper?: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
      <div><div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>{helper && <div style={{ fontSize: 11, color: "#9ca3af" }}>{helper}</div>}</div>
      <button onClick={() => update(k, s[k] === "true" ? "false" : "true")}
        style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s[k] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
        <span style={{ position: "absolute", top: 2, left: s[k] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );

  const missingCount = (articlesQuery.data?.total || 0) - articlesWithImages.length;

  return (
    <TenantLayout pageTitle="Media Library" pageSubtitle="Image generation, library, and video" section="Content" saveAction={tab === "settings" ? handleSave : undefined}>
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer",
            borderColor: tab === t ? "#111827" : "#e5e7eb", background: tab === t ? "#111827" : "#fff", color: tab === t ? "#fff" : "#6b7280",
            textTransform: "capitalize",
          }}>{t === "image-licenses" ? "Image Licenses" : t === "image-sources" ? "Image Sources" : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === "settings" && (
        <>
          {/* Provider */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Image Generation Provider</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Provider</label>
              <select value={provider} onChange={e => update("image_provider", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                <option value="replicate">Replicate (Flux, SDXL, etc.)</option>
                <option value="openai">OpenAI DALL-E</option>
                <option value="custom">Custom API</option>
              </select>
            </div>
            {provider === "replicate" && (<>
              <PasswordInput k="replicate_api_key" label="Replicate API Key" />
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Model</label>
                <input value={s.replicate_model || ""} onChange={e => update("replicate_model", e.target.value)} placeholder="black-forest-labs/flux-schnell"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
              </div>
            </>)}
            {provider === "openai" && (<>
              <PasswordInput k="openai_api_key" label="OpenAI API Key" />
            </>)}
            {provider === "custom" && (<>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>API Endpoint</label>
                <input value={s.custom_image_api_url || ""} onChange={e => update("custom_image_api_url", e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
              </div>
              <PasswordInput k="custom_image_api_key" label="API Key" />
            </>)}
            <Toggle k="auto_generate_images" label="Auto-Generate Images" helper="Generate featured images during workflow runs" />
            <Toggle k="image_watermark_enabled" label="Enable Watermark" />
            {s.image_watermark_enabled === "true" && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Watermark Text</label>
                <input value={s.image_watermark_text || ""} onChange={e => update("image_watermark_text", e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
              </div>
            )}
          </div>

          {/* Style */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Image Style & Prompt Template</h3>
            {[
              ["image_llm_prompt", "Step 1 — LLM Scene Prompt", "Sent to LLM to generate scene description from headline", 5],
              ["image_style_prompt", "Step 2 — Image Style Prompt", "Prepended to scene description for image provider", 3],
            ].map(([k, label, helper, rows]) => (
              <div key={k as string} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{label as string}</label>
                <textarea value={s[k as string] || ""} onChange={e => update(k as string, e.target.value)} rows={rows as number}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }} />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{helper as string}</div>
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Step 3 — Image Style Keywords</label>
              <input value={s.image_style_keywords || ""} onChange={e => update("image_style_keywords", e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Appended after scene description</div>
            </div>
            <div style={{ background: "#f9fafb", padding: 12, borderRadius: 6, fontSize: 11, fontFamily: "monospace", color: "#6b7280" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Final Prompt Preview:</div>
              {s.image_style_prompt || "[style prompt]"} + <em>[LLM scene output]</em> + {s.image_style_keywords || "[keywords]"}
            </div>
          </div>

          {/* Backfill */}
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Backfill Missing Images</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
              {missingCount > 0 ? `${missingCount} articles are missing featured images.` : "All articles have images."}
            </p>

            {bfStatus?.isRunning && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  <span>Processing {bfStatus.processed} of {bfStatus.total}...</span>
                  <span>{bfStatus.succeeded} succeeded · {bfStatus.failed} failed</span>
                </div>
                <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#2dd4bf", borderRadius: 4, width: `${bfStatus.total > 0 ? (bfStatus.processed / bfStatus.total) * 100 : 0}%`, transition: "width 0.3s" }} />
                </div>
              </div>
            )}

            {bfStatus && !bfStatus.isRunning && bfStatus.finishedAt && (
              <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 6, marginBottom: 12, fontSize: 13, color: "#166534" }}>
                Done — {bfStatus.succeeded} images generated, {bfStatus.failed} failed
              </div>
            )}

            <button
              onClick={() => backfillMut.mutate()}
              disabled={bfStatus?.isRunning || backfillMut.isPending}
              style={{
                width: "100%", height: 40, borderRadius: 6, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                background: bfStatus?.isRunning ? "#9ca3af" : "#2dd4bf",
                color: bfStatus?.isRunning ? "#fff" : "#0f2d5e",
                opacity: bfStatus?.isRunning ? 0.7 : 1,
              }}
            >
              {bfStatus?.isRunning ? `Running... (${bfStatus.total > 0 ? Math.round((bfStatus.processed / bfStatus.total) * 100) : 0}%)` : backfillMut.isPending ? "Starting..." : "Generate Missing Images"}
            </button>
          </div>
        </>
      )}

      {tab === "library" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Image Library ({articlesWithImages.length} images)</h3>
          </div>

          {articlesWithImages.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>No media yet. Images will appear here as articles are generated.</p>
              <button onClick={() => setTab("settings")} style={{ color: "#2dd4bf", background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Generate Missing Images →
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {articlesWithImages.map((a: any) => (
                <div key={a.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "#f3f4f6" }}
                  onClick={() => { setLightboxUrl(a.featuredImage); setLightboxTitle(a.headline); }}>
                  <img src={a.featuredImage} alt={a.headline} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="media-overlay" style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                    padding: "24px 8px 8px", opacity: 0, transition: "opacity 0.15s",
                  }} onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
                    <div style={{ fontSize: 11, color: "#fff", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.headline?.substring(0, 50)}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <button onClick={e => { e.stopPropagation(); setLightboxUrl(a.featuredImage); setLightboxTitle(a.headline); }}
                        style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 4, padding: 4, cursor: "pointer", color: "#fff" }}><Eye size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); window.open(a.featuredImage, "_blank"); }}
                        style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 4, padding: 4, cursor: "pointer", color: "#fff" }}><Download size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "image-licenses" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Image Licenses</h3>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>All images are AI-generated. No third-party licenses required.</p>
        </div>
      )}

      {tab === "image-sources" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Image Sources</h3>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Source</th>
              <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Type</th>
              <th style={{ textAlign: "center", padding: "8px 0", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Status</th>
            </tr></thead>
            <tbody>
              {[["Replicate (Flux)", "AI Generation", provider === "replicate"], ["OpenAI DALL-E", "AI Generation", provider === "openai"], ["Unsplash", "Stock", false], ["Pexels", "Stock", false]].map(([name, type, active]) => (
                <tr key={name as string} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 0", fontWeight: 500 }}>{name as string}</td>
                  <td style={{ padding: "8px 0", color: "#6b7280" }}>{type as string}</td>
                  <td style={{ padding: "8px 0", textAlign: "center" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: active ? "#d1fae5" : "#f3f4f6", color: active ? "#065f46" : "#6b7280" }}>
                      {active ? "Active" : "Not configured"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "video" && (
        <>
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Video Generation</h3>
            <Toggle k="video_enabled" label="Video Enabled" />
            {s.video_enabled === "true" && (<>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Provider</label>
                <select value={s.video_provider || ""} onChange={e => update("video_provider", e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="">Select...</option><option value="replicate">Replicate</option><option value="runwayml">RunwayML</option>
                </select>
              </div>
              <PasswordInput k="video_api_key" label="API Key" />
            </>)}
          </div>
          <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Video Library</h3>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>No videos generated yet.</p>
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}
          onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#fff", cursor: "pointer" }}><X size={24} /></button>
          <img src={lightboxUrl} alt="" style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }} onClick={e => e.stopPropagation()} />
          <p style={{ color: "#fff", fontSize: 14, marginTop: 12, textAlign: "center", maxWidth: 600 }}>{lightboxTitle}</p>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) { div[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; } }
        .media-overlay:hover { opacity: 1 !important; }
      `}</style>
    </TenantLayout>
  );
}
