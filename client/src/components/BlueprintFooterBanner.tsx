import { ArrowRight } from "lucide-react";
import { genericBlueprintCTA } from "@/lib/adMessaging";

interface BlueprintFooterBannerProps {
  className?: string;
}

export function BlueprintFooterBanner({ className = "" }: BlueprintFooterBannerProps) {
  return (
    <div className={`bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground rounded-xl p-8 mb-8 shadow-lg ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground/70 mb-2">
            Exclusive Offer
          </p>
          <h2 className="font-headline text-3xl font-bold mb-3 leading-tight">
            {genericBlueprintCTA.headline}
          </h2>
          <p className="text-[15px] text-primary-foreground/90 leading-relaxed mb-5">
            {genericBlueprintCTA.description}
          </p>
          <a
            href={genericBlueprintCTA.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-primary-foreground text-primary font-semibold text-[15px] hover:opacity-90 transition-opacity group"
          >
            {genericBlueprintCTA.cta}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-primary-foreground/10 rounded-lg p-4 border border-primary-foreground/20">
            <div className="text-2xl font-bold mb-1">400+</div>
            <p className="text-xs font-medium text-primary-foreground/80">Transactions</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-lg p-4 border border-primary-foreground/20">
            <div className="text-2xl font-bold mb-1">18</div>
            <p className="text-xs font-medium text-primary-foreground/80">Years</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-lg p-4 border border-primary-foreground/20">
            <div className="text-2xl font-bold mb-1">6</div>
            <p className="text-xs font-medium text-primary-foreground/80">States</p>
          </div>
        </div>
      </div>
    </div>
  );
}
