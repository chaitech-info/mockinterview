import type { BillingPlan } from "@/lib/entitlements/plan";

/** Map Paddle price IDs (Catalog → Prices) to internal plan keys. Set in env for sandbox + production. */
export function planFromPaddlePriceId(priceId: string | null | undefined): BillingPlan | null {
  if (!priceId?.trim()) return null;
  const id = priceId.trim();
  const plan3 = process.env.PADDLE_PRICE_ID_PLAN_3?.trim();
  const plan5 = process.env.PADDLE_PRICE_ID_PLAN_5?.trim();
  if (plan3 && id === plan3) return "plan_3";
  if (plan5 && id === plan5) return "plan_5";
  return null;
}
