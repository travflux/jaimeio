import { trpc } from "@/lib/trpc";
import KpiCard from "@/components/performance/KpiCard";
import ChartWrapper from "@/components/performance/ChartWrapper";
import Leaderboard from "@/components/performance/Leaderboard";
import AiRecommendationCard from "@/components/performance/AiRecommendationCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  published: "#22c55e",
  approved: "#3b82f6",
  pending: "#eab308",
  draft: "#94a3b8",
  rejected: "#ef4444",
};

export default function OverviewTab() {
  const { data, isLoading, error } = trpc.analytics.overview.useQuery();

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Row 1 — Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Publications" value={kpis?.totalPublications ?? 0} loading={isLoading} />
        <KpiCard label="Active Users" value={kpis?.activeUsers ?? 0} loading={isLoading} />
        <KpiCard label="MRR" value={kpis ? "$" + kpis.mrr.toLocaleString() : "$0"} period="Stripe coming soon" loading={isLoading} />
        <KpiCard label="Articles This Month" value={kpis?.articlesThisMonth ?? 0} loading={isLoading} />
      </div>

      {/* Row 2 — Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Articles" value={kpis?.totalArticles?.toLocaleString() ?? "0"} loading={isLoading} />
        <KpiCard label="Workflow Runs" value={kpis?.workflowRunsThisMonth ?? 0} period="this month" loading={isLoading} />
        <KpiCard label="Newsletter Subscribers" value={kpis?.subscriberCount?.toLocaleString() ?? "0"} loading={isLoading} />
        <KpiCard label="Categories Active" value={kpis?.categoryCount ?? 0} loading={isLoading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartWrapper title="Articles Published (Last 30 Days)" loading={isLoading} error={error?.message}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.articlesPerDay ?? []}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => {
                    const d = new Date(v + "T00:00:00");
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v: string) => new Date(v + "T00:00:00").toLocaleDateString()}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </div>
        <ChartWrapper title="Article Status Breakdown" loading={isLoading} error={error?.message}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data?.statusBreakdown ?? []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                label={({ status, count }: { status: string; count: number }) => `${status} (${count})`}
              >
                {(data?.statusBreakdown ?? []).map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Leaderboard */}
      <Leaderboard
        title="Top Categories by Article Count"
        items={data?.topCategories ?? []}
      />

      {/* AI Insights Strip */}
      <div>
        <h3 className="text-sm font-semibold mb-3">AI Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AiRecommendationCard
            insight="Publishing frequency has been consistent this week. Consider adding one more daily run to increase output by ~25%."
            confidence="high"
            category="Content Production"
            action="Adjust schedule settings"
          />
          <AiRecommendationCard
            insight="3 categories have fewer than 5 articles. Focus content generation on these underserved topics to improve site coverage."
            confidence="medium"
            category="Content Balance"
            action="View category balance"
          />
          <AiRecommendationCard
            insight="Newsletter subscriber growth has plateaued. Consider adding a pop-up signup form or incentive to boost conversions."
            confidence="medium"
            category="Audience Growth"
            action="Configure newsletter settings"
          />
        </div>
      </div>
    </div>
  );
}
