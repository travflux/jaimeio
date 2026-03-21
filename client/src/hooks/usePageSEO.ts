import { useEffect } from "react";

export interface PageSEOOptions {
  /** Document title — aim for 30–60 characters */
  title: string;
  /** Meta description — aim for 120–160 characters */
  description?: string;
  /** 3–8 focused keyword phrases */
  keywords?: string;
  /** Default title to restore when the component unmounts */
  defaultTitle?: string;
}

/**
 * Sets page-level SEO meta tags (title, description, keywords) via useEffect
 * and restores the default title on unmount.
 *
 * Usage:
 *   usePageSEO({
 *     title: "Trending Now — [SiteName] | Top Stories Today",
 *     description: "The hottest stories gaining momentum right now.",
 *     keywords: "trending news, top stories, viral news",
 *   });
 */
export function usePageSEO({
  title,
  description,
  keywords,
  defaultTitle = "",
}: PageSEOOptions): void {
  useEffect(() => {
    // Title
    document.title = title;

    // Keywords
    if (keywords !== undefined) {
      let kw = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
      if (!kw) {
        kw = document.createElement("meta") as HTMLMetaElement;
        kw.name = "keywords";
        document.head.appendChild(kw);
      }
      kw.content = keywords;
    }

    // Description
    if (description !== undefined) {
      let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!desc) {
        desc = document.createElement("meta") as HTMLMetaElement;
        desc.name = "description";
        document.head.appendChild(desc);
      }
      desc.content = description;
    }

    return () => {
      document.title = defaultTitle;
    };
  }, [title, description, keywords, defaultTitle]);
}
