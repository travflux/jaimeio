import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import BulkVideoGenerationPanel from "@/components/BulkVideoGenerationPanel";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2, Video, AlertTriangle } from "lucide-react";

export default function SettingsVideos() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();
  const utils = trpc.useUtils();

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Videos"
        description="Configure video generation providers, styles, and display settings."
        icon={<Video className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        {/* Auto-Generate Videos Toggle */}
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <label className="text-sm font-medium">Auto-Generate Videos</label>
              <p className="text-xs text-muted-foreground">Automatically generate videos for each article during the workflow.</p>
            </div>
            <Switch
              checked={edits.auto_generate_videos === "true"}
              onCheckedChange={(checked) => updateEdit("auto_generate_videos", checked ? "true" : "false")}
            />
          </CardContent>
        </Card>

        {/* Bulk Video Generation */}
        <BulkVideoGenerationPanel utils={utils} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Provider & Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Video Generation Provider</CardTitle>
              <CardDescription>Configure video generation provider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Primary Provider</label>
                <select value={edits.video_provider || "none"} onChange={(e) => updateEdit("video_provider", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background">
                  <option value="replicate">Replicate</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">Custom API</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {edits.video_provider === "replicate" && "Flexible provider with many video models. Requires API key."}
                  {edits.video_provider === "openai" && "OpenAI video generation. Requires API key."}
                  {edits.video_provider === "custom" && "Connect to any custom video generation API endpoint."}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Provider Fallback</label>
                  <p className="text-xs text-muted-foreground">
                    "If the primary provider fails, automatically try the next available provider."
                  </p>
                </div>
                <Switch
                  checked={edits.video_provider_fallback_enabled === "true"}
                  onCheckedChange={(checked) => updateEdit("video_provider_fallback_enabled", checked ? "true" : "false")}
                  disabled={!edits.video_provider || edits.video_provider === "none"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Provider Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provider Configuration</CardTitle>
              <CardDescription>API keys and settings for external video generation providers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {edits.video_provider === "replicate" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Replicate API Key</label>
                    <input type="password" value={edits.video_provider_replicate_api_key || ""} onChange={(e) => updateEdit("video_provider_replicate_api_key", e.target.value)}
                      placeholder="r8_..." className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Model</label>
                    <input type="text" value={edits.video_provider_replicate_model || ""} onChange={(e) => updateEdit("video_provider_replicate_model", e.target.value)}
                      placeholder="model-owner/model-name" className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                </>
              )}
              {edits.video_provider === "openai" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">OpenAI API Key</label>
                  <input type="password" value={edits.video_provider_openai_api_key || ""} onChange={(e) => updateEdit("video_provider_openai_api_key", e.target.value)}
                    placeholder="sk-proj-..." className="w-full px-3 py-2 border rounded-md bg-background" />
                  <p className="text-xs text-muted-foreground mt-1.5">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a>.</p>
                </div>
              )}
              {edits.video_provider === "custom" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">API URL</label>
                    <input type="url" value={edits.video_provider_custom_api_url || ""} onChange={(e) => updateEdit("video_provider_custom_api_url", e.target.value)}
                      placeholder="https://api.example.com/generate-video" className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">API Key (Optional)</label>
                    <input type="password" value={edits.video_provider_custom_api_key || ""} onChange={(e) => updateEdit("video_provider_custom_api_key", e.target.value)}
                      placeholder="Bearer token or API key" className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                </>
              )}

            </CardContent>
          </Card>

          {/* Video Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Video Settings</CardTitle>
              <CardDescription>Control video duration, aspect ratio, and style.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Video Duration</label>
                  <span className="text-lg font-bold text-primary">{edits.video_duration || "5"}s</span>
                </div>
                <Slider
                  value={[parseInt(edits.video_duration || "5")]}
                  onValueChange={([v]) => updateEdit("video_duration", String(v))}
                  min={5} max={60} step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5s</span><span>15s</span><span>30s</span><span>45s</span><span>60s</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Aspect Ratio</label>
                <select value={edits.video_aspect_ratio || "16:9"} onChange={(e) => updateEdit("video_aspect_ratio", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background">
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait / TikTok / Reels)</option>
                  <option value="1:1">1:1 (Square)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Video Style Prompt</label>
                <textarea
                  value={edits.video_style_prompt || "Animated editorial cartoon, smooth motion, satirical news broadcast style"}
                  onChange={(e) => updateEdit("video_style_prompt", e.target.value)}
                  rows={3} className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                />
              </div>

              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium mb-1">Final Prompt Preview:</p>
                <p className="text-muted-foreground italic">
                  {edits.video_style_prompt || "Animated editorial cartoon, smooth motion, satirical news broadcast style"}: [AI-generated scene description based on article content]
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Video generation is resource-intensive and may take 30-60 seconds per article. Consider enabling only for high-priority content.</span>
              </div>
            </CardContent>
          </Card>

          {/* Video Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Video Display</CardTitle>
              <CardDescription>Control how videos appear on article pages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto-Play Videos</label>
                  <p className="text-xs text-muted-foreground">Automatically play videos when article loads (muted).</p>
                </div>
                <Switch
                  checked={edits.video_autoplay === "true"}
                  onCheckedChange={(checked) => updateEdit("video_autoplay", checked ? "true" : "false")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Loop Videos</label>
                  <p className="text-xs text-muted-foreground">Loop videos continuously on article pages.</p>
                </div>
                <Switch
                  checked={edits.video_loop === "true"}
                  onCheckedChange={(checked) => updateEdit("video_loop", checked ? "true" : "false")}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
