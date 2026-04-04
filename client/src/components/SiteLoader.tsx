/**
 * SiteLoader — v4.7.2 white-label configurable loading screen.
 *
 * Replaces legacy loader. Reads loading_style, loading_logo_url, and loading_text
 * from branding settings so each deployment can have its own loading experience.
 *
 * Modes:
 *   spinner (default) — CSS-only spinning circle. No images. No brand-specific content.
 *   logo              — Custom image from loading_logo_url, centered with fade-in.
 *                       Falls back to spinner if loading_logo_url is empty.
 *   none              — Renders nothing. Instant load, no animation.
 */
import { useBranding } from "@/hooks/useBranding";

interface SiteLoaderProps {
  message?: string;
  size?: "small" | "medium" | "large";
}

const SIZE_CLASSES = {
  small: { spinner: "w-8 h-8 border-2", img: "w-12 h-12" },
  medium: { spinner: "w-12 h-12 border-4", img: "w-20 h-20" },
  large: { spinner: "w-16 h-16 border-4", img: "w-28 h-28" },
};

function CssSpinner({ size, className = "" }: { size: "small" | "medium" | "large"; className?: string }) {
  return (
    <div
      className={`${SIZE_CLASSES[size].spinner} ${className} rounded-full border-slate-200 border-t-slate-700 animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function SiteLoader({ message, size = "medium" }: SiteLoaderProps) {
  const { branding } = useBranding();
  const style = branding.loadingStyle ?? "spinner";
  const logoUrl = branding.loadingLogoUrl;
  const text = message ?? branding.loadingText ?? "";

  // none mode — render nothing
  if (style === "none") return null;

  // logo mode — custom image (falls back to spinner if URL empty)
  if (style === "logo" && logoUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <img
          src={logoUrl}
          alt="Loading..."
          className={`${SIZE_CLASSES[size].img} object-contain animate-pulse`}
          onError={(e) => {
            // If image fails, swap to spinner
            const parent = (e.currentTarget as HTMLImageElement).parentElement;
            if (parent) {
              const spinner = document.createElement("div");
              spinner.className = `${SIZE_CLASSES[size].spinner} rounded-full border-slate-200 border-t-slate-700 animate-spin`;
              parent.replaceChild(spinner, e.currentTarget);
            }
          }}
        />
        {text && <p className="text-sm text-slate-600 font-medium animate-pulse">{text}</p>}
      </div>
    );
  }

  // spinner mode (default) — CSS-only, no images
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <CssSpinner size={size} />
      {text && <p className="text-sm text-slate-600 font-medium animate-pulse">{text}</p>}
    </div>
  );
}

// Inline variant for smaller contexts (e.g., inside buttons, table rows)
export function SiteInlineLoader({ className = "" }: { className?: string }) {
  const { branding } = useBranding();
  const style = branding.loadingStyle ?? "spinner";

  if (style === "none") return null;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
      <span className="text-sm text-slate-600">Loading...</span>
    </div>
  );
}


