/**
 * ShopPage — /shop/:articleSlug
 *
 * CEO Architecture v2: ZERO Printify API calls during shopping.
 * - Renders instantly from a single DB query (merch.getShopConfig)
 * - Article image composited onto blank mockup via CSS overlay
 * - Buy Now always active — no pipeline wait
 * - Email capture → redirect to storefront URL (merch_printify_storefront_url setting)
 *
 * Layout:
 * - Full site Navbar + Footer (matches rest of site)
 * - Colored banner with "Back to article" link (matches category page pattern)
 * - Desktop: two-column — mockup left, [product selector + price + Buy] right (sticky)
 * - Mobile: single-column, sticky Buy button at bottom
 * - Upsell: inline grid below main block
 */
import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useBranding } from "@/hooks/useBranding";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type ProductType = "mug" | "shirt" | "poster" | "case" | "canvas" | "tote" | "hoodie" | "mousepad" | "candle" | "cards";

const ALL_PRODUCT_TYPES: ProductType[] = ["mug", "shirt", "poster", "case", "canvas", "tote", "hoodie", "mousepad", "candle", "cards"];

function parseProduct(raw: string | null): ProductType {
  const valid: ProductType[] = ["mug", "shirt", "poster", "case", "canvas", "tote", "hoodie", "mousepad", "candle", "cards"];
  return valid.includes(raw as ProductType) ? (raw as ProductType) : "mug";
}

