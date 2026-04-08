export const PLAN_TIERS = {
  essential: { monthlyPageLimit: 100, pricePerPage: 9.95, monthlyTotal: 995 },
  standard: { monthlyPageLimit: 250, pricePerPage: 8.95, monthlyTotal: 2237.50 },
  professional: { monthlyPageLimit: 500, pricePerPage: 7.95, monthlyTotal: 3975 },
  enterprise: { monthlyPageLimit: null, pricePerPage: 6.95, monthlyTotal: null },
} as const;

export type PlanTier = keyof typeof PLAN_TIERS;
