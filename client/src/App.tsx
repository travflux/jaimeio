import { Toaster } from "@/components/ui/sonner";
import MascotEasterEgg from "./components/MascotEasterEgg";
import { useAttributionTracking } from "@/hooks/useAttributionTracking";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { setCanonicalURL, setNoIndex, removeNoIndex } from "@/lib/og-tags";
import { useBranding } from "@/hooks/useBranding";
import { useGtag } from "@/hooks/useGtag";
import { useClarity } from "@/hooks/useClarity";
import { trackPageView } from "@/lib/analytics";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ArticlePage from "./pages/ArticlePage";
import CategoryPage from "./pages/CategoryPage";
import EnhancedSearchPage from "./pages/EnhancedSearchPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminArticles from "./pages/admin/AdminArticles";
import AdminArticleEditor from "./pages/admin/AdminArticleEditor";
import AdminAiGenerator from "./pages/admin/AdminAiGenerator";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminNewsletter from "./pages/admin/AdminNewsletter";

import AdminWorkflow from "./pages/admin/AdminWorkflow";
import AdminLicenses from "./pages/AdminLicenses";
import SettingsGeneration from "./pages/admin/settings/SettingsGeneration";
import SettingsPublishing from "./pages/admin/settings/SettingsPublishing";
import SettingsImages from "./pages/admin/settings/SettingsImages";
import SettingsVideos from "./pages/admin/settings/SettingsVideos";
import SettingsSocial from "./pages/admin/settings/SettingsSocial";
import SettingsHomepage from "./pages/admin/settings/SettingsHomepage";
import SettingsSchedule from "./pages/admin/settings/SettingsSchedule";
import SettingsAmazon from "./pages/admin/settings/SettingsAmazon";
import SettingsSponsor from "./pages/admin/settings/SettingsSponsor";
import SettingsMerch from "./pages/admin/settings/SettingsMerch";
import MerchPipeline from "./pages/admin/MerchPipeline";
import AdminSocialDistribution from "./pages/admin/AdminSocialDistribution";
import AdminSMS from "./pages/admin/AdminSMS";
import AdminSetup from "./pages/admin/AdminSetup";
import SettingsPromotion from "./pages/admin/settings/SettingsPromotion";
import SettingsCategoryBalance from "./pages/admin/settings/SettingsCategoryBalance";
import SettingsBranding from "./pages/admin/settings/SettingsBranding";

