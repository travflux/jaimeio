/**
 * MerchSidebar
 * Displays up to 5 active product options on article pages, ordered by admin-configured
 * sidebar position. Fetches config from getSidebarConfig (single DB query, zero Printify calls).
 *
 * variant="default" (default): Desktop right sidebar only (hidden on mobile).
 * variant="inline":  Mobile strip between article image and body (hidden on desktop).
 *
 * Usage in ArticlePage:
 *   - <MerchSidebar variant="inline" .../>  placed after <figure>, before article body
 *   - <MerchSidebar .../>  placed in the desktop sidebar column
 *
 * Gated by merch_sidebar_enabled admin setting (returned by getSidebarConfig).
 */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

interface MerchSidebarProps {
  articleSlug: string;
  articleHeadline: string;
  articleImage?: string | null;
  variant?: 'default' | 'inline';
}

export default function MerchSidebar({ articleSlug, articleHeadline, articleImage, variant = 'default' }: MerchSidebarProps) {
  const { data } = trpc.merch.getSidebarConfig.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min — settings don't change often
  });

  // Don't render if disabled or no active products
  if (!data?.enabled || !data.products.length) return null;

  const truncatedHeadline = articleHeadline.length > 72
    ? articleHeadline.substring(0, 72) + "…"
    : articleHeadline;

  // Inline variant: between image and article body, mobile only
  if (variant === 'inline') {
    return (
      <div className="lg:hidden mb-6" aria-label="Shop this article">
        <MobileStrip
          articleSlug={articleSlug}
          truncatedHeadline={truncatedHeadline}
          articleImage={articleImage}
          products={data.products}
        />
      </div>
    );
  }

  // Default variant: desktop sidebar only (no mobile strip — handled by inline above)
  return (
    <aside
      className="hidden lg:block w-52 xl:w-56 shrink-0 self-start sticky top-24"
      aria-label="Shop this article"
    >
      <SidebarContent
        articleSlug={articleSlug}
        truncatedHeadline={truncatedHeadline}
        articleImage={articleImage}
        products={data.products}
      />
    </aside>
  );
}

type ProductEntry = {
  type: string;
  meta: { icon: string; label: string; desc: string };
};

function SidebarContent({ articleSlug, truncatedHeadline, articleImage, products }: {
  articleSlug: string;
  truncatedHeadline: string;
  articleImage?: string | null;
  products: ProductEntry[];
}) {
  return (
    <div className="border border-[#D4C9B8] bg-[#FAF7F2] rounded-sm p-3 text-sm font-sans">
      {/* Header */}
      <p className="text-[10px] uppercase tracking-widest text-[#888] font-semibold mb-2 border-b border-[#D4C9B8] pb-1">
        Shop This Article
      </p>

      {/* Article thumbnail + headline */}
      {articleImage && (
        <img
          src={articleImage}
          alt=""
          className="w-full aspect-video object-cover rounded-sm mb-2 opacity-90"
          loading="lazy"
        />
      )}
      <p className="text-[11px] text-[#444] leading-snug mb-3 italic">
        "{truncatedHeadline}"
      </p>

      {/* Product links */}
      <ul className="space-y-1.5">
        {products.map(({ type, meta }) => (
          <li key={type}>
            <Link
              href={`/shop/${articleSlug}?product=${type}`}
              className="flex items-center gap-1.5 text-[#1A1A1A] hover:text-[#C41E3A] transition-colors text-[12px] leading-tight group"
            >
              <span className="text-base leading-none">{meta.icon}</span>
              <span className="group-hover:underline underline-offset-2">Put it on a {meta.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Shop more */}
      <Link
        href={`/shop/${articleSlug}`}
        className="mt-3 block text-center text-[11px] text-[#C41E3A] hover:underline font-medium border-t border-[#D4C9B8] pt-2"
      >
        → Shop more
      </Link>
    </div>
  );
}

function MobileStrip({ articleSlug, truncatedHeadline, articleImage, products }: {
  articleSlug: string;
  truncatedHeadline: string;
  articleImage?: string | null;
  products: ProductEntry[];
}) {
  return (
    <div className="border border-[#D4C9B8] bg-[#FAF7F2] rounded-sm p-3 font-sans">
      <p className="text-[10px] uppercase tracking-widest text-[#888] font-semibold mb-2 border-b border-[#D4C9B8] pb-1">
        Shop This Article
      </p>

      <div className="flex gap-3 items-start">
        {articleImage && (
          <img
            src={articleImage}
            alt=""
            className="w-16 h-16 object-cover rounded-sm shrink-0 opacity-90"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[#444] italic leading-snug mb-2 line-clamp-2">
            "{truncatedHeadline}"
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {products.map(({ type, meta }) => (
              <Link
                key={type}
                href={`/shop/${articleSlug}?product=${type}`}
                className="text-[11px] text-[#1A1A1A] hover:text-[#C41E3A] hover:underline transition-colors whitespace-nowrap"
              >
                {meta.icon} {meta.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Link
        href={`/shop/${articleSlug}`}
        className="mt-2 block text-right text-[11px] text-[#C41E3A] hover:underline font-medium"
      >
        → Shop more
      </Link>
    </div>
  );
}
