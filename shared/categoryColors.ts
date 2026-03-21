/**
 * Category color definitions
 * Maps category slugs to their brand colors and descriptions
 */

export const CATEGORY_COLORS: Record<string, { hex: string; tailwind: string; rgb: string; description: string }> = {
  "corporate-absurdity": {
    hex: "#f59e0b",
    tailwind: "amber-500",
    rgb: "245, 158, 11",
    description: "Corporate scandals, business mishaps, and executive absurdity"
  },
  "pop-culture": {
    hex: "#ec4899",
    tailwind: "pink-500",
    rgb: "236, 72, 153",
    description: "Celebrity gossip, entertainment news, and pop culture chaos"
  },
  "economics-finance": {
    hex: "#10b981",
    tailwind: "emerald-500",
    rgb: "16, 185, 129",
    description: "Market madness, financial follies, and economic absurdities"
  },
  "lifestyle-culture": {
    hex: "#a855f7",
    tailwind: "purple-500",
    rgb: "168, 85, 247",
    description: "Lifestyle trends, cultural moments, and social phenomena"
  },
  "politics-government": {
    hex: "#ef4444",
    tailwind: "red-500",
    rgb: "239, 68, 68",
    description: "Political theater, government gaffes, and legislative lunacy"
  },
  "science-environment": {
    hex: "#06b6d4",
    tailwind: "cyan-500",
    rgb: "6, 182, 212",
    description: "Scientific discoveries, environmental news, and space oddities"
  },
  "sports-games": {
    hex: "#f97316",
    tailwind: "orange-500",
    rgb: "249, 115, 22",
    description: "Sports drama, athletic achievements, and game-day chaos"
  },
  "tech-innovation": {
    hex: "#3b82f6",
    tailwind: "blue-500",
    rgb: "59, 130, 246",
    description: "Tech breakthroughs, AI developments, and digital disruption"
  },
  "social-trends": {
    hex: "#6366f1",
    tailwind: "indigo-500",
    rgb: "99, 102, 241",
    description: "Social media trends, viral moments, and generational shifts"
  },
  "weird-news": {
    hex: "#eab308",
    tailwind: "yellow-500",
    rgb: "234, 179, 8",
    description: "Bizarre stories, strange occurrences, and the unexplainable"
  }
};

/**
 * Get category color by slug
 */
export function getCategoryColor(slug: string): string {
  return CATEGORY_COLORS[slug]?.hex || "#6366f1"; // Default to indigo
}

/**
 * Get category description by slug
 */
export function getCategoryDescription(slug: string): string {
  return CATEGORY_COLORS[slug]?.description || "Browse articles in this category";
}

/**
 * Get all category colors as array
 */
export function getAllCategoryColors(): Array<{ slug: string; hex: string; tailwind: string; rgb: string; description: string }> {
  return Object.entries(CATEGORY_COLORS).map(([slug, data]) => ({
    slug,
    ...data
  }));
}
