import type { BillingPlan } from "@/lib/entitlements/plan";

import { planFromPaddlePriceId } from "@/lib/paddle/price-to-plan";

/** Subscription entity from Paddle webhook `data` object. */
export function extractSupabaseUserId(data: Record<string, unknown>): string | null {
  const raw = data.custom_data;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const v = o.supabase_user_id;
  return typeof v === "string" && v.length > 0 ? v : null;
}

function priceIdFromLineItem(row: Record<string, unknown>): string | null {
  const price = row.price;
  if (price && typeof price === "object" && price !== null) {
    const id = (price as { id?: string }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  if (typeof row.price_id === "string" && row.price_id.length > 0) return row.price_id;
  return null;
}

export function extractFirstPriceId(data: Record<string, unknown>): string | null {
  const items = data.items;
  if (Array.isArray(items) && items.length > 0) {
    const id = priceIdFromLineItem(items[0] as Record<string, unknown>);
    if (id) return id;
  }
  const details = data.details;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const lineItems = (details as Record<string, unknown>).line_items;
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      const id = priceIdFromLineItem(lineItems[0] as Record<string, unknown>);
      if (id) return id;
    }
  }
  return null;
}

export type ResolvedPlanResult =
  | { plan: BillingPlan; reason: string }
  | { plan: null; reason: string };

export function resolvePlanFromSubscription(
  data: Record<string, unknown>,
  eventType: string
): ResolvedPlanResult {
  const status = typeof data.status === "string" ? data.status : "";

  if (eventType === "subscription.canceled" || status === "canceled") {
    return { plan: "free", reason: "canceled" };
  }

  const priceId = extractFirstPriceId(data);
  const mapped = planFromPaddlePriceId(priceId);
  if (!mapped) {
    return { plan: null, reason: priceId ? "unmapped_price" : "no_price" };
  }
  return { plan: mapped, reason: "mapped" };
}
