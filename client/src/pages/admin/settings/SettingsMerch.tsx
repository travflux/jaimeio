import { useState, useMemo } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShoppingBag, RefreshCw, CheckCircle, XCircle, AlertCircle, Trash2, Wand2, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

const PRODUCT_TYPES = ["mug", "shirt", "poster", "case", "canvas", "tote", "hoodie", "mousepad", "candle", "cards"] as const;
type ProductType = typeof PRODUCT_TYPES[number];

const PRODUCT_META: Record<ProductType, { icon: string; label: string }> = {
  mug:      { icon: "☕", label: "Mug" },
  shirt:    { icon: "👕", label: "T-Shirt" },
  poster:   { icon: "🖼",  label: "Framed Poster" },
  case:     { icon: "📱", label: "Phone Case" },
  canvas:   { icon: "🎨", label: "Canvas Print" },
  tote:     { icon: "👜", label: "Tote Bag" },
  hoodie:   { icon: "🧥", label: "Hoodie" },
  mousepad: { icon: "🖱",  label: "Desk Mat" },
  candle:   { icon: "🕯",  label: "Scented Candle" },
  cards:    { icon: "🃏", label: "Playing Cards" },
};

type SyncRow = {
  printifyProductId: string;
  printifyTitle: string;
  localType: string | null;
  isActive: boolean;
  isNew: boolean;
  variantCount: number;
};

// Blank mockup CDN URLs (same as server/routers/merch.ts)
const BLANK_MOCKUP_URLS: Record<ProductType, string> = {
  mug:      "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/mug-blank_750ed133.png",
  shirt:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/shirt-blank_96ea0f08.png",
  poster:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/poster-blank_d34d754d.png",
  case:     "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/case-blank_45ee451d.png",
  canvas:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/canvas-blank_b2f81ee8.png",
  tote:     "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/tote-blank_5cbad66c.png",
  hoodie:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/hoodie-blank_3717ba2f.png",
  mousepad: "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/mousepad-blank_6fba4e35.png",
  candle:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/candle-blank_a434bd7f.png",
  cards:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/cards-blank_b97c3122.png",
};

type PrintConfig = {
  x: number;
  y: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  skewX?: number;
  skewY?: number;
};

const DEFAULT_PRINT_CONFIGS: Record<ProductType, PrintConfig> = {
  mug:      { x: 0.5, y: 0.5,  scale: 0.393 },
  shirt:    { x: 0.5, y: 0.42, scale: 0.60  },
  poster:   { x: 0.5, y: 0.5,  scale: 0.990 },
  case:     { x: 0.5, y: 0.55, scale: 0.719 },
  canvas:   { x: 0.5, y: 0.5,  scale: 0.750 },
  tote:     { x: 0.5, y: 0.5,  scale: 1.023 },
  hoodie:   { x: 0.5, y: 0.5,  scale: 1.035 },
  mousepad: { x: 0.5, y: 0.5,  scale: 0.621 },
  candle:   { x: 0.5, y: 0.5,  scale: 0.783 },
  cards:    { x: 0.5, y: 0.5,  scale: 1.211 },
};

