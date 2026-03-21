/**
 * MascotEasterEgg
 *
 * Two hidden triggers:
 * 1. Konami Code (↑↑↓↓←→←→BA) — mascot slides in from the right with a one-liner
 * 2. 2-minute idle (no mouse, scroll, or keypress) — mascot peeks from bottom-right corner
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useBranding } from "@/hooks/useBranding";

const KONAMI = [
  "ArrowUp", "ArrowUp",
  "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight",
  "ArrowLeft", "ArrowRight",
  "b", "a",
];

const KONAMI_LINES = [
  "You found me. I've been here the whole time.",
  "Impressive. Most impressive.",
  "This is not the news you're looking for.",
  "Achievement unlocked: Unemployed Journalist.",
  "The mascot has been notified. He is unmoved.",
  "Breaking: Local reader discovers secret. Experts baffled.",
];

const IDLE_LINES = [
  "Still reading? Respect.",
  "You've been here two minutes. We're not complaining.",
  "The mascot has concerns about your productivity.",
  "This is fine. Everything is fine.",
];

const IDLE_MS = 2 * 60 * 1000; // 2 minutes
const FALLBACK_MASCOT = "/mascot.png";

type Mode = "konami" | "idle" | null;

export default function MascotEasterEgg() {
  const { branding } = useBranding();
  const mascotSrc = branding.mascotUrl || FALLBACK_MASCOT;

  const [mode, setMode] = useState<Mode>(null);
  const [line, setLine] = useState("");
  const [visible, setVisible] = useState(false);

  const konamiBuffer = useRef<string[]>([]);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── helpers ──────────────────────────────────────────────────────
  const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const show = useCallback((m: Mode, lines: string[]) => {
    if (visible) return; // don't stack
    setLine(pickRandom(lines));
    setMode(m);
    setVisible(true);
    // auto-dismiss after 5s
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setVisible(false), 5000);
  }, [visible]);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }, []);

  // ── Konami Code listener ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      konamiBuffer.current.push(e.key);
      if (konamiBuffer.current.length > KONAMI.length) {
        konamiBuffer.current.shift();
      }
      if (
        konamiBuffer.current.length === KONAMI.length &&
        konamiBuffer.current.every((k, i) => k === KONAMI[i])
      ) {
        konamiBuffer.current = [];
        show("konami", KONAMI_LINES);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  // ── Idle listener ────────────────────────────────────────────────
  useEffect(() => {
    const resetIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => show("idle", IDLE_LINES), IDLE_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle(); // start timer on mount

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [show]);

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  if (!visible || !mode) return null;

  // ── Konami: full slide-in panel from right ───────────────────────
  if (mode === "konami") {
    return (
      <div
        onClick={dismiss}
        style={{
          position: "fixed",
          bottom: "32px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          alignItems: "flex-end",
          gap: "12px",
          cursor: "pointer",
          animation: "mascot-slide-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`
          @keyframes mascot-slide-in {
            from { transform: translateX(120%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          @keyframes mascot-fade-out {
            from { opacity: 1; }
            to   { opacity: 0; transform: translateX(60px); }
          }
        `}</style>
        {/* Speech bubble */}
        <div style={{
          background: "#1A1A1A",
          color: "#F5F0EB",
          fontFamily: "Georgia, serif",
          fontSize: "14px",
          lineHeight: "1.5",
          padding: "12px 16px",
          borderRadius: "12px 12px 4px 12px",
          maxWidth: "220px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          position: "relative",
        }}>
          {line}
          {/* tail */}
          <span style={{
            position: "absolute",
            bottom: "-8px",
            right: "16px",
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "0px solid transparent",
            borderTop: "8px solid #1A1A1A",
          }} />
        </div>
        {/* Mascot */}
        <img
          src={mascotSrc}
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_MASCOT; }}
          alt="Site mascot"
          style={{
            width: "72px",
            height: "72px",
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
      </div>
    );
  }

  // ── Idle: mascot peeks from bottom edge ──────────────────────────
  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        bottom: 0,
        right: "80px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        animation: "mascot-peek-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
    >
      <style>{`
        @keyframes mascot-peek-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(20%); }
        }
      `}</style>
      {/* Speech bubble above mascot */}
      <div style={{
        background: "#1A1A1A",
        color: "#F5F0EB",
        fontFamily: "Georgia, serif",
        fontSize: "13px",
        lineHeight: "1.5",
        padding: "10px 14px",
        borderRadius: "12px 12px 12px 4px",
        maxWidth: "200px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        marginBottom: "8px",
        textAlign: "center",
      }}>
        {line}
      </div>
      <img
        src={mascotSrc}
        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_MASCOT; }}
        alt="Site mascot"
        style={{
          width: "80px",
          height: "80px",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
