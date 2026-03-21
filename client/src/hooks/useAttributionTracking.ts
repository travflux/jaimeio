/**
 * Attribution Tracking — Client-side UTM capture & session tracking
 *
 * - Generates session_id (sessionStorage) and visitor_id (1-year cookie)
 * - Captures UTM params on first page view → POST /api/track/session
 * - Sends page view on every SPA route change → POST /api/track/pageview
 * - Sends heartbeat every 30s while page is visible → POST /api/track/heartbeat
 * - Tracks scroll depth
 *
 * Uses cookies + sessionStorage only (no localStorage — edge layer issues).
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

// ─── ID helpers ──────────────────────────────────────────────────────────────

function nanoid(len = 21): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) id += chars[arr[i] % chars.length];
  return id;
}

function getCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="))
    ?.split("=")[1];
}

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function getOrCreateVisitorId(): string {
  let vid = getCookie("_hvid");
  if (!vid) {
    vid = nanoid();
    setCookie("_hvid", vid, 365);
  }
  return vid;
}

function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem("_hsid");
  if (!sid) {
    sid = nanoid();
    sessionStorage.setItem("_hsid", sid);
  }
  return sid;
}

// ─── UTM parsing ─────────────────────────────────────────────────────────────

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(key => {
    const val = params.get(key);
    if (val) utm[key] = val;
  });
  return utm;
}

// ─── Tracking helpers ─────────────────────────────────────────────────────────

function trackSession(sessionId: string, visitorId: string): void {
  const utm = getUtmParams();
  const payload = {
    sessionId,
    visitorId,
    landingPage: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
    ...utm,
  };
  fetch("/api/track/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

function trackPageview(sessionId: string, visitorId: string, path: string): void {
  // Extract article slug from path like /article/some-slug
  const slugMatch = path.match(/^\/article\/(.+)$/);
  const articleSlug = slugMatch ? slugMatch[1] : undefined;

  fetch("/api/track/pageview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, visitorId, url: path, articleSlug }),
    keepalive: true,
  }).catch(() => {});
}

function trackHeartbeat(sessionId: string, seconds: number, scrollDepth: number): void {
  fetch("/api/track/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, seconds, scrollDepth }),
    keepalive: true,
  }).catch(() => {});
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

let sessionInitialized = false;

export function useAttributionTracking(): void {
  const [location] = useLocation();
  const sessionIdRef = useRef<string>("");
  const visitorIdRef = useRef<string>("");
  const heartbeatSecondsRef = useRef<number>(0);
  const maxScrollRef = useRef<number>(0);
  const lastLocationRef = useRef<string>("");

  // Initialize session once on mount
  useEffect(() => {
    const sid = getOrCreateSessionId();
    const vid = getOrCreateVisitorId();
    sessionIdRef.current = sid;
    visitorIdRef.current = vid;

    if (!sessionInitialized) {
      sessionInitialized = true;
      trackSession(sid, vid);
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (!sessionIdRef.current) return;
    if (location === lastLocationRef.current) return;
    lastLocationRef.current = location;
    trackPageview(sessionIdRef.current, visitorIdRef.current, location);
  }, [location]);

  // Scroll depth tracking
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      const depth = Math.round((scrolled / total) * 100);
      if (depth > maxScrollRef.current) maxScrollRef.current = depth;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Heartbeat every 30s while page is visible
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startHeartbeat = () => {
      interval = setInterval(() => {
        if (!sessionIdRef.current) return;
        heartbeatSecondsRef.current += 30;
        trackHeartbeat(sessionIdRef.current, 30, maxScrollRef.current);
      }, 30_000);
    };

    const stopHeartbeat = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") startHeartbeat();
      else stopHeartbeat();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (document.visibilityState === "visible") startHeartbeat();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopHeartbeat();
    };
  }, []);
}

// ─── Conversion event helper (callable from anywhere) ────────────────────────

export function trackConversionEvent(opts: {
  eventType: string;
  articleId?: number;
  articleSlug?: string;
  eventValueCents?: number;
  eventMetadata?: Record<string, unknown>;
}): void {
  const sessionId = sessionStorage.getItem("_hsid");
  const visitorId = getCookie("_hvid");
  if (!sessionId) return;

  fetch("/api/track/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, visitorId, ...opts }),
    keepalive: true,
  }).catch(() => {});
}
