/**
 * Maps Paddle price IDs to interview credits on `transaction.completed`.
 *
 * - Explicit one-time pack envs (`PADDLE_PRICE_ID_CREDITS_*`) always grant when the price matches.
 * - Subscription catalog prices (`PADDLE_PRICE_ID_PLAN_*`, same as checkout + subscription webhooks)
 *   grant credits only when the transaction is **not** a scheduled renewal (`origin !== subscription_recurring`).
 */
export function creditsForCompletedTransaction(
  priceId: string | null | undefined,
  transactionOrigin: string | null | undefined
): number | null {
  if (!priceId?.trim()) return null;
  const id = priceId.trim();
  const origin = (transactionOrigin ?? "").trim().toLowerCase();

  const c3 = process.env.PADDLE_PRICE_ID_CREDITS_3?.trim();
  const c5 = process.env.PADDLE_PRICE_ID_CREDITS_5?.trim();
  if (c3 && id === c3) return 3;
  if (c5 && id === c5) return 5;

  if (origin === "subscription_recurring") {
    return null;
  }

  const plan3 = process.env.PADDLE_PRICE_ID_PLAN_3?.trim();
  const plan5 = process.env.PADDLE_PRICE_ID_PLAN_5?.trim();
  if (plan3 && id === plan3) return 3;
  if (plan5 && id === plan5) return 5;

  return null;
}

/** @deprecated Prefer creditsForCompletedTransaction (needs origin for subscription renewals). */
export function creditsFromPaddlePriceId(priceId: string | null | undefined): number | null {
  return creditsForCompletedTransaction(priceId, null);
}
