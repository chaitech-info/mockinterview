import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type BillingPlan,
  maxQuestionsForPlan,
} from "@/lib/entitlements/plan";

export type EntitlementsPayload = {
  plan: BillingPlan;
  /** Remaining interview starts (credit balance). */
  interviewCredits: number;
  canStartNewInterview: boolean;
  maxQuestionsPerInterview: number | null;
  /** @deprecated Monthly limits replaced by interview credits; kept 0 for API compatibility. */
  interviewsUsedThisMonth: number;
  /** @deprecated Monthly limits replaced by interview credits; kept 0 for API compatibility. */
  interviewsAllowedThisMonth: number;
};

function normalizePlan(raw: string | null | undefined): BillingPlan {
  if (raw === "plan_3" || raw === "plan_5") return raw;
  return "free";
}

export async function getEntitlementsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<EntitlementsPayload> {
  await supabase.rpc("ensure_user_entitlements");

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("interview_credits")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: entRow, error: entError } = await supabase
    .from("user_entitlements")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (entError) {
    throw new Error(entError.message);
  }

  const plan = normalizePlan(entRow?.plan as string | undefined);
  const credits =
    typeof profileRow?.interview_credits === "number" ? profileRow.interview_credits : 0;

  return {
    plan,
    interviewCredits: credits,
    canStartNewInterview: credits > 0,
    maxQuestionsPerInterview: maxQuestionsForPlan(plan),
    interviewsUsedThisMonth: 0,
    interviewsAllowedThisMonth: 0,
  };
}
