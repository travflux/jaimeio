import { useState } from "react";
import { toast } from "sonner";
import { Link2, Check } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  variant?: "inline" | "bar" | "floating";
  className?: string;
}

const platforms = [
  {
    name: "X",
    color: "hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black",
    activeColor: "bg-black/5",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    getUrl: (url: string, title: string, _imageUrl?: string) =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    color: "hover:bg-[#1877F2] hover:text-white",
    activeColor: "bg-[#1877F2]/5",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    getUrl: (url: string, _title: string, imageUrl?: string) => {
      let fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      if (imageUrl) {
        fbUrl += `&picture=${encodeURIComponent(imageUrl)}`;
      }
      return fbUrl;
    },
  },
  {
    name: "LinkedIn",
    color: "hover:bg-[#0A66C2] hover:text-white",
    activeColor: "bg-[#0A66C2]/5",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    getUrl: (url: string, _title: string, _imageUrl?: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "Reddit",
    color: "hover:bg-[#FF4500] hover:text-white",
    activeColor: "bg-[#FF4500]/5",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm6.066 13.98c.059.236.09.48.09.733 0 3.045-3.653 5.51-8.156 5.51-4.503 0-8.156-2.465-8.156-5.51 0-.253.031-.497.09-.733A1.745 1.745 0 0 1 .96 12.713c0-.975.796-1.77 1.77-1.77.47 0 .898.185 1.213.489 1.207-.832 2.853-1.363 4.683-1.425l.882-4.137.028-.006a.296.296 0 0 1 .353.209l.605 2.836c.01.046.01.093-.001.14l-.2.937c1.218.064 2.35.396 3.303.95a1.764 1.764 0 0 1 1.174-.448c.975 0 1.77.796 1.77 1.77 0 .723-.44 1.344-1.065 1.614zM9.063 15.08c.56 0 1.015-.455 1.015-1.015 0-.56-.455-1.015-1.015-1.015-.56 0-1.015.455-1.015 1.015 0 .56.455 1.015 1.015 1.015zm5.874 0c.56 0 1.015-.455 1.015-1.015 0-.56-.455-1.015-1.015-1.015-.56 0-1.015.455-1.015 1.015 0 .56.455 1.015 1.015 1.015zm-5.02 2.36c.42.42 1.23.72 2.083.72.853 0 1.663-.3 2.083-.72a.37.37 0 0 0-.523-.523c-.263.263-.903.5-1.56.5-.657 0-1.297-.237-1.56-.5a.37.37 0 0 0-.523.523z" />
      </svg>
    ),
    getUrl: (url: string, title: string, _imageUrl?: string) =>
      `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    name: "Instagram",
    color: "hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#F77737] hover:text-white",
    activeColor: "bg-gradient-to-br from-[#833AB4]/5 via-[#FD1D1D]/5 to-[#F77737]/5",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    getUrl: (url: string, _title: string, _imageUrl?: string) => {
      // Instagram doesn't have a direct share URL API like other platforms
      // Users will need to manually share by copying the link
      // We'll show a toast and copy to clipboard
      return url; // Return url for consistency, but we'll handle this specially
    },
  },
  {
    name: "TikTok",
    color: "hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black",
    activeColor: "bg-black/5",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
    getUrl: (url: string, _title: string, _imageUrl?: string) => {
      // TikTok doesn't have a public share URL API
      // Users will need to manually share by copying the link
      return url; // Return url for consistency, but we'll handle this specially
    },
  },
];

export default function ShareButtons({ url, title, summary, imageUrl, variant = "inline", className = "" }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platformName: string, getUrl: (url: string, title: string, imageUrl?: string) => string) => {
    // Instagram and TikTok don't have direct share URLs, so copy link instead
    if (platformName === "Instagram" || platformName === "TikTok") {
      navigator.clipboard.writeText(url);
      toast.success(`Link copied! Open ${platformName} app to share`);
      return;
    }
    window.open(getUrl(url, title, imageUrl), "_blank", "noopener,noreferrer,width=600,height=500");
  };

  // Floating variant — sticky sidebar for article pages
  if (variant === "floating") {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40 mb-1">Share</span>
        {platforms.map((p) => (
          <button
            key={p.name}
            onClick={() => handleShare(p.name, p.getUrl)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground/60 border border-border/50 ${p.color} transition-all duration-300 hover:scale-110 hover:shadow-lg hover:border-transparent`}
            aria-label={`Share on ${p.name}`}
            title={`Share on ${p.name}`}
          >
            {p.icon}
          </button>
        ))}
        <div className="w-6 h-px bg-border/50 my-1" />
        <button
          onClick={handleCopy}
          className={`w-10 h-10 rounded-xl flex items-center justify-center border border-border/50 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:border-transparent ${copied ? 'text-green-600 bg-green-500/10 border-green-500/30' : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground'}`}
          aria-label="Copy link"
          title="Copy link"
        >
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  if (variant === "bar") {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40 mr-1">Share</span>
        {platforms.map((p) => (
          <button
            key={p.name}
            onClick={() => handleShare(p.name, p.getUrl)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground/60 border border-border/40 ${p.color} transition-all duration-300 hover:scale-110 hover:shadow-md hover:border-transparent`}
            aria-label={`Share on ${p.name}`}
            title={`Share on ${p.name}`}
          >
            {p.icon}
          </button>
        ))}
        <button
          onClick={handleCopy}
          className={`w-10 h-10 rounded-xl flex items-center justify-center border border-border/40 transition-all duration-300 hover:scale-110 hover:shadow-md hover:border-transparent ${copied ? 'text-green-600 bg-green-500/10 border-green-500/30' : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground'}`}
          aria-label="Copy link"
          title="Copy link"
        >
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  // Inline variant — compact row for the article header
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {platforms.map((p) => (
        <button
          key={p.name}
          onClick={() => handleShare(p.name, p.getUrl)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground/60 border border-border/40 ${p.color} transition-all duration-300 hover:scale-110 hover:shadow-md hover:border-transparent`}
          aria-label={`Share on ${p.name}`}
          title={`Share on ${p.name}`}
        >
          {p.icon}
        </button>
      ))}
      <button
        onClick={handleCopy}
        className={`w-9 h-9 rounded-lg flex items-center justify-center border border-border/40 transition-all duration-300 hover:scale-110 hover:shadow-md hover:border-transparent ${copied ? 'text-green-600 bg-green-500/10 border-green-500/30' : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground'}`}
        aria-label="Copy link"
        title="Copy link"
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
