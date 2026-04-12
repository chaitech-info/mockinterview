import { LIMITED_INTERVIEW_QUESTIONS } from "@/lib/entitlements/plan";
import type { ApiQuestion } from "@/lib/session-store";
import type { StoredQuestionScore } from "@/lib/supabase/interview-session";

export function playableQuestionCount(bankLength: number, hasPurchased: boolean): number {
  if (hasPurchased) return bankLength;
  return Math.min(LIMITED_INTERVIEW_QUESTIONS, bankLength);
}

/** Whether every playable slot (by order in the bank) has a scored answer. */
export function allPlayableAnsweredByIds(
  orderedQuestionIds: number[],
  playableCount: number,
  answeredIds: ReadonlySet<number>
): boolean {
  const n = Math.min(playableCount, orderedQuestionIds.length);
  for (let i = 0; i < n; i++) {
    if (!answeredIds.has(orderedQuestionIds[i])) return false;
  }
  return true;
}

/** Index in the playable slice (0 … playableCount-1) of the first question without a score, or null if none. */
export function firstUnansweredPlayableIndex(
  orderedQuestionIds: number[],
  playableCount: number,
  answeredIds: ReadonlySet<number>
): number | null {
  const n = Math.min(playableCount, orderedQuestionIds.length);
  for (let i = 0; i < n; i++) {
    if (!answeredIds.has(orderedQuestionIds[i])) return i;
  }
  return null;
}

export function countUnansweredPlayable(
  questions: ApiQuestion[],
  scores: StoredQuestionScore[],
  hasPurchased: boolean
): number {
  if (!questions.length) return 0;
  const playable = playableQuestionCount(questions.length, hasPurchased);
  const answered = new Set(scores.map((s) => s.id));
  let c = 0;
  for (let i = 0; i < playable; i++) {
    if (!answered.has(questions[i].id)) c++;
  }
  return c;
}
