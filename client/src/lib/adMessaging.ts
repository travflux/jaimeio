/**
 * Contextual ad messaging system
 * Maps article categories to Blueprint course CTAs and email capture messaging
 */

export interface AdMessage {
  headline: string;
  description: string;
  cta: string;
  ctaUrl: string;
  emailHeadline?: string;
  emailDescription?: string;
}

export const categoryAdMap: Record<string, AdMessage> = {
  foreclosures: {
    headline: "Master Foreclosure Investing",
    description: "Learn the proven system for sourcing, qualifying, and closing foreclosure deals. 400+ transactions. Tested across boom and bust markets.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=foreclosures",
    emailHeadline: "Foreclosure Opportunities in Your Inbox",
    emailDescription: "Get daily foreclosure insights + exclusive access to The Wilder Blueprint system.",
  },
  flipping: {
    headline: "Fix & Flip Like a Pro",
    description: "Master the art of finding, analyzing, and flipping properties for maximum profit. Complete workflows, financial models, and negotiation scripts included.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=flipping",
    emailHeadline: "Flipping Deals & Market Insights",
    emailDescription: "Weekly flipping strategies + access to The Dirty Dozen training modules.",
  },
  investing: {
    headline: "Build Your Real Estate Portfolio",
    description: "From lead generation to exit strategy—the complete operational infrastructure for serious real estate investors. 1,200+ pages of battle-tested methodology.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=investing",
    emailHeadline: "Investment Strategies & Market Trends",
    emailDescription: "Daily real estate insights + exclusive Blueprint curriculum access.",
  },
  roi: {
    headline: "Maximize Your Returns",
    description: "Financial models, underwriting frameworks, and cap rate analysis. Learn how to evaluate deals like a professional investor.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=roi",
    emailHeadline: "ROI Strategies & Deal Analysis",
    emailDescription: "Weekly ROI breakdowns + access to financial modeling templates.",
  },
  agents: {
    headline: "Scale Your Real Estate Business",
    description: "Proven systems for sourcing, qualifying, and closing deals. Used by top agents and brokers across 6 states.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=agents",
    emailHeadline: "Agent Strategies & Market Updates",
    emailDescription: "Daily market insights + exclusive agent resources from The Wilder Blueprint.",
  },
  "short-sales": {
    headline: "Master Short Sale Negotiations",
    description: "Navigate lender approvals, loss mitigation, and complex seller scenarios. Complete playbook for short sale success.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=short-sales",
    emailHeadline: "Short Sale Opportunities",
    emailDescription: "Weekly short sale leads + negotiation strategies from The Blueprint.",
  },
  "side-hustle": {
    headline: "Build Passive Income Streams",
    description: "From Airbnb to wholesaling—multiple income strategies for real estate operators. Proven systems for scaling.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=side-hustle",
    emailHeadline: "Passive Income Opportunities",
    emailDescription: "Weekly income strategies + access to The Wilder Blueprint system.",
  },
  "recession-proof": {
    headline: "Recession-Proof Your Portfolio",
    description: "Strategies for thriving in any market cycle. Learn how to hedge, diversify, and maintain cash flow during downturns.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=recession-proof",
    emailHeadline: "Market-Proof Strategies",
    emailDescription: "Daily market analysis + recession-resistant investment strategies.",
  },
  "9-5": {
    headline: "Escape the 9-to-5",
    description: "Build a real estate business while keeping your day job. Proven systems for part-time investors.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=9-5",
    emailHeadline: "Part-Time Real Estate Strategies",
    emailDescription: "Weekly strategies for building wealth outside your 9-to-5 job.",
  },
  "job-seekers": {
    headline: "Launch Your Real Estate Career",
    description: "Transition from employment to entrepreneurship. Complete system for building a profitable real estate business.",
    cta: "Get the Blueprint",
    ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=sidebar&utm_campaign=job-seekers",
    emailHeadline: "Career Transition Resources",
    emailDescription: "Real estate career strategies + Blueprint access for job seekers.",
  },
};

/**
 * Get contextual ad message for a category
 * Falls back to generic investing message if category not found
 */
export function getAdMessage(categorySlug?: string): AdMessage {
  if (!categorySlug) {
    return categoryAdMap.investing;
  }
  return categoryAdMap[categorySlug] || categoryAdMap.investing;
}

/**
 * Generic Blueprint CTA for non-category pages (homepage, latest, etc.)
 */
export const genericBlueprintCTA: AdMessage = {
  headline: "Master Real Estate Investing",
  description: "The complete operational infrastructure for serious foreclosure investors. 400+ transactions. 18 years of field-tested methodology.",
  cta: "Get the Blueprint",
  ctaUrl: "https://wilderblueprint.com/get-the-blueprint/?utm_source=news&utm_medium=generic&utm_campaign=homepage",
  emailHeadline: "Real Estate Investing Insights",
  emailDescription: "Daily market insights + exclusive access to The Wilder Blueprint system.",
};
