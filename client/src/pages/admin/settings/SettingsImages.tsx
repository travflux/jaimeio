import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import BatchWatermarkPanel from "@/components/BatchWatermarkPanel";
import ClearRejectedArticlesPanel from "@/components/ClearRejectedArticlesPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Image, ImagePlus, CheckCircle2, XCircle, Square, AlertTriangle, Info } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

function BackfillImagesPanel() {
  const utils = trpc.useUtils();
  const { data: status, refetch } = trpc.ai.backfillImagesStatus.useQuery(undefined, {
    refetchInterval: (query) => (query.state.data?.isRunning ? 2000 : false),
  });

  // Detect when the job transitions from running → finished and refresh the badge
  const wasRunning = useRef(false);
  useEffect(() => {
    const isRunning = status?.isRunning ?? false;
    if (wasRunning.current && !isRunning && status?.startedAt) {
      // Job just finished — refresh the missing-images badge count
      utils.articles.missingImages.invalidate();
    }
    wasRunning.current = isRunning;
  }, [status?.isRunning, status?.startedAt, utils]);

  const start = trpc.ai.backfillMissingImages.useMutation({
    onSuccess: (res) => {
      if (res.started) {
        toast.success(`Backfill started — ${res.total} articles queued`);
      } else {
        toast.info(res.message || "Nothing to backfill");
      }
      utils.ai.backfillImagesStatus.invalidate();
    },
    onError: (e) => toast.error(`Failed to start backfill: ${e.message}`),
  });

  const cancel = trpc.ai.backfillImagesCancel.useMutation({
    onSuccess: () => { toast.info("Backfill cancelled"); utils.ai.backfillImagesStatus.invalidate(); },
    onError: (e) => toast.error(`Cancel failed: ${e.message}`),
  });

  const pct = status && status.total > 0 ? Math.round((status.processed / status.total) * 100) : 0;
  const isDone = status && !status.isRunning && status.startedAt !== null;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImagePlus className="w-4 h-4 text-primary" />
          Backfill Missing Images
        </CardTitle>
        <CardDescription>
          Generate AI images for all articles that currently have no featured image. Runs as a background job — you can leave this page and come back.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status summary */}
        {status && status.startedAt && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: status.total, color: "text-foreground" },
              { label: "Processed", value: status.processed, color: "text-blue-600" },
              { label: "Succeeded", value: status.succeeded, color: "text-green-600" },
              { label: "Failed", value: status.failed, color: "text-red-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {status?.isRunning && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processing article {status.processed + 1} of {status.total}…</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Completion banner */}
        {isDone && !status.isRunning && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            status.failed === 0 ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"
          }`}>
            {status.failed === 0
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <XCircle className="w-4 h-4 shrink-0" />}
            <span>
              {status.failed === 0
                ? `All ${status.succeeded} images generated successfully.`
                : `Completed: ${status.succeeded} succeeded, ${status.failed} failed. Check the log below for details.`}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => start.mutate()}
            disabled={status?.isRunning || start.isPending}
            className="gap-2"
          >
            {start.isPending || status?.isRunning
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ImagePlus className="w-4 h-4" />}
            {status?.isRunning ? `Running… (${pct}%)` : "Start Backfill"}
          </Button>
          {status?.isRunning && (
            <Button
              variant="outline"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="gap-2"
            >
              <Square className="w-3 h-3 fill-current" />
              Cancel
            </Button>
          )}
        </div>

        {/* Activity log */}
        {status && status.log.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</p>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border bg-muted/30 p-2">
              {status.log.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-0.5">
                  {entry.status === "ok"
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                  <span className="flex-1 truncate text-foreground">{entry.headline}</span>
                  {entry.error && <span className="text-red-500 shrink-0 max-w-32 truncate">{entry.error}</span>}
                  <span className="text-muted-foreground shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!status?.startedAt && (
          <p className="text-xs text-muted-foreground">
            Click "Start Backfill" to scan all articles and generate images for those missing one. The job runs in the background — images are generated one at a time to avoid rate limits.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsImages() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();
  const { branding } = useBranding();

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Images"
        description="Configure image generation providers, styles, and watermark settings."
        icon={<Image className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auto-Generate Toggle */}
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Auto-Generate Images</p>
                  <p className="text-xs text-muted-foreground mt-1">Automatically create AI-generated featured images for each new article during the workflow.</p>
                </div>
                <Switch
                  checked={edits.auto_generate_images === "true"}
                  onCheckedChange={v => updateEdit("auto_generate_images", String(v))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Provider */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Image Generation Provider</CardTitle>
              <CardDescription>Select and configure the service used to generate article images.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Warning banner when no provider is configured */}
              {(!edits.image_provider || edits.image_provider === "none") && (
                <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                  <div>
                    <p className="font-semibold">No image provider configured</p>
                    <p className="text-xs mt-0.5 leading-relaxed">
                      Image generation is disabled until you select a provider below and save. Without a provider, article images will not be generated and the workflow will skip the image step.
                    </p>
                  </div>
                </div>
              )}


              <div>
                <label className="text-sm font-medium mb-2 block">Primary Provider</label>
                <select value={edits.image_provider || "none"} onChange={(e) => updateEdit("image_provider", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background">
                  <option value="none">— Not configured (images disabled) —</option>
                  <option value="openai">OpenAI DALL-E 3</option>
                  <option value="replicate">Replicate (Flux, SDXL, etc.)</option>
                  <option value="custom">Custom API</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {(!edits.image_provider || edits.image_provider === "none") && "Select a provider to enable image generation."}
                  {edits.image_provider === "openai" && "High-quality images from OpenAI DALL-E 3. Requires your own OpenAI API key."}
                  {edits.image_provider === "replicate" && "Flexible provider with many models (Flux, SDXL, etc.). Requires your own Replicate API key."}
                  {edits.image_provider === "custom" && "Connect to any custom image generation API endpoint."}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Fallback Provider</label>
                  <p className="text-xs text-muted-foreground">
                    If the primary provider fails, automatically try the fallback provider.
                  </p>
                </div>
                <Switch 
                  checked={edits.image_provider_fallback_enabled === "true"} 
                  onCheckedChange={(checked) => updateEdit("image_provider_fallback_enabled", checked ? "true" : "false")} 
                  disabled={!edits.image_provider || edits.image_provider === "none"}
                />
              </div>

              {edits.image_provider_fallback_enabled === "true" && edits.image_provider && edits.image_provider !== "none" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Fallback Provider</label>
                  <select value={edits.image_provider_fallback || ""} onChange={(e) => updateEdit("image_provider_fallback", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background">
                    <option value="">— Select fallback —</option>
                    {edits.image_provider !== "openai" && <option value="openai">OpenAI DALL-E 3</option>}
                    {edits.image_provider !== "replicate" && <option value="replicate">Replicate</option>}
                    {edits.image_provider !== "custom" && <option value="custom">Custom API</option>}
                  </select>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Provider Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provider Configuration</CardTitle>
              <CardDescription>API keys and settings for external image generation providers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {edits.image_provider === "openai" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">OpenAI API Key</label>
                  <input type="password" value={edits.image_provider_openai_api_key || ""} onChange={(e) => updateEdit("image_provider_openai_api_key", e.target.value)}
                    placeholder="sk-proj-..." className="w-full px-3 py-2 border rounded-md bg-background" />
                  <p className="text-xs text-muted-foreground mt-1.5">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a>.</p>
                </div>
              )}
              {edits.image_provider === "replicate" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Replicate API Key</label>
                    <input type="password" value={edits.image_provider_replicate_api_key || ""} onChange={(e) => updateEdit("image_provider_replicate_api_key", e.target.value)}
                      placeholder="r8_..." className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Model</label>
                    <input type="text" value={edits.image_provider_replicate_model || "black-forest-labs/flux-schnell"} onChange={(e) => updateEdit("image_provider_replicate_model", e.target.value)}
                      placeholder="black-forest-labs/flux-schnell" className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                </>
              )}
              {edits.image_provider === "custom" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">API URL</label>
                    <input type="url" value={edits.image_provider_custom_api_url || ""} onChange={(e) => updateEdit("image_provider_custom_api_url", e.target.value)}
                      placeholder="https://api.example.com/generate" className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">API Key (Optional)</label>
                    <input type="password" value={edits.image_provider_custom_api_key || ""} onChange={(e) => updateEdit("image_provider_custom_api_key", e.target.value)}
                      placeholder="Bearer token or API key" className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                </>
              )}
              {(!edits.image_provider || edits.image_provider === "none") && (
                <div className="text-sm text-muted-foreground">
                  <p className="text-amber-600 dark:text-amber-400">No provider selected. Choose a provider above to enable image generation.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Style & Prompt */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Image Style & Prompt Template</CardTitle>
              <CardDescription>Customize how images are generated by defining the visual style and keywords.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Step 1: LLM System Prompt</label>
                <p className="text-xs text-muted-foreground mb-2">This prompt is sent to the LLM to generate a scene description from the article headline. The LLM output becomes the scene description used in Step 2.</p>
                <textarea value={edits.image_llm_system_prompt || "You are an image art director. Create a concise image generation prompt that visually represents the article headline. The image should be bold, visually striking, and suitable for editorial use. Return ONLY the prompt text, under 100 words."} onChange={(e) => updateEdit("image_llm_system_prompt", e.target.value)}
                  rows={4} className="w-full px-3 py-2 border rounded-md bg-background resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Step 2: Image Style Prompt</label>
                <p className="text-xs text-muted-foreground mb-2">Prepended to the scene description when sending to Gemini.</p>
                <textarea value={edits.image_style_prompt || "Professional editorial illustration"} onChange={(e) => updateEdit("image_style_prompt", e.target.value)}
                  placeholder="Professional editorial illustration" rows={2} className="w-full px-3 py-2 border rounded-md bg-background resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Step 3: Image Style Keywords</label>
                <p className="text-xs text-muted-foreground mb-2">Appended after the scene description when sending to Gemini.</p>
                <textarea value={edits.image_style_keywords || "Bold colors, clean composition, professional editorial aesthetic. No text or words in the image."} onChange={(e) => updateEdit("image_style_keywords", e.target.value)}
                  rows={3} className="w-full px-3 py-2 border rounded-md bg-background resize-none" />
              </div>
              <div className="p-4 bg-muted rounded-md text-sm space-y-3">
                <p className="font-semibold">Final Prompt Sent to Gemini (live preview):</p>
                <div className="p-3 bg-background border rounded text-xs font-mono text-muted-foreground break-all">
                  <p>{edits.image_style_prompt || "Professional editorial illustration"}: [AI-generated scene description from Step 1]. {edits.image_style_keywords || "Bold colors, clean composition, professional editorial aesthetic. No text or words in the image."}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Image Watermark</CardTitle>
              <CardDescription>Add a watermark to all generated images.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Watermark</label>
                  <p className="text-xs text-muted-foreground">Add a watermark overlay to all generated article images.</p>
                </div>
                <Switch checked={edits.watermark_enabled === "true"} onCheckedChange={(checked) => updateEdit("watermark_enabled", checked ? "true" : "false")} />
              </div>
              {edits.watermark_enabled === "true" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Watermark Text</label>
                    <input type="text" value={edits.watermark_text || "example.com"} onChange={(e) => updateEdit("watermark_text", e.target.value)}
                      placeholder="example.com" className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Opacity: {Math.round((parseFloat(edits.watermark_opacity || "0.7") * 100))}%</label>
                    <Slider value={[parseFloat(edits.watermark_opacity || "0.7") * 100]} onValueChange={([val]) => updateEdit("watermark_opacity", (val / 100).toString())} min={30} max={100} step={5} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Position</label>
                    <select value={edits.watermark_position || "bottom-right"} onChange={(e) => updateEdit("watermark_position", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-background">
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Font Size: {edits.watermark_font_size || "16"}px</label>
                    <Slider value={[parseInt(edits.watermark_font_size || "16")]} onValueChange={([val]) => updateEdit("watermark_font_size", val.toString())} min={10} max={32} step={1} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Text Color</label>
                    <div className="flex gap-2">
                      <button onClick={() => updateEdit("watermark_text_color", "255,255,255")}
                        className={`flex-1 px-3 py-2 border rounded-md text-sm ${edits.watermark_text_color === "255,255,255" ? "border-primary bg-primary/10" : "border-border"}`}>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>White</div>
                      </button>
                      <button onClick={() => updateEdit("watermark_text_color", "0,0,0")}
                        className={`flex-1 px-3 py-2 border rounded-md text-sm ${edits.watermark_text_color === "0,0,0" ? "border-primary bg-primary/10" : "border-border"}`}>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-black border border-gray-300"></div>Black</div>
                      </button>
                    </div>
                    <input type="text" value={edits.watermark_text_color || "255,255,255"} onChange={(e) => updateEdit("watermark_text_color", e.target.value)}
                      placeholder="255,255,255" className="w-full px-3 py-2 border rounded-md bg-background mt-2" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Background Opacity: {Math.round((parseFloat(edits.watermark_bg_opacity || "0.6") * 100))}%</label>
                    <Slider value={[parseFloat(edits.watermark_bg_opacity || "0.6") * 100]} onValueChange={([val]) => updateEdit("watermark_bg_opacity", (val / 100).toString())} min={0} max={100} step={5} />
                  </div>
                  <div className="bg-muted/50 p-4 rounded-md border border-border">
                    <p className="text-sm font-medium mb-2">Preview</p>
                    <div className="relative w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-md overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-sm">Sample Article Image</div>                      {/* Text URL in bottom-right */}
                      <div className="absolute bottom-2 right-2 px-2 py-1 rounded font-medium"
                        style={{
                          backgroundColor: `rgba(0, 0, 0, ${parseFloat(edits.watermark_bg_opacity || "0.6")})`,
                          color: `rgb(${edits.watermark_text_color || "255,255,255"})`,
                          opacity: parseFloat(edits.watermark_opacity || "0.7"),
                          fontSize: `${edits.watermark_font_size || "16"}px`,
                        }}>
                        {edits.watermark_text || "example.com"}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clear Rejected Articles</CardTitle>
              <CardDescription>Permanently delete all rejected articles from the database.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClearRejectedArticlesPanel />
            </CardContent>
          </Card>

          {edits.watermark_enabled === "true" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batch Watermark Existing Images</CardTitle>
                <CardDescription>Apply watermark to all existing article images in the database.</CardDescription>
              </CardHeader>
              <CardContent>
                <BatchWatermarkPanel />
              </CardContent>
            </Card>
          )}

          {/* Backfill Missing Images */}
          <BackfillImagesPanel />
        </div>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
