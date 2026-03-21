import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, TrendingUp, Info } from "lucide-react";

export default function SettingsPromotion() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Promotion Candidates"
        description="Configure thresholds for identifying articles worth boosting on X. Candidates appear in CEO Dashboard §9."
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qualification Thresholds</CardTitle>
              <CardDescription>Articles must clear these thresholds to appear as promotion candidates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Enable Promotion Candidates</p>
                  <p className="text-xs text-muted-foreground mt-1">Surface qualifying articles in CEO Dashboard §9</p>
                </div>
                <Switch
                  checked={edits.promo_enabled !== "false"}
                  onCheckedChange={(checked) => updateEdit("promo_enabled", checked ? "true" : "false")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Article Age (hours)</label>
                <input
                  type="number"
                  value={edits.promo_max_age_hours || "48"}
                  onChange={(e) => updateEdit("promo_max_age_hours", e.target.value)}
                  min="1" max="168"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Only consider articles published within this window. X rewards timely content — stale posts underperform in paid.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Min X Views</label>
                <input
                  type="number"
                  value={edits.promo_min_x_views || "10"}
                  onChange={(e) => updateEdit("promo_min_x_views", e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum page views from X traffic required. Proves the headline resonated organically before spending money.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Min Affiliate CTR (%)</label>
                <input
                  type="number"
                  value={edits.promo_min_affiliate_ctr || "0"}
                  onChange={(e) => updateEdit("promo_min_affiliate_ctr", e.target.value)}
                  min="0" max="100" step="0.1"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum affiliate click-through rate. Set to 0 to ignore affiliate performance in qualification (recommended at low traffic).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Display & Diversity</CardTitle>
              <CardDescription>Control how many candidates appear and prevent category over-representation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Candidates Shown</label>
                <input
                  type="number"
                  value={edits.promo_max_candidates || "10"}
                  onChange={(e) => updateEdit("promo_max_candidates", e.target.value)}
                  min="1" max="50"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of promotion candidates to display on the CEO Dashboard.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Per Category</label>
                <input
                  type="number"
                  value={edits.promo_category_cap || "3"}
                  onChange={(e) => updateEdit("promo_category_cap", e.target.value)}
                  min="1" max="20"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum candidates from the same category. Prevents promoting 5 Politics articles and nothing else — spreads budget across audience segments.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Scoring Formula</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm space-y-3">
                    <p className="font-medium text-blue-900 dark:text-blue-300">
                      Score = (X Views × 10) + (Affiliate CTR × 50) + max(0, 48 − hours_live)
                    </p>
                    <div className="text-blue-700 dark:text-blue-400 text-xs space-y-1.5">
                      <p><strong>X Views × 10</strong> — dominant factor. Proven click-through from X is the strongest signal. 30 X views = 300 points.</p>
                      <p><strong>Affiliate CTR × 50</strong> — revenue signal. A 2% CTR adds 100 points. Rewards articles that monetize, not just attract clicks.</p>
                      <p><strong>Freshness bonus</strong> — tiebreaker. A 6h-old article gets +42; a 40h-old article gets +8. Promotes fresher content when scores are close.</p>
                    </div>
                    <p className="text-blue-700 dark:text-blue-400 text-xs">
                      Candidates are sorted by score descending, then the category cap is applied, then the display limit. The CEO sees the final ranked list in Dashboard §9.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
