import AdminLayout from "@/components/AdminLayout";
import SocialMediaComposer from "@/components/SocialMediaComposer";
import { Link } from "wouter";
import WritingStyleSelector from "@/components/WritingStyleSelector";
import HoroscopeStyleSelector from "@/components/HoroscopeStyleSelector";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import BulkVideoGenerationPanel from "@/components/BulkVideoGenerationPanel";
import BatchWatermarkPanel from "@/components/BatchWatermarkPanel";
import ClearRejectedArticlesPanel from "@/components/ClearRejectedArticlesPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Workflow, Clock, CheckCircle, FileText, Send, Settings, Rss,
  Loader2, Save, Plus, Trash2, BarChart3, Zap, Calendar, Share2,
  AlertTriangle, Power, RefreshCw, Play, Timer, Globe, Image, Video, MessageSquare, Stars, Sparkles, ShoppingCart
} from "lucide-react";

type SettingMap = Record<string, string>;

type SchedulerStatus = {
  isScheduled: boolean;
  cronExpression: string | null;
  nextRun: string | null;
  lastRun: { time: string; status: string; message: string } | null;
  isRunning: boolean;
};

export default function AdminOptimizer() {
  const { data: batches } = trpc.workflow.list.useQuery({ limit: 30 });
  const { data: stats } = trpc.articles.stats.useQuery();
  const { data: settingsRaw, isLoading: settingsLoading } = trpc.settings.list.useQuery();
  const utils = trpc.useUtils();

  // Scheduler status (fetched via REST since it's not a tRPC endpoint)
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler/status");
      const data = await res.json();
      setSchedulerStatus(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSchedulerStatus();
    const interval = setInterval(fetchSchedulerStatus, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [fetchSchedulerStatus]);

  // Build a settings map from the raw array
  const settings: SettingMap = useMemo(() => {
    if (!settingsRaw) return {};
    const map: SettingMap = {};
    for (const s of settingsRaw) { map[s.key] = s.value; }
    return map;
  }, [settingsRaw]);

  // Local edits state
  const [edits, setEdits] = useState<SettingMap>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [excludedStyles, setExcludedStyles] = useState<Set<string>>(new Set());
  const [showStyleSettings, setShowStyleSettings] = useState(false);

  useEffect(() => {
    if (settingsRaw && Object.keys(edits).length === 0) {
      const map: SettingMap = {};
      for (const s of settingsRaw) { map[s.key] = s.value; }
      setEdits(map);
    }
  }, [settingsRaw]);

  const updateEdit = (key: string, value: string) => {
    setEdits(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const bulkUpdate = trpc.settings.bulkUpdate.useMutation({
    onSuccess: async () => {
      toast.success("Settings saved successfully!");
      setHasChanges(false);
      utils.settings.list.invalidate();
      // Refresh the scheduler with new settings
      try {
        const res = await fetch("/api/scheduler/refresh", { method: "POST" });
        const status = await res.json();
        setSchedulerStatus(status);
        toast.success("Scheduler updated with new settings.");
      } catch {
        toast.info("Settings saved. Scheduler will pick up changes on next restart.");
      }
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  const handleSaveAll = () => {
    if (!settingsRaw) return;
    const changed = settingsRaw
      .filter(s => edits[s.key] !== undefined && edits[s.key] !== s.value)
      .map(s => ({ key: s.key, value: edits[s.key], label: s.label ?? undefined, description: s.description ?? undefined, category: s.category ?? undefined, type: s.type as any }));

    // Also include new keys that don't exist in settingsRaw yet
    const existingKeys = new Set(settingsRaw.map(s => s.key));
    const newKeys = Object.entries(edits)
      .filter(([k]) => !existingKeys.has(k))
      .map(([key, value]) => ({ key, value, category: "schedule", type: "string" as const }));

    const allChanges = [...changed, ...newKeys];
    if (allChanges.length === 0) { toast.info("No changes to save."); return; }
    bulkUpdate.mutate({ settings: allChanges });
  };

  const handleTriggerNow = async () => {
    setTriggerLoading(true);
    try {
      const res = await fetch("/api/scheduler/trigger", { method: "POST" });
      const result = await res.json();
      if (result.status === "success") {
        toast.success("Workflow triggered successfully!");
      } else if (result.status === "skipped") {
        toast.info(result.message);
      } else {
        toast.error(result.message);
      }
      fetchSchedulerStatus();
      utils.workflow.list.invalidate();
      utils.articles.stats.invalidate();
    } catch (e: any) {
      toast.error("Failed to trigger workflow.");
    } finally {
      setTriggerLoading(false);
    }
  };

  const latestBatch = batches?.[0];

  // RSS feeds management
  let rssFeedsList: string[] = [];
  try { rssFeedsList = JSON.parse(edits.rss_feeds || "[]"); } catch { rssFeedsList = []; }

  const addRssFeed = () => {
    const url = prompt("Enter RSS feed URL:");
    if (!url) return;
    const updated = [...rssFeedsList, url.trim()];
    updateEdit("rss_feeds", JSON.stringify(updated));
  };

  const removeRssFeed = (index: number) => {
    const updated = rssFeedsList.filter((_, i) => i !== index);
    updateEdit("rss_feeds", JSON.stringify(updated));
  };

  // Common timezones for the dropdown
  const timezones = [
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "UTC", label: "UTC" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Central European (CET)" },
    { value: "Asia/Tokyo", label: "Japan (JST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Optimizer</h1>
            <p className="text-muted-foreground text-sm">Monitor daily operations and adjust workflow variables.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2.5 py-1 rounded-full font-medium">Unsaved changes</span>
          )}
          <Button onClick={handleSaveAll} disabled={!hasChanges || bulkUpdate.isPending} className="shadow-sm">
            {bulkUpdate.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save All Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <QuickStat icon={<FileText className="w-4 h-4" />} label="Total Articles" value={stats?.total ?? 0} href="/admin/articles" />
        <QuickStat icon={<Clock className="w-4 h-4" />} label="Pending Review" value={stats?.pending ?? 0} color="amber" href="/admin/articles?status=pending" />
        <QuickStat icon={<CheckCircle className="w-4 h-4" />} label="Approved" value={stats?.approved ?? 0} color="green" href="/admin/articles?status=approved" />
        <QuickStat icon={<Send className="w-4 h-4" />} label="Published" value={stats?.published ?? 0} color="blue" href="/admin/articles?status=published" />
        <QuickStat icon={<BarChart3 className="w-4 h-4" />} label="Batches Run" value={batches?.length ?? 0} color="purple" />
        <QuickStat
          icon={<Power className="w-4 h-4" />}
          label="Workflow"
          value={edits.workflow_enabled === "true" ? "ON" : "OFF"}
          color={edits.workflow_enabled === "true" ? "green" : "red"}
        />
      </div>

      {/* Scheduler Status Banner */}
      {schedulerStatus && (
        <Card className="mb-6 border-l-4 border-l-blue-500">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">Scheduler Status</span>
                  {schedulerStatus.isRunning && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <Loader2 className="w-3 h-3 animate-spin" /> Running Now
                    </span>
                  )}
                  {!schedulerStatus.isRunning && schedulerStatus.isScheduled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  )}
                  {!schedulerStatus.isScheduled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Inactive
                    </span>
                  )}
                </div>
                {schedulerStatus.nextRun && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Next run:</span> {schedulerStatus.nextRun}
                  </p>
                )}
                {schedulerStatus.lastRun && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Last run:</span>{" "}
                    <span className={schedulerStatus.lastRun.status === "success" ? "text-green-600" : schedulerStatus.lastRun.status === "error" ? "text-red-600" : "text-amber-600"}>
                      {schedulerStatus.lastRun.status}
                    </span>
                    {" at "}{new Date(schedulerStatus.lastRun.time).toLocaleString()}
                  </p>
                )}
                {schedulerStatus.cronExpression && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Cron: {schedulerStatus.cronExpression}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSchedulerStatus}
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={handleTriggerNow}
                  disabled={triggerLoading || schedulerStatus.isRunning}
                >
                  {triggerLoading || schedulerStatus.isRunning ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  Run Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest Batch Banner */}
      {latestBatch && (
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-semibold">Latest Batch: {latestBatch.batchDate}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>{latestBatch.totalEvents} events</span>
                  <span>{latestBatch.articlesGenerated} generated</span>
                  <span className="text-green-600">{latestBatch.articlesApproved} approved</span>
                  <span className="text-blue-600">{latestBatch.articlesPublished} published</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {["gathering", "generating", "pending_approval", "approved", "publishing", "completed"].map((stage, i) => {
                  const isActive = latestBatch.status === stage;
                  const isPast = getStageIndex(latestBatch.status) > i;
                  return (
                    <div key={stage} className="flex items-center gap-1">
                      {i > 0 && <div className={`w-4 h-0.5 ${isPast ? "bg-green-500" : "bg-border"}`} />}
                      <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-primary ring-2 ring-primary/30" : isPast ? "bg-green-500" : "bg-muted-foreground/30"}`}
                        title={stage.replace("_", " ")} />
                    </div>
                  );
                })}
                <span className="text-xs ml-2"><StatusBadge status={latestBatch.status} /></span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tabs */}
      {settingsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="generation" className="space-y-4">
          <TabsList className="flex-wrap gap-y-2">
            {/* Content Pipeline */}
            <TabsTrigger value="generation" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> Generation</TabsTrigger>
            <TabsTrigger value="sources" className="gap-1.5"><Rss className="w-3.5 h-3.5" /> Sources</TabsTrigger>
            <TabsTrigger value="publishing" className="gap-1.5"><Send className="w-3.5 h-3.5" /> Publishing</TabsTrigger>
            
            {/* Media */}
            <div className="w-px h-6 bg-border mx-1" />
            <TabsTrigger value="images" className="gap-1.5"><Image className="w-3.5 h-3.5" /> Images</TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5"><Video className="w-3.5 h-3.5" /> Videos</TabsTrigger>
            
            {/* Distribution */}
            <div className="w-px h-6 bg-border mx-1" />
            <TabsTrigger value="social" className="gap-1.5"><Share2 className="w-3.5 h-3.5" /> Social</TabsTrigger>
            <TabsTrigger value="reddit" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Reddit</TabsTrigger>
            
            {/* System */}
            <div className="w-px h-6 bg-border mx-1" />
            <TabsTrigger value="goodies" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Goodies</TabsTrigger>
            <TabsTrigger value="horoscopes" className="gap-1.5"><Stars className="w-3.5 h-3.5" /> Horoscopes</TabsTrigger>
            <TabsTrigger value="crosswords" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Crosswords</TabsTrigger>
            <TabsTrigger value="amazon" className="gap-1.5"><ShoppingCart className="w-3.5 h-3.5" /> Amazon</TabsTrigger>
            <TabsTrigger value="homepage" className="gap-1.5"><Globe className="w-3.5 h-3.5" /> Homepage</TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5"><Calendar className="w-3.5 h-3.5" /> Schedule</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> History</TabsTrigger>
          </TabsList>

          {/* ─── Content Generation ─── */}
          <TabsContent value="generation">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      min={1}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1 (light)</span>
                      <span>10</span>
                      <span>20 (default)</span>
                      <span>35</span>
                      <span>50 (heavy)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Target Article Length</label>
                      <span className="text-2xl font-bold text-primary">{edits.target_article_length || "200"} <span className="text-sm font-normal text-muted-foreground">words</span></span>
                    </div>
                    <Slider
                      value={[parseInt(edits.target_article_length || "200")]}
                      onValueChange={([v]) => updateEdit("target_article_length", String(v))}
                      min={50}
                      max={1000}
                      step={25}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>50 (brief)</span>
                      <span>200</span>
                      <span>400 (standard)</span>
                      <span>700</span>
                      <span>1000 (long)</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Default Article Status</label>
                    <Select value={edits.default_status || "pending"} onValueChange={v => updateEdit("default_status", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft (requires manual submission)</SelectItem>
                        <SelectItem value="pending">Pending (goes to review queue)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Auto-Generate Images</label>
                      <p className="text-xs text-muted-foreground">Create AI featured images for each article</p>
                    </div>
                    <Switch
                      checked={edits.auto_generate_images === "true"}
                      onCheckedChange={v => updateEdit("auto_generate_images", String(v))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Writing Style</CardTitle>
                  <CardDescription>Choose the default satirical voice for generated articles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <WritingStyleSelector
                    selectedStyle={edits.ai_writing_style || "onion"}
                    excludedStyles={excludedStyles}
                    onStyleSelect={(styleId) => updateEdit("ai_writing_style", styleId)}
                    onExcludedStylesChange={setExcludedStyles}
                  />

                  <div>
                    <label className="text-sm font-medium mb-1 block">Custom instructions (optional)</label>
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
          </TabsContent>

          {/* ─── News Sources ─── */}
          <TabsContent value="sources">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">RSS Feed Sources</CardTitle>
                      <CardDescription>Manage the news feeds the workflow monitors.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={addRssFeed}>
                      <Plus className="w-4 h-4 mr-1" /> Add Feed
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {rssFeedsList.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No RSS feeds configured.</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {rssFeedsList.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs group">
                          <Rss className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span className="truncate flex-1 font-mono">{url}</span>
                          <button
                            onClick={() => removeRssFeed(i)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Sources</CardTitle>
                  <CardDescription>Configure supplementary news sources.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Include Google News</label>
                      <p className="text-xs text-muted-foreground">Gather trending stories from Google News</p>
                    </div>
                    <Switch
                      checked={edits.use_google_news === "true"}
                      onCheckedChange={v => updateEdit("use_google_news", String(v))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">News Regions</label>
                    <input
                      type="text"
                      value={edits.news_regions || "US,GB"}
                      onChange={e => updateEdit("news_regions", e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                      placeholder="US,GB,AU"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Comma-separated region codes (e.g., US, GB, AU, CA).</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Publishing ─── */}
          <TabsContent value="publishing">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Publication Speed</CardTitle>
                  <CardDescription>Control how articles are released throughout the day.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Max Publications Per Day</label>
                      <span className="text-lg font-bold text-primary">{edits.max_publish_per_day || "20"}</span>
                    </div>
                    <Slider
                      value={[parseInt(edits.max_publish_per_day || "20")]}
                      onValueChange={([v]) => updateEdit("max_publish_per_day", String(v))}
                      min={1}
                      max={500}
                      step={1}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Stagger Interval (minutes)</label>
                    <input
                      type="number"
                      value={edits.stagger_interval_minutes || "30"}
                      onChange={e => updateEdit("stagger_interval_minutes", e.target.value)}
                      min={0}
                      max={480}
                      className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minutes between each article publication. 0 = publish all at once.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Auto-Publish</CardTitle>
                  <CardDescription>Configure automatic publishing behavior.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Auto-Publish Approved Articles</label>
                      <p className="text-xs text-muted-foreground">Skip the manual publish step after approval</p>
                    </div>
                    <Switch
                      checked={edits.auto_publish_approved === "true"}
                      onCheckedChange={v => updateEdit("auto_publish_approved", String(v))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Publish Delay (minutes)</label>
                    <input
                      type="number"
                      value={edits.publish_delay_minutes || "0"}
                      onChange={e => updateEdit("publish_delay_minutes", e.target.value)}
                      min={0}
                      max={1440}
                      className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Delay between approval and publication. 0 = immediate.</p>
                  </div>

                  {edits.auto_publish_approved === "true" && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Auto-publish is enabled. Articles will go live automatically after approval{parseInt(edits.publish_delay_minutes || "0") > 0 ? ` with a ${edits.publish_delay_minutes} minute delay` : ""}.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* ─── Social Media Distribution ─── */}
          <TabsContent value="social">
            {/* Post Composer and Queue Section */}
            <SocialMediaComposer />
            
            {/* Configuration Section */}
            <div className="mt-8 pt-8 border-t border-border">
              <h3 className="text-lg font-semibold mb-4">Configuration</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Social Media Distribution</CardTitle>
                  <CardDescription>Configure automatic social media post generation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Auto-Create Social Posts</label>
                      <p className="text-xs text-muted-foreground">Generate social posts when articles are published</p>
                    </div>
                    <Switch
                      checked={edits.auto_create_social_posts === "true"}
                      onCheckedChange={v => updateEdit("auto_create_social_posts", String(v))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Active Platforms</label>
                    <div className="space-y-2">
                      {["twitter", "facebook", "linkedin", "instagram", "threads"].map(platform => {
                        const platforms = (edits.social_platforms || "twitter,facebook,linkedin").split(",").map(s => s.trim());
                        const isActive = platforms.includes(platform);
                        return (
                          <div key={platform} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{platform === "twitter" ? "X (Twitter)" : platform}</span>
                            <Switch
                              checked={isActive}
                              onCheckedChange={v => {
                                const updated = v
                                  ? [...platforms, platform]
                                  : platforms.filter(p => p !== platform);
                                updateEdit("social_platforms", updated.filter(Boolean).join(","));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FeedHive Integration card removed (Feb 21, 2026) - replaced with direct X/Twitter posting via X Queue */}
            </div>
          </TabsContent>

          {/* ─── Reddit Integration ─── */}
          <TabsContent value="reddit">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reddit Auto-Posting</CardTitle>
                <CardDescription>
                  Automatically post articles to Reddit when published. Requires a Reddit "script" app from{" "}
                  <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">reddit.com/prefs/apps</a>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div>
                    <label className="text-sm font-medium">Enable Reddit Posting</label>
                    <p className="text-xs text-muted-foreground">Automatically post articles to Reddit when they're published.</p>
                  </div>
                  <Switch
                    checked={edits.reddit_enabled === "true"}
                    onCheckedChange={(checked) => updateEdit("reddit_enabled", checked ? "true" : "false")}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Reddit Client ID</label>
                    <input
                      type="text"
                      value={edits.reddit_client_id || ""}
                      onChange={(e) => updateEdit("reddit_client_id", e.target.value)}
                      placeholder="Your Reddit app client ID"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Get this from <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">reddit.com/prefs/apps</a> → create "script" app.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Reddit Client Secret</label>
                    <input
                      type="password"
                      value={edits.reddit_client_secret || ""}
                      onChange={(e) => updateEdit("reddit_client_secret", e.target.value)}
                      placeholder="Your Reddit app client secret"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Reddit Username</label>
                    <input
                      type="text"
                      value={edits.reddit_username || ""}
                      onChange={(e) => updateEdit("reddit_username", e.target.value)}
                      placeholder="your_reddit_username"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Reddit Password</label>
                    <input
                      type="password"
                      value={edits.reddit_password || ""}
                      onChange={(e) => updateEdit("reddit_password", e.target.value)}
                      placeholder="your_password (or password:123456 for 2FA)"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      If 2FA is enabled, use format: <code className="bg-muted px-1 rounded">password:123456</code>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Target Subreddit</label>
                    <input
                      type="text"
                      value={edits.reddit_subreddit || "test"}
                      onChange={(e) => updateEdit("reddit_subreddit", e.target.value)}
                      placeholder="test"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Subreddit name without r/ (e.g., "test", "funny", "news"). Use "test" for testing.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Post Type</label>
                    <select
                      value={edits.reddit_post_type || "link"}
                      onChange={(e) => updateEdit("reddit_post_type", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="link">Link Post (direct link to article)</option>
                      <option value="text">Text Post (link in body)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Post Title Template</label>
                    <input
                      type="text"
                      value={edits.reddit_title_template || "{{headline}}"}
                      onChange={(e) => updateEdit("reddit_title_template", e.target.value)}
                      placeholder="{{headline}}"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Use <code className="bg-muted px-1 rounded">{`{{headline}}`}</code> for article headline.
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Setup Instructions
                  </h4>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">reddit.com/prefs/apps</a></li>
                    <li>Click "create another app" → choose "script"</li>
                    <li>Set redirect URI to <code className="bg-muted px-1 rounded">http://localhost:8080</code></li>
                    <li>Copy your client_id (short string under app name) and client_secret</li>
                    <li>Paste credentials above and test with r/test subreddit first</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Image Providers ─── */}
          <TabsContent value="images">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Image Generation Provider</CardTitle>
                  <CardDescription>Choose between built-in Manus image generation or external providers like OpenAI DALL-E, Replicate, or custom APIs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Primary Provider</label>
                    <select
                      value={edits.image_provider || "manus"}
                      onChange={(e) => updateEdit("image_provider", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="manus">Manus (Built-in)</option>
                      <option value="openai">OpenAI DALL-E 3</option>
                      <option value="replicate">Replicate (Flux, SDXL, etc.)</option>
                      <option value="custom">Custom API</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {edits.image_provider === "manus" && "Uses the built-in Manus image generation service (no setup required)."}
                      {edits.image_provider === "openai" && "High-quality images from OpenAI DALL-E 3. Requires API key."}
                      {edits.image_provider === "replicate" && "Flexible provider with many models (Flux, SDXL, etc.). Requires API key."}
                      {edits.image_provider === "custom" && "Connect to any custom image generation API endpoint."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Fallback to Manus</label>
                      <p className="text-xs text-muted-foreground">If the primary provider fails, automatically use Manus as backup.</p>
                    </div>
                    <Switch
                      checked={edits.image_provider_fallback_enabled === "true"}
                      onCheckedChange={(checked) => updateEdit("image_provider_fallback_enabled", checked ? "true" : "false")}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Image Style & Prompt Template</CardTitle>
                  <CardDescription>Customize how images are generated by defining the visual style and keywords. These settings apply to all providers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Image Style Prompt</label>
                    <textarea
                      value={edits.image_style_prompt || "Editorial cartoon illustration, satirical style"}
                      onChange={(e) => updateEdit("image_style_prompt", e.target.value)}
                      placeholder="Editorial cartoon illustration, satirical style"
                      rows={2}
                      className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Base style description. Examples: "Editorial cartoon illustration, satirical style" (cartoon), "Photorealistic, high detail, professional photography" (realistic), "Oil painting, impressionist style" (artistic).
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Image Style Keywords</label>
                    <textarea
                      value={edits.image_style_keywords || "Bold colors, exaggerated proportions, newspaper editorial cartoon aesthetic. No text or words in the image."}
                      onChange={(e) => updateEdit("image_style_keywords", e.target.value)}
                      placeholder="Bold colors, exaggerated proportions, newspaper editorial cartoon aesthetic. No text or words in the image."
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Additional keywords appended to every prompt. Examples: "Bold colors, exaggerated proportions" (cartoon), "8k resolution, cinematic lighting, sharp focus" (realistic), "Soft brushstrokes, warm color palette" (artistic).
                    </p>
                  </div>

                  <div className="p-3 bg-muted rounded-md text-sm">
                    <p className="font-medium mb-1">Final Prompt Preview:</p>
                    <p className="text-muted-foreground italic">
                      {edits.image_style_prompt || "Editorial cartoon illustration, satirical style"}: [AI-generated scene description]. {edits.image_style_keywords || "Bold colors, exaggerated proportions, newspaper editorial cartoon aesthetic. No text or words in the image."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Provider Configuration</CardTitle>
                  <CardDescription>API keys and settings for external image generation providers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {edits.image_provider === "openai" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">OpenAI API Key</label>
                      <input
                        type="password"
                        value={edits.image_provider_openai_api_key || ""}
                        onChange={(e) => updateEdit("image_provider_openai_api_key", e.target.value)}
                        placeholder="sk-proj-..."
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a>.
                      </p>
                    </div>
                  )}

                  {edits.image_provider === "replicate" && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Replicate API Key</label>
                        <input
                          type="password"
                          value={edits.image_provider_replicate_api_key || ""}
                          onChange={(e) => updateEdit("image_provider_replicate_api_key", e.target.value)}
                          placeholder="r8_..."
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Get your API key from <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Replicate Account</a>.
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Model</label>
                        <input
                          type="text"
                          value={edits.image_provider_replicate_model || "black-forest-labs/flux-schnell"}
                          onChange={(e) => updateEdit("image_provider_replicate_model", e.target.value)}
                          placeholder="black-forest-labs/flux-schnell"
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Popular models: <code className="text-xs bg-muted px-1 rounded">black-forest-labs/flux-schnell</code>, <code className="text-xs bg-muted px-1 rounded">stability-ai/sdxl</code>
                        </p>
                      </div>
                    </>
                  )}

                  {edits.image_provider === "custom" && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">API URL</label>
                        <input
                          type="url"
                          value={edits.image_provider_custom_api_url || ""}
                          onChange={(e) => updateEdit("image_provider_custom_api_url", e.target.value)}
                          placeholder="https://api.example.com/generate"
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Full URL to your custom image generation endpoint.
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">API Key (Optional)</label>
                        <input
                          type="password"
                          value={edits.image_provider_custom_api_key || ""}
                          onChange={(e) => updateEdit("image_provider_custom_api_key", e.target.value)}
                          placeholder="Bearer token or API key"
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Leave empty if your API doesn't require authentication.
                        </p>
                      </div>
                    </>
                  )}

                  {edits.image_provider === "manus" && (
                    <div className="text-sm text-muted-foreground">
                      <p>The built-in Manus image generation service is pre-configured and requires no additional setup.</p>
                      <p className="mt-2">It uses the Manus Forge API which is automatically authenticated for your project.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ─── Watermark Settings ─── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Image Watermark</CardTitle>
                  <CardDescription>Add a watermark to all generated images to protect your content and promote your brand.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Enable Watermark</label>
                      <p className="text-xs text-muted-foreground">Add a watermark overlay to all generated article images.</p>
                    </div>
                    <Switch
                      checked={edits.watermark_enabled === "true"}
                      onCheckedChange={(checked) => updateEdit("watermark_enabled", checked ? "true" : "false")}
                    />
                  </div>

                  {edits.watermark_enabled === "true" && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Watermark Text</label>
                        <input
                          type="text"
                          value={edits.watermark_text || "hambry.com"}
                          onChange={(e) => updateEdit("watermark_text", e.target.value)}
                          placeholder="hambry.com"
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          The text that will appear on the bottom-right corner of all generated images.
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Opacity: {Math.round((parseFloat(edits.watermark_opacity || "0.7") * 100))}%</label>
                        <Slider
                          value={[parseFloat(edits.watermark_opacity || "0.7") * 100]}
                          onValueChange={([val]) => updateEdit("watermark_opacity", (val / 100).toString())}
                          min={30}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Higher opacity makes the watermark more visible but may distract from the image.
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Position</label>
                        <select
                          value={edits.watermark_position || "bottom-right"}
                          onChange={(e) => updateEdit("watermark_position", e.target.value)}
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        >
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-center">Bottom Center</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Where the watermark will appear on the image.
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Font Size: {edits.watermark_font_size || "16"}px</label>
                        <Slider
                          value={[parseInt(edits.watermark_font_size || "16")]}
                          onValueChange={([val]) => updateEdit("watermark_font_size", val.toString())}
                          min={10}
                          max={32}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Size of the watermark text in pixels.
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Text Color</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateEdit("watermark_text_color", "255,255,255")}
                            className={`flex-1 px-3 py-2 border rounded-md text-sm ${
                              edits.watermark_text_color === "255,255,255" ? "border-primary bg-primary/10" : "border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>
                              White
                            </div>
                          </button>
                          <button
                            onClick={() => updateEdit("watermark_text_color", "0,0,0")}
                            className={`flex-1 px-3 py-2 border rounded-md text-sm ${
                              edits.watermark_text_color === "0,0,0" ? "border-primary bg-primary/10" : "border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-black border border-gray-300"></div>
                              Black
                            </div>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={edits.watermark_text_color || "255,255,255"}
                          onChange={(e) => updateEdit("watermark_text_color", e.target.value)}
                          placeholder="255,255,255"
                          className="w-full px-3 py-2 border rounded-md bg-background mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          RGB color values (e.g., 255,255,255 for white, 0,0,0 for black).
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Background Opacity: {Math.round((parseFloat(edits.watermark_bg_opacity || "0.6") * 100))}%</label>
                        <Slider
                          value={[parseFloat(edits.watermark_bg_opacity || "0.6") * 100]}
                          onValueChange={([val]) => updateEdit("watermark_bg_opacity", (val / 100).toString())}
                          min={0}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Opacity of the dark background behind the watermark text.
                        </p>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-md border border-border">
                        <p className="text-sm font-medium mb-2">Preview</p>
                        <div className="relative w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-md overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-sm">
                            Sample Article Image
                          </div>
                          <div 
                            className={`absolute ${
                              edits.watermark_position === "bottom-left" ? "bottom-2 left-2" :
                              edits.watermark_position === "bottom-center" ? "bottom-2 left-1/2 -translate-x-1/2" :
                              "bottom-2 right-2"
                            } px-2 py-1 rounded font-medium`}
                            style={{
                              backgroundColor: `rgba(0, 0, 0, ${parseFloat(edits.watermark_bg_opacity || "0.6")})`,
                              color: `rgba(${edits.watermark_text_color || "255,255,255"}, ${parseFloat(edits.watermark_opacity || "0.7")})`,
                              fontSize: `${parseInt(edits.watermark_font_size || "16")}px`
                            }}
                          >
                            {edits.watermark_text || "hambry.com"}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ─── Clear Rejected Articles ─── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clear Rejected Articles</CardTitle>
                  <CardDescription>Permanently delete all rejected articles from the database to clean up before batch watermarking.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ClearRejectedArticlesPanel />
                </CardContent>
              </Card>

              {/* ─── Batch Watermark Existing Images ─── */}
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
            </div>
          </TabsContent>

          {/* ─── Video Tools ─── */}
          <TabsContent value="videos">
            <div className="space-y-6">
              {/* Bulk Generation Panel */}
              <BulkVideoGenerationPanel utils={utils} />

              {/* Provider Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Video Generation Provider</CardTitle>
                    <CardDescription>Choose between built-in Manus video generation or external providers like Replicate (Runway, Kling), OpenAI, or custom APIs.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Primary Provider</label>
                      <select
                        value={edits.video_provider || "manus"}
                        onChange={(e) => updateEdit("video_provider", e.target.value)}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="manus">Manus (Built-in)</option>
                        <option value="replicate">Replicate (Runway, Kling, etc.)</option>
                        <option value="openai">OpenAI (Future)</option>
                        <option value="custom">Custom API</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {edits.video_provider === "manus" && "Uses the built-in Manus video generation service (no setup required)."}
                        {edits.video_provider === "replicate" && "Flexible provider with models like Runway Gen-3, Kling AI. Requires API key."}
                        {edits.video_provider === "openai" && "OpenAI video generation (coming soon). Requires API key."}
                        {edits.video_provider === "custom" && "Connect to any custom video generation API endpoint."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Fallback to Manus</label>
                        <p className="text-xs text-muted-foreground">If the primary provider fails, automatically use Manus as backup.</p>
                      </div>
                      <Switch
                        checked={edits.video_provider_fallback_enabled === "true"}
                        onCheckedChange={(checked) => updateEdit("video_provider_fallback_enabled", checked ? "true" : "false")}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Video Settings</CardTitle>
                    <CardDescription>Configure video duration and aspect ratio for generated videos.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Duration: {edits.video_duration || "5"} seconds</label>
                      <Slider
                        value={[parseInt(edits.video_duration || "5")]}
                        onValueChange={([val]) => updateEdit("video_duration", val.toString())}
                        min={5}
                        max={60}
                        step={5}
                        className="mb-1"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Video length in seconds. Longer videos take more time and credits to generate.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Aspect Ratio</label>
                      <select
                        value={edits.video_aspect_ratio || "16:9"}
                        onChange={(e) => updateEdit("video_aspect_ratio", e.target.value)}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="9:16">9:16 (Portrait/Mobile)</option>
                        <option value="1:1">1:1 (Square)</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Choose aspect ratio based on your target platform (YouTube: 16:9, TikTok: 9:16, Instagram: 1:1).
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Video Style & Prompt Template</CardTitle>
                    <CardDescription>Customize how videos are generated by defining the visual style. These settings apply to all providers.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Video Style Prompt</label>
                      <textarea
                        value={edits.video_style_prompt || "Professional news broadcast style, high production quality, cinematic lighting"}
                        onChange={(e) => updateEdit("video_style_prompt", e.target.value)}
                        placeholder="Professional news broadcast style, high production quality, cinematic lighting"
                        rows={3}
                        className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Base style description. Examples: "Professional news broadcast style" (news), "Cinematic, dramatic lighting, film noir" (dramatic), "Animated, cartoon style, vibrant colors" (animated).
                      </p>
                    </div>

                    <div className="p-3 bg-muted rounded-md text-sm">
                      <p className="font-medium mb-1">Final Prompt Preview:</p>
                      <p className="text-muted-foreground italic">
                        {edits.video_style_prompt || "Professional news broadcast style, high production quality, cinematic lighting"}. News headline: [Article Headline]. [Article Subheadline]
                      </p>
                    </div>
                  </CardContent>
                </Card>

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
                          <input
                            type="password"
                            value={edits.video_provider_replicate_api_key || ""}
                            onChange={(e) => updateEdit("video_provider_replicate_api_key", e.target.value)}
                            placeholder="r8_..."
                            className="w-full px-3 py-2 border rounded-md bg-background"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Get your API key from <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Replicate Account</a>.
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Model</label>
                          <input
                            type="text"
                            value={edits.video_provider_replicate_model || "minimax/video-01"}
                            onChange={(e) => updateEdit("video_provider_replicate_model", e.target.value)}
                            placeholder="minimax/video-01"
                            className="w-full px-3 py-2 border rounded-md bg-background"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Popular models: <code className="text-xs bg-muted px-1 rounded">minimax/video-01</code>, <code className="text-xs bg-muted px-1 rounded">kling-ai/kling-v1</code>, <code className="text-xs bg-muted px-1 rounded">runwayml/gen3</code>
                          </p>
                        </div>
                      </>
                    )}

                    {edits.video_provider === "openai" && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">OpenAI API Key</label>
                        <input
                          type="password"
                          value={edits.video_provider_openai_api_key || ""}
                          onChange={(e) => updateEdit("video_provider_openai_api_key", e.target.value)}
                          placeholder="sk-proj-..."
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a>.
                        </p>
                      </div>
                    )}

                    {edits.video_provider === "custom" && (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-2 block">API URL</label>
                          <input
                            type="url"
                            value={edits.video_provider_custom_api_url || ""}
                            onChange={(e) => updateEdit("video_provider_custom_api_url", e.target.value)}
                            placeholder="https://api.example.com/generate-video"
                            className="w-full px-3 py-2 border rounded-md bg-background"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Full URL to your custom video generation endpoint.
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">API Key (Optional)</label>
                          <input
                            type="password"
                            value={edits.video_provider_custom_api_key || ""}
                            onChange={(e) => updateEdit("video_provider_custom_api_key", e.target.value)}
                            placeholder="Bearer token or API key"
                            className="w-full px-3 py-2 border rounded-md bg-background"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Leave empty if your API doesn't require authentication.
                          </p>
                        </div>
                      </>
                    )}

                    {edits.video_provider === "manus" && (
                      <div className="text-sm text-muted-foreground">
                        <p>The built-in Manus video generation service is pre-configured and requires no additional setup.</p>
                        <p className="mt-2">It uses the Manus Forge API which is automatically authenticated for your project.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── Homepage ─── */}
          <TabsContent value="homepage">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Homepage Settings
                </CardTitle>
                <CardDescription>
                  Configure homepage widgets and display options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Trending Time Window: {edits.trending_time_window_hours || "24"} hours
                  </label>
                  <Slider
                    value={[parseInt(edits.trending_time_window_hours || "24")]}
                    onValueChange={([val]) => updateEdit("trending_time_window_hours", val.toString())}
                    min={1}
                    max={168}
                    step={1}
                    className="mb-1"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Time window in hours for calculating trending articles on the homepage. 24 = last 24 hours, 168 = last week.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateEdit("trending_time_window_hours", "24")}
                    >
                      24 hours
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateEdit("trending_time_window_hours", "72")}
                    >
                      3 days
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateEdit("trending_time_window_hours", "168")}
                    >
                      1 week
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Schedule ─── */}
          <TabsContent value="schedule">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Daily Schedule
                  </CardTitle>
                  <CardDescription>Set when the automated workflow runs each day.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Master Switch */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <label className="text-sm font-semibold">Workflow Enabled</label>
                      <p className="text-xs text-muted-foreground">Master switch for the automated daily workflow</p>
                    </div>
                    <Switch
                      checked={edits.workflow_enabled === "true"}
                      onCheckedChange={v => updateEdit("workflow_enabled", String(v))}
                    />
                  </div>

                  {/* Time Picker */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Run Time</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <select
                          value={edits.schedule_hour || "5"}
                          onChange={e => updateEdit("schedule_hour", e.target.value)}
                          className="w-20 px-2 py-2 border border-input rounded text-sm bg-background text-center font-mono"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={String(i)}>
                              {String(i).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                        <span className="text-lg font-bold text-muted-foreground">:</span>
                        <select
                          value={edits.schedule_minute || "0"}
                          onChange={e => updateEdit("schedule_minute", e.target.value)}
                          className="w-20 px-2 py-2 border border-input rounded text-sm bg-background text-center font-mono"
                        >
                          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                            <option key={m} value={String(m)}>
                              {String(m).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime12h(parseInt(edits.schedule_hour || "5"), parseInt(edits.schedule_minute || "0"))}
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> Timezone
                    </label>
                    <select
                      value={edits.schedule_timezone || "America/Los_Angeles"}
                      onChange={e => updateEdit("schedule_timezone", e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                    >
                      {timezones.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Active Days */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Active Days</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "mon", label: "Mon" },
                        { key: "tue", label: "Tue" },
                        { key: "wed", label: "Wed" },
                        { key: "thu", label: "Thu" },
                        { key: "fri", label: "Fri" },
                        { key: "sat", label: "Sat" },
                        { key: "sun", label: "Sun" },
                      ].map(day => {
                        const days = (edits.schedule_days || "mon,tue,wed,thu,fri").split(",").map(s => s.trim());
                        const isActive = days.includes(day.key);
                        return (
                          <button
                            key={day.key}
                            onClick={() => {
                              const updated = isActive
                                ? days.filter(d => d !== day.key)
                                : [...days, day.key];
                              updateEdit("schedule_days", updated.filter(Boolean).join(","));
                            }}
                            className={`w-12 h-10 rounded-lg text-xs font-semibold transition-all ${
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => updateEdit("schedule_days", "mon,tue,wed,thu,fri")}
                        className="text-xs text-primary hover:underline"
                      >
                        Weekdays
                      </button>
                      <span className="text-xs text-muted-foreground">|</span>
                      <button
                        onClick={() => updateEdit("schedule_days", "mon,tue,wed,thu,fri,sat,sun")}
                        className="text-xs text-primary hover:underline"
                      >
                        Every day
                      </button>
                      <span className="text-xs text-muted-foreground">|</span>
                      <button
                        onClick={() => updateEdit("schedule_days", "mon,wed,fri")}
                        className="text-xs text-primary hover:underline"
                      >
                        MWF
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <p className="font-medium mb-1">Schedule Summary</p>
                    <p className="text-xs">
                      The workflow will run at{" "}
                      <span className="font-semibold">
                        {formatTime12h(parseInt(edits.schedule_hour || "5"), parseInt(edits.schedule_minute || "0"))}
                      </span>
                      {" "}({timezones.find(t => t.value === (edits.schedule_timezone || "America/Los_Angeles"))?.label || edits.schedule_timezone})
                      {" "}on{" "}
                      <span className="font-semibold">
                        {formatDaysList(edits.schedule_days || "mon,tue,wed,thu,fri")}
                      </span>.
                    </p>
                    <p className="text-xs mt-1">
                      Each run will gather <span className="font-semibold">{edits.articles_per_batch || "20"}</span> news events and generate satirical articles.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Quick Actions
                    </CardTitle>
                    <CardDescription>Manually trigger or control the workflow.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full justify-start"
                      onClick={handleTriggerNow}
                      disabled={triggerLoading || schedulerStatus?.isRunning}
                    >
                      {triggerLoading || schedulerStatus?.isRunning ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Run Full Workflow Now
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Immediately runs the complete pipeline: gather news, generate articles, and import to Hambry.
                    </p>

                    {schedulerStatus?.isRunning && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Workflow is currently running. This may take several minutes.</span>
                      </div>
                    )}

                    {schedulerStatus?.lastRun && (
                      <div className={`p-3 rounded text-xs flex items-start gap-2 ${
                        schedulerStatus.lastRun.status === "success"
                          ? "bg-green-50 border border-green-200 text-green-700"
                          : schedulerStatus.lastRun.status === "error"
                          ? "bg-red-50 border border-red-200 text-red-700"
                          : "bg-amber-50 border border-amber-200 text-amber-700"
                      }`}>
                        {schedulerStatus.lastRun.status === "success" ? (
                          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">Last run: {schedulerStatus.lastRun.status}</p>
                          <p>{schedulerStatus.lastRun.message}</p>
                          <p className="mt-1 opacity-75">{new Date(schedulerStatus.lastRun.time).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Manual Commands */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Manual Commands</CardTitle>
                    <CardDescription>Run individual workflow stages from the command line.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs space-y-1 overflow-x-auto">
                      <p className="text-gray-500"># Full daily workflow</p>
                      <p className="text-green-400">$ python3 bridge_to_hambry.py full</p>
                      <p className="text-gray-500 mt-3"># Individual stages</p>
                      <p className="text-green-400">$ python3 bridge_to_hambry.py gather</p>
                      <p className="text-green-400">$ python3 bridge_to_hambry.py generate</p>
                      <p className="text-green-400">$ python3 bridge_to_hambry.py import</p>
                      <p className="text-green-400">$ python3 bridge_to_hambry.py social</p>
                      <p className="text-gray-500 mt-3"># Check status</p>
                      <p className="text-green-400">$ python3 bridge_to_hambry.py status</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      The bridge script reads settings from this control panel. Changes take effect on the next run.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── Goodies ─── */}
          <TabsContent value="goodies">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Goodies Features</CardTitle>
                <CardDescription>Enable or disable entertainment features for your site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Enable Horoscopes</label>
                        <p className="text-xs text-muted-foreground">Show daily horoscopes widget on homepage and in Goodies section</p>
                      </div>
                      <Switch
                        checked={edits.enable_horoscopes === "true"}
                        onCheckedChange={(checked) => updateEdit("enable_horoscopes", checked ? "true" : "false")}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4" />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Enable Crossword Puzzles</label>
                        <p className="text-xs text-muted-foreground">Show daily crossword puzzle in Games section</p>
                      </div>
                      <Switch
                        checked={edits.enable_crosswords === "true"}
                        onCheckedChange={(checked) => updateEdit("enable_crosswords", checked ? "true" : "false")}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Horoscopes ─── */}
          <TabsContent value="horoscopes">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Horoscope Generation</CardTitle>
                <CardDescription>Automatically generate horoscopes every day at a specified time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Enable Auto-Generation</label>
                      <p className="text-xs text-muted-foreground">Automatically generate all 12 zodiac signs daily</p>
                    </div>
                    <Switch
                      checked={edits.auto_generate_horoscopes === "true"}
                      onCheckedChange={(checked) => updateEdit("auto_generate_horoscopes", checked ? "true" : "false")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Generation Time</label>
                  <p className="text-xs text-muted-foreground">Time of day to generate horoscopes (24-hour format, e.g., 06:00)</p>
                  <input
                    type="time"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={edits.horoscope_generation_time || "06:00"}
                    onChange={(e) => updateEdit("horoscope_generation_time", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Writing Style</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Style used for automated horoscope generation
                  </p>
                  <HoroscopeStyleSelector
                    selectedStyle={edits.horoscope_default_style || "cosmic-mystic"}
                    onStyleSelect={(styleId) => updateEdit("horoscope_default_style", styleId)}
                    excludedStyles={new Set()}
                    onExcludedStylesChange={() => {}}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Manual Generation</p>
                      <p className="text-xs text-muted-foreground">Generate horoscopes for today immediately</p>
                    </div>
                    <Link href="/admin/horoscopes">
                      <Button variant="outline">
                        <Stars className="w-4 h-4 mr-2" />
                        Go to Horoscopes Manager
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Crossword Generation ─── */}
          <TabsContent value="crosswords">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Crossword Generation</CardTitle>
                <CardDescription>Automatically generate crossword puzzles every day at a specified time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Enable Auto-Generation</label>
                      <p className="text-xs text-muted-foreground">Automatically generate crossword puzzles daily</p>
                    </div>
                    <Switch
                      checked={edits.auto_generate_crosswords === "true"}
                      onCheckedChange={(checked) => updateEdit("auto_generate_crosswords", checked ? "true" : "false")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Generation Time</label>
                  <p className="text-xs text-muted-foreground">Time of day to generate crosswords (24-hour format, e.g., 07:00)</p>
                  <input
                    type="time"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={edits.crossword_generation_time || "07:00"}
                    onChange={(e) => updateEdit("crossword_generation_time", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty Level</label>
                  <p className="text-xs text-muted-foreground mb-3">Difficulty for auto-generated crosswords</p>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={edits.crossword_difficulty || "medium"}
                    onChange={(e) => updateEdit("crossword_difficulty", e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Manual Generation</p>
                      <p className="text-xs text-muted-foreground">Generate crosswords manually</p>
                    </div>
                    <Link href="/admin/crosswords">
                      <Button variant="outline">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Go to Crosswords Manager
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Batch History ─── */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Batch History</CardTitle>
                    <CardDescription>Complete log of all daily workflow runs.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => utils.workflow.list.invalidate()}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!batches || batches.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No workflow batches yet.</p>
                    <p className="text-xs">Run the workflow to see batch history here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Events</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Generated</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Approved</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Published</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map(b => (
                          <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-medium">{b.batchDate}</td>
                            <td className="py-3 px-4"><StatusBadge status={b.status} /></td>
                            <td className="py-3 px-4 text-center">{b.totalEvents}</td>
                            <td className="py-3 px-4 text-center">{b.articlesGenerated}</td>
                            <td className="py-3 px-4 text-center text-green-600 font-medium">{b.articlesApproved}</td>
                            <td className="py-3 px-4 text-center text-blue-600 font-medium">{b.articlesPublished}</td>
                            <td className="py-3 px-4 text-center text-red-600">{b.articlesRejected}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Amazon Associates ─── */}
          <TabsContent value="amazon">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Amazon Associates Settings</CardTitle>
                <CardDescription>Configure Amazon affiliate ads and product recommendations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Enable Amazon Ads</p>
                    <p className="text-xs text-muted-foreground mt-1">Show Amazon product recommendations on your site</p>
                  </div>
                  <Switch
                    checked={edits.amazon_products_enabled === "true"}
                    onCheckedChange={(checked) => updateEdit("amazon_products_enabled", checked ? "true" : "false")}
                  />
                </div>

                {/* Tracking ID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amazon Associate Tag</label>
                  <input
                    type="text"
                    value={edits.amazon_associate_tag || ""}
                    onChange={(e) => updateEdit("amazon_associate_tag", e.target.value)}
                    placeholder="yoursite-20"
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Amazon Associates tracking ID. Find it in your{" "}
                    <a href="https://affiliate-program.amazon.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Amazon Associates dashboard
                    </a>
                  </p>
                </div>

                {/* Product Keywords */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Search Keywords</label>
                  <input
                    type="text"
                    value={edits.amazon_product_keywords ? JSON.parse(edits.amazon_product_keywords).join(", ") : ""}
                    onChange={(e) => {
                      const keywords = e.target.value.split(",").map(k => k.trim()).filter(Boolean);
                      updateEdit("amazon_product_keywords", JSON.stringify(keywords));
                    }}
                    placeholder="satire, comedy, political humor, books"
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated keywords for product recommendations. These are combined with article content for better targeting.
                  </p>
                </div>

                {/* Cache TTL */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cache Duration (hours)</label>
                  <input
                    type="number"
                    value={edits.amazon_cache_ttl_hours || "24"}
                    onChange={(e) => updateEdit("amazon_cache_ttl_hours", e.target.value)}
                    min="1"
                    max="168"
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    How long to cache product data before refreshing (1-168 hours)
                  </p>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm space-y-1">
                      <p className="font-medium text-blue-900">Important Notes</p>
                      <ul className="text-blue-700 space-y-1 list-disc list-inside text-xs">
                        <li>Amazon ads only display on published sites, not in preview mode</li>
                        <li>It may take 24-48 hours for Amazon to approve your tracking ID</li>
                        <li>Ads are shown on article pages (after source attribution) and homepage sidebar</li>
                        <li>Monitor your earnings in the Amazon Associates dashboard</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </AdminLayout>
  );
}

// ─── Helper Components ──────────────────────────────────

function QuickStat({ icon, label, value, color, href }: { icon: React.ReactNode; label: string; value: number | string; color?: string; href?: string }) {
  const colorClasses: Record<string, string> = {
    amber: "text-amber-600",
    green: "text-green-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    red: "text-red-600",
  };
  
  const content = (
    <Card className={href ? "cursor-pointer hover:shadow-md transition-shadow" : ""}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-xl font-bold ${color ? colorClasses[color] || "" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
  
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function getStageIndex(status: string): number {
  const stages = ["gathering", "generating", "pending_approval", "approved", "publishing", "completed"];
  return stages.indexOf(status);
}

function formatTime12h(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function formatDaysList(days: string): string {
  const dayNames: Record<string, string> = {
    mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
    fri: "Friday", sat: "Saturday", sun: "Sunday",
  };
  const dayList = days.split(",").map(d => dayNames[d.trim()] || d.trim());
  if (dayList.length === 7) return "every day";
  if (dayList.length === 5 && !days.includes("sat") && !days.includes("sun")) return "weekdays";
  if (dayList.length === 2 && days.includes("sat") && days.includes("sun")) return "weekends";
  return dayList.join(", ");
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    gathering: "bg-blue-100 text-blue-700",
    generating: "bg-purple-100 text-purple-700",
    pending_approval: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    publishing: "bg-indigo-100 text-indigo-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}>{status.replace("_", " ")}</span>;
}
