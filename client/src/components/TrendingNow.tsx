import { Link } from "wouter";
import { TrendingUp, Eye, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TrendingNowProps {
  hoursAgo?: number;
}

export default function TrendingNow({ hoursAgo = 24 }: TrendingNowProps = {}) {
  const { data: trending, isLoading } = trpc.articles.trending.useQuery({
    hoursAgo,
    limit: 5,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-[18px] font-bold text-foreground">Trending Now</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 bg-muted rounded" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!trending || trending.length === 0) {
    return null;
  }

  const timeLabel = hoursAgo === 24 ? "24 hours" : hoursAgo === 168 ? "week" : `${hoursAgo} hours`;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm card-hover">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-[18px] font-bold text-foreground tracking-tight">Trending Now</h2>
        </div>
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded-full">
          {timeLabel}
        </span>
      </div>
      
      <div className="space-y-1">
        {trending.map((article, idx) => (
          <Link key={article.id} href={`/article/${article.slug}`}>
            <div className="group flex gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-accent/50 transition-all duration-300 cursor-pointer">
              <span className={`text-[22px] font-black leading-none shrink-0 w-7 text-center transition-colors duration-300 ${idx === 0 ? 'text-primary' : idx === 1 ? 'text-primary/60' : idx === 2 ? 'text-primary/40' : 'text-primary/20'} group-hover:text-primary`}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors duration-300 leading-snug line-clamp-2 mb-1">
                  {article.headline}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.views.toLocaleString()}
                  </span>
                  {article.publishedAt && (
                    <>
                      <span className="text-border">·</span>
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <Link href="/trending" className="inline-flex items-center gap-2 mt-4 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors">
        View All Trending
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
