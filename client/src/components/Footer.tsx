import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useBranding } from "@/hooks/useBranding";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function Footer() {
  const { data: cats } = trpc.categories.list.useQuery();
  const { branding } = useBranding();
  const [email, setEmail] = useState("");
  const [footerTcpa, setFooterTcpa] = useState(false);
  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      toast.success("Subscribed! Welcome aboard.");
      setEmail("");
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', { send_to: 'AW-17988276150/jlQOCPa63oIcELafvYFD' });
      }
    },
    onError: () => toast.error("Failed to subscribe. Try again."),
  });

  const siteName = branding.siteName || "";
  const xUrl = branding.twitterUrl || "https://x.com";

  return (
    <footer className="text-white relative overflow-hidden" style={{ background: "var(--brand-footer-bg, #111827)" }}>
      {/* Accent line */}
      <div className="h-1" style={{ background: "linear-gradient(to right, var(--brand-primary, #0f2d5e), transparent)" }} />

      <div className="container py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          {/* Column 1: Brand + Newsletter */}
          <div className="sm:col-span-2 lg:col-span-1">
            {branding.logoUrl && branding.logoUrl !== "/logo.svg" ? (
              <img src={branding.logoUrl} alt={siteName} className="h-10 mb-3 brightness-0 invert opacity-90" />
            ) : (
              <h3 className="text-xl font-bold font-headline mb-3 tracking-tight" style={{ color: "var(--brand-footer-text, #ffffff)" }}>{siteName}</h3>
            )}
            {branding.tagline && (
              <p className="text-sm opacity-60 mb-4 leading-relaxed" style={{ color: "var(--brand-footer-text, #ffffff)" }}>{branding.tagline}</p>
            )}

            {/* Social icons */}
            <div className="flex items-center gap-2.5 mb-6">
              <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label={`Follow ${siteName} on X`}
                className="w-8 h-8 rounded-sm flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity border border-white/10 hover:border-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="/api/rss" target="_blank" rel="noopener noreferrer" aria-label="RSS Feed"
                className="w-8 h-8 rounded-sm flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity border border-white/10 hover:border-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
              </a>
            </div>

            {/* Newsletter */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-40 mb-2">Newsletter</p>
            <form onSubmit={e => { e.preventDefault(); if (email && footerTcpa) subscribe.mutate({ email }); }} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="email" placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-sm text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                />
                <Button type="submit" size="sm" className="rounded-sm px-4 bg-white/10 hover:bg-white/20 text-white border border-white/10" disabled={subscribe.isPending || !footerTcpa}>
                  {subscribe.isPending ? "..." : <><span className="hidden sm:inline">Join</span><ArrowRight className="w-3 h-3 sm:ml-1" /></>}
                </Button>
              </div>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={footerTcpa} onChange={e => setFooterTcpa(e.target.checked)} className="mt-0.5 shrink-0 accent-white" required />
                <span className="text-[11px] leading-snug opacity-40">
                  I agree to receive the newsletter. <a href="/privacy" className="underline hover:opacity-70 text-[11px]">Privacy Policy</a>.
                </span>
              </label>
            </form>
          </div>

          {/* Column 2: Categories */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-40 mb-4">Categories</h4>
            <div className="space-y-2.5">
              {cats?.slice(0, 5).map(cat => (
                <Link key={cat.id} href={`/category/${cat.slug}`} className="block text-[14px] opacity-60 hover:opacity-100 transition-opacity">
                  {cat.name}
                </Link>
              ))}
              {cats && cats.length > 5 && (
                <Link href="/categories" className="block text-[14px] opacity-80 hover:opacity-100 transition-opacity" style={{ color: "var(--brand-accent, #2dd4bf)" }}>
                  Explore More →
                </Link>
              )}
            </div>
          </div>

          {/* Column 3: Discover */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-40 mb-4">Discover</h4>
            <div className="space-y-2.5">
              {[
                { href: "/latest", label: "Latest" },
                { href: "/most-read", label: "Most Read" },
                { href: "/trending", label: "Trending Now" },
                { href: "/editors-picks", label: "Editor's Picks" },
                { href: "/tags", label: "Browse Topics" },
                ].map(link => (
                <Link key={link.href} href={link.href} className="block text-[14px] opacity-60 hover:opacity-100 transition-opacity">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 4: Quick Links */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-40 mb-4">Quick Links</h4>
            <div className="space-y-2.5">
              {[
                { href: "/advertise", label: "Advertise" },
                { href: "/privacy", label: "Privacy Policy & Terms" },
                { href: "/sitemap", label: "Site Map" },
                { href: "/contact", label: "Contact" },
              ].map(link => (
                <Link key={link.href} href={link.href} className="block text-[14px] opacity-60 hover:opacity-100 transition-opacity">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright line */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p className="text-[13px] opacity-40">
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <span className="hidden sm:inline text-[13px] opacity-20">|</span>
            <a href="/admin" className="text-[11px] opacity-20 hover:opacity-40 transition-opacity">Admin</a>
          </div>
          <div className="flex items-center gap-3">
            {branding.poweredByUrl && (
              <a href={branding.poweredByUrl} target="_blank" rel="noopener noreferrer"
                className="text-[11px] opacity-15 hover:opacity-30 transition-opacity tracking-wide">
                Powered by JAIME.IO
              </a>
            )}
          </div>
        </div>

        {branding.disclaimer && (
          <p className="text-[11px] opacity-15 italic text-center mt-4">
            {branding.disclaimer}
          </p>
        )}
      </div>
    </footer>
  );
}
