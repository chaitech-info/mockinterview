import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type BillingPlan,
  interviewsAllowedPerMonth,
  maxQuestionsForPlan,
  startOfUtcMonth,
} from "@/lib/entitlements/plan";

export type EntitlementsPayload = {
  plan: BillingPlan;
  interviewsUsedThisMonth: number;
  interviewsAllowedThisMonth: number;
  maxQuestionsPerInterview: number | null;
  canStartNewInterview: boolean;
};

function normalizePlan(raw: string | null | undefined): BillingPlan {
  if (raw === "plan_3" || raw === "plan_5") return raw;
  return "free";
}

export async function getEntitlementsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<EntitlementsPayload> {
  const now = new Date();
  const monthStart = startOfUtcMonth(now).toISOString();

  const { data: entRow, error: entError } = await supabase
    .from("user_entitlements")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (entError) {
    throw new Error(entError.message);
  }

  const plan = normalizePlan(entRow?.plan as string | undefined);

  const { count, error: countError } = await supabase
    .from("interview_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  if (countError) {
    throw new Error(countError.message);
  }

  const interviewsUsedThisMonth = count ?? 0;
  const interviewsAllowedThisMonth = interviewsAllowedPerMonth(plan);
  const canStartNewInterview = interviewsUsedThisMonth < interviewsAllowedThisMonth;

  return {
    plan,
    interviewsUsedThisMonth,
    interviewsAllowedThisMonth,
    maxQuestionsPerInterview: maxQuestionsForPlan(plan),
    canStartNewInterview,
  };
}
