import {
  type BillingPlan,
  maxQuestionsForPlan,
} from "@/lib/entitlements/plan";
import { query } from "@/lib/db/server";

export type EntitlementsPayload = {
  plan: BillingPlan;
  /** Remaining interview starts (credit balance). */
  interviewCredits: number;
  canStartNewInterview: boolean;
  maxQuestionsPerInterview: number | null;
  /** True after at least one purchase; unlocks full question bank in the mock interview. */
  hasPurchased: boolean;
  /** @deprecated Monthly limits replaced by interview credits; kept 0 for API compatibility. */
  interviewsUsedThisMonth: number;
  /** @deprecated Monthly limits replaced by interview credits; kept 0 for API compatibility. */
  interviewsAllowedThisMonth: number;
};

function normalizePlan(raw: string | null | undefined): BillingPlan {
  if (raw === "plan_3" || raw === "plan_5") return raw;
  return "free";
}

export async function getEntitlementsForUser(userId: string): Promise<EntitlementsPayload> {
  const rows = await query<{ interview_credits: number; has_purchased: boolean; plan: string | null }>(
    `select p.interview_credits, p.has_purchased, e.plan
       from profiles p
       left join user_entitlements e on e.user_id = p.id
      where p.id = $1::uuid`,
    [userId]
  );
  const row = rows[0];
  const plan = normalizePlan(row?.plan);
  const credits = typeof row?.interview_credits === "number" ? row.interview_credits : 0;

  return {
    plan,
    interviewCredits: credits,
    canStartNewInterview: credits > 0,
    maxQuestionsPerInterview: maxQuestionsForPlan(plan),
    hasPurchased: row?.has_purchased === true,
    interviewsUsedThisMonth: 0,
    interviewsAllowedThisMonth: 0,
  };
}
