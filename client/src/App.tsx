import { Toaster } from "@/components/ui/sonner";
import { useAttributionTracking } from "@/hooks/useAttributionTracking";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { setCanonicalURL, setNoIndex, removeNoIndex } from "@/lib/og-tags";
import { useBranding } from "@/hooks/useBranding";
import { useBrandPalette } from "@/hooks/useBrandPalette";
import { applyBrandTheme } from "@/utils/applyBrandTheme";
import { applyBrandFonts } from "@/utils/applyBrandFonts";
import { useGtag } from "@/hooks/useGtag";
import { useClarity } from "@/hooks/useClarity";
import { trackPageView } from "@/lib/analytics";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Template system
import { TemplateRenderer } from "./templates/TemplateRenderer";

// Existing pages
import ArticlePage from "./pages/ArticlePage";
import CategoryPage from "./pages/CategoryPage";
import CategoriesPage from "./pages/CategoriesPage";
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
import AdminMonetization from "./pages/admin/AdminMonetization";
import AdminTags from "./pages/admin/AdminTags";
import AdminImageLicenses from "./pages/admin/AdminImageLicenses";
import AdminSponsorAttribution from "./pages/admin/AdminSponsorAttribution";
import AdminImageSources from "./pages/admin/AdminImageSources";
import AdminPages from "./pages/admin/AdminPages";
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
import AdminLogin from "./pages/AdminLogin";
import AdminDomains from "./pages/admin/AdminDomains";
import MissionControl from "./pages/admin/MissionControl";
import TenantDashboard from "./pages/TenantDashboard";
import TenantLogin from "./pages/TenantLogin";
import TenantSetup from "./pages/TenantSetup";
import TenantSettings from "./pages/tenant/TenantSettings";
import TenantContentEngine from "./pages/tenant/TenantContentEngine";
import TenantAIGenerator from "./pages/tenant/TenantAIGenerator";
import TenantCategoryBalance from "./pages/tenant/TenantCategoryBalance";
import TenantXReplyQueue from "./pages/tenant/TenantXReplyQueue";
import TenantSponsorSchedule from "./pages/tenant/TenantSponsorSchedule";
import TenantSocialQueue from "./pages/tenant/TenantSocialQueue";
import TenantDesignTheme from "./pages/tenant/TenantDesignTheme";
import TenantPublishing from "./pages/tenant/TenantPublishing";
import TenantImageSettings from "./pages/tenant/TenantImageSettings";
import TenantIntegrations from "./pages/tenant/TenantIntegrations";
import SupportArticlePage from "./pages/SupportArticlePage";
import AdminSupportArticles from "./pages/admin/AdminSupportArticles";
import PerformanceDashboard from "./pages/admin/PerformanceDashboard";



// ═══ Tenant Portal Pages ═══
import TenantDashboardPage from "./pages/tenant/TenantDashboardPage";
import TenantArticles from "./pages/tenant/TenantArticles";
import TenantBranding from "./pages/tenant/TenantBranding";
import TenantBilling from "./pages/tenant/TenantBilling";
import TenantUsers from "./pages/tenant/TenantUsers";
import TenantCommunications from "./pages/tenant/TenantCommunications";
import TenantNewsletter from "./pages/tenant/TenantNewsletter";
import TenantSMS from "./pages/tenant/TenantSMS";
import TenantNotifications from "./pages/tenant/TenantNotifications";
import TenantApiAccess from "./pages/tenant/TenantApiAccess";
import TenantWorkflow from "./pages/tenant/TenantWorkflow";
import TenantCreateArticle from "./pages/tenant/TenantCreateArticle";
import TenantCalendar from "./pages/tenant/TenantCalendar";
import TenantTemplates from "./pages/tenant/TenantTemplates";
import TenantCategories from "./pages/tenant/TenantCategories";
import TenantTags from "./pages/tenant/TenantTags";
import TenantPages from "./pages/tenant/TenantPages";
import TenantSourceFeeds from "./pages/tenant/TenantSourceFeeds";
import TenantFeedPerformance from "./pages/tenant/TenantFeedPerformance";
import TenantSourceManager from "./pages/tenant/TenantSourceManager";
import TenantXListening from "./pages/tenant/TenantXListening";
import TenantYouTubeListening from "./pages/tenant/TenantYouTubeListening";
import TenantRedditListening from "./pages/tenant/TenantRedditListening";
import TenantCandidates from "./pages/tenant/TenantCandidates";
import TenantMediaLibrary from "./pages/tenant/TenantMediaLibrary";
import TenantSEO from "./pages/tenant/TenantSEO";
import TenantIndexSettings from "./pages/tenant/TenantIndexSettings";
import TenantGEO from "./pages/tenant/TenantGEO";
import TenantDistribution from "./pages/tenant/TenantDistribution";
import TenantPostQueue from "./pages/tenant/TenantPostQueue";
import TenantSocialPerformance from "./pages/tenant/TenantSocialPerformance";
import TenantRevenue from "./pages/tenant/TenantRevenue";
import TenantMonetizationSettings from "./pages/tenant/TenantMonetizationSettings";
import TenantAdSense from "./pages/tenant/TenantAdSense";
import TenantAmazon from "./pages/tenant/TenantAmazon";
import TenantSponsorship from "./pages/tenant/TenantSponsorship";
import TenantSponsorAttribution from "./pages/tenant/TenantSponsorAttribution";
import TenantMerchStore from "./pages/tenant/TenantMerchStore";
import TenantMerchPipeline from "./pages/tenant/TenantMerchPipeline";
import TenantTicket from "./pages/tenant/TenantTicket";
import TenantWhiteLabel from "./pages/tenant/TenantWhiteLabel";
import ResetPassword from "./pages/ResetPassword";
import ResellerMissionControl from "./pages/tenant/ResellerMissionControl";

