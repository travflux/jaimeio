import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, AlertTriangle, Clock, Plus, Minus } from "lucide-react";

const DAYS = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

function formatTime12h(hour: number, minute: number): string {
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function RunTimeSelector({
  label,
  hourKey,
  minuteKey,
  edits,
  updateEdit,
}: {
  label: string;
  hourKey: string;
  minuteKey: string;
  edits: Record<string, string>;
  updateEdit: (key: string, value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Hour</label>
          <select
            value={edits[hourKey] || "5"}
            onChange={(e) => updateEdit(hourKey, e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={String(i)}>{i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Minute</label>
          <select
            value={edits[minuteKey] || "0"}
            onChange={(e) => updateEdit(minuteKey, e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            {[0, 15, 30, 45].map(m => (
              <option key={m} value={String(m)}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function SettingsSchedule() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  const activeDays = (edits.schedule_days || "mon,tue,wed,thu,fri").split(",").map(d => d.trim());
  const toggleDay = (day: string) => {
    const updated = activeDays.includes(day) ? activeDays.filter(d => d !== day) : [...activeDays, day];
    updateEdit("schedule_days", updated.join(","));
  };

  const setDayPreset = (preset: string) => {
    switch (preset) {
      case "weekdays": updateEdit("schedule_days", "mon,tue,wed,thu,fri"); break;
      case "everyday": updateEdit("schedule_days", "mon,tue,wed,thu,fri,sat,sun"); break;
      case "mwf": updateEdit("schedule_days", "mon,wed,fri"); break;
    }
  };

  const runsPerDay = Math.min(4, Math.max(1, parseInt(edits.schedule_runs_per_day || "1") || 1));
  const articlesPerBatch = parseInt(edits.articles_per_batch || "20");
  const totalArticlesPerDay = articlesPerBatch * runsPerDay;

  const tz = edits.schedule_timezone || "America/Los_Angeles";
  const daysStr = activeDays.length === 7
    ? "Every day"
    : activeDays.length === 5 && !activeDays.includes("sat") && !activeDays.includes("sun")
      ? "Weekdays"
      : activeDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ");

  // Build run times summary
  const runTimes: string[] = [];
  runTimes.push(formatTime12h(parseInt(edits.schedule_hour || "5"), parseInt(edits.schedule_minute || "0")));
  if (runsPerDay >= 2) runTimes.push(formatTime12h(parseInt(edits.schedule_run2_hour || "11"), parseInt(edits.schedule_run2_minute || "0")));
  if (runsPerDay >= 3) runTimes.push(formatTime12h(parseInt(edits.schedule_run3_hour || "17"), parseInt(edits.schedule_run3_minute || "0")));
  if (runsPerDay >= 4) runTimes.push(formatTime12h(parseInt(edits.schedule_run4_hour || "22"), parseInt(edits.schedule_run4_minute || "0")));

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Schedule"
        description="Configure when the automated workflow runs each day."
        icon={<Calendar className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workflow Schedule */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workflow Schedule</CardTitle>
                <CardDescription>Control when the daily content workflow runs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Enable Workflow</label>
                    <p className="text-xs text-muted-foreground">Turn the automated workflow on or off.</p>
                  </div>
                  <Switch
                    checked={edits.workflow_enabled === "true"}
                    onCheckedChange={(checked) => updateEdit("workflow_enabled", checked ? "true" : "false")}
                  />
                </div>

                {/* Runs Per Day */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Runs Per Day</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Run the workflow multiple times per day to publish more articles. Each run generates ~{articlesPerBatch} articles.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateEdit("schedule_runs_per_day", String(Math.max(1, runsPerDay - 1)))}
                      disabled={runsPerDay <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-lg font-bold w-8 text-center">{runsPerDay}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateEdit("schedule_runs_per_day", String(Math.min(4, runsPerDay + 1)))}
                      disabled={runsPerDay >= 4}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      = ~{totalArticlesPerDay} articles/day
                    </span>
                  </div>
                </div>

                {/* Run 1 Time */}
                <RunTimeSelector
                  label="Run 1 Time (Morning)"
                  hourKey="schedule_hour"
                  minuteKey="schedule_minute"
                  edits={edits}
                  updateEdit={updateEdit}
                />

                {/* Run 2 Time */}
                {runsPerDay >= 2 && (
                  <RunTimeSelector
                    label="Run 2 Time (Midday)"
                    hourKey="schedule_run2_hour"
                    minuteKey="schedule_run2_minute"
                    edits={edits}
                    updateEdit={updateEdit}
                  />
                )}

                {/* Run 3 Time */}
                {runsPerDay >= 3 && (
                  <RunTimeSelector
                    label="Run 3 Time (Evening)"
                    hourKey="schedule_run3_hour"
                    minuteKey="schedule_run3_minute"
                    edits={edits}
                    updateEdit={updateEdit}
                  />
                )}

                {/* Run 4 Time */}
                {runsPerDay >= 4 && (
                  <RunTimeSelector
                    label="Run 4 Time (Night)"
                    hourKey="schedule_run4_hour"
                    minuteKey="schedule_run4_minute"
                    edits={edits}
                    updateEdit={updateEdit}
                  />
                )}

                {/* Timezone */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Timezone</label>
                  <select
                    value={edits.schedule_timezone || "America/Los_Angeles"}
                    onChange={(e) => updateEdit("schedule_timezone", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1.5">All run times use this timezone.</p>
                </div>

                {/* Active Days */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Active Days</label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map(({ key, short }) => (
                      <button
                        key={key}
                        onClick={() => toggleDay(key)}
                        className={`py-2 px-1 rounded-md text-xs font-medium transition-colors ${
                          activeDays.includes(key)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {short}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => setDayPreset("weekdays")}>Weekdays</Button>
                    <Button variant="outline" size="sm" onClick={() => setDayPreset("everyday")}>Every day</Button>
                    <Button variant="outline" size="sm" onClick={() => setDayPreset("mwf")}>MWF</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Schedule Summary */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Schedule Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className={`text-sm font-semibold ${edits.workflow_enabled === "true" ? "text-green-600" : "text-red-600"}`}>
                      {edits.workflow_enabled === "true" ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Runs Per Day</span>
                    <span className="text-sm font-medium">{runsPerDay}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-muted-foreground">Run Times</span>
                    <div className="text-right">
                      {runTimes.map((t, i) => (
                        <div key={i} className="text-sm font-medium">Run {i + 1}: {t}</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Timezone</span>
                    <span className="text-sm font-medium">{tz}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Days</span>
                    <span className="text-sm font-medium">{daysStr}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">Articles Per Batch</span>
                    <span className="text-sm font-medium">{articlesPerBatch}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Est. Articles/Day</span>
                    <span className={`text-sm font-bold ${totalArticlesPerDay >= 50 ? "text-green-600" : totalArticlesPerDay >= 30 ? "text-amber-600" : "text-red-600"}`}>
                      ~{totalArticlesPerDay}
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    {edits.workflow_enabled === "true"
                      ? `The workflow will run ${runsPerDay}x per day at ${runTimes.join(", ")} (${tz}) on ${daysStr.toLowerCase()}, generating ~${totalArticlesPerDay} articles/day.`
                      : "The workflow is currently disabled. Enable it above to start the automated schedule."}
                  </p>
                </div>

                {totalArticlesPerDay < 50 && edits.workflow_enabled === "true" && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Target is 50 articles/day. Increase runs per day or articles per batch to hit the target.
                      Current estimate: ~{totalArticlesPerDay}/day.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 50/day Target Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hitting 50 Articles/Day</CardTitle>
                <CardDescription>Recommended configuration for maximum output.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted/50 rounded-md p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Runs per day</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Articles per batch</span>
                    <span className="font-medium">17–20</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Run 1 (Morning)</span>
                    <span className="font-medium">5:00 AM</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Run 2 (Midday)</span>
                    <span className="font-medium">11:00 AM</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Run 3 (Evening)</span>
                    <span className="font-medium">5:00 PM</span>
                  </div>
                  <div className="flex justify-between text-xs border-t pt-2">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-green-600">~51–60 articles/day</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Articles per batch is configured in the <strong>Generation</strong> settings tab.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
