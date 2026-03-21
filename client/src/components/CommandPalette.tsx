import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, FileText, Sparkles, FolderOpen,
  Mail, Play, PlusCircle, Search, Command, Filter, Send,
  TrendingUp, Key, Timer, Zap, Image, Video,
  Share2, Globe, Calendar, ShoppingCart, Palette,
} from "lucide-react";

interface CmdItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  group: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const nav = (path: string) => () => { setLocation(path); onOpenChange(false); };

  const commands: CmdItem[] = useMemo(() => [
    // Navigation — Overview
    { id: "nav-dashboard", label: "Dashboard", description: "Admin overview & stats", icon: LayoutDashboard, action: nav("/admin"), keywords: ["home", "overview", "stats"], group: "Navigate" },
    { id: "nav-workflow", label: "Workflow", description: "Scheduler status & batch history", icon: Timer, action: nav("/admin/workflow"), keywords: ["workflow", "batch", "run"], group: "Navigate" },
    { id: "nav-schedule", label: "Schedule", description: "Configure generation schedule", icon: Calendar, action: nav("/admin/settings/schedule"), keywords: ["schedule", "time", "timezone", "cron"], group: "Navigate" },
    { id: "nav-homepage", label: "Homepage", description: "Homepage layout & trending settings", icon: Globe, action: nav("/admin/settings/homepage"), keywords: ["homepage", "trending", "layout", "tagline"], group: "Navigate" },
    // Navigation — Content
    { id: "nav-articles", label: "Articles", description: "Manage all articles", icon: FileText, action: nav("/admin/articles"), keywords: ["posts", "content", "manage"], group: "Navigate" },
    { id: "nav-ai", label: "AI Generator", description: "Generate content with AI", icon: Sparkles, action: nav("/admin/ai"), keywords: ["generate", "create", "artificial intelligence"], group: "Navigate" },
    { id: "nav-generation", label: "Generation", description: "Article volume, writing style & AI settings", icon: Zap, action: nav("/admin/settings/generation"), keywords: ["volume", "writing", "style", "batch", "length"], group: "Navigate" },
    { id: "nav-categories", label: "Categories", description: "Manage categories", icon: FolderOpen, action: nav("/admin/categories"), keywords: ["tags", "organize"], group: "Navigate" },
    { id: "nav-source-feeds", label: "Source Feeds", description: "Manage RSS sources & blocking", icon: Filter, action: nav("/admin/source-feeds"), keywords: ["rss", "sources", "block", "feeds"], group: "Navigate" },
    { id: "nav-publishing", label: "Publishing", description: "Auto-publish speed & settings", icon: Send, action: nav("/admin/settings/publishing"), keywords: ["publish", "auto", "speed", "stagger"], group: "Navigate" },
    { id: "nav-images", label: "Images", description: "Image generation, style & watermark", icon: Image, action: nav("/admin/settings/images"), keywords: ["image", "watermark", "style", "provider", "openai", "replicate"], group: "Navigate" },
    { id: "nav-videos", label: "Videos", description: "Video generation provider & settings", icon: Video, action: nav("/admin/settings/videos"), keywords: ["video", "provider", "duration", "aspect"], group: "Navigate" },
    // Navigation — Games
    // Navigation — Distribution
    { id: "nav-x-queue", label: "X Post Queue", description: "Manage X/Twitter post queue", icon: Send, action: nav("/admin/x-queue"), keywords: ["twitter", "social", "post", "queue"], group: "Navigate" },
    { id: "nav-social", label: "Social Media", description: "Social distribution & Reddit settings", icon: Share2, action: nav("/admin/settings/social"), keywords: ["social", "reddit", "distribution", "platforms"], group: "Navigate" },
    { id: "nav-newsletter", label: "Newsletter", description: "Manage subscribers", icon: Mail, action: nav("/admin/newsletter"), keywords: ["email", "subscribers"], group: "Navigate" },
    { id: "nav-amazon", label: "Amazon Ads", description: "Amazon Associates ad settings", icon: ShoppingCart, action: nav("/admin/settings/amazon"), keywords: ["amazon", "ads", "affiliate", "associate"], group: "Navigate" },
    // Navigation — Insights
    { id: "nav-search-analytics", label: "Search Analytics", description: "Popular search terms", icon: TrendingUp, action: nav("/admin/search-analytics"), keywords: ["analytics", "search", "popular"], group: "Navigate" },
    { id: "nav-licenses", label: "Licenses", description: "Manage licenses", icon: Key, action: nav("/admin/licenses"), keywords: ["license", "key"], group: "Navigate" },
    { id: "nav-branding", label: "Branding", description: "Customize brand identity, colors, and contact info", icon: Palette, action: nav("/admin/settings/branding"), keywords: ["brand", "logo", "color", "white label", "identity"], group: "Navigate" },
    // Actions
    { id: "action-new-article", label: "New Article", description: "Create a new article", icon: PlusCircle, action: nav("/admin/articles/new"), keywords: ["create", "write", "post"], group: "Actions" },
    { id: "action-run-workflow", label: "Run Workflow", description: "Execute daily workflow", icon: Play, action: nav("/admin/workflow"), keywords: ["execute", "start", "batch"], group: "Actions" },
    { id: "action-search", label: "Search Articles", description: "Find articles by keyword", icon: Search, action: nav("/admin/articles"), keywords: ["find", "lookup"], group: "Actions" },
  ], [setLocation, onOpenChange]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lq = query.toLowerCase();
    return commands.filter(cmd => {
      return cmd.label.toLowerCase().includes(lq)
        || cmd.description?.toLowerCase().includes(lq)
        || cmd.keywords?.some(kw => kw.includes(lq));
    });
  }, [query, commands]);

  // Group filtered commands
  const grouped = useMemo(() => {
    const groups: Record<string, CmdItem[]> = {};
    for (const cmd of filteredCommands) {
      if (!groups[cmd.group]) groups[cmd.group] = [];
      groups[cmd.group].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  const flatFiltered = useMemo(() => filteredCommands, [filteredCommands]);

  useEffect(() => { setSelectedIndex(0); }, [filteredCommands]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % flatFiltered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + flatFiltered.length) % flatFiltered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        flatFiltered[selectedIndex]?.action();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, flatFiltered, selectedIndex]);

  useEffect(() => {
    if (!open) { setQuery(""); setSelectedIndex(0); }
  }, [open]);

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden">
        <div className="flex items-center border-b border-border px-3">
          <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-2 shrink-0">
            ESC
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group}
                </p>
                {items.map(cmd => {
                  runningIndex++;
                  const idx = runningIndex;
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected ? "bg-primary/10 text-foreground" : "hover:bg-accent/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{cmd.label}</div>
                        {cmd.description && (
                          <div className="text-[11px] text-muted-foreground truncate">{cmd.description}</div>
                        )}
                      </div>
                      {isSelected && (
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>+K to open</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
