import { useEffect } from "react";

/**
 * Fire a first-party page view beacon to /api/pv.
 * Reads UTM params from the URL search string automatically.
 * Call this once per page component mount.
 *
 * BUG FIX (Mar 3, 2026): The HTTP `Referer` header on a beacon/fetch request
 * is set by the browser to the *current page URL*, not the previous page.
 * We must send `document.referrer` (the actual previous page) in the request
 * body so the server can correctly classify the traffic source.
 *
 * ADMIN EXCLUSION (Mar 5, 2026): Admin/owner users are excluded from all
 * analytics tracking so QA and development activity doesn't pollute metrics.
 * We read the cached user info from localStorage (set by useAuth) to avoid
 * an extra network call on every page view.
 */

function isAdminUser(): boolean {
  try {
    const raw = localStorage.getItem("admin-user-info");
    if (!raw) return false;
    const user = JSON.parse(raw);
    return user?.role === "admin";
  } catch {
    return false;
  }
}

export function usePageView(options: { slug?: string; path?: string } = {}) {
  useEffect(() => {
    try {
      // Skip tracking entirely for admin/owner users
      if (isAdminUser()) return;

      const params = new URLSearchParams(window.location.search);
      const body: Record<string, string> = {
        path: options.path || window.location.pathname,
      };
      if (options.slug) body.slug = options.slug;

      // Send the real referrer (where the user came FROM) in the body.
      // document.referrer is empty for direct visits, which is correct.
      if (document.referrer) body.referrer = document.referrer;

      const utmSource = params.get("utm_source");
      const utmMedium = params.get("utm_medium");
      if (utmSource) body.utm_source = utmSource;
      if (utmMedium) body.utm_medium = utmMedium;

      // Use sendBeacon when available for reliability on page unload;
      // fall back to fetch for older browsers.
      const payload = JSON.stringify(body);
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/pv", blob);
      } else {
        fetch("/api/pv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {/* non-blocking */});
      }
    } catch {
      // Never throw — analytics must never break the page
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.slug, options.path]);
}
