import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBranding, BrandingConfig } from "@/hooks/useBranding";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Search, Menu, X, Command, ShoppingBag, } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";

// ─── Masthead helpers ───────────────────────────────────────────────────────

/** Resolve the effective masthead background color */
export function mastheadBgStyle(b: BrandingConfig): string {
  return b.mastheadBgColor || b.colorPrimary || "#0f2d5e";
}

/** Resolve the effective date bar background color */
export function dateBgStyle(b: BrandingConfig): string {
  return b.mastheadDateBgColor || mastheadBgStyle(b);
}

/** Map masthead_padding to Tailwind padding classes */
export function paddingClass(padding: string): string {
  switch (padding) {
    case "compact":   return "py-2 sm:py-3";
    case "spacious":  return "py-8 sm:py-10";
    default:          return "py-5 sm:py-6"; // medium
  }
}

/** Map masthead_font_size to Tailwind text-size classes */
export function fontSizeClass(size: string, scrolled: boolean): string {
  if (scrolled) return "text-2xl sm:text-3xl";
  switch (size) {
    case "small":       return "text-2xl sm:text-3xl";
    case "medium":      return "text-3xl sm:text-4xl";
    case "extra-large": return "text-5xl sm:text-6xl lg:text-7xl";
    default:            return "text-4xl sm:text-5xl lg:text-6xl"; // large
  }
}

/** Map masthead_font_family to CSS font-family value */
export function fontFamilyStyle(family: string): string {
  switch (family) {
    case "serif":      return "Georgia, 'Times New Roman', serif";
    case "sans-serif": return "system-ui, -apple-system, sans-serif";
    default:
      // Treat as a Google Font name — the font must be loaded externally
      return `'${family}', serif`;
  }
}

// ─── Masthead component ─────────────────────────────────────────────────────

interface MastheadProps {
  branding: BrandingConfig;
  scrolled: boolean;
  /** If true, renders as a static preview (no scroll effects, no Link wrapper) */
  preview?: boolean;
}

