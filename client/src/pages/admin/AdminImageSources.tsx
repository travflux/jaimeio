/**
 * AdminImageSources.tsx — Image QC Interface (v4.9.7)
 *
 * 4 tabs:
 *   1. Image Library — browse/delete crawled images, see tags, relevance score, reuse count
 *   2. Domains — whitelist/blacklist management, add new domains, see sourcing stats
 *   3. Stats — overview of library health, domain breakdown, acceptance rate
 *   4. Help — setup guide for Google CSE
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type DomainStatus = "whitelisted" | "blacklisted" | "unknown" | "pending_review";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DomainStatus }) {
  const config: Record<DomainStatus, { label: string; className: string }> = {
    whitelisted: { label: "Whitelisted", className: "bg-green-100 text-green-800 border-green-200" },
    blacklisted: { label: "Blacklisted", className: "bg-red-100 text-red-800 border-red-200" },
    unknown: { label: "Unknown", className: "bg-gray-100 text-gray-600 border-gray-200" },
    pending_review: { label: "Pending Review", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  };
  const { label, className } = config[status] ?? config.unknown;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className}`}>{label}</span>;
}

// ─── Tab 1: Image Library ─────────────────────────────────────────────────────

function ImageLibraryTab() {
  const [offset, setOffset] = useState(0);
  const [domainFilter, setDomainFilter] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const limit = 24;

  const { data, isLoading, refetch } = trpc.imageQC.libraryList.useQuery({
    limit,
    offset,
    domain: domainFilter || undefined,
  });

  const deleteMutation = trpc.imageQC.libraryDelete.useMutation({
    onSuccess: () => {
      toast("Image deleted from library");
      refetch();
      setDeleteId(null);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter by domain..."
          value={domainFilter}
          onChange={e => { setDomainFilter(e.target.value); setOffset(0); }}
          className="max-w-xs h-8 text-sm"
        />
        <span className="text-sm text-muted-foreground">{total} images</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-video bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No images in library yet.</p>
          <p className="text-xs mt-1">Images will appear here after the Google CSE crawler runs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((img: any) => (
            <div key={img.id} className="group relative rounded-lg overflow-hidden border bg-card">
              <div className="aspect-video bg-muted relative overflow-hidden">
                <img
                  src={img.cdnUrl}
                  alt={img.aiDescription ?? "Library image"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  onClick={() => setDeleteId(img.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white rounded p-1 text-xs"
                  title="Delete from library"
                >
                  ✕
                </button>
              </div>
              <div className="p-2 space-y-1">
                <p className="text-xs text-muted-foreground truncate">{img.sourceDomain}</p>
                {img.aiDescription && (
                  <p className="text-xs line-clamp-2">{img.aiDescription}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {img.relevanceScore != null && (
                    <span className="text-xs text-muted-foreground">
                      Score: {(Number(img.relevanceScore) * 100).toFixed(0)}%
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Used: {img.timesUsed ?? 0}×
                  </span>
                </div>
                {Array.isArray(img.tags) && img.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(img.tags as string[]).slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-[10px] bg-muted px-1 rounded">{tag}</span>
                    ))}
                    {img.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{img.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {pages}</span>
          <Button variant="outline" size="sm" onClick={() => setOffset(offset + limit)} disabled={currentPage >= pages}>
            Next
          </Button>
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image from library?</AlertDialogTitle>
            <AlertDialogDescription>This removes the record from the image library. The CDN URL will remain accessible but the image won't be reused.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Tab 2: Domains ───────────────────────────────────────────────────────────

function DomainsTab() {
  const [statusFilter, setStatusFilter] = useState<"all" | DomainStatus>("all");
  const [newDomain, setNewDomain] = useState("");
  const [newStatus, setNewStatus] = useState<DomainStatus>("whitelisted");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, isLoading, refetch } = trpc.imageQC.domainList.useQuery({
    limit: 100,
    offset: 0,
    status: statusFilter,
  });

  const setStatusMutation = trpc.imageQC.domainSetStatus.useMutation({
    onSuccess: () => { toast("Domain status updated"); refetch(); },
  });

  const deleteMutation = trpc.imageQC.domainDelete.useMutation({
    onSuccess: () => { toast("Domain removed"); refetch(); setDeleteId(null); },
  });

  const handleAdd = () => {
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain) return;
    setStatusMutation.mutate({ domain, status: newStatus });
    setNewDomain("");
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      {/* Add domain */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">Add Domain</p>
        <div className="flex items-center gap-2">
          <Input
            placeholder="e.g. reuters.com"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            className="h-8 text-sm flex-1"
          />
          <Select value={newStatus} onValueChange={v => setNewStatus(v as DomainStatus)}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whitelisted">Whitelist</SelectItem>
              <SelectItem value="blacklisted">Blacklist</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={!newDomain.trim()}>Add</Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            <SelectItem value="whitelisted">Whitelisted</SelectItem>
            <SelectItem value="blacklisted">Blacklisted</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} domains</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No domains found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Domain</th>
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Status</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Sourced</th>
                <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Rejected</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((d: any) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{d.domain}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={d.status}
                      onValueChange={v => setStatusMutation.mutate({ domain: d.domain, status: v as DomainStatus })}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs border-0 bg-transparent p-0 focus:ring-0">
                        <StatusBadge status={d.status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whitelisted">Whitelisted</SelectItem>
                        <SelectItem value="blacklisted">Blacklisted</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                        <SelectItem value="pending_review">Pending Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-green-600">{d.imagesSourced ?? 0}</td>
                  <td className="px-3 py-2 text-right text-xs text-red-500">{d.imagesRejected ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setDeleteId(d.id)}
                      className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove domain?</AlertDialogTitle>
            <AlertDialogDescription>This removes the domain from the list. It will be re-added as "unknown" if the crawler encounters it again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Tab 3: Stats ─────────────────────────────────────────────────────────────

function StatsTab() {
  const { data, isLoading } = trpc.imageQC.stats.useQuery();

  if (isLoading) return <div className="h-32 bg-muted rounded animate-pulse" />;
  if (!data) return <p className="text-sm text-muted-foreground">Stats unavailable.</p>;

  const { library, domains } = data;
  const acceptanceRate = domains?.totalSourced && domains?.totalRejected
    ? ((Number(domains.totalSourced) / (Number(domains.totalSourced) + Number(domains.totalRejected))) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Library Images", value: Number(library?.total ?? 0).toLocaleString() },
          { label: "Total Reuses", value: Number(library?.totalUsed ?? 0).toLocaleString() },
          { label: "Unique Domains", value: Number(library?.uniqueDomains ?? 0).toLocaleString() },
          { label: "Avg Relevance", value: library?.avgRelevance ? `${(Number(library.avgRelevance) * 100).toFixed(0)}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">Domain Registry</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-green-600">{Number(domains?.whitelisted ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Whitelisted</p>
          </div>
          <div>
            <p className="text-xl font-bold text-red-600">{Number(domains?.blacklisted ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Blacklisted</p>
          </div>
          <div>
            <p className="text-xl font-bold text-yellow-600">{Number(domains?.unknown ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Unknown/Pending</p>
          </div>
        </div>
        {acceptanceRate && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">Overall acceptance rate</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${acceptanceRate}%` }}
                />
              </div>
              <span className="text-sm font-medium">{acceptanceRate}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 4: Help ──────────────────────────────────────────────────────────────

function HelpTab() {
  return (
    <div className="prose prose-sm max-w-none space-y-4 text-sm">
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-base">Google Custom Search Setup</h3>
        <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
          <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="text-primary underline">console.cloud.google.com</a> → Create a project → Enable <strong>Custom Search API</strong></li>
          <li>Create an API key under <strong>Credentials</strong>. Copy it into <strong>Google Custom Search API Key</strong> in Settings → Media.</li>
          <li>Go to <a href="https://programmablesearchengine.google.com" target="_blank" rel="noopener" className="text-primary underline">programmablesearchengine.google.com</a> → Create a search engine → Enable <strong>Image Search</strong> → Set to search the <strong>entire web</strong>.</li>
          <li>Copy the <strong>Search Engine ID (cx)</strong> into Settings → Media.</li>
          <li>Enable <strong>Google Image Crawler</strong> in Settings → Media → toggle On.</li>
        </ol>
        <p className="text-xs text-muted-foreground border-t pt-3">Free tier: 100 queries/day. At 50 articles/day, this covers all articles if the library reuse rate is above 50%.</p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-2">
        <h3 className="font-semibold text-base">Domain Whitelist/Blacklist</h3>
        <p className="text-muted-foreground">The crawler checks every image's source domain against this list before downloading. Whitelisted domains are trusted and processed first. Blacklisted domains are skipped immediately. Unknown domains are processed but flagged for review.</p>
        <p className="text-muted-foreground">Pre-seeded whitelist includes: Reuters, AP, Getty, AFP, BBC, NPR, PBS, Wikimedia, NASA, NOAA, White House, Library of Congress, and other public-domain sources.</p>
        <p className="text-muted-foreground">Pre-seeded blacklist includes: Getty watermark domains, Shutterstock, iStock, Adobe Stock, and other paid stock sites.</p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-2">
        <h3 className="font-semibold text-base">Image Library Reuse</h3>
        <p className="text-muted-foreground">When an article's tags match a previously crawled image, the crawler reuses it instead of making a new Google API call. This saves quota and keeps related articles visually consistent. Set <strong>Max Reuse Count</strong> to control how many times a single image can be reused before the crawler prefers fresh images.</p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-2">
        <h3 className="font-semibold text-base">AI Validation</h3>
        <p className="text-muted-foreground">When enabled, each candidate image is sent to the LLM with the article headline and excerpt. The LLM checks for relevance, safety, and watermarks, returning a 0–1 relevance score. Images scoring below 0.5 are rejected. This adds ~1–2 seconds per image but significantly reduces irrelevant or inappropriate images.</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminImageSources() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold">Image Sources</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage the Google CSE image crawler, domain whitelist/blacklist, and image library.</p>
        </div>

        <Tabs defaultValue="library">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="library">Image Library</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="help">Setup Guide</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="mt-4">
            <ImageLibraryTab />
          </TabsContent>
          <TabsContent value="domains" className="mt-4">
            <DomainsTab />
          </TabsContent>
          <TabsContent value="stats" className="mt-4">
            <StatsTab />
          </TabsContent>
          <TabsContent value="help" className="mt-4">
            <HelpTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
