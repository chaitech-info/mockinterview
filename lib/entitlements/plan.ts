export type BillingPlan = "free" | "plan_3" | "plan_5";

/** Free / last-credit session: only the first three questions are playable. */
export const LIMITED_INTERVIEW_QUESTIONS = 3;

/** Full question bank stored for the session list (first {@link LIMITED_INTERVIEW_QUESTIONS} are playable). */
export const FULL_INTERVIEW_QUESTIONS = 12;

/** @deprecated Use LIMITED_INTERVIEW_QUESTIONS */
export const FREE_MAX_QUESTIONS = LIMITED_INTERVIEW_QUESTIONS;

/** Max completed intakes (mock interviews) per UTC calendar month. */
export function interviewsAllowedPerMonth(plan: BillingPlan): number {
  switch (plan) {
    case "free":
      return 1;
    case "plan_3":
      return 3;
    case "plan_5":
      return 5;
    default:
      return 1;
  }
}

/** Legacy: plan-based cap for entitlements API. */
export function maxQuestionsForPlan(plan: BillingPlan): number | null {
  if (plan === "free") return LIMITED_INTERVIEW_QUESTIONS;
  return null;
}

export function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
