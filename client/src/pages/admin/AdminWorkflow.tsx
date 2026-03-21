import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, Play, RefreshCw, Timer, CheckCircle, AlertTriangle, Power,
  BarChart3, FileText, Clock, Send,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

interface SchedulerStatus {
  isScheduled: boolean;
  isRunning: boolean;
  cronExpression?: string;
  nextRun?: string;
  lastRun?: { status: string; message: string; time: string };
}

export default function AdminWorkflow() {
  const { edits } = useSettings();
  const { data: batches } = trpc.workflow.list.useQuery();
  const { data: stats } = trpc.articles.stats.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();

  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);

  const triggerNow = trpc.workflow.triggerNow.useMutation({
    onSuccess: (result) => {
      const r = result as { status?: string; message?: string } | null;
      if (r?.status === "skipped") {
        toast.warning(r.message || "Workflow was skipped — cooldown active.");
      } else {
        toast.success("Workflow triggered!", { description: "Check batch history for progress." });
      }
      fetchSchedulerStatus();
      setTimeout(() => utils.workflow.list.invalidate(), 3000);
    },
    onError: (err) => toast.error("Failed to trigger workflow", { description: err.message }),
  });

  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler/status");
      if (res.ok) setSchedulerStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSchedulerStatus();
    const interval = setInterval(fetchSchedulerStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchSchedulerStatus]);

  const handleTriggerNow = () => triggerNow.mutate();

  const latestBatch = batches?.[0];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workflow</h1>
            <p className="text-muted-foreground text-sm">Monitor and control the daily content pipeline.</p>
          </div>
        </div>
        <Button onClick={handleTriggerNow} disabled={triggerNow.isPending || schedulerStatus?.isRunning}>
          {triggerNow.isPending || schedulerStatus?.isRunning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
          Run Now
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <QuickStat icon={<Clock className="w-4 h-4" />} label="Pending" value={stats?.pending ?? 0} color="amber" href="/admin/articles?status=pending" />
        <QuickStat icon={<FileText className="w-4 h-4" />} label="Draft" value={stats?.draft ?? 0} href="/admin/articles?status=draft" />
        <QuickStat icon={<CheckCircle className="w-4 h-4" />} label="Approved" value={stats?.approved ?? 0} color="green" href="/admin/articles?status=approved" />
        <QuickStat icon={<Send className="w-4 h-4" />} label="Published" value={stats?.published ?? 0} color="blue" href="/admin/articles?status=published" />
        <QuickStat icon={<AlertTriangle className="w-4 h-4" />} label="Rejected" value={stats?.rejected ?? 0} color="red" href="/admin/articles?status=rejected" />
        <QuickStat icon={<BarChart3 className="w-4 h-4" />} label="Categories" value={categories?.length ?? 0} color="purple" href="/admin/categories" />
        <QuickStat icon={<Timer className="w-4 h-4" />} label="Scheduled" value={schedulerStatus?.isScheduled ? "Yes" : "No"} color={schedulerStatus?.isScheduled ? "green" : "red"} />
        <QuickStat
          icon={<Power className="w-4 h-4" />}
          label="Workflow"
          value={edits.workflow_enabled === "true" ? "ON" : "OFF"}
          color={edits.workflow_enabled === "true" ? "green" : "red"}
        />
      </div>

      {/* Scheduler Status */}
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
                  <p className="text-xs text-muted-foreground"><span className="font-medium">Next run:</span> {schedulerStatus.nextRun}</p>
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
                  <p className="text-xs text-muted-foreground font-mono">Cron: {schedulerStatus.cronExpression}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={fetchSchedulerStatus}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest Batch */}
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
                  const stages = ["gathering", "generating", "pending_approval", "approved", "publishing", "completed"];
                  const isActive = latestBatch.status === stage;
                  const isPast = stages.indexOf(latestBatch.status) > i;
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

      {/* Batch History */}
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
    </AdminLayout>
  );
}

function QuickStat({ icon, label, value, color, href }: { icon: React.ReactNode; label: string; value: number | string; color?: string; href?: string }) {
  const colorClasses: Record<string, string> = {
    amber: "text-amber-600", green: "text-green-600", blue: "text-blue-600",
    purple: "text-purple-600", red: "text-red-600",
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
  if (href) return <Link href={href}>{content}</Link>;
  return content;
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
