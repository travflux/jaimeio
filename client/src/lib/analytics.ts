/**
 * analytics.ts — v4.9.0
 *
 * Lightweight client-side page view tracker.
 * Fires on every route change via sendBeacon → /api/track.
 *
 * Bots do not execute JavaScript, so only real human browser visits
 * are recorded. This is the primary source of truth for site traffic.
 *
 * White-label compatible: no deployment-specific logic. All configuration
 * comes from the deployment environment.
 */

/** Session ID persists for the browser tab lifetime (sessionStorage). */
function getOrCreateSessionId(): string {
  const key = '_hb_sid';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

/**
 * Track a page view. Call on every route change.
 * No-ops in dev/preview environments so local testing doesn't pollute the DB.
 */
export function trackPageView(): void {
  try {
    const hostname = window.location.hostname;

    // Skip tracking in dev/preview environments
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.includes('.run.app')
    ) {
      return;
    }

    const payload = {
      path: window.location.pathname,
      referrer: document.referrer || '',
      screenWidth: window.innerWidth,
      sessionId: getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
    };

    // sendBeacon is fire-and-forget and doesn't block navigation
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', JSON.stringify(payload));
    } else {
      // Fallback for browsers without sendBeacon (very rare)
      fetch('/api/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {/* ignore errors */});
    }
  } catch {
    // Never throw — analytics must never break the page
  }
}
