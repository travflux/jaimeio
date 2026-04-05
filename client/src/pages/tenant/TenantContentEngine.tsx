import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { HelpCircle, ExternalLink } from "lucide-react";

function Tip({ text }: { text: string }) {
  const [v, setV] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <HelpCircle size={13} style={{ color: "#9ca3af", cursor: "pointer", marginLeft: 4 }}
        onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)} onClick={() => setV(x => !x)} />
      {v && <span style={{ position: "absolute", left: 20, top: 0, zIndex: 50, width: 260, background: "#fff", color: "#374151", fontSize: 12, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb", padding: 12, lineHeight: 1.5, pointerEvents: "auto" }}
        onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)}>{text}</span>}
    </span>
  );
}

function KBLink({ url, label }: { url: string; label: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#2dd4bf", textDecoration: "none", marginTop: 12 }}><ExternalLink size={11} /> {label}</a>;
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 24, marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{title}</h2>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>{desc}</p>
      {children}
    </div>
  );
}

function Toggle({ label, desc, tooltip, checked, onChange }: { label: string; desc: string; tooltip: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center" }}>{label}<Tip text={tooltip} /></div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: checked ? "#2dd4bf" : "#d1d5db", position: "relative", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );
}

const selectStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" };

export default function TenantContentEngine() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const saveMut = trpc.licenseSettings.setBulk.useMutation({ onSuccess: () => toast.success("Content engine settings saved") });
  const providersQuery = trpc.system.getLLMProviders.useQuery();

  useEffect(() => { if (init) setS(init); }, [init]);
  const upd = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!licenseId) return;
    await saveMut.mutateAsync({ licenseId, settings: {
      production_loop_enabled: s.production_loop_enabled || "true",
      max_daily_articles: s.max_daily_articles || "5",
      min_score_to_publish: s.min_score_to_publish || "0.40",
      writing_tone: s.writing_tone || "professional",
      brand_genre: s.brand_genre || "general",
      target_article_length: s.target_article_length || "800",
      reading_level: s.reading_level || "intermediate",
      headline_style: s.headline_style || "statement",
      include_statistics: s.include_statistics || "true",
      include_quotes: s.include_quotes || "true",
      include_cta: s.include_cta || "true",
      include_subheadings: s.include_subheadings || "true",
      llm_provider: s.llm_provider || "auto",
      ...(s.article_llm_system_prompt ? { article_llm_system_prompt: s.article_llm_system_prompt } : {}),
    }});
  };

  const providers = providersQuery.data;

  return (
    <TenantLayout pageTitle="Content Engine" pageSubtitle="Control how your AI generates articles" section="Settings" saveAction={handleSave}>

      {/* Production Settings */}
      <Section title="Production Settings" desc="Control how many articles generate automatically each day.">
        <Toggle label="Auto-Generation" desc="Automatically generate articles from your source feeds" tooltip="When enabled, JAIME.IO generates articles from RSS feeds every hour. Disable for manual-only generation."
          checked={s.production_loop_enabled !== "false"} onChange={v => upd("production_loop_enabled", v ? "true" : "false")} />
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Articles Per Day <Tip text="Maximum articles generated per day. Start with 3-5 and increase as you review quality." /></label>
          <select style={selectStyle} value={s.max_daily_articles || "5"} onChange={e => upd("max_daily_articles", e.target.value)}>
            {["1","2","3","5","7","10","15","20","25","30"].map(n => <option key={n} value={n}>{n} articles per day</option>)}
          </select>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Recommended: Start with 3-5.</p>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Min Candidate Score <Tip text="Only candidates scoring above this threshold get articles. Higher = stricter quality." /></label>
          <select style={selectStyle} value={s.min_score_to_publish || "0.40"} onChange={e => upd("min_score_to_publish", e.target.value)}>
            {[["0.20","Low"],["0.30","Below avg"],["0.40","Recommended"],["0.50","Above avg"],["0.60","High only"],["0.70","Very high"],["0.80","Strict"]].map(([v,l]) => <option key={v} value={v}>{v} — {l}</option>)}
          </select>
        </div>
        <KBLink url="https://knowledgebase.getjaime.io/knowledge-base/how-production-loop-works/" label="Read: How the Production Loop Works" />
      </Section>

      {/* Writing Style */}
      <Section title="Writing Style" desc="Define your publication's voice, tone, and article format.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="ce-grid">
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Genre <Tip text="Shapes how the AI writes. Real estate gets market analysis, satire gets humor." /></label>
            <select style={selectStyle} value={s.brand_genre || "general"} onChange={e => upd("brand_genre", e.target.value)}>
              {[["general","General News"],["real-estate","Real Estate"],["technology","Technology"],["lifestyle","Lifestyle"],["finance","Finance"],["satire","Satire"],["fashion","Fashion"],["fitness","Fitness"],["food","Food"],["travel","Travel"],["sports","Sports"],["gaming","Gaming"],["music","Music"],["politics","Politics"],["science","Science"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Tone <Tip text="How articles sound. Authoritative = The Economist. Conversational = a friend." /></label>
            <select style={selectStyle} value={s.writing_tone || "professional"} onChange={e => upd("writing_tone", e.target.value)}>
              {[["professional","Professional"],["conversational","Conversational"],["analytical","Analytical"],["inspirational","Inspirational"],["educational","Educational"],["bold","Bold & Opinionated"],["luxury","Luxury"],["satirical","Satirical"],["investigative","Investigative"],["friendly","Friendly"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Word Count <Tip text="Approximate article length. 400-600 for news briefs, 800-1200 for in-depth." /></label>
            <select style={selectStyle} value={s.target_article_length || "800"} onChange={e => upd("target_article_length", e.target.value)}>
              {[["400","400 — Short"],["600","600 — Medium-short"],["800","800 — Medium"],["1000","1000 — Medium-long"],["1200","1200 — Long"],["1500","1500 — Very long"],["2000","2000 — Deep dive"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Reading Level <Tip text="Language complexity. Beginner = simple. Expert = industry terminology." /></label>
            <select style={selectStyle} value={s.reading_level || "intermediate"} onChange={e => upd("reading_level", e.target.value)}>
              {[["beginner","Beginner"],["intermediate","Intermediate"],["expert","Expert"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Headline Style <Tip text="How headlines are written. Statement = direct. Question = curiosity. How-To = value." /></label>
            <select style={selectStyle} value={s.headline_style || "statement"} onChange={e => upd("headline_style", e.target.value)}>
              {[["statement","Statement"],["question","Question"],["how-to","How-To"],["listicle","Listicle"],["news","News"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <KBLink url="https://knowledgebase.getjaime.io/knowledge-base/setting-up-writing-style-and-tone/" label="Read: Setting Up Writing Style" />
      </Section>

      {/* Article Structure */}
      <Section title="Article Structure" desc="Control what elements appear in every generated article.">
        <Toggle label="Section Subheadings" desc="Break articles into sections with H2/H3 headers" tooltip="Improves readability and SEO."
          checked={s.include_subheadings !== "false"} onChange={v => upd("include_subheadings", v ? "true" : "false")} />
        <Toggle label="Statistics & Data" desc="Include relevant stats and data points" tooltip="Adds credibility with specific numbers and research data."
          checked={s.include_statistics !== "false"} onChange={v => upd("include_statistics", v ? "true" : "false")} />
        <Toggle label="Expert Quotes" desc="Include attributed quotes from relevant figures" tooltip="Adds authority and human perspective."
          checked={s.include_quotes !== "false"} onChange={v => upd("include_quotes", v ? "true" : "false")} />
        <Toggle label="Call to Action" desc="End articles with a CTA for readers" tooltip="Encourages newsletter signups and engagement."
          checked={s.include_cta !== "false"} onChange={v => upd("include_cta", v ? "true" : "false")} />
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center" }}>Custom AI Instructions <Tip text="Advanced: specific instructions beyond standard settings. Added directly to the AI writing prompt." /></label>
          <textarea value={s.article_llm_system_prompt || ""} onChange={e => upd("article_llm_system_prompt", e.target.value)} rows={4}
            style={{ ...selectStyle, resize: "vertical", marginTop: 4 }} placeholder="e.g. Always include actionable takeaways. End with 3 key points. Write for experienced investors." />
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Leave blank to use standard settings based on genre and tone.</p>
        </div>
        <KBLink url="https://knowledgebase.getjaime.io/knowledge-base/how-ai-article-generation-works/" label="Read: How AI Generation Works" />
      </Section>

      {/* AI Model */}
      <Section title="AI Model" desc="Choose which AI model generates your articles.">
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Auto uses the fastest available model with automatic fallback.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { v: "auto", l: "Auto (Recommended)", d: "Fastest available with fallback", badge: "Smart", badgeColor: "#2dd4bf", ok: true },
            { v: "groq", l: "Groq — Llama 3.3 70B", d: "Fastest, lowest cost", badge: "Fastest", badgeColor: "#3b82f6", ok: providers?.groq?.available },
            { v: "anthropic", l: "Anthropic — Claude Sonnet", d: "Highest quality output", badge: "Best Quality", badgeColor: "#8b5cf6", ok: true },
            { v: "openai", l: "OpenAI — GPT-4o", d: "Balanced quality and speed", badge: "Balanced", badgeColor: "#f59e0b", ok: providers?.openai?.available },
            { v: "gemini", l: "Google — Gemini 2.5 Flash", d: "Fast and affordable", badge: "Affordable", badgeColor: "#22c55e", ok: providers?.gemini?.available },
          ].map(opt => (
            <div key={opt.v} onClick={() => opt.ok !== false && upd("llm_provider", opt.v)}
              style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 8, border: (s.llm_provider || "auto") === opt.v ? "2px solid #2dd4bf" : "1px solid #e5e7eb", cursor: opt.ok !== false ? "pointer" : "not-allowed", background: (s.llm_provider || "auto") === opt.v ? "#f0fdfa" : "#fff", opacity: opt.ok !== false ? 1 : 0.5 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: (s.llm_provider || "auto") === opt.v ? "#2dd4bf" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                {(s.llm_provider || "auto") === opt.v && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2dd4bf" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.l}</span>
                  <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: opt.badgeColor + "20", color: opt.badgeColor }}>{opt.badge}</span>
                  {opt.ok === false && <span style={{ fontSize: 10, color: "#9ca3af" }}>Not configured</span>}
                </div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{opt.d}</p>
              </div>
            </div>
          ))}
        </div>
        <KBLink url="https://knowledgebase.getjaime.io/knowledge-base/choosing-your-ai-model/" label="Read: Choosing Your AI Model" />
      </Section>

      <style>{`@media (max-width: 768px) { .ce-grid { grid-template-columns: 1fr !important; } }`}</style>
    </TenantLayout>
  );
}
