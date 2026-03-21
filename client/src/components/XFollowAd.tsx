/**
 * XFollowAd — Non-popup ad containers with X.com follow CTA.
 *
 * Four variants:
 *  - "sidebar"       → tall card for the article/category right column
 *  - "inline"        → full-width block inserted between article paragraphs
 *  - "banner"        → wide horizontal strip for homepage section breaks
 *  - "above-footer"  → full-bleed dark band placed directly above the footer
 *
 * All branding (handle, URL, site name, mascot) is pulled from useBranding so
 * white-label deployments automatically use their own X account.
 */
import { useBranding } from "@/hooks/useBranding";
import { trpc } from "@/lib/trpc";

interface XFollowAdProps {
  variant?: "sidebar" | "inline" | "banner" | "above-footer";
  className?: string;
}

/** X (Twitter) bird icon as inline SVG — no external dependency */
function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Decorative newspaper column rule */
function ColumnRule() {
  return <div className="hidden sm:block w-px bg-white/10 self-stretch mx-2" />;
}

function formatFollowerCount(count: number | null | undefined): string | null {
  if (count == null) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}K`;
  return count.toString();
}

export default function XFollowAd({ variant = "inline", className = "" }: XFollowAdProps) {
  const { branding } = useBranding();
  const { data: followerData } = trpc.branding.xFollowerCount.useQuery(undefined, {
    staleTime: 6 * 60 * 60 * 1000, // 6 hours — matches server cache TTL
    retry: false,
  });
  const followerCount = formatFollowerCount(followerData?.count);
  const handle = branding.twitterHandle ? `@${branding.twitterHandle.replace(/^@/, "")}` : "";
  const url = branding.twitterUrl || "https://x.com";
  const siteName = branding.siteName || "";

  /* ─────────────────────────────────────────────
     SIDEBAR — tall card for right-column placement
  ───────────────────────────────────────────── */
  if (variant === "sidebar") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block rounded-sm overflow-hidden no-underline shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
        aria-label={`Follow ${siteName} on X (opens in new tab)`}
        title="Opens in a new tab"
      >
        {/* Header band */}
        <div className="bg-[#9CA3AF] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm bg-black/10 flex items-center justify-center">
              <XIcon className="w-3 h-3 text-[#374151]" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#374151]">Follow Us on X</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#C41E3A]" />
        </div>

        {/* Body */}
        <div className="bg-card border border-t-0 border-border px-5 py-5">
          {/* Avatar + handle row */}
          <div className="flex items-center gap-3 mb-4">
            {branding.mascotUrl ? (
              <div className="w-12 h-12 rounded-sm overflow-hidden border border-border/50 shrink-0 bg-muted">
                <img
                  src={branding.mascotUrl}
                  alt={branding.mascotName || siteName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-sm bg-[#9CA3AF] flex items-center justify-center shrink-0">
                <XIcon className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-headline text-[15px] font-black leading-tight text-foreground tracking-tight">{siteName}</p>
              <p className="text-[12px] text-muted-foreground font-mono mt-0.5">{handle}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50 mb-4" />

          {/* Copy */}
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
            {branding.description || branding.tagline || "Commentary and the news as it should have been reported."} Follow for daily dispatches.
          </p>

          {/* CTA button */}
          <span className="flex items-center justify-center gap-2 bg-[#9CA3AF] text-white text-[13px] font-bold px-4 py-2.5 rounded-sm group-hover:bg-[#C41E3A] transition-colors duration-200 w-full">
            <XIcon className="w-3.5 h-3.5" />
            Follow {handle}
          </span>
        </div>
      </a>
    );
  }

  /* ─────────────────────────────────────────────
     BANNER — horizontal strip for homepage breaks
  ───────────────────────────────────────────── */
  if (variant === "banner") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center gap-4 sm:gap-6 rounded-sm overflow-hidden no-underline shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
        aria-label={`Follow ${siteName} on X (opens in new tab)`}
        title="Opens in a new tab"
      >
        {/* Left dark panel */}
        <div className="bg-[#1A1A1A] px-5 py-4 flex items-center gap-3 shrink-0">
          <XIcon className="w-5 h-5 text-white" />
          <span className="hidden sm:block text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 whitespace-nowrap">Follow on X</span>
        </div>

        {/* Middle content */}
        <div className="flex-1 min-w-0 py-3.5 bg-card border-y border-r border-border pr-4">
          <p className="font-headline text-[15px] font-bold text-foreground leading-tight truncate">
            Follow <span className="text-[#C41E3A]">{siteName}</span> for daily {branding.genre ? `${branding.genre} & ` : ""}sharp commentary
          </p>
          <p className="text-[12px] text-muted-foreground font-mono mt-0.5 truncate">{handle}</p>
        </div>

        {/* CTA */}
        <span className="shrink-0 flex items-center gap-2 bg-[#1A1A1A] text-white text-[13px] font-bold px-5 py-4 group-hover:bg-[#C41E3A] transition-colors duration-200 whitespace-nowrap self-stretch">
          <XIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Follow</span>
        </span>
      </a>
    );
  }

  /* ─────────────────────────────────────────────
     ABOVE-FOOTER — full-bleed dark band above footer
  ───────────────────────────────────────────── */
  if (variant === "above-footer") {
    return (
      <div className={`w-full bg-[#1A1A1A] ${className}`}>
        <div className="container py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left: headline + subtext */}
            <div className="flex items-center gap-5 min-w-0">
              {branding.mascotUrl && (
                <div className="w-14 h-14 rounded-sm overflow-hidden border border-white/10 shrink-0 bg-white/5">
                  <img
                    src={branding.mascotUrl}
                    alt={branding.mascotName || siteName}
                    className="w-full h-full object-cover opacity-90"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1">Stay in the Loop</p>
                <h3 className="font-headline text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                  Follow <span className="text-[#C41E3A]">{siteName}</span> on X
                </h3>
                <p className="text-[13px] text-white/50 mt-1 hidden sm:block">
                  {branding.tagline || "Trending takes and the news as it should have been reported."}
                </p>
              </div>
            </div>

            <ColumnRule />

            {/* Stats row */}
            <div className="hidden lg:flex items-center gap-8 shrink-0">
              <div className="text-center">
                <p className="text-[22px] font-black text-white leading-none">50+</p>
                <p className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Articles/Day</p>
              </div>
              {followerCount && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="text-center">
                    <p className="text-[22px] font-black text-white leading-none">{followerCount}</p>
                    <p className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Followers</p>
                  </div>
                </>
              )}
            </div>

            <ColumnRule />

            {/* CTA button */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn shrink-0 flex items-center gap-3 bg-white text-[#1A1A1A] text-[14px] font-black px-7 py-3.5 rounded-sm hover:bg-[#C41E3A] hover:text-white transition-colors duration-200 no-underline whitespace-nowrap shadow-lg"
              aria-label={`Follow ${siteName} on X (opens in new tab)`}
              title="Opens in a new tab"
            >
              <XIcon className="w-4 h-4" />
              Follow {handle}
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     INLINE — full-width block between article paragraphs
  ───────────────────────────────────────────── */
  return (
    <div className={`my-8 rounded-sm overflow-hidden shadow-sm ${className}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col sm:flex-row items-stretch no-underline"
        aria-label={`Follow ${siteName} on X (opens in new tab)`}
        title="Opens in a new tab"
      >
        {/* Left dark panel */}
        <div className="bg-[#1A1A1A] sm:w-[180px] shrink-0 flex flex-col items-center justify-center gap-3 px-6 py-5 sm:py-6">
          {branding.mascotUrl ? (
            <div className="w-14 h-14 rounded-sm overflow-hidden border border-white/10 bg-white/5">
              <img
                src={branding.mascotUrl}
                alt={branding.mascotName || siteName}
                className="w-full h-full object-cover opacity-90"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-sm bg-white/10 flex items-center justify-center">
              <XIcon className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="text-center">
            <p className="font-headline text-[14px] font-black text-white leading-tight">{siteName}</p>
            <p className="text-[11px] text-white/50 font-mono mt-0.5">{handle}</p>
          </div>
        </div>

        {/* Right content panel */}
        <div className="flex-1 bg-card border border-l-0 border-border flex flex-col sm:flex-row items-center gap-4 px-6 py-5">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C41E3A] mb-1.5">Follow on X</p>
            <p className="font-headline text-[16px] font-bold text-foreground leading-snug">
              Get daily {branding.genre ? `${branding.genre} & ` : ""}sharp commentary
            </p>
            <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
              Breaking takes, trending stories, and the news as it should have been reported — every day.
            </p>
          </div>
          <span className="shrink-0 flex items-center gap-2 bg-[#1A1A1A] text-white text-[13px] font-bold px-6 py-3 rounded-sm group-hover:bg-[#C41E3A] transition-colors duration-200 whitespace-nowrap">
            <XIcon className="w-3.5 h-3.5" />
            Follow {handle}
          </span>
        </div>
      </a>
    </div>
  );
}
