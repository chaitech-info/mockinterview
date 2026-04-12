/**
 * Whether the mock interview should use the full stored question bank (vs free-tier cap).
 * Aligns with {@link getEntitlementsForUser}: `profiles.has_purchased` and/or paid plan
 * (`maxQuestionsPerInterview === null`).
 */
export function hasFullQuestionBankAccess(e: {
  hasPurchased?: boolean;
  maxQuestionsPerInterview?: number | null;
}): boolean {
  if (e.hasPurchased === true) return true;
  if (e.maxQuestionsPerInterview === null) return true;
  return false;
}
