import AdminLayout from "@/components/AdminLayout";
import SettingsPageLayout from "@/components/SettingsPageLayout";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShoppingCart, AlertTriangle } from "lucide-react";

export default function SettingsAmazon() {
  const { edits, updateEdit, hasChanges, handleSaveAll, isLoading, isSaving } = useSettings();

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <SettingsPageLayout
        title="Amazon Ads"
        description="Configure Amazon Associates affiliate ads and product recommendations."
        icon={<ShoppingCart className="w-5 h-5 text-primary" />}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSaveAll}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Amazon Associates</CardTitle>
              <CardDescription>Configure your Amazon affiliate tracking and ad display.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Enable Amazon Ads</p>
                  <p className="text-xs text-muted-foreground mt-1">Show Amazon product recommendations on your site</p>
                </div>
                <Switch
                  checked={edits.amazon_products_enabled === "true"}
                  onCheckedChange={(checked) => updateEdit("amazon_products_enabled", checked ? "true" : "false")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Amazon Associate Tag</label>
                <input
                  type="text"
                  value={edits.amazon_associate_tag || ""}
                  onChange={(e) => updateEdit("amazon_associate_tag", e.target.value)}
                  placeholder="yoursite-20"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Your Amazon Associates tracking ID. Find it in your{" "}
                  <a href="https://affiliate-program.amazon.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Amazon Associates dashboard
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Product Search Keywords</label>
                <input
                  type="text"
                  value={edits.amazon_product_keywords ? JSON.parse(edits.amazon_product_keywords).join(", ") : ""}
                  onChange={(e) => {
                    const keywords = e.target.value.split(",").map(k => k.trim()).filter(Boolean);
                    updateEdit("amazon_product_keywords", JSON.stringify(keywords));
                  }}
                  placeholder="satire, comedy, political humor, books"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated keywords for product recommendations. These are combined with article content for better targeting.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Amazon Affiliate Link</label>
                <input
                  type="url"
                  value={edits.amazon_affiliate_link || ""}
                  onChange={(e) => updateEdit("amazon_affiliate_link", e.target.value)}
                  placeholder="https://www.amazon.com/?tag=yoursite-20"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Your Amazon storefront or affiliate landing page URL.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Amazon Keywords</label>
                <input
                  type="text"
                  value={edits.amazon_keywords || ""}
                  onChange={(e) => updateEdit("amazon_keywords", e.target.value)}
                  placeholder="funny gifts, satire books, political humor"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Default keywords for Amazon product search when article-specific keywords are unavailable.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cache Duration (hours)</label>
                <input
                  type="number"
                  value={edits.amazon_cache_ttl_hours || "24"}
                  onChange={(e) => updateEdit("amazon_cache_ttl_hours", e.target.value)}
                  min="1" max="168"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  How long to cache product data before refreshing (1-168 hours)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Amazon API Credentials</CardTitle>
              <CardDescription>Required for the Product Advertising API to fetch product data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client ID (Access Key)</label>
                <input
                  type="password"
                  value={edits.amazon_client_id || ""}
                  onChange={(e) => updateEdit("amazon_client_id", e.target.value)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Your Amazon Product Advertising API access key.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Secret (Secret Key)</label>
                <input
                  type="password"
                  value={edits.amazon_client_secret || ""}
                  onChange={(e) => updateEdit("amazon_client_secret", e.target.value)}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Your Amazon Product Advertising API secret key. Keep this confidential.
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Get API credentials from the <a href="https://affiliate-program.amazon.com/assoc_credentials/home" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Amazon Associates Product Advertising API</a> page.</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Important Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-blue-900 dark:text-blue-300">Getting Started with Amazon Associates</p>
                    <ul className="text-blue-700 dark:text-blue-400 space-y-1.5 list-disc list-inside text-xs">
                      <li>Amazon ads only display on published sites, not in preview mode</li>
                      <li>It may take 24-48 hours for Amazon to approve your tracking ID</li>
                      <li>Ads are shown on article pages (after source attribution) and homepage sidebar</li>
                      <li>Monitor your earnings in the Amazon Associates dashboard</li>
                      <li>Make sure your site complies with Amazon's operating agreement</li>
                    </ul>
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
