import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useBranding } from "@/hooks/useBranding";
import { EditorialTemplate } from "./editorial/EditorialTemplate";
import { MagazineTemplate } from "./magazine/MagazineTemplate";
import { ModernTemplate } from "./modern/ModernTemplate";
import { MinimalTemplate } from "./minimal/MinimalTemplate";
import { CorporateTemplate } from "./corporate/CorporateTemplate";
import { CreativeTemplate } from "./creative/CreativeTemplate";
import type { TemplateProps, LicenseSettings, Category } from "./shared/types";

export type PageType =
  | "home" | "article" | "category" | "categories" | "search"
  | "latest" | "most-read" | "trending" | "editors-picks"
  | "advertise" | "privacy" | "sitemap" | "contact" | "about";

interface TemplateRendererProps {
  page: PageType;
  slug?: string;
}

function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--brand-background, #faf9f7)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, border: "3px solid var(--brand-border, #e5e7eb)",
          borderTopColor: "var(--brand-primary, #2DD4BF)", borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
        }} />
        <p style={{ color: "var(--brand-text-secondary, #6b7280)", fontSize: 14 }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function parseLicenseCategories(
  licenseSettings: LicenseSettings,
  globalCategories: Category[]
): Category[] {
  const raw = licenseSettings.categories;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: any, i: number) => ({
          id: c.id ?? -(i + 1),
          name: c.name,
          slug: c.slug ?? c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          description: c.description ?? null,
          color: c.color ?? null,
        }));
      }
    } catch { /* fall through */ }
  }
  return globalCategories;
}

const ARTICLE_PAGES = new Set(["home", "category", "categories", "latest", "most-read", "trending", "editors-picks", "search"]);

export function TemplateRenderer({ page, slug }: TemplateRendererProps) {
  const { branding } = useBranding();

  const { data: brandingRaw, isLoading: rawLoading } = trpc.branding.get.useQuery(
    { hostname: window.location.hostname },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  const { data: globalCats, isLoading: catsLoading } = trpc.categories.list.useQuery();

  // Only fetch articles for pages that need them
  const needsArticles = ARTICLE_PAGES.has(page);
  const { data: articlesData, isLoading: articlesLoading } = trpc.articles.list.useQuery(
    { status: "published", limit: 30 },
    { enabled: needsArticles }
  );
  const { data: articleBySlug, isLoading: articleLoading } = trpc.articles.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: page === "article" && !!slug }
  );
  const { data: mostReadData } = trpc.articles.mostRead.useQuery(
    { limit: 10 },
    { enabled: needsArticles }
  );
  const { data: editorsPicksData } = trpc.articles.editorsPicks.useQuery(
    { limit: 20 },
    { enabled: page === "editors-picks" }
  );

  const isLoading = rawLoading || catsLoading ||
    (needsArticles && articlesLoading) ||
    (page === "article" && articleLoading);

  const licenseSettings: LicenseSettings = useMemo(() => ({
    brand_site_name: "", brand_tagline: "", brand_site_description: "",
    brand_logo_url: "", brand_logo_dark_url: "", brand_favicon_url: "",
    brand_primary_color: "", brand_secondary_color: "",
    brand_heading_font: "", brand_body_font: "", brand_website_url: "",
    brand_contact_email: "", brand_phone: "", brand_address: "",
    brand_business_name: "",
    adsense_enabled: "", adsense_publisher_id: "",
    adsense_header_unit: "", adsense_sidebar_unit: "", adsense_article_unit: "",
    sponsor_enabled: "", sponsor_name: "", sponsor_logo_url: "",
    sponsor_link_url: "", sponsor_banner_url: "", sponsor_start_date: "",
    sponsor_end_date: "", sponsor_bar_text: "",
    amazon_enabled: "", amazon_associate_tag: "", amazon_keywords: "",
    printify_enabled: "", brand_shop_nav_label: "",
    blotato_api_key: "", blotato_platforms: "",
    brand_palette: "", brand_template: "", categories: "",
    ...((brandingRaw as Record<string, string>) || {}),
  }), [brandingRaw]);

  const categories = useMemo(
    () => parseLicenseCategories(licenseSettings, globalCats || []),
    [licenseSettings, globalCats]
  );

  if (isLoading) return <LoadingSkeleton />;

  let articles = articlesData?.articles || [];

  // Determine articles for discover pages
  if (page === "editors-picks") {
    articles = editorsPicksData || [];
  }

  // For category pages, filter by slug
  let currentCategory: TemplateProps["currentCategory"];
  if (page === "category" && slug) {
    currentCategory = categories.find(c => c.slug === slug);
    if (currentCategory) {
      if (currentCategory.id < 0) {
        const globalCat = (globalCats || []).find(gc =>
          gc.name.toLowerCase() === currentCategory!.name.toLowerCase()
        );
        if (globalCat) articles = articles.filter(a => a.categoryId === globalCat.id);
      } else {
        articles = articles.filter(a => a.categoryId === currentCategory!.id);
      }
    }
  }

  const templateProps: TemplateProps = {
    licenseSettings,
    articles,
    categories,
    currentArticle: page === "article" ? articleBySlug ?? undefined : undefined,
    currentCategory,
    mostRead: mostReadData || [],
    page,
  };

  const templateName = licenseSettings.brand_template || "editorial";

  switch (templateName) {
    case "magazine":
      return <MagazineTemplate {...templateProps} />;
    case "modern":
      return <ModernTemplate {...templateProps} />;
    case "minimal":
      return <MinimalTemplate {...templateProps} />;
    case "corporate":
      return <CorporateTemplate {...templateProps} />;
    case "creative":
      return <CreativeTemplate {...templateProps} />;
    case "editorial":
    default:
      return <EditorialTemplate {...templateProps} />;
  }
}
