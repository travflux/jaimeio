import { ArrowRight } from "lucide-react";
import { getAdMessage } from "@/lib/adMessaging";

interface BlueprintArticleCTAProps {
  categorySlug?: string;
  position?: "mid" | "end";
  className?: string;
}

export function BlueprintArticleCTA({ categorySlug, position = "end", className = "" }: BlueprintArticleCTAProps) {
  const ad = getAdMessage(categorySlug);
  const isMid = position === "mid";

  return (
    <div className={`my-8 p-8 rounded-xl border border-border bg-card shadow-sm ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">
            {isMid ? "Continue Learning" : "Ready to Scale?"}
          </p>
          <h3 className="font-headline text-2xl font-bold text-foreground mb-3 leading-tight">
            {ad.headline}
          </h3>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            {ad.description}
          </p>
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 transition-opacity group"
          >
            {ad.cta}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        <div className="md:col-span-1 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/10 text-center">
          <div className="text-4xl font-bold text-primary mb-2">400+</div>
          <p className="text-sm font-medium text-foreground mb-4">Transactions Completed</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div>✓ 18 years experience</div>
            <div>✓ 6 states</div>
            <div>✓ All market cycles</div>
          </div>
        </div>
      </div>
    </div>
  );
}
