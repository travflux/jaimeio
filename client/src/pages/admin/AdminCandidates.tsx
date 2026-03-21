/**
 * AdminCandidates — v4.0 Candidate Review Interface
 *
 * Shows the selector_candidates pool with filtering by status and source type.
 * Allows manual approve (mark as selected) and reject per candidate,
 * plus bulk approve/reject actions.
 */

import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, XCircle, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, Zap, TrendingUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CandidateStatus = "pending" | "selected" | "rejected" | "expired" | "all";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  selected: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  rss: "RSS",
  google_news: "Google News",
  x: "X / Twitter",
  reddit: "Reddit",
  youtube: "YouTube",
  scraper: "Web Scraper",
  manual: "Manual",
};

const PAGE_SIZE = 50;

// ─── Candidate row ────────────────────────────────────────────────────────────

interface CandidateItem {
  id: number;
  title: string;
  source?: string | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  priority?: number | null;
  status: string;
  publishedDate?: string | null;
  createdAt?: number | Date | null;
  score?: number | null;
  articlePotential?: string | null;
  scoreBreakdown?: string | null;
}

const POTENTIAL_COLORS: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  low: "bg-gray-50 text-gray-500 border-gray-200",
  dead: "bg-red-50 text-red-500 border-red-200",
};

function ScoreBadge({ score, potential }: { score?: number | null; potential?: string | null }) {
  if (score == null) return <span className="text-[10px] text-muted-foreground italic">unscored</span>;
  const pct = Math.round(score * 100);
  const potentialClass = POTENTIAL_COLORS[potential ?? ""] ?? "bg-gray-50 text-gray-500 border-gray-200";
  return (
    <span className="flex items-center gap-1">
      <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${potentialClass}`}>
        {potential ?? "?"} {pct}%
      </Badge>
    </span>
  );
}

interface CandidateRowProps {
  candidate: CandidateItem;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  isUpdating: boolean;
}

function CandidateRow({ candidate, selected, onSelect, onApprove, onReject, isUpdating }: CandidateRowProps) {
  const statusClass = STATUS_COLORS[candidate.status] ?? "bg-gray-50 text-gray-500";
  const sourceLabel = SOURCE_TYPE_LABELS[candidate.sourceType ?? ""] ?? candidate.sourceType ?? "Unknown";

  return (
    <div className={`flex items-start gap-3 py-3 px-3 border-b last:border-0 hover:bg-muted/30 transition-colors ${selected ? "bg-blue-50/40" : ""}`}>
      <Checkbox
        checked={selected}
        onCheckedChange={onSelect}
        className="mt-0.5 shrink-0"
        disabled={candidate.status !== "pending"}
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-medium leading-snug line-clamp-2 flex-1">{candidate.title}</span>
          {candidate.sourceUrl && (
            <a
              href={candidate.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${statusClass}`}>
            {candidate.status}
          </Badge>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {sourceLabel}
          </Badge>
          {candidate.source && (
            <span className="truncate max-w-[180px]">{candidate.source}</span>
          )}
          {candidate.priority != null && (
            <span className="text-muted-foreground">P{candidate.priority}</span>
          )}
          {candidate.createdAt && (
            <span>{new Date(candidate.createdAt as any).toLocaleDateString()}</span>
          )}
          <ScoreBadge score={candidate.score} potential={candidate.articlePotential} />
        </div>
      </div>
      {candidate.status === "pending" && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={onApprove}
            disabled={isUpdating}
            title="Approve (mark as selected)"
          >
            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={onReject}
            disabled={isUpdating}
            title="Reject"
          >
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminCandidates() {
  const [statusFilter, setStatusFilter] = useState<CandidateStatus>("pending");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());

  const queryInput = useMemo(() => ({
    status: statusFilter,
    sourceType: sourceTypeFilter === "all" ? undefined : sourceTypeFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [statusFilter, sourceTypeFilter, page]);

  const { data, isLoading, refetch } = trpc.sources.listCandidates.useQuery(queryInput);
  const approveMutation = trpc.sources.approveCandidate.useMutation();
  const rejectMutation = trpc.sources.rejectCandidate.useMutation();
  const bulkMutation = trpc.sources.bulkUpdateCandidates.useMutation();
  const scoreMutation = trpc.sources.triggerScoring.useMutation({
    onSuccess: (data) => { toast.success(`Scored ${data.scored} candidates`); refetch(); },
    onError: (e) => toast.error(`Scoring failed: ${e.message}`),
  });
  const loopMutation = trpc.sources.triggerProductionLoop.useMutation({
    onSuccess: (data) => { toast.success(data.message ?? "Loop tick complete"); },
    onError: (e) => toast.error(`Loop failed: ${e.message}`),
  });
  const { data: loopStatus } = trpc.sources.getProductionLoopStatus.useQuery(undefined, { refetchInterval: 30000 });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleApprove = async (id: number) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      await approveMutation.mutateAsync({ id });
      toast.success("Candidate approved.");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleReject = async (id: number) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      await rejectMutation.mutateAsync({ id });
      toast.success("Candidate rejected.");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleBulk = async (status: "selected" | "rejected") => {
    if (selectedIds.size === 0) { toast.error("No candidates selected."); return; }
    try {
      const result = await bulkMutation.mutateAsync({ ids: Array.from(selectedIds), status });
      toast.success(`${result.updated} candidates ${status === "selected" ? "approved" : "rejected"}.`);
      setSelectedIds(new Set());
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (checked) s.add(id);
      else s.delete(id);
      return s;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.filter(i => i.status === "pending").map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const pendingItems = items.filter(i => i.status === "pending");
  const allPendingSelected = pendingItems.length > 0 && pendingItems.every(i => selectedIds.has(i.id));

  return (
    <AdminLayout>
      <div className="p-6 space-y-4 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review the v4.0 selector candidate pool. Approve candidates to prioritize them for article generation, or reject to exclude them.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as CandidateStatus); setPage(0); setSelectedIds(new Set()); }}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="selected">Selected</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceTypeFilter} onValueChange={(v) => { setSourceTypeFilter(v); setPage(0); setSelectedIds(new Set()); }}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="rss">RSS</SelectItem>
              <SelectItem value="google_news">Google News</SelectItem>
              <SelectItem value="x">X / Twitter</SelectItem>
              <SelectItem value="reddit">Reddit</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="scraper">Web Scraper</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">{total} result{total !== 1 ? "s" : ""}</span>

          <div className="ml-auto flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                  onClick={() => handleBulk("selected")}
                  disabled={bulkMutation.isPending}
                >
                  {bulkMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  Approve All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => handleBulk("rejected")}
                  disabled={bulkMutation.isPending}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject All
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => scoreMutation.mutate()}
              disabled={scoreMutation.isPending}
              title="Score all unscored candidates"
            >
              {scoreMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
              Score All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => loopMutation.mutate()}
              disabled={loopMutation.isPending}
              title="Trigger one production loop tick now"
            >
              {loopMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
              Run Loop
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Production loop status */}
        {loopStatus && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-3 py-1.5">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span>
              Production loop: {loopStatus.isRunning ? <span className="text-blue-600 font-medium">running</span> : "idle"} · {loopStatus.runCount} ticks
              {loopStatus.lastResult && <> · Last: {loopStatus.lastResult.message}</>}
            </span>
          </div>
        )}
        {/* Candidate list */}
        <Card>
          {statusFilter === "pending" && pendingItems.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20">
              <Checkbox
                checked={allPendingSelected}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-xs text-muted-foreground">Select all pending on this page</span>
            </div>
          )}
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading candidates...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No candidates found.</p>
                <p className="text-xs mt-1">Enable sources in Source Manager and trigger a fetch to populate the pool.</p>
              </div>
            ) : (
              items.map((candidate) => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate as CandidateItem}
                  selected={selectedIds.has(candidate.id)}
                  onSelect={(checked) => toggleSelect(candidate.id, !!checked)}
                  onApprove={() => handleApprove(candidate.id)}
                  onReject={() => handleReject(candidate.id)}
                  isUpdating={updatingIds.has(candidate.id)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
