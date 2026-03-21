import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AdBanner } from "@/components/AdUnit";
import { useEffect, useState } from "react";
import { setOGTags } from "@/lib/og-tags";
import { generateBreadcrumbSchema, addSchemaMarkup } from "@/lib/schema-markup";
import { buildCanonicalURL, setCanonicalURL } from "@/lib/canonical-url";
import { getCategoryColor, getCategoryDescription } from "../../../shared/categoryColors";
import { Newspaper, TrendingUp, Clock, Eye } from "lucide-react";
import { SiteLoader } from "@/components/SiteLoader";
import { usePageSEO } from "@/hooks/usePageSEO";
import { SponsorBar } from "@/components/SponsorBar";
import { usePageView } from "@/hooks/usePageView";
import AmazonAd from "@/components/AmazonAd";
import { useBranding } from "@/hooks/useBranding";

function getTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CategoryPage() {
  const { branding } = useBranding();
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug ?? "";
  const [offset, setOffset] = useState(0);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  
  const { data: category } = trpc.categories.getBySlug.useQuery({ slug }, { enabled: !!slug });
  const { data: cats } = trpc.categories.list.useQuery();
  const { data: articlesData, isLoading } = trpc.articles.list.useQuery(
    { status: "published", categoryId: category?.id, limit: 30, offset },
    { enabled: !!category?.id }
  );
  const { data: trendingData } = trpc.articles.trending.useQuery(
    { hoursAgo: 72, limit: 5 },
    { enabled: !!category?.id }
  );

  // Merge new articles with existing ones on load more
  useEffect(() => {
    if (articlesData?.articles) {
      if (offset === 0) {
        setAllArticles(articlesData.articles);
      } else {
        setAllArticles(prev => [...prev, ...articlesData.articles]);
      }
      setHasMore(articlesData.articles.length === 30);
    }
  }, [articlesData, offset]);

  const { data: settingsRaw } = trpc.settings.list.useQuery();
  const amazonTag = settingsRaw?.find(s => s.key === 'amazon_associate_tag')?.value || '';
  const amazonEnabled = settingsRaw?.find(s => s.key === 'amazon_products_enabled')?.value === 'true';
  const amazonLink = settingsRaw?.find(s => s.key === 'amazon_affiliate_link')?.value || '';
  const articles = allArticles;
  const trending = (trendingData ?? []).filter(t => t.categoryId === category?.id).slice(0, 5);
  const catMap = new Map(cats?.map(c => [c.id, c]) ?? []);
  const categoryColor = category ? getCategoryColor(category.slug) : "#6366f1";

  // Split articles into hero, secondary, and grid
  const heroArticle = articles[0] ?? null;
  const secondaryArticles = articles.slice(1, 4);
  const gridArticles = articles.slice(4);
  
  const handleLoadMore = () => {
    setOffset(prev => prev + 30);
  };

  usePageView();

  // Page-specific SEO: title includes site name for 30-60 char target, keywords match the category
  usePageSEO({
    title: category ? `${category.name} — ${branding.siteName} | Latest ${category.name} News` : `${branding.siteName} | News by Category`,
    description: category
      ? (category.description || getCategoryDescription(category.slug))
      : `Browse all news categories on ${branding.siteName || "our site"}.`,
    keywords: category
      ? `${category.name.toLowerCase()}, ${category.name.toLowerCase()} news, commentary, analysis`
      : "news, categories, commentary",
  });

  useEffect(() => {
    if (category) {
      setCanonicalURL(buildCanonicalURL(`/category/${category.slug}`));
      setOGTags({
        title: `${category.name} — ${branding.siteName} | Latest ${category.name} News`,
        description: category.description || getCategoryDescription(category.slug),
        image: `${typeof window !== "undefined" ? window.location.origin : ""}/logo.png`,
        url: typeof window !== "undefined" ? window.location.href : "",
        type: "website",
      });
      const breadcrumbs = [
        { name: "Home", url: `${window.location.origin}/` },
        { name: category.name, url: window.location.href },
      ];
      addSchemaMarkup(generateBreadcrumbSchema(breadcrumbs), "breadcrumb-schema");
    }
  }, [category]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <SponsorBar />
      <main className="flex-1">
        {/* ─── Category Header with Color Background ─── */}
        {category && (
          <div className="w-full" style={{ backgroundColor: categoryColor }}>
            <div className="container py-12 sm:py-16">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase text-white mb-2">
                    {category.name}
                  </h1>
                  <p className="text-white/90 text-sm sm:text-base max-w-2xl">
                    {category.description || getCategoryDescription(category.slug)}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-sm text-white/80">
                    {articles.length} {articles.length === 1 ? "story" : "stories"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <SiteLoader />
          </div>
        ) : articles.length === 0 ? (
          <div className="container py-32 text-center">
            <Newspaper className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="font-headline text-2xl font-bold mb-2 tracking-tight">No Stories Yet</h2>
            <p className="text-muted-foreground text-[15px]">
              No articles in this category yet. Check back soon!
            </p>
          </div>
        ) : (
          <>
            {/* ─── HERO SECTION: Lead Story + Secondary Stories ─── */}
            <section className="container pt-6 pb-2">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
                {/* Lead Story */}
                {heroArticle && (
                  <div className="lg:col-span-7">
                    <Link href={`/article/${heroArticle.slug}`} className="group block">
                      <article>
                        {heroArticle.featuredImage ? (
                          <div className="aspect-[16/10] overflow-hidden rounded-lg relative">
                            <img
                              src={heroArticle.featuredImage}
                              alt={heroArticle.headline}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                              loading="eager"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                              <span
                                className="inline-block text-[11px] font-bold uppercase tracking-[0.12em] text-white px-2.5 py-1 rounded mb-3"
                                style={{ backgroundColor: categoryColor }}
                              >
                                {category?.name}
                              </span>
                              <h2 className="font-headline text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight tracking-tight">
                                {heroArticle.headline}
                              </h2>
                              <p className="text-white/80 text-[14px] mt-2 line-clamp-2 hidden sm:block">
                                {heroArticle.subheadline}
                              </p>
                              <div className="flex items-center gap-3 mt-3 text-white/60 text-[12px]">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {getTimeAgo(heroArticle.publishedAt)}
                                </span>
                                {(heroArticle as any).views > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {(heroArticle as any).views} views
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-[16/10] rounded-lg flex items-center justify-center bg-muted relative overflow-hidden">
                            <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, ${categoryColor}22, transparent)` }} />
                            <Newspaper className="w-16 h-16 text-muted-foreground/20" />
                            <div className="absolute bottom-0 left-0 right-0 p-7">
                              <h2 className="font-headline text-2xl font-black tracking-tight">
                                {heroArticle.headline}
                              </h2>
                            </div>
                          </div>
                        )}
                      </article>
                    </Link>
                  </div>
                )}

                {/* Secondary Stories Stack */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  {secondaryArticles.map((article, idx) => (
                    <Link key={article.id} href={`/article/${article.slug}`} className="group block">
                      <article className={`flex gap-4 ${idx < secondaryArticles.length - 1 ? "pb-4 border-b border-border/50" : ""}`}>
                        {article.featuredImage ? (
                          <div className="w-28 h-20 sm:w-36 sm:h-24 flex-shrink-0 overflow-hidden rounded-lg">
                            <img
                              src={article.featuredImage}
                              alt={article.headline}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-28 h-20 sm:w-36 sm:h-24 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
                            <Newspaper className="w-6 h-6 text-muted-foreground/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="font-headline text-[15px] sm:text-[16px] font-bold leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                            {article.headline}
                          </h3>
                          <p className="text-[12px] text-muted-foreground mt-1.5 line-clamp-1 hidden sm:block">
                            {article.subheadline}
                          </p>
                          <span className="text-[11px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(article.publishedAt)}
                          </span>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <div className="container my-4"><div className="h-px bg-border" /></div>

            {/* ─── MAIN CONTENT: Article Grid + Sidebar ─── */}
            {gridArticles.length > 0 && (
              <section className="container py-4 pb-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Article Grid */}
                  <div className="lg:col-span-8">
                    <h2 className="font-headline text-lg font-bold tracking-tight mb-5 uppercase flex items-center gap-2">
                      <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: categoryColor }} />
                      Latest Stories
                    </h2>
                    <div className="space-y-0">
                      {gridArticles.map((article, idx) => {
                        const catData = catMap.get(article.categoryId ?? 0);
                        return (
                          <Link key={article.id} href={`/article/${article.slug}`} className="group block">
                            <article className={`flex gap-4 sm:gap-5 py-5 ${idx < gridArticles.length - 1 ? "border-b border-border/40" : ""}`}>
                              {article.featuredImage ? (
                                <div className="w-24 h-24 sm:w-40 sm:h-28 flex-shrink-0 overflow-hidden rounded-lg">
                                  <img
                                    src={article.featuredImage}
                                    alt={article.headline}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    loading="lazy"
                                  />
                                </div>
                              ) : (
                                <div className="w-24 h-24 sm:w-40 sm:h-28 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
                                  <Newspaper className="w-8 h-8 text-muted-foreground/15" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h3 className="font-headline text-[15px] sm:text-[17px] font-bold leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                                  {article.headline}
                                </h3>
                                <p className="text-[13px] text-muted-foreground mt-1.5 line-clamp-2 hidden sm:block leading-relaxed">
                                  {article.subheadline}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground/60">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {getTimeAgo(article.publishedAt)}
                                  </span>
                                  {(article as any).views > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Eye className="w-3 h-3" />
                                      {(article as any).views}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </article>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Load More Button */}
                    {hasMore && (
                      <div className="flex justify-center mt-10">
                        <button
                          onClick={handleLoadMore}
                          disabled={isLoading}
                          className="px-8 py-3 font-semibold text-[14px] uppercase tracking-wide border border-border/50 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoading ? "Loading..." : "Load More Stories"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <aside className="lg:col-span-4 lg:sticky lg:top-6 lg:self-start">
                    {/* Most Read */}
                    {trending.length > 0 && (
                      <div className="mb-8">
                        <h3 className="font-headline text-sm font-bold tracking-tight uppercase flex items-center gap-2 mb-4 pb-3 border-b-2" style={{ borderBottomColor: categoryColor }}>
                          <TrendingUp className="w-4 h-4" style={{ color: categoryColor }} />
                          Most Read in {category?.name}
                        </h3>
                        <div className="space-y-0">
                          {trending.map((article, idx) => (
                            <Link key={article.id} href={`/article/${article.slug}`} className="group block">
                              <div className={`flex gap-3 py-3 ${idx < trending.length - 1 ? "border-b border-border/30" : ""}`}>
                                <span
                                  className="text-2xl font-black flex-shrink-0 w-8 leading-none"
                                  style={{ color: `${categoryColor}40` }}
                                >
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-headline text-[14px] font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                    {article.headline}
                                  </h4>
                                  <span className="text-[11px] text-muted-foreground/50 mt-1 block">
                                    {(article as any).views || 0} views
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* About This Category */}
                    <div className="rounded-lg p-5 bg-muted/50">
                      <h3 className="font-headline text-sm font-bold tracking-tight uppercase mb-3">
                        About {category?.name}
                      </h3>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        {category?.description || getCategoryDescription(category?.slug || "")}
                      </p>
                      <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-[12px] text-muted-foreground/60">
                        <span>{articles.length} stories</span>
                        <span>Updated {getTimeAgo(articles[0]?.publishedAt)}</span>
                      </div>
                    </div>

                    {/* Browse Other Categories */}
                    {cats && cats.length > 0 && (
                      <div className="mt-8">
                        <h3 className="font-headline text-sm font-bold tracking-tight uppercase mb-4 pb-3 border-b border-border/50">
                          More Categories
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {cats
                            .filter(c => c.slug !== slug)
                            .slice(0, 8)
                            .map(c => {
                              const color = getCategoryColor(c.slug);
                              return (
                                <Link
                                  key={c.id}
                                  href={`/category/${c.slug}`}
                                  className="text-[12px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-border/50 hover:border-transparent transition-all duration-300"
                                  style={{
                                    color: color,
                                  }}
                                >
                                  {c.name}
                                </Link>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    {/* Amazon affiliate products */}
                    {amazonEnabled && (amazonTag || amazonLink) && (
                      <div className="mt-4">
                        <AmazonAd
                          associateTag={amazonTag}
                          keywords={category ? `${category.name} books humor commentary` : 'books gifts humor'}
                          affiliateLink={amazonLink}
                          variant="card"
                        />
                      </div>
                    )}
                  </aside>
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
