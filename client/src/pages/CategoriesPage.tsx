import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useBranding } from "@/hooks/useBranding";
import { usePageSEO } from "@/hooks/usePageSEO";
import { usePageView } from "@/hooks/usePageView";
import { SiteLoader } from "@/components/SiteLoader";
import { getCategoryColor } from "../../../shared/categoryColors";
import { Newspaper } from "lucide-react";

export default function CategoriesPage() {
  const { branding } = useBranding();
  const { data: categories, isLoading } = trpc.categories.list.useQuery();

  usePageSEO({
    title: `All Sections — ${branding.siteName}`,
    description: `Browse all content sections on ${branding.siteName}.`,
  });
  usePageView();

  if (isLoading) return <SiteLoader />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold font-headline mb-2">All Sections</h1>
          <p className="text-muted-foreground mb-10">
            Browse {branding.siteName} by topic. Select a section to see the latest articles.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories?.map((cat) => {
              const color = getCategoryColor(cat.slug);
              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="group block rounded-lg border bg-card hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="h-1.5" style={{ background: color }} />
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-9 h-9 rounded-md flex items-center justify-center"
                        style={{ background: color + "18" }}
                      >
                        <Newspaper className="w-4 h-4" style={{ color }} />
                      </div>
                      <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {cat.name}
                      </h2>
                    </div>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                      {(cat as any).articleCount ?? ""} {(cat as any).articleCount === 1 ? "article" : "articles"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {(!categories || categories.length === 0) && (
            <p className="text-center text-muted-foreground py-16">No sections yet.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
