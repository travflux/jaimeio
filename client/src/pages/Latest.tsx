import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowUp, Filter, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/hooks/useBranding";
import { usePageSEO } from "@/hooks/usePageSEO";
import ArticleCard from "@/components/ArticleCard";
import { getCategoryColor } from "../../../shared/categoryColors";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Last 24 Hours" },
  { value: "week", label: "Last Week" },
  { value: "month", label: "Last Month" },
  { value: "year", label: "Last Year" },
];

export default function Latest() {
  const { branding } = useBranding();
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month" | "year">("all");

  const { data: cats } = trpc.categories.list.useQuery();
  const catMap = useMemo(() => new Map(cats?.map(c => [c.id, c]) ?? []), [cats]);
  const utils = trpc.useUtils();

  const queryParams = useMemo(() => ({
    status: "published" as const,
    limit: 20,
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    dateRange: dateRange !== "all" ? dateRange as "today" | "week" | "month" | "year" : undefined,
  }), [categoryFilter, dateRange]);

  const { data: initialData, isLoading } = trpc.articles.list.useQuery(queryParams);

  const siteName = branding.siteName || "";
  usePageSEO({
    title: `Latest News — ${siteName} | All Articles`,
    description: `Every headline ${siteName} has ever published, freshest first. Filter by category or date range.`,
    keywords: "latest news, new articles, recent stories, all headlines, news feed",
    defaultTitle: siteName,
  });

  useEffect(() => {
    if (initialData?.articles) {
      setAllArticles(initialData.articles);
      setHasMore(initialData.hasMore ?? false);
    }
  }, [initialData]);

  // Reset when filters change
  useEffect(() => {
    setAllArticles([]);
    setHasMore(true);
  }, [categoryFilter, dateRange]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const moreData = await utils.client.articles.list.query({
        ...queryParams,
        offset: allArticles.length,
      });
      setAllArticles((prev) => [...prev, ...moreData.articles]);
      setHasMore(moreData.hasMore ?? false);
    } catch (error) {
      console.error("Failed to load more articles:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };


  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeFilterCount = (categoryFilter !== "all" ? 1 : 0) + (dateRange !== "all" ? 1 : 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* ─── Color Banner ─── */}
        <div className="w-full bg-[#1A1A1A]">
          <div className="container py-12 sm:py-16">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="w-5 h-5 text-[#C41E3A]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#C41E3A]">All Stories</span>
                </div>
                <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase text-white mb-2">
                  Latest News
                </h1>
                <p className="text-white/70 text-sm sm:text-base max-w-2xl">
                  Every headline we've ever remastered, served freshest first.
                </p>
              </div>
              {allArticles.length > 0 && (
                <div className="text-right hidden sm:block">
                  <span className="text-sm text-white/60">{allArticles.length}+ stories</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="container py-8 sm:py-12">

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {cats?.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as "all" | "today" | "week" | "month" | "year")}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCategoryFilter("all"); setDateRange("all"); }}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : allArticles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No articles found matching your filters.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setCategoryFilter("all"); setDateRange("all"); }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              {/* Article grid - matches homepage More Stories layout */}
              <h2 className="sr-only">All Articles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {allArticles.map((article) => {
                  const cat = catMap.get(article.categoryId ?? 0);
                  return (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      variant="standard"
                      categoryName={cat?.name}
                      categoryColor={getCategoryColor(cat?.slug || "")}
                    />
                  );
                })}
              </div>

              {/* Load More button */}
              <div className="py-10 flex flex-col items-center gap-3">
                {isLoadingMore && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading more articles...</span>
                  </div>
                )}
                {hasMore && !isLoadingMore && (
                  <Button
                    onClick={loadMore}
                    variant="outline"
                    size="lg"
                    className="px-8 font-semibold"
                  >
                    Load More Articles
                  </Button>
                )}
                {!hasMore && allArticles.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    That's all of them — {allArticles.length} articles total.
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Showing {allArticles.length} article{allArticles.length !== 1 ? "s" : ""}
                </p>
              </div>
            </>
          )}

          {/* Scroll to top button */}
          {showScrollTop && (
            <Button
              onClick={scrollToTop}
              size="icon"
              className="fixed bottom-8 right-8 rounded-full shadow-lg z-50"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
