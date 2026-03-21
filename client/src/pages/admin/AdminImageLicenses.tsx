import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, ExternalLink, Image, ChevronLeft, ChevronRight } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  flickr: "Flickr CC",
  wikimedia: "Wikimedia",
  unsplash: "Unsplash",
  pexels: "Pexels",
  pixabay: "Pixabay",
  x_embed: "X Embed",
  instagram_embed: "Instagram Embed",
  branded_card: "Branded Card",
  sponsor_card: "Sponsor Card",
};

const SOURCE_COLORS: Record<string, string> = {
  flickr: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  wikimedia: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  unsplash: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  pexels: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  pixabay: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  x_embed: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  instagram_embed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  branded_card: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  sponsor_card: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

export default function AdminImageLicenses() {
  const [page, setPage] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const limit = 50;

  const { data, isLoading } = trpc.imageLicenses.list.useQuery({
    limit,
    offset: page * limit,
    source: sourceFilter !== "all" ? sourceFilter : undefined,
  });

  const licenses = data?.licenses ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Image Licenses</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Audit log of all real images sourced for articles — license type, photographer, and attribution.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total sourced", value: total },
            { label: "Commercial OK", value: licenses.filter(l => l.commercialUse).length },
            { label: "Modification OK", value: licenses.filter(l => l.modificationOk).length },
            { label: "This page", value: licenses.length },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">Image</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Article</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">License</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Photographer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Score</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground w-24">Commercial</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground w-24">Modify</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32">Sourced</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : licenses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      <Image className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-medium">No image licenses found</p>
                      <p className="text-xs mt-1">Enable Real Image Sourcing in Setup Wizard → Screen 3 to start sourcing photos.</p>
                    </td>
                  </tr>
                ) : (
                  licenses.map((license) => (
                    <tr key={license.id} className="border-b hover:bg-muted/30 transition-colors">
                      {/* Thumbnail */}
                      <td className="px-4 py-2">
                        {license.cdnUrl ? (
                          <img
                            src={license.cdnUrl}
                            alt=""
                            className="w-12 h-10 object-cover rounded border"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-10 bg-muted rounded border flex items-center justify-center">
                            <Image className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      {/* Article ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">#{license.articleId}</span>
                      </td>
                      {/* Source badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[license.source] ?? "bg-muted text-muted-foreground"}`}>
                          {SOURCE_LABELS[license.source] ?? license.source}
                        </span>
                      </td>
                      {/* License type */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-muted-foreground">{license.licenseType}</span>
                      </td>
                      {/* Photographer */}
                      <td className="px-4 py-3">
                        <span className="text-sm truncate max-w-[140px] block">{license.photographer ?? "—"}</span>
                      </td>
                      {/* Relevance score */}
                      <td className="px-4 py-3">
                        {license.relevanceScore != null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, license.relevanceScore * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{(license.relevanceScore * 100).toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      {/* Commercial use */}
                      <td className="px-4 py-3 text-center">
                        {license.commercialUse
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          : <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                        }
                      </td>
                      {/* Modification OK */}
                      <td className="px-4 py-3 text-center">
                        {license.modificationOk
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          : <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                        }
                      </td>
                      {/* Date sourced */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(license.dateSourced).toLocaleDateString()}
                        </span>
                      </td>
                      {/* Source link */}
                      <td className="px-4 py-3">
                        <a
                          href={license.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="View original source"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total.toLocaleString()} records
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
