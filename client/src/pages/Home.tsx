import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useBranding } from "@/hooks/useBranding";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { getCategoryColor } from "../../../shared/categoryColors";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import BackToTop from "@/components/BackToTop";
import { AdBanner, AdSidebar } from "@/components/AdUnit";
import XFollowAd from "@/components/XFollowAd";
import NewsletterAd from "@/components/NewsletterAd";
import AmazonAd from "@/components/AmazonAd";
import TrendingNow from "@/components/TrendingNow";
import { SponsorBar } from "@/components/SponsorBar";
import { Loader2, TrendingUp, ArrowRight, Flame, Sparkles, Mail, Newspaper, Archive, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLoader, SiteInlineLoader } from "@/components/SiteLoader";
import { setOGTags } from "@/lib/og-tags";
import { setOrganizationSchema, HAMBRY_ORGANIZATION } from "@/lib/organization-schema";
import { setCanonicalURL } from "@/lib/canonical-url";
import { useScrollAnimations } from "@/hooks/useScrollAnimation";
import { usePageView } from "@/hooks/usePageView";

export default function Home() {
  useScrollAnimations();
  usePageView({ path: "/" });
  const { branding } = useBranding();
  const { showTicker, showTrending, showCategories, showSidebar, initialArticleCount } = useHomepageSettings();

  useEffect(() => {
    // Title: use tagline if set, else just siteName
    const seoTitle = branding.tagline
      ? `${branding.siteName} — ${branding.tagline}`
      : branding.siteName;
    // Description: use brand_description if set
    const seoDescription = branding.description || `${branding.siteName} — news and commentary.`;
    document.title = seoTitle;
    setOGTags({
      title: seoTitle,
      description: seoDescription,
      keywords: branding.seoKeywords || branding.siteName,
      image: `${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png`,
      url: typeof window !== 'undefined' ? window.location.href : '',
      type: 'website',
    });
    setOrganizationSchema({
      ...HAMBRY_ORGANIZATION,
      name: branding.siteName,
      description: seoDescription,
    });
    setCanonicalURL();
  }, [branding]);

  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success" | "error">("idle");
  const [homeTcpa, setHomeTcpa] = useState(false);
  const newsletterMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { setNewsletterStatus("success"); setNewsletterEmail(""); },
    onError: () => setNewsletterStatus("error"),
  });
  const { data: initialData, isLoading } = trpc.articles.list.useQuery({ status: "published", limit: initialArticleCount });
  const { data: cats } = trpc.categories.list.useQuery();
  const { data: mostReadData } = trpc.articles.mostRead.useQuery();
  const { data: archiveData } = trpc.articles.fromArchive.useQuery({ limit: 5, minDaysOld: 14 });
  const { data: settingsRaw } = trpc.settings.list.useQuery();
  const amazonTag = settingsRaw?.find(s => s.key === 'amazon_associate_tag')?.value || '';
  const amazonEnabled = settingsRaw?.find(s => s.key === 'amazon_products_enabled')?.value === 'true';
  const amazonLink = settingsRaw?.find(s => s.key === 'amazon_affiliate_link')?.value || '';

  const utils = trpc.useUtils();

  useEffect(() => {
    if (initialData) {
      setAllArticles(initialData.articles);
      setNextCursor(initialData.nextCursor);
      setHasMore(initialData.hasMore ?? false);
    }
  }, [initialData]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    setIsLoadingMore(true);
    try {
      const moreData = await utils.client.articles.list.query({
        status: "published",
        limit: initialArticleCount,
        offset: allArticles.length
      });
      setAllArticles(prev => [...prev, ...moreData.articles]);
      setNextCursor(moreData.nextCursor);
      setHasMore(moreData.hasMore ?? false);
    } catch (error) {
      console.error("Failed to load more articles:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const articles = allArticles;
  const mostRead = mostReadData ?? [];
  const catMap = new Map(cats?.map(c => [c.id, c]) ?? []);

  const featured = articles[0];
  const secondary = articles.slice(1, 7); // 6 secondary cards to fill right column
  const editorsRow = articles.slice(7, 11);
  const midFeature = articles.slice(11, 20);  // 9 articles = 3 rows of 3 on desktop
  const remaining = articles.slice(20);

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, typeof remaining>();
    remaining.forEach(a => {
      const cat = catMap.get(a.categoryId ?? 0);
      const name = cat?.name ?? "Uncategorized";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(a);
    });
    return Array.from(groups.entries()).filter(([, arts]) => arts.length >= 3).slice(0, 3);
  }, [remaining, catMap]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ─── BREAKING NEWS TICKER ─── */}
      {showTicker && articles.length > 0 && (
        <div className="bg-secondary text-secondary-foreground overflow-hidden border-b border-border">
          <div className="container">
            <div className="flex items-center">
              <span className="breaking-badge bg-secondary text-secondary-foreground px-4 py-2 text-[14px] font-bold uppercase tracking-[0.12em] shrink-0 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                Breaking
              </span>
              <div className="overflow-hidden flex-1">
                <div className="ticker-animate whitespace-nowrap py-2 text-[15px]">
                  {articles.slice(0, 5).map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && <span className="mx-5 opacity-50">|</span>}
                      {a.headline}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <SponsorBar />

      <main>
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <SiteLoader message="Loading latest news..." size="large" />
          </div>
        ) : articles.length === 0 ? (
          <div className="container py-32 text-center">
            <h2 className="font-headline text-3xl font-bold mb-3 tracking-tight">No Articles Yet</h2>
            <p className="text-muted-foreground text-[15px]">The newsroom is warming up. Check back soon for the latest news.</p>
          </div>
        ) : (
          <>
            {/* ─── HERO: Featured + 3 Secondary ─── */}
            <section className="container pt-4 pb-2 sm:pt-6 sm:pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
                <div className="lg:col-span-7">
                  {featured && (
                    <ArticleCard 
                      article={featured} 
                      variant="featured" 
                      categoryName={catMap.get(featured.categoryId ?? 0)?.name}
                      categoryColor={getCategoryColor(catMap.get(featured.categoryId ?? 0)?.slug || "")}
                    />
                  )}
                </div>
                <div className="lg:col-span-5 flex flex-col gap-2 sm:gap-3">
                  {secondary.map(a => {
                    const cat = catMap.get(a.categoryId ?? 0);
                    return (
                      <ArticleCard 
                        key={a.id} 
                        article={a} 
                        variant="compact" 
                        categoryName={cat?.name}
                        categoryColor={getCategoryColor(cat?.slug || "")}
                      />
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="container my-4 sm:my-6"><div className="section-rule-heavy" /></div>

            {/* ─── EDITOR'S PICKS ─── */}
            {editorsRow.length > 0 && (
              <section className="container py-2 sm:py-4 animate-on-scroll">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="font-headline text-lg font-bold uppercase tracking-[0.04em] whitespace-nowrap section-header-accent">Editor's Picks</h2>
                  </div>
                  <div className="flex-1 section-rule" />
                  <Link href="/editors-picks" className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors shrink-0">
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
                  {editorsRow.map(a => {
                    const catName = catMap.get(a.categoryId ?? 0)?.name;
                    const catSlug = catMap.get(a.categoryId ?? 0)?.slug;
                    return (
                      <Link key={a.id} href={`/article/${a.slug}`} className="group block">
                        <article className="card-hover">
                          {a.featuredImage ? (
                            <div className="aspect-[16/10] overflow-hidden rounded-sm mb-2.5 relative">
                              <img src={a.featuredImage} alt={a.headline} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out" loading="lazy" />
                              {catName && (
                                <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white bg-primary/85 backdrop-blur-sm px-1.5 py-0.5 rounded-sm shadow-md" style={{ backgroundColor: getCategoryColor(catSlug || "") }}>
                                  {catName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="aspect-[16/10] rounded-sm mb-2.5 flex items-center justify-center relative overflow-hidden bg-muted/60">
                              <img src={branding.mascotUrl} alt={branding.mascotName} className="w-1/3 h-auto opacity-30 group-hover:opacity-50 transition-opacity duration-500" loading="lazy" />
                              {catName && (
                                <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: getCategoryColor(catSlug || "") }}>
                                  {catName}
                                </span>
                              )}
                            </div>
                          )}
                          <h3 className="font-headline text-[14px] font-bold mt-1 leading-snug group-hover:text-primary transition-colors duration-300 line-clamp-2">
                            {a.headline}
                          </h3>
                        </article>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="container"><AdBanner /></div>

            {/* ─── MID FEATURE + SIDEBAR ─── */}
            {(midFeature.length > 0 || mostRead.length > 0) && (
              <section className="bg-muted/40">
                <div className="container py-4 sm:py-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
                    <div className={`${showSidebar ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-5 animate-on-scroll`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {midFeature.map(a => {
                          const cat = catMap.get(a.categoryId ?? 0);
                          return (
                            <ArticleCard 
                              key={a.id} 
                              article={a} 
                              variant="standard" 
                              categoryName={cat?.name}
                              categoryColor={getCategoryColor(cat?.slug || "")}
                            />
                          );
                        })}
                      </div>
                      {/* ─── LATEST FROM THE WIRE ─── compact list to fill sidebar height */}
                      {articles.slice(20, 30).length > 0 && (
                        <div className="bg-card border border-border rounded-lg p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                              <Newspaper className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <h2 className="text-[16px] font-bold text-foreground tracking-tight uppercase font-headline">Latest from the Wire</h2>
                          </div>
                          <div className="divide-y divide-border/60">
                            {articles.slice(20, 30).map((a) => {
                              const cat = catMap.get(a.categoryId ?? 0);
                              return (
                                <Link key={a.id} href={`/article/${a.slug}`} className="group flex items-start gap-3 py-2.5 hover:bg-accent/30 -mx-2 px-2 rounded transition-colors">
                                  <span className="shrink-0 mt-0.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: getCategoryColor(cat?.slug || '') + '22', color: getCategoryColor(cat?.slug || '') }}>{cat?.name ?? 'News'}</span>
                                  <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">{a.headline}</span>
                                </Link>
                              );
                            })}
                          </div>
                          <Link href="/latest" className="inline-flex items-center gap-1.5 mt-4 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors">
                            View all latest <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                      {/* ─── NEWSLETTER INLINE ─── */}
                      <NewsletterAd variant="inline" />
                    </div>

                    {showSidebar && (
                      <div className="lg:col-span-4 space-y-5 animate-on-scroll lg:sticky lg:top-6 lg:self-start">
                        {showTrending && <TrendingNow />}

                      {mostRead.length > 0 && (
                        <div className="bg-card border border-border rounded-lg p-6 card-hover">
                          <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <TrendingUp className="w-4 h-4 text-primary" />
                            </div>
                            <h2 className="text-[18px] font-bold text-foreground tracking-tight">Most Read</h2>
                          </div>

                          <div className="space-y-1">
                            {mostRead.map((a, i) => (
                              <Link key={a.id} href={`/article/${a.slug}`} className="group block">
                                <div className="flex gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-accent/50 transition-all duration-300">
                                  <span className={`text-[22px] font-black leading-none shrink-0 w-7 text-center transition-colors duration-300 ${i === 0 ? 'text-primary' : i === 1 ? 'text-primary/60' : i === 2 ? 'text-primary/40' : 'text-primary/20'} group-hover:text-primary`}>
                                    {i + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors duration-300 leading-snug line-clamp-2 mb-1">
                                      {a.headline}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                      <span>{a.views?.toLocaleString() ?? 0} views</span>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                          <Link href="/most-read" className="inline-flex items-center gap-2 mt-4 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors">
                            View All Most Read
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}

                      {/* ─── TRENDING TOPICS ─── */}
                      <TrendingTopicsWidget />

                      
                      {/* Amazon affiliate products */}
                      {amazonEnabled && (amazonTag || amazonLink) && (
                        <AmazonAd 
                          associateTag={amazonTag}
                          keywords={settingsRaw?.find(s => s.key === 'amazon_keywords')?.value || 'funny gifts humor books satire comedy'}
                          affiliateLink={amazonLink}
                          variant="card"
                        />
                      )}
                      
                      {/* ─── FROM THE ARCHIVE ─── */}
                      {archiveData && archiveData.length > 0 && (
                        <div className="bg-card border border-border rounded-lg p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                              <Archive className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <h2 className="text-[15px] font-bold text-foreground tracking-tight">From the Archive</h2>
                          </div>
                          <div className="space-y-0 divide-y divide-border/50">
                            {archiveData.map((a) => {
                              const cat = catMap.get(a.categoryId ?? 0);
                              return (
                                <Link key={a.id} href={`/article/${a.slug}`} className="group block py-2.5 first:pt-0 last:pb-0">
                                  <p className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: getCategoryColor(cat?.slug || '') }}>{cat?.name ?? 'News'}</p>
                                  <h3 className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">{a.headline}</h3>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <AdSidebar />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ─── NEWSLETTER CTA ─── */}
            <section className="relative overflow-hidden bg-foreground text-background">
              {/* Decorative gradient orbs */}
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[100px] animate-pulse" />
              <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-primary/8 rounded-full blur-[80px]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
              <div className="container py-12 sm:py-16 text-center relative z-10 animate-on-scroll">
                <div className="inline-flex items-center gap-2 bg-primary/20 text-primary-foreground px-5 py-2 rounded-full text-[13px] font-bold uppercase tracking-[0.12em] mb-5 shadow-lg shadow-primary/10">
                  <Mail className="w-4 h-4" />
                  Stay Sharp
                </div>
                <h2 className="font-headline text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-[1.1]">
                  Get the Best {branding.genre ? branding.genre.charAt(0).toUpperCase() + branding.genre.slice(1) : 'News'},<br className="hidden sm:block" /> Delivered Weekly
                </h2>
                <p className="text-background/50 text-[15px] sm:text-[17px] mb-8 max-w-lg mx-auto leading-relaxed">
                  Join thousands of readers who start their morning with a laugh. Free, weekly, and always sharp.
                </p>
                {newsletterStatus === "success" ? (
                  <p className="text-green-400 font-bold text-[16px] py-4">✓ You're subscribed! Welcome aboard.</p>
                ) : (
                  <form
                    onSubmit={e => { e.preventDefault(); if (newsletterEmail.trim() && homeTcpa) newsletterMutation.mutate({ email: newsletterEmail.trim() }); }}
                    className="flex flex-col gap-3 max-w-md mx-auto"
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        value={newsletterEmail}
                        onChange={e => setNewsletterEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="newsletter-cta-input flex-1 px-5 py-3.5 rounded-xl text-foreground text-[15px] bg-background focus:outline-none transition-shadow shadow-lg"
                      />
                      <button
                        type="submit"
                        disabled={newsletterMutation.isPending || !homeTcpa}
                        className="newsletter-cta-btn px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-[15px] hover:bg-primary/90 transition-all shrink-0 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 w-full sm:w-auto disabled:opacity-50"
                      >
                        {newsletterMutation.isPending ? "Subscribing…" : "Subscribe"}
                      </button>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer select-none text-background/50 text-left">
                      <input type="checkbox" checked={homeTcpa} onChange={e => setHomeTcpa(e.target.checked)} className="mt-0.5 shrink-0 accent-primary" required />
                      <span className="text-[11px] leading-snug">
                        I agree to receive the newsletter by email. I can unsubscribe at any time. See our{" "}
                        <a href="/privacy" className="underline hover:text-background/80 text-[11px]">Privacy Policy</a>.
                      </span>
                    </label>
                  </form>
                )}
                {newsletterStatus === "error" && <p className="text-red-400 text-[13px] mt-2">Something went wrong. Please try again.</p>}
                <p className="text-background/30 text-[12px] mt-4 tracking-wide">No spam. Unsubscribe anytime.</p>
              </div>
            </section>

            {/* ─── CATEGORY SECTIONS ─── */}
            {showCategories && categoryGroups.length > 0 && (
              <section className="container py-4 sm:py-6">
                <div className="section-rule-heavy mb-6" />
                {categoryGroups.map(([catName, catArticles], gi) => {
                  const catSlug = catArticles[0]?.categoryId ? catMap.get(catArticles[0].categoryId)?.slug : null;
                  return (
                    <div key={catName} className={`animate-on-scroll ${gi > 0 ? "mt-4 pt-4 sm:mt-6 sm:pt-6 border-t border-border/50" : ""}`}>
                      <div className="flex items-center gap-3 mb-5">
                        <h2 className="font-headline text-lg font-bold uppercase tracking-[0.04em] whitespace-nowrap section-header-accent">{catName}</h2>
                        <div className="flex-1 section-rule" />
                        {catSlug && (
                          <Link href={`/category/${catSlug}`} className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline shrink-0 group">
                            View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                        {catArticles.slice(0, 3).map(a => {
                          const cat = catMap.get(a.categoryId ?? 0);
                          return (
                            <ArticleCard 
                              key={a.id} 
                              article={a} 
                              variant="standard" 
                              categoryName={catName}
                              categoryColor={getCategoryColor(cat?.slug || "")}
                            />
                          );
                        })}
                      </div>
                      {catArticles[3] && catSlug && (
                        <p className="mt-3 text-[13px] text-muted-foreground">
                          Also: <Link href={`/article/${catArticles[3].slug}`} className="font-semibold text-foreground hover:text-primary transition-colors">{catArticles[3].headline}</Link>
                        </p>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            {/* ─── X FOLLOW BANNER ─── */}
            <div className="container pb-2">
              <XFollowAd variant="banner" />
            </div>

            {/* ─── REMAINING ARTICLES ─── */}
            {remaining.length > categoryGroups.reduce((sum, [, arts]) => sum + Math.min(arts.length, 3), 0) && (
              <section className="container pb-4 sm:pb-6">
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="font-headline text-lg font-bold uppercase tracking-[0.04em] whitespace-nowrap section-header-accent">More Stories</h2>
                  <div className="flex-1 section-rule-heavy" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {remaining
                    .filter(a => !categoryGroups.some(([, arts]) => arts.slice(0, 3).some(ca => ca.id === a.id)))
                    .map(a => {
                      const cat = catMap.get(a.categoryId ?? 0);
                      return (
                        <ArticleCard 
                          key={a.id} 
                          article={a} 
                          variant="standard" 
                          categoryName={cat?.name}
                          categoryColor={getCategoryColor(cat?.slug || "")}
                        />
                      );
                    })}
                </div>
              </section>
            )}

            {/* ─── LOAD MORE ─── */}
            {hasMore && (
              <section className="container pb-6 sm:pb-8">
                <div className="flex justify-center">
                  <Button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    size="lg"
                    variant="outline"
                    className="px-8 py-6 text-[15px] font-semibold hover:border-primary hover:text-primary transition-all duration-300"
                  >
                  {isLoadingMore ? (
                    <SiteInlineLoader />
                    ) : (
                      <>
                        Load More Articles
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}

// ─── Trending Topics sidebar widget ─────────────────────────────────────────
function TrendingTopicsWidget() {
  const { data: trending, isLoading } = trpc.tags.trending.useQuery(
    { limit: 8 },
    { staleTime: 30 * 60 * 1000 }
  );

  if (isLoading || !trending || trending.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <Hash className="w-3.5 h-3.5 text-primary" />
        </div>
        <h2 className="text-[15px] font-bold text-foreground tracking-tight">Trending Topics</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {trending.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${tag.slug}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all duration-200 border border-border hover:border-primary"
          >
            <span>#{tag.name}</span>
            {tag.articleCount > 0 && (
              <span className="opacity-60 text-[10px]">{tag.articleCount}</span>
            )}
          </Link>
        ))}
      </div>
      <Link
        href="/tags"
        className="inline-flex items-center gap-1.5 mt-4 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        Browse all topics
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
