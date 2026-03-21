import { Link } from "wouter";
import { Settings, Zap, Image, Video, Share2, Gamepad2, Home, Calendar, ShoppingCart, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";

export default function SettingsOverview() {
  const { data: settings, isLoading } = trpc.settings.list.useQuery();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Settings Overview</h1>
            <p className="text-muted-foreground mt-2">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const settingsMap = new Map(settings?.map((s: any) => [s.key, s.value]) || []);

  const getStatus = (key: string, trueValue = "true") => {
    return settingsMap.get(key) === trueValue;
  };

  const getValue = (key: string, defaultValue = "Not set") => {
    return settingsMap.get(key) || defaultValue;
  };

  const settingsSections = [
    {
      title: "Generation",
      description: "Article volume, writing style, and AI generation settings",
      icon: Zap,
      href: "/admin/settings/generation",
      status: [
        { label: "Articles per batch", value: getValue("articles_per_batch", "25") },
        { label: "Target length", value: `${getValue("target_article_length", "200")} words` },
        { label: "Auto-generate images", value: getStatus("auto_generate_images") ? "Enabled" : "Disabled", enabled: getStatus("auto_generate_images") },
      ]
    },
    {
      title: "Sources",
      description: "RSS feeds and supplementary news sources",
      icon: FileText,
      href: "/admin/settings/sources",
      status: [
        { label: "Google News", value: getStatus("include_google_news") ? "Enabled" : "Disabled", enabled: getStatus("include_google_news") },
        { label: "News regions", value: getValue("news_regions", "US,GB,CA,AU") },
      ]
    },
    {
      title: "Publishing",
      description: "Publication speed and auto-publish behavior",
      icon: Zap,
      href: "/admin/settings/publishing",
      status: [
        { label: "Max per day", value: getValue("max_publications_per_day", "50") },
        { label: "Stagger interval", value: `${getValue("stagger_interval_minutes", "30")} min` },
        { label: "Auto-publish", value: getStatus("auto_publish_approved") ? "Enabled" : "Disabled", enabled: getStatus("auto_publish_approved") },
      ]
    },
    {
      title: "Images",
      description: "Image generation provider, styles, and watermark",
      icon: Image,
      href: "/admin/settings/images",
      status: [
        { label: "Provider", value: getValue("image_provider", "Manus (Built-in)") },
        { label: "Watermark", value: getStatus("enable_watermark") ? "Enabled" : "Disabled", enabled: getStatus("enable_watermark") },
        { label: "Watermark text", value: getValue("watermark_text", "hambry.com") },
      ]
    },
    {
      title: "Videos",
      description: "Video generation settings and provider configuration",
      icon: Video,
      href: "/admin/settings/videos",
      status: [
        { label: "Auto-generate", value: getStatus("auto_generate_videos") ? "Enabled" : "Disabled", enabled: getStatus("auto_generate_videos") },
        { label: "Provider", value: getValue("video_provider", "Not configured") },
      ]
    },
    {
      title: "Social Media",
      description: "X/Twitter posting and Reddit integration",
      icon: Share2,
      href: "/admin/settings/social",
      status: [
        { label: "Auto-create posts", value: getStatus("auto_create_social_posts") ? "Enabled" : "Disabled", enabled: getStatus("auto_create_social_posts") },
        { label: "Auto-post to X", value: getStatus("auto_post_to_x") ? "Enabled" : "Disabled", enabled: getStatus("auto_post_to_x") },
        { label: "Post to Reddit", value: getStatus("post_to_reddit") ? "Enabled" : "Disabled", enabled: getStatus("post_to_reddit") },
      ]
    },
    {
      title: "Games & Fun",
      description: "Enable or disable horoscopes, crosswords, and other features",
      icon: Gamepad2,
      href: "/admin/settings/goodies",
      status: [
        { label: "Horoscopes", value: getStatus("enable_horoscopes") ? "Enabled" : "Disabled", enabled: getStatus("enable_horoscopes") },
        { label: "Crosswords", value: getStatus("enable_crosswords") ? "Enabled" : "Disabled", enabled: getStatus("enable_crosswords") },
      ]
    },
    {
      title: "Homepage",
      description: "Featured articles and homepage layout",
      icon: Home,
      href: "/admin/settings/homepage",
      status: [
        { label: "Featured count", value: getValue("featured_articles_count", "3") },
      ]
    },
    {
      title: "Schedule",
      description: "Workflow automation and batch timing",
      icon: Calendar,
      href: "/admin/settings/schedule",
      status: [
        { label: "Workflow", value: getStatus("workflow_enabled") ? "Enabled" : "Disabled", enabled: getStatus("workflow_enabled") },
        { label: "Schedule", value: getValue("workflow_schedule", "Daily at 4:00 AM") },
      ]
    },
    {
      title: "Amazon Ads",
      description: "Amazon Associates affiliate ads configuration",
      icon: ShoppingCart,
      href: "/admin/settings/amazon",
      status: [
        { label: "Amazon ads", value: getStatus("amazon_enabled") ? "Enabled" : "Disabled", enabled: getStatus("amazon_enabled") },
        { label: "Tracking ID", value: getValue("amazon_tracking_id", "Not set") },
      ]
    },
  ];

  return (
    <AdminLayout>
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Settings Overview</h1>
          </div>
          <p className="text-muted-foreground">
            Quick view of all system settings with direct links to configuration pages.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                      </div>
                    </div>
                    {/* eslint-disable-next-line */}
                    <CardDescription className="mt-2">
                      {section.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {section.status.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}:</span>
                          <span className="font-medium">
                            {item.enabled !== undefined ? (
                              <Badge variant={item.enabled ? "default" : "secondary"}>
                                {item.value}
                              </Badge>
                            ) : (
                              <span className="text-foreground">{item.value}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
