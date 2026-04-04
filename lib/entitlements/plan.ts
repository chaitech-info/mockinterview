export type BillingPlan = "free" | "plan_3" | "plan_5";

/** Free: 1 mock interview / month, first 3 questions only. */
export const FREE_MAX_QUESTIONS = 3;

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

/** null = full question bank for that session (no cap). */
export function maxQuestionsForPlan(plan: BillingPlan): number | null {
  if (plan === "free") return FREE_MAX_QUESTIONS;
  return null;
}

export function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
