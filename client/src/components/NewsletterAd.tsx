/**
 * NewsletterAd — Non-popup newsletter subscription CTA containers.
 *
 * Three variants:
 *  - "sidebar"       → tall card for the article/category right column
 *  - "inline"        → full-width block inserted between article sections
 *  - "above-footer"  → full-bleed dark band placed directly above the footer
 *
 * All branding (site name, mascot) is pulled from useBranding so white-label
 * deployments automatically use their own identity. Subscription is wired to
 * trpc.newsletter.subscribe — same endpoint used by the homepage form.
 *
 * TCPA compliance: each form includes an explicit opt-in checkbox per §5.2.
 */
import { useState } from "react";
import { useBranding } from "@/hooks/useBranding";
import { trpc } from "@/lib/trpc";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

interface NewsletterAdProps {
  variant?: "sidebar" | "inline" | "above-footer";
  className?: string;
}

/** Decorative newspaper column rule */
function ColumnRule() {
  return <div className="hidden sm:block w-px bg-white/10 self-stretch mx-2" />;
}

function formatSubscriberCount(count: number | null | undefined): string | null {
  if (count == null || count < 10) return null; // Don't show tiny counts
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}K`;
  return count.toString();
}

/** TCPA opt-in checkbox — shown below the email input on all forms */
function TcpaCheckbox({
  checked,
  onChange,
  dark = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  dark?: boolean;
}) {
  const textClass = dark ? "text-white/50" : "text-muted-foreground";
  const linkClass = dark ? "text-white/70 underline hover:text-white" : "underline hover:text-foreground";
  return (
    <label className={`flex items-start gap-2 cursor-pointer select-none ${textClass}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 shrink-0 accent-[#C41E3A]"
        required
      />
      <span className="text-[11px] leading-snug">
        I agree to receive the newsletter by email. I can unsubscribe at any time. See our{" "}
        <a href="/privacy" className={`${linkClass} text-[11px]`}>Privacy Policy</a>.
      </span>
    </label>
  );
}

