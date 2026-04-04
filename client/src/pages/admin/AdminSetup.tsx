/**
 * AdminSetup.tsx — 8-Screen Setup Wizard
 * CEO Directive: Every field inline, pre-populated from DB, status indicators, no external links.
 * Screens: Brand → Content Engine → Image/Video → Social → Email/SMS/Monetization → Schedule → SEO → Review & Launch
 */
import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, ChevronRight, ChevronLeft, Rocket, Globe, Newspaper,
  Share2, Mail, MessageSquare, Settings, ExternalLink, RefreshCw, AlertCircle,
  Loader2, CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp, Palette,
  Camera, Calendar, Search, DollarSign, Image, Video, Zap, Clock, Droplets, Lock, Cpu, Network,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type StatusDot = "green" | "yellow" | "red" | "gray";

interface FieldStatus {
  value: string;
  status: StatusDot;
  label?: string;
}

// ─── Status dot component ─────────────────────────────────────────────────────
function StatusIndicator({ status, label }: { status: StatusDot; label?: string }) {
  const colors: Record<StatusDot, string> = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
  };
  const textColors: Record<StatusDot, string> = {
    green: "text-green-700 dark:text-green-400",
    yellow: "text-yellow-700 dark:text-yellow-400",
    red: "text-red-700 dark:text-red-400",
    gray: "text-gray-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColors[status]}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status]}`} />
      {label}
    </span>
  );
}

// ─── Help tooltip ─────────────────────────────────────────────────────────────
function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex items-center">
      <button type="button" onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground ml-1">
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && (
        <span className="absolute z-10 mt-1 ml-4 max-w-xs text-xs bg-popover text-popover-foreground border rounded-lg p-2 shadow-md">
          {text}
        </span>
      )}
    </span>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────
function FieldRow({
  label, helpText, children, status,
}: {
  label: string;
  helpText?: string;
  children: React.ReactNode;
  status?: StatusDot;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 relative">
          <Label className="text-xs font-medium">{label}</Label>
          {helpText && <HelpTip text={helpText} />}
        </div>
        {status && <StatusIndicator status={status} label={status === "green" ? "Configured" : status === "yellow" ? "Partial" : status === "red" ? "Missing" : "Optional"} />}
      </div>
      {children}
    </div>
  );
}

// ─── Platform credential form ─────────────────────────────────────────────────
interface PlatformField {
  key: string;
  label: string;
  type?: string;
  placeholder: string;
  helpText: string;
}
interface PlatformProfileField {
  key: string;
  label: string;
  placeholder: string;
  helpText?: string;
}
interface PlatformFormDef {
  platform: string;
  label: string;
  fields: PlatformField[];
  profileFields?: PlatformProfileField[];
  helpUrl: string;
  helpUrlLabel: string;
  dailyLimit?: string;
}

const PLATFORM_FORMS: PlatformFormDef[] = [
  {
    platform: "x",
    label: "X / Twitter",
    dailyLimit: "15–20 article posts + 5–10 standalone takes per day",
    profileFields: [
      { key: "brand_twitter_handle", label: "Handle", placeholder: "@getjaimeio", helpText: "Your X/Twitter handle (e.g., @getjaimeio)" },
      { key: "brand_twitter_url", label: "Profile URL", placeholder: "https://x.com/getjaimeio", helpText: "Full URL to your X/Twitter profile" },
    ],
    fields: [
      { key: "apiKey", label: "API Key (Consumer Key)", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx", helpText: "developer.twitter.com → Your App → Keys and Tokens → Consumer Keys" },
      { key: "apiSecret", label: "API Secret", type: "password", placeholder: "••••••••••••••••••••••••••••••••••••••••••••••••", helpText: "developer.twitter.com → Your App → Keys and Tokens → Consumer Keys" },
      { key: "accessToken", label: "Access Token", placeholder: "123456789-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", helpText: "developer.twitter.com → Your App → Keys and Tokens → Authentication Tokens" },
      { key: "accessTokenSecret", label: "Access Token Secret", type: "password", placeholder: "••••••••••••••••••••••••••••••••••••••••••••••••", helpText: "developer.twitter.com → Your App → Keys and Tokens → Authentication Tokens" },
    ],
    helpUrl: "https://developer.twitter.com/en/portal/dashboard",
    helpUrlLabel: "X Developer Portal",
  },
  {
    platform: "reddit",
    label: "Reddit",
    dailyLimit: "Up to 25 posts/day across subreddits",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "xxxxxxxxxxxxxxx", helpText: "reddit.com/prefs/apps → your app → client_id (under app name)" },
      { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", helpText: "reddit.com/prefs/apps → your app → secret" },
      { key: "username", label: "Reddit Username", placeholder: "u/your_username", helpText: "The Reddit account that will post articles" },
      { key: "password", label: "Reddit Password", type: "password", placeholder: "••••••••", helpText: "Password for the Reddit account above" },
    ],
    helpUrl: "https://www.reddit.com/prefs/apps",
    helpUrlLabel: "Reddit App Preferences",
  },
  {
    platform: "facebook",
    label: "Facebook",
    dailyLimit: "Up to 10 posts/day",
    profileFields: [
      { key: "brand_facebook_url", label: "Page URL", placeholder: "https://facebook.com/yourpage", helpText: "Full URL to your Facebook page" },
    ],
    fields: [
      { key: "pageId", label: "Page ID", placeholder: "123456789012345", helpText: "Facebook Page → About → Page ID (scroll to bottom)" },
      { key: "pageAccessToken", label: "Page Access Token", type: "password", placeholder: "EAAxxxxxxxxxxxxxxx", helpText: "developers.facebook.com → Graph API Explorer → select your page → generate token with pages_manage_posts permission" },
    ],
    helpUrl: "https://developers.facebook.com/tools/explorer/",
    helpUrlLabel: "Graph API Explorer",
  },
  {
    platform: "instagram",
    label: "Instagram",
    dailyLimit: "Up to 10 posts/day",
    profileFields: [
      { key: "brand_instagram_url", label: "Profile URL", placeholder: "https://instagram.com/yourhandle", helpText: "Full URL to your Instagram profile" },
    ],
    fields: [
      { key: "igUserId", label: "Instagram User ID", placeholder: "17841400000000000", helpText: "Graph API Explorer: GET /me?fields=id with Instagram Business account connected" },
      { key: "pageAccessToken", label: "Page Access Token", type: "password", placeholder: "EAAxxxxxxxxxxxxxxx", helpText: "Same token as Facebook — needs instagram_basic and instagram_content_publish permissions" },
    ],
    helpUrl: "https://developers.facebook.com/tools/explorer/",
    helpUrlLabel: "Graph API Explorer",
  },
  {
    platform: "bluesky",
    label: "Bluesky",
    dailyLimit: "Up to 20 posts/day",
    profileFields: [
      { key: "brand_bluesky_url", label: "Profile URL", placeholder: "https://bsky.app/profile/yourname.bsky.social", helpText: "Full URL to your Bluesky profile" },
    ],
    fields: [
      { key: "identifier", label: "Handle", placeholder: "yourname.bsky.social", helpText: "Your Bluesky handle (e.g., jaimeio.bsky.social)" },
      { key: "password", label: "App Password", type: "password", placeholder: "xxxx-xxxx-xxxx-xxxx", helpText: "bsky.app → Settings → Privacy and Security → App Passwords → Add App Password" },
    ],
    helpUrl: "https://bsky.app/settings/app-passwords",
    helpUrlLabel: "Bluesky App Passwords",
  },
  {
    platform: "threads",
    label: "Threads",
    dailyLimit: "Up to 10 posts/day",
    profileFields: [
      { key: "brand_threads_url", label: "Profile URL", placeholder: "https://threads.net/@yourhandle", helpText: "Full URL to your Threads profile" },
    ],
    fields: [
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "THxxxxxxxxxxxxxxx", helpText: "developers.facebook.com → Threads API → generate a long-lived access token" },
      { key: "userId", label: "Threads User ID", placeholder: "123456789012345", helpText: "Your Threads user ID — from GET /me on the Threads API" },
    ],
    helpUrl: "https://developers.facebook.com/docs/threads",
    helpUrlLabel: "Threads API Docs",
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    dailyLimit: "Up to 3 posts/day",
    profileFields: [
      { key: "brand_linkedin_url", label: "Page URL", placeholder: "https://linkedin.com/company/yourcompany", helpText: "Full URL to your LinkedIn company page or profile" },
    ],
    fields: [
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "AQxxxxxxxxxxxxxxx", helpText: "LinkedIn Developer Portal → OAuth 2.0 → generate access token with w_member_social permission" },
      { key: "authorUrn", label: "Author URN", placeholder: "urn:li:person:xxxxxxxx", helpText: "Your LinkedIn member URN (GET /me) or organization URN (GET /organizations)" },
    ],
    helpUrl: "https://www.linkedin.com/developers/apps",
    helpUrlLabel: "LinkedIn Developer Portal",
  },
];

