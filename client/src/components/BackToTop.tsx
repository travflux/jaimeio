import { useBackToTop } from "@/hooks/useScrollAnimation";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const { btnRef, scrollToTop } = useBackToTop(400);

  return (
    <button
      ref={btnRef}
      onClick={scrollToTop}
      className="back-to-top"
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
