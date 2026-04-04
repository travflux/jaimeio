import { ExternalLink, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AmazonAdProps {
  /** Amazon Associates tracking tag (e.g., "yourtag-20") */
  associateTag: string;
  /** Contextual keywords for product search */
  keywords?: string;
  /** Fallback affiliate link if no tag/keywords */
  affiliateLink?: string;
  /** Display variant */
  variant?: "card" | "button" | "inline";
  /** Custom headline for the ad */
  headline?: string;
  className?: string;
  /** Article slug for click attribution */
  articleSlug?: string;
}

/**
 * Build an Amazon search URL with affiliate tag and contextual keywords.
 * Falls back to a generic storefront link if no keywords provided.
 */
function buildAmazonUrl(associateTag: string, keywords?: string, fallbackLink?: string): string {
  if (associateTag && keywords) {
    const encodedKeywords = encodeURIComponent(
      keywords.split(",").slice(0, 4).map(k => k.trim()).join(" ")
    );
    return `https://www.amazon.com/s?k=${encodedKeywords}&tag=${associateTag}`;
  }
  if (associateTag) {
    return `https://www.amazon.com/?tag=${associateTag}`;
  }
  return fallbackLink || "#";
}

/**
 * Wrap the destination URL in the affiliate click tracker.
 * /api/go/amazon?url=<dest>&slug=<slug>
 */
function buildTrackerUrl(destinationUrl: string, articleSlug?: string): string {
  const params = new URLSearchParams({ url: destinationUrl });
  if (articleSlug) params.set("slug", articleSlug);
  return `/api/go/amazon?${params.toString()}`;
}

/** Pick a display headline based on the keywords */
function getContextualHeadline(keywords?: string): string {
  if (!keywords) return "Recommended Reading";
  const kw = keywords.toLowerCase();
  if (kw.includes("book") || kw.includes("history") || kw.includes("essay")) return "Books You Might Enjoy";
  if (kw.includes("tech") || kw.includes("gadget") || kw.includes("electronic")) return "Gear Worth a Look";
  if (kw.includes("fitness") || kw.includes("sport") || kw.includes("workout")) return "Level Up Your Game";
  if (kw.includes("kitchen") || kw.includes("food") || kw.includes("cooking")) return "Kitchen Finds";
  if (kw.includes("gift") || kw.includes("humor") || kw.includes("comedy")) return "Gifts for the Sharp-Witted";
  return "Recommended for You";
}

/** Pick a subtitle based on keywords */
function getContextualSubtitle(keywords?: string): string {
  if (!keywords) return "Handpicked for our readers.";
  const kw = keywords.toLowerCase();
  if (kw.includes("politic") || kw.includes("government")) return "Because reality is always stranger than fiction.";
  if (kw.includes("tech") || kw.includes("ai") || kw.includes("software")) return "For when the machines inevitably take over.";
  if (kw.includes("business") || kw.includes("entrepreneur")) return "Hustle culture merch, unironically.";
  if (kw.includes("humor") || kw.includes("satire") || kw.includes("comedy")) return "Fuel your sense of humor.";
  if (kw.includes("science") || kw.includes("space")) return "Expand your mind. We dare you.";
  if (kw.includes("sport") || kw.includes("fitness")) return "For armchair athletes and actual ones.";
  return "Curated based on what you're reading.";
}

export default function AmazonAd({
  associateTag,
  keywords,
  affiliateLink,
  variant = "card",
  headline,
  className = "",
  articleSlug,
}: AmazonAdProps) {
  if (!associateTag && !affiliateLink) return null;

  const destinationUrl = buildAmazonUrl(associateTag, keywords, affiliateLink);
  const trackerUrl = buildTrackerUrl(destinationUrl, articleSlug);
  const displayHeadline = headline || getContextualHeadline(keywords);
  const subtitle = getContextualSubtitle(keywords);

  if (variant === "button") {
    return (
      <a href={trackerUrl} target="_blank" rel="noopener noreferrer sponsored" className={className}>
        <Button variant="outline" className="w-full gap-2">
          <ShoppingBag className="w-4 h-4" />
          {displayHeadline}
          <ExternalLink className="w-3 h-3" />
        </Button>
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={trackerUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={`flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ${className}`}
      >
        <ShoppingBag className="w-3.5 h-3.5" />
        <span>{displayHeadline}</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  // Card variant (default)
  return (
    <a href={trackerUrl} target="_blank" rel="noopener noreferrer sponsored" className={`block ${className}`}>
      <div className="rounded-sm overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer group">
        <div className="bg-[#E5E7EB] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm bg-black/10 flex items-center justify-center">
              <ShoppingBag className="w-3 h-3 text-[#374151]" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#374151]">Recommended</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#C41E3A]" />
        </div>
        <div className="bg-card px-5 py-4">
          <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors">
            {displayHeadline}
          </h3>

          <p className="text-sm text-muted-foreground mb-4">
            {subtitle}
          </p>

          <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
            Browse on Amazon
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>
      </div>
    </a>
  );
}
