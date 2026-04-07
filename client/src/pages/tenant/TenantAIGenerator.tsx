import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";

const SUGGESTIONS = [
  "Why smart investors are buying distressed properties in 2026",
  "The luxury fashion trends defining spring 2026",
  "How AI is changing content creator monetization",
  "Best neighborhoods for first-time buyers in a high-rate market",
  "Why more entrepreneurs choose solopreneurship over VC funding",
];

const selectStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" };

export default function TenantAIGenerator() {
  const [topic, setTopic] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [tone, setTone] = useState("");
  const [wordCount, setWordCount] = useState("800");
  const [extra, setExtra] = useState("");
  const [lastGen, setLastGen] = useState<{ articleId: number; headline: string } | null>(null);
  const [imageGenerated, setImageGenerated] = useState(false);
  const [geoGenerated, setGeoGenerated] = useState(false);

  const catsQuery = trpc.categories.list.useQuery();
  const recentQuery = trpc.articles.list.useQuery({ limit: 8, status: "pending" });

  const genMut = trpc.workflow.generateFromTopic.useMutation({
    onSuccess: (data: any) => {
      setLastGen(data);
      setImageGenerated(false);
      setGeoGenerated(false);
      setTopic("");
      setExtra("");
      toast.success("Article generated!");
      recentQuery.refetch();
    },
    onError: (err: any) => toast.error("Generation failed: " + err.message),
  });

  const regenImageMut = trpc.articles.regenerateImage.useMutation({
    onSuccess: () => { setImageGenerated(true); toast.success("Image generated"); recentQuery.refetch(); },
    onError: (e: any) => toast.error("Image generation failed: " + e.message),
  });
  const geoMut = trpc.geo.generateForArticle.useMutation({
    onSuccess: () => { setGeoGenerated(true); toast.success("GEO generated"); },
    onError: (e: any) => toast.error("GEO generation failed: " + e.message),
  });

  const handleGenerate = () => {
    if (topic.trim().length < 10) { toast.error("Topic must be at least 10 characters"); return; }
    genMut.mutate({ topic: topic.trim(), categoryId, tone: tone || undefined, wordCount: parseInt(wordCount), additionalInstructions: extra || undefined });
  };

  const articles = recentQuery.data?.articles || [];

  return (
    <TenantLayout pageTitle="AI Generator" pageSubtitle="Generate an article on any topic instantly" section="Content">
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }} className="gen-grid">

        {/* Left — Generator */}
        <div>
          {/* Topic */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20, marginBottom: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>What should the article be about?</label>
            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={4}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, resize: "none", fontFamily: "inherit", lineHeight: 1.6 }}
              placeholder={"Describe the topic, angle, or story.\n\nExamples:\n- Why foreclosure investing is surging in Sun Belt markets\n- The rise of quiet luxury in millennial home design"} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{topic.length}/500 characters</span>
              {topic.length > 0 && topic.length < 10 && <span style={{ fontSize: 11, color: "#ef4444" }}>Add more detail</span>}
            </div>
            {topic.length === 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Try one of these:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SUGGESTIONS.slice(0, 3).map((s, i) => (
                    <button key={i} onClick={() => setTopic(s)} style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, cursor: "pointer", color: "#6b7280", textAlign: "left" }}>
                      {s.length > 55 ? s.substring(0, 55) + "..." : s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Generation Options</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }} className="gen-opts">
              <div>
                <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>Category</label>
                <select style={selectStyle} value={categoryId ?? ""} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">Auto-detect</option>
                  {(catsQuery.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>Tone</label>
                <select style={selectStyle} value={tone} onChange={e => setTone(e.target.value)}>
                  <option value="">Use my default</option>
                  {[["professional","Professional"],["conversational","Conversational"],["analytical","Analytical"],["inspirational","Inspirational"],["bold","Bold"],["luxury","Luxury"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>Word Count</label>
                <select style={selectStyle} value={wordCount} onChange={e => setWordCount(e.target.value)}>
                  {[["400","400 — Brief"],["600","600 — Short"],["800","800 — Standard"],["1000","1000 — Long"],["1200","1200 — In-depth"],["1500","1500 — Deep dive"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>Additional Instructions (optional)</label>
              <textarea value={extra} onChange={e => setExtra(e.target.value)} rows={2}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "none", fontFamily: "inherit" }}
                placeholder="e.g. Focus on actionable advice. Include tax implications." />
            </div>
          </div>

          {/* Generate Button */}
          <button onClick={handleGenerate} disabled={genMut.isPending || topic.trim().length < 10}
            style={{ width: "100%", height: 48, background: genMut.isPending ? "#9ca3af" : "#111827", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            {genMut.isPending ? <><Loader2 size={18} className="animate-spin" /> Generating... (15-30 seconds)</> : <><Sparkles size={18} /> Generate Article</>}
          </button>

          {/* Success */}
          {lastGen && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", marginBottom: 4 }}>Article generated</p>
              <p style={{ fontSize: 13, color: "#15803d", marginBottom: 12 }}>{lastGen.headline}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <button onClick={() => regenImageMut.mutate({ articleId: lastGen.articleId })} disabled={regenImageMut.isPending || imageGenerated}
                  style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #bbf7d0", background: imageGenerated ? "#d1fae5" : "#fff", fontSize: 12, fontWeight: 600, cursor: imageGenerated ? "default" : "pointer", color: imageGenerated ? "#166534" : "#15803d", display: "flex", alignItems: "center", gap: 4 }}>
                  {regenImageMut.isPending ? <><Loader2 size={12} className="animate-spin" /> Generating Image...</> : imageGenerated ? "✓ Image Generated" : "Generate Image"}
                </button>
                <button onClick={() => geoMut.mutate({ articleId: lastGen.articleId })} disabled={geoMut.isPending || geoGenerated}
                  style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #bbf7d0", background: geoGenerated ? "#d1fae5" : "#fff", fontSize: 12, fontWeight: 600, cursor: geoGenerated ? "default" : "pointer", color: geoGenerated ? "#166534" : "#15803d", display: "flex", alignItems: "center", gap: 4 }}>
                  {geoMut.isPending ? <><Loader2 size={12} className="animate-spin" /> Generating GEO...</> : geoGenerated ? "✓ GEO Generated" : "Generate GEO"}
                </button>
              </div>
              <a href="/admin/articles" style={{ fontSize: 12, color: "#15803d", textDecoration: "underline", display: "inline-block" }}>Review in Articles →</a>
            </div>
          )}
        </div>

        {/* Right — Recent */}
        <div>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Recently Generated</h2>
            {articles.length === 0 ? (
              <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>Articles you generate will appear here</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {articles.slice(0, 8).map((a: any) => (
                  <a key={a.id} href="/admin/articles" style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: a.status === "published" ? "#22c55e" : a.status === "rejected" ? "#ef4444" : "#f59e0b" }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#111827", lineHeight: 1.35 }}>{a.headline?.substring(0, 60)}</p>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{a.status}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
            <a href="/admin/articles" style={{ display: "block", textAlign: "center", fontSize: 12, color: "#2dd4bf", marginTop: 12, textDecoration: "none" }}>View all articles →</a>
          </div>
          <div style={{ background: "#f9fafb", borderRadius: 12, padding: 16, fontSize: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Tips for better articles</p>
            <ul style={{ color: "#6b7280", margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>Be specific — include names, dates, or data points</li>
              <li>Add an angle — "Why X" beats just "X"</li>
              <li>Use Additional Instructions for unique requirements</li>
              <li>Set the right tone for your audience</li>
            </ul>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 1024px) { .gen-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .gen-opts { grid-template-columns: 1fr !important; } }
      `}</style>
    </TenantLayout>
  );
}
