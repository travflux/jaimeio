import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { Loader2, Tag as TagIcon, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useBranding } from "@/hooks/useBranding";
import { setCanonicalURL } from "@/lib/canonical-url";
import { useEffect, useState } from "react";

export default function TagPage() {
  const { branding } = useBranding();
  const slug = useMemo(() => {
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "";
  }, []);

  const [page, setPage] = useState(0);
  const limit = 24;

  const { data, isLoading, error } = trpc.tags.articlesByTag.useQuery(
    { slug, limit, offset: page * limit },
    { enabled: !!slug }
  );

  const tag = data?.tag;
  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  usePageSEO({
    title: tag
      ? `#${tag.name} — ${branding.siteName || ""} | ${total} Articles`
      : `Tag — ${branding.siteName || ""}`,
    description: tag
      ? `Browse ${total} articles tagged "${tag.name}" on ${branding.siteName || "our site"}.`
      : `Browse articles by tag on ${branding.siteName || "our site"}.`,
    keywords: tag ? `${tag.name}, ${branding.genre || 'news'}, articles` : "tags, articles",
  });

  useEffect(() => {
    setCanonicalURL();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !tag) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-20">
            <Hash className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="font-headline text-2xl font-bold mb-2">Tag not found</h1>
            <p className="text-muted-foreground">No articles found for this tag.</p>
            <a href="/" className="mt-6 inline-block text-sm font-medium hover:underline">← Back to home</a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Tag header */}
        <div className="bg-muted/40 border-b border-border">
          <div className="container py-10">
            <div className="flex items-center gap-3 mb-2">
              <TagIcon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Tag</span>
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tight mb-3">
              #{tag.name}
            </h1>
            {tag.description && (
              <p className="text-muted-foreground text-[15px] max-w-2xl mb-3">{tag.description}</p>
            )}
            <Badge variant="secondary" className="text-xs">
              {total.toLocaleString()} {total === 1 ? "article" : "articles"}
            </Badge>
          </div>
        </div>

        {/* Articles grid */}
        <div className="container py-10">
          {articles.length === 0 ? (
            <div className="text-center py-16">
              <Hash className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No published articles with this tag yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
                {articles.map((article) => (
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
      </main>

      <Footer />
    </div>
  );
}
