import { ArrowRight } from "lucide-react";
import { getAdMessage } from "@/lib/adMessaging";

interface BlueprintSidebarWidgetProps {
  categorySlug?: string;
  className?: string;
}

export function BlueprintSidebarWidget({ categorySlug, className = "" }: BlueprintSidebarWidgetProps) {
  const ad = getAdMessage(categorySlug);

  return (
    <div className={`bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 shadow-sm ${className}`}>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">Exclusive Offer</p>
        <h3 className="font-headline text-lg font-bold text-foreground leading-tight">
          {ad.headline}
        </h3>
      </div>

      <p className="text-[14px] text-muted-foreground leading-relaxed mb-5">
        {ad.description}
      </p>

      <a
        href={ad.ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-[14px] hover:opacity-90 transition-opacity group"
      >
        {ad.cta}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </a>

      <p className="text-[12px] text-muted-foreground mt-4 italic">
        Proven system for 400+ transactions across 6 states.
      </p>
    </div>
  );
}
