/**
 * useFaviconEasterEgg
 *
 * After TRIGGER_MS of continuous time on the page (no tab-switch penalty),
 * swaps the favicon for SWAP_MS, then reverts.
 * Fires only once per page mount.
 */

import { useEffect, useRef } from "react";

const TRIGGER_MS = 45_000; // 45 seconds
const SWAP_MS = 3_000;     // 3 seconds
const MASCOT_FAVICON = "";

function getFaviconEl(): HTMLLinkElement | null {
  return document.querySelector("link[rel~='icon']");
}

export function useFaviconEasterEgg(enabled = true) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (firedRef.current) return;

    let triggerTimer: ReturnType<typeof setTimeout> | null = null;
    let revertTimer: ReturnType<typeof setTimeout> | null = null;

    const originalHref = getFaviconEl()?.href ?? "/favicon.ico";

    const swapFavicon = () => {
      if (firedRef.current) return;
      firedRef.current = true;

      const el = getFaviconEl();
      if (el) el.href = MASCOT_FAVICON;

      revertTimer = setTimeout(() => {
        const el2 = getFaviconEl();
        if (el2) el2.href = originalHref;
      }, SWAP_MS);
    };

    triggerTimer = setTimeout(swapFavicon, TRIGGER_MS);

    return () => {
      if (triggerTimer) clearTimeout(triggerTimer);
      if (revertTimer) clearTimeout(revertTimer);
      // Revert favicon on unmount in case the swap was mid-flight
      const el = getFaviconEl();
      if (el) el.href = originalHref;
    };
  }, []);
}
