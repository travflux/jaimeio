import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  currentSlug: string;
  categoryId?: number | null;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function YouMightAlsoLike({ currentSlug, categoryId }: Props) {
  const { data: related, isLoading } = trpc.articles.related.useQuery(
    { slug: currentSlug, categoryId: categoryId ?? null, limit: 4 },
    { staleTime: 1000 * 60 * 5 }
  );

  if (isLoading) {
    return (
      <section className="mt-10 pt-8 border-t border-border">
        <h3 className="font-serif text-xl font-bold text-foreground mb-5">You might also like</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-20 h-16 shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!related || related.length === 0) return null;

  return (
    <section className="mt-10 pt-8 border-t border-border">
      <h3 className="font-serif text-xl font-bold text-foreground mb-5">You might also like</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        {related.map((article) => (
          <Link key={article.id} href={`/article/${article.slug}`}>
            <div className="flex gap-3 group cursor-pointer">
              {article.featuredImage ? (
                <img
                  src={article.featuredImage}
                  alt=""
                  className="w-20 h-16 object-cover rounded shrink-0 bg-muted"
                  loading="lazy"
                />
              ) : (
                <div className="w-20 h-16 shrink-0 rounded bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-xs">No image</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm font-semibold text-foreground leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                  {article.headline}
                </p>
                {article.publishedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeDate(article.publishedAt)}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
