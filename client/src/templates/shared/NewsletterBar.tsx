import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { LicenseSettings } from "./types";

interface NewsletterBarProps {
  licenseSettings: LicenseSettings;
}

export function NewsletterBar({ licenseSettings }: NewsletterBarProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [consent, setConsent] = useState(false);
  const mutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { setStatus("success"); setEmail(""); },
    onError: () => setStatus("error"),
  });
  const siteName = licenseSettings.brand_site_name || "our publication";

  return (
    <section style={{
      background: "var(--brand-surface)",
      borderTop: "2px solid var(--brand-primary)",
      padding: "48px 24px",
    }}>
      <div className="newsletter-bar-inner" style={{
        maxWidth: 1280,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 40,
        alignItems: "center",
      }}>
        <div>
          <h2 style={{
            fontFamily: "var(--brand-font-heading, Georgia, serif)",
            fontSize: 28,
            color: "var(--brand-text-primary)",
            marginBottom: 8,
          }}>
            Stay in the loop
          </h2>
          <p style={{ color: "var(--brand-text-secondary)", fontSize: 15, lineHeight: 1.6 }}>
            Get the latest from {siteName} delivered to your inbox.
          </p>
        </div>
        <div>
          {status === "success" ? (
            <p style={{ color: "var(--brand-primary)", fontWeight: 600, fontSize: 15 }}>
              You're subscribed! Welcome to {siteName}.
            </p>
          ) : (
            <form onSubmit={e => {
              e.preventDefault();
              if (email.trim() && consent) mutation.mutate({ email: email.trim() });
            }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 6,
                    border: "1px solid var(--brand-border)",
                    fontSize: 14,
                    background: "var(--brand-background)",
                    color: "var(--brand-text-primary)",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={mutation.isPending || !consent}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 6,
                    border: "none",
                    background: "var(--brand-button-bg)",
                    color: "var(--brand-button-text)",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: consent ? "pointer" : "not-allowed",
                    opacity: consent ? 1 : 0.6,
                  }}
                >
                  {mutation.isPending ? "..." : "Subscribe"}
                </button>
              </div>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--brand-text-secondary)",
                cursor: "pointer",
                margin: "8px 0 0 0",
              }}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  style={{
                    width: 14,
                    height: 14,
                    minWidth: 14,
                    cursor: "pointer",
                    accentColor: "var(--brand-primary)",
                    margin: 0,
                  }}
                />
                <span>
                  I agree to receive the newsletter.{" "}
                  <a href="/privacy" style={{ color: "var(--brand-link)", textDecoration: "underline" }}>
                    Privacy Policy
                  </a>.
                </span>
              </label>
              {status === "error" && (
                <p style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>Something went wrong. Please try again.</p>
              )}
            </form>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .newsletter-bar-inner { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
