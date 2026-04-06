import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractPurchaseEmail,
  extractSupabaseUserId,
  flattenPaddleTransactionEntity,
} from "@/lib/paddle/subscription-webhook";

/**
 * Resolves the Supabase user id for Paddle webhooks:
 * 1) custom_data.supabase_user_id (legacy checkouts)
 * 2) custom_data.email / user_email → auth.users via RPC user_id_from_email
 */
export async function resolvePaddleUserId(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<string | null> {
  const flat = flattenPaddleTransactionEntity(payload);

  const fromId = extractSupabaseUserId(flat);
  if (fromId) return fromId;

  const email = extractPurchaseEmail(flat);
  if (!email) return null;

  const { data, error } = await supabase.rpc("user_id_from_email", { p_email: email });
  if (error || data == null) {
    return null;
  }
  return String(data);
}
