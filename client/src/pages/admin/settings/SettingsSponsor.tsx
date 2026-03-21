import { useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, Palette, Image, Upload, Calendar, FlaskConical, Link as LinkIcon } from "lucide-react";

// ─── Color picker field ────────────────────────────────────────────────────────
function ColorField({
  label,
  settingKey,
  description,
  value,
  onChange,
}: {
  label: string;
  settingKey: string;
  description: string;
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(settingKey, e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
          title={label}
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(settingKey, e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className="w-28 px-3 py-2 border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div
          className="h-9 w-9 rounded border border-border flex-shrink-0"
          style={{ backgroundColor: value || "transparent" }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ─── Image URL field with S3 upload button ────────────────────────────────────
function ImageUrlField({
  label,
  settingKey,
  description,
  value,
  uploadType,
  onChange,
}: {
  label: string;
  settingKey: string;
  description: string;
  value: string;
  uploadType: "sponsor_bar" | "article_sponsor";
  onChange: (key: string, val: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/branding/upload?type=${uploadType}`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const { url } = await res.json();
      onChange(settingKey, url);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <input
          type="url"
          value={value || ""}
          onChange={(e) => onChange(settingKey, e.target.value)}
          placeholder="https://cdn.example.com/sponsor-banner.png"
          className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}
      <p className="text-xs text-muted-foreground">{description}</p>
      {value && (
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Image preview:</p>
          <img
            src={value}
            alt="Sponsor image preview"
            className="max-h-16 max-w-full object-contain rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsSponsor() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();

  if (isLoading)
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );

  // ── Sponsor Bar preview values ──
  const barBg = edits.sponsor_bar_bg_color || "#F0F0F0";
  const barBorder = edits.sponsor_bar_border_color || "#D0D0D0";
  const barLabelColor = edits.sponsor_bar_label_color || "#525252";
  const barLinkColor = edits.sponsor_bar_link_color || "#9B1830";
  const barLabel = edits.sponsor_bar_label || "Today's Sponsor";
  const barCta = edits.sponsor_bar_cta || "Learn More";
  const barImageUrl = edits.sponsor_bar_image_url || "";

  // ── Article Sponsor Banner preview values ──
  const bannerBg = edits.article_sponsor_bg_color || "#FFFFFF";
  const bannerBorder = edits.article_sponsor_border_color || "#D0D0D0";
  const bannerHeaderBg = edits.article_sponsor_header_bg_color || "#F0F0F0";
  const bannerCtaBg = edits.article_sponsor_cta_bg_color || "#C41E3A";
  const bannerCtaText = edits.article_sponsor_cta_text_color || "#FFFFFF";
  const bannerLabel = edits.article_sponsor_label || "Sponsored";
  const bannerCta = edits.article_sponsor_cta || "Learn More";
  const bannerDescription = edits.article_sponsor_description || "";
  const bannerImageUrl = edits.article_sponsor_image_url || "";
  // ── Variant B preview values ──
  const bBg = edits.article_sponsor_b_bg_color || "#FFFFFF";
  const bBorder = edits.article_sponsor_b_border_color || "#D0D0D0";
  const bHeaderBg = edits.article_sponsor_b_header_bg_color || "#F0F0F0";
  const bCtaBg = edits.article_sponsor_b_cta_bg_color || "#C41E3A";
  const bCtaText = edits.article_sponsor_b_cta_text_color || "#FFFFFF";
  const bLabel = edits.article_sponsor_b_label || "Sponsored";
  const bCta = edits.article_sponsor_b_cta || "Learn More";
  const bDescription = edits.article_sponsor_b_description || "";
  const bImageUrl = edits.article_sponsor_b_image_url || "";

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Sponsor Settings"
        description="Configure the sponsor bar and article sponsor banner for monetization."
        icon={<Megaphone className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1 — SPONSOR BAR
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-1">Sponsor Bar</h2>
          <p className="text-sm text-muted-foreground mb-4">
            A slim strip shown below the navbar on article, homepage, and category pages.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: settings */}
            <div className="space-y-6">
              {/* Basic settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Settings</CardTitle>
                  <CardDescription>
                    Enable the bar and set the destination URL, label, and CTA text.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Enable Sponsor Bar</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Show the sponsor strip on article, homepage, and category pages
                      </p>
                    </div>
                    <Switch
                      checked={edits.sponsor_bar_enabled === "true"}
                      onCheckedChange={(checked) =>
                        updateEdit("sponsor_bar_enabled", checked ? "true" : "false")
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sponsor URL</label>
                    <input
                      type="url"
                      value={edits.sponsor_bar_url || ""}
                      onChange={(e) => updateEdit("sponsor_bar_url", e.target.value)}
                      placeholder="https://adsterra.com/your-smartlink"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Adsterra Smartlink or any sponsor destination URL. Clicks are tracked before redirect.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Label Text</label>
                    <input
                      type="text"
                      value={edits.sponsor_bar_label || ""}
                      onChange={(e) => updateEdit("sponsor_bar_label", e.target.value)}
                      placeholder="Today's Sponsor"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Small uppercase label shown before the CTA link. Ignored when an image is set.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">CTA Text</label>
                    <input
                      type="text"
                      value={edits.sponsor_bar_cta || ""}
                      onChange={(e) => updateEdit("sponsor_bar_cta", e.target.value)}
                      placeholder="Learn More"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Clickable link text (e.g., "Learn More", "Visit Site"). Ignored when an image is set.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Image sponsor */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Image Sponsor</CardTitle>
                  </div>
                  <CardDescription>
                    Upload or paste a direct image URL to display a sponsor image instead of label+CTA text.
                    The image will be clickable and link to the Sponsor URL above.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUrlField
                    label="Sponsor Bar Image"
                    settingKey="sponsor_bar_image_url"
                    description="Recommended size: 728×30 px (leaderboard) or 468×30 px (banner). Leave blank to use text mode."
                    value={edits.sponsor_bar_image_url || ""}
                    uploadType="sponsor_bar"
                    onChange={updateEdit}
                  />
                </CardContent>
              </Card>

              {/* Colors */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Colors</CardTitle>
                  </div>
                  <CardDescription>
                    Customize the sponsor bar colors to match your brand.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ColorField
                    label="Background Color"
                    settingKey="sponsor_bar_bg_color"
                    description="Background fill of the sponsor strip."
                    value={edits.sponsor_bar_bg_color || "#F0F0F0"}
                    onChange={updateEdit}
                  />
                  <ColorField
                    label="Border Color"
                    settingKey="sponsor_bar_border_color"
                    description="Bottom border line of the sponsor strip."
                    value={edits.sponsor_bar_border_color || "#D0D0D0"}
                    onChange={updateEdit}
                  />
                  <ColorField
                    label="Label Text Color"
                    settingKey="sponsor_bar_label_color"
                    description={`Color of the small uppercase label (e.g., "Today's Sponsor").`}
                    value={edits.sponsor_bar_label_color || "#525252"}
                    onChange={updateEdit}
                  />
                  <ColorField
                    label="Link / CTA Color"
                    settingKey="sponsor_bar_link_color"
                    description="Color of the clickable CTA link text."
                    value={edits.sponsor_bar_link_color || "#9B1830"}
                    onChange={updateEdit}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: preview */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-base">Live Preview — Sponsor Bar</CardTitle>
                  <CardDescription>Updates as you change settings — no save required.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div
                      className="w-full text-center py-1.5 px-4 text-xs"
                      style={{
                        backgroundColor: barBg,
                        borderBottom: `1px solid ${barBorder}`,
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      {barImageUrl ? (
                        <img
                          src={barImageUrl}
                          alt="Sponsor"
                          className="inline-block max-h-8 max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <>
                          <span
                            className="uppercase tracking-widest mr-2 font-semibold"
                            style={{ color: barLabelColor, fontSize: "10px" }}
                          >
                            {barLabel}
                          </span>
                          <span className="font-medium" style={{ color: barLinkColor }}>
                            {barCta} →
                          </span>
                        </>
                      )}
                    </div>
                    <div className="p-4 text-xs text-muted-foreground text-center bg-background">
                      ↑ This strip appears below the navbar on all public pages
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      barImageUrl
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    <p className="font-medium mb-1">
                      {barImageUrl ? "🖼 Image mode active" : "✏️ Text mode active"}
                    </p>
                    <p>
                      {barImageUrl
                        ? "The sponsor image is displayed. Label and CTA text are hidden."
                        : "Label and CTA text are displayed. Upload or paste an image URL above to switch to image mode."}
                    </p>
                  </div>

                  <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground">
                    <p className="font-medium mb-1 text-foreground">How it works</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Bar is hidden until "Enable" is on and a Sponsor URL is set</li>
                      <li>
                        Clicks go to{" "}
                        <code className="bg-muted px-1 rounded">/api/go/sponsor</code> which logs the
                        click then redirects
                      </li>
                      <li>Click counts appear in CEO Dashboard §7 Financial Summary</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1b — SPONSOR BAR SCHEDULING
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border pt-8 mb-8">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Sponsor Bar Scheduling
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set a start and/or end datetime for the sponsor bar. Outside the window, the bar is automatically hidden even if enabled.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active From</CardTitle>
                <CardDescription className="text-xs">Leave blank for no start restriction.</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="datetime-local"
                  value={edits.sponsor_bar_active_from || ""}
                  onChange={(e) => updateEdit("sponsor_bar_active_from", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Sponsor bar goes live at this time (local timezone).</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active Until</CardTitle>
                <CardDescription className="text-xs">Leave blank for no end restriction.</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="datetime-local"
                  value={edits.sponsor_bar_active_until || ""}
                  onChange={(e) => updateEdit("sponsor_bar_active_until", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Sponsor bar auto-hides after this time.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — ARTICLE SPONSOR BANNER
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border pt-8">
          <h2 className="text-lg font-semibold mb-1">Article Sponsor Banner</h2>
          <p className="text-sm text-muted-foreground mb-4">
            A full-width banner shown below article content and above share buttons.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: settings */}
            <div className="space-y-6">
              {/* Basic settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Settings</CardTitle>
                  <CardDescription>
                    Enable the banner and configure the destination URL, label, CTA, and optional description.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Enable Article Sponsor Banner</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Show the sponsor banner below article content on all article pages
                      </p>
                    </div>
                    <Switch
                      checked={edits.article_sponsor_enabled === "true"}
                      onCheckedChange={(checked) =>
                        updateEdit("article_sponsor_enabled", checked ? "true" : "false")
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sponsor URL</label>
                    <input
                      type="url"
                      value={edits.article_sponsor_url || ""}
                      onChange={(e) => updateEdit("article_sponsor_url", e.target.value)}
                      placeholder="https://adsterra.com/your-smartlink"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Destination URL for the article sponsor. Clicks are tracked before redirect.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Label Text</label>
                    <input
                      type="text"
                      value={edits.article_sponsor_label || ""}
                      onChange={(e) => updateEdit("article_sponsor_label", e.target.value)}
                      placeholder="Sponsored"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Small uppercase label shown in the banner header strip.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">CTA Button Text</label>
                    <input
                      type="text"
                      value={edits.article_sponsor_cta || ""}
                      onChange={(e) => updateEdit("article_sponsor_cta", e.target.value)}
                      placeholder="Learn More"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Text on the CTA button. Ignored when an image is set.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description Text</label>
                    <textarea
                      value={edits.article_sponsor_description || ""}
                      onChange={(e) => updateEdit("article_sponsor_description", e.target.value)}
                      placeholder="Support independent journalism."
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional body text shown next to the CTA button. Leave blank for the default fallback. Ignored when an image is set.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Image sponsor */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Image Sponsor</CardTitle>
                  </div>
                  <CardDescription>
                    Upload or paste an image URL to display a full-width sponsor image instead of text+CTA.
                    The image will be clickable and link to the Sponsor URL above.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUrlField
                    label="Article Sponsor Image"
                    settingKey="article_sponsor_image_url"
                    description="Recommended size: 728×90 px (leaderboard) or 970×90 px (billboard). Leave blank to use text mode."
                    value={edits.article_sponsor_image_url || ""}
                    uploadType="article_sponsor"
                    onChange={updateEdit}
                  />
                </CardContent>
              </Card>

              {/* Colors */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Colors</CardTitle>
                  </div>
                  <CardDescription>
                    Customize the article sponsor banner colors to match your brand.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ColorField
                    label="Banner Background"
                    settingKey="article_sponsor_bg_color"
                    description="Background fill of the banner body."
                    value={edits.article_sponsor_bg_color || "#FFFFFF"}
                    onChange={updateEdit}
                  />
                  <ColorField
                    label="Border Color"
                    settingKey="article_sponsor_border_color"
                    description="Border color around the entire banner."
                    value={edits.article_sponsor_border_color || "#D0D0D0"}
                    onChange={updateEdit}
                  />
                  <ColorField
                    label="Header Strip Background"
                    settingKey="article_sponsor_header_bg_color"
                    description="Background of the thin header strip that shows the label."
                    value={edits.article_sponsor_header_bg_color || "#F0F0F0"}
                    onChange={updateEdit}
                  />
                  <ColorField
                    label="CTA Button Color"
                    settingKey="article_sponsor_cta_bg_color"
                    description="Background color of the CTA button."
                    value={edits.article_sponsor_cta_bg_color || "#C41E3A"}
                    onChange={updateEdit}
                  />
                  <ColorField
                    label="CTA Button Text Color"
                    settingKey="article_sponsor_cta_text_color"
                    description="Text color of the CTA button."
                    value={edits.article_sponsor_cta_text_color || "#FFFFFF"}
                    onChange={updateEdit}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: preview */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-base">Live Preview — Article Banner</CardTitle>
                  <CardDescription>Updates as you change settings — no save required.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Banner preview */}
                  <div
                    className="rounded-sm overflow-hidden"
                    style={{ border: `1px solid ${bannerBorder}`, fontFamily: "Georgia, serif" }}
                  >
                    {bannerImageUrl ? (
                      /* Image mode */
                      <img
                        src={bannerImageUrl}
                        alt="Article sponsor preview"
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <>
                        {/* Header strip */}
                        <div
                          className="px-4 py-1.5 flex items-center justify-between"
                          style={{
                            backgroundColor: bannerHeaderBg,
                            borderBottom: `1px solid ${bannerBorder}`,
                          }}
                        >
                          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#888888]">
                            {bannerLabel}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.12em] text-[#AAAAAA]">
                            Advertisement
                          </span>
                        </div>
                        {/* Body */}
                        <div
                          className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
                          style={{ backgroundColor: bannerBg }}
                        >
                          <p className="text-[14px] text-[#666666] italic flex-1">
                            {bannerDescription || "Support independent journalism."}
                          </p>
                          <span
                            className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-semibold px-5 py-2.5 rounded-sm"
                            style={{
                              backgroundColor: bannerCtaBg,
                              color: bannerCtaText,
                            }}
                          >
                            {bannerCta} →
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      bannerImageUrl
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    <p className="font-medium mb-1">
                      {bannerImageUrl ? "🖼 Image mode active" : "✏️ Text mode active"}
                    </p>
                    <p>
                      {bannerImageUrl
                        ? "The sponsor image is displayed. Text and CTA are hidden."
                        : "Text and CTA button are displayed. Upload or paste an image URL above to switch to image mode."}
                    </p>
                  </div>

                  <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground">
                    <p className="font-medium mb-1 text-foreground">How it works</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Banner is hidden until "Enable" is on and a Sponsor URL is set</li>
                      <li>
                        Clicks go to{" "}
                        <code className="bg-muted px-1 rounded">/api/go/article-sponsor</code> which logs the
                        click then redirects
                      </li>
                      <li>Click counts appear in CEO Dashboard §7 Financial Summary</li>
                      <li>Article slug is passed as a query param for per-article attribution</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2b — ARTICLE SPONSOR SCHEDULING
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border pt-8 mb-8">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Article Sponsor Scheduling
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set a start and/or end datetime for the article sponsor banner. Outside the window, the banner is automatically hidden even if enabled.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active From</CardTitle>
                <CardDescription className="text-xs">Leave blank for no start restriction.</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="datetime-local"
                  value={edits.article_sponsor_active_from || ""}
                  onChange={(e) => updateEdit("article_sponsor_active_from", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Banner goes live at this time (local timezone).</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active Until</CardTitle>
                <CardDescription className="text-xs">Leave blank for no end restriction.</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="datetime-local"
                  value={edits.article_sponsor_active_until || ""}
                  onChange={(e) => updateEdit("article_sponsor_active_until", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Banner auto-hides after this time.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — A/B SPONSOR COPY TESTING
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border pt-8">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            A/B Sponsor Copy Testing
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            When enabled, readers are randomly shown Variant A (the main banner above) or Variant B (configured here).
            Clicks are tracked separately so you can compare which copy converts better.
            View results in <a href="/admin/sponsor-attribution" className="text-primary underline">Sponsor Attribution</a>.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Variant B settings */}
            <div className="space-y-6">
              {/* Enable toggle */}
              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Enable A/B Test</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Randomly serve Variant A or B to readers and track clicks separately
                      </p>
                    </div>
                    <Switch
                      checked={edits.article_sponsor_ab_test_enabled === "true"}
                      onCheckedChange={(checked) =>
                        updateEdit("article_sponsor_ab_test_enabled", checked ? "true" : "false")
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Variant B content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Variant B Content</CardTitle>
                  <CardDescription>
                    Configure the alternative copy. Variant A is the main banner configured above.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Label Text</label>
                    <input
                      type="text"
                      value={edits.article_sponsor_b_label || ""}
                      onChange={(e) => updateEdit("article_sponsor_b_label", e.target.value)}
                      placeholder="Sponsored"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CTA Button Text</label>
                    <input
                      type="text"
                      value={edits.article_sponsor_b_cta || ""}
                      onChange={(e) => updateEdit("article_sponsor_b_cta", e.target.value)}
                      placeholder="Learn More"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description Text</label>
                    <textarea
                      value={edits.article_sponsor_b_description || ""}
                      onChange={(e) => updateEdit("article_sponsor_b_description", e.target.value)}
                      placeholder="Support independent journalism."
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Variant B image */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Variant B Image</CardTitle>
                  </div>
                  <CardDescription>Optional. When set, shows image instead of text+CTA for Variant B.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUrlField
                    label="Variant B Image"
                    settingKey="article_sponsor_b_image_url"
                    description="Leave blank to use text mode for Variant B."
                    value={edits.article_sponsor_b_image_url || ""}
                    uploadType="article_sponsor"
                    onChange={updateEdit}
                  />
                </CardContent>
              </Card>

              {/* Variant B colors */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Variant B Colors</CardTitle>
                  </div>
                  <CardDescription>Customize colors for Variant B to test different visual treatments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ColorField label="Banner Background" settingKey="article_sponsor_b_bg_color" description="" value={edits.article_sponsor_b_bg_color || "#FFFFFF"} onChange={updateEdit} />
                  <ColorField label="Border Color" settingKey="article_sponsor_b_border_color" description="" value={edits.article_sponsor_b_border_color || "#D0D0D0"} onChange={updateEdit} />
                  <ColorField label="Header Strip Background" settingKey="article_sponsor_b_header_bg_color" description="" value={edits.article_sponsor_b_header_bg_color || "#F0F0F0"} onChange={updateEdit} />
                  <ColorField label="CTA Button Color" settingKey="article_sponsor_b_cta_bg_color" description="" value={edits.article_sponsor_b_cta_bg_color || "#C41E3A"} onChange={updateEdit} />
                  <ColorField label="CTA Button Text Color" settingKey="article_sponsor_b_cta_text_color" description="" value={edits.article_sponsor_b_cta_text_color || "#FFFFFF"} onChange={updateEdit} />
                </CardContent>
              </Card>
            </div>

            {/* Right: Variant B preview */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-base">Live Preview — Variant B</CardTitle>
                  <CardDescription>Updates as you change settings — no save required.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="rounded-sm overflow-hidden"
                    style={{ border: `1px solid ${bBorder}`, fontFamily: "Georgia, serif" }}
                  >
                    {bImageUrl ? (
                      <img
                        src={bImageUrl}
                        alt="Variant B sponsor preview"
                        className="w-full h-auto object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <>
                        <div
                          className="px-4 py-1.5 flex items-center justify-between"
                          style={{ backgroundColor: bHeaderBg, borderBottom: `1px solid ${bBorder}` }}
                        >
                          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#888888]">{bLabel}</span>
                          <span className="text-[10px] uppercase tracking-[0.12em] text-[#AAAAAA]">Advertisement</span>
                        </div>
                        <div
                          className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
                          style={{ backgroundColor: bBg }}
                        >
                          <p className="text-[14px] text-[#666666] italic flex-1">
                            {bDescription || "Support independent journalism."}
                          </p>
                          <span
                            className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-semibold px-5 py-2.5 rounded-sm"
                            style={{ backgroundColor: bCtaBg, color: bCtaText }}
                          >
                            {bCta} →
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground">
                    <p className="font-medium mb-1 text-foreground">A/B Test Notes</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Each page load randomly picks A or B (50/50 split)</li>
                      <li>Clicks tracked as <code className="bg-muted px-1 rounded">sponsor_a</code> or <code className="bg-muted px-1 rounded">sponsor_b</code></li>
                      <li>View results at <a href="/admin/sponsor-attribution" className="text-primary underline">Sponsor Attribution</a></li>
                      <li>Both variants use the same Sponsor URL (set in Basic Settings above)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
