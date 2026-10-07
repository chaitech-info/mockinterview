import { query } from "@/lib/db/server";
import {
  extractPurchaseEmail,
  extractSupabaseUserId,
  flattenPaddleTransactionEntity,
} from "@/lib/paddle/subscription-webhook";

/**
 * Resolves the user id for Paddle webhooks:
 * 1) custom_data.supabase_user_id (the checkout key kept for compatibility; value is the Neon Auth user id)
 * 2) custom_data.email / user_email → neon_auth.user via user_id_from_email()
 */
export async function resolvePaddleUserId(
  payload: Record<string, unknown>
): Promise<string | null> {
  const flat = flattenPaddleTransactionEntity(payload);

  const fromId = extractSupabaseUserId(flat);
  if (fromId) return fromId;

  const email = extractPurchaseEmail(flat);
  if (!email) return null;

  const rows = await query<{ id: string | null }>("select user_id_from_email($1)::text as id", [email]);
  return rows[0]?.id ?? null;
}
