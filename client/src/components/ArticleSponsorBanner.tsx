import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

interface ArticleSponsorBannerProps {
  articleSlug?: string;
}

/**
 * Inline sponsor banner displayed below article content and above share buttons.
 * Reads config from DB via tRPC — renders nothing if disabled or URL is empty.
 *
 * Display modes:
 *   - Image mode: when imageUrl is set, shows a full-width clickable image
 *   - Text mode: shows label, optional description, and CTA button with dynamic colors
 *
 * A/B Testing:
 *   When abTestEnabled is true, randomly serves variant A or B on each page load.
 *   Clicks are tracked with ?variant=a or ?variant=b so results can be compared.
 *
 * Scheduling:
 *   The server checks active_from/active_until and sets enabled=false if outside window.
 *
 * All colors are configurable via Admin > Monetization > Sponsor Settings.
 * Clicks are tracked via /api/go/article-sponsor.
 */
export function ArticleSponsorBanner({ articleSlug }: ArticleSponsorBannerProps) {
  const { data } = trpc.settings.articleSponsorBanner.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Randomly pick variant once per mount (stable via useMemo)
  const chosenVariant = useMemo<'a' | 'b'>(() => {
    if (!data?.abTestEnabled) return 'a';
    return Math.random() < 0.5 ? 'a' : 'b';
  }, [data?.abTestEnabled]);

  if (!data?.enabled || !data?.url) return null;

  // Resolve which variant's content to display
  const v = chosenVariant === 'b' && data.abTestEnabled ? data.variantB : null;
  const label = v?.label || data.label;
  const cta = v?.cta || data.cta;
  const description = v?.description || data.description;
  const imageUrl = v?.imageUrl || data.imageUrl;
  const bgColor = v?.bgColor || data.bgColor;
  const borderColor = v?.borderColor || data.borderColor;
  const headerBgColor = v?.headerBgColor || data.headerBgColor;
  const ctaBgColor = v?.ctaBgColor || data.ctaBgColor;
  const ctaTextColor = v?.ctaTextColor || data.ctaTextColor;

  // Build tracking URL — include variant param when A/B test is active.
  // Pass dest as a fallback so white-label deployments redirect correctly
  // even if their DB has no article_sponsor_url configured yet.
  const slugParam = articleSlug ? `slug=${encodeURIComponent(articleSlug)}&` : '';
  const variantParam = data.abTestEnabled ? `variant=${chosenVariant}&` : '';
  const destParam = data.url ? `dest=${encodeURIComponent(data.url)}&` : '';
  const trackingUrl = `/api/go/article-sponsor?${slugParam}${variantParam}${destParam}`.replace(/[?&]$/, '');

  // Image mode: full-width clickable image
  if (imageUrl) {
    return (
      <div
        className="my-8 overflow-hidden rounded-sm"
        style={{ border: `1px solid ${borderColor}` }}
      >
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`${label} — sponsored link (opens in new tab)`}
          className="block"
        >
          <img
            src={imageUrl}
            alt={label}
            className="w-full h-auto object-cover"
          />
        </a>
      </div>
    );
  }

  // Text mode: label + description + CTA button
  return (
    <div
      className="my-8 rounded-sm overflow-hidden"
      style={{
        border: `1px solid ${borderColor}`,
        fontFamily: "Georgia, serif",
      }}
    >
      {/* Header strip */}
      <div
        className="px-4 py-1.5 flex items-center justify-between"
        style={{
          backgroundColor: headerBgColor,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#888888]">
          {label}
        </span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#AAAAAA]">
          Advertisement
        </span>
      </div>

      {/* Banner body */}
      <div
        className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ backgroundColor: bgColor }}
      >
        {description ? (
          <p className="text-[15px] text-[#2C2C2C] leading-snug flex-1">
            {description}
          </p>
        ) : (
          <p className="text-[15px] text-[#666666] italic flex-1">
            Support independent journalism.
          </p>
        )}
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`${cta} — sponsored link (opens in new tab)`}
          className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-semibold px-5 py-2.5 rounded-sm transition-opacity hover:opacity-80"
          style={{
            backgroundColor: ctaBgColor,
            color: ctaTextColor,
          }}
        >
          {cta}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
