/**
 * useGtag — v4.7.3
 *
 * Dynamically injects the Google Analytics (gtag.js) script when
 * `brand_gtag_id` is configured in the database.
 *
 * - Fires once per app mount (idempotent — checks for existing script).
 * - No-ops if brand_gtag_id is empty, so fresh white-label deployments
 *   don't send any GA traffic until the operator sets their own ID.
 * - Supports any GA4 measurement ID (G-XXXXXXXX) or Ads conversion ID (AW-XXXXXXXXX).
 */
import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";

export function useGtag() {
  const { branding } = useBranding();
  const gtagId = branding.gtagId?.trim();

  useEffect(() => {
    if (!gtagId) return;

    // Idempotency guard — don't inject twice
    const existingScript = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js"]`
    );
    if (existingScript) return;

    // Inject the loader script
    const loaderScript = document.createElement("script");
    loaderScript.async = true;
    loaderScript.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
    document.head.appendChild(loaderScript);

    // Inject the config inline script
    const configScript = document.createElement("script");
    configScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gtagId}');
    `;
    document.head.appendChild(configScript);
  }, [gtagId]);
}
