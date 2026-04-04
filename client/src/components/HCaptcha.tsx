/**
 * hCaptcha wrapper component.
 * Uses the test site key by default for development.
 */
import { useRef, useEffect } from "react";

interface HCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function HCaptcha({ onVerify, onExpire }: HCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = (import.meta as any).env?.VITE_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001";

    function renderWidget() {
      if (!containerRef.current || !window.hcaptcha) return;
      if (widgetIdRef.current !== null) return;
      try {
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerify(token),
          "expired-callback": () => onExpire?.(),
        });
      } catch { /* widget already rendered */ }
    }

    // Load hCaptcha script if not loaded
    if (!document.querySelector("script[src*=\"hcaptcha\"]")) {
      const script = document.createElement("script");
      script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
      script.async = true;
      script.onload = () => setTimeout(renderWidget, 100);
      document.head.appendChild(script);
    } else if (window.hcaptcha) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (window.hcaptcha) { clearInterval(interval); renderWidget(); }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      if (widgetIdRef.current !== null && window.hcaptcha) {
        try { window.hcaptcha.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
