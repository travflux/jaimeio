import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { X, ChevronRight, ChevronLeft, Check, HelpCircle, ExternalLink } from "lucide-react";

const KB_BASE = "https://knowledgebase.getjaime.io/knowledge-base/";

const STEPS = [
  { n: 1, label: "Brand" },
  { n: 2, label: "Design" },
  { n: 3, label: "Content" },
  { n: 4, label: "Sources" },
  { n: 5, label: "Social" },
  { n: 6, label: "Newsletter" },
  { n: 7, label: "Launch" },
];

function Tip({ text }: { text: string }) {
  return <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{"💡 " + text}</p>;
}

function KBLink({ path, label }: { path: string; label: string }) {
  return (
    <a href={KB_BASE + path} target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--brand-primary, #2dd4bf)", textDecoration: "none", marginTop: 12 }}>
      <ExternalLink size={12} /> {label}
    </a>
  );
}

function FieldTooltipIcon({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <HelpCircle size={13} style={{ color: "#9ca3af", cursor: "pointer", marginLeft: 4 }}
        onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(v => !v)} />
      {visible && (
        <span style={{ position: "absolute", left: 20, top: 0, zIndex: 50, width: 256, background: "#fff", color: "#374151", fontSize: 12, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb", padding: 12, lineHeight: 1.5, pointerEvents: "auto" }}
          onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
          {text}
        </span>
      )}
    </span>
  );
}

function Field({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
        {label}
        <FieldTooltipIcon text={tooltip} />
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" };
const selectStyle: React.CSSProperties = { ...inputStyle };

interface Props { open: boolean; onClose: () => void; }

export default function SetupWizardModal({ open, onClose }: Props) {
  const { licenseId, settings: initSettings } = useTenantContext();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [s, setS] = useState<Record<string, string>>({});
  const [feeds, setFeeds] = useState({ f1: "", f2: "", f3: "" });

  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  const addFeedMut = trpc.sourceFeeds.add.useMutation();

  useEffect(() => {
    if (initSettings) {
      setS(initSettings);
      const saved = parseInt(initSettings.setup_wizard_step || "1");
      if (saved > 1 && saved <= 7) setStep(saved);
    }
  }, [initSettings]);

  const upd = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));

  const saveAndNext = async (extra: Record<string, string> = {}) => {
    if (!licenseId) return;
    setSaving(true);
    try {
      const data: Record<string, string> = { ...extra, setup_wizard_step: String(step + 1) };
      await saveMut.mutateAsync({ licenseId, settings: data });
      setStep(step + 1);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const saveFeedsAndNext = async () => {
    if (!licenseId) return;
    setSaving(true);
    try {
      for (const url of [feeds.f1, feeds.f2, feeds.f3].filter(u => u.trim())) {
        try { await addFeedMut.mutateAsync({ url: url.trim() }); } catch { /* dup ok */ }
      }
      await saveMut.mutateAsync({ licenseId, settings: { setup_wizard_step: "5" } });
      setStep(5);
    } catch { toast.error("Failed to save feeds"); }
    finally { setSaving(false); }
  };

  const launch = async () => {
    if (!licenseId) return;
    setSaving(true);
    try {
      await saveMut.mutateAsync({ licenseId, settings: { setup_complete: "true", setup_wizard_step: "7" } });
      toast.success("Your publication is live!");
      onClose();
    } catch { toast.error("Failed to launch"); }
    finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 12, width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", margin: 16, zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Publication Setup</h2>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Step {step} of 7 — {STEPS[step - 1].label}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={18} /></button>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 4, padding: "12px 24px 0" }}>
          {STEPS.map(st => (
            <div key={st.n} style={{ flex: 1 }}>
              <div style={{ height: 4, borderRadius: 2, background: st.n < step ? "#2dd4bf" : st.n === step ? "#2dd4bf80" : "#e5e7eb" }} />
              <p style={{ fontSize: 10, textAlign: "center", color: st.n === step ? "#2dd4bf" : "#9ca3af", marginTop: 4 }}>{st.label}</p>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {step === 1 && (<div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Your brand identity</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>This is how your publication introduces itself. Your name and tagline appear in the masthead.</p>
            <Field label="Publication Name" tooltip="The name of your publication. Appears in the browser tab, masthead, and social shares.">
              <input style={inputStyle} placeholder="e.g. Wilder Blueprint, Niki James" value={s.brand_site_name || ""} onChange={e => upd("brand_site_name", e.target.value)} />
              <Tip text='Ask ChatGPT: "Suggest 5 names for a publication about [your topic]"' />
            </Field>
            <Field label="Tagline" tooltip="A short phrase under your name. Keep it under 60 characters.">
              <input style={inputStyle} placeholder="e.g. Intelligence is the New Luxury" value={s.brand_tagline || ""} onChange={e => upd("brand_tagline", e.target.value)} />
            </Field>
            <Field label="Description" tooltip="2-3 sentences for SEO and social sharing previews.">
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder="What is your publication about and who is it for?" value={s.brand_description || ""} onChange={e => upd("brand_description", e.target.value)} />
            </Field>
            <KBLink path="how-to-set-up-your-publication/" label="Read: How to Set Up Your Publication" />
          </div>)}

          {step === 2 && (<div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Design & Layout</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Choose your template, colors, and fonts.</p>
            <Field label="Template" tooltip="Controls your overall layout. Editorial for news, Magazine for lifestyle, Modern for tech, Minimal for writers, Corporate for B2B, Creative for personal brands.">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["editorial","Editorial — News"],["magazine","Magazine — Lifestyle"],["modern","Modern — Tech"],["minimal","Minimal — Writers"],["corporate","Corporate — B2B"],["creative","Creative — Personal"]].map(([id, name]) => (
                  <div key={id} onClick={() => upd("brand_template", id)} style={{ padding: 10, borderRadius: 8, border: (s.brand_template || "editorial") === id ? "2px solid #2dd4bf" : "1px solid #e5e7eb", cursor: "pointer", background: (s.brand_template || "editorial") === id ? "#f0fdfa" : "#fff" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                  </div>
                ))}
              </div>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Primary Color" tooltip="Your main brand color for links, buttons, accents.">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={s.brand_color_primary || "#000000"} onChange={e => upd("brand_color_primary", e.target.value)} style={{ width: 36, height: 34, border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }} />
                  <input style={{ ...inputStyle, fontFamily: "monospace" }} value={s.brand_color_primary || ""} onChange={e => upd("brand_color_primary", e.target.value)} />
                </div>
              </Field>
              <Field label="Secondary Color" tooltip="Used for nav, footer, and complementary elements.">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={s.brand_color_secondary || "#ffffff"} onChange={e => upd("brand_color_secondary", e.target.value)} style={{ width: 36, height: 34, border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }} />
                  <input style={{ ...inputStyle, fontFamily: "monospace" }} value={s.brand_color_secondary || ""} onChange={e => upd("brand_color_secondary", e.target.value)} />
                </div>
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Heading Font" tooltip="For headlines and section titles. Serif = editorial/premium, Sans-serif = modern/clean.">
                <select style={selectStyle} value={s.brand_heading_font || "Inter"} onChange={e => upd("brand_heading_font", e.target.value)}>
                  {["Inter","Playfair Display","Merriweather","Lora","Cormorant Garamond","DM Serif Display","Libre Baskerville","Bebas Neue","Oswald","Montserrat","Poppins"].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Body Font" tooltip="For article text. Should be readable at small sizes.">
                <select style={selectStyle} value={s.brand_body_font || "Inter"} onChange={e => upd("brand_body_font", e.target.value)}>
                  {["Inter","DM Sans","Source Sans 3","Lato","Open Sans","Nunito Sans","Roboto","Work Sans","Mulish","Merriweather","Lora"].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
            </div>
            <KBLink path="customizing-colors-and-fonts/" label="Read: Customizing Colors and Fonts" />
          </div>)}

          {step === 3 && (<div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Content Engine</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Tell the AI what kind of content to write and how many articles to produce daily.</p>
            <Field label="Publication Genre" tooltip="Shapes how the AI writes. Real estate gets market analysis, satire gets humor.">
              <select style={selectStyle} value={s.brand_genre || "general"} onChange={e => upd("brand_genre", e.target.value)}>
                {[["general","General News"],["real-estate","Real Estate & Investing"],["technology","Technology & AI"],["lifestyle","Lifestyle & Wellness"],["finance","Finance & Business"],["satire","Satire & Commentary"],["fashion","Fashion & Culture"],["fitness","Fitness & Health"],["food","Food & Hospitality"],["travel","Travel & Adventure"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Writing Tone" tooltip="How articles sound. Authoritative = The Economist. Conversational = a friend explaining.">
              <select style={selectStyle} value={s.writing_tone || "professional"} onChange={e => upd("writing_tone", e.target.value)}>
                {[["professional","Professional & Authoritative"],["conversational","Conversational & Approachable"],["analytical","Analytical & Data-Driven"],["inspirational","Inspirational & Motivating"],["educational","Educational & Explanatory"],["bold","Bold & Opinionated"],["luxury","Luxury & Premium"],["satirical","Satirical & Humorous"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Articles Per Day" tooltip="Start with 3-5 and increase once you are happy with quality.">
              <select style={selectStyle} value={s.max_daily_articles || "3"} onChange={e => upd("max_daily_articles", e.target.value)}>
                {["1","2","3","5","7","10","15","20"].map(n => <option key={n} value={n}>{n} articles per day</option>)}
              </select>
              <Tip text="Recommended: Start with 3-5 per day." />
            </Field>
            <Field label="Custom AI Instructions (optional)" tooltip="Advanced: specific instructions beyond genre and tone. Leave blank for smart defaults.">
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder="e.g. Always include actionable advice. Focus on data-driven insights." value={s.article_llm_system_prompt || ""} onChange={e => upd("article_llm_system_prompt", e.target.value)} />
            </Field>
            <KBLink path="how-ai-article-generation-works/" label="Read: How AI Article Generation Works" />
          </div>)}

          {step === 4 && (<div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Source Feeds</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>RSS feeds are how JAIME.IO discovers topics to write about. Add feeds from publications in your niche.</p>
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>How to find RSS feeds:</p>
              <ul style={{ color: "#6b7280", margin: 0, paddingLeft: 16 }}>
                <li>Add <code>/feed</code> to any WordPress site URL</li>
                <li>Google News: <code>news.google.com/rss/search?q=YOUR+TOPIC</code></li>
                <li>Reddit: <code>reddit.com/r/SUBREDDIT/.rss</code></li>
              </ul>
            </div>
            {[{k:"f1",l:"Feed #1",p:"https://www.inman.com/feed/"},{k:"f2",l:"Feed #2",p:"https://news.google.com/rss/search?q=real+estate"},{k:"f3",l:"Feed #3",p:"https://www.reddit.com/r/realestateinvesting/.rss"}].map(f => (
              <Field key={f.k} label={f.l} tooltip="Paste a full RSS feed URL. You can add more feeds later in Content > Source Feeds.">
                <input style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} placeholder={f.p} value={feeds[f.k as keyof typeof feeds]} onChange={e => setFeeds(p => ({ ...p, [f.k]: e.target.value }))} />
              </Field>
            ))}
            <Tip text="You can skip this and add feeds later. We recommend at least 3 feeds." />
            <KBLink path="adding-and-managing-rss-feeds/" label="Read: Adding and Managing RSS Feeds" />
          </div>)}

          {step === 5 && (<div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Social Distribution</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>JAIME.IO uses Blotato to post articles to Instagram, Twitter, LinkedIn, and more automatically.</p>
            <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
              <p style={{ fontWeight: 600, color: "#0d9488", marginBottom: 2 }}>What is Blotato?</p>
              <p style={{ color: "#6b7280" }}>A social scheduling platform. One API key connects all your accounts.</p>
              <a href="https://blotato.com/?ref=jaime" target="_blank" rel="noopener noreferrer" style={{ color: "#0d9488", fontSize: 11, textDecoration: "underline" }}>Create a free account at blotato.com</a>
            </div>
            <Field label="Blotato API Key" tooltip="Find at my.blotato.com > Settings > API > Generate Key.">
              <input type="password" style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} placeholder="blt_xxxxxxxxxxxxxxxx" value={s.blotato_api_key || ""} onChange={e => upd("blotato_api_key", e.target.value)} />
            </Field>
            <Tip text="You can skip this and configure social later in Social Media > Distribution." />
            <KBLink path="connecting-blotato/" label="Read: Connecting Blotato" />
          </div>)}

          {step === 6 && (<div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Newsletter</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>JAIME.IO uses Resend for email newsletters. Free for up to 3,000 emails/month.</p>
            <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
              <p style={{ fontWeight: 600, color: "#0d9488", marginBottom: 2 }}>What is Resend?</p>
              <p style={{ color: "#6b7280" }}>A modern email delivery service. Free tier: 3,000 emails/month.</p>
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" style={{ color: "#0d9488", fontSize: 11, textDecoration: "underline" }}>Create a free account at resend.com</a>
            </div>
            <Field label="Resend API Key" tooltip="Find at resend.com > API Keys > Create API Key. Starts with re_.">
              <input type="password" style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} placeholder="re_xxxxxxxxxxxxxxxx" value={s.resend_api_key || ""} onChange={e => upd("resend_api_key", e.target.value)} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="From Name" tooltip="Name subscribers see in their inbox.">
                <input style={inputStyle} placeholder="e.g. Niki James" value={s.resend_from_name || ""} onChange={e => upd("resend_from_name", e.target.value)} />
              </Field>
              <Field label="From Email" tooltip="Must be a domain you own and verified in Resend.">
                <input type="email" style={inputStyle} placeholder="newsletter@yourdomain.com" value={s.resend_from_email || ""} onChange={e => upd("resend_from_email", e.target.value)} />
              </Field>
            </div>
            <Tip text="You can skip this and configure newsletter later in Communications." />
            <KBLink path="setting-up-newsletter-resend/" label="Read: Setting Up Newsletter with Resend" />
          </div>)}

          {step === 7 && (<div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Review & Launch 🎉</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Review your setup. You can change anything later from your portal.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { l: "Publication Name", v: s.brand_site_name || "Not set", ok: !!s.brand_site_name, st: 1 },
                { l: "Template", v: s.brand_template || "editorial", ok: true, st: 2 },
                { l: "Colors", v: (s.brand_color_primary || "#000") + " / " + (s.brand_color_secondary || "#fff"), ok: true, st: 2 },
                { l: "Genre & Tone", v: (s.brand_genre || "general") + " · " + (s.writing_tone || "professional"), ok: true, st: 3 },
                { l: "Daily Articles", v: (s.max_daily_articles || "3") + " per day", ok: true, st: 3 },
                { l: "Social", v: s.blotato_api_key ? "Blotato connected" : "Not configured", ok: !!s.blotato_api_key, st: 5 },
                { l: "Newsletter", v: s.resend_api_key ? "Resend connected" : "Not configured", ok: !!s.resend_api_key, st: 6 },
              ].map(item => (
                <div key={item.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{item.l}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{item.v}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {item.ok ? <Check size={14} style={{ color: "#22c55e" }} /> : <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid #fde68a", color: "#92400e", background: "#fffbeb" }}>Optional</span>}
                    <button onClick={() => setStep(item.st)} style={{ fontSize: 11, color: "#2dd4bf", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
            {!s.brand_site_name && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, marginTop: 12 }}>
              <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 500 }}>Publication name is required.</p>
              <button onClick={() => setStep(1)} style={{ fontSize: 11, color: "#dc2626", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Go to Step 1</button>
            </div>}
            <KBLink path="quick-start-checklist/" label="Read: Quick Start Checklist" />
          </div>)}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 6, border: "none", background: "transparent", fontSize: 13, cursor: "pointer", color: "#6b7280" }}>
            <ChevronLeft size={14} /> {step === 1 ? "Close" : "Back"}
          </button>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{step} of 7</span>
          {step < 7 ? (
            <button onClick={() => {
              if (step === 1) saveAndNext({ brand_site_name: s.brand_site_name || "", brand_tagline: s.brand_tagline || "", brand_description: s.brand_description || "" });
              else if (step === 2) saveAndNext({ brand_template: s.brand_template || "editorial", brand_color_primary: s.brand_color_primary || "", brand_color_secondary: s.brand_color_secondary || "", brand_heading_font: s.brand_heading_font || "Inter", brand_body_font: s.brand_body_font || "Inter" });
              else if (step === 3) saveAndNext({ brand_genre: s.brand_genre || "general", writing_tone: s.writing_tone || "professional", max_daily_articles: s.max_daily_articles || "3", ...(s.article_llm_system_prompt ? { article_llm_system_prompt: s.article_llm_system_prompt } : {}) });
              else if (step === 4) saveFeedsAndNext();
              else if (step === 5) saveAndNext(s.blotato_api_key ? { blotato_api_key: s.blotato_api_key } : {});
              else if (step === 6) saveAndNext({ ...(s.resend_api_key ? { resend_api_key: s.resend_api_key } : {}), ...(s.resend_from_name ? { resend_from_name: s.resend_from_name } : {}), ...(s.resend_from_email ? { resend_from_email: s.resend_from_email } : {}) });
            }} disabled={saving || (step === 1 && !s.brand_site_name)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 6, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save & Continue"} <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={launch} disabled={saving || !s.brand_site_name}
              style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#2dd4bf", color: "#0f2d5e", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Launching..." : "🚀 Launch Publication"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
