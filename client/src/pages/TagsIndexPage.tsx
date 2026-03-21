import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, Hash } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useBranding } from "@/hooks/useBranding";

export default function TagsIndexPage() {
  const { branding } = useBranding();

  const { data: cloud, isLoading } = trpc.tags.cloud.useQuery({ limit: 100 });
  const { data: trending } = trpc.tags.trending.useQuery({ limit: 12 });

  usePageSEO({
    title: `All Topics — ${branding.siteName || ""}`,
    description: `Browse all article topics and tags on ${branding.siteName || "our site"}.`,
    keywords: "topics, tags, categories, browse articles",
  });

  // Scale font size based on article count
  const maxCount = Math.max(...(cloud?.map(t => t.articleCount) ?? [1]), 1);
  const minCount = Math.min(...(cloud?.map(t => t.articleCount) ?? [1]), 1);

  function tagFontSize(count: number): string {
    if (maxCount === minCount) return "text-base";
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio > 0.8) return "text-2xl font-bold";
    if (ratio > 0.6) return "text-xl font-semibold";
    if (ratio > 0.4) return "text-lg font-medium";
    if (ratio > 0.2) return "text-base";
    return "text-sm";
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-muted/40 border-b border-border">
          <div className="container py-10">
            <div className="flex items-center gap-3 mb-2">
              <Hash className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Browse</span>
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tight mb-2">All Topics</h1>
            <p className="text-muted-foreground text-[15px]">
              Explore articles by topic. Larger tags have more articles.
            </p>
          </div>
        </div>

        <div className="container py-10">
          {/* Trending tags */}
          {trending && trending.length > 0 && (
            <section className="mb-12">
              <h2 className="font-headline text-xl font-bold mb-5 tracking-tight">Trending This Week</h2>
              <div className="flex flex-wrap gap-2">
                {trending.map(tag => (
                  <a
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Hash className="w-3 h-3" />
                    {tag.name}
                    <span className="opacity-70 text-xs">({tag.articleCount})</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Full tag cloud */}
          <section>
            <h2 className="font-headline text-xl font-bold mb-5 tracking-tight">All Tags</h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !cloud || cloud.length === 0 ? (
              <div className="text-center py-16">
                <Hash className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No tags yet. Tags are generated automatically when articles are published.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 items-baseline">
                {cloud.map(tag => (
                  <a
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className={`text-foreground hover:text-primary transition-colors ${tagFontSize(tag.articleCount)}`}
                    title={`${tag.articleCount} articles`}
                  >
                    #{tag.name}
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
