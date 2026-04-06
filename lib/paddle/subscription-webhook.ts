import type { BillingPlan } from "@/lib/entitlements/plan";

import { planFromPaddlePriceId } from "@/lib/paddle/price-to-plan";

/**
 * Webhooks sometimes send flat `data` and sometimes JSON:API-style `attributes`.
 * Merge so `custom_data`, `items`, etc. are visible at the top level.
 */
export function flattenPaddleTransactionEntity(data: Record<string, unknown>): Record<string, unknown> {
  const attrs = data.attributes;
  if (attrs && typeof attrs === "object" && attrs !== null && !Array.isArray(attrs)) {
    return { ...(attrs as Record<string, unknown>), ...data };
  }
  return data;
}

/** Subscription / transaction entity from Paddle webhook `data` object. */
export function extractSupabaseUserId(data: Record<string, unknown>): string | null {
  const flat = flattenPaddleTransactionEntity(data);
  const raw = flat.custom_data;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const v = o.supabase_user_id ?? o.supabaseUserId;
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function priceIdFromLineItem(row: Record<string, unknown>): string | null {
  const price = row.price;
  if (typeof price === "string" && price.startsWith("pri_")) return price;
  if (price && typeof price === "object" && price !== null) {
    const id = (price as { id?: string }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  if (typeof row.price_id === "string" && row.price_id.length > 0) return row.price_id;
  return null;
}

function firstPriceIdFromRows(rows: unknown[]): string | null {
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const id = priceIdFromLineItem(row as Record<string, unknown>);
    if (id) return id;
  }
  return null;
}

export function extractFirstPriceId(data: Record<string, unknown>): string | null {
  const flat = flattenPaddleTransactionEntity(data);
  const items = flat.items;
  if (Array.isArray(items) && items.length > 0) {
    const id = firstPriceIdFromRows(items);
    if (id) return id;
  }
  const details = flat.details;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const lineItems = (details as Record<string, unknown>).line_items;
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      const id = firstPriceIdFromRows(lineItems);
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
