export const PLANS = {
  starter: { name: "Essential", stripeProductId: "prod_UBhIt9OYFXKi6K", pricePerMonth: 9.95, articlesPerMonth: 100, maxPublications: 1 },
  professional: { name: "Professional", stripeProductId: "prod_UBhJUW1IxzCU0y", pricePerMonth: 7.95, articlesPerMonth: 500, maxPublications: 1 },
  enterprise: { name: "Enterprise", stripeProductId: "prod_UHYSEQD0eq2K1T", pricePerMonth: 6950, articlesPerMonth: 1000, maxPublications: -1 },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanLimits(tier: string) {
  const plan = PLANS[tier as PlanKey];
  return plan ? { articlesPerMonth: plan.articlesPerMonth, maxPublications: plan.maxPublications } : { articlesPerMonth: 500, maxPublications: 1 };
}
