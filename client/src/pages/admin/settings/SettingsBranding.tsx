import AdminLayout from "@/components/AdminLayout";
import { useSettings } from "@/hooks/useSettings";
import { Palette, Building2, Mail, Globe, Scale, Sparkles, Image, Type, Save, Loader2, Eye, Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

/** Upload a file to the branding upload endpoint */
async function uploadBrandingAsset(file: File, type: "logo" | "mascot" | "og_image"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/branding/upload?type=${type}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  const data = await res.json();
  return data.url;
}

export default function SettingsBranding() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();
  const [previewOpen, setPreviewOpen] = useState(false);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Branding</h1>
              <p className="text-sm text-muted-foreground">Customize your publication's identity, colors, contact info, and legal details.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(!previewOpen)}>
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
            <Button size="sm" onClick={handleSaveAll} disabled={!hasChanges || isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Live Preview Banner */}
        {previewOpen && (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Preview</span>
            </div>
            <div className="p-6">
              {/* Simulated masthead */}
              <div className="text-center space-y-1 pb-4 border-b">
                {edits.brand_mascot_url && (
                  <img src={edits.brand_mascot_url} alt={edits.brand_mascot_name || "Mascot"} className="w-16 h-16 mx-auto object-contain mb-2" />
                )}
                <h2 className="font-headline text-3xl font-bold" style={{ color: edits.brand_color_primary || "#dc2626" }}>
                  {edits.brand_site_name || "Your Site Name"}
                </h2>
                <p className="text-sm text-muted-foreground italic">{edits.brand_tagline || "Your Tagline"}</p>
              </div>
              {/* Simulated footer snippet */}
              <div className="pt-4 text-center">
                <p className="text-xs text-muted-foreground">{edits.brand_description || "Your description"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  &copy; {new Date().getFullYear()} {edits.brand_company_name || "Company Name"}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Brand Identity ─── */}
        <Section icon={<Type className="w-4 h-4" />} title="Brand Identity" description="Core name and messaging for your publication.">
          <Field label="Site Name" description="Displayed in the header, footer, browser tab, and SEO tags.">
            <input type="text" value={edits.brand_site_name || ""} onChange={(e) => updateEdit("brand_site_name", e.target.value)}
              placeholder="My Publication" className="w-full px-3 py-2 border rounded-md bg-background" />
          </Field>
          <Field label="Tagline" description="Short phrase displayed below the site name in the masthead.">
            <input type="text" value={edits.brand_tagline || ""} onChange={(e) => updateEdit("brand_tagline", e.target.value)}
              placeholder="Your catchy tagline" className="w-full px-3 py-2 border rounded-md bg-background" />
          </Field>
          <Field label="Description" description="Longer description used in the footer and meta tags.">
            <textarea value={edits.brand_description || ""} onChange={(e) => updateEdit("brand_description", e.target.value)}
              placeholder="A longer description of your publication..." rows={2} className="w-full px-3 py-2 border rounded-md bg-background resize-none" />
          </Field>
          <Field label="Editorial Team Name" description="Used for article bylines and schema.org author attribution.">
            <input type="text" value={edits.brand_editorial_team || ""} onChange={(e) => updateEdit("brand_editorial_team", e.target.value)}
              placeholder="Editorial Team" className="w-full px-3 py-2 border rounded-md bg-background" />
          </Field>
        </Section>

        {/* ─── Visual Identity ─── */}
        <Section icon={<Image className="w-4 h-4" />} title="Visual Identity" description="Logo, mascot, and brand colors.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Logo" description="Upload or enter URL for your logo (SVG, PNG, JPG, WebP).">
              <ImageUploadField
                value={edits.brand_logo_url || ""}
                onChange={(url) => updateEdit("brand_logo_url", url)}
                assetType="logo"
                placeholder="/logo.svg"
                previewHeight="h-20"
              />
            </Field>
            <Field label="Mascot Image" description="Used in footer, 404 page, and loading states.">
              <ImageUploadField
                value={edits.brand_mascot_url || ""}
                onChange={(url) => updateEdit("brand_mascot_url", url)}
                assetType="mascot"
                placeholder="/mascot.png"
                previewHeight="h-20"
              />
            </Field>
          </div>
          <Field label="Mascot Name" description="Name of your mascot character (used in alt text and easter eggs).">
            <input type="text" value={edits.brand_mascot_name || ""} onChange={(e) => updateEdit("brand_mascot_name", e.target.value)}
              placeholder="Mascot Name" className="w-full px-3 py-2 border rounded-md bg-background" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Primary Color" description="Main brand color for accents and highlights.">
              <div className="flex items-center gap-2">
                <input type="color" value={edits.brand_color_primary || "#dc2626"} onChange={(e) => updateEdit("brand_color_primary", e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer" />
                <input type="text" value={edits.brand_color_primary || ""} onChange={(e) => updateEdit("brand_color_primary", e.target.value)}
                  placeholder="#dc2626" className="flex-1 px-3 py-2 border rounded-md bg-background font-mono text-sm" />
              </div>
            </Field>
            <Field label="Secondary Color" description="Secondary accent color.">
              <div className="flex items-center gap-2">
                <input type="color" value={edits.brand_color_secondary || "#1e40af"} onChange={(e) => updateEdit("brand_color_secondary", e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer" />
                <input type="text" value={edits.brand_color_secondary || ""} onChange={(e) => updateEdit("brand_color_secondary", e.target.value)}
                  placeholder="#1e40af" className="flex-1 px-3 py-2 border rounded-md bg-background font-mono text-sm" />
              </div>
            </Field>
          </div>
        </Section>

        {/* ─── Contact Emails ─── */}
        <Section icon={<Mail className="w-4 h-4" />} title="Contact Emails" description="Email addresses displayed across your site's pages.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="General Contact">
              <input type="email" value={edits.brand_contact_email || ""} onChange={(e) => updateEdit("brand_contact_email", e.target.value)}
                placeholder="contact@yourdomain.com" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Editor">
              <input type="email" value={edits.brand_editor_email || ""} onChange={(e) => updateEdit("brand_editor_email", e.target.value)}
                placeholder="editor@yourdomain.com" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Privacy">
              <input type="email" value={edits.brand_privacy_email || ""} onChange={(e) => updateEdit("brand_privacy_email", e.target.value)}
                placeholder="privacy@yourdomain.com" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Legal">
              <input type="email" value={edits.brand_legal_email || ""} onChange={(e) => updateEdit("brand_legal_email", e.target.value)}
                placeholder="legal@yourdomain.com" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Corrections">
              <input type="email" value={edits.brand_corrections_email || ""} onChange={(e) => updateEdit("brand_corrections_email", e.target.value)}
                placeholder="corrections@yourdomain.com" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Moderation">
              <input type="email" value={edits.brand_moderation_email || ""} onChange={(e) => updateEdit("brand_moderation_email", e.target.value)}
                placeholder="moderation@yourdomain.com" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
          </div>
        </Section>

        {/* ─── Social Media ─── */}
        <Section icon={<Globe className="w-4 h-4" />} title="Social Media" description="Social media profiles linked in the footer and schema.org data.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="X/Twitter Handle">
              <input type="text" value={edits.brand_twitter_handle || ""} onChange={(e) => updateEdit("brand_twitter_handle", e.target.value)}
                placeholder="@YourBrand" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="X/Twitter URL">
              <input type="url" value={edits.brand_twitter_url || ""} onChange={(e) => updateEdit("brand_twitter_url", e.target.value)}
                placeholder="https://x.com/YourBrand" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Facebook URL">
              <input type="url" value={edits.brand_facebook_url || ""} onChange={(e) => updateEdit("brand_facebook_url", e.target.value)}
                placeholder="https://facebook.com/YourBrand" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Instagram URL">
              <input type="url" value={edits.brand_instagram_url || ""} onChange={(e) => updateEdit("brand_instagram_url", e.target.value)}
                placeholder="https://instagram.com/YourBrand" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
          </div>
        </Section>

        {/* ─── Legal ─── */}
        <Section icon={<Scale className="w-4 h-4" />} title="Legal" description="Company details used in Terms of Service, Privacy Policy, and copyright notices.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Company Name" description="Legal entity name.">
              <input type="text" value={edits.brand_company_name || ""} onChange={(e) => updateEdit("brand_company_name", e.target.value)}
                placeholder="Your Media Company" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Founded Year">
              <input type="text" value={edits.brand_founded_year || ""} onChange={(e) => updateEdit("brand_founded_year", e.target.value)}
                placeholder="2026" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
          </div>
        </Section>

        {/* ─── Content & Tone ─── */}
        <Section icon={<Sparkles className="w-4 h-4" />} title="Content & Tone" description="Controls the genre and editorial voice of your publication.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Content Genre" description="Primary genre (satire, news, tech, entertainment, etc.).">
              <input type="text" value={edits.brand_genre || ""} onChange={(e) => updateEdit("brand_genre", e.target.value)}
                placeholder="satire" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Content Tone" description="Default editorial tone (satirical, professional, casual, etc.).">
              <input type="text" value={edits.brand_tone || ""} onChange={(e) => updateEdit("brand_tone", e.target.value)}
                placeholder="satirical" className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
          </div>
        </Section>

        {/* ─── SEO ─── */}
        <Section icon={<Building2 className="w-4 h-4" />} title="SEO & Social Sharing" description="Default meta tags and Open Graph settings.">
          <Field label="SEO Keywords" description="Comma-separated keywords for meta tags.">
            <textarea value={edits.brand_seo_keywords || ""} onChange={(e) => updateEdit("brand_seo_keywords", e.target.value)}
              placeholder="satire, news, comedy, current events" rows={2} className="w-full px-3 py-2 border rounded-md bg-background resize-none" />
          </Field>
          <Field label="Default OG Image" description="Default image for social sharing when no article image is available.">
            <ImageUploadField
              value={edits.brand_og_image || ""}
              onChange={(url) => updateEdit("brand_og_image", url)}
              assetType="og_image"
              placeholder="/og-image.jpg"
              previewHeight="h-24"
            />
          </Field>
        </Section>

        {/* Bottom Save */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSaveAll} disabled={!hasChanges || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save All Changes
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ─── Image Upload Field ─── */

function ImageUploadField({
  value,
  onChange,
  assetType,
  placeholder,
  previewHeight = "h-20",
}: {
  value: string;
  onChange: (url: string) => void;
  assetType: "logo" | "mascot" | "og_image";
  placeholder: string;
  previewHeight?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUpload = useCallback(async (file: File) => {
    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large — maximum size is 5MB.");
      return;
    }
    // Validate type
    const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type. Allowed: PNG, JPEG, SVG, WebP, GIF, ICO");
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    try {
      const url = await uploadBrandingAsset(file, assetType);
      onChange(url);
      setUploadSuccess(true);
      toast.success(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} image uploaded. Remember to save changes.`);
      // Clear success indicator after 3s
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, [assetType, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [handleUpload]);

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif,image/x-icon"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Preview or placeholder */}
        {value ? (
          <div className={`flex items-center gap-3 p-3`}>
            <div className={`${previewHeight} w-20 shrink-0 rounded border bg-muted/30 flex items-center justify-center overflow-hidden`}>
              <img
                src={value}
                alt={`${assetType} preview`}
                className="max-h-full max-w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {uploading ? (
                  <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</span>
                ) : uploadSuccess ? (
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Uploaded</span>
                ) : (
                  "Drop a new file or click to replace"
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              title="Clear image"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 px-4">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground/50 mb-2" />
            )}
            <p className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : "Drop image here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, SVG, WebP, GIF — max 5MB</p>
          </div>
        )}
      </div>

      {/* Manual URL input */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground whitespace-nowrap">or URL:</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-2 py-1.5 border rounded-md bg-background text-xs"
        />
      </div>
    </div>
  );
}

/* ─── Helper Components ─── */

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {description && <p className="text-xs text-muted-foreground mb-1.5">{description}</p>}
      {children}
    </div>
  );
}
