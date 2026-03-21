import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { Loader2, Calendar, ChevronRight } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useBranding } from "@/hooks/useBranding";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonth(ym: string): string {
  const [year, mon] = ym.split("-").map(Number);
  return `${MONTH_NAMES[mon - 1]} ${year}`;
}

export default function ArchivePage() {
  const { branding } = useBranding();

  // Read month from URL hash or query param
  const initialMonth = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("month") || null;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(initialMonth);
  const [page, setPage] = useState(0);
  const limit = 24;

  const { data: months, isLoading: monthsLoading } = trpc.articles.archiveMonths.useQuery();
  const { data: articles, isLoading: articlesLoading } = trpc.articles.archiveByMonth.useQuery(
    { month: selectedMonth!, limit, offset: page * limit },
    { enabled: !!selectedMonth }
  );

  usePageSEO({
    title: selectedMonth
      ? `Archive: ${formatMonth(selectedMonth)} — ${branding.siteName || ""}`
      : `Article Archive — ${branding.siteName || ""}`,
    description: `Browse the complete archive of articles on ${branding.siteName || "our site"}.`,
    keywords: "archive, past articles, news archive",
  });

  const totalPages = articles ? Math.ceil(articles.total / limit) : 0;

  function handleMonthSelect(ym: string) {
    setSelectedMonth(ym);
    setPage(0);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set("month", ym);
    window.history.pushState({}, "", url.toString());
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-muted/40 border-b border-border">
          <div className="container py-10">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Archive</span>
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tight mb-2">Article Archive</h1>
            <p className="text-muted-foreground text-[15px]">
              Browse every article published on {branding.siteName || "our site"}, organized by month.
            </p>
          </div>
        </div>

        <div className="container py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            {/* Month sidebar */}
            <aside>
              <h2 className="font-headline text-base font-bold mb-4 tracking-tight">Browse by Month</h2>
              {monthsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : !months || months.length === 0 ? (
                <p className="text-muted-foreground text-sm">No archived articles yet.</p>
              ) : (
                <nav className="space-y-0.5">
                  {months.map(m => (
                    <button
                      key={m.month}
                      onClick={() => handleMonthSelect(m.month)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        selectedMonth === m.month
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <span>{formatMonth(m.month)}</span>
                      <span className={`text-xs ${selectedMonth === m.month ? "opacity-80" : "text-muted-foreground"}`}>
                        {m.count.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </nav>
              )}
            </aside>

            {/* Articles panel */}
            <div>
              {!selectedMonth ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-[15px]">Select a month from the sidebar to browse articles.</p>
                </div>
              ) : articlesLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
                </div>
              ) : !articles || articles.articles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No articles found for {formatMonth(selectedMonth)}.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <h2 className="font-headline text-xl font-bold tracking-tight">{formatMonth(selectedMonth)}</h2>
                    <span className="text-muted-foreground text-sm">— {articles.total.toLocaleString()} articles</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
                    {articles.articles.map((article) => (
                      <ArticleCard key={article.id} article={article as any} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Previous
                      </button>
                      <span className="text-sm text-muted-foreground px-2">
                        Page {page + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
