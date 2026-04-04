import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, ChevronLeft, ChevronRight, Check, HelpCircle,
  Palette, Pen, Image, FolderOpen, Search, MessageSquare, Share2, Settings, Rocket,
  ExternalLink, Plus, Trash2, GripVertical, Rss, Video, Mail, Phone, DollarSign, ShoppingBag,
} from "lucide-react";
import { GoogleFontPicker } from "@/components/wizard/GoogleFontPicker";

/* ─── Constants ───────────────────────────────────────────────────── */

const STEPS = [
  { label: "Brand & Identity", icon: Palette },
  { label: "Content Engine", icon: Pen },
  { label: "Images & Video", icon: Image },
  { label: "Categories", icon: FolderOpen },
  { label: "Sponsorship & Ads", icon: DollarSign },
  { label: "Shop", icon: ShoppingBag },
  { label: "SEO & GEO", icon: Search },
  { label: "Communications", icon: MessageSquare },
  { label: "Social Distribution", icon: Share2 },
  { label: "Production Engine", icon: Settings },
  { label: "Review & Launch", icon: Rocket },
];

const STEP_LABELS = ["Brand", "Content", "Images", "Categories", "Sponsorship", "Shop", "SEO & GEO", "Comms", "Social", "Production", "Review"];

const IMAGE_PROVIDERS = [
  { id: "dalle", label: "DALL-E (OpenAI)", tooltip: "Uses OpenAI to create original AI-generated images." },
  { id: "replicate", label: "Replicate", tooltip: "Uses Replicate to run image generation models." },
  { id: "unsplash", label: "Unsplash", tooltip: "Sources real photographs from Unsplash." },
  { id: "pexels", label: "Pexels", tooltip: "Sources high-quality stock photos from Pexels." },
  { id: "pixabay", label: "Pixabay", tooltip: "Sources free images and illustrations from Pixabay." },
  { id: "none", label: "None", tooltip: "No image generation." },
];

const VIDEO_PROVIDERS = [
  { id: "replicate", label: "Replicate" },
  { id: "runwayml", label: "RunwayML" },
  { id: "none", label: "None" },
];

/* ─── Shared UI helpers ───────────────────────────────────────────── */

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors"
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(!show)}>
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 text-xs bg-popover border rounded-lg shadow-lg text-popover-foreground">
          {text}
        </span>
      )}
    </span>
  );
}

function FieldLabel({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <label className="text-sm font-medium flex items-center gap-0.5 mb-1.5">
      {label}
      {tooltip && <Tooltip text={tooltip} />}
    </label>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold mt-8 mb-4 first:mt-0">{children}</h3>;
}

function HelpLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener"
      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
      {label} <ExternalLink className="w-3 h-3" />
    </a>
  );
}

/* ─── Props for embedded mode ─────────────────────────────────────── */

export interface TenantSetupProps {
  /** When true, renders without header/footer (embedded in dashboard) */
  embedded?: boolean;
  /** Override license ID (used by super admin) */
  adminLicenseId?: number | null;
}

/* ─── Main Component ──────────────────────────────────────────────── */