function PlatformCard({
  form, existingCreds, enabled, onToggleEnabled, onProfileChange, profileValues, onSuccess, xEnvConfigured,
}: {
  form: PlatformFormDef;
  existingCreds?: Record<string, string>;
  enabled: boolean;
  onToggleEnabled: () => void;
  onProfileChange: (key: string, value: string) => void;
  profileValues: Record<string, string>;
  onSuccess: () => void;
  xEnvConfigured?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [creds, setCreds] = useState<Record<string, string>>(existingCreds ?? {});
  const [testResult, setTestResult] = useState<{ success: boolean; username?: string; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // When env vars are configured, allow advanced users to override with DB credentials
  const [envOverride, setEnvOverride] = useState(false);

  const testMutation = trpc.distribution.testPlatformConnection.useMutation();
  const saveMutation = trpc.distribution.upsertPlatformCredential.useMutation();

  const allFilled = form.fields.every(f => creds[f.key]?.trim());
  const hasExisting = existingCreds && Object.values(existingCreds).some(v => v?.trim());
  // X is special: if env vars are set server-side, credentials are already configured
  const isXEnvConfigured = form.platform === "x" && xEnvConfigured && !hasExisting;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testMutation.mutateAsync({ platform: form.platform, credentials: creds });
      setTestResult(result);
      if (result.success) toast.success(`${form.label} connected${result.username ? ` as @${result.username}` : ""}!`);
      else toast.error(`${form.label}: ${result.error}`);
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
      toast.error(e.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { apiKey, apiSecret, accessToken, accessTokenSecret, ...rest } = creds;
      await saveMutation.mutateAsync({
        platform: form.platform,
        apiKey: apiKey ?? accessToken ?? undefined,
        apiSecret: apiSecret ?? accessTokenSecret ?? undefined,
        extra: Object.keys(rest).length > 0 ? JSON.stringify({ ...rest, accessToken, accessTokenSecret }) : undefined,
      });
      toast.success(`${form.label} credentials saved.`);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Collapsed state when disabled
  if (!enabled) {
    return (
      <div className="border rounded-lg overflow-hidden opacity-60">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{form.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <StatusIndicator status="gray" label="Disabled" />
            <Switch checked={false} onCheckedChange={onToggleEnabled} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden border-primary/20">
      {/* Header row with enable toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{form.label}</span>
          {form.dailyLimit && <span className="text-xs text-muted-foreground hidden sm:inline">{form.dailyLimit}</span>}
        </div>
        <div className="flex items-center gap-3">
          {hasExisting && <StatusIndicator status="green" label="Configured" />}
          {isXEnvConfigured && !hasExisting && <StatusIndicator status="green" label="From server environment" />}
          {!hasExisting && !isXEnvConfigured && <StatusIndicator status="yellow" label="Credentials needed" />}
          <Switch checked={true} onCheckedChange={onToggleEnabled} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile fields */}
        {form.profileFields && form.profileFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profile</p>
            <div className="space-y-2">
              {form.profileFields.map(pf => (
                <div key={pf.key} className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs font-medium">{pf.label}</Label>
                    {pf.helpText && <HelpTip text={pf.helpText} />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder={pf.placeholder}
                      value={profileValues[pf.key] ?? ""}
                      onChange={e => onProfileChange(pf.key, e.target.value)}
                      className="text-xs h-8"
                    />
                    {profileValues[pf.key]?.trim() && (
                      <StatusIndicator status="green" label="Set" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credential fields — env-locked or collapsible */}
        <div className="space-y-2">
          {isXEnvConfigured && !envOverride ? (
            /* ── Locked: credentials come from server environment ── */
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <Lock className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300">API credentials configured in server environment</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET are set as environment variables. No action needed.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnvOverride(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Override with custom credentials instead
              </button>
            </div>
          ) : (
            /* ── Normal: collapsible credential form ── */
            <>
              <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-full text-left"
              >
                <span>API Credentials</span>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {isXEnvConfigured && envOverride && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Entering credentials here will override the server environment variables for this deployment.</span>
                  <button type="button" onClick={() => { setEnvOverride(false); setExpanded(false); }} className="ml-auto underline underline-offset-2 hover:no-underline shrink-0">Cancel</button>
                </div>
              )}

              {(expanded || (isXEnvConfigured && envOverride)) && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Enter your credentials. Click Test before saving.</p>
                    <a href={form.helpUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      {form.helpUrlLabel} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="space-y-2">
                    {form.fields.map(field => (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs font-medium">{field.label}</Label>
                          <HelpTip text={field.helpText} />
                        </div>
                        <Input
                          type={field.type ?? "text"}
                          placeholder={field.placeholder}
                          value={creds[field.key] ?? ""}
                          onChange={e => setCreds(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                    ))}
                  </div>
                  {testResult && (
                    <div className={`flex items-center gap-2 text-xs p-2 rounded ${testResult.success ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"}`}>
                      {testResult.success ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{testResult.success ? `Connected${testResult.username ? ` as @${testResult.username}` : ""}` : testResult.error}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleTest} disabled={!allFilled || isTesting} className="flex-1 text-xs h-8">
                      {isTesting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Test Connection
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!allFilled || isSaving || !testResult?.success} className="flex-1 text-xs h-8">
                      {isSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Save Credentials
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Screen definitions ───────────────────────────────────────────────────────
const SCREENS = [
  { id: "brand", title: "Brand & Identity", icon: Palette, description: "Publication name, tagline, colors, contact" },
  { id: "content", title: "Content Engine", icon: Newspaper, description: "Voice, style, LLM settings, article targets" },
  { id: "media", title: "Image & Video", icon: Camera, description: "Image generation, video settings, providers" },
  { id: "categories", title: "Article Categories", icon: Zap, description: "Content categories, quotas, and organization" },
  { id: "sources", title: "Content Sources", icon: Globe, description: "RSS feeds, Google News, X keywords, Reddit, YouTube, web scraper" },
  { id: "social", title: "Social Media", icon: Share2, description: "X, Reddit, Facebook, Instagram, Bluesky, Threads, LinkedIn — credentials and distribution settings" },
  { id: "seo", title: "SEO & Analytics", icon: Search, description: "Domain, Google Search Console, IndexNow, Bing, Clarity, GA" },
  { id: "production", title: "Production Engine", icon: Cpu, description: "Pool-drain model, safety cap, batch sizes, scoring thresholds" },
  { id: "review", title: "Review & Launch", icon: Rocket, description: "Summary of all settings — launch when ready" },
];
// ─── Brand Screen (Screen 1) ─────────────────────────────────────────────────────
function BrandScreen({
  settings, set, fieldStatus,
}: {
  settings: Record<string, string>;
  set: (key: string, value: string) => void;
  fieldStatus: (key: string, required?: boolean) => StatusDot;
}) {
  const [showContacts, setShowContacts] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  // Custom domain state
  const [customDomain, setCustomDomain] = useState("");
  const [domainStatus, setDomainStatus] = useState<"idle" | "pending" | "active" | "failed">("idle");
  const [domainVerifying, setDomainVerifying] = useState(false);
  const [domainError, setDomainError] = useState("");

  // Custom domain TRPC
  const domainRegisterMutation = trpc.domains.register.useMutation();
  const domainVerifyMutation = trpc.domains.verify.useMutation();
  const domainsQuery = trpc.domains.list.useQuery();

  // Load existing custom domain on mount
  useEffect(() => {
    if (domainsQuery.data && domainsQuery.data.length > 0) {
      const d = domainsQuery.data[0] as any;
      setCustomDomain(d.customDomain || "");
      setDomainStatus(d.sslStatus === "active" ? "active" : d.sslStatus === "failed" ? "failed" : "pending");
    }
  }, [domainsQuery.data]);

  const handleVerifyDomain = async () => {
    if (!customDomain.trim()) return;
    setDomainVerifying(true);
    setDomainError("");
    try {
      const result = await domainVerifyMutation.mutateAsync({ domain: customDomain.trim() });
      if (result.verified) {
        setDomainStatus("active");
        toast.success("Domain verified successfully!");
      } else {
        setDomainStatus("failed");
        setDomainError(result.error || "Verification failed");
        toast.error(result.error || "DNS verification failed");
      }
      domainsQuery.refetch();
    } catch (err: any) {
      setDomainError(err.message);
      toast.error("Verification failed");
    } finally {
      setDomainVerifying(false);
    }
  };

  const handleSaveCustomDomain = async () => {
    if (!customDomain.trim()) return;
    try {
      const existing = domainsQuery.data?.find((d: any) => d.customDomain === customDomain.trim().toLowerCase());
      if (existing) return;
      await domainRegisterMutation.mutateAsync({
        clientId: settings["brand_site_name"]?.toLowerCase().replace(/\s+/g, "-") || "default",
        domain: customDomain.trim(),
        publicationName: settings["brand_site_name"] || "Publication",
      });
      setDomainStatus("pending");
      domainsQuery.refetch();
      toast.success("Custom domain registered!");
    } catch (err: any) {
      if (!err.message?.includes("already registered")) {
        toast.error(err.message);
      }
    }
  };

  // Treat placeholder defaults as "not configured"
  const brandStatus = (key: string, required = true): StatusDot => {
    const v = settings[key];
    if (!v || v.trim() === "") return required ? "red" : "gray";
    const placeholders = ["Your Publication Name", "https://example.com", "contact@example.com", "Your Company Name", "editor@example.com", "privacy@example.com", "legal@example.com", "corrections@example.com", "moderation@example.com"];
    if (placeholders.includes(v.trim())) return required ? "red" : "gray";
    return "green";
  };

  // Color field: always green if has any hex value
  const colorStatus = (key: string): StatusDot => {
    const v = settings[key];
    return v && v.trim() ? "green" : "red";
  };

  // Image preview helper
  const ImgPreview = ({ url }: { url?: string }) => {
    if (!url || url.trim() === "") return null;
    return <img src={url} alt="preview" className="w-10 h-10 rounded border object-contain bg-muted shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  };

  return (
    <div className="space-y-5">
      {/* ── Section A: Publication Info ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Publication Info</p>
        <FieldRow label="Publication Name" helpText="Appears in the header, footer, browser tab, and all SEO tags." status={brandStatus("brand_site_name")}>
          <Input value={settings["brand_site_name"] ?? ""} onChange={e => set("brand_site_name", e.target.value)} placeholder="e.g., The Daily Lampoon" className="h-9" />
        </FieldRow>
        <FieldRow label="Tagline" helpText="Short phrase below your site name in the masthead." status={brandStatus("brand_tagline")}>
          <Input value={settings["brand_tagline"] ?? ""} onChange={e => set("brand_tagline", e.target.value)} placeholder="e.g., AI-Powered Content, Automated" className="h-9" />
        </FieldRow>
        <FieldRow label="Site Description" helpText="Used in the footer, About page, and search engine meta tags. 1-2 sentences." status={brandStatus("brand_description")}>
          <Textarea value={settings["brand_description"] ?? ""} onChange={e => set("brand_description", e.target.value)} placeholder="A news publication covering politics, tech, and culture." rows={3} className="resize-y text-sm" />
        </FieldRow>
        <FieldRow label="Content Genre" helpText="What kind of content your site publishes (e.g., 'satire', 'real estate investing', 'tech news', 'entertainment'). Used across your About page, Privacy page, Editorial Standards, footer, and SEO tags." status={brandStatus("brand_genre")}>
          <Input value={settings["brand_genre"] ?? ""} onChange={e => set("brand_genre", e.target.value)} placeholder="e.g., satire, real estate investing, tech news" className="h-9" />
        </FieldRow>
        <FieldRow label="Website URL" helpText="Full address including https://. Used in social links, sitemaps, and SEO." status={brandStatus("site_url")}>
          <Input type="url" value={settings["site_url"] ?? ""} onChange={e => set("site_url", e.target.value)} placeholder="https://yoursite.com" className="h-9 font-mono text-xs" />
        </FieldRow>

        {/* Custom Domain */}
        <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Custom Domain</p>
              <p className="text-xs text-muted-foreground">Leave blank if you are using a getjaime.io subdomain</p>
            </div>
            {domainStatus === "active" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            )}
            {domainStatus === "pending" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Circle className="w-3 h-3" /> Pending
              </span>
            )}
            {domainStatus === "failed" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                <XCircle className="w-3 h-3" /> Failed
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value)}
              placeholder="news.theirclient.com"
              className="h-9 font-mono text-xs flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleVerifyDomain}
              disabled={!customDomain.trim() || domainVerifying}
              className="shrink-0"
            >
              {domainVerifying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Verify DNS
            </Button>
            {customDomain.trim() && domainStatus === "idle" && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCustomDomain}
                disabled={domainRegisterMutation.isPending}
                className="shrink-0"
              >
                {domainRegisterMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Save
              </Button>
            )}
          </div>
          {domainError && <p className="text-xs text-destructive">{domainError}</p>}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300">
            <Globe className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Point your domain to us by adding a <strong>CNAME</strong> record in your DNS settings:
              <code className="block mt-1 px-2 py-1 bg-white dark:bg-slate-900 rounded border font-mono text-xs">publications.getjaime.io</code>
            </div>
          </div>
        </div>
        <FieldRow label="Editorial Team Name" helpText="Author name on articles and in schema.org markup. E.g., 'JAIME.IO Editorial Team'." status={brandStatus("brand_editorial_team", false)}>
          <Input value={settings["brand_editorial_team"] ?? ""} onChange={e => set("brand_editorial_team", e.target.value)} placeholder="e.g., JAIME.IO Editorial Team" className="h-9" />
        </FieldRow>
      </div>

      <Separator />

      {/* ── Section B: Visual Identity ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visual Identity</p>
        <FieldRow label="Primary Brand Color" helpText="Main color for buttons, links, accents." status={colorStatus("brand_color_primary")}>
          <div className="flex gap-2">
            <input type="color" value={settings["brand_color_primary"] ?? "#dc2626"} onChange={e => set("brand_color_primary", e.target.value)} className="w-9 h-9 rounded border cursor-pointer shrink-0 p-0.5" />
            <Input value={settings["brand_color_primary"] ?? "#dc2626"} onChange={e => set("brand_color_primary", e.target.value)} placeholder="#dc2626" className="h-9 font-mono" />
          </div>
        </FieldRow>
        <FieldRow label="Secondary Brand Color" helpText="Complementary accent color for secondary elements." status={colorStatus("brand_color_secondary")}>
          <div className="flex gap-2">
            <input type="color" value={settings["brand_color_secondary"] ?? "#1e40af"} onChange={e => set("brand_color_secondary", e.target.value)} className="w-9 h-9 rounded border cursor-pointer shrink-0 p-0.5" />
            <Input value={settings["brand_color_secondary"] ?? "#1e40af"} onChange={e => set("brand_color_secondary", e.target.value)} placeholder="#1e40af" className="h-9 font-mono" />
          </div>
        </FieldRow>
        <FieldRow label="Logo" helpText="Site logo in header navigation. PNG or SVG, min 200×200px." status={brandStatus("brand_logo_url", false)}>
          <div className="flex gap-2 items-center">
            <Input value={settings["brand_logo_url"] ?? ""} onChange={e => set("brand_logo_url", e.target.value)} placeholder="https://cdn.yoursite.com/logo.png" className="h-9 font-mono text-xs" />
            <ImgPreview url={settings["brand_logo_url"]} />
          </div>
        </FieldRow>
        <FieldRow label="Favicon" helpText="Browser tab icon. ICO, PNG, or SVG, 32×32px or 64×64px." status={brandStatus("brand_favicon_url", false)}>
          <div className="flex gap-2 items-center">
            <Input value={settings["brand_favicon_url"] ?? ""} onChange={e => set("brand_favicon_url", e.target.value)} placeholder="/favicon.ico" className="h-9 font-mono text-xs" />
            <ImgPreview url={settings["brand_favicon_url"]} />
          </div>
        </FieldRow>
      </div>

      <Separator />

      {/* ── Section B2: Loading Screen (v4.7.2) ── */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loading Screen</p>
          <p className="text-xs text-muted-foreground mt-0.5">Controls the animation shown while pages render. Default is a CSS spinner — no images, no brand-specific content.</p>
        </div>
        <FieldRow label="Loading Style" helpText="Spinner: CSS-only circle (default). Logo: your custom image. None: no loading screen." status={brandStatus("loading_style", false)}>
          <Select value={settings["loading_style"] ?? "spinner"} onValueChange={v => set("loading_style", v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spinner">Spinner (CSS-only, default)</SelectItem>
              <SelectItem value="logo">Custom Logo / Image</SelectItem>
              <SelectItem value="none">None (no loading screen)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        {(settings["loading_style"] ?? "spinner") === "logo" && (
          <FieldRow label="Loading Logo URL" helpText="URL to your logo image. Falls back to spinner if empty." status={brandStatus("loading_logo_url", false)}>
            <div className="flex gap-2 items-center">
              <Input value={settings["loading_logo_url"] ?? ""} onChange={e => set("loading_logo_url", e.target.value)} placeholder="https://yoursite.com/logo.png" className="h-9 font-mono text-xs" />
              <ImgPreview url={settings["loading_logo_url"]} />
            </div>
          </FieldRow>
        )}
        <FieldRow label="Loading Text" helpText="Optional text below the animation (e.g., your site name). Leave blank for no text." status={brandStatus("loading_text", false)}>
          <Input value={settings["loading_text"] ?? ""} onChange={e => set("loading_text", e.target.value)} placeholder="e.g., JAIME.IO" className="h-9" />
        </FieldRow>
        {/* Live preview */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            {(settings["loading_style"] ?? "spinner") === "none" ? (
              <p className="text-xs text-muted-foreground italic">No loading screen — instant load.</p>
            ) : (settings["loading_style"] ?? "spinner") === "logo" && settings["loading_logo_url"] ? (
              <img src={settings["loading_logo_url"]} alt="Loading preview" className="w-16 h-16 object-contain animate-pulse" />
            ) : (
              <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin" />
            )}
            {settings["loading_text"] && (
              <p className="text-xs text-muted-foreground animate-pulse">{settings["loading_text"]}</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Section B3: Google Analytics (v4.7.3) ── */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Google Analytics</p>
          <p className="text-xs text-muted-foreground mt-0.5">Optional. Enter your GA4 measurement ID (G-XXXXXXXX) or Google Ads conversion ID (AW-XXXXXXXXX). Leave blank to disable analytics. Each deployment must use its own ID.</p>
        </div>
        <FieldRow label="Tag ID" helpText="e.g. G-ABC123XYZ or AW-17988276150. Leave blank to disable." status={brandStatus("brand_gtag_id", false)}>
          <Input value={settings["brand_gtag_id"] ?? ""} onChange={e => set("brand_gtag_id", e.target.value)} placeholder="G-XXXXXXXXXX" className="h-9 font-mono text-xs" />
        </FieldRow>
      </div>

      <Separator />

      {/* ── Section C: Contact Emails (collapsible) ── */}
      <div className="space-y-3">
        <button type="button" onClick={() => setShowContacts(v => !v)} className="flex items-center justify-between w-full text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact Emails</p>
            <p className="text-xs text-muted-foreground mt-0.5">These appear on your Contact page and in legal footers. Only General Contact is required.</p>
          </div>
          {showContacts ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>
        {showContacts && (
          <div className="space-y-3 pl-1">
            <FieldRow label="General Contact" helpText="Main contact email. Also used in newsletter footers (CAN-SPAM)." status={brandStatus("brand_contact_email")}>
              <Input type="email" value={settings["brand_contact_email"] ?? ""} onChange={e => set("brand_contact_email", e.target.value)} placeholder="contact@yoursite.com" className="h-9" />
            </FieldRow>
            <FieldRow label="Editor" helpText="Editorial inquiries." status={brandStatus("brand_editor_email", false)}>
              <Input type="email" value={settings["brand_editor_email"] ?? ""} onChange={e => set("brand_editor_email", e.target.value)} placeholder="editor@yoursite.com" className="h-9" />
            </FieldRow>
            <FieldRow label="Privacy" helpText="Privacy-related inquiries." status={brandStatus("brand_privacy_email", false)}>
              <Input type="email" value={settings["brand_privacy_email"] ?? ""} onChange={e => set("brand_privacy_email", e.target.value)} placeholder="privacy@yoursite.com" className="h-9" />
            </FieldRow>
            <FieldRow label="Legal" helpText="Legal inquiries and Terms of Service." status={brandStatus("brand_legal_email", false)}>
              <Input type="email" value={settings["brand_legal_email"] ?? ""} onChange={e => set("brand_legal_email", e.target.value)} placeholder="legal@yoursite.com" className="h-9" />
            </FieldRow>
            <FieldRow label="Corrections" helpText="Corrections and editorial standards." status={brandStatus("brand_corrections_email", false)}>
              <Input type="email" value={settings["brand_corrections_email"] ?? ""} onChange={e => set("brand_corrections_email", e.target.value)} placeholder="corrections@yoursite.com" className="h-9" />
            </FieldRow>
            <FieldRow label="Moderation" helpText="Community moderation issues." status={brandStatus("brand_moderation_email", false)}>
              <Input type="email" value={settings["brand_moderation_email"] ?? ""} onChange={e => set("brand_moderation_email", e.target.value)} placeholder="moderation@yoursite.com" className="h-9" />
            </FieldRow>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Section C2: Masthead Customization (v4.9.6) ── */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Masthead</p>
          <p className="text-xs text-muted-foreground mt-0.5">Control every visual aspect of your site header. Changes are reflected in the live preview below.</p>
        </div>

        {/* Background & Text Colors */}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Background Color" helpText="Leave blank to use primary brand color." status={brandStatus("masthead_bg_color", false)}>
            <div className="flex gap-2">
              <input type="color" value={settings["masthead_bg_color"] || settings["brand_color_primary"] || "#dc2626"} onChange={e => set("masthead_bg_color", e.target.value)} className="w-9 h-9 rounded border cursor-pointer shrink-0 p-0.5" />
              <Input value={settings["masthead_bg_color"] ?? ""} onChange={e => set("masthead_bg_color", e.target.value)} placeholder="(uses brand color)" className="h-9 font-mono text-xs" />
            </div>
          </FieldRow>
          <FieldRow label="Text Color" helpText="Site name and tagline color." status={brandStatus("masthead_text_color", false)}>
            <div className="flex gap-2">
              <input type="color" value={settings["masthead_text_color"] || "#ffffff"} onChange={e => set("masthead_text_color", e.target.value)} className="w-9 h-9 rounded border cursor-pointer shrink-0 p-0.5" />
              <Input value={settings["masthead_text_color"] ?? "#ffffff"} onChange={e => set("masthead_text_color", e.target.value)} placeholder="#ffffff" className="h-9 font-mono text-xs" />
            </div>
          </FieldRow>
        </div>

        {/* Font Family & Size */}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Font Family" helpText="serif, sans-serif, or a Google Font name." status={brandStatus("masthead_font_family", false)}>
            <Select value={settings["masthead_font_family"] ?? "serif"} onValueChange={v => set("masthead_font_family", v)}>
              <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="serif">Serif (classic/editorial)</SelectItem>
                <SelectItem value="sans-serif">Sans-serif (modern/clean)</SelectItem>
                <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                <SelectItem value="Merriweather">Merriweather</SelectItem>
                <SelectItem value="Oswald">Oswald</SelectItem>
                <SelectItem value="Lato">Lato</SelectItem>
                <SelectItem value="custom">Custom (type below)</SelectItem>
              </SelectContent>
            </Select>
            {settings["masthead_font_family"] === "custom" && (
              <Input value={""} onChange={e => set("masthead_font_family", e.target.value)} placeholder="e.g., Abril Fatface" className="h-9 mt-2" />
            )}
          </FieldRow>
          <FieldRow label="Font Size" helpText="Size of the site name in the masthead." status={brandStatus("masthead_font_size", false)}>
            <Select value={settings["masthead_font_size"] ?? "large"} onValueChange={v => set("masthead_font_size", v)}>
              <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large (default)</SelectItem>
                <SelectItem value="extra-large">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </div>

        {/* Layout & Padding */}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Layout" helpText="How the site name and logo are aligned." status={brandStatus("masthead_layout", false)}>
            <Select value={settings["masthead_layout"] ?? "center"} onValueChange={v => set("masthead_layout", v)}>
              <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="logo-only">Logo Only (no text)</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Padding" helpText="Vertical spacing around the masthead." status={brandStatus("masthead_padding", false)}>
            <Select value={settings["masthead_padding"] ?? "medium"} onValueChange={v => set("masthead_padding", v)}>
              <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="medium">Medium (default)</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </div>

        {/* Logo Height */}
        <FieldRow label="Logo Height (px)" helpText="Height of the logo image in pixels. Width scales proportionally." status={brandStatus("masthead_logo_height", false)}>
          <Input type="number" min={20} max={200} value={settings["masthead_logo_height"] ?? "60"} onChange={e => set("masthead_logo_height", e.target.value)} placeholder="60" className="h-9" />
        </FieldRow>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Show Tagline</p>
              <p className="text-xs text-muted-foreground">Display tagline below site name</p>
            </div>
            <Switch checked={(settings["masthead_show_tagline"] ?? "true") === "true"} onCheckedChange={v => set("masthead_show_tagline", v ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Show Date Bar</p>
              <p className="text-xs text-muted-foreground">Display date above masthead</p>
            </div>
            <Switch checked={(settings["masthead_show_date"] ?? "true") === "true"} onCheckedChange={v => set("masthead_show_date", v ? "true" : "false")} />
          </div>
        </div>

        {/* Date bar color */}
        {(settings["masthead_show_date"] ?? "true") === "true" && (
          <FieldRow label="Date Bar Color" helpText="Leave blank to use the masthead background color." status={brandStatus("masthead_date_bg_color", false)}>
            <div className="flex gap-2">
              <input type="color" value={settings["masthead_date_bg_color"] || settings["masthead_bg_color"] || settings["brand_color_primary"] || "#dc2626"} onChange={e => set("masthead_date_bg_color", e.target.value)} className="w-9 h-9 rounded border cursor-pointer shrink-0 p-0.5" />
              <Input value={settings["masthead_date_bg_color"] ?? ""} onChange={e => set("masthead_date_bg_color", e.target.value)} placeholder="(uses masthead color)" className="h-9 font-mono text-xs" />
            </div>
          </FieldRow>
        )}

        {/* Border */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Bottom Border</p>
            <p className="text-xs text-muted-foreground">Show a line below the masthead</p>
          </div>
          <Switch checked={(settings["masthead_border_bottom"] ?? "false") === "true"} onCheckedChange={v => set("masthead_border_bottom", v ? "true" : "false")} />
        </div>
        {(settings["masthead_border_bottom"] ?? "false") === "true" && (
          <FieldRow label="Border Color" helpText="Color of the bottom border. Leave blank for a subtle default." status={brandStatus("masthead_border_color", false)}>
            <div className="flex gap-2">
              <input type="color" value={settings["masthead_border_color"] || "#ffffff"} onChange={e => set("masthead_border_color", e.target.value)} className="w-9 h-9 rounded border cursor-pointer shrink-0 p-0.5" />
              <Input value={settings["masthead_border_color"] ?? ""} onChange={e => set("masthead_border_color", e.target.value)} placeholder="(subtle default)" className="h-9 font-mono text-xs" />
            </div>
          </FieldRow>
        )}

        {/* ── Live Masthead Preview ── */}
        <div className="rounded-lg border overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground px-4 pt-3 pb-2 bg-muted/30 border-b">Live Preview</p>
          <div
            style={{
              backgroundColor: settings["masthead_bg_color"] || settings["brand_color_primary"] || "#dc2626",
            }}
          >
            {/* Date bar preview */}
            {(settings["masthead_show_date"] ?? "true") === "true" && (
              <div
                style={{ backgroundColor: settings["masthead_date_bg_color"] || settings["masthead_bg_color"] || settings["brand_color_primary"] || "#dc2626" }}
                className="px-4 py-1.5 border-b border-white/10"
              >
                <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: settings["masthead_text_color"] || "#ffffff", opacity: 0.85 }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>
            )}
            {/* Masthead body preview */}
            <div
              className={`px-6 ${
                (settings["masthead_padding"] ?? "medium") === "compact" ? "py-3" :
                (settings["masthead_padding"] ?? "medium") === "spacious" ? "py-8" : "py-5"
              } flex flex-col ${
                (settings["masthead_layout"] ?? "center") === "center" ? "items-center" : "items-start"
              } gap-1`}
              style={{
                ...(settings["masthead_border_bottom"] === "true" ? { borderBottom: `2px solid ${settings["masthead_border_color"] || "rgba(255,255,255,0.2)"}` } : {}),
              }}
            >
              {(settings["masthead_layout"] ?? "center") === "logo-only" && settings["brand_logo_url"] ? (
                <img
                  src={settings["brand_logo_url"]}
                  alt="logo"
                  style={{ height: `${settings["masthead_logo_height"] || 60}px`, width: "auto", objectFit: "contain" }}
                />
              ) : (
                <>
                  <span
                    className={`font-black tracking-[-0.02em] ${
                      (settings["masthead_font_size"] ?? "large") === "small" ? "text-2xl" :
                      (settings["masthead_font_size"] ?? "large") === "medium" ? "text-3xl" :
                      (settings["masthead_font_size"] ?? "large") === "extra-large" ? "text-5xl" : "text-4xl"
                    }`}
                    style={{
                      color: settings["masthead_text_color"] || "#ffffff",
                      fontFamily: (() => {
                        const f = settings["masthead_font_family"] ?? "serif";
                        if (f === "serif") return "Georgia, 'Times New Roman', serif";
                        if (f === "sans-serif") return "system-ui, -apple-system, sans-serif";
                        return `'${f}', serif`;
                      })(),
                    }}
                  >
                    {settings["brand_site_name"] || "Your Site Name"}
                  </span>
                  {(settings["masthead_show_tagline"] ?? "true") === "true" && settings["brand_tagline"] && (
                    <p className="text-xs tracking-[0.3em] uppercase font-medium opacity-80" style={{ color: settings["masthead_text_color"] || "#ffffff" }}>
                      {settings["brand_tagline"]}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Section D: Legal & Company Info (collapsible) ── */}
      <div className="space-y-3">
        <button type="button" onClick={() => setShowLegal(v => !v)} className="flex items-center justify-between w-full text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legal & Company Info</p>
            <p className="text-xs text-muted-foreground mt-0.5">Used in Terms of Service, Privacy Policy, and footer copyright.</p>
          </div>
          {showLegal ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>
        {showLegal && (
          <div className="space-y-3 pl-1">
            <FieldRow label="Company / Legal Name" helpText="Legal entity name in Terms of Service, Privacy Policy, and footer copyright." status={brandStatus("brand_company_name", false)}>
              <Input value={settings["brand_company_name"] ?? ""} onChange={e => set("brand_company_name", e.target.value)} placeholder="e.g., JANICCO" className="h-9" />
            </FieldRow>
            <FieldRow label="Founded Year" helpText="Footer copyright year: © 2026 Company Name." status={fieldStatus("brand_founded_year", false)}>
              <Input type="number" min={1900} max={2100} value={settings["brand_founded_year"] ?? ""} onChange={e => set("brand_founded_year", e.target.value)} placeholder="2026" className="h-9" />
            </FieldRow>
            <FieldRow label="Launch Date" helpText="Used to calculate 'Days Since Launch' in the CEO Dashboard." status={fieldStatus("brand_launch_date", false)}>
              <Input type="date" value={settings["brand_launch_date"] ?? ""} onChange={e => set("brand_launch_date", e.target.value)} className="h-9" />
            </FieldRow>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── v4.0 Google News Topics Section ────────────────────────────────────────────────
function GoogleNewsTopicsSection() {
  const { data, refetch } = trpc.sources.getGoogleNewsTopics.useQuery();
  const saveMutation = trpc.sources.saveGoogleNewsTopics.useMutation();
  const fetchNowMutation = trpc.sources.fetchGoogleNewsNow.useMutation();
  const [topics, setTopics] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (data) {
      setTopics(data.topics);
      setEnabled(data.enabled);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ topics, enabled });
      toast.success("Google News topics saved.");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleFetchNow = async () => {
    try {
      const result = await fetchNowMutation.mutateAsync();
      toast.success(`Fetched ${result.inserted} new candidates from Google News topics.`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 relative">
          <Label className="text-xs font-medium">Google News Topic Keywords</Label>
          <HelpTip text="Enter topic keywords (one per line) to generate targeted Google News RSS feeds. These are added to the selector candidate pool alongside your RSS feeds." />
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{enabled ? 'On' : 'Off'}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">One keyword or phrase per line. Example: artificial intelligence, climate change, stock market</p>
      <Textarea
        value={topics}
        onChange={e => setTopics(e.target.value)}
        placeholder={"artificial intelligence\nclimate change\nstock market"}
        className="min-h-[80px] text-xs font-mono"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Topics
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleFetchNow} disabled={fetchNowMutation.isPending}>
          {fetchNowMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />} Fetch Now
        </Button>
      </div>
    </div>
  );
}

// ─── v4.0 X Listener Section ────────────────────────────────────────────────────────
function XListenerSection() {
  const utils = trpc.useUtils();
  const { data, refetch } = trpc.sources.getXListenerConfig.useQuery();
  const saveMutation = trpc.sources.saveXListenerConfig.useMutation();
  const fetchNowMutation = trpc.sources.fetchXNow.useMutation();
  const [queries, setQueries] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (data) {
      setQueries(data.queries);
      setEnabled(data.enabled);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ queries, enabled });
      toast.success("X listener config saved.");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleFetchNow = async () => {
    try {
      const result = await fetchNowMutation.mutateAsync();
      toast.success(`Fetched ${result.inserted} new candidates from X.`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 relative">
          <Label className="text-xs font-medium">X / Twitter Listener</Label>
          <HelpTip text="Search X/Twitter for recent posts matching your queries and add them to the candidate pool. Requires X API Basic tier." />
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{enabled ? 'On' : 'Off'}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">One search query per line. Fetches up to 10 recent tweets per query.</p>
      <Textarea
        value={queries}
        onChange={e => setQueries(e.target.value)}
        placeholder={"breaking news\nartificial intelligence\nclimate change"}
        className="min-h-[80px] text-xs font-mono"
        disabled={!enabled}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleFetchNow} disabled={fetchNowMutation.isPending || !enabled}>
          {fetchNowMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />} Fetch Now
        </Button>
      </div>
    </div>
  );
}

// ─── v4.0 Reddit Listener Section ────────────────────────────────────────────────────
function RedditListenerSection() {
  const { data, refetch } = trpc.sources.getRedditConfig.useQuery();
  const saveMutation = trpc.sources.saveRedditConfig.useMutation();
  const fetchNowMutation = trpc.sources.fetchRedditNow.useMutation();
  const [subreddits, setSubreddits] = useState("");
  const [enabled, setEnabled] = useState(true); // default true — matches server default

  useEffect(() => {
    if (data) {
      setSubreddits(data.subreddits);
      setEnabled(data.enabled);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ subreddits, enabled });
      toast.success("Reddit listener config saved.");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleFetchNow = async () => {
    try {
      const result = await fetchNowMutation.mutateAsync();
      toast.success(`Fetched ${result.inserted} new candidates from Reddit.`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 relative">
          <Label className="text-xs font-medium">Reddit Listener</Label>
          <HelpTip text="Fetch hot posts from subreddits and add them to the candidate pool. No API key required — uses Reddit's public JSON API." />
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{enabled ? 'On' : 'Off'}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">One subreddit per line (with or without r/ prefix). Fetches top 10 hot posts per subreddit.</p>
      <Textarea
        value={subreddits}
        onChange={e => setSubreddits(e.target.value)}
        placeholder={"r/worldnews\nr/technology\nr/politics"}
        className="min-h-[80px] text-xs font-mono"
        disabled={!enabled}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleFetchNow} disabled={fetchNowMutation.isPending || !enabled}>
          {fetchNowMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />} Fetch Now
        </Button>
      </div>
    </div>
  );
}

// ─── v4.0 YouTube Section ──────────────────────────────────────────────────────────
function YouTubeSection() {
  const { data, refetch } = trpc.sources.getYouTubeConfig.useQuery();
  const saveMutation = trpc.sources.saveYouTubeConfig.useMutation();
  const fetchNowMutation = trpc.sources.fetchYouTubeNow.useMutation();
  const [channels, setChannels] = useState("");
  const [searchQueries, setSearchQueries] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (data) {
      setChannels(data.channels);
      setSearchQueries(data.searchQueries);
      setEnabled(data.enabled);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ channels, searchQueries, enabled });
      toast.success("YouTube config saved.");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleFetchNow = async () => {
    try {
      const result = await fetchNowMutation.mutateAsync();
      toast.success(result.inserted > 0 ? `Fetched ${result.inserted} new candidates from YouTube.` : "No new candidates (API key may be missing or no results).");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 relative">
          <Label className="text-xs font-medium">YouTube Agent</Label>
          <HelpTip text="Fetch recent videos from YouTube channels and search queries. Requires YOUTUBE_API_KEY environment variable." />
        </div>
        <div className="flex items-center gap-2">
          {data && !data.hasApiKey && (
            <span className="text-xs text-amber-600 font-medium">API key missing</span>
          )}
          <span className={`text-xs font-medium ${enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{enabled ? 'On' : 'Off'}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Channel IDs (one per line)</Label>
        <Textarea
          value={channels}
          onChange={e => setChannels(e.target.value)}
          placeholder={"UCVHFbw7woebKtfvug_tfqjA\nUCnUYZLuoy1rq1aVMwx4unkA"}
          className="min-h-[60px] text-xs font-mono"
          disabled={!enabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Search Queries (one per line)</Label>
        <Textarea
          value={searchQueries}
          onChange={e => setSearchQueries(e.target.value)}
          placeholder={"breaking news today\nscience discoveries 2026"}
          className="min-h-[60px] text-xs font-mono"
          disabled={!enabled}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleFetchNow} disabled={fetchNowMutation.isPending || !enabled}>
          {fetchNowMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />} Fetch Now
        </Button>
      </div>
    </div>
  );
}

// ─── v4.0 Web Scraper Section ──────────────────────────────────────────────────────
function WebScraperSection() {
  const { data, refetch } = trpc.sources.getWebScraperConfig.useQuery();
  const saveMutation = trpc.sources.saveWebScraperConfig.useMutation();
  const fetchNowMutation = trpc.sources.fetchWebScraperNow.useMutation();
  const [configs, setConfigs] = useState("[]");
  const [enabled, setEnabled] = useState(false);
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    if (data) {
      setConfigs(data.configs);
      setEnabled(data.enabled);
    }
  }, [data]);

  const validateJson = (val: string) => {
    try { JSON.parse(val); setJsonError(""); return true; }
    catch (e: any) { setJsonError(e.message); return false; }
  };

  const handleSave = async () => {
    if (!validateJson(configs)) { toast.error("Fix JSON errors before saving."); return; }
    try {
      await saveMutation.mutateAsync({ configs, enabled });
      toast.success("Web scraper config saved.");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleFetchNow = async () => {
    try {
      const result = await fetchNowMutation.mutateAsync();
      toast.success(`Scraped ${result.inserted} new candidates.`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 relative">
          <Label className="text-xs font-medium">Web Scraper</Label>
          <HelpTip text="Scrape websites using CSS selectors. Configure as a JSON array of scraper objects. No API key required." />
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{enabled ? 'On' : 'Off'}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">JSON array of scraper configs. Each object needs: name, url, itemSelector, titleSelector. Optional: linkSelector, summarySelector, priority.</p>
      <Textarea
        value={configs}
        onChange={e => { setConfigs(e.target.value); validateJson(e.target.value); }}
        placeholder={`[{\n  "name": "Example Site",\n  "url": "https://example.com/news",\n  "itemSelector": "article",\n  "titleSelector": "h2",\n  "linkSelector": "a",\n  "priority": 55,\n  "enabled": true\n}]`}
        className={`min-h-[120px] text-xs font-mono ${jsonError ? "border-red-500" : ""}`}
        disabled={!enabled}
      />
      {jsonError && <p className="text-xs text-red-500">{jsonError}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave} disabled={saveMutation.isPending || !!jsonError}>
          {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleFetchNow} disabled={fetchNowMutation.isPending || !enabled}>
          {fetchNowMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />} Fetch Now
        </Button>
      </div>
    </div>
  );
}

// ─── v4.0 Manual Injection Section ───────────────────────────────────────────────────
function ManualInjectionSection() {
  const [entries, setEntries] = useState("");
  const injectMutation = trpc.sources.injectManual.useMutation();
  const { data: stats, refetch: refetchStats } = trpc.sources.getCandidateStats.useQuery();

  const handleInject = async () => {
    const lines = entries.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error("Enter at least one topic or URL."); return; }
    const parsed = lines.map(line => {
      if (line.startsWith("http")) return { title: line, sourceUrl: line };
      return { title: line };
    });
    try {
      const result = await injectMutation.mutateAsync({ entries: parsed });
      toast.success(`Injected ${result.inserted} candidate(s) into the selector pool.`);
      setEntries("");
      refetchStats();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 relative">
          <Label className="text-xs font-medium">Manual Topic Injection</Label>
          <HelpTip text="Paste topic titles or URLs (one per line) to inject directly into the selector candidate pool. These will be considered in the next pipeline run." />
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-green-600 font-medium">{stats.pending} pending</span>
            <span>·</span>
            <span>{stats.selected} selected</span>
            <span>·</span>
            <span>{stats.total} total</span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">One topic title or URL per line. These are injected at priority 80 (high) and expire after the configured window.</p>
      <Textarea
        value={entries}
        onChange={e => setEntries(e.target.value)}
        placeholder={"Breaking: Scientists discover new element\nhttps://example.com/article-to-satirize"}
        className="min-h-[80px] text-xs font-mono"
      />
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleInject} disabled={injectMutation.isPending || !entries.trim()}>
        {injectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />} Inject into Pool
      </Button>
    </div>
  );
}

// ─── Content Engine Screen (Screen 2) ───────────────────────────────────────────────
function ContentEngineScreen({settings, set, isOn, toggle, fieldStatus,
}: {
  settings: Record<string, string>;
  set: (key: string, value: string) => void;
  isOn: (key: string, defaultVal?: string) => boolean;
  toggle: (key: string) => void;
  fieldStatus: (key: string, required?: boolean) => StatusDot;
}) {
  const { data: effectivePrompt, refetch: refetchPrompt } = trpc.setup.getEffectivePrompt.useQuery();

  // Pre-populate system prompt from effective prompt
  useEffect(() => {
    if (effectivePrompt && !settings["article_llm_system_prompt"]) {
      set("article_llm_system_prompt", effectivePrompt.prompt);
    }
  }, [effectivePrompt]);

  const resetToDefault = async () => {
    const result = await refetchPrompt();
    const defaultPrompt = result.data?.prompt ?? "";
    set("article_llm_system_prompt", defaultPrompt);
    toast.success("Reset to default prompt.");
  };

  return (
    <div className="space-y-5">
      {/* 1. System Prompt */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 relative">
            <Label className="text-xs font-medium">System Prompt</Label>
            <HelpTip text="The full prompt the AI receives before writing every article. Pre-populated from your assembled default. Edit to customize — click Reset to restore the default." />
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status={fieldStatus("article_llm_system_prompt")} label={fieldStatus("article_llm_system_prompt") === "green" ? "Configured" : "Missing"} />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resetToDefault}>
              <RefreshCw className="w-3 h-3 mr-1" /> Reset to Default
            </Button>
          </div>
        </div>
        <Textarea
          value={settings["article_llm_system_prompt"] ?? effectivePrompt?.prompt ?? ""}
          onChange={e => set("article_llm_system_prompt", e.target.value)}
          placeholder="Loading default prompt..."
          className="min-h-[140px] text-xs font-mono"
        />
        {effectivePrompt?.source === "saved" && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Custom prompt active — differs from the assembled default.
          </p>
        )}
      </div>

      <Separator />

      {/* 2. Target Word Count + 3. Articles Per Batch */}
      <div className="grid grid-cols-2 gap-4">
        <FieldRow label="Target Word Count" helpText="Target article length in words. The AI aims for this count. Recommended: 200–400 for professional content." status={fieldStatus("target_article_length", false)}>
          <Input
            type="number"
            value={settings["target_article_length"] ?? "300"}
            onChange={e => set("target_article_length", e.target.value)}
            className="h-9"
            min={100}
            max={1000}
          />
        </FieldRow>
        <FieldRow label="Articles Per Batch" helpText="Articles generated per workflow run. Runs/day × this number = daily total. Default: 20." status={fieldStatus("articles_per_batch", false)}>
          <Input
            type="number"
            value={settings["articles_per_batch"] ?? "20"}
            onChange={e => set("articles_per_batch", e.target.value)}
            className="h-9"
            min={1}
            max={200}
          />
        </FieldRow>
      </div>
    </div>
  );
}

// ─── Content Sources Screen (Screen 5) ──────────────────────────────────────────────
function ContentSourcesScreen({
  settings, set, isOn, toggle, fieldStatus,
}: {
  settings: Record<string, string>;
  set: (key: string, value: string) => void;
  isOn: (key: string, defaultVal?: string) => boolean;
  toggle: (key: string) => void;
  fieldStatus: (key: string, required?: boolean) => StatusDot;
}) {
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [addingFeed, setAddingFeed] = useState(false);
  const [removingFeed, setRemovingFeed] = useState<string | null>(null);

  const { data: rssFeeds, refetch: refetchFeeds } = trpc.setup.getRssFeeds.useQuery();
  const addFeedMutation = trpc.setup.addRssFeed.useMutation();
  const removeFeedMutation = trpc.setup.removeRssFeed.useMutation();
  const toggleFeedMutation = trpc.setup.toggleRssFeed.useMutation();

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return;
    setAddingFeed(true);
    try {
      await addFeedMutation.mutateAsync({ feedUrl: newFeedUrl.trim() });
      setNewFeedUrl("");
      refetchFeeds();
      toast.success("Feed added.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAddingFeed(false);
    }
  };

  const handleRemoveFeed = async (feedUrl: string) => {
    setRemovingFeed(feedUrl);
    try {
      await removeFeedMutation.mutateAsync({ feedUrl });
      refetchFeeds();
      toast.success("Feed removed.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRemovingFeed(null);
    }
  };

  const handleToggleFeed = async (feedUrl: string, enabled: boolean) => {
    try {
      await toggleFeedMutation.mutateAsync({ feedUrl, enabled });
      refetchFeeds();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* RSS Feed Sources */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">RSS Feed Sources</Label>
          {(() => {
            const hasEnabledFeed = (rssFeeds ?? []).some(f => f.enabled ?? true);
            const googleOn = isOn("use_google_news", "true");
            const rssStatus: StatusDot = (hasEnabledFeed || googleOn) ? "green" : "red";
            const activeCount = (rssFeeds ?? []).filter(f => f.enabled ?? true).length;
            const label = rssStatus === "green"
              ? googleOn && activeCount === 0 ? "Google News" : `${activeCount} active`
              : "No sources";
            return <StatusIndicator status={rssStatus} label={label} />;
          })()}
        </div>
        <p className="text-xs text-muted-foreground">Feeds the AI reads to find trending topics. Toggle to enable/disable without deleting.</p>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {rssFeeds?.map(feed => (
            <div key={feed.feedUrl} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs">
              <Switch
                checked={feed.enabled ?? true}
                onCheckedChange={checked => handleToggleFeed(feed.feedUrl, checked)}
                className="scale-75"
              />
              <span className={`flex-1 font-mono truncate ${!(feed.enabled ?? true) ? "text-muted-foreground line-through" : ""}`}>{feed.feedUrl}</span>
              <span className="text-muted-foreground shrink-0">w:{feed.weight ?? 50}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => handleRemoveFeed(feed.feedUrl)}
                disabled={removingFeed === feed.feedUrl}
              >
                {removingFeed === feed.feedUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              </Button>
            </div>
          ))}
          {!rssFeeds?.length && (
            <p className="text-xs text-muted-foreground italic py-2">No feeds yet — the default feed list will be used on first run.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newFeedUrl}
            onChange={e => setNewFeedUrl(e.target.value)}
            placeholder="https://feeds.example.com/rss.xml"
            className="h-8 text-xs font-mono flex-1"
            onKeyDown={e => e.key === "Enter" && handleAddFeed()}
          />
          <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleAddFeed} disabled={!newFeedUrl.trim() || addingFeed}>
            {addingFeed ? <Loader2 className="w-3 h-3 animate-spin" /> : "+ Add"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Google News + Selector Window */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 relative">
              <Label className="text-xs font-medium">Include Google News</Label>
              <HelpTip text="Adds Google News RSS feeds as additional event sources. Increases topic variety but may overlap with existing feeds." />
            </div>
            <Switch checked={isOn("use_google_news", "true")} onCheckedChange={() => toggle("use_google_news")} />
          </div>
          <p className="text-xs text-muted-foreground">Pull trending topics from Google News feeds</p>
        </div>
        <FieldRow label="Selector Window Size" helpText="How many RSS events to evaluate per run before picking articles to write. Larger = more variety, slower. Default: 200." status={fieldStatus("selector_window_size", false)}>
          <Input
            type="number"
            value={settings["selector_window_size"] ?? "200"}
            onChange={e => set("selector_window_size", e.target.value)}
            className="h-9"
            min={50}
            max={1000}
          />
        </FieldRow>
      </div>

      <Separator />

      {/* Google News Topic Keywords */}
      <GoogleNewsTopicsSection />

      <Separator />

      {/* X Listener */}
      <XListenerSection />

      <Separator />

      {/* Reddit Listener */}
      <RedditListenerSection />

      <Separator />

      {/* YouTube Agent */}
      <YouTubeSection />

      <Separator />

      {/* Web Scraper */}
      <WebScraperSection />

      <Separator />

      {/* Manual Injection */}
      <ManualInjectionSection />
    </div>
  );
}

// ─── Categories Screen ───────────────────────────────────────────────────────────────
type CategoryRow = { id: number; name: string; slug: string; description?: string | null; color?: string | null; keywords?: string | null };

function CategoriesScreen({
  categories, settings, onToggle, onCreate, onUpdate, onDelete, onRecategorize,
}: {
  categories: CategoryRow[];
  settings: Record<string, string>;
  onToggle: (key: string) => void;
  onCreate: (name: string, slug: string, color: string, description?: string) => Promise<void>;
  onUpdate: (id: number, data: { name?: string; slug?: string; color?: string; description?: string; keywords?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRecategorize: () => Promise<{ updated: number; skipped: number }>;
}) {
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ name: string; slug: string; color: string; description: string; keywords: string }>({ name: "", slug: "", color: "", description: "", keywords: "" });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [recategorizing, setRecategorizing] = useState(false);

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onCreate(newName.trim(), newSlug.trim() || autoSlug(newName), newColor, newDesc.trim() || undefined);
      setNewName(""); setNewSlug(""); setNewColor("#6366f1"); setNewDesc("");
      toast.success("Category added.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await onUpdate(id, { name: editData.name, slug: editData.slug, color: editData.color, description: editData.description, keywords: editData.keywords });
      setEditingId(null);
      toast.success("Category updated.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success("Category deleted.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quotas toggle */}
      <FieldRow
        label="Category Quotas"
        helpText="When enabled, the AI selector enforces hard per-category quotas to maintain content mix."
        status={settings["category_quotas_enabled"] === "true" ? "green" : "gray"}
      >
        <Switch
          checked={settings["category_quotas_enabled"] === "true"}
          onCheckedChange={() => onToggle("category_quotas_enabled")}
        />
      </FieldRow>

      <Separator />

      {/* Category list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories ({categories.length})</p>
        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No categories yet. Add at least 3 to get started.</p>
        )}
        {categories.map(cat => (
          <div key={cat.id} className="border rounded-lg overflow-hidden">
            {editingId === cat.id ? (
              <div className="p-3 space-y-2 bg-muted/20">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Slug</Label>
                    <Input value={editData.slug} onChange={e => setEditData(d => ({ ...d, slug: e.target.value }))} className="h-7 text-xs font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editData.color} onChange={e => setEditData(d => ({ ...d, color: e.target.value }))} className="w-8 h-7 rounded border cursor-pointer" />
                      <Input value={editData.color} onChange={e => setEditData(d => ({ ...d, color: e.target.value }))} className="h-7 text-xs font-mono flex-1" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} className="h-7 text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Keywords <span className="text-muted-foreground">(comma-separated — used for auto-categorization)</span></Label>
                  <Textarea
                    value={editData.keywords}
                    onChange={e => setEditData(d => ({ ...d, keywords: e.target.value }))}
                    placeholder="e.g. politics, congress, senate, election, vote, democrat, republican"
                    className="h-16 text-xs font-mono resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs h-7 flex-1" onClick={() => handleUpdate(cat.id)}>Save</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? "#6366f1" }} />
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">/{cat.slug}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditingId(cat.id); setEditData({ name: cat.name, slug: cat.slug, color: cat.color ?? "#6366f1", description: cat.description ?? "", keywords: cat.keywords ?? "" }); }}>Edit</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id)} disabled={deletingId === cat.id}>
                    {deletingId === cat.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Separator />

      {/* Add new category */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Category</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              placeholder="e.g. Politics"
              value={newName}
              onChange={e => { setNewName(e.target.value); if (!newSlug) setNewSlug(autoSlug(e.target.value)); }}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Slug (auto-generated)</Label>
            <Input
              placeholder="e.g. politics"
              value={newSlug}
              onChange={e => setNewSlug(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
              <Input value={newColor} onChange={e => setNewColor(e.target.value)} className="h-8 text-xs font-mono flex-1" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description (optional)</Label>
            <Input
              placeholder="Brief description"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || adding} className="w-full text-xs h-8">
          {adding ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
          Add Category
        </Button>
      </div>
      <Separator />
      {/* Bulk recategorize */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bulk Actions</p>
        <p className="text-xs text-muted-foreground">Re-run keyword matching on all articles with no category assigned. Uses DB keywords when set, otherwise falls back to the built-in keyword map.</p>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-8"
          disabled={recategorizing}
          onClick={async () => {
            setRecategorizing(true);
            try {
              const result = await onRecategorize();
              toast.success(`Done: ${result.updated} articles categorized, ${result.skipped} already had a category.`);
            } catch (e: any) {
              toast.error(e.message);
            } finally {
              setRecategorizing(false);
            }
          }}
        >
          {recategorizing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
          Recategorize Uncategorized Articles
        </Button>
      </div>
    </div>
  );
}

// ─── Main wizard component ─────────────────────────────────────────────────────────
export default function AdminSetup() {
  const [screen, setScreen] = useState(0);
  const [view, setView] = useState<"dashboard" | "wizard">("dashboard");

  // Settings state — pre-populated from DB
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [platformCreds, setPlatformCreds] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  // Data queries
  const { data: xEnvStatus } = trpc.distribution.getXEnvStatus.useQuery(undefined, { enabled: view === "wizard" });
  const xEnvConfigured = xEnvStatus?.configured ?? false;
  const { data: summary, refetch: refetchSummary } = trpc.setup.getSummary.useQuery();
  const { data: checklist, refetch: refetchChecklist } = trpc.setup.getChecklist.useQuery();
  const { data: wizardData, refetch: refetchWizard } = trpc.setup.getAllWizardData.useQuery(undefined, { enabled: view === "wizard" });
  const { data: envStatus } = trpc.setup.getEnvStatus.useQuery(undefined, { enabled: view === "wizard" });
  const { data: categoriesData, refetch: refetchCategories } = trpc.categories.list.useQuery(undefined, { enabled: view === "wizard" });
  const rssFeedCount = wizardData?.rssFeedCount ?? 0;

  // Mutations
  const saveSettingsMutation = trpc.settings.update.useMutation();
  const testResendMutation = trpc.newsletter.testConnection.useMutation();
  const testPlatformMutation = trpc.distribution.testPlatformConnection.useMutation();
  const completeMutation = trpc.setup.completeItem.useMutation({ onSuccess: () => { refetchSummary(); refetchChecklist(); } });
  const uncompleteMutation = trpc.setup.uncompleteItem.useMutation({ onSuccess: () => { refetchSummary(); refetchChecklist(); } });
  const createCategoryMutation = trpc.categories.create.useMutation({ onSuccess: () => refetchCategories() });
  const updateCategoryMutation = trpc.categories.update.useMutation({ onSuccess: () => refetchCategories() });
  const deleteCategoryMutation = trpc.categories.delete.useMutation({ onSuccess: () => refetchCategories() });
  const recategorizeMutation = trpc.categories.recategorizeUncategorized.useMutation();
  const completeLaunchMutation = trpc.setup.completeLaunch.useMutation();

  // Pre-populate settings from DB when wizard data loads
  useEffect(() => {
    if (wizardData?.settings) {
      const merged = { ...wizardData.settings };
      // Default dist_enabled_x to "true" when env vars are set but DB key is not yet saved
      if (xEnvConfigured && !merged["dist_enabled_x"]) {
        merged["dist_enabled_x"] = "true";
      }
      setSettings(merged);
    }
    if (wizardData?.credentials) {
      const pc: Record<string, Record<string, string>> = {};
      for (const [platform, cred] of Object.entries(wizardData.credentials)) {
        if (!cred) continue;
        const form = PLATFORM_FORMS.find(f => f.platform === platform);
        if (!form) continue;
        pc[platform] = {
          apiKey: cred.apiKey ?? "",
          apiSecret: cred.apiSecret ?? "",
          ...(cred.extra ? JSON.parse(cred.extra) : {}),
        };
      }
      setPlatformCreds(pc);
    }
  }, [wizardData]);

  // Clear stale run-time keys when schedule_runs_per_day is reduced
  useEffect(() => {
    const runs = parseInt(settings["schedule_runs_per_day"] ?? "4");
    const staleKeys: string[] = [];
    if (runs < 4) staleKeys.push("schedule_run4_hour", "schedule_run4_minute");
    if (runs < 3) staleKeys.push("schedule_run3_hour", "schedule_run3_minute");
    if (runs < 2) staleKeys.push("schedule_run2_hour", "schedule_run2_minute");
    if (staleKeys.length > 0) {
      setSettings(prev => {
        const next = { ...prev };
        let changed = false;
        staleKeys.forEach(k => { if (k in next) { delete next[k]; changed = true; } });
        return changed ? next : prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings["schedule_runs_per_day"]]);


  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));
  const toggle = (key: string) => setSettings(prev => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  const isOn = (key: string, defaultVal = "false") => (settings[key] ?? defaultVal) === "true";

  const fieldStatus = (key: string, required = true): StatusDot => {
    const v = settings[key];
    if (!v || v.trim() === "") return required ? "red" : "gray";
    return "green";
  };

  const saveCurrentScreen = async () => {
    setSaving(true);
    try {
      const keysForScreen: Record<string, string[]> = {
        brand: [
          "brand_site_name", "brand_tagline", "brand_description", "brand_genre", "site_url",
          "brand_editorial_team",
          "brand_color_primary", "brand_color_secondary",
          "brand_logo_url", "brand_favicon_url", 
          "powered_by_url",
          "loading_style", "loading_logo_url", "loading_text",
          "brand_gtag_id",
          // Masthead customization (v4.9.6)
          "masthead_bg_color", "masthead_text_color", "masthead_font_family", "masthead_font_size",
          "masthead_layout", "masthead_show_tagline", "masthead_show_date", "masthead_date_bg_color",
          "masthead_logo_height", "masthead_padding", "masthead_border_bottom", "masthead_border_color",
          "brand_contact_email", "brand_editor_email", "brand_privacy_email",
          "brand_legal_email", "brand_corrections_email", "brand_moderation_email",
          "brand_company_name", "brand_founded_year", "brand_launch_date",
        ],
        content: ["article_llm_system_prompt", "target_article_length", "articles_per_batch"],
        media: [
          "auto_generate_images", "image_provider", "image_llm_system_prompt", "image_style_prompt", "image_style_keywords",
          "image_aspect_ratio", "image_provider_fallback_enabled",
          "image_provider_openai_api_key", "image_provider_replicate_api_key",
          "image_provider_replicate_model", "image_provider_custom_api_url",
          "image_provider_custom_api_key", "brand_og_image",
          "watermark_enabled", "watermark_text", "watermark_position",
          "watermark_font_size", "watermark_text_color", "watermark_bg_opacity",
          
          "real_image_sourcing_enabled", "real_image_fallback", "real_image_relevance_threshold",
          "real_image_flickr_api_key", "real_image_unsplash_access_key",
          "real_image_pexels_api_key", "real_image_pixabay_api_key",
          // v4.9.0: sponsor card fallback settings
          "sponsor_card_enabled", "sponsor_card_label", "sponsor_card_logo_url", "sponsor_card_click_url",
          // v4.9.0: image watermark settings
          "image_watermark_enabled", "image_watermark_text",
          // v4.9.7: Google CSE image crawler
          "google_cse_api_key", "google_cse_cx",
          "image_crawler_enabled", "image_validation_enabled",
          "image_library_reuse_enabled", "image_max_reuse_count",
          "auto_generate_videos", "video_provider", "video_style_prompt",
          "video_duration", "video_aspect_ratio", "video_provider_fallback_enabled",
          "video_provider_openai_api_key", "video_provider_replicate_api_key",
          "video_provider_replicate_model", "video_provider_custom_api_url",
          "video_provider_custom_api_key",
          "easter_eggs_enabled",
        ],
        categories: ["category_quotas_enabled"],
        sources: [
          "use_google_news", "selector_window_size",
          "x_listener_enabled", "x_listener_keywords",
          "reddit_listener_enabled", "reddit_listener_subreddits",
          "youtube_agent_enabled", "youtube_agent_channel_ids", "youtube_agent_keywords",
          "web_scraper_enabled", "web_scraper_urls",
          "manual_injection_enabled",
        ],
        social: [
          // dist_enabled_* toggles
          "dist_enabled_x", "dist_enabled_reddit", "dist_enabled_facebook",
          "dist_enabled_instagram", "dist_enabled_bluesky", "dist_enabled_threads",
          "dist_enabled_linkedin",
          // X credentials & settings
          "x_handle", "x_api_key", "x_api_secret", "x_access_token", "x_access_token_secret",
          "x_bearer_token", "x_auto_post_enabled", "x_posts_per_day",
          "x_posting_start_hour", "x_posting_end_hour",
          "x_reply_engine_enabled", "x_standalone_tweets_enabled",
          // Threads
          "threads_user_id", "threads_access_token",
          "threads_auto_post_enabled", "threads_posts_per_day",
          // Bluesky
          "bluesky_handle", "bluesky_app_password",
          "bluesky_auto_post_enabled", "bluesky_posts_per_day",
          // Facebook
          "facebook_page_id", "facebook_page_access_token",
          "facebook_auto_post_enabled", "facebook_posts_per_day",
          // Instagram
          "instagram_account_id", "instagram_access_token",
          "instagram_auto_post_enabled", "instagram_posts_per_day",
          // LinkedIn
          "linkedin_org_urn", "linkedin_access_token",
          "linkedin_auto_post_enabled", "linkedin_posts_per_day",
          // Profile URLs
          "social_url_x", "social_url_threads", "social_url_bluesky",
          "social_url_facebook", "social_url_instagram", "social_url_linkedin",
          "social_url_youtube", "social_url_tiktok", "social_url_reddit",
          // Legacy brand social URL keys
          "brand_twitter_handle", "brand_twitter_url", "brand_bluesky_url",
          "brand_facebook_url", "brand_instagram_url", "brand_linkedin_url",
          "brand_threads_url",
        ],
        seo: [
          "site_url", "gsc_site_url", "indexnow_key", "bing_api_key",
          "brand_seo_keywords", "brand_og_image",
          "brand_clarity_id", "brand_gtag_id",
          // v4.9.0: analytics spam filter
          "analytics_spam_referrer_blocklist",
        ],
        production: [
          "production_loop_enabled", "production_mode", "production_interval_minutes",
          "max_daily_articles", "max_batch_high", "max_batch_medium",
          "min_score_to_publish", "score_high_threshold", "min_score_threshold", "pool_min_size",
          "schedule_runs_per_day", "schedule_hour", "schedule_minute",
          "schedule_run2_hour", "schedule_run2_minute",
          "schedule_run3_hour", "schedule_run3_minute",
          "schedule_run4_hour", "schedule_run4_minute",
          "schedule_timezone", "schedule_days",
          "auto_publish_enabled", "articles_per_batch",
          "x_post_interval_minutes", "x_daily_post_limit",
          "dist_enabled_x", "dist_enabled_reddit", "dist_enabled_facebook",
          "dist_enabled_instagram", "dist_enabled_bluesky", "dist_enabled_threads",
          "dist_enabled_linkedin",
          "brand_twitter_handle",
          "network_api_enabled", "network_api_key", "network_hub_url", "network_sync_interval",
        ],
        review: [],
      };
      const keys = keysForScreen[SCREENS[screen].id] ?? [];
      for (const key of keys) {
        if (settings[key] !== undefined) {
          await saveSettingsMutation.mutateAsync({ key, value: settings[key] });
        }
      }
      toast.success("Settings saved.");
      refetchWizard();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const testResend = async () => {
    setTesting(t => ({ ...t, resend: true }));
    try {
      const result = await testResendMutation.mutateAsync({ toEmail: settings["newsletter_from_email"] || "test@example.com" });
      const msg = result.success ? "Test email sent!" : (result.error ?? "Test failed");
      setTestResults(r => ({ ...r, resend: { success: result.success, message: msg } }));
      if (result.success) toast.success("Test email sent!");
      else toast.error(msg);
    } catch (e: any) {
      setTestResults(r => ({ ...r, resend: { success: false, message: e.message } }));
      toast.error(e.message);
    } finally {
      setTesting(t => ({ ...t, resend: false }));
    }
  };

  const screenCompletionStatus = (screenId: string): StatusDot => {
    // Special case: social — check if at least one platform is enabled
    if (screenId === "social") {
      const anyEnabled = PLATFORM_FORMS.some(f => settings[`dist_enabled_${f.platform}`] === "true");
      if (!anyEnabled) return "red";
      const anyConfigured = PLATFORM_FORMS.some(f => platformCreds[f.platform] && Object.values(platformCreds[f.platform]).some(v => v?.trim()));
      return anyConfigured ? "green" : "yellow";
    }
    // Special case: categories — check count from DB
    if (screenId === "categories") {
      const count = categoriesData?.length ?? 0;
      if (count >= 3) return "green";
      if (count > 0) return "yellow";
      return "red";
    }
    const requiredKeys: Record<string, string[]> = {
      brand: ["brand_site_name", "brand_tagline", "brand_description", "brand_genre", "site_url", "brand_contact_email"],
      content: ["article_llm_system_prompt"],
      media: [],
      categories: [],
      sources: [],
      seo: ["site_url"],
      production: [],
      review: [],
    };
    const keys = requiredKeys[screenId] ?? [];
    if (keys.length === 0) return "green"; // no required fields = always complete
    const allSet = keys.every(k => settings[k]?.trim());
    return allSet ? "green" : "yellow";
  };

  // ── Wizard view ──────────────────────────────────────────────────────────────
  if (view === "wizard") {
    const currentScreen = SCREENS[screen];
    const ScreenIcon = currentScreen.icon;
    const isLast = screen === SCREENS.length - 1;
    const isFirst = screen === 0;

    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Top nav */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="font-medium">Setup Wizard — Screen {screen + 1} of {SCREENS.length}</span>
              <button onClick={() => setView("dashboard")} className="hover:text-foreground transition-colors text-xs">
                Exit Wizard
              </button>
            </div>
            <Progress value={((screen + 1) / SCREENS.length) * 100} className="h-1.5" />
            {/* Step pills */}
            <div className="flex gap-1 flex-wrap">
              {SCREENS.map((s, i) => {
                const status = screenCompletionStatus(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setScreen(i)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${i === screen ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}
                  >
                    {status === "green" && i !== screen
                      ? <CheckCircle className="w-3 h-3 text-green-500" />
                      : <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>}
                    <span className="hidden md:inline">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Screen card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <ScreenIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{currentScreen.title}</CardTitle>
                  <CardDescription>{currentScreen.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* ── Screen 1: Brand & Identity ─────────────────────────────── */}
              {currentScreen.id === "brand" && (
                <BrandScreen settings={settings} set={set} fieldStatus={fieldStatus} />
              )}

              {/* ── Screen 2: Content Engine ───────────────────────────────── */}
              {currentScreen.id === "content" && (
                <ContentEngineScreen
                  settings={settings}
                  set={set}
                  isOn={isOn}
                  toggle={toggle}
                  fieldStatus={fieldStatus}
                />
              )}

                {/* ── Screen 3: Image & Video ─────────────────────────────── */}
              {currentScreen.id === "media" && (
                <div className="space-y-6">

                  {/* ── Image Generation ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2"><Image className="w-4 h-4" /> Image Generation</p>
                        <p className="text-xs text-muted-foreground">Auto-generate article header images using AI</p>
                      </div>
                      <Switch checked={isOn("auto_generate_images")} onCheckedChange={() => toggle("auto_generate_images")} />
                    </div>
                    {isOn("auto_generate_images") && (
                      <div className="pl-4 border-l-2 border-primary/20 space-y-3">

                        {/* Image Provider */}
                        <FieldRow
                          label="Image Provider"
                          helpText="Which AI service to use for image generation. Built-in uses platform credits."
                          status={(() => {
                            const v = settings["image_provider"] ?? "none";
                            return v && v !== "none" ? "green" : "red";
                          })()}
                        >
                          <Select value={settings["image_provider"] ?? "none"} onValueChange={v => set("image_provider", v)}>
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None (disabled)</SelectItem>
                              <SelectItem value="manus">Built-in (Manus)</SelectItem>
                              <SelectItem value="openai">OpenAI DALL-E</SelectItem>
                              <SelectItem value="replicate">Replicate (FLUX)</SelectItem>
                              <SelectItem value="custom">Custom API</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>

                        {/* Provider-specific API key fields */}
                        {settings["image_provider"] === "openai" && (
                          <FieldRow label="OpenAI API Key" helpText="developer.openai.com → API Keys" status={fieldStatus("image_provider_openai_api_key", false)}>
                            <Input type="password" value={settings["image_provider_openai_api_key"] ?? ""} onChange={e => set("image_provider_openai_api_key", e.target.value)} placeholder="sk-..." className="h-9" />
                          </FieldRow>
                        )}
                        {settings["image_provider"] === "replicate" && (
                          <>
                            <FieldRow label="Replicate API Key" helpText="replicate.com/account/api-tokens" status={fieldStatus("image_provider_replicate_api_key", false)}>
                              <Input type="password" value={settings["image_provider_replicate_api_key"] ?? ""} onChange={e => set("image_provider_replicate_api_key", e.target.value)} placeholder="r8_..." className="h-9" />
                            </FieldRow>
                            <FieldRow label="Replicate Model" helpText="Model name from Replicate (e.g., black-forest-labs/flux-schnell). Browse models at replicate.com/explore" status={fieldStatus("image_provider_replicate_model", false)}>
                              <Input value={settings["image_provider_replicate_model"] ?? "black-forest-labs/flux-schnell"} onChange={e => set("image_provider_replicate_model", e.target.value)} placeholder="black-forest-labs/flux-schnell" className="h-9" />
                            </FieldRow>
                          </>
                        )}
                        {settings["image_provider"] === "custom" && (
                          <>
                            <FieldRow label="Custom API URL" helpText="Full URL for your custom image generation API endpoint" status={fieldStatus("image_provider_custom_api_url", false)}>
                              <Input value={settings["image_provider_custom_api_url"] ?? ""} onChange={e => set("image_provider_custom_api_url", e.target.value)} placeholder="https://api.example.com/generate" className="h-9" />
                            </FieldRow>
                            <FieldRow label="Custom API Key" helpText="API key for your custom image generation endpoint (if required)" status={fieldStatus("image_provider_custom_api_key", false)}>
                              <Input type="password" value={settings["image_provider_custom_api_key"] ?? ""} onChange={e => set("image_provider_custom_api_key", e.target.value)} placeholder="Bearer token or API key" className="h-9" />
                            </FieldRow>
                          </>
                        )}

                        {/* Image Aspect Ratio — hidden for manus */}
                        {settings["image_provider"] !== "manus" && settings["image_provider"] !== "none" && settings["image_provider"] && (
                          <FieldRow label="Image Aspect Ratio" helpText="Shape of generated images. Google recommends square (1:1) or landscape (16:9) for best display in search results and Google Discover." status={fieldStatus("image_aspect_ratio", false)}>
                            <Select value={settings["image_aspect_ratio"] ?? "1:1"} onValueChange={v => set("image_aspect_ratio", v)}>
                              <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1:1">1:1 — Square (Google recommended)</SelectItem>
                                <SelectItem value="16:9">16:9 — Landscape</SelectItem>
                                <SelectItem value="9:16">9:16 — Portrait</SelectItem>
                                <SelectItem value="4:3">4:3 — Standard</SelectItem>
                              </SelectContent>
                            </Select>
                          </FieldRow>
                        )}

                        {/* Image LLM System Prompt */}
                        <FieldRow label="Art Direction Persona" helpText="System prompt used by the AI when generating image descriptions from article headlines. Controls the art direction style and persona. Each deployment should customize this to match their niche." status={fieldStatus("image_llm_system_prompt", false)}>
                          <Textarea
                            value={settings["image_llm_system_prompt"] ?? ""}
                            onChange={e => set("image_llm_system_prompt", e.target.value)}
                            placeholder="You are an art director for a professional news publication. Create a concise image generation prompt for an illustration that matches the article's topic. The image should be visually striking and editorially appropriate. Return ONLY the prompt text, under 100 words."
                            rows={5}
                            className="resize-y text-xs"
                          />
                        </FieldRow>

                        {/* Image Style Prompt */}
                        <FieldRow label="Image Style Prompt" helpText="The base style description prepended to every image prompt. Controls the visual look of all generated images." status={fieldStatus("image_style_prompt", false)}>
                          <Textarea
                            value={settings["image_style_prompt"] ?? ""}
                            onChange={e => set("image_style_prompt", e.target.value)}
                            placeholder="Professional editorial illustration, news photography style"
                            rows={4}
                            className="resize-y text-xs"
                          />
                        </FieldRow>

                        {/* Image Style Keywords */}
                        <FieldRow label="Image Style Keywords" helpText="Additional keywords appended after the style prompt. Use for specific visual requirements like 'no text in image' or 'high contrast'." status={fieldStatus("image_style_keywords", false)}>
                          <Textarea
                            value={settings["image_style_keywords"] ?? ""}
                            onChange={e => set("image_style_keywords", e.target.value)}
                            placeholder="Bold colors, exaggerated proportions, no text or words in the image"
                            rows={3}
                            className="resize-y text-xs"
                          />
                        </FieldRow>

                        {/* Fallback to built-in */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 relative">
                            <Label className="text-xs font-medium">Enable Fallback to Built-in</Label>
                            <HelpTip text="If the primary image provider fails, automatically try the built-in Manus provider." />
                          </div>
                          <Switch checked={isOn("image_provider_fallback_enabled", "true")} onCheckedChange={() => toggle("image_provider_fallback_enabled")} />
                        </div>

                        {/* Default Fallback Image */}
                        <FieldRow
                          label="Default Fallback Image"
                          helpText="If image generation fails completely, this image is used as the article's featured image and Open Graph image. Upload a branded placeholder. Recommended: 1200x630px."
                          status={(() => {
                            const v = settings["brand_og_image"];
                            if (!v || v === "/og-image.jpg") return "yellow";
                            return "green";
                          })()}
                        >
                          <div className="space-y-2">
                            <Input
                              value={settings["brand_og_image"] ?? "/og-image.jpg"}
                              onChange={e => set("brand_og_image", e.target.value)}
                              placeholder="/og-image.jpg or https://..."
                              className="h-9"
                            />
                            {settings["brand_og_image"] && (
                              <div className="flex items-start gap-2">
                                <img
                                  src={settings["brand_og_image"]}
                                  alt="Fallback preview"
                                  className="w-20 h-12 object-cover rounded border"
                                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                                {(settings["brand_og_image"] === "/og-image.jpg" || !settings["brand_og_image"]) && (
                                  <p className="text-xs text-yellow-600 dark:text-yellow-400">⚠ Default placeholder — consider uploading a branded fallback image.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </FieldRow>
                      </div>
                    )}
                  </div>
                  <Separator />
                  {/* ── Video Generation ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2"><Video className="w-4 h-4" /> Video Generation</p>
                        <p className="text-xs text-muted-foreground">Auto-generate short video clips for social distribution</p>
                      </div>
                      <Switch checked={isOn("auto_generate_videos")} onCheckedChange={() => toggle("auto_generate_videos")} />
                    </div>
                    {isOn("auto_generate_videos") && (
                      <div className="pl-4 border-l-2 border-primary/20 space-y-3">

                        {/* Video Provider */}
                        <FieldRow
                          label="Video Provider"
                          helpText="Which AI service to use for video generation. Built-in uses platform credits."
                          status={(() => {
                            const v = settings["video_provider"] ?? "manus";
                            return v ? "green" : "red";
                          })()}
                        >
                          <Select value={settings["video_provider"] ?? "manus"} onValueChange={v => set("video_provider", v)}>
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manus">Built-in (Manus)</SelectItem>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="replicate">Replicate (Runway, Kling)</SelectItem>
                              <SelectItem value="custom">Custom API</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>

                        {/* Provider-specific API key fields */}
                        {settings["video_provider"] === "openai" && (
                          <FieldRow label="OpenAI API Key" helpText="developer.openai.com → API Keys" status={fieldStatus("video_provider_openai_api_key", false)}>
                            <Input type="password" value={settings["video_provider_openai_api_key"] ?? ""} onChange={e => set("video_provider_openai_api_key", e.target.value)} placeholder="sk-..." className="h-9" />
                          </FieldRow>
                        )}
                        {settings["video_provider"] === "replicate" && (
                          <>
                            <FieldRow label="Replicate API Key" helpText="replicate.com/account/api-tokens" status={fieldStatus("video_provider_replicate_api_key", false)}>
                              <Input type="password" value={settings["video_provider_replicate_api_key"] ?? ""} onChange={e => set("video_provider_replicate_api_key", e.target.value)} placeholder="r8_..." className="h-9" />
                            </FieldRow>
                            <FieldRow label="Replicate Model" helpText="Model name (e.g., runway/gen-3-lite, kling-ai/kling-v1). Browse at replicate.com/explore" status={fieldStatus("video_provider_replicate_model", false)}>
                              <Input value={settings["video_provider_replicate_model"] ?? "runway/gen-3-lite"} onChange={e => set("video_provider_replicate_model", e.target.value)} placeholder="runway/gen-3-lite" className="h-9" />
                            </FieldRow>
                          </>
                        )}
                        {settings["video_provider"] === "custom" && (
                          <>
                            <FieldRow label="Custom API URL" helpText="Full URL for your custom video generation API endpoint" status={fieldStatus("video_provider_custom_api_url", false)}>
                              <Input value={settings["video_provider_custom_api_url"] ?? ""} onChange={e => set("video_provider_custom_api_url", e.target.value)} placeholder="https://api.example.com/video" className="h-9" />
                            </FieldRow>
                            <FieldRow label="Custom API Key" helpText="API key for your custom video generation endpoint (if required)" status={fieldStatus("video_provider_custom_api_key", false)}>
                              <Input type="password" value={settings["video_provider_custom_api_key"] ?? ""} onChange={e => set("video_provider_custom_api_key", e.target.value)} placeholder="Bearer token or API key" className="h-9" />
                            </FieldRow>
                          </>
                        )}

                        {/* Video Style Prompt */}
                        <FieldRow label="Video Style Prompt" helpText="Style description used for every video generation. The article headline is automatically appended." status={fieldStatus("video_style_prompt", false)}>
                          <Textarea
                            value={settings["video_style_prompt"] ?? ""}
                            onChange={e => set("video_style_prompt", e.target.value)}
                            placeholder="Professional news broadcast style, high production quality, cinematic lighting"
                            rows={4}
                            className="resize-y text-xs"
                          />
                        </FieldRow>

                        {/* Video Duration + Aspect Ratio */}
                        <div className="grid grid-cols-2 gap-3">
                          <FieldRow label="Video Duration (seconds)" helpText="Length of generated videos in seconds (5-60)." status={fieldStatus("video_duration", false)}>
                            <Input type="number" min={5} max={60} value={settings["video_duration"] ?? "5"} onChange={e => set("video_duration", e.target.value)} className="h-9" />
                          </FieldRow>
                          <FieldRow label="Video Aspect Ratio" status={fieldStatus("video_aspect_ratio", false)}>
                            <Select value={settings["video_aspect_ratio"] ?? "16:9"} onValueChange={v => set("video_aspect_ratio", v)}>
                              <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="16:9">16:9 — Landscape</SelectItem>
                                <SelectItem value="9:16">9:16 — Portrait / Stories</SelectItem>
                                <SelectItem value="1:1">1:1 — Square</SelectItem>
                              </SelectContent>
                            </Select>
                          </FieldRow>
                        </div>

                        {/* Fallback to built-in */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 relative">
                            <Label className="text-xs font-medium">Enable Fallback to Built-in</Label>
                            <HelpTip text="If the primary video provider fails, automatically try the built-in Manus provider." />
                          </div>
                          <Switch checked={isOn("video_provider_fallback_enabled", "true")} onCheckedChange={() => toggle("video_provider_fallback_enabled")} />
                        </div>

                      </div>
                    )}
                  </div>


                  <Separator />
                  {/* ── Watermark ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2"><Droplets className="w-4 h-4" /> Image Watermark</p>
                        <p className="text-xs text-muted-foreground">Brand every generated image with your site URL</p>
                      </div>
                      <Switch checked={isOn("watermark_enabled")} onCheckedChange={() => toggle("watermark_enabled")} />
                    </div>
                    {isOn("watermark_enabled") && (
                      <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                        <FieldRow label="Watermark Text" helpText="Text shown in watermark. Leave empty to use your site URL." status={fieldStatus("watermark_text", false)}>
                          <Input
                            value={settings["watermark_text"] ?? (settings["site_url"] ?? "")}
                            onChange={e => set("watermark_text", e.target.value)}
                            placeholder={settings["site_url"] ?? "getjaime.io"}
                            className="h-9"
                          />
                        </FieldRow>

                        <FieldRow label="Watermark Position" status={fieldStatus("watermark_position", false)}>
                          <Select value={settings["watermark_position"] ?? "bottom-right"} onValueChange={v => set("watermark_position", v)}>
                            <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bottom-right">Bottom Right</SelectItem>
                              <SelectItem value="bottom-left">Bottom Left</SelectItem>
                              <SelectItem value="top-right">Top Right</SelectItem>
                              <SelectItem value="top-left">Top Left</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>
                        <FieldRow label={`Background Opacity: ${settings["watermark_bg_opacity"] ?? "60"}%`} helpText="Opacity of watermark background (0-100)" status={fieldStatus("watermark_bg_opacity", false)}>
                          <Slider
                            min={0} max={100} step={5}
                            value={[parseInt(settings["watermark_bg_opacity"] ?? "60", 10)]}
                            onValueChange={([v]) => set("watermark_bg_opacity", String(v))}
                            className="mt-1"
                          />
                        </FieldRow>
                        <div className="grid grid-cols-2 gap-3">
                          <FieldRow label="Font Size" helpText="Base font size for watermark text" status={fieldStatus("watermark_font_size", false)}>
                            <Input type="number" min={8} max={48} value={settings["watermark_font_size"] ?? "16"} onChange={e => set("watermark_font_size", e.target.value)} className="h-9" />
                          </FieldRow>
                          <FieldRow label="Text Color (R,G,B)" helpText="RGB color for watermark text, e.g. 255,255,255 for white" status={fieldStatus("watermark_text_color", false)}>
                            <Input value={settings["watermark_text_color"] ?? "255,255,255"} onChange={e => set("watermark_text_color", e.target.value)} placeholder="255,255,255" className="h-9" />
                          </FieldRow>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />
                  {/* ── Real Image Sourcing ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Real Image Sourcing</p>
                        <p className="text-xs text-muted-foreground">Search Flickr CC, Wikimedia, Unsplash, Pexels, Pixabay for real licensed photos before using AI generation. Default: OFF. Enable for deployments that need real photography (e.g., sports, racing).</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isOn("real_image_sourcing_enabled") ? "text-green-600" : "text-muted-foreground"}`}>
                          {isOn("real_image_sourcing_enabled") ? "On" : "Off"}
                        </span>
                        <Switch checked={isOn("real_image_sourcing_enabled")} onCheckedChange={() => toggle("real_image_sourcing_enabled")} />
                      </div>
                    </div>
                    {isOn("real_image_sourcing_enabled") && (
                      <div className="pl-4 border-l-2 border-primary/20 space-y-3">

                        {/* Relevance Threshold */}
                        <FieldRow
                          label={`Relevance Threshold: ${settings["real_image_relevance_threshold"] ?? "0.4"}`}
                          helpText="Minimum relevance score (0.0–1.0) for a sourced image to be used. Lower = more permissive, higher = stricter match. Recommended: 0.4"
                          status="green"
                        >
                          <Slider
                            min={0.1} max={0.9} step={0.05}
                            value={[parseFloat(settings["real_image_relevance_threshold"] ?? "0.4")]}
                            onValueChange={([v]) => set("real_image_relevance_threshold", String(v))}
                            className="mt-1"
                          />
                        </FieldRow>

                        {/* Fallback Preference */}
                        <FieldRow
                          label="Fallback When No Real Image Found"
                          helpText="What to use when no real image meets the relevance threshold."
                          status="green"
                        >
                          <Select
                            value={settings["real_image_fallback"] ?? "llm"}
                            onValueChange={v => set("real_image_fallback", v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="llm">AI-generated image (LLM)</SelectItem>
                              <SelectItem value="branded_card">Branded title card (no AI)</SelectItem>
                              <SelectItem value="sponsor_card">Sponsor image (article sponsor image)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>

                        {/* API Keys */}
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">API Keys (all free tiers)</div>

                        <FieldRow
                          label="Flickr API Key"
                          helpText="Free at flickr.com/services/api — enables CC-licensed photo search. Highest quality source."
                          status={fieldStatus("real_image_flickr_api_key", false)}
                        >
                          <Input
                            value={settings["real_image_flickr_api_key"] ?? ""}
                            onChange={e => set("real_image_flickr_api_key", e.target.value)}
                            placeholder="Flickr API key"
                            className="h-9 font-mono text-xs"
                          />
                        </FieldRow>

                        <FieldRow
                          label="Unsplash Access Key"
                          helpText="Free at unsplash.com/developers — 50 requests/hour on free tier. High-quality editorial photos."
                          status={fieldStatus("real_image_unsplash_access_key", false)}
                        >
                          <Input
                            value={settings["real_image_unsplash_access_key"] ?? ""}
                            onChange={e => set("real_image_unsplash_access_key", e.target.value)}
                            placeholder="Unsplash access key"
                            className="h-9 font-mono text-xs"
                          />
                        </FieldRow>

                        <FieldRow
                          label="Pexels API Key"
                          helpText="Free at pexels.com/api — 200 requests/hour. Good for lifestyle and business photos."
                          status={fieldStatus("real_image_pexels_api_key", false)}
                        >
                          <Input
                            value={settings["real_image_pexels_api_key"] ?? ""}
                            onChange={e => set("real_image_pexels_api_key", e.target.value)}
                            placeholder="Pexels API key"
                            className="h-9 font-mono text-xs"
                          />
                        </FieldRow>

                        <FieldRow
                          label="Pixabay API Key"
                          helpText="Free at pixabay.com/api/docs — 100 requests/minute. Good volume for fallback."
                          status={fieldStatus("real_image_pixabay_api_key", false)}
                        >
                          <Input
                            value={settings["real_image_pixabay_api_key"] ?? ""}
                            onChange={e => set("real_image_pixabay_api_key", e.target.value)}
                            placeholder="Pixabay API key"
                            className="h-9 font-mono text-xs"
                          />
                        </FieldRow>

                         <p className="text-xs text-muted-foreground">Wikimedia Commons is always searched — no API key required.</p>
                        <div className="pt-2">
                          <a href="/admin/image-licenses" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline underline-offset-2 hover:opacity-80">View Image License Log →</a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Google CSE Image Crawler (v4.9.7) ── */}
                  <div className="rounded-lg border bg-card px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Google Image Crawler</p>
                        <p className="text-xs text-muted-foreground">Use Google Custom Search to find real editorial images. Requires a Google API key + Search Engine ID. Checks image library for reuse before searching. AI validates each candidate before use.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isOn("image_crawler_enabled") ? "text-green-600" : "text-muted-foreground"}`}>
                          {isOn("image_crawler_enabled") ? "On" : "Off"}
                        </span>
                        <Switch checked={isOn("image_crawler_enabled")} onCheckedChange={() => toggle("image_crawler_enabled")} />
                      </div>
                    </div>
                    {isOn("image_crawler_enabled") && (
                      <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                        <FieldRow
                          label="Google Custom Search API Key"
                          helpText="Get free at console.cloud.google.com → Custom Search API. 100 queries/day free."
                          status={fieldStatus("google_cse_api_key", true)}
                        >
                          <Input
                            value={settings["google_cse_api_key"] ?? ""}
                            onChange={e => set("google_cse_api_key", e.target.value)}
                            placeholder="AIza..."
                            className="h-9 font-mono text-xs"
                          />
                        </FieldRow>
                        <FieldRow
                          label="Search Engine ID (cx)"
                          helpText="Create at programmablesearchengine.google.com — enable Image Search, set to search the entire web."
                          status={fieldStatus("google_cse_cx", true)}
                        >
                          <Input
                            value={settings["google_cse_cx"] ?? ""}
                            onChange={e => set("google_cse_cx", e.target.value)}
                            placeholder="1234567890abcdef:xxxxxxxxx"
                            className="h-9 font-mono text-xs"
                          />
                        </FieldRow>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">AI Image Validation</p>
                            <p className="text-xs text-muted-foreground">Run relevance + safety check on each candidate before using it. Recommended: On.</p>
                          </div>
                          <Switch checked={isOn("image_validation_enabled")} onCheckedChange={() => toggle("image_validation_enabled")} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Image Library Reuse</p>
                            <p className="text-xs text-muted-foreground">Check local library for matching images before searching Google. Saves API quota.</p>
                          </div>
                          <Switch checked={isOn("image_library_reuse_enabled")} onCheckedChange={() => toggle("image_library_reuse_enabled")} />
                        </div>
                        {isOn("image_library_reuse_enabled") && (
                          <FieldRow
                            label={`Max Reuse Count: ${settings["image_max_reuse_count"] ?? "3"}`}
                            helpText="Max times a library image can be reused before preferring fresh images. 0 = always fetch new."
                            status="green"
                          >
                            <Slider
                              min={0} max={10} step={1}
                              value={[parseInt(settings["image_max_reuse_count"] ?? "3", 10)]}
                              onValueChange={([v]) => set("image_max_reuse_count", String(v))}
                              className="mt-1"
                            />
                          </FieldRow>
                        )}
                        <div className="pt-2">
                          <a href="/admin/image-sources" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline underline-offset-2 hover:opacity-80">Manage Domain Whitelist/Blacklist →</a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Easter Egg Features ── */}
                  <div className="rounded-lg border bg-card">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          <span>🥚</span> Easter Egg Features
                        </p>
                        <p className="text-xs text-muted-foreground">Fun interactive easter eggs. Delightful but optional.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isOn("easter_eggs_enabled") ? "text-green-600" : "text-muted-foreground"}`}>
                          {isOn("easter_eggs_enabled") ? "On" : "Off"}
                        </span>
                        <Switch checked={isOn("easter_eggs_enabled")} onCheckedChange={() => toggle("easter_eggs_enabled")} />
                      </div>
                    </div>
                    {isOn("easter_eggs_enabled") && (
                      <div className="px-4 pb-4 pt-1 space-y-1 border-t">
                        <p className="text-xs text-muted-foreground">Active: Konami code panel (↑↑↓↓←→←→BA), favicon swap on article pages (45 sec).</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* ── Screen 4: Article Categories ────────────────────────── */}
              {currentScreen.id === "categories" && (
                <CategoriesScreen
                  categories={categoriesData ?? []}
                  settings={settings}
                  onToggle={toggle}
                  onCreate={async (name, slug, color, description) => {
                    await createCategoryMutation.mutateAsync({ name, slug, color, description });
                  }}
                  onUpdate={async (id, data) => {
                    await updateCategoryMutation.mutateAsync({ id, ...data });
                  }}
                  onDelete={async (id) => {
                    await deleteCategoryMutation.mutateAsync({ id });
                  }}
                  onRecategorize={async () => {
                    return await recategorizeMutation.mutateAsync();
                  }}
                />
              )}


              {/* ── Screen 5: Content Sources ──────────────────────────────── */}
              {currentScreen.id === "sources" && (
                <ContentSourcesScreen
                  settings={settings}
                  set={set}
                  isOn={isOn}
                  toggle={toggle}
                  fieldStatus={fieldStatus}
                />
              )}

              {/* ── Screen 6: Social Media ─────────────────────────────── */}
              {currentScreen.id === "social" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    Connect your social media accounts to enable automatic article distribution. Enable each platform you want to use, then enter credentials. At least one platform must be enabled to proceed.
                  </div>

                  {/* X / Twitter — special: may use env vars */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platforms</p>
                    {PLATFORM_FORMS.map(form => (
                      <PlatformCard
                        key={form.platform}
                        form={form}
                        existingCreds={platformCreds[form.platform]}
                        enabled={isOn(`dist_enabled_${form.platform}`) || (form.platform === "x" && xEnvConfigured)}
                        onToggleEnabled={() => toggle(`dist_enabled_${form.platform}`)}
                        onProfileChange={(key, value) => set(key, value)}
                        profileValues={settings}
                        onSuccess={() => refetchWizard()}
                        xEnvConfigured={xEnvConfigured}
                      />
                    ))}
                  </div>

                  {/* Posting schedule controls */}
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posting Schedule</p>
                    <FieldRow label="X Post Interval (minutes)" helpText="Minimum minutes between X posts. Prevents rate-limit errors." status={fieldStatus("x_post_interval_minutes", false)}>
                      <Input type="number" min={1} value={settings["x_post_interval_minutes"] ?? "45"} onChange={e => set("x_post_interval_minutes", e.target.value)} className="h-9 w-32" />
                    </FieldRow>
                    <FieldRow label="X Daily Post Limit" helpText="Maximum X posts per day across all types. X free tier allows ~50/day." status={fieldStatus("x_daily_post_limit", false)}>
                      <Input type="number" min={1} value={settings["x_daily_post_limit"] ?? "25"} onChange={e => set("x_daily_post_limit", e.target.value)} className="h-9 w-32" />
                    </FieldRow>
                  </div>
                </div>
              )}

              {/* ── Screen 8: SEO & Indexing ─────────────────────────────── */}
              {currentScreen.id === "seo" && (
                <div className="space-y-4">
                  {/* Site URL — only show if not already set via env var */}
                  {!envStatus?.SITE_URL && (
                    <FieldRow label="Site URL" helpText="Your full domain including https://. Used in all canonical URLs, sitemaps, and OG tags." status={fieldStatus("site_url")}>
                      <Input value={settings["site_url"] ?? ""} onChange={e => set("site_url", e.target.value)} placeholder="https://www.yoursite.com" className="h-9 font-mono" />
                    </FieldRow>
                  )}
                  {envStatus?.SITE_URL && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-xs text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span><strong>SITE_URL</strong> is configured as a server environment variable: <code className="font-mono">{envStatus.SITE_URL_VALUE}</code></span>
                    </div>
                  )}
                  <Separator />
                  {/* SEO Meta */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SEO Meta</p>
                  <FieldRow label="SEO Keywords" helpText="Comma-separated keywords for meta tags. Used in the site-wide meta keywords tag." status={fieldStatus("brand_seo_keywords", false)}>
                    <Input value={settings["brand_seo_keywords"] ?? ""} onChange={e => set("brand_seo_keywords", e.target.value)} placeholder="satire, news, comedy, politics, humor" className="h-9" />
                  </FieldRow>
                  <FieldRow label="Default OG Image URL" helpText="Fallback Open Graph image for pages without a featured image. Should be 1200×630px." status={fieldStatus("brand_og_image", false)}>
                    <Input value={settings["brand_og_image"] ?? ""} onChange={e => set("brand_og_image", e.target.value)} placeholder="https://yoursite.com/og-image.jpg" className="h-9 font-mono text-xs" />
                  </FieldRow>
                  <Separator />
                  {/* Google Search Console */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Google Search Console</p>
                  {envStatus?.GSC_CLIENT_ID && envStatus?.GSC_CLIENT_SECRET && envStatus?.GSC_REFRESH_TOKEN ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-xs text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>GSC OAuth credentials are configured. Property: <code className="font-mono">{envStatus.GSC_SITE_IDENTIFIER || "(not set)"}</code></span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>GSC OAuth credentials (<code>GSC_CLIENT_ID</code>, <code>GSC_CLIENT_SECRET</code>, <code>GSC_REFRESH_TOKEN</code>) are not set. Add them in the Secrets panel to enable GSC integration.</div>
                    </div>
                  )}
                  <FieldRow label="GSC Property URL" helpText="The exact property URL in Google Search Console (must match exactly, including trailing slash if present)." status={fieldStatus("gsc_site_url", false)}>
                    <Input value={settings["gsc_site_url"] ?? ""} onChange={e => set("gsc_site_url", e.target.value)} placeholder="https://www.yoursite.com/" className="h-9 font-mono text-xs" />
                  </FieldRow>
                  <Separator />
                  {/* IndexNow & Bing */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IndexNow & Bing</p>
                  {envStatus?.INDEXNOW_KEY ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-xs text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span><strong>INDEXNOW_KEY</strong> is configured as a server environment variable. Instant indexing is active.</span>
                    </div>
                  ) : (
                    <FieldRow label="IndexNow Key" helpText="A unique key you generate (any random string). Must also be placed at yoursite.com/{key}.txt. Used for instant indexing on Bing, Yandex, and others." status={fieldStatus("indexnow_key", false)}>
                      <Input value={settings["indexnow_key"] ?? ""} onChange={e => set("indexnow_key", e.target.value)} placeholder="a1b2c3d4e5f6..." className="h-9 font-mono" />
                    </FieldRow>
                  )}
                  {envStatus?.BING_WEBMASTER_API_KEY ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-xs text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span><strong>BING_WEBMASTER_API_KEY</strong> is configured as a server environment variable.</span>
                    </div>
                  ) : (
                    <FieldRow label="Bing Webmaster API Key" helpText="From bing.com/webmasters → Settings → API Access → API Key" status={fieldStatus("bing_api_key", false)}>
                      <Input type="password" value={settings["bing_api_key"] ?? ""} onChange={e => set("bing_api_key", e.target.value)} placeholder="••••••••••••••••••••••••••••••••" className="h-9 font-mono text-xs" />
                    </FieldRow>
                  )}
                  <Separator />
                  {/* Analytics */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analytics</p>
                  <FieldRow label="Google Analytics / Ads Tag ID" helpText="Your GA4 measurement ID (G-XXXXXXXX) or Google Ads conversion ID (AW-XXXXXXXXX). Leave blank to disable. Each deployment must use its own ID." status={fieldStatus("brand_gtag_id", false)}>
                    <Input value={settings["brand_gtag_id"] ?? ""} onChange={e => set("brand_gtag_id", e.target.value)} placeholder="G-XXXXXXXXXX or AW-XXXXXXXXX" className="h-9 font-mono text-xs" />
                  </FieldRow>
                  <FieldRow label="Microsoft Clarity Project ID" helpText="Your Clarity project ID from clarity.microsoft.com. Enables session recordings and heatmaps. Leave blank to disable. Each deployment must use its own ID." status={fieldStatus("brand_clarity_id", false)}>
                    <Input value={settings["brand_clarity_id"] ?? ""} onChange={e => set("brand_clarity_id", e.target.value)} placeholder="abc123xyz" className="h-9 font-mono text-xs" />
                  </FieldRow>
                </div>
              )}

              {/* ── Screen 9: Production Engine ───────────────────────────── */}
              {currentScreen.id === "production" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Production Engine</h3>
                    <p className="text-xs text-muted-foreground">Configure the pool-drain model: how often the engine runs, how many articles it generates per tick, and the safety cap that prevents runaway costs.</p>
                  </div>
                  <Separator />

                  {/* Enable / Mode */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Loop Control</p>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Continuous Production Loop</p>
                      <p className="text-xs text-muted-foreground">Drain the candidate pool throughout the day instead of waiting for scheduled batch runs.</p>
                    </div>
                    <Switch
                      checked={settings["production_loop_enabled"] !== "false"}
                      onCheckedChange={v => set("production_loop_enabled", v ? "true" : "false")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Production Mode</Label>
                      <Select
                        value={settings["production_mode"] ?? "hybrid"}
                        onValueChange={v => set("production_mode", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hybrid">Hybrid (loop + scheduled runs)</SelectItem>
                          <SelectItem value="continuous">Continuous (loop only)</SelectItem>
                          <SelectItem value="legacy">Legacy (scheduled runs only)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">hybrid = both; continuous = loop only; legacy = scheduled only</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Loop Interval (minutes)</Label>
                      <Input
                        type="number" min={1} max={60}
                        value={settings["production_interval_minutes"] ?? "15"}
                        onChange={e => set("production_interval_minutes", e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">How often the loop runs. Default: 15. Range: 1–60.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Safety cap */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Safety Cap</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Daily Articles</Label>
                      <Input
                        type="number" min={1}
                        value={settings["max_daily_articles"] ?? "500"}
                        onChange={e => set("max_daily_articles", e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">Hard daily ceiling — emergency brake. Default: 500.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Min Candidate Pool Size (alert)</Label>
                      <Input
                        type="number" min={0}
                        value={settings["pool_min_size"] ?? "10"}
                        onChange={e => set("pool_min_size", e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">CEO dashboard warns when pool drops below this. Default: 10.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Batch sizes */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Batch Sizes per Loop Tick</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max High-Potential Articles</Label>
                      <Input
                        type="number" min={0}
                        value={settings["max_batch_high"] ?? "25"}
                        onChange={e => set("max_batch_high", e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">Max articles from the high-score pool per tick. Default: 25.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Medium-Potential Articles</Label>
                      <Input
                        type="number" min={0}
                        value={settings["max_batch_medium"] ?? "10"}
                        onChange={e => set("max_batch_medium", e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">Max articles from the medium-score pool per tick. Default: 10.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Scoring thresholds */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scoring Thresholds</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">High Threshold (≥)</Label>
                      <Input
                        type="number" min={0} max={1} step={0.05}
                        value={settings["score_high_threshold"] ?? "0.7"}
                        onChange={e => set("score_high_threshold", e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">Score ≥ this = high potential. Default: 0.7.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Medium Threshold (≥)</Label>
                      <Input
                        type="number" min={0} max={1} step={0.05}
                        value={settings["min_score_threshold"] ?? "0.4"}
                        onChange={e => set("min_score_threshold", e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">Score ≥ this = medium potential. Default: 0.4.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Min Score to Publish</Label>
                      <Input
                        type="number" min={0} max={1} step={0.05}
                        value={settings["min_score_to_publish"] ?? "0.3"}
                        onChange={e => set("min_score_to_publish", e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">Candidates below this are skipped. Default: 0.3.</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                    <strong>Tip:</strong> Start with defaults. After 24–48 hours of live data, check the Candidate Pool page to see the high/medium/low distribution and tune thresholds accordingly.
                  </div>
                </div>
              )}

              {/* ── Screen 11: Review & Launch ────────────────────────────── */}
              {currentScreen.id === "review" && (() => {
                // ── Progress calculation ─────────────────────────────────────
                // Required fields (always count)
                const requiredChecks = [
                  { ok: !!settings["brand_site_name"]?.trim(), label: "Publication name" },
                  { ok: !!settings["brand_tagline"]?.trim(), label: "Tagline" },
                  { ok: !!settings["brand_contact_email"]?.trim(), label: "Contact email" },
                  { ok: !!(settings["site_url"]?.trim() || envStatus?.SITE_URL), label: "Site URL" },
                  { ok: !!settings["article_llm_system_prompt"]?.trim(), label: "AI voice instructions" },
                  { ok: (categoriesData?.length ?? 0) >= 3, label: "Content categories (≥3)" },
                  { ok: rssFeedCount > 0 || settings["use_google_news"] === "true", label: "Content source (RSS or Google News)" },
                  { ok: !!settings["articles_per_batch"]?.trim() && !!settings["schedule_runs_per_day"]?.trim(), label: "Publishing schedule" },
                ];
                // Conditional fields (only count if the feature is enabled)
                const conditionalChecks = [
                  // X: enabled via env or dist_enabled_x=true AND (env creds OR DB creds)
                  { enabled: isOn("dist_enabled_x") || xEnvConfigured,
                    ok: xEnvConfigured || !!(platformCreds["x"] && Object.values(platformCreds["x"]).some(v => v?.trim())),
                    label: "X credentials" },
                  // Newsletter: only if enabled
                  { enabled: isOn("newsletter_enabled"),
                    ok: !!(envStatus?.RESEND_API_KEY || settings["resend_api_key"]?.trim()),
                    label: "Resend API key" },
                  // SMS: only if enabled
                  { enabled: isOn("sms_enabled"),
                    ok: !!(settings["twilio_account_sid"]?.trim() && settings["twilio_auth_token"]?.trim()),
                    label: "Twilio credentials" },
                  // Merch: only if enabled
                  { enabled: isOn("merch_enabled"),
                    ok: !!settings["printify_api_key"]?.trim(),
                    label: "Printify API key" },
                  // AdSense: only if enabled
                  { enabled: isOn("adsense_enabled"),
                    ok: !!settings["adsense_publisher_id"]?.trim(),
                    label: "AdSense publisher ID" },
                ];
                const activeConditional = conditionalChecks.filter(c => c.enabled);
                const totalChecks = requiredChecks.length + activeConditional.length;
                const passedChecks = requiredChecks.filter(c => c.ok).length + activeConditional.filter(c => c.ok).length;
                const progressPct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

                // ── Needs Attention (critical blockers only) ─────────────────
                const critical: { label: string; screen: number }[] = [];
                if (!settings["brand_site_name"]?.trim()) critical.push({ label: "Publication name not set", screen: 0 });
                if (!settings["brand_contact_email"]?.trim()) critical.push({ label: "Contact email not set (CAN-SPAM required)", screen: 0 });
                if (!settings["article_llm_system_prompt"]?.trim()) critical.push({ label: "Content generation prompt not set — articles will use default voice", screen: 1 });
                if (!settings["site_url"]?.trim() && !envStatus?.SITE_URL) critical.push({ label: "Canonical domain not set — SEO will be broken", screen: 5 });
                if ((categoriesData?.length ?? 0) === 0) critical.push({ label: "No content categories configured", screen: 3 });
                if (rssFeedCount === 0 && settings["use_google_news"] !== "true") critical.push({ label: "No content source — add RSS feeds or enable Google News", screen: 4 });
                if (!settings["articles_per_batch"]?.trim()) critical.push({ label: "Articles per batch not set", screen: 1 });
                if (!settings["schedule_runs_per_day"]?.trim()) critical.push({ label: "Runs per day not set", screen: 6 });

                // ── Screen summary data ──────────────────────────────────────
                const screenSummaries: { id: string; title: string; icon: React.ElementType; detail: string; status: StatusDot }[] = [
                  {
                    id: "brand", title: "Brand & Identity", icon: Palette,
                    detail: settings["brand_site_name"] ? `${settings["brand_site_name"]}${settings["brand_tagline"] ? " — " + settings["brand_tagline"] : ""}` : "Not configured",
                    status: screenCompletionStatus("brand"),
                  },
                  {
                    id: "content", title: "Content Engine", icon: Newspaper,
                    detail: (() => {
                      const batchSize = parseInt(settings["articles_per_batch"] ?? "0");
                      const prompt = settings["article_llm_system_prompt"]?.trim();
                      return batchSize ? `${batchSize} articles/batch${prompt ? " · Voice set" : " · No voice"}` : prompt ? "Voice set" : "Not configured";
                    })(),
                    status: screenCompletionStatus("content"),
                  },
                  {
                    id: "media", title: "Image & Video", icon: Camera,
                    detail: (() => {
                      const imgProvider = settings["image_provider"] ?? "none";
                      const vidEnabled = isOn("auto_generate_videos");
                      const imgLabel = imgProvider === "none" ? "Images off" : imgProvider === "manus" ? "Built-in images" : `Images: ${imgProvider}`;
                      return vidEnabled ? `${imgLabel} · Video on` : imgLabel;
                    })(),
                    status: screenCompletionStatus("media"),
                  },
                  {
                    id: "categories", title: "Article Categories", icon: Zap,
                    detail: (() => {
                      const count = categoriesData?.length ?? 0;
                      return count > 0 ? `${count} categor${count !== 1 ? "ies" : "y"} configured` : "No categories";
                    })(),
                    status: screenCompletionStatus("categories"),
                  },
                  {
                    id: "sources", title: "Content Sources", icon: Globe,
                    detail: (() => {
                      const parts: string[] = [];
                      if (rssFeedCount > 0) parts.push(`${rssFeedCount} RSS feed${rssFeedCount !== 1 ? "s" : ""}`);
                      if (settings["use_google_news"] === "true") parts.push("Google News");
                      if (isOn("x_listener_enabled")) parts.push("X Listener");
                      if (isOn("reddit_listener_enabled")) parts.push("Reddit");
                      return parts.length > 0 ? parts.join(" · ") : "No sources configured";
                    })(),
                    status: screenCompletionStatus("sources"),
                  },
                  {
                    id: "seo", title: "SEO & Analytics", icon: Search,
                    detail: (() => {
                      const siteUrl = settings["site_url"] || (envStatus?.SITE_URL ? envStatus.SITE_URL_VALUE : "");
                      const gsc = envStatus?.GSC_CLIENT_ID && envStatus?.GSC_CLIENT_SECRET && envStatus?.GSC_REFRESH_TOKEN;
                      const indexnow = !!(envStatus?.INDEXNOW_KEY || settings["indexnow_key"]?.trim());
                      const parts: string[] = [];
                      if (siteUrl) parts.push(siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""));
                      if (gsc) parts.push("GSC");
                      if (indexnow) parts.push("IndexNow");
                      return parts.length > 0 ? parts.join(" · ") : "Not configured";
                    })(),
                    status: screenCompletionStatus("seo"),
                  },
                  {
                    id: "production", title: "Production Engine", icon: Cpu,
                    detail: (() => {
                      const runs = parseInt(settings["schedule_runs_per_day"] ?? "0");
                      const batchSize = parseInt(settings["articles_per_batch"] ?? "0");
                      const daily = batchSize && runs ? batchSize * runs : 0;
                      const loopEnabled = settings["production_loop_enabled"] !== "false";
                      const parts: string[] = [];
                      if (daily) parts.push(`~${daily} articles/day`);
                      if (loopEnabled) parts.push("Loop on");
                      const xEnabled = xEnvConfigured || settings["dist_enabled_x"] === "true";
                      if (xEnabled) parts.push("X enabled");
                      return parts.length > 0 ? parts.join(" · ") : "Not configured";
                    })(),
                    status: screenCompletionStatus("production"),
                  },
                ];

                return (
                  <div className="space-y-5">
                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Setup Progress</span>
                        <span className={`font-bold ${progressPct >= 80 ? "text-green-600 dark:text-green-400" : progressPct >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                      <p className="text-xs text-muted-foreground">{passedChecks} of {totalChecks} checks passing</p>
                    </div>

                    {/* NEEDS ATTENTION */}
                    {critical.length > 0 && (
                      <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                        <div className="bg-red-50 dark:bg-red-950/30 px-4 py-2.5 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Needs Attention ({critical.length})</p>
                        </div>
                        <div className="divide-y divide-red-100 dark:divide-red-900">
                          {critical.map((item, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5">
                              <p className="text-sm text-red-700 dark:text-red-300">{item.label}</p>
                              <Button size="sm" variant="ghost" onClick={() => setScreen(item.screen)} className="text-xs h-7 text-red-600 hover:text-red-700">
                                Fix <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {critical.length === 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">All critical checks passing — you're ready to launch.</p>
                      </div>
                    )}

                    {/* 9 Summary cards */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {screenSummaries.map((s) => {
                        const SIcon = s.icon;
                        const screenIdx = SCREENS.findIndex(sc => sc.id === s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => screenIdx >= 0 && setScreen(screenIdx)}
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left w-full"
                          >
                            <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
                              <SIcon className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">{s.title}</p>
                                <StatusIndicator status={s.status} label={s.status === "green" ? "Ready" : s.status === "yellow" ? "Partial" : s.status === "gray" ? "Optional" : "Incomplete"} />
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{s.detail}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Launch */}
                    <div className="flex flex-col items-center gap-3 pt-2 border-t">
                      <Button
                        size="lg"
                        className="w-full max-w-sm"
                        disabled={completeLaunchMutation.isPending}
                        onClick={async () => {
                          try {
                            await completeLaunchMutation.mutateAsync();
                            toast.success("🚀 Setup complete! Your publication is live.");
                            setView("dashboard");
                          } catch {
                            toast.error("Failed to save launch state — check your connection.");
                          }
                        }}
                      >
                        {completeLaunchMutation.isPending
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Launching…</>
                          : <><Rocket className="w-4 h-4 mr-2" /> Launch Publication</>}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Saves your configuration and marks setup complete. You can return to any screen at any time.
                      </p>
                    </div>
                  </div>
                );
              })()}

            </CardContent>
          </Card>

          {/* Sticky bottom bar: Save + Prev/Next navigation */}
          <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t pt-3 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-t-0 sm:pt-0 sm:pb-0">
            {currentScreen.id !== "review" && (
              <div className="mb-2 sm:mb-0">
                <Button onClick={saveCurrentScreen} disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save {currentScreen.title}
                </Button>
              </div>
            )}
            <div className="flex justify-between mt-2">
              <Button variant="outline" onClick={() => setScreen(s => Math.max(0, s - 1))} disabled={isFirst}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              {!isLast ? (
                <Button onClick={() => setScreen(s => Math.min(SCREENS.length - 1, s + 1))}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Dashboard view ───────────────────────────────────────────────────────────
  const percent = summary?.percent ?? 0;
  const completed = summary?.completed ?? 0;
  const total = summary?.total ?? 0;
  const requiredCompleted = summary?.requiredCompleted ?? 0;
  const required = summary?.required ?? 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Setup Checklist</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {required > 0 && requiredCompleted < required
                ? `${required - requiredCompleted} required item${required - requiredCompleted !== 1 ? "s" : ""} remaining`
                : total > 0 ? "All required items complete" : "Track your deployment configuration progress"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchSummary(); refetchChecklist(); }}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={() => { setScreen(0); setView("wizard"); }}>
              <Rocket className="w-4 h-4 mr-1" /> Open Wizard
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Overall Progress</p>
                <p className="text-xs text-muted-foreground">{completed} of {total} items complete</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{percent}%</p>
                <p className="text-xs text-muted-foreground">{requiredCompleted}/{required} required</p>
              </div>
            </div>
            <Progress value={percent} className="h-3" />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {SCREENS.slice(0, -1).map((s, idx) => {
            const SIcon = s.icon;
            const sectionData = summary?.sections?.[s.id];
            const sTotal = sectionData?.total ?? 0;
            const sCompleted = sectionData?.completed ?? 0;
            const sPercent = sTotal > 0 ? Math.round((sCompleted / sTotal) * 100) : 0;
            const allDone = sTotal > 0 && sCompleted === sTotal;
            return (
              <Card
                key={s.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${allDone ? "border-green-200 dark:border-green-800" : ""}`}
                onClick={() => { setScreen(idx); setView("wizard"); }}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${allDone ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                      {allDone ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <SIcon className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{s.title}</p>
                        {sTotal > 0 && <span className="text-xs text-muted-foreground">{sCompleted}/{sTotal}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>
                      {sTotal > 0 && <Progress value={sPercent} className="h-1.5 mt-2" />}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Full checklist */}
        {checklist && checklist.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Checklist Items</CardTitle>
              <CardDescription>Click any item to toggle completion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(
                  checklist.reduce((acc, item) => {
                    const sec = item.section ?? "other";
                    if (!acc[sec]) acc[sec] = [];
                    acc[sec].push(item);
                    return acc;
                  }, {} as Record<string, typeof checklist>)
                ).map(([section, items]) => (
                  <div key={section}>
                    <div className="flex items-center gap-2 py-2">
                      <Separator className="flex-1" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">{section}</span>
                      <Separator className="flex-1" />
                    </div>
                    {items.map(item => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (item.completedAt) uncompleteMutation.mutate({ key: item.key });
                          else completeMutation.mutate({ key: item.key });
                        }}
                      >
                        {item.completedAt
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${item.completedAt ? "line-through text-muted-foreground" : ""}`}>{item.label}</p>
                        </div>
                        {item.isRequired && !item.completedAt && (
                          <Badge variant="outline" className="text-xs shrink-0 border-red-300 text-red-600">Required</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
