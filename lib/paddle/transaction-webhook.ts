import type { BillingPlan } from "@/lib/entitlements/plan";
import { creditsForCompletedTransaction } from "@/lib/paddle/credits-from-price";
import {
  extractSupabaseUserId,
  extractFirstPriceId,
  flattenPaddleTransactionEntity,
} from "@/lib/paddle/subscription-webhook";

/** Stable id for idempotency (prefer transaction id). */
export function extractTransactionDedupeId(data: Record<string, unknown>): string | null {
  const id = data.id;
  if (typeof id === "string" && id.length > 0) return id;
  return null;
}

function planForCreditPack(credits: number): BillingPlan {
  if (credits >= 5) return "plan_5";
  if (credits >= 3) return "plan_3";
  return "free";
}

export type TransactionCreditsResult =
  | { ok: true; userId: string; credits: number; priceId: string | null; plan: BillingPlan }
  | { ok: false; reason: string };

/**
 * Parses Paddle transaction webhooks (`transaction.paid`, `transaction.completed`) for credit grants.
 */
export function resolveCreditsFromTransaction(data: Record<string, unknown>): TransactionCreditsResult {
  const flat = flattenPaddleTransactionEntity(data);
  const userId = extractSupabaseUserId(flat);
  if (!userId) {
    return { ok: false, reason: "no_supabase_user_id" };
  }
  const priceId = extractFirstPriceId(flat);
  const origin = typeof flat.origin === "string" ? flat.origin : null;
  const add = creditsForCompletedTransaction(priceId, origin);
  if (add == null) {
    return { ok: false, reason: priceId ? "unmapped_price" : "no_price" };
  }
  return {
    ok: true,
    userId,
    credits: add,
    priceId,
    plan: planForCreditPack(add),
  };
}