export default function TenantSetup({ embedded, adminLicenseId: propAdminId }: TenantSetupProps = {}) {
  const [, adminParams] = useRoute("/admin/licenses/:id/setup");
  const adminLicenseId = propAdminId ?? (adminParams?.id ? Number(adminParams.id) : null);

  const hostname = window.location.hostname;
  const licenseQuery = trpc.tenantAuth.resolveLicense.useQuery(
    { hostname },
    { enabled: !adminLicenseId, retry: false }
  );
  const licenseId = adminLicenseId || licenseQuery.data?.id || null;
  const licenseName = licenseQuery.data?.clientName || "";

  const settingsQuery = trpc.licenseSettings.getAll.useQuery(
    { licenseId: licenseId! },
    { enabled: !!licenseId }
  );
  const brandLogoUrl = settingsQuery.data?.brand_logo_url || "";
  const isEnterprise = licenseQuery.data?.tier === "enterprise";

  const setBulk = trpc.licenseSettings.setBulk.useMutation({
    onSuccess: () => toast.success("Settings saved"),
    onError: (e: any) => toast.error(e.message),
  });

  const [step, setStep] = useState(0);
  const [s, setS] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) setS(settingsQuery.data);
  }, [settingsQuery.data]);

  const val = (key: string, def = "") => s[key] ?? def;
  const upd = (key: string, value: string) => { setS(prev => ({ ...prev, [key]: value })); setDirty(true); };

  const save = () => {
    if (!licenseId) return;
    setBulk.mutate({ licenseId, settings: s });
    setDirty(false);
  };

  if (!licenseId && !licenseQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No license found for this domain.</p>
      </div>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stepComplete = (i: number): boolean => {
    switch (i) {
      case 0: return !!(val("brand_name") && val("brand_primary_color"));
      case 1: return !!val("content_tone");
      case 2: return true;
      case 3: return true;
      case 4: return true; // Sponsorship
      case 5: return true; // Shop
      case 6: return true; // SEO & GEO
      case 7: return true; // Comms
      case 8: return true; // Social
      case 9: return true; // Production
      case 10: return true; // Review
      default: return false;
    }
  };

  const pubName = licenseQuery.data?.clientName || licenseName || "Publication";

  /* ─── Wizard content ──────────────────────────────────────────── */
  const wizardContent = (
    <>
      {/* Progress bar with step labels */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-30">
        <div style={{ padding: embedded ? "12px 0 16px 0" : "12px 40px 16px 40px" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{step + 1} of {STEPS.length} steps</span>
            <span className="text-xs text-muted-foreground">{STEPS[step].label}</span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((st, i) => {
              const isComplete = stepComplete(i);
              const isCurrent = i === step;
              const isStarted = i < step;
              const dotColor = isCurrent ? "bg-[#2dd4bf]" : isComplete ? "bg-green-500" : isStarted ? "bg-amber-400" : "bg-muted";
              return (
                <button key={i} onClick={() => { if (dirty) save(); setStep(i); }}
                  className="flex-1 flex flex-col items-center gap-1">
                  <div className={"h-2 w-full rounded-full transition-colors " + dotColor} />
                  <span style={{ fontSize: 10 }} className={
                    isCurrent ? "text-[#2dd4bf] font-medium" : isComplete ? "text-green-600" : isStarted ? "text-amber-500" : "text-muted-foreground/50"
                  }>{STEP_LABELS[i]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: embedded ? "24px 0" : "32px 40px" }}>
        <div className="max-w-5xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-headline mb-1">{STEPS[step].label}</h2>
          </div>

          {/* ═══ SCREEN 1 — Brand & Identity ═══ */}
          {step === 0 && (
            <div className="space-y-6">
              <SectionHeading>Publication Identity</SectionHeading>
              <div>
                <FieldLabel label="Publication Name" tooltip="The name readers see across your site and in browser tabs." />
                <Input value={val("brand_name")} onChange={e => upd("brand_name", e.target.value)} placeholder="My Publication" />
              </div>
              <div>
                <FieldLabel label="Tagline" tooltip="A short, punchy line that appears below your logo. Think of it as your publication's motto." />
                <Input value={val("brand_tagline")} onChange={e => { if (e.target.value.length <= 100) upd("brand_tagline", e.target.value); }}
                  placeholder="News as it should have been reported." maxLength={100} />
                <p className="text-xs text-muted-foreground mt-1">{(val("brand_tagline") || "").length}/100</p>
              </div>
              <div>
                <FieldLabel label="Site Description" tooltip="A detailed summary of what your publication covers. Used in search results, social shares, and auto-generated pages like About and Privacy." />
                <textarea className="w-full min-h-[100px] p-3 border rounded-lg bg-background text-sm"
                  value={val("brand_description")}
                  onChange={e => upd("brand_description", e.target.value)}
                  placeholder="A daily publication covering technology, innovation, and the future of work. We deliver in-depth analysis, breaking news, and expert commentary to keep you informed about the topics that matter most." maxLength={1000} />
                <p className="text-xs text-muted-foreground mt-1">{(val("brand_description") || "").length}/1000</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Primary Color" tooltip="Your main brand color. Used for buttons, links, and key highlights." />
                  <div className="flex items-center gap-3">
                    <input type="color" value={val("brand_primary_color", "#0f2d5e")}
                      onChange={e => upd("brand_primary_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
                    <Input value={val("brand_primary_color", "#0f2d5e")}
                      onChange={e => upd("brand_primary_color", e.target.value)} className="w-32 font-mono" />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Secondary Color" tooltip="A supporting color used for accents and category labels." />
                  <div className="flex items-center gap-3">
                    <input type="color" value={val("brand_secondary_color", "#2dd4bf")}
                      onChange={e => upd("brand_secondary_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
                    <Input value={val("brand_secondary_color", "#2dd4bf")}
                      onChange={e => upd("brand_secondary_color", e.target.value)} className="w-32 font-mono" />
                  </div>
                </div>
              </div>

              <SectionHeading>Logos & Favicon</SectionHeading>
              <div>
                <FieldLabel label="Light Theme Logo" tooltip="Used on white or light backgrounds. PNG with transparent background recommended." />
                <Input value={val("brand_logo_light_url")} onChange={e => upd("brand_logo_light_url", e.target.value)}
                  placeholder="https://example.com/logo-light.png" />
              </div>
              <div>
                <FieldLabel label="Dark Theme Logo" tooltip="Used on dark backgrounds. PNG with transparent background recommended." />
                <Input value={val("brand_logo_dark_url")} onChange={e => upd("brand_logo_dark_url", e.target.value)}
                  placeholder="https://example.com/logo-dark.png" />
              </div>
              <div>
                <FieldLabel label="Favicon" tooltip="The small icon shown in browser tabs. Square image, at least 64x64px recommended." />
                <Input value={val("brand_favicon_url")} onChange={e => upd("brand_favicon_url", e.target.value)}
                  placeholder="https://example.com/favicon.png" />
              </div>
              <p className="text-xs text-muted-foreground">If no logo is uploaded, your publication name appears as text.</p>

              <SectionHeading>Business Contact</SectionHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Business Name" tooltip="Your legal or trading business name." />
                  <Input value={val("brand_business_name")} onChange={e => upd("brand_business_name", e.target.value)} placeholder="Acme Media LLC" />
                </div>
                <div>
                  <FieldLabel label="Contact Email" tooltip="Public contact email address shown on your contact page." />
                  <Input type="email" value={val("brand_contact_email")} onChange={e => upd("brand_contact_email", e.target.value)} placeholder="hello@example.com" />
                </div>
                <div>
                  <FieldLabel label="Phone Number" tooltip="Public contact phone number." />
                  <Input value={val("brand_phone")} onChange={e => upd("brand_phone", e.target.value)} placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <FieldLabel label="Website URL" tooltip="Your main website if this publication is separate from it. Used for the website link icon in your footer." />
                  <Input value={val("brand_website_url")} onChange={e => upd("brand_website_url", e.target.value)} placeholder="https://example.com" />
                </div>
              </div>
              <div>
                <FieldLabel label="Address" tooltip="Your business address. Used in legal pages and contact information." />
                <textarea className="w-full min-h-[60px] p-3 border rounded-lg bg-background text-sm"
                  value={val("brand_address")} onChange={e => upd("brand_address", e.target.value)}
                  placeholder="123 Main St, Suite 100, New York, NY 10001" />
              </div>

              <SectionHeading>Typography</SectionHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GoogleFontPicker type="heading" label="Heading Font" value={val("brand_heading_font", "Playfair Display")}
                  onChange={v => upd("brand_heading_font", v)}
                  tooltip="The font used for headlines and article titles. Choose something distinctive." />
                <GoogleFontPicker type="body" label="Body Font" value={val("brand_body_font", "Inter")}
                  onChange={v => upd("brand_body_font", v)}
                  tooltip="The font used for article text. Choose something easy to read." />
              </div>

              <SectionHeading>Custom Domain</SectionHeading>
              <div>
                <FieldLabel label="Custom Domain" tooltip="Enter your own domain like mynews.com to use instead of your getjaime.io address." />
                <Input value={val("custom_domain")} onChange={e => upd("custom_domain", e.target.value)} placeholder="news.example.com" />
              </div>
              <Card className="bg-muted/50">
                <CardContent className="pt-4 text-sm">
                  <p className="font-medium mb-2">To connect your domain, add this DNS record with your domain registrar:</p>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-background p-3 rounded-lg border">
                    <div><span className="text-muted-foreground">Type:</span> CNAME</div>
                    <div><span className="text-muted-foreground">Name:</span> @ (or www)</div>
                    <div><span className="text-muted-foreground">Value:</span> publications.getjaime.io</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">TTL: Auto. DNS changes may take up to 48 hours to propagate.</p>
                  {val("custom_domain") && (
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => toast.info("DNS verification coming soon")}>Verify DNS</Button>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ SCREEN 2 — Content Engine (merged with Sources) ═══ */}
          {step === 1 && (
            <div className="space-y-6">
              <SectionHeading>Content Settings</SectionHeading>
              <div>
                <FieldLabel label="Writing Style" tooltip="Sets the voice and style the AI uses when writing articles." />
                <textarea className="w-full min-h-[100px] p-3 border rounded-lg bg-background text-sm"
                  value={val("content_writing_style")}
                  onChange={e => upd("content_writing_style", e.target.value)}
                  placeholder="Write in a conversational yet informative tone. Use short paragraphs. Include real-world examples." />
              </div>
              <div>
                <FieldLabel label="Content Tone" tooltip="The overall mood of your content." />
                <select className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  value={val("content_tone", "professional")} onChange={e => upd("content_tone", e.target.value)}>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="authoritative">Authoritative</option>
                  <option value="conversational">Conversational</option>
                  <option value="playful">Playful</option>
                </select>
              </div>
              <div>
                <FieldLabel label={"Target Article Length: " + val("content_article_length", "800") + " words"}
                  tooltip="How long each article should be." />
                <input type="range" min={200} max={2000} step={50}
                  value={val("content_article_length", "800")}
                  onChange={e => upd("content_article_length", e.target.value)} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>200</span><span>2000</span></div>
              </div>
              <div>
                <FieldLabel label="Articles Per Batch" tooltip="How many articles are generated each time the workflow runs." />
                <Input type="number" min={1} max={20} value={val("content_articles_per_batch", "5")}
                  onChange={e => upd("content_articles_per_batch", e.target.value)} className="w-32" />
              </div>
              <div>
                <FieldLabel label="Auto-Approve Articles" tooltip="When on, articles are published automatically without review." />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("content_auto_approve") === "true"}
                    onChange={e => upd("content_auto_approve", e.target.checked ? "true" : "false")} />
                  <span className="text-sm">Automatically approve and publish generated articles</span>
                </label>
              </div>
              {val("content_auto_approve") !== "true" && (
                <div>
                  <FieldLabel label="Content Approver" tooltip="This person reviews articles before publishing." />
                  <Input type="email" value={val("content_approver_email")}
                    onChange={e => upd("content_approver_email", e.target.value)} placeholder="approver@company.com" />
                </div>
              )}

              <SectionHeading>Content Sources</SectionHeading>
              <div>
                <FieldLabel label="RSS Feeds" tooltip="Paste RSS feed addresses of news sources the AI uses for inspiration." />
                <FeedListEditor value={val("rss_feeds", "[]")} onChange={v => upd("rss_feeds", v)} />
              </div>
              <div>
                <FieldLabel label="Google News Keywords" tooltip="Keywords that pull trending topics from Google News." />
                <Input value={val("google_news_keywords")}
                  onChange={e => upd("google_news_keywords", e.target.value)}
                  placeholder="artificial intelligence, tech startups, climate change" />
              </div>

              {/* Twitter/X */}
              <div className="border rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("source_x_enabled") === "true"}
                    onChange={e => upd("source_x_enabled", e.target.checked ? "true" : "false")} />
                  <span className="text-sm font-medium">Twitter/X Listening</span>
                  <Tooltip text="Monitor Twitter/X for trending topics and conversations around these keywords. Requires X API read-only access." />
                </label>
                {val("source_x_enabled") === "true" && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <FieldLabel label="Keywords" />
                      <Input value={val("source_x_keywords")} onChange={e => upd("source_x_keywords", e.target.value)}
                        placeholder="AI, machine learning, tech news" />
                    </div>
                    <div>
                      <FieldLabel label="X Bearer Token" />
                      <Input type="password" value={val("source_x_bearer_token")} onChange={e => upd("source_x_bearer_token", e.target.value)} />
                      <HelpLink href="/support/how-to-get-x-api-key" label="How to get your X API key" />
                    </div>
                  </div>
                )}
              </div>

              {/* YouTube */}
              <div className="border rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("source_youtube_enabled") === "true"}
                    onChange={e => upd("source_youtube_enabled", e.target.checked ? "true" : "false")} />
                  <span className="text-sm font-medium">YouTube Referencing</span>
                  <Tooltip text="Reference trending YouTube videos and transcripts as content inspiration." />
                </label>
                {val("source_youtube_enabled") === "true" && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <FieldLabel label="Channel IDs or Keywords" />
                      <Input value={val("source_youtube_channels")} onChange={e => upd("source_youtube_channels", e.target.value)}
                        placeholder="@TechChannel, AI tutorials" />
                    </div>
                    <div>
                      <FieldLabel label="YouTube API Key" />
                      <Input type="password" value={val("source_youtube_api_key")} onChange={e => upd("source_youtube_api_key", e.target.value)} />
                      <HelpLink href="/support/how-to-get-youtube-api-key" label="How to get your YouTube API key" />
                    </div>
                  </div>
                )}
              </div>

              {/* Reddit */}
              <div className="border rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("source_reddit_enabled") === "true"}
                    onChange={e => upd("source_reddit_enabled", e.target.checked ? "true" : "false")} />
                  <span className="text-sm font-medium">Reddit Listening</span>
                  <Tooltip text="Monitor Reddit communities for trending topics and discussions." />
                </label>
                {val("source_reddit_enabled") === "true" && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <FieldLabel label="Subreddits" />
                      <Input value={val("source_reddit_subreddits")} onChange={e => upd("source_reddit_subreddits", e.target.value)}
                        placeholder="r/technology, r/artificial, r/programming" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel label="Reddit Client ID" />
                        <Input value={val("source_reddit_client_id")} onChange={e => upd("source_reddit_client_id", e.target.value)} />
                      </div>
                      <div>
                        <FieldLabel label="Reddit Client Secret" />
                        <Input type="password" value={val("source_reddit_client_secret")} onChange={e => upd("source_reddit_client_secret", e.target.value)} />
                      </div>
                    </div>
                    <HelpLink href="/support/how-to-get-reddit-api-key" label="How to get Reddit API credentials" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ SCREEN 3 — Images & Video ═══ */}
          {step === 2 && (
            <div className="space-y-6">
              <SectionHeading>Image Generation</SectionHeading>
              <div>
                <FieldLabel label="Image Provider" tooltip="Choose where article images come from." />
                <select className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  value={val("image_provider", "none")} onChange={e => upd("image_provider", e.target.value)}>
                  {IMAGE_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              {val("image_provider") && val("image_provider") !== "none" && (
                <div>
                  <FieldLabel label="API Key" tooltip={"Enter your " + val("image_provider") + " API key."} />
                  <Input type="password" value={val("image_api_key")}
                    onChange={e => upd("image_api_key", e.target.value)} placeholder="Paste your API key" />
                  <HelpLink href={"/support/how-to-get-" + val("image_provider") + "-api-key"} label={"How to get your " + val("image_provider") + " API key"} />
                </div>
              )}
              <div>
                <FieldLabel label="Watermark" tooltip="Adds a small text watermark to generated images with your publication name." />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("image_watermark") === "true"}
                    onChange={e => upd("image_watermark", e.target.checked ? "true" : "false")} />
                  <span className="text-sm">Add watermark to images</span>
                </label>
                {val("image_watermark") === "true" && (
                  <Input className="mt-2" value={val("image_watermark_text")}
                    onChange={e => upd("image_watermark_text", e.target.value)} placeholder="Watermark text" />
                )}
              </div>

              <SectionHeading>Video Generation</SectionHeading>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("video_enabled") === "true"}
                    onChange={e => upd("video_enabled", e.target.checked ? "true" : "false")} />
                  <span className="text-sm font-medium">Enable Video Generation</span>
                  <Tooltip text="When on, the platform can generate short video content to accompany articles." />
                </label>
              </div>
              {val("video_enabled") === "true" && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <div>
                    <FieldLabel label="Video Provider" tooltip="The service used to generate video content." />
                    <select className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      value={val("video_provider", "none")} onChange={e => upd("video_provider", e.target.value)}>
                      {VIDEO_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                  {val("video_provider") && val("video_provider") !== "none" && (
                    <div>
                      <FieldLabel label="API Key" />
                      <Input type="password" value={val("video_api_key")} onChange={e => upd("video_api_key", e.target.value)} placeholder="Paste API key" />
                      <HelpLink href={"/support/how-to-get-" + val("video_provider") + "-api-key"} label={"How to get your " + val("video_provider") + " API key"} />
                    </div>
                  )}
                  <div>
                    <FieldLabel label="Video Style" tooltip="Describe the visual style for generated videos." />
                    <Input value={val("video_style")} onChange={e => upd("video_style", e.target.value)}
                      placeholder="Cinematic, news broadcast style with smooth transitions" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ SCREEN 4 — Categories ═══ */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Categories help organize your content. Readers can browse articles by category on your site.</p>
              <CategoriesEditor value={val("categories", "[]")} onChange={v => upd("categories", v)} />
            </div>
          )}


          {/* ═══ SCREEN 5 — Sponsorship & Advertising ═══ */}
          {step === 4 && (
            <div className="space-y-6">
              <SectionHeading>Google AdSense</SectionHeading>
              <p className="text-sm text-muted-foreground">Monetize your publication with Google Ads. Paste your AdSense publisher ID and slot IDs below.</p>
              <div>
                <FieldLabel label="AdSense Publisher ID" tooltip="Your Google AdSense publisher ID. Looks like ca-pub-XXXXXXXXXX. Find it in your AdSense account under Account → Account information." />
                <Input value={val("adsense_publisher_id")} onChange={e => upd("adsense_publisher_id", e.target.value)} placeholder="ca-pub-1234567890" />
                <HelpLink href="https://www.google.com/adsense" label="Open Google AdSense" />
              </div>
              {val("adsense_publisher_id") && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel label="Header Ad Slot" tooltip="Ad unit placed at the top of article pages." />
                      <Input value={val("adsense_slot_header")} onChange={e => upd("adsense_slot_header", e.target.value)} placeholder="1234567890" />
                    </div>
                    <div>
                      <FieldLabel label="Sidebar Ad Slot" tooltip="Ad unit placed in the article sidebar." />
                      <Input value={val("adsense_slot_sidebar")} onChange={e => upd("adsense_slot_sidebar", e.target.value)} placeholder="1234567890" />
                    </div>
                    <div>
                      <FieldLabel label="In-Article Ad Slot" tooltip="Ad unit placed between paragraphs in the article body." />
                      <Input value={val("adsense_slot_in_article")} onChange={e => upd("adsense_slot_in_article", e.target.value)} placeholder="1234567890" />
                    </div>
                    <div>
                      <FieldLabel label="Footer Ad Slot" tooltip="Ad unit placed in the footer area." />
                      <Input value={val("adsense_slot_footer")} onChange={e => upd("adsense_slot_footer", e.target.value)} placeholder="1234567890" />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={val("adsense_auto_ads") === "true"}
                        onChange={e => upd("adsense_auto_ads", e.target.checked ? "true" : "false")} />
                      <span className="text-sm">Enable Auto Ads</span>
                      <Tooltip text="Let Google automatically place additional ads on your pages for maximum revenue." />
                    </label>
                  </div>
                </div>
              )}

              <SectionHeading>Sponsorship Placements</SectionHeading>
              <p className="text-sm text-muted-foreground">Configure sponsored content placements across your publication. These appear as branded spots in articles, newsletters, and social posts.</p>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("sponsor_enabled") === "true"}
                    onChange={e => upd("sponsor_enabled", e.target.checked ? "true" : "false")} />
                  <span className="text-sm font-medium">Enable Sponsor Placements</span>
                  <Tooltip text="When on, sponsored content slots are available in articles and newsletters." />
                </label>
              </div>
              {val("sponsor_enabled") === "true" && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div>
                    <FieldLabel label="Default Sponsor Name" tooltip="The brand name shown on sponsored sections when no specific sponsor is set." />
                    <Input value={val("sponsor_default_name")} onChange={e => upd("sponsor_default_name", e.target.value)} placeholder="Our Sponsor" />
                  </div>
                  <div>
                    <FieldLabel label="Default Sponsor URL" tooltip="Link for the default sponsor. Opens in a new tab." />
                    <Input value={val("sponsor_default_url")} onChange={e => upd("sponsor_default_url", e.target.value)} placeholder="https://sponsor.com" />
                  </div>
                  <div>
                    <FieldLabel label="Sponsor Logo URL" tooltip="Logo image shown alongside sponsored content." />
                    <Input value={val("sponsor_logo_url")} onChange={e => upd("sponsor_logo_url", e.target.value)} placeholder="https://sponsor.com/logo.png" />
                  </div>
                  <div>
                    <FieldLabel label="Sponsor Disclosure Text" tooltip="Required disclaimer shown on sponsored content. Required by FTC guidelines." />
                    <Input value={val("sponsor_disclosure", "Sponsored content")} onChange={e => upd("sponsor_disclosure", e.target.value)} />
                  </div>
                </div>
              )}

              <SectionHeading>Amazon Affiliate</SectionHeading>
              <p className="text-sm text-muted-foreground">Earn commission when readers purchase products through your Amazon affiliate links.</p>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("amazon_affiliate_enabled") === "true"}
                    onChange={e => upd("amazon_affiliate_enabled", e.target.checked ? "true" : "false")} />
                  <span className="text-sm font-medium">Enable Amazon Affiliate Links</span>
                  <Tooltip text="When on, the AI automatically inserts Amazon product links in relevant articles." />
                </label>
              </div>
              {val("amazon_affiliate_enabled") === "true" && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div>
                    <FieldLabel label="Affiliate Tag" tooltip="Your Amazon Associates tracking tag. Looks like yoursite-20." />
                    <Input value={val("amazon_affiliate_tag")} onChange={e => upd("amazon_affiliate_tag", e.target.value)} placeholder="yoursite-20" />
                    <HelpLink href="https://affiliate-program.amazon.com" label="Open Amazon Associates" />
                  </div>
                  <div>
                    <FieldLabel label="Amazon API Key" tooltip="Your Product Advertising API access key for fetching product data." />
                    <Input type="password" value={val("amazon_api_key")} onChange={e => upd("amazon_api_key", e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel label="Amazon API Secret" tooltip="Your Product Advertising API secret key." />
                    <Input type="password" value={val("amazon_api_secret")} onChange={e => upd("amazon_api_secret", e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ SCREEN 6 — Shop ═══ */}
          {step === 5 && (
            <div className="space-y-6">
              <SectionHeading>Printify Integration</SectionHeading>
              <p className="text-sm text-muted-foreground">Sell branded merchandise through your publication. Products are fulfilled by Printify — no inventory needed.</p>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("printify_enabled") === "true"}
                    onChange={e => upd("printify_enabled", e.target.checked ? "true" : "false")} />
                  <span className="text-sm font-medium">Enable Shop</span>
                  <Tooltip text="When on, a Shop link appears in your navigation and readers can browse and purchase your merchandise." />
                </label>
              </div>
              {val("printify_enabled") === "true" && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div>
                    <FieldLabel label="Printify API Token" tooltip="Your Printify personal access token. Get it from Printify → Settings → Connections." />
                    <Input type="password" value={val("printify_api_token")} onChange={e => upd("printify_api_token", e.target.value)} placeholder="Paste your Printify API token" />
                    <HelpLink href="/support/how-to-setup-printify" label="How to set up Printify" />
                  </div>
                  <div>
                    <FieldLabel label="Printify Shop ID" tooltip="The numeric ID of your Printify shop. Found in your shop URL or API response." />
                    <Input value={val("printify_shop_id")} onChange={e => upd("printify_shop_id", e.target.value)} placeholder="12345678" />
                  </div>
                </div>
              )}

              <SectionHeading>Shop Navigation</SectionHeading>
              <div>
                <FieldLabel label="Shop Page Title" tooltip="The heading shown on your shop page." />
                <Input value={val("shop_page_title", "Shop")} onChange={e => upd("shop_page_title", e.target.value)} placeholder="Shop" />
              </div>
              <div>
                <FieldLabel label="Shop Page Description" tooltip="A short intro shown at the top of your shop page." />
                <textarea className="w-full min-h-[80px] p-3 border rounded-lg bg-background text-sm"
                  value={val("shop_page_description")}
                  onChange={e => upd("shop_page_description", e.target.value)}
                  placeholder="Browse our collection of branded merchandise." maxLength={300} />
                <p className="text-xs text-muted-foreground mt-1">{(val("shop_page_description") || "").length}/300</p>
              </div>
              <div>
                <FieldLabel label="Shop CTA Text" tooltip="Text for the call-to-action button on product cards." />
                <Input value={val("shop_cta_text", "Buy Now")} onChange={e => upd("shop_cta_text", e.target.value)} placeholder="Buy Now" />
              </div>
              <div>
                <FieldLabel label="External Shop URL" tooltip="If you have a separate storefront (Shopify, Etsy, etc.), paste its URL here. The Shop nav link will point there instead." />
                <Input value={val("shop_external_url")} onChange={e => upd("shop_external_url", e.target.value)} placeholder="https://yourstore.myshopify.com" />
              </div>
            </div>
          )}

          {/* ═══ SCREEN 7 — SEO & GEO ═══ */}
          {step === 6 && (
            <div className="space-y-6">
              <SectionHeading>Search Engine Optimization</SectionHeading>
              <div>
                <FieldLabel label="Google Analytics ID" tooltip="Your Google Analytics 4 tracking ID. Starts with G-. Get it at analytics.google.com under Admin → Data Streams." />
                <Input value={val("seo_ga_id")} onChange={e => upd("seo_ga_id", e.target.value)} placeholder="G-XXXXXXXXXX" />
                <HelpLink href="https://analytics.google.com" label="Open Google Analytics" />
              </div>
              <div>
                <FieldLabel label="Microsoft Clarity ID" tooltip="Free heatmap and session recording. Get your project ID at clarity.microsoft.com." />
                <Input value={val("seo_clarity_id")} onChange={e => upd("seo_clarity_id", e.target.value)} placeholder="abcdef1234" />
                <HelpLink href="https://clarity.microsoft.com" label="Open Microsoft Clarity" />
              </div>
              <div>
                <FieldLabel label="IndexNow Key" tooltip="Tells search engines about new articles instantly. Get a free key at indexnow.org." />
                <Input value={val("seo_indexnow_key")} onChange={e => upd("seo_indexnow_key", e.target.value)} placeholder="your-indexnow-key" />
                <HelpLink href="https://indexnow.org" label="Get an IndexNow key" />
              </div>

              <SectionHeading>Google Search Console</SectionHeading>
              <div>
                <FieldLabel label="GSC Verification Code" tooltip="Paste your Google Search Console HTML verification tag or meta tag content." />
                <Input value={val("seo_gsc_verification")} onChange={e => upd("seo_gsc_verification", e.target.value)} placeholder="google-site-verification=..." />
              </div>
              <div>
                <FieldLabel label="GSC Site URL" tooltip="The exact URL of your property in Google Search Console." />
                <Input value={val("seo_gsc_site_url")} onChange={e => upd("seo_gsc_site_url", e.target.value)}
                  placeholder={"https://" + (licenseQuery.data?.subdomain ? licenseQuery.data.subdomain + ".getjaime.io" : "yoursite.com")} />
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={() => toast.info("Sitemap submission coming soon")}>Submit Sitemap</Button>
                <span className="text-xs text-muted-foreground">
                  Sitemap URL: {licenseQuery.data?.subdomain ? "https://" + licenseQuery.data.subdomain + ".getjaime.io" : hostname}/api/sitemap.xml
                </span>
              </div>

              <SectionHeading>GEO Settings</SectionHeading>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("geo_enabled") === "true"}
                    onChange={e => upd("geo_enabled", e.target.checked ? "true" : "false")} />
                  <span className="text-sm font-medium">Enable GEO Optimization</span>
                  <Tooltip text="When on, every article gets a Key Takeaway summary, FAQ section, and structured markup. This helps your content get cited by AI tools like ChatGPT and Perplexity." />
                </label>
              </div>
              {val("geo_enabled") === "true" && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={val("geo_faq_enabled", "true") === "true"}
                        onChange={e => upd("geo_faq_enabled", e.target.checked ? "true" : "false")} />
                      <span className="text-sm">Include FAQ section</span>
                      <Tooltip text="Adds a Frequently Asked Questions section below each article. Great for AI citation and long-tail search." />
                    </label>
                  </div>
                  {val("geo_faq_enabled", "true") === "true" && (
                    <div>
                      <FieldLabel label="FAQ Question Count" tooltip="How many FAQ questions to generate per article." />
                      <select className="w-40 px-3 py-2 border rounded-lg bg-background text-sm"
                        value={val("geo_faq_count", "3")} onChange={e => upd("geo_faq_count", e.target.value)}>
                        <option value="3">3 questions</option>
                        <option value="4">4 questions</option>
                        <option value="5">5 questions</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <FieldLabel label="Key Takeaway Label" tooltip='The label shown above the AI-optimized summary at the top of each article.' />
                    <Input value={val("geo_takeaway_label", "Key Takeaway")}
                      onChange={e => upd("geo_takeaway_label", e.target.value)} className="w-64" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ SCREEN 8 — Communications ═══ */}
          {step === 7 && (
            <div className="space-y-6">
              <SectionHeading>Email</SectionHeading>
              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={val("email_enabled") === "true"}
                      onChange={e => upd("email_enabled", e.target.checked ? "true" : "false")} />
                    <span className="text-sm font-medium">Enable Email</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Send newsletters, notifications, and alerts to your subscribers and team members. Uses Resend to deliver emails.
                    If you don't enable this, email features will be handled by the platform on your behalf.
                  </p>
                </div>
                {val("email_enabled") === "true" && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div>
                      <FieldLabel label="Resend API Key" tooltip="Your Resend API key for sending emails. Get it at resend.com under API Keys." />
                      <Input type="password" value={val("resend_api_key")} onChange={e => upd("resend_api_key", e.target.value)} placeholder="re_xxxxxxxxxxxx" />
                      <HelpLink href="/support/how-to-get-resend-api-key" label="How to get your Resend API key" />
                    </div>
                    <div>
                      <FieldLabel label="From Name" tooltip='The name subscribers see as the email sender. Example: Niki James Media' />
                      <Input value={val("email_from_name")} onChange={e => upd("email_from_name", e.target.value)} placeholder="My Publication" />
                    </div>
                    <div>
                      <FieldLabel label="From Email" tooltip="The email address newsletters are sent from. Must be a verified domain in Resend." />
                      <Input type="email" value={val("email_from_address")} onChange={e => upd("email_from_address", e.target.value)} placeholder="hello@yourdomain.com" />
                    </div>
                  </div>
                )}
              </div>

              <SectionHeading>SMS</SectionHeading>
              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={val("sms_enabled") === "true"}
                      onChange={e => upd("sms_enabled", e.target.checked ? "true" : "false")} />
                    <span className="text-sm font-medium">Enable SMS</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Send text message notifications to subscribers and team members. Uses Twilio. This is optional — most publications do not need SMS.
                  </p>
                </div>
                {val("sms_enabled") === "true" && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div>
                      <FieldLabel label="Twilio Account SID" />
                      <Input value={val("twilio_account_sid")} onChange={e => upd("twilio_account_sid", e.target.value)} placeholder="ACxxxxxxxxxxxxxxxx" />
                      <HelpLink href="/support/how-to-get-twilio-credentials" label="How to get Twilio credentials" />
                    </div>
                    <div>
                      <FieldLabel label="Twilio Auth Token" />
                      <Input type="password" value={val("twilio_auth_token")} onChange={e => upd("twilio_auth_token", e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel label="Twilio Phone Number" />
                      <Input value={val("twilio_phone_number")} onChange={e => upd("twilio_phone_number", e.target.value)} placeholder="+1XXXXXXXXXX" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ SCREEN 9 — Social Distribution ═══ */}
          {step === 8 && (
            <div className="space-y-6">
              <div>
                <FieldLabel label="Blotato API Key" tooltip="Connects your social media accounts for automatic post distribution after articles publish. Get your key at app.blotato.com under Settings → API Keys." />
                <Input type="password" value={val("blotato_api_key")}
                  onChange={e => upd("blotato_api_key", e.target.value)} placeholder="Paste your Blotato API key" />
                <HelpLink href="/support/how-to-get-blotato-api-key" label="Get your key" />
              </div>
              {val("blotato_api_key") && (
                <>
                  <div>
                    <Button size="sm" variant="outline" onClick={() => toast.info("Connection test coming soon")}>
                      Test Connection
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <FieldLabel label="Platform Toggles" />
                    {["X (Twitter)", "Instagram", "LinkedIn", "Facebook", "TikTok", "Pinterest"].map(p => {
                      const key = "social_" + p.toLowerCase().replace(/[^a-z]/g, "");
                      return (
                        <label key={p} className="flex items-center gap-2">
                          <input type="checkbox" checked={val(key) === "true"} onChange={e => upd(key, e.target.checked ? "true" : "false")} />
                          <span className="text-sm">{p}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
              <div>
                <FieldLabel label={"Posts Per Day: " + val("social_posts_per_day", "3")} tooltip="How many times per day your publication posts to social media." />
                <input type="range" min={1} max={10} value={val("social_posts_per_day", "3")}
                  onChange={e => upd("social_posts_per_day", e.target.value)} className="w-full" />
              </div>
              <div>
                <FieldLabel label="Post Template" tooltip="Use {title} for article title and {url} for the link." />
                <Input value={val("social_post_template", "Just published: {title} - Read more: {url}")}
                  onChange={e => upd("social_post_template", e.target.value)} />
              </div>
            </div>
          )}

          {/* ═══ SCREEN 10 — Production Engine ═══ */}
          {step === 9 && (
            <div className="space-y-6">
              <div>
                <FieldLabel label="Workflow Enabled" tooltip="Turn content production on or off for this publication." />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("workflow_enabled") === "true"}
                    onChange={e => upd("workflow_enabled", e.target.checked ? "true" : "false")} />
                  <span className="text-sm">Enable automated content production</span>
                </label>
              </div>
              <div>
                <FieldLabel label="Runs Per Day" tooltip="How many times per day the AI generates new articles." />
                <select className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  value={val("workflow_runs_per_day", "1")} onChange={e => upd("workflow_runs_per_day", e.target.value)}>
                  <option value="1">1 run per day</option>
                  <option value="2">2 runs per day</option>
                  <option value="3">3 runs per day</option>
                </select>
              </div>
              {Array.from({ length: Number(val("workflow_runs_per_day", "1")) }).map((_, i) => (
                <div key={i}>
                  <FieldLabel label={"Run " + (i + 1) + " Time"} tooltip="What time of day this run should happen." />
                  <Input type="time" value={val("workflow_run_time_" + i, "09:00")}
                    onChange={e => upd("workflow_run_time_" + i, e.target.value)} className="w-40" />
                </div>
              ))}
              <div>
                <FieldLabel label={"Auto-Publish Delay: " + val("workflow_publish_delay", "0") + " minutes"}
                  tooltip="How long to wait after generation before publishing." />
                <input type="range" min={0} max={120} step={5}
                  value={val("workflow_publish_delay", "0")}
                  onChange={e => upd("workflow_publish_delay", e.target.value)} className="w-full" />
              </div>
              <div>
                <FieldLabel label="Require Approval Before Publishing" tooltip="Articles are held for review." />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val("workflow_require_approval") === "true"}
                    onChange={e => upd("workflow_require_approval", e.target.checked ? "true" : "false")} />
                  <span className="text-sm">Require manual approval</span>
                </label>
              </div>
              {val("workflow_require_approval") === "true" && (
                <div>
                  <FieldLabel label="Approver Email" tooltip="This person gets notified when articles are ready for review." />
                  <Input value={val("workflow_approver_email")}
                    onChange={e => upd("workflow_approver_email", e.target.value)} placeholder="approver@company.com" />
                </div>
              )}
            </div>
          )}

          {/* ═══ SCREEN 11 — Review & Launch ═══ */}
          {step === 10 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-sm font-medium">Overall Progress</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: Math.round(STEPS.filter((_, i) => stepComplete(i)).length / STEPS.length * 100) + "%" }} />
                </div>
                <span className="text-sm text-muted-foreground">
                  {STEPS.filter((_, i) => stepComplete(i)).length}/{STEPS.length} complete
                </span>
              </div>

              <div className="space-y-2">
                {STEPS.map((st, i) => {
                  const complete = stepComplete(i);
                  return (
                    <button key={i} onClick={() => setStep(i)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                      <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold " +
                        (complete ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>
                        {complete ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className="text-sm font-medium flex-1">{st.label}</span>
                      <Badge variant="secondary" className={complete ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                        {complete ? "Complete" : "Setup"}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              <Button className="w-full h-12 text-base" onClick={() => { save(); toast.success("Publication launched!"); }}>
                <Rocket className="w-5 h-5 mr-2" /> Launch Publication
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button variant="outline" disabled={step === 0} onClick={() => { if (dirty) save(); setStep(step - 1); }}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" onClick={save} disabled={setBulk.isPending}>
              {setBulk.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Save Progress
            </Button>
            <Button disabled={step === STEPS.length - 1} onClick={() => { if (dirty) save(); setStep(step + 1); }}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  /* ─── Embedded mode — just return wizard content ──────────────── */
  if (embedded) {
    return wizardContent;
  }

  /* ─── Standalone mode — full page with header/footer ──────────── */
  return (
    <div className="min-h-screen bg-background">
      {adminLicenseId && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-sm text-amber-800">
          Configuring on behalf of: <strong>{licenseName || ("License #" + adminLicenseId)}</strong>
        </div>
      )}

      {/* Dark Navy Header */}
      <div className="px-8 py-6" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={pubName} className="h-10" />
            ) : (
              <img src="/jaimeio-logo-dark.png" alt="JAIME.IO" className="h-8 opacity-90" />
            )}
            <div>
              <h1 className="text-xl font-bold font-headline text-white">{pubName}</h1>
              <p className="text-slate-400 text-xs">
                {licenseQuery.data?.subdomain ? licenseQuery.data.subdomain + ".getjaime.io" : hostname}
              </p>
            </div>
          </div>
        </div>
      </div>

      {wizardContent}

      {/* Footer */}
      <div style={{ background: "#0f2d5e", padding: "16px 0", textAlign: "center" as const }}>
        <p style={{ color: "white", fontSize: 12, margin: 0 }}>
          POWERED BY JAIME.IO &nbsp;|&nbsp; A product of JANICCO &nbsp;|&nbsp; Need support?{" "}
          <a href="mailto:support@janicco.com" style={{ color: "#2dd4bf", textDecoration: "underline" }}>support@janicco.com</a>
        </p>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function CategoriesEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let cats: Array<{ name: string; color: string }> = [];
  try { cats = JSON.parse(value); } catch {}
  if (!Array.isArray(cats)) cats = [];
  const update = (newCats: typeof cats) => onChange(JSON.stringify(newCats));
  return (
    <div className="space-y-2">
      {cats.map((cat, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <input type="color" value={cat.color || "#6366f1"} onChange={e => {
            const n = [...cats]; n[i] = { ...n[i], color: e.target.value }; update(n);
          }} className="w-8 h-8 rounded cursor-pointer border" />
          <Input value={cat.name} onChange={e => {
            const n = [...cats]; n[i] = { ...n[i], name: e.target.value }; update(n);
          }} placeholder="Category name" className="flex-1" />
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
            update(cats.filter((_, j) => j !== i));
          }}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update([...cats, { name: "", color: "#6366f1" }])}>
        <Plus className="w-3 h-3 mr-1" /> Add Category
      </Button>
    </div>
  );
}

function FeedListEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let feeds: string[] = [];
  try { feeds = JSON.parse(value); } catch {}
  if (!Array.isArray(feeds)) feeds = [];
  const update = (newFeeds: string[]) => onChange(JSON.stringify(newFeeds));
  return (
    <div className="space-y-2">
      {feeds.map((feed, i) => (
        <div key={i} className="flex items-center gap-2">
          <Rss className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input value={feed} onChange={e => {
            const n = [...feeds]; n[i] = e.target.value; update(n);
          }} placeholder="https://example.com/feed.xml" className="flex-1" />
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
            update(feeds.filter((_, j) => j !== i));
          }}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update([...feeds, ""])}>
        <Plus className="w-3 h-3 mr-1" /> Add Feed
      </Button>
    </div>
  );
}
