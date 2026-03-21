import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import BackToTop from "@/components/BackToTop";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { SiteLoader } from "@/components/SiteLoader";
import { trpc } from "@/lib/trpc";
import { getCategoryColor } from "../../../shared/categoryColors";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useBranding } from "@/hooks/useBranding";
import { usePageView } from "@/hooks/usePageView";

export default function TrendingPage() {
  const { branding } = useBranding();
  const { data: cats } = trpc.categories.list.useQuery();
  const { data: trendingData, isLoading } = trpc.articles.trending.useQuery({ hoursAgo: 24, limit: 50 });

  const catMap = new Map(cats?.map(c => [c.id, { name: c.name, slug: c.slug }]) ?? []);
  const trending = trendingData ?? [];

  usePageView();

  usePageSEO({
    title: `Trending Now — ${branding.siteName || ""} | Top Stories Today`,
    description: `The hottest stories gaining momentum right now. See what readers are talking about across all categories on ${branding.siteName || "our site"}.`,
    keywords: "trending news, top stories, viral news, most read, breaking news",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <SiteLoader message="Loading trending articles..." size="large" />
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
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h1 className="font-headline text-4xl sm:text-5xl font-black tracking-[-0.02em]">
                Trending Now
              </h1>
            </div>

            <p className="text-lg text-muted-foreground/70 max-w-2xl leading-relaxed font-light">
              The hottest stories gaining momentum right now. See what readers are talking about across all categories.
            </p>
          </div>

          {/* Articles Grid */}
          {trending.length > 0 ? (
            <>
              <h2 className="font-headline text-2xl font-bold mb-6 tracking-tight">Trending Articles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
              {trending.map(article => {
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
            <div className="mt-10">
            </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground/60 text-lg">No trending articles at the moment. Check back soon!</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
