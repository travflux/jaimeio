import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Globe } from "lucide-react";

export default function SettingsHomepage() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  const trendingHours = parseInt(edits.trending_time_window_hours || "72");

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Homepage"
        description="Configure homepage layout, sections, and display options."
        icon={<Globe className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trending Time Window */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trending Articles</CardTitle>
              <CardDescription>Control the time window for trending/most-viewed articles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Trending Time Window</label>
                  <span className="text-lg font-bold text-primary">
                    {trendingHours < 24 ? `${trendingHours}h` : `${Math.round(trendingHours / 24)}d`}
                  </span>
                </div>
                <Slider
                  value={[trendingHours]}
                  onValueChange={([v]) => updateEdit("trending_time_window_hours", String(v))}
                  min={1} max={168} step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 hour</span><span>24h</span><span>72h</span><span>1 week</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => updateEdit("trending_time_window_hours", "24")}>
                  24 hours
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateEdit("trending_time_window_hours", "72")}>
                  3 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateEdit("trending_time_window_hours", "168")}>
                  1 week
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Articles published within this window are eligible for the trending section. Shorter windows show more recent content.
              </p>
            </CardContent>
          </Card>

          {/* Homepage Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Homepage Sections</CardTitle>
              <CardDescription>Control which sections appear on the homepage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Latest Headlines Ticker</label>
                  <p className="text-xs text-muted-foreground">Display a scrolling banner at the top showing the most recent breaking news stories.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${edits.homepage_show_ticker === "true" ? "text-green-600" : "text-muted-foreground"}`}>
                    {edits.homepage_show_ticker === "true" ? "ON" : "OFF"}
                  </span>
                  <Switch
                    checked={edits.homepage_show_ticker === "true"}
                    onCheckedChange={(checked) => updateEdit("homepage_show_ticker", checked ? "true" : "false")}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Trending & Popular Section</label>
                  <p className="text-xs text-muted-foreground">Display a dedicated section showing articles that are getting the most reader engagement and views.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${edits.homepage_show_trending === "true" ? "text-green-600" : "text-muted-foreground"}`}>
                    {edits.homepage_show_trending === "true" ? "ON" : "OFF"}
                  </span>
                  <Switch
                    checked={edits.homepage_show_trending === "true"}
                    onCheckedChange={(checked) => updateEdit("homepage_show_trending", checked ? "true" : "false")}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Category-Based Article Grid</label>
                  <p className="text-xs text-muted-foreground">Display articles organized by topic (Business, Entertainment, Politics, etc.) for easier browsing.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${edits.homepage_show_categories === "true" ? "text-green-600" : "text-muted-foreground"}`}>
                    {edits.homepage_show_categories === "true" ? "ON" : "OFF"}
                  </span>
                  <Switch
                    checked={edits.homepage_show_categories === "true"}
                    onCheckedChange={(checked) => updateEdit("homepage_show_categories", checked ? "true" : "false")}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Right Sidebar (Ads & Widgets)</label>
                  <p className="text-xs text-muted-foreground">Display the right sidebar containing advertisement spaces and additional content widgets.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${edits.homepage_show_sidebar !== "false" ? "text-green-600" : "text-muted-foreground"}`}>
                    {edits.homepage_show_sidebar !== "false" ? "ON" : "OFF"}
                  </span>
                  <Switch
                    checked={edits.homepage_show_sidebar !== "false"}
                    onCheckedChange={(checked) => updateEdit("homepage_show_sidebar", checked ? "true" : "false")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Display Options</CardTitle>
              <CardDescription>Customize how articles are displayed on the homepage.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium mb-1 block">Initial Article Count</label>
                  <input
                    type="number"
                    value={edits.homepage_initial_article_count || "40"}
                    onChange={(e) => updateEdit("homepage_initial_article_count", e.target.value)}
                    min={10} max={200}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Number of articles to load initially before "Load More" button.</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Articles Per Page</label>
                  <input
                    type="number"
                    value={edits.homepage_articles_per_page || "20"}
                    onChange={(e) => updateEdit("homepage_articles_per_page", e.target.value)}
                    min={5} max={50}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Featured Articles Count</label>
                  <input
                    type="number"
                    value={edits.homepage_featured_count || "3"}
                    onChange={(e) => updateEdit("homepage_featured_count", e.target.value)}
                    min={1} max={10}
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Number of articles shown in the featured/hero section.</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Site Tagline</label>
                  <input
                    type="text"
                    value={edits.site_tagline || ""}
                    onChange={(e) => updateEdit("site_tagline", e.target.value)}
                    placeholder="Your daily dose of satirical news"
                    className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
