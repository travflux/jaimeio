import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import WritingStyleSelector from "@/components/WritingStyleSelector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Eye, EyeOff, RotateCcw, Save, ChevronDown, ChevronUp, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SettingsGeneration() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();

  // Parse excluded styles from database setting
  const excludedStyles = new Set<string>(
    edits.ai_excluded_styles ? (JSON.parse(edits.ai_excluded_styles) as string[]) : []
  );
  const setExcludedStyles = (newExcluded: Set<string>): void => {
    updateEdit("ai_excluded_styles", JSON.stringify(Array.from(newExcluded)));
  };

  // ── Article LLM System Prompt state ──────────────────────────────────────
  const [promptPanelOpen, setPromptPanelOpen] = useState(false);
  const [showResolved, setShowResolved] = useState(true);
  const [draftPrompt, setDraftPrompt] = useState<string>("");
  const [promptDirty, setPromptDirty] = useState(false);

  // ── Article LLM User Message state ────────────────────────────────────────
  const [userMsgPanelOpen, setUserMsgPanelOpen] = useState(false);
  const [draftUserMsg, setDraftUserMsg] = useState<string>("");
  const [userMsgDirty, setUserMsgDirty] = useState(false);
  const [userMsgSaved, setUserMsgSaved] = useState<string | null>(null);

  // ── Preview Article state ─────────────────────────────────────────────────────
  const [previewHeadline, setPreviewHeadline] = useState("");
  const [previewSummary, setPreviewSummary] = useState("");
  const [previewSource, setPreviewSource] = useState("");
  const [previewResult, setPreviewResult] = useState<{ headline: string; subheadline: string; body: string; slug: string; _debug?: { systemPrompt: string; userMessage: string; targetWords: number; styleUsed: string } } | null>(null);
  const [previewDebugOpen, setPreviewDebugOpen] = useState(false);

  const previewMutation = trpc.ai.previewArticle.useMutation({
    onSuccess: (data) => {
      setPreviewResult(data as typeof previewResult);
      toast.success("Preview generated", { description: "Article generated from your current prompt configuration." });
    },
    onError: (err) => toast.error("Preview failed", { description: err.message }),
  });

  // ── Event Selector Prompt state ────────────────────────────────────────────
  const [selectorPanelOpen, setSelectorPanelOpen] = useState(false);
  const [draftSelectorPrompt, setDraftSelectorPrompt] = useState<string>("");
  const [selectorDirty, setSelectorDirty] = useState(false);
  const [selectorSaved, setSelectorSaved] = useState<string | null>(null);

  // Load saved user message and selector prompt from DB on mount
  const { data: userMsgData } = trpc.ai.getPromptSetting.useQuery({ key: "article_llm_user_prompt" }, { enabled: userMsgPanelOpen });
  const { data: selectorData } = trpc.ai.getPromptSetting.useQuery({ key: "event_selector_prompt" }, { enabled: selectorPanelOpen });

  useEffect(() => {
    if (userMsgData && !userMsgDirty) {
      setDraftUserMsg(userMsgData.value ?? "");
      setUserMsgSaved(userMsgData.value ?? null);
    }
  }, [userMsgData, userMsgDirty]);

  useEffect(() => {
    if (selectorData && !selectorDirty) {
      setDraftSelectorPrompt(selectorData.value ?? "");
      setSelectorSaved(selectorData.value ?? null);
    }
  }, [selectorData, selectorDirty]);

  const savePromptSettingMutation = trpc.ai.savePromptSetting.useMutation({
    onSuccess: (result, variables) => {
      if (variables.key === "article_llm_user_prompt") {
        setUserMsgDirty(false);
        setUserMsgSaved(result.value ?? null);
        toast.success(result.cleared ? "User message cleared" : "User message saved", {
          description: result.cleared ? "Built-in default will be used." : "Your custom user message is now active."
        });
      } else if (variables.key === "event_selector_prompt") {
        setSelectorDirty(false);
        setSelectorSaved(result.value ?? null);
        toast.success(result.cleared ? "Event selector prompt cleared" : "Event selector prompt saved", {
          description: result.cleared ? "Built-in default will be used." : "Your custom selector prompt is now active."
        });
      }
    },
    onError: (err) => toast.error("Save failed", { description: err.message }),
  });

  // Debounce the text fields so we don't fire a server round-trip on every
  // keystroke while the user is typing in the custom prompt fields.
  const [debouncedWritingStylePrompt, setDebouncedWritingStylePrompt] = useState("");
  const [debouncedAdditionalInstructions, setDebouncedAdditionalInstructions] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedWritingStylePrompt(edits.writing_style_prompt ?? ""), 600);
    return () => clearTimeout(t);
  }, [edits.writing_style_prompt]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAdditionalInstructions(edits.ai_custom_prompt ?? ""), 600);
    return () => clearTimeout(t);
  }, [edits.ai_custom_prompt]);

  const { data: promptPreview, isLoading: promptLoading, refetch: refetchPrompt } =
    trpc.ai.getArticlePromptPreview.useQuery(
      {
        styleId: edits.ai_writing_style || "onion",
        targetLength: parseInt(edits.target_article_length || "200"),
        // Pass live UI values so the preview reflects unsaved edits immediately
        writingStylePrompt: debouncedWritingStylePrompt,
        additionalInstructions: debouncedAdditionalInstructions,
      },
      { enabled: promptPanelOpen }
    );

  // Sync draftPrompt from DB when panel opens
  useEffect(() => {
    if (promptPreview && !promptDirty) {
      setDraftPrompt(promptPreview.overrideValue ?? "");
    }
  }, [promptPreview, promptDirty]);

  const savePromptMutation = trpc.ai.saveArticleSystemPrompt.useMutation({
    onSuccess: (result) => {
      setPromptDirty(false);
      refetchPrompt();
      if (result.cleared) {
        toast.success("Prompt override cleared", { description: "The built-in default prompt will be used." });
      } else {
        toast.success("Prompt saved", { description: "Your custom system prompt is now active." });
      }
    },
    onError: (err) => {
      toast.error("Save failed", { description: err.message });
    },
  });

  const handleSavePrompt = () => {
    savePromptMutation.mutate({ prompt: draftPrompt });
  };

  const handleClearPrompt = () => {
    setDraftPrompt("");
    setPromptDirty(true);
    savePromptMutation.mutate({ prompt: "" });
  };

  if (isLoading) return (
    <AdminLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Generation"
        description="Control article volume, writing style, and AI generation settings."
        icon={<Zap className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Article Volume */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Article Volume</CardTitle>
                <CardDescription>Control how many articles are generated per daily batch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Articles Per Batch</label>
                    <span className="text-2xl font-bold text-primary">{edits.articles_per_batch || "20"}</span>
                  </div>
                  <Slider
                    value={[parseInt(edits.articles_per_batch || "20")]}
                    onValueChange={([v]) => updateEdit("articles_per_batch", String(v))}
                    min={1} max={100} step={1} className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1 (light)</span><span>25</span><span>50 (moderate)</span><span>75</span><span>100 (heavy)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Target Article Length</label>
                    <span className="text-2xl font-bold text-primary">
                      {edits.target_article_length || "200"}{" "}
                      <span className="text-sm font-normal text-muted-foreground">words</span>
                    </span>
                  </div>
                  <Slider
                    value={[parseInt(edits.target_article_length || "200")]}
                    onValueChange={([v]) => updateEdit("target_article_length", String(v))}
                    min={50} max={1000} step={25} className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>50 (brief)</span><span>200</span><span>400 (standard)</span><span>700</span><span>1000 (long)</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Default Article Status</label>
                  <Select value={edits.default_status || "pending"} onValueChange={v => updateEdit("default_status", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft (requires manual submission)</SelectItem>
                      <SelectItem value="pending">Pending (goes to review queue)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">LLM Model</label>
                  <input
                    type="text"
                    value={edits.llm_model || "gemini-2.5-flash"}
                    onChange={e => updateEdit("llm_model", e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background font-mono"
                    placeholder="gemini-2.5-flash"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Model ID used for all article generation. Must be a valid model available on the configured API. Change with caution.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Writing Style */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Writing Style</CardTitle>
                <CardDescription>Choose the default voice for generated articles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {edits.writing_style_prompt ? (
                  <div className="opacity-50 pointer-events-none select-none">
                    <WritingStyleSelector
                      selectedStyle={edits.ai_writing_style || "onion"}
                      excludedStyles={excludedStyles}
                      onStyleSelect={(styleId) => updateEdit("ai_writing_style", styleId)}
                      onExcludedStylesChange={setExcludedStyles}
                    />
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                      ⚠ Style dropdown is overridden by the custom writing style prompt below.
                    </p>
                  </div>
                ) : (
                  <>
                    <WritingStyleSelector
                      selectedStyle={edits.ai_writing_style || "onion"}
                      excludedStyles={excludedStyles}
                      onStyleSelect={(styleId) => updateEdit("ai_writing_style", styleId)}
                      onExcludedStylesChange={setExcludedStyles}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Unchecked styles will be excluded from random selection.</p>
                  </>
                )}
                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">Custom Writing Style Prompt</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Override the default writing style with a custom prompt. Leave empty to use the selected style above.
                  </p>
                  <textarea
                    value={edits.writing_style_prompt || ""}
                    onChange={e => updateEdit("writing_style_prompt", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background resize-y font-mono"
                    placeholder="Example: Write in the style of a cynical tech journalist who finds humor in corporate absurdity."
                  />
                  <p className="text-xs text-muted-foreground mt-2">This prompt will be used for all generated articles when set.</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Additional instructions (optional)</label>
                  <textarea
                    value={edits.ai_custom_prompt || ""}
                    onChange={e => updateEdit("ai_custom_prompt", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background resize-y"
                    placeholder="Add extra instructions for the AI writer..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Article LLM System Prompt Editor ─────────────────────────────── */}
          <Card className="border-2 border-dashed border-muted-foreground/30">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setPromptPanelOpen(o => !o)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">Article LLM System Prompt</CardTitle>
                  {promptPreview?.isOverridden ? (
                    <Badge variant="default" className="text-xs">Custom Override Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Using Built-in Default</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">
                    {promptPanelOpen ? "Collapse" : "View & Edit"}
                  </span>
                  {promptPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              <CardDescription className="mt-1">
                View and override the full system prompt sent to the LLM for every article generation. Critical for white-label deployments that are not satire publications.
              </CardDescription>
            </CardHeader>

            {promptPanelOpen && (
              <CardContent className="space-y-5 pt-0">
                {/* Info banner */}
                <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">How this works</p>
                    <p className="text-xs leading-relaxed">
                      When empty, the engine uses its built-in default prompt (shown below). When you enter a custom prompt, it completely replaces the built-in one.
                      Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{STYLE}}"}</code> to inject the selected writing style and{" "}
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{LENGTH_INSTRUCTION}}"}</code> to inject the target word count instruction.
                      The prompt must instruct the LLM to return a JSON object with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">headline</code>,{" "}
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">subheadline</code>,{" "}
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">body</code>, and{" "}
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">slug</code> fields.
                    </p>
                  </div>
                </div>

                {/* Live composed prompt preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      {promptPreview?.isOverridden ? "Custom Override Prompt" : "Built-in Default Prompt"}
                      <span className="text-xs font-normal text-muted-foreground/60">
                        — updates live as you change style settings above
                      </span>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => setShowResolved(r => !r)}
                    >
                      {showResolved ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showResolved ? "Show raw" : "Show resolved"}
                    </Button>
                  </div>
                  {promptLoading ? (
                    <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Updating preview…
                    </div>
                  ) : (
                    <pre className="w-full px-3 py-3 border border-input rounded text-xs bg-muted/30 text-muted-foreground resize-y overflow-auto whitespace-pre-wrap font-mono leading-relaxed max-h-64">
                      {showResolved
                        ? (promptPreview?.resolvedPrompt ?? "")
                        : (promptPreview?.builtInPrompt ?? "")}
                    </pre>
                  )}
                </div>

                {/* Editable override */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">
                      Custom System Prompt Override
                    </label>
                    {promptPreview?.isOverridden && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={handleClearPrompt}
                        disabled={savePromptMutation.isPending}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore default
                      </Button>
                    )}
                  </div>
                  <textarea
                    value={draftPrompt}
                    onChange={e => { setDraftPrompt(e.target.value); setPromptDirty(true); }}
                    rows={12}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background resize-y font-mono leading-relaxed"
                    placeholder={`Leave empty to use the built-in default above.\n\nExample for a non-satire deployment:\n\nYou are a professional news writer for a technology publication. {{STYLE}}\n{{LENGTH_INSTRUCTION}}\n\nWrite factual, well-researched articles in a clear and engaging style.\n\nReturn a JSON object with: headline, subheadline, body (full HTML article with <p> tags), slug (url-friendly).`}
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    This prompt applies to both the manual article generator and the scheduled workflow engine.
                  </p>
                </div>

                {/* Save button */}
                <div className="flex items-center justify-between pt-1 border-t">
                  <p className="text-xs text-muted-foreground">
                    {promptDirty ? "Unsaved changes" : promptPreview?.isOverridden ? "Custom prompt is active" : "Using built-in default"}
                  </p>
                  <Button
                    onClick={handleSavePrompt}
                    disabled={!promptDirty || savePromptMutation.isPending}
                    size="sm"
                    className="gap-2"
                  >
                    {savePromptMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Prompt
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
          {/* ── Article LLM User Message Editor ───────────────────────────────────── */}
          <Card className="border-2 border-dashed border-muted-foreground/30">
            <CardHeader className="cursor-pointer select-none" onClick={() => setUserMsgPanelOpen(o => !o)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">Article LLM User Message (Step 4)</CardTitle>
                  {userMsgSaved ? (
                    <Badge variant="default" className="text-xs">Custom Override Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Using Built-in Default</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">{userMsgPanelOpen ? "Collapse" : "View & Edit"}</span>
                  {userMsgPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              <CardDescription className="mt-1">
                The user message sent to the LLM for each article — this is where "Write a highly satirical news article" lives. Override it to change the content type entirely (e.g., real estate tips, tech explainers, product reviews).
              </CardDescription>
            </CardHeader>
            {userMsgPanelOpen && (
              <CardContent className="space-y-5 pt-0">
                <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Available placeholders</p>
                    <p className="text-xs leading-relaxed">
                      <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{{HEADLINE}}"}</code> — the RSS headline &nbsp;
                      <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{{SUMMARY}}"}</code> — the RSS summary &nbsp;
                      <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{{SOURCE}}"}</code> — the RSS source name &nbsp;
                      <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{{TARGET_WORDS}}"}</code> — target word count &nbsp;
                      <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{{TOPIC}}"}</code> — topic (manual generator only)
                    </p>
                    <p className="text-xs leading-relaxed mt-1">
                      The LLM must return a JSON object with <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">headline</code>, <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">subheadline</code>, and <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">body</code> fields.
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Custom User Message Override</label>
                    {userMsgSaved && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={() => { setDraftUserMsg(""); setUserMsgDirty(true); savePromptSettingMutation.mutate({ key: "article_llm_user_prompt", value: "" }); }}
                        disabled={savePromptSettingMutation.isPending}>
                        <RotateCcw className="w-3 h-3" /> Restore default
                      </Button>
                    )}
                  </div>
                  <textarea
                    value={draftUserMsg}
                    onChange={e => { setDraftUserMsg(e.target.value); setUserMsgDirty(true); }}
                    rows={10}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background resize-y font-mono leading-relaxed"
                    placeholder={`Leave empty to use the built-in default.\n\nExample for a real estate training publication:\n\nBased on this news event, write a real estate training article that teaches agents a practical lesson:\n\nHEADLINE: {{HEADLINE}}\nSUMMARY: {{SUMMARY}}\n\nWrite approximately {{TARGET_WORDS}} words. Return JSON with: headline, subheadline, body.`}
                    spellCheck={false}
                  />
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <p className="text-xs text-muted-foreground">
                    {userMsgDirty ? "Unsaved changes" : userMsgSaved ? "Custom user message is active" : "Using built-in default"}
                  </p>
                  <Button onClick={() => savePromptSettingMutation.mutate({ key: "article_llm_user_prompt", value: draftUserMsg })}
                    disabled={!userMsgDirty || savePromptSettingMutation.isPending} size="sm" className="gap-2">
                    {savePromptSettingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save User Message
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* ── Event Selector Prompt Editor ─────────────────────────────────────────── */}
          <Card className="border-2 border-dashed border-muted-foreground/30">
            <CardHeader className="cursor-pointer select-none" onClick={() => setSelectorPanelOpen(o => !o)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">Event Selector Prompt (Step 1)</CardTitle>
                  {selectorSaved ? (
                    <Badge variant="default" className="text-xs">Custom Override Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Using Built-in Default</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">{selectorPanelOpen ? "Collapse" : "View & Edit"}</span>
                  {selectorPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              <CardDescription className="mt-1">
                The prompt used to pick which RSS headlines to cover each day. The built-in default selects for "satirical potential" — override this to select for relevance to your niche instead.
              </CardDescription>
            </CardHeader>
            {selectorPanelOpen && (
              <CardContent className="space-y-5 pt-0">
                <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Available placeholders</p>
                    <p className="text-xs leading-relaxed">
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{COUNT}}"}</code> — number of articles to select &nbsp;
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{HEADLINES}}"}</code> — the full numbered list of RSS headlines &nbsp;
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{CATEGORY_GUIDANCE}}"}</code> — auto-generated category balance guidance
                    </p>
                    <p className="text-xs leading-relaxed mt-1">
                      Must return a JSON array of 1-indexed numbers, e.g. <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">[3, 7, 12, 1]</code>
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Custom Selector Prompt Override</label>
                    {selectorSaved && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={() => { setDraftSelectorPrompt(""); setSelectorDirty(true); savePromptSettingMutation.mutate({ key: "event_selector_prompt", value: "" }); }}
                        disabled={savePromptSettingMutation.isPending}>
                        <RotateCcw className="w-3 h-3" /> Restore default
                      </Button>
                    )}
                  </div>
                  <textarea
                    value={draftSelectorPrompt}
                    onChange={e => { setDraftSelectorPrompt(e.target.value); setSelectorDirty(true); }}
                    rows={10}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background resize-y font-mono leading-relaxed"
                    placeholder={`Leave empty to use the built-in default.\n\nExample for a real estate training publication:\n\nYou are an editor for a real estate training publication. Select the {{COUNT}} news events most relevant to real estate agents, investors, and homebuyers.\n\n{{HEADLINES}}\n\n{{CATEGORY_GUIDANCE}}\n\nReturn ONLY a JSON array of the 1-indexed numbers of your selections.`}
                    spellCheck={false}
                  />
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <p className="text-xs text-muted-foreground">
                    {selectorDirty ? "Unsaved changes" : selectorSaved ? "Custom selector prompt is active" : "Using built-in default"}
                  </p>
                  <Button onClick={() => savePromptSettingMutation.mutate({ key: "event_selector_prompt", value: draftSelectorPrompt })}
                    disabled={!selectorDirty || savePromptSettingMutation.isPending} size="sm" className="gap-2">
                    {savePromptSettingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Selector Prompt
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
          {/* ── Preview Article Dry-Run Panel ───────────────────────────────────────── */}
          <Card className="border-2 border-primary/40 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">Preview Article</CardTitle>
                <Badge variant="outline" className="text-xs border-primary/40 text-primary">Dry Run — Nothing is saved</Badge>
              </div>
              <CardDescription>
                Test your current prompt configuration with a sample headline. The article is generated using your saved System Prompt, User Message, and Writing Style overrides — but is never stored or published.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Test Headline <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={previewHeadline}
                    onChange={e => setPreviewHeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                    placeholder="e.g. Fed Raises Interest Rates Again Despite Everyone Being Tired"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Source <span className="text-muted-foreground text-xs font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={previewSource}
                    onChange={e => setPreviewSource(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                    placeholder="e.g. Reuters"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Summary <span className="text-muted-foreground text-xs font-normal">(optional — helps the LLM produce a more grounded article)</span></label>
                <textarea
                  value={previewSummary}
                  onChange={e => setPreviewSummary(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-input rounded text-sm bg-background resize-y"
                  placeholder="Paste a brief summary of the real news event..."
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    if (!previewHeadline.trim()) { toast.error("Enter a test headline first"); return; }
                    setPreviewResult(null);
                    previewMutation.mutate({ headline: previewHeadline.trim(), summary: previewSummary.trim() || undefined, source: previewSource.trim() || undefined });
                  }}
                  disabled={previewMutation.isPending || !previewHeadline.trim()}
                  className="gap-2"
                >
                  {previewMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating preview…</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Run Preview</>
                  )}
                </Button>
                {previewResult && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1"
                    onClick={() => { setPreviewResult(null); setPreviewDebugOpen(false); }}>
                    Clear
                  </Button>
                )}
              </div>

              {previewResult && (
                <div className="space-y-4 pt-2 border-t">
                  {/* Article result */}
                  <div className="rounded-lg border bg-background p-5 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Generated Headline</p>
                      <h2 className="text-xl font-bold leading-snug">{previewResult.headline}</h2>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subheadline</p>
                      <p className="text-sm text-muted-foreground italic">{previewResult.subheadline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Article Body</p>
                      <div
                        className="prose prose-sm max-w-none text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: previewResult.body }}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Generated Slug</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{previewResult.slug}</code>
                    </div>
                  </div>

                  {/* Debug: show resolved prompts */}
                  {previewResult._debug && (
                    <div>
                      <button
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setPreviewDebugOpen(o => !o)}
                      >
                        {previewDebugOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {previewDebugOpen ? "Hide" : "Show"} resolved prompts sent to LLM
                      </button>
                      {previewDebugOpen && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">System Prompt ({previewResult._debug.targetWords} words target)</p>
                            <pre className="text-xs bg-muted/40 border rounded p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-auto">{previewResult._debug.systemPrompt}</pre>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">User Message</p>
                            <pre className="text-xs bg-muted/40 border rounded p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-auto">{previewResult._debug.userMessage}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Pipeline Quality — CEO Directive Fixes 1, 2, 5, 6, 7 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Pipeline Quality</CardTitle>
              <CardDescription>Controls for article selection — deduplication, topic variety, and category distribution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selector Window Size</label>
                <p className="text-xs text-muted-foreground">Number of RSS entries shown to the AI selector. Higher = more variety but slower. Default: 200.</p>
                <div className="flex items-center gap-3">
                  <Slider
                    min={50} max={500} step={25}
                    value={[Number(edits.selector_window_size ?? 200)]}
                    onValueChange={([v]) => updateEdit("selector_window_size", String(v))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-12 text-right">{edits.selector_window_size ?? 200}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Headline Deduplication</label>
                  <p className="text-xs text-muted-foreground">Skip RSS entries whose titles closely match headlines published in the last 3 days.</p>
                </div>
                <input type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={edits.headline_dedup_enabled !== "false"}
                  onChange={e => updateEdit("headline_dedup_enabled", String(e.target.checked))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Topic Clustering</label>
                  <p className="text-xs text-muted-foreground">Group similar RSS entries by topic before AI selection to prevent 10 articles on the same story.</p>
                </div>
                <input type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={edits.topic_cluster_enabled !== "false"}
                  onChange={e => updateEdit("topic_cluster_enabled", String(e.target.checked))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Cross-Batch Topic Memory</label>
                  <p className="text-xs text-muted-foreground">Track topics covered in recent batches and exclude them from the selector prompt.</p>
                </div>
                <input type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={edits.cross_batch_memory_enabled !== "false"}
                  onChange={e => updateEdit("cross_batch_memory_enabled", String(e.target.checked))}
                />
              </div>
              {edits.cross_batch_memory_enabled !== "false" && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <label className="text-sm font-medium">Memory Window (days)</label>
                  <div className="flex items-center gap-3">
                    <Slider
                      min={1} max={7} step={1}
                      value={[Number(edits.cross_batch_memory_days ?? 2)]}
                      onValueChange={([v]) => updateEdit("cross_batch_memory_days", String(v))}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-8 text-right">{edits.cross_batch_memory_days ?? 2}d</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Category Quotas in Selector</label>
                  <p className="text-xs text-muted-foreground">Inject hard category distribution targets into the AI selector prompt (Politics 30%, Tech 15%, etc.).</p>
                </div>
                <input type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={edits.category_quotas_enabled === "true"}
                  onChange={e => updateEdit("category_quotas_enabled", String(e.target.checked))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