import AdminSearchAnalytics from "./pages/admin/AdminSearchAnalytics";
import AdminAttribution from "./pages/admin/AdminAttribution";
import AdminSourceFeeds from "./pages/admin/AdminSourceFeeds";
import AdminFeedPerformance from "./pages/admin/AdminFeedPerformance";
import XQueuePage from "./pages/admin/XQueuePage";
import XReplyQueuePage from "./pages/admin/XReplyQueuePage";
import StandaloneTweetPage from "./pages/admin/StandaloneTweetPage";
import CeoDirectives from "./pages/admin/CeoDirectives";
import AdminMigration from "./pages/admin/AdminMigration";
import AdminDeploymentUpdates from "./pages/admin/AdminDeploymentUpdates";
import AdminSources from "./pages/admin/AdminSources";
import AdminCandidates from "./pages/admin/AdminCandidates";
import AdminTags from "./pages/admin/AdminTags";
import AdminImageLicenses from "./pages/admin/AdminImageLicenses";
import AdminSponsorAttribution from "./pages/admin/AdminSponsorAttribution";
import AdminImageSources from "./pages/admin/AdminImageSources";
import ContactPage from "./pages/ContactPage";
import AdvertisePage from "./pages/AdvertisePage";
import CareersPage from "./pages/CareersPage";
import AboutPage from "./pages/AboutPage";
import PrivacyTermsPage from "./pages/PrivacyTermsPage";
import EditorialStandardsPage from "./pages/EditorialStandardsPage";
import TrendingPage from "./pages/TrendingPage";
import MostReadPage from "./pages/MostReadPage";
import EditorsPicksPage from "./pages/EditorsPicksPage";
import Latest from "./pages/Latest";
import ShopPage from "./pages/ShopPage";
import SiteMapPage from "./pages/SiteMapPage";
import TagPage from "./pages/TagPage";
import TagsIndexPage from "./pages/TagsIndexPage";
import ArchivePage from "./pages/ArchivePage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/article/:slug" component={ArticlePage} />
      <Route path="/shop/:slug" component={ShopPage} />
      <Route path="/category/:slug" component={CategoryPage} />
      <Route path="/search" component={EnhancedSearchPage} />
      <Route path="/tags" component={TagsIndexPage} />
      <Route path="/tag/:slug" component={TagPage} />
      <Route path="/archive" component={ArchivePage} />
      <Route path="/trending" component={TrendingPage} />
      <Route path="/most-read" component={MostReadPage} />
      <Route path="/editors-picks" component={EditorsPicksPage} />
      <Route path="/latest" component={Latest} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/advertise" component={AdvertisePage} />
      <Route path="/careers" component={CareersPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/privacy" component={PrivacyTermsPage} />
      <Route path="/editorial-standards" component={EditorialStandardsPage} />
      <Route path="/sitemap" component={SiteMapPage} />
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/articles" component={AdminArticles} />
      <Route path="/admin/articles/new" component={AdminArticleEditor} />
      <Route path="/admin/articles/:id" component={AdminArticleEditor} />
      <Route path="/admin/ai" component={AdminAiGenerator} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/newsletter" component={AdminNewsletter} />

      <Route path="/admin/workflow" component={AdminWorkflow} />
      <Route path="/admin/settings/generation" component={SettingsGeneration} />
      <Route path="/admin/settings/sources" component={AdminSourceFeeds} />
      <Route path="/admin/settings/publishing" component={SettingsPublishing} />
      <Route path="/admin/settings/images" component={SettingsImages} />
      <Route path="/admin/settings/videos" component={SettingsVideos} />
      <Route path="/admin/settings/social" component={SettingsSocial} />
      <Route path="/admin/settings/homepage" component={SettingsHomepage} />
      <Route path="/admin/settings/schedule" component={SettingsSchedule} />
      <Route path="/admin/settings/amazon" component={SettingsAmazon} />
      <Route path="/admin/settings/sponsor" component={SettingsSponsor} />
      <Route path="/admin/settings/merch" component={SettingsMerch} />
      <Route path="/admin/merch-pipeline" component={MerchPipeline} />
      <Route path="/admin/social-distribution" component={AdminSocialDistribution} />
      <Route path="/admin/sms" component={AdminSMS} />
      <Route path="/admin/setup" component={AdminSetup} />
      <Route path="/admin/settings/promotion" component={SettingsPromotion} />
      <Route path="/admin/settings/category-balance" component={SettingsCategoryBalance} />
      <Route path="/admin/settings/branding" component={SettingsBranding} />
      <Route path="/admin/licenses" component={AdminLicenses} />
      <Route path="/admin/search-analytics" component={AdminSearchAnalytics} />
      <Route path="/admin/attribution" component={AdminAttribution} />
      <Route path="/admin/source-feeds" component={AdminSourceFeeds} />
      <Route path="/admin/feed-performance" component={AdminFeedPerformance} />
      <Route path="/admin/x-queue" component={XQueuePage} />
      <Route path="/admin/x-reply-queue" component={XReplyQueuePage} />
      <Route path="/admin/standalone-tweets" component={StandaloneTweetPage} />
      <Route path="/admin/ceo-directives" component={CeoDirectives} />
      <Route path="/admin/migration" component={AdminMigration} />
      <Route path="/admin/deployment-updates" component={AdminDeploymentUpdates} />
      <Route path="/admin/sources" component={AdminSources} />
      <Route path="/admin/candidates" component={AdminCandidates} />
      <Route path="/admin/tags" component={AdminTags} />
      <Route path="/admin/image-licenses" component={AdminImageLicenses} />
      <Route path="/admin/sponsor-attribution" component={AdminSponsorAttribution} />
      <Route path="/admin/image-sources" component={AdminImageSources} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  useAttributionTracking();
  const { branding } = useBranding();
  useGtag(); // v4.7.3: inject GA tag dynamically from brand_gtag_id setting
  useClarity(branding.clarityId); // v4.8.0: inject Clarity script dynamically from brand_clarity_id setting

  // Inject favicon from brand_favicon_url setting so white-label deployments
  // can use their own icon without modifying index.html.
  useEffect(() => {
    if (!branding.faviconUrl) return;
    const updateFavicon = (selector: string, type: string) => {
      let link = document.querySelector(selector) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link') as HTMLLinkElement;
        link.setAttribute('rel', 'icon');
        link.setAttribute('type', type);
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl!;
    };
    updateFavicon('link[rel="icon"][type="image/x-icon"]', 'image/x-icon');
    updateFavicon('link[rel="icon"][type="image/png"]', 'image/png');
  }, [branding.faviconUrl]);

  // Exclude admin/owner users from all analytics tracking.
  // Umami checks localStorage["umami.disabled"] before firing any event.
  // Our first-party /api/pv beacon checks the same flag via isAdminUser() in usePageView.
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  useEffect(() => {
    if (meQuery.isLoading) return;
    if (meQuery.data?.role === "admin") {
      localStorage.setItem("umami.disabled", "1");
    } else {
      localStorage.removeItem("umami.disabled");
    }
  }, [meQuery.data, meQuery.isLoading]);

  // Set canonical URL for www/non-www consistency
  // Derives preference from site_url DB setting so every deployment works correctly
  // without manual configuration. Falls back to no redirect if site_url is not set.
  useEffect(() => {
    const siteUrl = branding.siteUrl || window.location.origin;
    const usesWww = siteUrl.includes('://www.');
    setCanonicalURL(usesWww ? 'www' : 'non-www');
  }, [branding.siteUrl]);

  // Set noindex for admin pages
  useEffect(() => {
    if (location.startsWith('/admin')) {
      setNoIndex();
    } else {
      removeNoIndex();
    }
  }, [location]);

  // v4.9.0: JS-only page view tracking. Fires on every route change.
  // Bots don't execute JS, so only real human visits are recorded.
  // Admin users are excluded from tracking.
  useEffect(() => {
    if (location.startsWith('/admin')) return;
    if (meQuery.data?.role === 'admin') return;
    trackPageView();
  }, [location, meQuery.data]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <MascotEasterEgg />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
