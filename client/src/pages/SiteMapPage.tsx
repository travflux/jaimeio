import { useState, useEffect } from "react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useBranding } from "@/hooks/useBranding";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  category: string;
}

interface FeedData {
  title: string;
  description: string;
  items: FeedItem[];
}

function parseFeedXml(xml: string): FeedData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");

  const channelTitle = doc.querySelector("channel > title")?.textContent ?? "";
  const channelDesc = doc.querySelector("channel > description")?.textContent ?? "";

  const items: FeedItem[] = Array.from(doc.querySelectorAll("item")).map((item) => ({
    title: item.querySelector("title")?.textContent ?? "",
    link: item.querySelector("link")?.textContent ?? "",
    pubDate: item.querySelector("pubDate")?.textContent ?? "",
    description: item.querySelector("description")?.textContent ?? "",
    category: item.querySelector("category")?.textContent ?? "",
  }));

  return { title: channelTitle, description: channelDesc, items };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Group items by category
function groupByCategory(items: FeedItem[]): Record<string, FeedItem[]> {
  const groups: Record<string, FeedItem[]> = {};
  for (const item of items) {
    const cat = item.category || "Uncategorized";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

export default function SiteMapPage() {
  const { branding } = useBranding();
  usePageSEO({
    title: `Site Map — ${branding.siteName || ""}`,
    description: `Browse all published articles on ${branding.siteName || "our site"}, organized by category.`,
    keywords: `site map, all articles, ${branding.genre || 'news'}, ${(branding.siteName || "").toLowerCase()}`,
  });

  const [feed, setFeed] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/rss")
      .then((res) => {
        if (!res.ok) throw new Error(`Feed returned ${res.status}`);
        return res.text();
      })
      .then((xml) => {
        if (!cancelled) {
          setFeed(parseFeedXml(xml));
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load feed");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const grouped = feed ? groupByCategory(feed.items) : {};
  const categories = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {/* Page header */}
        <div className="border-b border-border pb-6 mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Site Map
          </h1>
          <p className="text-muted-foreground text-sm">
            All published articles, sourced live from the{" "}
            <a
              href="/api/rss"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              RSS feed
            </a>
            .
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-5 bg-muted rounded animate-pulse w-3/4" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
            Unable to load feed: {error}
          </div>
        )}

        {/* Content */}
        {!loading && !error && feed && (
          <>
            <p className="text-xs text-muted-foreground mb-8 uppercase tracking-widest">
              {feed.items.length} articles across {categories.length} categories
            </p>

            <div className="space-y-10">
              {categories.map((cat) => (
                <section key={cat}>
                  {/* Category heading */}
                  <h2 className="font-serif text-lg font-bold uppercase tracking-widest mb-3 pb-2 border-b border-border flex items-center gap-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    {cat}
                    <span className="text-xs font-normal text-muted-foreground normal-case tracking-normal">
                      ({grouped[cat].length})
                    </span>
                  </h2>

                  {/* Article list */}
                  <ul className="space-y-1.5">
                    {grouped[cat].map((item, idx) => {
                      // Convert absolute URL to relative path for internal Link
                      let href = item.link;
                      try {
                        const url = new URL(item.link);
                        href = url.pathname;
                      } catch {
                        // already relative
                      }

                      return (
                        <li key={idx} className="flex items-start gap-3 group">
                          <span className="text-muted-foreground text-xs mt-1 flex-shrink-0 w-28 tabular-nums">
                            {formatDate(item.pubDate)}
                          </span>
                          <Link
                            href={href}
                            className="text-sm leading-snug text-foreground/80 group-hover:text-foreground group-hover:underline underline-offset-2 transition-colors"
                          >
                            {item.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
