import { useEffect, useRef } from "react";

interface DisqusEmbedProps {
  shortname: string;
  pageUrl: string;
  pageId: string;
}

export default function DisqusEmbed({ shortname, pageUrl, pageId }: DisqusEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shortname || !containerRef.current) return;

    // Reset Disqus if it was previously loaded (SPA navigation)
    if ((window as any).DISQUS) {
      (window as any).DISQUS.reset({
        reload: true,
        config: function (this: any) {
          this.page.url = pageUrl;
          this.page.identifier = pageId;
        },
      });
      return;
    }

    // First load — inject config then script
    (window as any).disqus_config = function (this: any) {
      this.page.url = pageUrl;
      this.page.identifier = pageId;
    };

    const script = document.createElement("script");
    script.src = `https://${shortname}.disqus.com/embed.js`;
    script.setAttribute("data-timestamp", String(+new Date()));
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Clean up on unmount (SPA navigation away)
      const existing = document.querySelector(`script[src*="${shortname}.disqus.com"]`);
      if (existing) existing.remove();
    };
  }, [shortname, pageUrl, pageId]);

  return (
    <div>
      <div id="disqus_thread" ref={containerRef} />
      <noscript>
        Please enable JavaScript to view the{" "}
        <a href="https://disqus.com/?ref_noscript" rel="nofollow">
          comments powered by Disqus.
        </a>
      </noscript>
    </div>
  );
}
