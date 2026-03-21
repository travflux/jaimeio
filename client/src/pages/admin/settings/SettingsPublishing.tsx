import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send, AlertTriangle } from "lucide-react";

export default function SettingsPublishing() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Publishing"
        description="Control how articles are released and published."
        icon={<Send className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto-Approve Pending Articles</CardTitle>
              <CardDescription>Automatically approve pending articles after a set time if not manually rejected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Auto-Approve</label>
                  <p className="text-xs text-muted-foreground">Approve pending articles automatically after N hours</p>
                </div>
                <Switch
                  checked={edits.auto_approve_enabled === "true"}
                  onCheckedChange={v => updateEdit("auto_approve_enabled", String(v))}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Auto-Approve After (hours)</label>
                  <span className="text-lg font-bold text-primary">{edits.auto_approve_after_hours || "4"}h</span>
                </div>
                <Slider
                  value={[parseInt(edits.auto_approve_after_hours || "4")]}
                  onValueChange={([v]) => updateEdit("auto_approve_after_hours", String(v))}
                  min={1} max={48} step={1}
                  disabled={edits.auto_approve_enabled !== "true"}
                />
                <p className="text-xs text-muted-foreground mt-1">Articles in pending status for longer than this will be auto-approved. Checked every 30 minutes.</p>
              </div>
              {edits.auto_approve_enabled === "true" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Auto-approve is active. Pending articles older than {edits.auto_approve_after_hours || "4"} hours will be approved automatically{edits.auto_publish_approved === "true" ? " and immediately published" : ""}.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publication Speed</CardTitle>
              <CardDescription>Control how articles are released throughout the day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Max Publications Per Day</label>
                  <span className="text-lg font-bold text-primary">{edits.max_publish_per_day || "20"}</span>
                </div>
                <Slider
                  value={[parseInt(edits.max_publish_per_day || "20")]}
                  onValueChange={([v]) => updateEdit("max_publish_per_day", String(v))}
                  min={1} max={500} step={1}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Stagger Interval (minutes)</label>
                <input
                  type="number"
                  value={edits.stagger_interval_minutes || "30"}
                  onChange={e => updateEdit("stagger_interval_minutes", e.target.value)}
                  min={0} max={480}
                  className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">Minutes between each article publication. 0 = publish all at once.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto-Publish</CardTitle>
              <CardDescription>Configure automatic publishing behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto-Publish Approved Articles</label>
                  <p className="text-xs text-muted-foreground">Skip the manual publish step after approval</p>
                </div>
                <Switch
                  checked={edits.auto_publish_approved === "true"}
                  onCheckedChange={v => updateEdit("auto_publish_approved", String(v))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Publish Delay (minutes)</label>
                <input
                  type="number"
                  value={edits.publish_delay_minutes || "0"}
                  onChange={e => updateEdit("publish_delay_minutes", e.target.value)}
                  min={0} max={1440}
                  className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">Delay between approval and publication. 0 = immediate.</p>
              </div>
              {edits.auto_publish_approved === "true" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Auto-publish is enabled. Articles will go live automatically after approval{parseInt(edits.publish_delay_minutes || "0") > 0 ? ` with a ${edits.publish_delay_minutes} minute delay` : ""}.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
