/** One-time Paddle price IDs → interview credits to add to user_entitlements. */
export function creditsFromPaddlePriceId(priceId: string | null | undefined): number | null {
  if (!priceId?.trim()) return null;
  const id = priceId.trim();
  const c3 = process.env.PADDLE_PRICE_ID_CREDITS_3?.trim();
  const c5 = process.env.PADDLE_PRICE_ID_CREDITS_5?.trim();
  if (c3 && id === c3) return 3;
  if (c5 && id === c5) return 5;
  return null;
}