export default function ShopPage() {
  const [, params] = useRoute("/shop/:slug");
  const slug = params?.slug ?? "";
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
  const initialProduct = parseProduct(searchParams.get("product"));

  const [selectedProduct, setSelectedProduct] = useState<ProductType>(initialProduct);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [newsletterChecked, setNewsletterChecked] = useState(true);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  const { branding } = useBranding();

  // Single query — all data needed for instant render, no Printify API calls
  const configQuery = trpc.merch.getShopConfig.useQuery(
    { articleSlug: slug },
    { enabled: !!slug, staleTime: 60_000 }
  );

  const captureLeadMutation = trpc.merch.captureLead.useMutation();

  const config = configQuery.data;
  const article = config ? { id: config.articleId, headline: config.articleHeadline, featuredImage: config.articleImage, slug: config.articleSlug } : null;

  // SEO — dynamic title once article data loads, static fallback before
  usePageSEO({
    title: article ? `${article.headline.substring(0, 45)} — ${branding.siteName} Shop` : `${branding.siteName} Shop — Merch & Gifts`,
    description: article
      ? `Shop mugs, shirts, posters and more inspired by "${article.headline.substring(0, 60)}". Printed on demand, ships in 3–7 days.`
      : `Shop ${branding.genre ? `${branding.genre} ` : ""}merch inspired by today's headlines. Mugs, shirts, posters, and more. Printed on demand.`,
    keywords: `${branding.genre ? `${branding.genre} merch, ` : ""}funny gifts, news-inspired gifts, humor merchandise, printed on demand`,
    defaultTitle: branding.siteName,
  });

  const currentProduct = config?.products[selectedProduct];

  // Google Ads conversion — merch store page view (fires once on mount)
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', { send_to: 'AW-17988276150/jlQOCPa63oIcELafvYFD' });
    }
  }, []);
  // Reset state when product changes
  useEffect(() => {
    setSelectedVariantId(null);
    setShowEmailCapture(false);
    setLeadError(null);
  }, [selectedProduct]);

  // Auto-select first variant when product data arrives
  useEffect(() => {
    if (currentProduct?.variantData && currentProduct.variantData.length > 0 && !selectedVariantId) {
      setSelectedVariantId(currentProduct.variantData[0].id);
    }
  }, [currentProduct, selectedVariantId]);

  async function handleOrderNow() {
    setShowEmailCapture(true);
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!article || !email || !termsChecked) return;
    setLeadSubmitting(true);
    setLeadError(null);
    try {
      const result = await captureLeadMutation.mutateAsync({
        email,
        articleId: article.id,
        productType: selectedProduct,
        newsletterOptIn: newsletterChecked,
        variantId: selectedVariantId ?? undefined,
      });
      if (result.type === "physical" && result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank");
        setShowEmailCapture(false);
      }
    } catch (err: unknown) {
      setLeadError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  }

  // All active products from config
  const activeProducts = config
    ? ALL_PRODUCT_TYPES.filter(t => config.products[t]?.active !== false)
    : ALL_PRODUCT_TYPES;
  // Upsell: all active products except the currently selected one
  const upsellProducts = activeProducts.filter(p => p !== selectedProduct);

  if (configQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (configQuery.isError || !config) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center font-sans">
            <p className="text-[#666] text-sm">Article not found.</p>
            <Link href="/" className="text-xs text-[#C41E3A] hover:underline mt-2 block">← Back to {branding.siteName}</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex flex-col">
      <Navbar />

      {/* ─── Colored Banner — matches category page pattern ─── */}
      <div className="w-full bg-[#C41E3A]">
        <div className="container py-8 sm:py-10">
          {/* Back to article link */}
          <Link
            href={`/article/${slug}`}
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-sans uppercase tracking-wider mb-4 transition-colors group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Back to article</span>
          </Link>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-white/70 text-xs font-sans uppercase tracking-widest mb-1.5">
                Merch Store
              </p>
              <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase text-white leading-tight max-w-2xl">
                {article?.headline.substring(0, 80)}{(article?.headline.length ?? 0) > 80 ? "…" : ""}
              </h1>
            </div>
            <div className="hidden sm:block text-right shrink-0">
              <p className="text-white/70 text-xs font-sans uppercase tracking-widest">
                {activeProducts.length} product{activeProducts.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container py-8 pb-24 lg:pb-8">

        {/* Two-column main layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* LEFT: Mockup with client-side overlay + disclaimer */}
          <div className="space-y-3">
            <MockupOverlay
              blankMockupUrl={currentProduct?.mockupUrl ?? ""}
              articleImageUrl={article?.featuredImage ?? null}
              printConfig={currentProduct?.printConfig as PrintConfig ?? { x: 0.5, y: 0.5, scale: 1 }}
              productType={selectedProduct}
            />

            {/* Preview disclaimer + upsell */}
            <div className="rounded-sm border border-[#D4C9B8] bg-white/60 px-3 py-2.5 space-y-1.5">
              <p className="text-[11px] text-[#666] font-sans leading-snug">
                <span className="font-semibold text-[#444]">Preview is approximate.</span>{" "}
                Colors and placement may vary slightly on the final product. All items are printed on demand and reviewed before shipping.
              </p>
              <p className="text-[11px] text-[#C41E3A] font-sans font-semibold leading-snug">
                ✨ Want a guaranteed mockup before ordering?{" "}
                <button
                  onClick={handleOrderNow}
                  className="underline underline-offset-2 hover:text-[#a01830] transition-colors"
                >
                  Order the premium version
                </button>{" "}
                — we’ll send a proof before production.
              </p>
            </div>

            {/* Shop link — visible on desktop below image (mirrors mobile placement) */}
            <div className="hidden md:flex items-center justify-between pt-1">
              <Link
                href={`/article/${slug}`}
                className="inline-flex items-center gap-1 text-xs text-[#666] hover:text-[#C41E3A] font-sans transition-colors group"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                <span>Back to article</span>
              </Link>
              <a
                href="/shop"
                className="inline-flex items-center gap-1 text-xs text-[#666] hover:text-[#C41E3A] font-sans transition-colors"
              >
                <span>Browse all merch</span>
                <span>→</span>
              </a>
            </div>
          </div>

          {/* RIGHT: Product selector + details + Buy — sticky on desktop */}
          <div className="font-sans md:sticky md:top-6 space-y-4">

            {/* Product type selector */}
            <div>
              <p className="text-xs text-[#666] uppercase tracking-wider mb-2">Choose product</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeProducts.map(type => {
                  const meta = config.products[type]?.meta;
                  if (!meta) return null;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedProduct(type)}
                      className={`px-3 py-2.5 text-sm font-sans border rounded-sm transition-colors text-left ${
                        selectedProduct === type
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                          : "bg-white text-[#1A1A1A] border-[#D4C9B8] hover:border-[#1A1A1A]"
                      }`}
                    >
                      <span className="mr-1">{meta.icon}</span>{meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected product details */}
            <div className="bg-white border border-[#D4C9B8] rounded-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-serif font-bold text-[#1A1A1A]">{currentProduct?.meta.label}</p>
                  <p className="text-xs text-[#666] mt-0.5">{currentProduct?.meta.desc}</p>
                </div>
                {currentProduct?.sellPrice != null && (
                  <span className="font-serif text-xl font-bold text-[#1A1A1A] whitespace-nowrap">
                    ${currentProduct.sellPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Ready indicator */}
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-sm px-3 py-2">
                <span className="text-green-600">✓</span>
                <span>Printed on demand · Ships in 3–7 days</span>
              </div>

              {/* Variant selector (if cached pricing available) */}
              {currentProduct?.variantData && currentProduct.variantData.length > 1 && (
                <div>
                  <label className="block text-xs text-[#666] uppercase tracking-wider mb-1">
                    Select Option
                  </label>
                  <select
                    value={selectedVariantId ?? ""}
                    onChange={e => setSelectedVariantId(Number(e.target.value))}
                    className="border border-[#D4C9B8] bg-white text-[#1A1A1A] text-sm px-3 py-2 rounded-sm w-full focus:outline-none focus:border-[#1A1A1A]"
                  >
                    {currentProduct.variantData.map((v: { id: number; title: string; price: number }) => (
                      <option key={v.id} value={v.id}>{v.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Email capture inline */}
              {showEmailCapture ? (
                <EmailCaptureForm
                  email={email}
                  setEmail={setEmail}
                  termsChecked={termsChecked}
                  setTermsChecked={setTermsChecked}
                  newsletterChecked={newsletterChecked}
                  setNewsletterChecked={setNewsletterChecked}
                  onSubmit={handleLeadSubmit}
                  onCancel={() => setShowEmailCapture(false)}
                  submitting={leadSubmitting}
                  error={leadError}
                  siteName={branding.siteName}
                  genre={branding.genre}
                />
              ) : (
                <button
                  onClick={handleOrderNow}
                  className="w-full font-semibold py-3 px-6 rounded-sm transition-colors text-sm tracking-wide bg-[#C41E3A] text-white hover:bg-[#a01830] cursor-pointer"
                >
                  {currentProduct?.sellPrice != null
                    ? `Order Now — $${currentProduct.sellPrice.toFixed(2)}`
                    : "Order Now →"}
                </button>
              )}

              <p className="text-[10px] text-[#AAA] text-center">
                Fulfilled by Printify · Ships worldwide · Custom items are non-returnable
              </p>
            </div>
          </div>
        </div>

        {/* Upsell grid */}
        <section className="mt-8 pt-6 border-t border-[#D4C9B8]">
          <h2 className="font-serif text-base font-bold text-[#1A1A1A] mb-3">
            More from this article
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {upsellProducts.map(type => {
              const prod = config.products[type];
              if (!prod) return null;
              return (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedProduct(type);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="border border-[#D4C9B8] bg-white hover:border-[#1A1A1A] transition-colors rounded-sm p-3 text-left group"
                >
                  {/* Mini mockup preview */}
                  <div className="relative w-full aspect-square mb-2 overflow-hidden rounded-sm bg-gray-50">
                    <img
                      src={prod.mockupUrl}
                      alt={prod.meta.label}
                      className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                      loading="lazy"
                    />
                    {article?.featuredImage && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `url(${article.featuredImage})`,
                          backgroundSize: `${prod.printConfig.scale * 100}%`,
                          backgroundPosition: `${prod.printConfig.x * 100}% ${prod.printConfig.y * 100}%`,
                          backgroundRepeat: "no-repeat",
                          mixBlendMode: "multiply",
                          opacity: 0.6,
                        }}
                      />
                    )}
                  </div>
                  <p className="text-xs font-sans text-[#1A1A1A] font-medium">
                    {prod.meta.icon} {prod.meta.label}
                  </p>
                  <p className="text-[10px] text-[#888] mt-0.5">{prod.meta.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Back to article — bottom */}
        <div className="mt-8 pt-6 border-t border-[#D4C9B8] text-center">
          <Link
            href={`/article/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#666] hover:text-[#C41E3A] hover:underline font-sans transition-colors group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Back to article</span>
          </Link>
        </div>
      </main>

      <Footer />

      {/* Mobile sticky Buy button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#D4C9B8] p-3 z-50">
        {showEmailCapture ? (
          <button
            onClick={() => setShowEmailCapture(false)}
            className="w-full py-3 text-sm font-sans text-[#666] border border-[#D4C9B8] rounded-sm"
          >
            ← Back to product
          </button>
        ) : (
          <button
            onClick={handleOrderNow}
            className="w-full font-semibold py-3 px-6 rounded-sm transition-colors text-sm bg-[#C41E3A] text-white hover:bg-[#a01830]"
          >
            {currentProduct?.sellPrice != null
              ? `Order ${currentProduct.meta.label} — $${currentProduct.sellPrice.toFixed(2)}`
              : `Order ${currentProduct?.meta.label ?? "Now"} →`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ImageLightbox ──────────────────────────────────────────────────────────────
/**
 * Full-screen lightbox overlay for zooming into the product design image.
 * Tap/click the backdrop or the ✕ button to close. Keyboard Escape also closes.
 */
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image zoom"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors z-10"
        aria-label="Close zoom"
      >
        ✕
      </button>
      {/* Image — stop propagation so clicking the image itself doesn't close */}
      <img
        src={src}
        alt={alt}
        className="max-w-[95vw] max-h-[95vh] object-contain rounded-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── MockupOverlay ────────────────────────────────────────────────────────────
/**
 * Shows the article design image as the primary product preview.
 * The blank mockup is shown as a small reference thumbnail below.
 * This avoids the broken CSS blend-mode compositing approach.
 */
type PrintConfig = {
  x: number;
  y: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;  // degrees
  skewX?: number;  // degrees
  skewY?: number;  // degrees
};

function buildTransform(cfg: PrintConfig): string {
  const parts: string[] = [];
  if (cfg.rotate) parts.push(`rotate(${cfg.rotate}deg)`);
  if (cfg.skewX)  parts.push(`skewX(${cfg.skewX}deg)`);
  if (cfg.skewY)  parts.push(`skewY(${cfg.skewY}deg)`);
  return parts.length ? parts.join(" ") : "none";
}

function MockupOverlay({
  blankMockupUrl,
  articleImageUrl,
  printConfig,
  productType,
}: {
  blankMockupUrl: string;
  articleImageUrl: string | null;
  printConfig: PrintConfig;
  productType: ProductType;
}) {
  const [showMockup, setShowMockup] = useState(false);
  const [showPrintArea, setShowPrintArea] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Primary display: article design image
  const primaryUrl = articleImageUrl || blankMockupUrl;

  if (!primaryUrl) {
    return (
      <div className="aspect-square bg-[#E8E0D5] rounded-sm flex items-center justify-center">
        <span className="text-[#888] text-sm font-sans">Loading…</span>
      </div>
    );
  }

  // Print area overlay dimensions.
  // printConfig.scale = uniform scale fraction; scaleX/scaleY override independently.
  // printConfig.x / y = center position as fraction (0.5 = centered).
  const uniformScale = printConfig.scale;
  const pctW    = (printConfig.scaleX ?? uniformScale) * 100;
  const pctH    = (printConfig.scaleY ?? uniformScale) * 100;
  const pctLeft = printConfig.x * 100 - pctW / 2;
  const pctTop  = printConfig.y * 100 - pctH / 2;
  const transform = buildTransform(printConfig);

  return (
    <div className="space-y-3">
      {/* Primary: design artwork */}
      <div className="relative aspect-square bg-[#F5F0EB] border border-[#D4C9B8] rounded-sm overflow-hidden">
        <img
          src={showMockup ? blankMockupUrl : primaryUrl}
          alt={showMockup ? `${productType} blank mockup` : `${productType} design`}
          className="w-full h-full object-contain"
          loading="eager"
          style={!showMockup && transform !== "none" ? { transform, transformOrigin: "center center" } : undefined}
        />

        {/* Print area outline — only shown on design view when toggled */}
        {!showMockup && showPrintArea && articleImageUrl && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${pctLeft}%`,
              top: `${pctTop}%`,
              width: `${pctW}%`,
              height: `${pctH}%`,
              border: "2px dashed rgba(196,30,58,0.75)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)",
              borderRadius: "2px",
              transform: transform !== "none" ? transform : undefined,
              transformOrigin: "center center",
            }}
          >
            {/* Corner label */}
            <span
              className="absolute -top-5 left-0 text-[9px] font-sans font-semibold uppercase tracking-wider whitespace-nowrap"
              style={{ color: "rgba(196,30,58,0.9)", textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}
            >
              Print area
            </span>
          </div>
        )}

        {/* Product type label */}
        <div className="absolute bottom-2 left-2 bg-white/90 rounded-sm px-2 py-1 shadow-sm">
          <span className="text-[10px] text-[#666] font-sans uppercase tracking-wider">{productType}</span>
        </div>

        {/* Print area toggle button — only on design view */}
        {!showMockup && articleImageUrl && (
          <button
            onClick={() => setShowPrintArea(v => !v)}
            className={`absolute top-2 left-2 text-[9px] font-sans font-semibold uppercase tracking-wider px-2 py-1 rounded-sm shadow-sm transition-colors ${
              showPrintArea
                ? "bg-[#C41E3A] text-white"
                : "bg-white/90 text-[#666] hover:bg-[#C41E3A] hover:text-white"
            }`}
            title="Toggle print area guide"
          >
            Print area
          </button>
        )}

        {/* Zoom button — bottom right */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-white rounded-sm shadow-sm transition-colors"
          title="Zoom in"
          aria-label="Zoom image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#444]">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>

        {/* Toggle label (Design / Preview) */}
        {articleImageUrl && blankMockupUrl && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] text-[#666] font-sans bg-white/90 rounded-sm px-2 py-1 shadow-sm">
              {showMockup ? "Design" : "Preview"}
            </span>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          src={showMockup ? blankMockupUrl : primaryUrl}
          alt={showMockup ? `${productType} blank mockup` : `${productType} design`}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Thumbnail toggle row: design + blank mockup */}
      {articleImageUrl && blankMockupUrl && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowMockup(false)}
            className={`flex-1 aspect-square rounded-sm overflow-hidden border-2 transition-colors ${
              !showMockup ? "border-[#1A1A1A]" : "border-[#D4C9B8] hover:border-[#999]"
            }`}
            aria-label="Show design"
          >
            <img src={articleImageUrl} alt="Design" className="w-full h-full object-cover" />
          </button>
          <button
            onClick={() => setShowMockup(true)}
            className={`flex-1 aspect-square rounded-sm overflow-hidden border-2 transition-colors ${
              showMockup ? "border-[#1A1A1A]" : "border-[#D4C9B8] hover:border-[#999]"
            }`}
            aria-label="Show product mockup"
          >
            <img src={blankMockupUrl} alt="Product mockup" className="w-full h-full object-contain bg-white" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── EmailCaptureForm ─────────────────────────────────────────────────────────
function EmailCaptureForm({
  email, setEmail,
  termsChecked, setTermsChecked,
  newsletterChecked, setNewsletterChecked,
  onSubmit, onCancel,
  submitting, error,
  siteName, genre,
}: {
  email: string; setEmail: (v: string) => void;
  termsChecked: boolean; setTermsChecked: (v: boolean) => void;
  newsletterChecked: boolean; setNewsletterChecked: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
  siteName: string;
  genre?: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 font-sans">
      <p className="text-sm font-semibold text-[#1A1A1A]">Enter your email to proceed to checkout</p>

      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-full border border-[#D4C9B8] rounded-sm px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#AAA] focus:outline-none focus:border-[#1A1A1A]"
      />

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          required
          checked={termsChecked}
          onChange={e => setTermsChecked(e.target.checked)}
          className="mt-0.5 accent-[#C41E3A]"
        />
        <span className="text-[11px] text-[#555] leading-snug">
          I agree to {siteName}'s purchase terms and acknowledge physical products are fulfilled by our production partner.
        </span>
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={newsletterChecked}
          onChange={e => setNewsletterChecked(e.target.checked)}
          className="mt-0.5 accent-[#C41E3A]"
        />
        <span className="text-[11px] text-[#555] leading-snug">
          Add me to the {siteName} newsletter for {genre ? `${genre} ` : ""}news and exclusive offers.
        </span>
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !termsChecked}
          className="flex-1 bg-[#C41E3A] text-white text-sm font-semibold py-2.5 px-4 rounded-sm hover:bg-[#a01830] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Processing…" : "Proceed to Checkout →"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm text-[#666] border border-[#D4C9B8] rounded-sm hover:border-[#1A1A1A] transition-colors"
        >
          Back
        </button>
      </div>
    </form>
  );
}