// Detect if we're on app.getjaime.io or a tenant subdomain
function useIsAppDomain() {
  const hostname = window.location.hostname;
  return hostname === "app.getjaime.io" || hostname === "staging.getjaime.io" || hostname === "localhost" || hostname === "127.0.0.1";
}

// Root page: app.getjaime.io shows super admin login, subdomains show template
function RootPage() {
  if (useIsAppDomain()) return <AdminLogin />;
  return <TemplateRenderer page="home" />;
}

// /admin on app domain = mission control, on tenant subdomain = tenant login
function AdminRootPage() {
  if (useIsAppDomain()) return <MissionControl />;
  return <TenantLogin />;
}

// Wrapper for template article page
function TemplateArticlePage({ params }: { params: { slug: string } }) {
  return <TemplateRenderer page="article" slug={params.slug} />;
}

// Wrapper for template category page
function TemplateCategoryPage({ params }: { params: { slug: string } }) {
  return <TemplateRenderer page="category" slug={params.slug} />;
}

function Router() {
  const isApp = useIsAppDomain();

  return (
    <Switch>
      <Route path="/" component={RootPage} />

      {/* Tenant subdomain public pages — use template system */}
      {!isApp && (
        <>
          <Route path="/article/:slug">{(params) => <TemplateRenderer page="article" slug={params.slug} />}</Route>
          <Route path="/category/:slug">{(params) => <TemplateRenderer page="category" slug={params.slug} />}</Route>
          <Route path="/search"><TemplateRenderer page="search" /></Route>
          <Route path="/categories"><TemplateRenderer page="categories" /></Route>
          <Route path="/editors-picks"><TemplateRenderer page="editors-picks" /></Route>
          <Route path="/latest"><TemplateRenderer page="latest" /></Route>
          <Route path="/most-read"><TemplateRenderer page="most-read" /></Route>
          <Route path="/trending"><TemplateRenderer page="trending" /></Route>
          <Route path="/advertise"><TemplateRenderer page="advertise" /></Route>
          <Route path="/privacy"><TemplateRenderer page="privacy" /></Route>
          <Route path="/sitemap-page"><TemplateRenderer page="sitemap" /></Route>
          <Route path="/contact"><TemplateRenderer page="contact" /></Route>
          <Route path="/about"><TemplateRenderer page="about" /></Route>
        </>
      )}

      {/* App domain article/category routes use existing pages */}
      {isApp && <Route path="/article/:slug" component={ArticlePage} />}
      {isApp && <Route path="/category/:slug" component={CategoryPage} />}
      {isApp && <Route path="/search" component={EnhancedSearchPage} />}

      {/* Public pages — available on all domains */}
      <Route path="/shop/:slug" component={ShopPage} />
      <Route path="/categories" component={CategoriesPage} />
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
      <Route path="/sitemap-page" component={SiteMapPage} />
      <Route path="/support/:slug" component={SupportArticlePage} />

      {/* Public auth routes */}
      <Route path="/admin/reset-password" component={ResetPassword} />
      {/* /admin — login on tenant subdomains, mission control on app domain */}
      <Route path="/admin" component={AdminRootPage} />

      {/* ═══ TENANT PORTAL ROUTES (subdomain /admin/*) ═══ */}
      {!isApp && (
        <>
          <Route path="/admin/dashboard" component={TenantDashboardPage} />
          <Route path="/admin/articles" component={TenantArticles} />
          <Route path="/admin/articles/create" component={TenantCreateArticle} />
          <Route path="/admin/generator" component={TenantAIGenerator} />
          <Route path="/admin/content-engine" component={TenantContentEngine} />
          <Route path="/admin/design" component={TenantDesignTheme} />
          <Route path="/admin/publishing" component={TenantPublishing} />
          <Route path="/admin/image-settings" component={TenantImageSettings} />
          <Route path="/admin/integrations" component={TenantIntegrations} />
          <Route path="/admin/articles/:id" component={AdminArticleEditor} />
          <Route path="/admin/branding" component={TenantBranding} />
          <Route path="/admin/billing" component={TenantBilling} />
          <Route path="/admin/users" component={TenantUsers} />
          <Route path="/admin/communications" component={TenantCommunications} />
          <Route path="/admin/newsletter" component={TenantNewsletter} />
          <Route path="/admin/sms-templates" component={TenantSMS} />
          <Route path="/admin/notifications" component={TenantNotifications} />
          <Route path="/admin/api-access" component={TenantApiAccess} />
          <Route path="/admin/workflow" component={TenantWorkflow} />
          <Route path="/admin/calendar" component={TenantCalendar} />
          <Route path="/admin/templates" component={TenantTemplates} />
          <Route path="/admin/categories" component={TenantCategories} />
          <Route path="/admin/category-balance" component={TenantCategoryBalance} />
          <Route path="/admin/x-replies" component={TenantXReplyQueue} />
          <Route path="/admin/sponsor-schedule" component={TenantSponsorSchedule} />
          <Route path="/admin/tags" component={TenantTags} />
          <Route path="/admin/pages" component={TenantPages} />
          <Route path="/admin/source-feeds" component={TenantSourceFeeds} />
          <Route path="/admin/feed-performance" component={TenantFeedPerformance} />
          <Route path="/admin/source-manager" component={TenantSourceManager} />
          <Route path="/admin/x-listening" component={TenantXListening} />
          <Route path="/admin/reddit-listening" component={TenantRedditListening} />
          <Route path="/admin/youtube-listening" component={TenantYouTubeListening} />
          <Route path="/admin/candidates" component={TenantCandidates} />
          <Route path="/admin/media-library" component={TenantMediaLibrary} />
          <Route path="/admin/seo" component={TenantSEO} />
          <Route path="/admin/index-settings" component={TenantIndexSettings} />
          <Route path="/admin/geo" component={TenantGEO} />
          <Route path="/admin/distribution" component={TenantSocialQueue} />
          <Route path="/admin/distribution-settings" component={TenantDistribution} />
          <Route path="/admin/post-queue" component={TenantPostQueue} />
          <Route path="/admin/social-performance" component={TenantSocialPerformance} />
          <Route path="/admin/revenue" component={TenantRevenue} />
          <Route path="/admin/monetization" component={TenantMonetizationSettings} />
          <Route path="/admin/monetization-settings" component={TenantMonetizationSettings} />
          <Route path="/admin/adsense" component={TenantAdSense} />
          <Route path="/admin/amazon" component={TenantAmazon} />
          <Route path="/admin/sponsorship" component={TenantSponsorship} />
          <Route path="/admin/sponsor-attribution" component={TenantSponsorAttribution} />
          <Route path="/admin/merch-store" component={TenantMerchStore} />
          <Route path="/admin/merch-pipeline" component={TenantMerchPipeline} />
          <Route path="/admin/ticket" component={TenantTicket} />
          <Route path="/admin/white-label" component={TenantWhiteLabel} />
          <Route path="/admin/clients" component={ResellerMissionControl} />
          <Route path="/admin/settings" component={TenantSettings} />
          <Route path="/admin/setup-wizard" component={TenantSetup} />
        </>
      )}

      {/* ═══ SUPER ADMIN ROUTES (app.getjaime.io /admin/*) ═══ */}
      {isApp && (
        <>
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/mission-control" component={MissionControl} />
          <Route path="/admin/performance" component={PerformanceDashboard} />
          <Route path="/admin/domains" component={AdminDomains} />
          <Route path="/admin/support" component={AdminSupportArticles} />
          <Route path="/admin/licenses/:id/setup" component={TenantSetup} />
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
          <Route path="/admin/licenses" component={MissionControl} />
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
          <Route path="/admin/monetization" component={AdminMonetization} />
          <Route path="/admin/tags" component={AdminTags} />
          <Route path="/admin/image-licenses" component={AdminImageLicenses} />
          <Route path="/admin/sponsor-attribution" component={AdminSponsorAttribution} />
          <Route path="/admin/image-sources" component={AdminImageSources} />
          <Route path="/admin/pages" component={AdminPages} />
        </>
      )}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  useAttributionTracking();
  const { branding } = useBranding();
  useGtag();

  const { palette } = useBrandPalette();
  useEffect(() => {
    if (palette) applyBrandTheme(palette);
  }, [palette]);
  useEffect(() => {
    if (branding.headingFont || branding.bodyFont) {
      applyBrandFonts(branding.headingFont || "Playfair Display", branding.bodyFont || "Inter");
    }
  }, [branding.headingFont, branding.bodyFont]);
  useClarity(branding.clarityId);

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

  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  useEffect(() => {
    if (meQuery.isLoading) return;
    if (meQuery.data?.role === "admin") {
      localStorage.setItem("umami.disabled", "1");
    } else {
      localStorage.removeItem("umami.disabled");
    }
  }, [meQuery.data, meQuery.isLoading]);

  useEffect(() => {
    const siteUrl = branding.siteUrl || window.location.origin;
    const usesWww = siteUrl.includes('://www.');
    setCanonicalURL(usesWww ? 'www' : 'non-www');
  }, [branding.siteUrl]);

  useEffect(() => {
    if (location.startsWith('/admin')) {
      setNoIndex();
    } else {
      removeNoIndex();
    }
  }, [location]);

  useEffect(() => {
    if (location.startsWith('/admin')) return;
    if (meQuery.data?.role === 'admin') return;
    trackPageView();
  }, [location, meQuery.data]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
