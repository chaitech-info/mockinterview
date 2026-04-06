import type { BillingPlan } from "@/lib/entitlements/plan";
import { paddlePlanPriceId3, paddlePlanPriceId5 } from "@/lib/paddle/server-environment";

/** Map Paddle price IDs (Catalog → Prices) to internal plan keys. Uses sandbox vs prod IDs from env. */
export function planFromPaddlePriceId(priceId: string | null | undefined): BillingPlan | null {
  if (!priceId?.trim()) return null;
  const id = priceId.trim();
  const plan3 = paddlePlanPriceId3();
  const plan5 = paddlePlanPriceId5();
  if (plan3 && id === plan3) return "plan_3";
  if (plan5 && id === plan5) return "plan_5";
  return null;
}
