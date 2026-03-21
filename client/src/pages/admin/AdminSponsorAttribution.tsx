/**
 * Admin Sponsor Attribution — Per-article sponsor click report
 * Shows which articles drive the most sponsor clicks, with CTR estimates
 * and A/B variant breakdown.
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ExternalLink, TrendingUp, MousePointerClick, Eye, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminSponsorAttribution() {
  const [days, setDays] = useState(30);
  const { data, isLoading, refetch, isFetching } = trpc.settings.sponsorAttribution.useQuery(
    { days, limit: 50 },
    { staleTime: 5 * 60 * 1000 },
  );

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { totalClicks: 0, totalViews: 0, blendedCtr: 0 };
  const variantCounts = data?.variantCounts ?? { a: 0, b: 0 };
  const abActive = variantCounts.a + variantCounts.b > 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MousePointerClick className="w-6 h-6 text-[#C41E3A]" />
              Sponsor Attribution
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Which articles drive the most sponsor clicks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last 365 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Sponsor Clicks"
            value={totals.totalClicks.toLocaleString()}
            sub={`Last ${days} days`}
            icon={MousePointerClick}
          />
          <StatCard
            label="Total Article Views"
            value={totals.totalViews.toLocaleString()}
            sub="Published articles"
            icon={Eye}
          />
          <StatCard
            label="Blended CTR"
            value={`${totals.blendedCtr.toFixed(2)}%`}
            sub="Clicks ÷ views"
            icon={TrendingUp}
          />
          <StatCard
            label="Articles with Clicks"
            value={rows.length}
            sub={`Top ${rows.length} shown`}
            icon={BarChart2}
          />
        </div>

        {/* A/B variant breakdown — only shown when A/B test has data */}
        {abActive && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">A/B Test Results (last {days} days)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Variant A</Badge>
                  <span className="text-xl font-bold">{variantCounts.a.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">clicks</span>
                </div>
                <div className="text-muted-foreground">vs</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Variant B</Badge>
                  <span className="text-xl font-bold">{variantCounts.b.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">clicks</span>
                </div>
                {variantCounts.a + variantCounts.b > 0 && (
                  <div className="ml-auto text-sm text-muted-foreground">
                    {(() => {
                      const total = variantCounts.a + variantCounts.b;
                      const aWin = variantCounts.a > variantCounts.b;
                      const winner = aWin ? 'A' : 'B';
                      const pct = ((Math.max(variantCounts.a, variantCounts.b) / total) * 100).toFixed(1);
                      return `Variant ${winner} leads with ${pct}% of clicks`;
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Article table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <MousePointerClick className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium">No sponsor clicks recorded</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enable the Article Sponsor Banner in Sponsor Settings and wait for readers to click.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-8">#</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Article</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Views</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Sponsor Clicks</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">CTR</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, i) => (
                    <tr key={row.slug} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium line-clamp-1">{row.headline}</div>
                        <div className="text-xs text-muted-foreground font-mono">{row.slug}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.views.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{row.sponsorClicks.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          row.ctr >= 2 ? 'bg-green-100 text-green-800' :
                          row.ctr >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {row.ctr.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <a
                          href={`/api/article/${row.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#C41E3A] hover:underline"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {rows.map((row, i) => (
                <Card key={row.slug}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground mr-2">#{i + 1}</span>
                        <span className="font-medium text-sm">{row.headline}</span>
                      </div>
                      <a
                        href={`/api/article/${row.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#C41E3A] shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Views</p>
                        <p className="font-semibold text-sm">{row.views.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                        <p className="font-semibold text-sm">{row.sponsorClicks.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="font-semibold text-sm">{row.ctr.toFixed(2)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