/** Print area calibration card — sliders for x, y, scale per product with live preview */
function PrintAreaCalibrationCard({
  edits,
  updateEdit,
}: {
  edits: Record<string, string>;
  updateEdit: (key: string, value: string) => void;
}) {
  const [selectedType, setSelectedType] = useState<ProductType>("shirt");

  // Read current config from edits (fall back to defaults)
  function getConfig(type: ProductType): PrintConfig {
    const raw = edits[`merch_print_config_${type}`];
    if (raw) {
      try { return JSON.parse(raw) as PrintConfig; } catch {}
    }
    return DEFAULT_PRINT_CONFIGS[type];
  }

  const cfg = getConfig(selectedType);

  function setField(field: keyof PrintConfig, val: number) {
    const next = { ...cfg, [field]: val };
    updateEdit(`merch_print_config_${selectedType}`, JSON.stringify(next));
  }

  // Overlay rect in %
  const pctW    = (cfg.scaleX ?? cfg.scale) * 100;
  const pctH    = (cfg.scaleY ?? cfg.scale) * 100;
  const pctLeft = cfg.x * 100 - pctW / 2;
  const pctTop  = cfg.y * 100 - pctH / 2;

  // CSS transform for rotation + skew
  const transformParts: string[] = [];
  if (cfg.rotate) transformParts.push(`rotate(${cfg.rotate}deg)`);
  if (cfg.skewX)  transformParts.push(`skewX(${cfg.skewX}deg)`);
  if (cfg.skewY)  transformParts.push(`skewY(${cfg.skewY}deg)`);
  const previewTransform = transformParts.length ? transformParts.join(" ") : "none";

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Print Area Calibration</CardTitle>
        <CardDescription>
          Adjust the x, y, and scale values that define where the design artwork is positioned on each product.
          The dashed red rectangle shows the print area on the blank mockup. Changes are saved with the rest of the settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: controls */}
          <div className="space-y-5">
            {/* Product selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Product</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRODUCT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                      selectedType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    {PRODUCT_META[t].icon} {PRODUCT_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            {/* X slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Horizontal (x)</label>
                <span className="text-xs font-mono text-muted-foreground">{cfg.x.toFixed(3)}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.005}
                value={cfg.x}
                onChange={(e) => setField("x", parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">0 = left edge, 0.5 = center, 1 = right edge</p>
            </div>

            {/* Y slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Vertical (y)</label>
                <span className="text-xs font-mono text-muted-foreground">{cfg.y.toFixed(3)}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.005}
                value={cfg.y}
                onChange={(e) => setField("y", parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">0 = top edge, 0.5 = center, 1 = bottom edge</p>
            </div>

            {/* Scale (uniform) slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Scale (uniform)</label>
                <span className="text-xs font-mono text-muted-foreground">{cfg.scale.toFixed(3)}</span>
              </div>
              <input
                type="range" min={0.1} max={1.5} step={0.005}
                value={cfg.scale}
                onChange={(e) => setField("scale", parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">Uniform scale — overridden per-axis by Scale X / Y below</p>
            </div>

            {/* Scale X slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Scale X (horizontal stretch)</label>
                <span className="text-xs font-mono text-muted-foreground">{(cfg.scaleX ?? cfg.scale).toFixed(3)}</span>
              </div>
              <input
                type="range" min={0.05} max={2.0} step={0.005}
                value={cfg.scaleX ?? cfg.scale}
                onChange={(e) => setField("scaleX", parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">Independent horizontal width of the print area</p>
            </div>

            {/* Scale Y slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Scale Y (vertical stretch)</label>
                <span className="text-xs font-mono text-muted-foreground">{(cfg.scaleY ?? cfg.scale).toFixed(3)}</span>
              </div>
              <input
                type="range" min={0.05} max={2.0} step={0.005}
                value={cfg.scaleY ?? cfg.scale}
                onChange={(e) => setField("scaleY", parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">Independent vertical height of the print area</p>
            </div>

            {/* Rotation slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Rotation</label>
                <span className="text-xs font-mono text-muted-foreground">{(cfg.rotate ?? 0).toFixed(1)}°</span>
              </div>
              <input
                type="range" min={-45} max={45} step={0.5}
                value={cfg.rotate ?? 0}
                onChange={(e) => setField("rotate", parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">−45° to +45° — useful for products where the design is angled</p>
            </div>

            {/* Skew X slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Skew X (horizontal shear)</label>
                <span className="text-xs font-mono text-muted-foreground">{(cfg.skewX ?? 0).toFixed(1)}°</span>
              </div>
              <input
                type="range" min={-30} max={30} step={0.5}
                value={cfg.skewX ?? 0}
                onChange={(e) => setField("skewX", parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">Shear the design horizontally to follow a curved surface</p>
            </div>

            {/* Skew Y slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Skew Y (vertical shear)</label>
                <span className="text-xs font-mono text-muted-foreground">{(cfg.skewY ?? 0).toFixed(1)}°</span>
              </div>
              <input
                type="range" min={-30} max={30} step={0.5}
                value={cfg.skewY ?? 0}
                onChange={(e) => setField("skewY", parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">Shear the design vertically to follow a curved surface</p>
            </div>

            {/* Reset to default */}
            <button
              onClick={() => updateEdit(`merch_print_config_${selectedType}`, JSON.stringify(DEFAULT_PRINT_CONFIGS[selectedType]))}
              className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
            >
              Reset {PRODUCT_META[selectedType].label} to default
            </button>
          </div>

          {/* Right: live preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Live Preview — {PRODUCT_META[selectedType].label}</p>
            <div className="relative aspect-square bg-[#F5F0EB] border border-border rounded-md overflow-hidden">
              <img
                src={BLANK_MOCKUP_URLS[selectedType]}
                alt={`${selectedType} blank mockup`}
                className="w-full h-full object-contain"
              />
              {/* Print area overlay */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${pctLeft}%`,
                  top: `${pctTop}%`,
                  width: `${pctW}%`,
                  height: `${pctH}%`,
                  border: "2px dashed rgba(196,30,58,0.85)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.5)",
                  borderRadius: "2px",
                  background: "rgba(196,30,58,0.06)",
                  transform: previewTransform !== "none" ? previewTransform : undefined,
                  transformOrigin: "center center",
                }}
              >
                <span
                  className="absolute -top-5 left-0 text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: "rgba(196,30,58,0.9)", textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
                >
                  Print area
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Drag the sliders to align the dashed rectangle with the actual print area on the product photo.
              Save settings when done.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsMerch() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();

  // Manual sync state
  const [syncResult, setSyncResult] = useState<{
    rows: SyncRow[];
    removed: { localType: string; printifyProductId: string }[];
    syncedAt: string;
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const syncMutation = trpc.merch.syncFromPrintify.useMutation({
    onSuccess: (data) => {
      setSyncResult(data);
      setSyncError(null);
      computeProposedChanges(data);
    },
    onError: (err) => {
      setSyncError(err.message);
      setSyncResult(null);
    },
  });

  const removeFromSync = trpc.merch.removeFromSync.useMutation({
    onSuccess: (data, variables) => {
      setRemovingId(null);
      if (syncResult) {
        setSyncResult({
          ...syncResult,
          rows: syncResult.rows.filter(r => r.printifyProductId !== variables.printifyProductId),
        });
      }
    },
    onError: () => {
      setRemovingId(null);
    },
  });

  const updateProductSettings = trpc.merch.updateProductSettings.useMutation();

  // ── Review-and-apply state ──────────────────────────────────────────────────
  // Proposed changes derived from syncResult: deactivate removed, assignType unmapped
  type ProposedChange =
    | { kind: "deactivate"; localType: ProductType; label: string; apply: boolean }
    | { kind: "assignType"; printifyProductId: string; localType: ProductType; label: string; apply: boolean; assignedType: ProductType | "" }
    | { kind: "removeFromSidebar"; localType: ProductType; label: string; apply: boolean };

  const [proposedChanges, setProposedChanges] = useState<ProposedChange[]>([]);
  const [applyDone, setApplyDone] = useState(false);

  // Recompute proposed changes whenever syncResult changes
  const computeProposedChanges = (result: typeof syncResult) => {
    if (!result) { setProposedChanges([]); setApplyDone(false); return; }
    const changes: ProposedChange[] = [];
    // Removed from Printify → propose deactivate + remove from sidebar
    for (const r of result.removed) {
      const lt = r.localType as ProductType;
      changes.push({ kind: "deactivate", localType: lt, label: `Deactivate ${PRODUCT_META[lt]?.label ?? lt} (missing from Printify)`, apply: true });
      changes.push({ kind: "removeFromSidebar", localType: lt, label: `Remove ${PRODUCT_META[lt]?.label ?? lt} from article sidebar`, apply: true });
    }
    // Unmapped (new in Printify, no local type) → propose assignType
    for (const row of result.rows) {
      if (row.isNew) {
        changes.push({ kind: "assignType", printifyProductId: row.printifyProductId, localType: "mug" as ProductType, label: `Map "${row.printifyTitle}" to a product type`, apply: false, assignedType: "" });
      }
    }
    setProposedChanges(changes);
    setApplyDone(false);
  };

  const applySyncMutation = trpc.merch.applySync.useMutation({
    onSuccess: (data) => {
      setApplyDone(true);
      toast.success(`Applied ${data.appliedCount} change${data.appliedCount !== 1 ? "s" : ""}. Reload to see updated catalog.`);
    },
    onError: (err) => toast.error(`Apply failed: ${err.message}`),
  });

  const handleApplySync = () => {
    const toSend = proposedChanges
      .filter(c => c.apply)
      .map(c => {
        if (c.kind === "assignType") {
          return { kind: "assignType" as const, printifyProductId: c.printifyProductId, localType: c.assignedType as ProductType, apply: true };
        }
        return { kind: c.kind, localType: c.localType, apply: true };
      })
      .filter(c => c.kind !== "assignType" || (c as { kind: "assignType"; localType: ProductType }).localType);
    if (toSend.length === 0) { toast.info("No changes selected."); return; }
    applySyncMutation.mutate({ changes: toSend });
  };

  // Sidebar selection: derive ordered list from sidebarPosition settings
  // sidebarProducts = array of types ordered by position (position 1..5)
  const sidebarProducts = useMemo(() => {
    const withPos = PRODUCT_TYPES
      .map(t => ({ type: t, pos: parseInt(edits[`merch_sidebar_position_${t}`] ?? "0", 10) }))
      .filter(x => x.pos > 0)
      .sort((a, b) => a.pos - b.pos);
    return withPos.map(x => x.type);
  }, [edits]);

  const toggleSidebar = (type: ProductType) => {
    const idx = sidebarProducts.indexOf(type);
    if (idx >= 0) {
      // Remove: set position to 0
      updateEdit(`merch_sidebar_position_${type}`, "0");
      updateProductSettings.mutate({ type, sidebarPosition: 0 });
      // Re-compact remaining positions
      const remaining = sidebarProducts.filter(t => t !== type);
      remaining.forEach((t, i) => {
        updateEdit(`merch_sidebar_position_${t}`, String(i + 1));
        updateProductSettings.mutate({ type: t, sidebarPosition: i + 1 });
      });
    } else {
      if (sidebarProducts.length >= 5) return; // max 5
      const newPos = sidebarProducts.length + 1;
      updateEdit(`merch_sidebar_position_${type}`, String(newPos));
      updateProductSettings.mutate({ type, sidebarPosition: newPos });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const lastAvailCheck = edits.merch_last_availability_check;
  const lastManualSync = edits.merch_last_manual_sync;

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Merch Store"
        description="Configure the per-article merchandise store powered by Printify. Blank mockups render instantly — zero Printify API calls during shopping."
        icon={<ShoppingBag className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Enable / Sidebar ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Article Merch Sidebar</CardTitle>
              <CardDescription>
                Shows a merch sidebar on every article page. Desktop: right column. Mobile: strip below article body.
                Zero API calls on article pages — blank mockup renders instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Enable Merch Sidebar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Show merch options on all article pages
                  </p>
                </div>
                <Switch
                  checked={edits.merch_sidebar_enabled === "true"}
                  onCheckedChange={(checked) => updateEdit("merch_sidebar_enabled", checked ? "true" : "false")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Markup Percentage</label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={edits.merch_markup_percent || "50"}
                  onChange={(e) => updateEdit("merch_markup_percent", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Percentage markup above Printify base cost. 50 = 50% markup. Sell price is rounded to .99.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Printify API ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Printify API</CardTitle>
              <CardDescription>
                Connect your Printify account. Get your API token from Printify → Profile → Connections → API access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">API Token</label>
                <input
                  type="password"
                  value={edits.merch_printify_api_token || ""}
                  onChange={(e) => updateEdit("merch_printify_api_token", e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Bearer token from your Printify account. Stored encrypted.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Shop ID</label>
                <input
                  type="text"
                  value={edits.merch_printify_shop_id || ""}
                  onChange={(e) => updateEdit("merch_printify_shop_id", e.target.value)}
                  placeholder="12345678"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Your Printify shop ID (visible in the shop URL or via the Printify API).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Product Active Controls ── */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Product Catalog</CardTitle>
              <CardDescription>
                Toggle products on/off. Active products appear on the shop page. Use the sidebar selector below to choose which products appear in the article sidebar teaser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {PRODUCT_TYPES.map((type) => {
                  const meta = PRODUCT_META[type];
                  const activeKey = `merch_product_active_${type}`;
                  const isActive = edits[activeKey] !== "false";

                  return (
                    <div
                      key={type}
                      className={`border rounded-lg p-3 flex items-center justify-between gap-2 transition-opacity ${isActive ? "" : "opacity-50"}`}
                    >
                      <span className="text-sm font-medium truncate">{meta.icon} {meta.label}</span>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => {
                          updateEdit(activeKey, checked ? "true" : "false");
                          updateProductSettings.mutate({ type, active: checked });
                          // If deactivating, also remove from sidebar
                          if (!checked && sidebarProducts.includes(type)) {
                            toggleSidebar(type);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Article Sidebar Products ── */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Article Sidebar Products</CardTitle>
              <CardDescription>
                Select up to 5 products to show in the article page sidebar teaser. Order determines display sequence.
                Products not selected here still appear on the full shop page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Selected products — ordered list */}
                {sidebarProducts.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Current sidebar order</p>
                    <div className="flex flex-wrap gap-2">
                      {sidebarProducts.map((type, idx) => (
                        <span key={type} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">
                          <span className="text-xs text-primary/60">{idx + 1}.</span>
                          {PRODUCT_META[type].icon} {PRODUCT_META[type].label}
                          <button
                            onClick={() => toggleSidebar(type)}
                            className="ml-1 text-primary/60 hover:text-destructive transition-colors text-xs leading-none"
                            title="Remove from sidebar"
                          >✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* All active products — checkbox grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {PRODUCT_TYPES.map((type) => {
                    const isActive = edits[`merch_product_active_${type}`] !== "false";
                    if (!isActive) return null;
                    const inSidebar = sidebarProducts.includes(type);
                    const atMax = sidebarProducts.length >= 5 && !inSidebar;
                    return (
                      <button
                        key={type}
                        onClick={() => !atMax && toggleSidebar(type)}
                        disabled={atMax}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                          inSidebar
                            ? "bg-primary text-primary-foreground border-primary"
                            : atMax
                            ? "opacity-40 cursor-not-allowed border-border"
                            : "border-border hover:border-primary hover:bg-primary/5"
                        }`}
                      >
                        <span>{PRODUCT_META[type].icon}</span>
                        <span className="truncate">{PRODUCT_META[type].label}</span>
                      </button>
                    );
                  })}
                </div>

                {sidebarProducts.length >= 5 && (
                  <p className="text-xs text-amber-600 mt-2">Maximum 5 sidebar products selected. Remove one to add another.</p>
                )}
                {sidebarProducts.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">No products selected. The sidebar will be hidden even if enabled.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Manual Sync from Printify ── */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Sync from Printify</CardTitle>
              <CardDescription>
                Pull the latest product list from Printify and compare against local config.
                Use this after adding, removing, or renaming products in Printify.
                Use the <strong>Remove</strong> button to discard any entries that are not real products (e.g., test articles or drafts).
                {lastManualSync && (
                  <span className="block mt-1 text-xs text-muted-foreground">
                    Last synced: {new Date(lastManualSync).toLocaleString()}
                  </span>
                )}
                {lastAvailCheck && (
                  <span className="block text-xs text-muted-foreground">
                    Last auto-check: {new Date(lastAvailCheck).toLocaleString()}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {syncMutation.isPending ? "Syncing…" : "Sync from Printify"}
              </button>

              {syncError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{syncError}</p>
                </div>
              )}

              {syncResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Synced at {new Date(syncResult.syncedAt).toLocaleString()}</span>
                  </div>

                  {/* Live products — mobile-friendly card list */}
                  <div className="space-y-2">
                    {syncResult.rows.map((row) => (
                      <div
                        key={row.printifyProductId}
                        className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-muted/20 transition-colors"
                      >
                        {/* Title + ID */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={row.printifyTitle}>
                            {row.printifyTitle}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            ID: {row.printifyProductId}
                          </p>
                        </div>

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                          {/* Local type */}
                          {row.localType ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                              {row.localType}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3" /> Unmapped
                            </span>
                          )}

                          {/* Variant count */}
                          <span className="text-muted-foreground">
                            {row.variantCount} variant{row.variantCount !== 1 ? "s" : ""}
                          </span>

                          {/* Status */}
                          {!row.isNew && (
                            row.isActive ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <XCircle className="w-3 h-3" /> Paused
                              </span>
                            )
                          )}

                          {/* Remove button */}
                          <button
                            onClick={() => {
                              if (!confirm(`Remove "${row.printifyTitle}" from local sync mapping?\n\nThis will not delete the product from Printify — it only removes the local mapping so it no longer appears in this list.`)) return;
                              setRemovingId(row.printifyProductId);
                              removeFromSync.mutate({ printifyProductId: row.printifyProductId });
                            }}
                            disabled={removingId === row.printifyProductId}
                            title="Remove from local sync mapping"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-destructive/20"
                          >
                            {removingId === row.printifyProductId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Review-and-Apply Panel ── */}
                  {proposedChanges.length > 0 && !applyDone && (
                    <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-amber-700" />
                        <p className="text-sm font-semibold text-amber-900">Proposed Changes</p>
                        <span className="ml-auto text-xs text-amber-700">{proposedChanges.filter(c => c.apply).length} of {proposedChanges.length} selected</span>
                      </div>
                      <p className="text-xs text-amber-700">Review and check the changes you want to apply. Uncheck any you want to skip.</p>
                      <div className="space-y-2">
                        {proposedChanges.map((change, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white border border-amber-100 rounded-md p-2.5">
                            <label className="flex items-center gap-2 flex-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={change.apply}
                                onChange={(e) => {
                                  setProposedChanges(prev => prev.map((c, i) => i === idx ? { ...c, apply: e.target.checked } : c));
                                }}
                                className="w-4 h-4 rounded border-amber-300 accent-amber-600"
                              />
                              <span className="text-sm text-amber-900">{change.label}</span>
                            </label>
                            {change.kind === "assignType" && change.apply && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <ArrowRight className="w-3 h-3 text-amber-500" />
                                <select
                                  value={change.assignedType}
                                  onChange={(e) => {
                                    setProposedChanges(prev => prev.map((c, i) =>
                                      i === idx ? { ...c, assignedType: e.target.value as ProductType | "" } : c
                                    ));
                                  }}
                                  className="text-xs border border-amber-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                                >
                                  <option value="">— pick type —</option>
                                  {PRODUCT_TYPES.map(t => (
                                    <option key={t} value={t}>{PRODUCT_META[t].icon} {PRODUCT_META[t].label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleApplySync}
                        disabled={applySyncMutation.isPending || proposedChanges.filter(c => c.apply).length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {applySyncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {applySyncMutation.isPending ? "Applying…" : `Apply ${proposedChanges.filter(c => c.apply).length} Change${proposedChanges.filter(c => c.apply).length !== 1 ? "s" : ""}`}
                      </button>
                    </div>
                  )}
                  {applyDone && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-green-700">Changes applied. Scroll up to see updated Product Catalog and Sidebar.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Print Area Calibration ── */}
          <PrintAreaCalibrationCard edits={edits} updateEdit={updateEdit} />

          {/* ── Blueprint IDs (advanced) ── */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Blueprint IDs (Advanced)</CardTitle>
              <CardDescription>
                Each product type maps to a Printify blueprint. These are pre-configured from the inventory pull.
                Only change these if you swap to a different product type in Printify.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { key: "merch_blueprint_mug",       label: "☕ Mug" },
                  { key: "merch_blueprint_shirt",     label: "👕 T-Shirt" },
                  { key: "merch_blueprint_poster",    label: "🖼 Poster" },
                  { key: "merch_blueprint_case",      label: "📱 Phone Case" },
                  { key: "merch_blueprint_canvas",    label: "🎨 Canvas" },
                  { key: "merch_blueprint_tote",      label: "👜 Tote" },
                  { key: "merch_blueprint_hoodie",    label: "🧥 Hoodie" },
                  { key: "merch_blueprint_mousepad",  label: "🖱 Desk Mat" },
                  { key: "merch_blueprint_candle",    label: "🕯 Candle" },
                  { key: "merch_blueprint_cards",     label: "🃏 Cards" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <input
                      type="text"
                      value={edits[key] || ""}
                      onChange={(e) => updateEdit(key, e.target.value)}
                      placeholder="Blueprint ID"
                      className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Setup Checklist ── */}
          <Card className="lg:col-span-2 border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-base text-amber-900">Setup Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-sm text-amber-800 space-y-1.5 list-decimal list-inside">
                <li>Paste your Printify API token and Shop ID above, then save.</li>
                <li>Click "Sync from Printify" to verify all 10 products are live.</li>
                <li>Use the <strong>Remove</strong> button to discard any non-product entries (test articles, drafts, etc.).</li>
                <li>Confirm no products show "Unmapped" or "Missing from Printify".</li>
                <li>Enable the Merch Sidebar toggle above.</li>
                <li>Visit any article page to verify the sidebar renders instantly.</li>
                <li>Test the checkout flow: click a product → enter email → verify redirect to your Printify storefront.</li>
              </ol>
            </CardContent>
          </Card>

        </div>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
