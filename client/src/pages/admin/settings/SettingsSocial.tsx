import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import SocialMediaComposer from "@/components/SocialMediaComposer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Share2, AlertTriangle } from "lucide-react";

export default function SettingsSocial() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Social Media"
        description="Configure social media distribution, X posting, and Reddit integration."
        icon={<Share2 className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        {/* Post Composer */}
        <SocialMediaComposer />

        {/* Social Distribution Config */}
        <div className="mt-8 pt-8 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">Social Distribution Configuration</h3>
        </div>

        {/* Site URL */}
        <Card className="mb-6">
          <CardContent className="py-4 space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Site URL</label>
              <input type="url" value={edits.site_url || "https://example.com"} onChange={(e) => updateEdit("site_url", e.target.value)}
                placeholder="https://example.com" className="w-full px-3 py-2 border rounded-md bg-background" />
              <p className="text-xs text-muted-foreground mt-1.5">Your custom domain URL used in social media posts and RSS feeds.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Social Media Distribution</CardTitle>
              <CardDescription>Configure automatic social media post generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto-Create Social Posts</label>
                  <p className="text-xs text-muted-foreground">Generate social posts when articles are published</p>
                </div>
                <Switch
                  checked={edits.auto_create_social_posts === "true"}
                  onCheckedChange={v => updateEdit("auto_create_social_posts", String(v))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto-Post on Publish</label>
                  <p className="text-xs text-muted-foreground">Automatically send posts to social platforms when articles are published (no manual trigger needed).</p>
                </div>
                <Switch
                  checked={edits.auto_post_on_publish === "true"}
                  onCheckedChange={v => updateEdit("auto_post_on_publish", String(v))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Active Platforms</label>
                <div className="space-y-2">
                  {["twitter", "facebook", "linkedin", "instagram", "threads"].map(platform => {
                    const platforms = (edits.social_platforms || "twitter,facebook,linkedin").split(",").map(s => s.trim());
                    const isActive = platforms.includes(platform);
                    return (
                      <div key={platform} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{platform === "twitter" ? "X (Twitter)" : platform}</span>
                        <Switch
                          checked={isActive}
                          onCheckedChange={v => {
                            const updated = v ? [...platforms, platform] : platforms.filter(p => p !== platform);
                            updateEdit("social_platforms", updated.filter(Boolean).join(","));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reddit Integration */}
        <div className="mt-8 pt-8 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">Reddit Integration</h3>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reddit Auto-Posting</CardTitle>
            <CardDescription>
              Automatically post articles to Reddit when published. Requires a Reddit "script" app from{" "}
              <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">reddit.com/prefs/apps</a>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <label className="text-sm font-medium">Enable Reddit Posting</label>
                <p className="text-xs text-muted-foreground">Automatically post articles to Reddit when they're published.</p>
              </div>
              <Switch
                checked={edits.reddit_enabled === "true"}
                onCheckedChange={(checked) => updateEdit("reddit_enabled", checked ? "true" : "false")}
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Reddit Client ID</label>
                <input type="text" value={edits.reddit_client_id || ""} onChange={(e) => updateEdit("reddit_client_id", e.target.value)}
                  placeholder="Your Reddit app client ID" className="w-full px-3 py-2 border rounded-md bg-background" />
                <p className="text-xs text-muted-foreground mt-1.5">Get this from <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">reddit.com/prefs/apps</a> → create "script" app.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Reddit Client Secret</label>
                <input type="password" value={edits.reddit_client_secret || ""} onChange={(e) => updateEdit("reddit_client_secret", e.target.value)}
                  placeholder="Your Reddit app client secret" className="w-full px-3 py-2 border rounded-md bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Reddit Username</label>
                <input type="text" value={edits.reddit_username || ""} onChange={(e) => updateEdit("reddit_username", e.target.value)}
                  placeholder="your_reddit_username" className="w-full px-3 py-2 border rounded-md bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Reddit Password</label>
                <input type="password" value={edits.reddit_password || ""} onChange={(e) => updateEdit("reddit_password", e.target.value)}
                  placeholder="your_password (or password:123456 for 2FA)" className="w-full px-3 py-2 border rounded-md bg-background" />
                <p className="text-xs text-muted-foreground mt-1.5">If 2FA is enabled, use format: <code className="bg-muted px-1 rounded">password:123456</code></p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Target Subreddit</label>
                <input type="text" value={edits.reddit_subreddit || "test"} onChange={(e) => updateEdit("reddit_subreddit", e.target.value)}
                  placeholder="test" className="w-full px-3 py-2 border rounded-md bg-background" />
                <p className="text-xs text-muted-foreground mt-1.5">Subreddit name without r/ (e.g., "test", "funny", "news").</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Post Type</label>
                <select value={edits.reddit_post_type || "link"} onChange={(e) => updateEdit("reddit_post_type", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background">
                  <option value="link">Link Post (direct link to article)</option>
                  <option value="text">Text Post (link in body)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Post Title Template</label>
                <input type="text" value={edits.reddit_title_template || "{{headline}}"} onChange={(e) => updateEdit("reddit_title_template", e.target.value)}
                  placeholder="{{headline}}" className="w-full px-3 py-2 border rounded-md bg-background" />
                <p className="text-xs text-muted-foreground mt-1.5">Use <code className="bg-muted px-1 rounded">{`{{headline}}`}</code> for article headline.</p>
              </div>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" /> Setup Instructions
              </h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">reddit.com/prefs/apps</a></li>
                <li>Click "create another app" → choose "script"</li>
                <li>Set redirect URI to <code className="bg-muted px-1 rounded">http://localhost:8080</code></li>
                <li>Copy your client_id and client_secret</li>
                <li>Paste credentials above and test with r/test subreddit first</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </SettingsPageLayout>
    </AdminLayout>
  );
}
