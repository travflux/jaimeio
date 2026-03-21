import { useState } from "react";
import { toast } from "sonner";
import { useBranding } from "@/hooks/useBranding";

interface InteractiveMascotProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

const MASCOT_QUOTES = [
  "I've covered breaking news, but this page is just broken.",
  "The news doesn't sleep, and neither do I. (Send coffee.)",
  "Fact-checking reality since... well, someone has to.",
  "I report the news, you decide what to make of it. Good luck.",
  "This mascot has seen things. Terrible, newsworthy things.",
  "Breaking: Local mascot tired of being clicked. More at 11.",
  "I'm not saying the news is wrong, but I'm definitely raising an eyebrow.",
  "Journalism: Where truth meets a well-groomed mascot.",
  "Click me again. I dare you. I double dare you.",
  "The pen is mightier than the sword, but curiosity is mightier than both.",
];

const SIZE_CLASSES = {
  small: "w-12 h-12",
  medium: "w-48 h-48",
  large: "w-64 h-64",
};

export function InteractiveMascot({ size = "medium", className = "" }: InteractiveMascotProps) {
  const [clickCount, setClickCount] = useState(0);
  const { branding } = useBranding();
  const mascotSrc = branding.mascotUrl || "/mascot.png";

  const handleClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    // Show random quote
    const randomQuote = MASCOT_QUOTES[Math.floor(Math.random() * MASCOT_QUOTES.length)];
    toast(randomQuote, {
      description: "— Your friendly mascot",
      duration: 4000,
    });

    // Special message after 5 clicks
    if (newCount === 5) {
      setTimeout(() => {
        toast.success("Achievement Unlocked: Biggest Fan!", {
          description: "You've clicked the mascot 5 times. They're flattered, but also slightly concerned.",
          duration: 5000,
        });
      }, 500);
    }

    // Easter egg after 10 clicks
    if (newCount === 10) {
      setTimeout(() => {
        toast("🎉 Secret Unlocked!", {
          description: "You've discovered the mascot's hidden persistence. They salute your dedication to clicking things.",
          duration: 6000,
        });
      }, 500);
    }
  };

  return (
    <img
      src={mascotSrc}
      alt={branding.mascotName || "Site mascot"}
      className={`${SIZE_CLASSES[size]} ${className} object-contain cursor-pointer transition-all duration-300 hover:scale-110 hover:rotate-3 active:scale-95 active:rotate-0`}
      onClick={handleClick}
      title="Click me for a surprise!"
    />
  );
}