export default function NewsletterAd({ variant = "inline", className = "" }: NewsletterAdProps) {
  const { branding } = useBranding();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [tcpaConsent, setTcpaConsent] = useState(false);

  const { data: countData } = trpc.newsletter.subscriberCount.useQuery(undefined, {
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: false,
  });
  const subscriberCount = formatSubscriberCount(countData);

  const subscribeMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      setStatus("success");
      setEmail("");
      setTcpaConsent(false);
      // Google Ads conversion — newsletter signup
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', { send_to: 'AW-17988276150/jlQOCPa63oIcELafvYFD' });
      }
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !tcpaConsent) return;
    setStatus("idle");
    setErrorMsg("");
    subscribeMutation.mutate({ email: email.trim() });
  };

  const siteName = branding.siteName || "";

  /* ─────────────────────────────────────────────
     SIDEBAR — tall card for right-column placement
  ───────────────────────────────────────────── */
  if (variant === "sidebar") {
    return (
      <div className={`rounded-sm overflow-hidden shadow-sm ${className}`}>
        {/* Header band */}
        <div className="bg-[#D1D5DB] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm bg-black/10 flex items-center justify-center">
              <Mail className="w-3 h-3 text-[#374151]" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#374151]">Newsletter</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#C41E3A]" />
        </div>
        {/* Body */}
        <div className="bg-card border border-t-0 border-border px-5 py-5">
          {/* Mascot + headline */}
          <div className="flex items-center gap-3 mb-4">
            {branding.mascotUrl ? (
              <div className="w-12 h-12 rounded-sm overflow-hidden border border-border shrink-0 bg-muted">
                <img
                  src={branding.mascotUrl}
                  alt={branding.mascotName || siteName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-sm bg-[#D1D5DB] flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-[#374151]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-headline text-[15px] font-black text-foreground leading-tight">
                {branding.tagline ? `${branding.tagline} — in Your Inbox` : `Daily News in Your Inbox`}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Free. No spam. Unsubscribe anytime.</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border mb-4" />

          {/* Subscriber count */}
          {subscriberCount && (
            <p className="text-[12px] text-muted-foreground mb-3">
              Join <span className="font-bold text-foreground">{subscriberCount}</span> readers
            </p>
          )}

          {/* Form */}
          {status === "success" ? (
            <div className="flex items-center gap-2 text-[13px] text-green-600 font-medium py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              You're subscribed!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-[#C41E3A]"
              />
              <TcpaCheckbox checked={tcpaConsent} onChange={setTcpaConsent} />
              {status === "error" && (
                <p className="text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errorMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={subscribeMutation.isPending || !tcpaConsent}
                className="w-full bg-[#D1D5DB] text-[#1A1A1A] text-[13px] font-bold py-2.5 px-4 rounded-sm hover:bg-[#C41E3A] hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscribeMutation.isPending ? "Subscribing…" : "Subscribe Free"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     ABOVE-FOOTER — full-bleed dark band
  ───────────────────────────────────────────── */
  if (variant === "above-footer") {
    return (
      <div className={`w-full bg-[#1A1A1A] ${className}`}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            {/* Left: mascot + copy */}
            <div className="flex items-center gap-5 flex-1 min-w-0">
              {branding.mascotUrl && (
                <div className="w-14 h-14 rounded-sm overflow-hidden border border-white/10 shrink-0 bg-white/5">
                  <img
                    src={branding.mascotUrl}
                    alt={branding.mascotName || siteName}
                    className="w-full h-full object-cover opacity-90"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1">Daily Newsletter</p>
                <h3 className="font-headline text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                  {branding.tagline ? branding.tagline : siteName} — in Your Inbox
                </h3>
                <p className="text-[13px] text-white/50 mt-1 hidden sm:block">
                  {branding.description || 'Free. No spam. Unsubscribe anytime.'}
                </p>
              </div>
            </div>

            <ColumnRule />

            {/* Stats */}
            {subscriberCount && (
              <>
                <div className="hidden lg:block text-center shrink-0">
                  <p className="text-[22px] font-black text-white leading-none">{subscriberCount}</p>
                  <p className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Subscribers</p>
                </div>
                <ColumnRule />
              </>
            )}

            {/* Form */}
            <div className="w-full sm:w-auto shrink-0">
              {status === "success" ? (
                <div className="flex items-center gap-2 text-[14px] text-green-400 font-bold py-3 px-6 bg-white/5 rounded-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  You're subscribed!
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="px-4 py-3 text-[14px] bg-white/10 border border-white/20 rounded-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-[#C41E3A] w-full sm:w-64"
                    />
                    <button
                      type="submit"
                      disabled={subscribeMutation.isPending || !tcpaConsent}
                      className="shrink-0 bg-white text-[#1A1A1A] text-[14px] font-black px-7 py-3 rounded-sm hover:bg-[#C41E3A] hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg"
                    >
                      {subscribeMutation.isPending ? "Subscribing…" : "Subscribe Free →"}
                    </button>
                  </div>
                  <TcpaCheckbox checked={tcpaConsent} onChange={setTcpaConsent} dark />
                </form>
              )}
              {status === "error" && (
                <p className="text-[12px] text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errorMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     INLINE — full-width block between article sections
  ───────────────────────────────────────────── */
  return (
    <div className={`my-8 rounded-sm overflow-hidden shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* Left dark panel */}
        <div className="bg-[#1A1A1A] sm:w-[180px] shrink-0 flex flex-col items-center justify-center gap-3 px-6 py-5 sm:py-6">
          {branding.mascotUrl ? (
            <div className="w-14 h-14 rounded-sm overflow-hidden border border-white/10 bg-white/5">
              <img
                src={branding.mascotUrl}
                alt={branding.mascotName || siteName}
                className="w-full h-full object-cover opacity-90"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-sm bg-white/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="text-center">
            <p className="font-headline text-[14px] font-black text-white leading-tight">{siteName}</p>
            <p className="text-[11px] text-white/50 font-mono mt-0.5">Newsletter</p>
          </div>
        </div>
        {/* Right content panel */}
        <div className="flex-1 bg-card border border-l-0 border-border flex flex-col sm:flex-row items-start gap-4 px-6 py-5">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C41E3A] mb-1.5">Free Newsletter</p>
            <p className="font-headline text-[16px] font-bold text-foreground leading-snug">
              {branding.tagline ? `Get ${branding.tagline} delivered to your inbox` : 'Get daily news delivered to your inbox'}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
              50 stories a day. Free. No spam.{subscriberCount ? ` Join ${subscriberCount} readers.` : ""}
            </p>
          </div>
          {status === "success" ? (
            <div className="shrink-0 flex items-center gap-2 text-[13px] text-green-600 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              You're subscribed!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="px-3 py-2.5 text-[13px] border border-border rounded-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-[#C41E3A] w-full sm:w-52"
                />
                <button
                  type="submit"
                  disabled={subscribeMutation.isPending || !tcpaConsent}
                  className="shrink-0 flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[13px] font-bold px-5 py-2.5 rounded-sm hover:bg-[#C41E3A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {subscribeMutation.isPending ? "Subscribing…" : "Subscribe"}
                </button>
              </div>
              <TcpaCheckbox checked={tcpaConsent} onChange={setTcpaConsent} />
              {status === "error" && (
                <p className="text-[11px] text-red-500 flex items-center gap-1 shrink-0">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errorMsg}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
