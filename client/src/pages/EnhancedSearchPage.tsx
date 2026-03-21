import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchResultCard from "@/components/SearchResultCard";
import { Loader2, Search as SearchIcon, Filter, TrendingUp, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { setCanonicalURL } from "@/lib/canonical-url";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useBranding } from "@/hooks/useBranding";

export default function EnhancedSearchPage() {
  const { branding } = useBranding();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const query = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category");
  const dateRangeParam = searchParams.get("dateRange");
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [categoryFilter, setCategoryFilter] = useState<string>(categoryParam ?? "all");
  type DateRange = 'all' | 'today' | 'week' | 'month' | 'year';
  const validDateRanges: DateRange[] = ['all', 'today', 'week', 'month', 'year'];
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange>(
    validDateRanges.includes(dateRangeParam as DateRange) ? (dateRangeParam as DateRange) : 'all'
  );
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // Save to search history
  const saveToHistory = useCallback((searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    
    const newHistory = [trimmed, ...searchHistory.filter(h => h !== trimmed)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  }, [searchHistory]);

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  usePageSEO({
    title: query
      ? `Search: "${query}" — ${branding.siteName || ""} Results`
      : `Search Articles — ${branding.siteName || ""} | Find Stories`,
    description: query
      ? `Search results for "${query}" on ${branding.siteName || "our site"}. Browse matching articles across all categories.`
      : `Search the full ${branding.siteName || ""} archive. Find articles by keyword, category, or date.`,
    keywords: "search articles, find news, article search, news search, browse stories",
  });

  useEffect(() => {
    // Set canonical URL (removes query params to avoid duplicate content)
    setCanonicalURL();
  }, [query]);

  // Enhanced search with fuzzy matching
  const { data: searchResults, isLoading } = trpc.search.enhanced.useQuery(
    { 
      query,
      status: "published", 
      categoryId: categoryFilter !== "all" ? parseInt(categoryFilter) : undefined,
      dateRange: dateRangeFilter,
      limit: 50,
      useFuzzy: true,
    },
    { enabled: !!query }
  );

  // Autocomplete suggestions
  const { data: autocompleteSuggestions } = trpc.search.autocomplete.useQuery(
    { query: searchQuery, limit: 5 },
    { enabled: searchQuery.length >= 2 && showAutocomplete }
  );

  // Trending searches
  const { data: trendingSearches } = trpc.search.trending.useQuery(
    { limit: 8 },
    { enabled: !query }
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

  const articles = searchResults?.results ?? [];
  const total = searchResults?.total ?? 0;
  const catMap = new Map(cats?.map(c => [c.id, c]) ?? []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveToHistory(searchQuery);
      setShowAutocomplete(false);
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    saveToHistory(suggestion);
    setShowAutocomplete(false);
    window.location.href = `/search?q=${encodeURIComponent(suggestion)}`;
  };

  const handleTrendingClick = (trendingQuery: string) => {
    setSearchQuery(trendingQuery);
    saveToHistory(trendingQuery);
    window.location.href = `/search?q=${encodeURIComponent(trendingQuery)}`;
  };

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Search header */}
        <div className="bg-muted/40 border-b border-border">
          <div className="container py-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="font-headline text-3xl font-bold mb-5 tracking-tight">Search Articles</h1>
              <form onSubmit={handleSearch} className="relative">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setShowAutocomplete(e.target.value.length >= 2);
                      }}
                      onFocus={() => searchQuery.length >= 2 && setShowAutocomplete(true)}
                      className="w-full px-4 py-3 pr-10 border border-input rounded-lg text-[15px] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setShowAutocomplete(false);
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <Button type="submit" size="lg" className="rounded-lg px-6">
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {/* Autocomplete dropdown */}
                {showAutocomplete && (autocompleteSuggestions?.length || searchHistory.length > 0) && (
                  <div
                    ref={autocompleteRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                  >
                    {/* Search history */}
                    {searchHistory.length > 0 && !searchQuery && (
                      <div className="border-b border-border">
                        <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Recent Searches</span>
                          </div>
                          <button
                            onClick={clearHistory}
                            className="hover:text-foreground transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        {searchHistory.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(item)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
                          >
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            {item}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Autocomplete suggestions */}
                    {autocompleteSuggestions && autocompleteSuggestions.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                          Suggestions
                        </div>
                        {autocompleteSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
                          >
                            <SearchIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="container py-10">
          {!query ? (
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12 mb-10">
                <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="font-headline text-2xl font-bold mb-2 tracking-tight">Start Your Search</h2>
                <p className="text-muted-foreground text-[15px]">
                  Enter a keyword or phrase to find articles across all categories.
                </p>
              </div>

              {/* Trending searches */}
              {trendingSearches && trendingSearches.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Trending Searches</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((item, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5"
                        onClick={() => handleTrendingClick(item.query)}
                      >
                        {item.query}
                        <span className="ml-2 text-xs opacity-70">({item.count})</span>
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
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
              <p className="text-muted-foreground text-[14px] mb-6">
                Try different keywords or browse our <a href="/" className="text-primary hover:underline">latest articles</a>.
              </p>
              
              {/* Trending searches as suggestions */}
              {trendingSearches && trendingSearches.length > 0 && (
                <div className="max-w-2xl mx-auto mt-8">
                  <p className="text-sm text-muted-foreground mb-3">Try these popular searches:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {trendingSearches.slice(0, 5).map((item, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                        onClick={() => handleTrendingClick(item.query)}
                      >
                        {item.query}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h2 className="text-[15px] text-muted-foreground mb-1">
                    Found <span className="font-semibold text-foreground">{total}</span> result{total !== 1 ? 's' : ''} for "<span className="font-semibold text-foreground">{query}</span>"
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Results ranked by relevance with fuzzy matching
                  </p>
                </div>
                
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
                  
                  <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as DateRange)}>
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
                  <SearchResultCard
                    key={a.id}
                    article={a}
                    categoryName={catMap.get(a.categoryId ?? 0)?.name}
                    query={query}
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
