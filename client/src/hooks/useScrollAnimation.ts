import { useEffect, useRef } from "react";

/**
 * Hook that observes elements with `.animate-on-scroll` or `.stagger-children`
 * classes and adds `.is-visible` when they enter the viewport.
 * 
 * Call once per page/component that contains animated sections.
 */
export function useScrollAnimations() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.01, // Low threshold so tall sections trigger on mobile
        rootMargin: "0px 0px -20px 0px",
      }
    );

    const observeElements = () => {
      const elements = document.querySelectorAll(
        ".animate-on-scroll:not(.is-visible), .stagger-children:not(.is-visible)"
      );
      elements.forEach((el) => observerRef.current?.observe(el));
    };

    // Observe immediately
    observeElements();

    // Re-observe after content may have loaded (data fetching)
    const timer = setTimeout(observeElements, 500);
    const timer2 = setTimeout(observeElements, 1500);

    // Also use MutationObserver to catch dynamically added elements
    const mutationObserver = new MutationObserver(() => {
      observeElements();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observerRef.current?.disconnect();
      mutationObserver.disconnect();
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);
}

/**
 * Hook that tracks scroll progress and returns a ref to the progress bar element.
 * Shows a reading progress bar at the top of the page.
 */
export function useReadingProgress() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!progressRef.current) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressRef.current.style.width = `${Math.min(progress, 100)}%`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return progressRef;
}

/**
 * Hook for back-to-top button visibility.
 * Returns a ref that gets `.is-visible` class when scrolled past threshold.
 */
export function useBackToTop(threshold = 400) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!btnRef.current) return;
      if (window.scrollY > threshold) {
        btnRef.current.classList.add("is-visible");
      } else {
        btnRef.current.classList.remove("is-visible");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { btnRef, scrollToTop };
}
