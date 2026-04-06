export type BillingPlan = "free" | "plan_3" | "plan_5";

/** Free / last-credit session: only the first three questions are playable. */
export const LIMITED_INTERVIEW_QUESTIONS = 3;

/** Full mock interview when the user still has credits after starting this session. */
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

/**
 * Remaining credits after starting a session: if 0, only {@link LIMITED_INTERVIEW_QUESTIONS}
 * are playable; if positive, up to {@link FULL_INTERVIEW_QUESTIONS}.
 */
export function playableQuestionCapFromCreditsBeforeConsume(creditsBeforeConsume: number): number {
  if (creditsBeforeConsume <= 1) return LIMITED_INTERVIEW_QUESTIONS;
  return FULL_INTERVIEW_QUESTIONS;
}

/** Legacy: plan-based cap; prefer credit-based caps in register-session. */
export function maxQuestionsForPlan(plan: BillingPlan): number | null {
  if (plan === "free") return LIMITED_INTERVIEW_QUESTIONS;
  return null;
}

export function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
