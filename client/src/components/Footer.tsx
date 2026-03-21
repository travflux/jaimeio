import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useBranding } from "@/hooks/useBranding";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ColumnRule() {
  return <div className="hidden sm:block w-px bg-white/10 self-stretch mx-2" />;
}

export default function Footer() {
  const { data: cats } = trpc.categories.list.useQuery();
  const { branding } = useBranding();
  const [email, setEmail] = useState("");
  const [footerTcpa, setFooterTcpa] = useState(false);
  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      toast.success("Subscribed! Welcome aboard.");
      setEmail("");
      // Google Ads conversion — newsletter signup
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', { send_to: 'AW-17988276150/jlQOCPa63oIcELafvYFD' });
      }
    },
    onError: () => toast.error("Failed to subscribe. Try again."),
  });

  const { data: followerData } = trpc.branding.xFollowerCount.useQuery(undefined, {
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  const followerCount = (() => {
    const c = followerData?.count;
    if (c == null) return null;
    if (c >= 1_000_000) return `${(c / 1_000_000).toFixed(1)}M`;
    if (c >= 1_000) return `${(c / 1_000).toFixed(c >= 10_000 ? 0 : 1)}K`;
    return c.toString();
  })();
  const handle = branding.twitterHandle ? `@${branding.twitterHandle.replace(/^@/, "")}` : "@hambry_com";
  const xUrl = branding.twitterUrl || "https://x.com/hambry_com";
  const siteName = branding.siteName || "";

  return (
    <>
    {/* Follow on X band — rendered once here so every page gets it automatically */}
    <div className="w-full bg-[#1A1A1A]">
      <div className="container py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            {branding.mascotUrl && (
              <div className="w-14 h-14 rounded-sm overflow-hidden border border-white/10 shrink-0 bg-white/5">
                <img src={branding.mascotUrl} alt={branding.mascotName || siteName} className="w-full h-full object-cover opacity-90" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1">Stay in the Loop</p>
              <h3 className="font-headline text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                Follow <span className="text-[#C41E3A]">{siteName}</span> on X
              </h3>
              <p className="text-[13px] text-white/50 mt-1 hidden sm:block">
                {branding.tagline || "Trending takes and the news as it should have been reported."}
              </p>
            </div>
          </div>
          <ColumnRule />
          <div className="hidden lg:flex items-center gap-8 shrink-0">
            <div className="text-center">
              <p className="text-[22px] font-black text-white leading-none">50+</p>
              <p className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Articles/Day</p>
            </div>
            {followerCount && (
              <>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-[22px] font-black text-white leading-none">{followerCount}</p>
                  <p className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Followers</p>
                </div>
              </>
            )}
          </div>
          <ColumnRule />
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn shrink-0 flex items-center gap-3 bg-white text-[#1A1A1A] text-[14px] font-black px-7 py-3.5 rounded-sm hover:bg-[#C41E3A] hover:text-white transition-colors duration-200 no-underline whitespace-nowrap shadow-lg"
            aria-label={`Follow ${siteName} on X (opens in new tab)`}
          >
            <XIcon className="w-4 h-4" />
            Follow {handle}
          </a>
        </div>
      </div>
    </div>
    <footer className="bg-foreground text-background relative overflow-hidden">
      {/* Decorative top accent line */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />

      <div className="container py-14">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-headline text-xl font-bold mb-3 tracking-tight">{branding.siteName}</h3>
            <p className="text-[14px] leading-relaxed opacity-60">
              {branding.description}
            </p>
            <div className="flex items-center gap-2.5 mt-4">
              <a href={branding.twitterUrl || "https://x.com"} target="_blank" rel="noopener noreferrer" title="Opens in a new tab" className="w-8 h-8 rounded-sm bg-background/8 border border-background/10 flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all duration-200" aria-label={`Follow ${siteName} on X (opens in new tab)`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="/api/rss" target="_blank" rel="noopener noreferrer" title="Opens in a new tab" className="w-8 h-8 rounded-sm bg-background/8 border border-background/10 flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all duration-200" aria-label="RSS Feed (opens in new tab)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.15em] mb-4 opacity-50">Sections</h4>
            <div className="space-y-2.5">
              {cats?.map(cat => (
                <Link key={cat.id} href={`/category/${cat.slug}`} className="block text-[15px] opacity-60 hover:opacity-100 hover:translate-x-1 transition-all duration-300">
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.15em] mb-4 opacity-50">Company</h4>
            <div className="space-y-2.5">
              {[
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
                { href: "/advertise", label: "Advertise" },
                { href: "/careers", label: "Careers" },
                { href: "/privacy", label: "Privacy & Terms" },
                { href: "/editorial-standards", label: "Editorial Standards" },
                { href: "/sitemap", label: "Site Map" },
              ].map(link => (
                <Link key={link.href} href={link.href} className="block text-[15px] opacity-60 hover:opacity-100 hover:translate-x-1 transition-all duration-300">
                  {link.label}
                </Link>
              ))}
              <a href="/api/rss" target="_blank" rel="noopener noreferrer" title="Opens in a new tab" aria-label="RSS Feed (opens in new tab)" className="flex items-center gap-2 text-[15px] opacity-60 hover:opacity-100 hover:translate-x-1 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                RSS Feed
              </a>
            </div>
          </div>

          {/* Discover */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.15em] mb-4 opacity-50">Discover</h4>
            <div className="space-y-2.5">
              {[
                { href: "/latest", label: "Latest" },
                { href: "/most-read", label: "Most Read" },
                { href: "/trending", label: "Trending Now" },
                { href: "/editors-picks", label: "Editor's Picks" },
                { href: "/tags", label: "Browse Topics" },
                { href: "/archive", label: "Archive" },
              ].map(link => (
                <Link key={link.href} href={link.href} className="block text-[15px] opacity-60 hover:opacity-100 hover:translate-x-1 transition-all duration-300">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>



          {/* Newsletter */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.15em] mb-4 opacity-50">Newsletter</h4>
            <p className="text-[14px] opacity-60 leading-relaxed mb-4">Get the best {branding.genre} delivered to your inbox, curated by {branding.siteName}.</p>
            <form onSubmit={e => { e.preventDefault(); if (email && footerTcpa) subscribe.mutate({ email }); }} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-lg text-[15px] bg-background/8 border border-background/15 text-background placeholder:text-background/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-300"
                />
                <Button type="submit" size="sm" variant="secondary" className="rounded-lg px-4 group" disabled={subscribe.isPending || !footerTcpa}>
                  {subscribe.isPending ? "..." : (
                    <>
                      Join
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
              <label className="flex items-start gap-2 cursor-pointer select-none text-background/50">
                <input type="checkbox" checked={footerTcpa} onChange={e => setFooterTcpa(e.target.checked)} className="mt-0.5 shrink-0 accent-primary" required />
                <span className="text-[11px] leading-snug">
                  I agree to receive the newsletter. <a href="/privacy" className="underline hover:text-background/80 text-[11px]">Privacy Policy</a>.
                </span>
              </label>
            </form>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] opacity-40">
            &copy; {new Date().getFullYear()} {branding.siteName}. All rights reserved.
          </p>
          <p className="text-[12px] opacity-25 italic">
            {branding.disclaimer || `${branding.siteName} is a ${branding.genre || "content"} publication. All articles are works of fiction. Any resemblance to real events or persons is coincidental and for entertainment purposes only.`}
          </p>
        </div>
        {/* Powered by Hambry Engine — v4.9.1. Renders only when powered_by_url is set. White-label clients clear this setting to opt out. */}
        {branding.poweredByUrl && (
          <div className="mt-4 flex justify-center">
            <a
              href={branding.poweredByUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] opacity-20 hover:opacity-40 transition-opacity duration-200 tracking-wide"
            >
              Powered by Hambry Engine
            </a>
          </div>
        )}
      </div>
    </footer>
    </>
  );
}
