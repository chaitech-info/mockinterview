import {
  paddleCreditsPriceId3,
  paddleCreditsPriceId5,
  paddlePlanPriceId3,
  paddlePlanPriceId5,
} from "@/lib/paddle/server-environment";

/**
 * Maps Paddle price IDs to interview credits on `transaction.completed`.
 *
 * - Credit-pack and plan price IDs are resolved for **sandbox vs production** via `lib/paddle/server-environment`.
 * - Explicit one-time pack IDs always grant when the price matches.
 * - Plan IDs grant credits only when the transaction is **not** `subscription_recurring`.
 */
export function creditsForCompletedTransaction(
  priceId: string | null | undefined,
  transactionOrigin: string | null | undefined
): number | null {
  if (!priceId?.trim()) return null;
  const id = priceId.trim();
  const origin = (transactionOrigin ?? "").trim().toLowerCase();

  const c3 = paddleCreditsPriceId3();
  const c5 = paddleCreditsPriceId5();
  if (c3 && id === c3) return 3;
  if (c5 && id === c5) return 5;

  if (origin === "subscription_recurring") {
    return null;
  }

  const plan3 = paddlePlanPriceId3();
  const plan5 = paddlePlanPriceId5();
  if (plan3 && id === plan3) return 3;
  if (plan5 && id === plan5) return 5;

  return null;
}

/** @deprecated Prefer creditsForCompletedTransaction (needs origin for subscription renewals). */
export function creditsFromPaddlePriceId(priceId: string | null | undefined): number | null {
  return creditsForCompletedTransaction(priceId, null);
}
