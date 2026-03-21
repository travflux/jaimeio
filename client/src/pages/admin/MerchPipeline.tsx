import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle2, Clock, Search } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  ready: {
    label: "Ready",
    variant: "default" as const,
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    icon: AlertCircle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

const PRODUCT_LABELS: Record<string, string> = {
  mug: "Mug",
  shirt: "T-Shirt",
  poster: "Poster",
  case: "Phone Case",
  canvas: "Canvas",
  tote: "Tote",
  hoodie: "Hoodie",
  mousepad: "Desk Mat",
  candle: "Candle",
  cards: "Cards",
};

const BLANK_MOCKUP_URLS: Record<string, string> = {
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

const DEFAULT_PRINT_CONFIGS: Record<string, { x: number; y: number; scale: number }> = {
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

/**
 * Compact 56px square preview: article design image overlaid on blank mockup
 * with a dashed print-area rectangle. Clicking opens a larger popover.
 */
function MiniPrintPreview({
  articleImageUrl,
  productType,
  printConfig,
}: {
  articleImageUrl: string | null;
  productType: string;
  printConfig: { x: number; y: number; scale: number };
}) {
  const [expanded, setExpanded] = useState(false);
  const mockupUrl = BLANK_MOCKUP_URLS[productType];

  const pctW    = printConfig.scale * 100;
  const pctH    = pctW;
  const pctLeft = printConfig.x * 100 - pctW / 2;
  const pctTop  = printConfig.y * 100 - pctH / 2;

  if (!articleImageUrl && !mockupUrl) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="relative">
      {/* Thumbnail */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="relative w-14 h-14 rounded border border-border overflow-hidden bg-[#F5F0EB] hover:border-primary transition-colors flex-shrink-0"
        title="Toggle print area preview"
      >
        {articleImageUrl && (
          <img src={articleImageUrl} alt="design" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${pctLeft}%`,
            top: `${pctTop}%`,
            width: `${pctW}%`,
            height: `${pctH}%`,
            border: "1.5px dashed rgba(196,30,58,0.85)",
            borderRadius: "1px",
          }}
        />
      </button>

      {/* Expanded popover */}
      {expanded && (
        <div
          className="absolute left-16 top-0 z-50 w-48 rounded-lg border border-border bg-card shadow-xl p-2 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative aspect-square rounded overflow-hidden bg-[#F5F0EB]">
            {mockupUrl && (
              <img src={mockupUrl} alt="mockup" className="absolute inset-0 w-full h-full object-contain" />
            )}
            {articleImageUrl && (
              <div
                className="absolute"
                style={{
                  left: `${pctLeft}%`,
                  top: `${pctTop}%`,
                  width: `${pctW}%`,
                  height: `${pctH}%`,
                }}
              >
                <img src={articleImageUrl} alt="design" className="w-full h-full object-contain" />
              </div>
            )}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${pctLeft}%`,
                top: `${pctTop}%`,
                width: `${pctW}%`,
                height: `${pctH}%`,
                border: "1.5px dashed rgba(196,30,58,0.85)",
                borderRadius: "2px",
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {PRODUCT_LABELS[productType] ?? productType} — print area preview
          </p>
          <button
            onClick={() => setExpanded(false)}
            className="w-full text-[10px] text-muted-foreground hover:text-foreground text-center"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

type MerchRow = {
  id: number;
  articleId: number;
  articleSlug: string;
  articleHeadline: string;
  articleImage?: string | null;
  productType: string | null;
  status: string | null;
  sellPrice?: number | null;
  cachedAt?: Date | null;
  printifyProductId?: string | null;
  errorMessage?: string | null;
};

/** Mobile card for a single merch product row */
function MerchMobileCard({
  product,
  onRetry,
  isRetrying,
}: {
  product: MerchRow;
  onRetry: (articleId: number, productType: string) => void;
  isRetrying: boolean;
}) {
  const statusCfg = STATUS_CONFIG[product.status as keyof typeof STATUS_CONFIG];
  const StatusIcon = statusCfg?.icon ?? Clock;
  const printConfig = DEFAULT_PRINT_CONFIGS[product.productType ?? ""] ?? { x: 0.5, y: 0.5, scale: 0.6 };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Top row: preview + headline + status */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <MiniPrintPreview
            articleImageUrl={product.articleImage ?? null}
            productType={product.productType ?? ""}
            printConfig={printConfig}
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-medium text-sm leading-snug line-clamp-2">{product.articleHeadline}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">{product.articleSlug}</p>
          {product.status === "failed" && product.errorMessage && (
            <p className="text-xs text-red-600 line-clamp-2">⚠ {product.errorMessage}</p>
          )}
        </div>
        <Badge className={`gap-1 text-xs font-medium flex-shrink-0 ${statusCfg?.className ?? ""}`}>
          <StatusIcon className="h-3 w-3" />
          {statusCfg?.label ?? product.status}
        </Badge>
      </div>

      {/* Meta row: type + price + date */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{product.productType ? (PRODUCT_LABELS[product.productType] ?? product.productType) : "—"}</span>
        {product.sellPrice != null && (
          <span className="font-medium text-foreground">${product.sellPrice.toFixed(2)}</span>
        )}
        {product.cachedAt && (
          <span>
            {new Date(product.cachedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        {product.status === "ready" && product.printifyProductId && (
          <a
            href={`https://printify.com/app/store/products/${product.printifyProductId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
              <ExternalLink className="h-3 w-3" />
              Printify
            </Button>
          </a>
        )}
        {(product.status === "failed" || product.status === "pending") && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            disabled={isRetrying}
            onClick={() => onRetry(product.articleId, product.productType ?? "")}
          >
            <RefreshCw className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />
            Retry
          </Button>
        )}
        <a
          href={`/shop/${product.articleSlug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
            <ExternalLink className="h-3 w-3" />
            Shop
          </Button>
        </a>
      </div>
    </div>
  );
}

export default function MerchPipeline() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "pending" | "failed">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "mug" | "shirt" | "poster" | "case">("all");

  const { data: products, isLoading, refetch, isFetching } = trpc.merch.listProducts.useQuery(
    { limit: 200, offset: 0 },
    { refetchInterval: 10000 }
  );

  const retryMutation = trpc.merch.retryPipeline.useMutation({
    onSuccess: () => {
      toast.success("Pipeline restarted — product will be ready in ~30 seconds.");
      refetch();
    },
    onError: (err) => {
      toast.error(`Retry failed: ${err.message}`);
    },
  });

  const filtered = (products ?? []).filter((p: MerchRow) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter !== "all" && p.productType !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.articleHeadline.toLowerCase().includes(q) && !p.articleSlug.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    total: products?.length ?? 0,
    ready: products?.filter((p: MerchRow) => p.status === "ready").length ?? 0,
    pending: products?.filter((p: MerchRow) => p.status === "pending").length ?? 0,
    failed: products?.filter((p: MerchRow) => p.status === "failed").length ?? 0,
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Merch Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Printify product status. Refreshes every 10s.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Summary cards — 2-col on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: counts.total, color: "text-foreground" },
            { label: "Ready", value: counts.ready, color: "text-green-600" },
            { label: "Pending", value: counts.pending, color: "text-yellow-600" },
            { label: "Failed", value: counts.failed, color: "text-red-600" },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border bg-card p-3 sm:p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{card.label}</p>
              <p className={`text-2xl sm:text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters — stack on mobile */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by headline or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="flex-1 sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="flex-1 sm:w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mug">Mug</SelectItem>
                <SelectItem value="shirt">T-Shirt</SelectItem>
                <SelectItem value="poster">Poster</SelectItem>
                <SelectItem value="case">Phone Case</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile card list (hidden on md+) */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading pipeline data…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {products?.length === 0
                ? "No merch products yet. Products are created when customers visit a shop page."
                : "No products match the current filters."}
            </div>
          ) : (
            filtered.map((product: MerchRow) => (
              <MerchMobileCard
                key={product.id}
                product={product}
                onRetry={(articleId, productType) =>
                  retryMutation.mutate({
                    articleId,
                    productType: productType as "mug" | "shirt" | "poster" | "case",
                  })
                }
                isRetrying={retryMutation.isPending}
              />
            ))
          )}
        </div>

        {/* Desktop table (hidden on mobile) */}
        <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Article</TableHead>
                <TableHead className="w-16">Preview</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading pipeline data…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {products?.length === 0
                      ? "No merch products yet. Products are created when customers visit a shop page."
                      : "No products match the current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product: MerchRow) => {
                  const statusCfg = STATUS_CONFIG[product.status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = statusCfg?.icon ?? Clock;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="align-top">
                        <div className="space-y-0.5">
                          <p className="font-medium text-sm line-clamp-1">{product.articleHeadline}</p>
                          <p className="text-xs text-muted-foreground font-mono">{product.articleSlug}</p>
                          {product.status === "failed" && product.errorMessage && (
                            <p className="text-xs text-red-600 mt-1 line-clamp-2">
                              ⚠ {product.errorMessage}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {product.productType ? (
                          <MiniPrintPreview
                            articleImageUrl={product.articleImage ?? null}
                            productType={product.productType}
                            printConfig={DEFAULT_PRINT_CONFIGS[product.productType] ?? { x: 0.5, y: 0.5, scale: 0.6 }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="text-sm">{product.productType ? (PRODUCT_LABELS[product.productType] ?? product.productType) : "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1.5 text-xs font-medium ${statusCfg?.className ?? ""}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg?.label ?? product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.sellPrice != null ? (
                          <span className="text-sm font-medium">${product.sellPrice.toFixed(2)}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {product.cachedAt ? new Date(product.cachedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {product.status === "ready" && product.printifyProductId && (
                            <a
                              href={`https://printify.com/app/store/products/${product.printifyProductId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
                                <ExternalLink className="h-3 w-3" />
                                Printify
                              </Button>
                            </a>
                          )}
                          {(product.status === "failed" || product.status === "pending") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 h-7 text-xs"
                              disabled={retryMutation.isPending}
                              onClick={() =>
                                retryMutation.mutate({
                                  articleId: product.articleId,
                                  productType: product.productType as "mug" | "shirt" | "poster" | "case",
                                })
                              }
                            >
                              <RefreshCw className={`h-3 w-3 ${retryMutation.isPending ? "animate-spin" : ""}`} />
                              Retry
                            </Button>
                          )}
                          <a
                            href={`/shop/${product.articleSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
                              <ExternalLink className="h-3 w-3" />
                              Shop
                            </Button>
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            Showing {filtered.length} of {counts.total} products
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
