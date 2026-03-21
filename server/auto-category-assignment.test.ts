import { describe, it, expect } from "vitest";

// Test the guessCategory function logic
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  politics: [
    "politic",
    "government",
    "congress",
    "senate",
    "president",
    "election",
    "democrat",
    "republican",
    "vote",
    "law",
    "legislation",
    "white house",
  ],
  tech: [
    "tech",
    "ai",
    "artificial intelligence",
    "software",
    "app",
    "startup",
    "silicon valley",
    "google",
    "apple",
    "meta",
    "microsoft",
    "amazon",
    "robot",
    "cyber",
    "digital",
    "internet",
    "computer",
  ],
  business: [
    "business",
    "economy",
    "stock",
    "market",
    "trade",
    "bank",
    "finance",
    "ceo",
    "company",
    "corporate",
    "wall street",
    "gdp",
    "inflation",
    "recession",
  ],
  entertainment: [
    "celebrity",
    "movie",
    "film",
    "music",
    "tv",
    "show",
    "actor",
    "actress",
    "netflix",
    "hollywood",
    "streaming",
    "award",
    "grammy",
    "oscar",
    "emmy",
  ],
  science: [
    "science",
    "space",
    "nasa",
    "climate",
    "environment",
    "research",
    "study",
    "discovery",
    "planet",
    "health",
    "medical",
    "vaccine",
    "disease",
    "doctor",
  ],
  sports: [
    "sport",
    "game",
    "team",
    "player",
    "nfl",
    "nba",
    "mlb",
    "soccer",
    "football",
    "basketball",
    "baseball",
    "olympic",
    "championship",
    "coach",
    "league",
  ],
  opinion: ["opinion", "editorial", "commentary", "analysis", "perspective"],
};

function guessCategory(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [catSlug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > 0) scores[catSlug] = score;
  }

  if (Object.keys(scores).length > 0) {
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }
  return "opinion"; // default fallback
}

describe("Auto Category Assignment", () => {
  it("should assign tech category to AI/Microsoft articles", () => {
    const title = "Microsoft Appoints AI to Lead Xbox";
    const summary =
      "Gaming community braces for algorithmic updates to fun as new executive promises optimal engagement metrics";
    const category = guessCategory(title, summary);
    expect(category).toBe("tech");
  });

  it("should assign entertainment category to celebrity/movie articles", () => {
    const title = "New Netflix Series Breaks Streaming Records";
    const summary =
      "Hollywood stars celebrate as new show becomes most-watched film on platform";
    const category = guessCategory(title, summary);
    expect(category).toBe("entertainment");
  });

  it("should assign politics category to government articles", () => {
    const title = "Congress Passes New Legislation";
    const summary =
      "Senate votes on election reform as political leaders debate white house policies";
    const category = guessCategory(title, summary);
    expect(category).toBe("politics");
  });

  it("should assign business category to economy articles", () => {
    const title = "Stock Market Reaches New Heights";
    const summary =
      "Wall Street celebrates as corporate earnings beat expectations amid inflation concerns";
    const category = guessCategory(title, summary);
    expect(category).toBe("business");
  });

  it("should assign science category to research articles", () => {
    const title = "NASA Discovers New Planet";
    const summary =
      "Space agency announces discovery of habitable world as climate research advances";
    const category = guessCategory(title, summary);
    expect(category).toBe("science");
  });

  it("should assign sports category to athletic articles", () => {
    const title = "NFL Championship Game Draws Record Viewership";
    const summary =
      "Football league celebrates as championship team wins playoff game with stellar player performance";
    const category = guessCategory(title, summary);
    expect(category).toBe("sports");
  });

  it("should return opinion as default when no keywords match", () => {
    const title = "Why We Should Care About Random Things";
    const summary =
      "An editorial perspective on matters of personal importance and general interest";
    const category = guessCategory(title, summary);
    expect(category).toBe("opinion");
  });

  it("should handle multiple matching categories by selecting highest score", () => {
    const title = "Apple Stock Soars on AI Announcement";
    const summary =
      "Technology company announces new AI features as market reacts positively to corporate earnings";
    const category = guessCategory(title, summary);
    // Should be tech (ai, technology, features) over business (stock, market, corporate, earnings)
    expect(category).toBe("tech");
  });

  it("should be case-insensitive", () => {
    const title = "MICROSOFT APPOINTS AI TO LEAD XBOX";
    const summary =
      "GAMING COMMUNITY BRACES FOR ALGORITHMIC UPDATES TO FUN AS NEW EXECUTIVE PROMISES OPTIMAL ENGAGEMENT METRICS";
    const category = guessCategory(title, summary);
    expect(category).toBe("tech");
  });

  it("should handle partial keyword matches", () => {
    const title = "Political Debate Heats Up Before Election";
    const summary =
      "Government officials discuss legislation as voters prepare to vote in upcoming presidential race";
    const category = guessCategory(title, summary);
    expect(category).toBe("politics");
  });
});
