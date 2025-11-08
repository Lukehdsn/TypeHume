/**
 * Plan configuration mapping
 */

export type PlanType = "free" | "starter" | "pro" | "premium";

export interface PlanConfig {
  name: string;
  wordLimit: number;
  monthlyPrice: number;
  annualPrice: number;
  maxWordsPerRequest: number;
  features: string[];
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    name: "Free",
    wordLimit: 500,
    monthlyPrice: 0,
    annualPrice: 0,
    maxWordsPerRequest: 250,
    features: [
      "500 words/month",
      "250 words per request",
      "Basic quality",
      "Copy & export"
    ]
  },
  starter: {
    name: "Starter",
    wordLimit: 5000,
    monthlyPrice: 4.99,
    annualPrice: 3,
    maxWordsPerRequest: 500,
    features: [
      "5,000 words/month",
      "500 words per request",
      "Standard quality",
      "Copy & export"
    ]
  },
  pro: {
    name: "Pro",
    wordLimit: 20000,
    monthlyPrice: 14.99,
    annualPrice: 8,
    maxWordsPerRequest: 1500,
    features: [
      "20,000 words/month",
      "1,500 words per request",
      "Advanced quality",
      "Priority speed",
      "Early access to features"
    ]
  },
  premium: {
    name: "Premium",
    wordLimit: 50000,
    monthlyPrice: 38.99,
    annualPrice: 20,
    maxWordsPerRequest: 3000,
    features: [
      "50,000 words/month",
      "3,000 words per request",
      "Premium quality",
      "Priority support",
      "Custom integrations"
    ]
  }
};

/**
 * Get word limit for a plan
 */
export function getWordLimit(plan: PlanType): number {
  return PLANS[plan].wordLimit;
}

/**
 * Get plan configuration by type
 */
export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLANS[plan];
}

/**
 * Get plan price based on billing period
 */
export function getPlanPrice(plan: PlanType, period: "monthly" | "annual"): number {
  if (plan === "free") return 0;
  return period === "monthly" ? PLANS[plan].monthlyPrice : PLANS[plan].annualPrice;
}