export function Masthead({ branding, scrolled, preview = false }: MastheadProps) {
  const bg = mastheadBgStyle(branding);
  const textColor = branding.mastheadTextColor || "#ffffff";
  const dateBg = dateBgStyle(branding);
  const layout = branding.mastheadLayout || "center";
  const isCenter = layout === "center";
  const isLogoOnly = layout === "logo-only";
  const hasLogo = !!branding.logoUrl && branding.logoUrl !== "/logo.svg";
  const logoHeight = branding.mastheadLogoHeight || 60;
  const showTagline = branding.mastheadShowTagline;
  const showDate = branding.mastheadShowDate;
  const borderBottom = branding.mastheadBorderBottom;
  const borderColor = branding.mastheadBorderColor || "rgba(255,255,255,0.2)";
  const effectivePadding = scrolled ? "py-2 sm:py-3" : paddingClass(branding.mastheadPadding);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const siteNameEl = (
    <span
      className={`font-black tracking-[-0.02em] transition-all duration-500 ${fontSizeClass(branding.mastheadFontSize, scrolled)}`}
      style={{ fontFamily: fontFamilyStyle(branding.mastheadFontFamily), color: textColor }}
    >
      {branding.siteName || "Your Site Name"}
    </span>
  );

  const logoEl = hasLogo ? (
    <img
      src={branding.logoUrl}
      alt={branding.siteName}
      style={{ height: `${logoHeight}px`, width: "auto", objectFit: "contain" }}
    />
  ) : null;

  // Logo-only layout: just the image, no text
  const mastheadContent = isLogoOnly && hasLogo ? (
    <div className={`flex ${isCenter ? "justify-center" : "justify-start"} items-center`}>
      {logoEl}
    </div>
  ) : (
    // Text + optional logo layout
    <div className={`flex flex-col ${isCenter ? "items-center" : "items-start"} gap-1`}>
      {hasLogo ? (
        <div className={`flex ${isCenter ? "justify-center" : "justify-start"} items-center gap-3`}>
          {logoEl}
          {siteNameEl}
        </div>
      ) : (
        siteNameEl
      )}
      {showTagline && !scrolled && branding.tagline && (
        <p
          className="text-xs tracking-[0.3em] uppercase font-medium opacity-80 transition-all duration-500"
          style={{ color: textColor }}
        >
          {branding.tagline}
        </p>
      )}
    </div>
  );

  return (
    <>
      {/* Date bar */}
      {showDate && (
        <div style={{ backgroundColor: dateBg }}>
          <div className={`container flex items-center ${isCenter ? "justify-center" : "justify-between"} py-2`}>
            <span className="text-[12px] font-medium tracking-wide uppercase" style={{ color: textColor, opacity: 0.85 }}>
              {dateStr}
            </span>
          </div>
        </div>
      )}

      {/* Masthead body */}
      <div
        className={`container ${effectivePadding} transition-all duration-500 ${isCenter ? "text-center" : "text-left"}`}
        style={{
          backgroundColor: bg,
          ...(borderBottom ? { borderBottom: `1px solid ${borderColor}` } : {}),
        }}
      >
        {preview ? (
          mastheadContent
        ) : (
          <Link href="/">{mastheadContent}</Link>
        )}
      </div>
    </>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const { branding } = useBranding();
  const showShop = !!(branding as any).printifyEnabled || !!(branding as any).shopExternalUrl;
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const { data: cats } = trpc.categories.list.useQuery();

  const navCategories = cats ?? [];

  // Detect scroll for masthead shrink
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // CMD+K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Utility bar: only show when date bar is hidden (avoid double date display)
  const showUtilityBar = !branding.mastheadShowDate;

  return (
    <header>
      {/* Utility bar — shown when date bar is disabled */}
      {showUtilityBar && (
        <div className="bg-[oklch(0.13_0.005_260)] text-white">
          <div className="container flex items-center justify-between py-2">
            <span className="text-[12px] font-medium tracking-wide uppercase">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
            <div className="flex items-center gap-5 text-[12px] font-medium tracking-wide">
            </div>
          </div>
        </div>
      )}

      {/* When date bar IS shown, put auth links inside the date bar */}
      {branding.mastheadShowDate && (
        <div style={{ backgroundColor: dateBgStyle(branding) }}>
          <div className="container flex items-center justify-between py-2">
            <span className="text-[12px] font-medium tracking-wide uppercase" style={{ color: branding.mastheadTextColor || "#ffffff", opacity: 0.85 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
            <div className="flex items-center gap-5 text-[12px] font-medium tracking-wide" style={{ color: branding.mastheadTextColor || "#ffffff" }}>
            </div>
          </div>
        </div>
      )}

      {/* Masthead */}
      <div
        className="w-full"
        style={{
          backgroundColor: mastheadBgStyle(branding),
          ...(branding.mastheadBorderBottom ? { borderBottom: `1px solid ${branding.mastheadBorderColor || "rgba(255,255,255,0.2)"}` } : {}),
        }}
      >
      <div
        className={`container ${scrolled ? "py-2 sm:py-3" : paddingClass(branding.mastheadPadding)} transition-all duration-500 ${branding.mastheadLayout === "center" ? "text-center" : "text-left"}`}
      >
        <Link href="/">
          {branding.mastheadLayout === "logo-only" && branding.logoUrl && branding.logoUrl !== "/logo.svg" ? (
            <div className="flex justify-center items-center">
              <img
                src={branding.logoUrl}
                alt={branding.siteName}
                style={{ height: `${branding.mastheadLogoHeight || 60}px`, width: "auto", objectFit: "contain" }}
              />
            </div>
          ) : (
            <div className={`flex flex-col ${branding.mastheadLayout === "center" ? "items-center" : "items-start"} gap-1`}>
              {branding.logoUrl && branding.logoUrl !== "/logo.svg" ? (
                <div className={`flex ${branding.mastheadLayout === "center" ? "justify-center" : "justify-start"} items-center gap-3`}>
                  <img
                    src={branding.logoUrl}
                    alt={branding.siteName}
                    style={{ height: `${branding.mastheadLogoHeight || 60}px`, width: "auto", objectFit: "contain" }}
                  />
                  <span
                    className={`font-black tracking-[-0.02em] transition-all duration-500 ${fontSizeClass(branding.mastheadFontSize, scrolled)}`}
                    style={{ fontFamily: fontFamilyStyle(branding.mastheadFontFamily), color: branding.mastheadTextColor || "#ffffff" }}
                  >
                    {branding.siteName}
                  </span>
                </div>
              ) : (
                <span
                  className={`font-black tracking-[-0.02em] transition-all duration-500 ${fontSizeClass(branding.mastheadFontSize, scrolled)}`}
                  style={{ fontFamily: fontFamilyStyle(branding.mastheadFontFamily), color: branding.mastheadTextColor || "#ffffff" }}
                >
                  {branding.siteName}
                </span>
              )}
              {branding.mastheadShowTagline && !scrolled && branding.tagline && (
                <p
                  className="text-xs tracking-[0.3em] uppercase font-medium opacity-80 transition-all duration-500"
                  style={{ color: branding.mastheadTextColor || "#ffffff" }}
                >
                  {branding.tagline}
                </p>
              )}
            </div>
          )}
        </Link>
      </div>
      </div>

      {/* Category nav */}
      <nav className={`bg-foreground text-white border-t border-b border-foreground sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? "shadow-md" : ""}`}>
        <div className="container hidden lg:flex items-center">
          <Link
            href="/latest"
            className={`relative flex-1 text-center py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap transition-all duration-300 ${
              location === "/latest"
                ? "text-primary"
                : "text-background/60 hover:text-background"
            }`}
          >
            Latest
            {location === "/latest" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-primary rounded-full" />
            )}
          </Link>
          {navCategories.map(cat => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className={`relative flex-1 text-center py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap transition-all duration-300 ${
                location === `/category/${cat.slug}`
                  ? "text-primary"
                  : "text-background/60 hover:text-background"
              }`}
            >
              {cat.name}
              {location === `/category/${cat.slug}` && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          ))}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-all duration-300 group"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-background/70 group-hover:text-background transition-colors" />
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-background/40 border border-background/20 rounded px-1.5 py-0.5">
                <Command className="w-2.5 h-2.5" />K
              </span>
            </button>
          </div>
        </div>
        {/* Mobile hamburger */}
        <div className="flex lg:hidden items-center justify-end px-4 py-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-2 p-2.5 hover:bg-white/10 rounded-lg transition-all duration-300 group"
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-background/70 group-hover:text-background transition-colors" />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2.5 hover:bg-white/10 rounded-lg transition-all duration-300"
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 animate-in slide-in-from-top-2 duration-300">
            <div className="container py-3">
              <Link
                href="/latest"
                className="block py-2.5 text-[14px] font-semibold uppercase tracking-[0.08em] text-background/70 hover:text-background hover:pl-2 transition-all duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Latest
              </Link>
              {navCategories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="block py-2.5 text-[14px] font-semibold uppercase tracking-[0.08em] text-background/70 hover:text-background hover:pl-2 transition-all duration-300"
                  onClick={() => setMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search bar */}
        {searchOpen && (
          <div className="border-t border-white/10 animate-in slide-in-from-top-2 duration-300">
            <div className="container py-4">
              <form
                onSubmit={e => { e.preventDefault(); if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`; }}
                className="flex gap-3"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                    autoFocus
                  />
                </div>
                <Button type="submit" size="sm" className="rounded-lg px-5">Search</Button>
              </form>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
