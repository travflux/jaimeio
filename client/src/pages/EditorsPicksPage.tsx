import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import BackToTop from "@/components/BackToTop";
import { ArrowLeft, Star } from "lucide-react";
import { SiteLoader } from "@/components/SiteLoader";
import { trpc } from "@/lib/trpc";
import { getCategoryColor } from "../../../shared/categoryColors";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useBranding } from "@/hooks/useBranding";

export default function EditorsPicksPage() {
  const { branding } = useBranding();
  const { data: cats } = trpc.categories.list.useQuery();
  const { data: settingsRaw } = trpc.settings.list.useQuery();
  const editorPicksIds = settingsRaw?.find(s => s.key === 'editor_picks_ids')?.value || '';
  const { data: allArticlesData, isLoading } = trpc.articles.list.useQuery({ status: "published", limit: 100 });
  const allArticles = allArticlesData?.articles ?? [];

  const catMap = new Map(cats?.map(c => [c.id, { name: c.name, slug: c.slug }]) ?? []);
  
  // Parse editor picks IDs and filter articles
  const pickedIds = editorPicksIds ? editorPicksIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
  let editorsPicks = allArticles?.filter((a: any) => pickedIds.includes(a.id)) ?? [];
  
  // Fallback: If no editor picks are configured, show most recent articles
  if (editorsPicks.length === 0) {
    editorsPicks = allArticles?.slice(0, 50) ?? [];
  }

  usePageSEO({
    title: `Editor's Picks — ${branding.siteName || ""} | Best Stories`,
    description: `Handpicked stories from our editorial team. The best satire, commentary, and humor we've published on ${branding.siteName || "our site"}.`,
    keywords: "editor picks, best articles, featured stories, editorial selection, top content",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <SiteLoader message="Loading editor's picks..." size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container py-12">
          {/* Header */}
          <div className="mb-12">
            <Link href="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6 text-[14px] font-semibold">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h1 className="font-headline text-4xl sm:text-5xl font-black tracking-[-0.02em]">
                Editor's Picks
              </h1>
            </div>

            <p className="text-lg text-muted-foreground/70 max-w-2xl leading-relaxed font-light">
              Handpicked stories from our editorial team. The best satire, commentary, and humor we've published.
            </p>
          </div>

          {/* Articles Grid */}
          {editorsPicks.length > 0 ? (
            <>
              <h2 className="font-headline text-2xl font-bold mb-6 tracking-tight">Featured Stories</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                {editorsPicks.map((article: any) => {
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
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground/60 text-lg">No editor's picks available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
