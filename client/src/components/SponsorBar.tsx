import { trpc } from "@/lib/trpc";

interface SponsorBarProps {
  articleSlug?: string;
}

/**
 * Slim full-width sponsor strip.
 * - Text mode: shows label + CTA link with configurable colors.
 * - Image mode: shows a clickable sponsor image (when sponsor_bar_image_url is set).
 * Reads config from DB via tRPC — renders nothing if disabled or URL is empty.
 * Clicks are tracked server-side at /api/go/sponsor.
 */
export function SponsorBar({ articleSlug }: SponsorBarProps) {
  const { data } = trpc.settings.sponsorBar.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });

  if (!data?.enabled || !data?.url) return null;

  // Pass dest as a fallback so white-label deployments redirect correctly
  // even if their DB has no sponsor_bar_url configured yet.
  const trackingUrl = data.url
    ? `/api/go/sponsor?dest=${encodeURIComponent(data.url)}` +
      (articleSlug ? `&slug=${encodeURIComponent(articleSlug)}` : "")
    : `/api/go/sponsor` + (articleSlug ? `?slug=${encodeURIComponent(articleSlug)}` : "");

  const bgColor = data.bgColor || "#F0F0F0";
  const borderColor = data.borderColor || "#D0D0D0";
  const labelColor = data.labelColor || "#525252";
  const linkColor = data.linkColor || "#9B1830";

  return (
    <div
      className="w-full text-center py-1.5 px-4 text-xs"
      style={{
        backgroundColor: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        fontFamily: "Georgia, serif",
      }}
    >
      {data.imageUrl ? (
        /* Image mode — show clickable sponsor image */
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          title="Sponsored — opens in a new tab"
          aria-label="Sponsor advertisement (opens in new tab)"
          className="inline-block"
        >
          <img
            src={data.imageUrl}
            alt="Sponsor"
            className="inline-block max-h-8 max-w-full object-contain"
            loading="lazy"
          />
        </a>
      ) : (
        /* Text mode — show label + CTA */
        <>
          <span
            className="uppercase tracking-widest mr-2 font-semibold"
            style={{ color: labelColor, fontSize: "10px" }}
          >
            {data.label}
          </span>
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            title="Opens in a new tab"
            aria-label={`${data.cta} (opens in new tab)`}
            className="font-medium hover:underline"
            style={{ color: linkColor }}
          >
            {data.cta} →
          </a>
        </>
      )}
    </div>
  );
}
