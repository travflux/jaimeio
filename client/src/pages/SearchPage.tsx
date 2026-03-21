import { useEffect, useState, useMemo } from "react";
import { useBranding } from "@/hooks/useBranding";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { Loader2, Search as SearchIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageSEO } from "@/hooks/usePageSEO";
import { getCategoryColor } from "../../../shared/categoryColors";

export default function SearchPage() {
  const { branding } = useBranding();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const query = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category");
  const dateRangeParam = searchParams.get("dateRange");
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [categoryFilter, setCategoryFilter] = useState<string>(categoryParam ?? "all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>(dateRangeParam ?? "all");

  const siteName = branding.siteName || "";
  usePageSEO({
    title: query
      ? `Search: "${query}" — ${siteName} Results`
      : `Search Articles — ${siteName} | Find Stories`,
    description: query
      ? `Search results for "${query}" on ${siteName}. Browse matching articles across all categories.`
      : `Search the full ${siteName} archive. Find articles by keyword, category, or date.`,
    keywords: "search articles, find news, article search, news search, browse stories",
    defaultTitle: siteName,
  });

  const { data: articlesData, isLoading } = trpc.articles.list.useQuery(
    { 
      status: "published", 
      search: query, 
      categoryId: categoryFilter !== "all" ? parseInt(categoryFilter) : undefined,
      dateRange: dateRangeFilter as any,
      limit: 50 
    },
    { enabled: !!query }
  );
  
  // Update URL when filters change
  useEffect(() => {
    if (!query) return;
    const params = new URLSearchParams();
    params.set("q", query);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (dateRangeFilter !== "all") params.set("dateRange", dateRangeFilter);
    const newUrl = `/search?${params.toString()}`;
    if (window.location.search !== `?${params.toString()}`) {
      window.history.replaceState({}, "", newUrl);
    }
  }, [query, categoryFilter, dateRangeFilter]);
  
  const { data: cats } = trpc.categories.list.useQuery();

  const articles = articlesData?.articles ?? [];
  const catMap = new Map(cats?.map(c => [c.id, c]) ?? []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Search header */}
        <div className="bg-muted/40 border-b border-border">
          <div className="container py-8">
            <div className="max-w-2xl mx-auto">
              <h1 className="font-headline text-3xl font-bold mb-5 tracking-tight">Search Articles</h1>
              <form onSubmit={handleSearch} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-3 border border-input rounded-lg text-[15px] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
                  autoFocus
                />
                <Button type="submit" size="lg" className="rounded-lg px-6">
                  <SearchIcon className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="container py-10">
          {!query ? (
            <div className="text-center py-16">
              <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-headline text-2xl font-bold mb-2 tracking-tight">Start Your Search</h2>
              <p className="text-muted-foreground text-[15px]">
                Enter a keyword or phrase to find articles across all categories.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16">
              <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-headline text-2xl font-bold mb-2 tracking-tight">No Results Found</h2>
              <p className="text-muted-foreground text-[15px] mb-5">
                No articles matched your search for "<span className="font-semibold">{query}</span>".
              </p>
              <p className="text-muted-foreground text-[14px]">
                Try different keywords or browse our <a href="/" className="text-primary hover:underline">latest articles</a>.
              </p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h2 className="text-[15px] text-muted-foreground">
                  Found <span className="font-semibold text-foreground">{articles.length}</span> result{articles.length !== 1 ? 's' : ''} for "<span className="font-semibold text-foreground">{query}</span>"
                </h2>
                
                <div className="flex gap-3 items-center">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {cats?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Past Week</SelectItem>
                      <SelectItem value="month">Past Month</SelectItem>
                      <SelectItem value="year">Past Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(a => (
                  <ArticleCard 
                    key={a.id} 
                    article={a} 
                    variant="standard" 
                    categoryName={catMap.get(a.categoryId ?? 0)?.name}
                    categoryColor={getCategoryColor(catMap.get(a.categoryId ?? 0)?.slug || "")}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
