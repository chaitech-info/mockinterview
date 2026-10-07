import type { ApiQuestion } from "@/lib/session-store";

export type StoredQuestionScore = {
  id: number;
  category: string;
  score: number;
  feedback: string;
  strength?: string;
  improvement?: string;
};

export type InterviewSessionRow = {
  session_id: string;
  user_id: string;
  jd_text: string | null;
  extracted: Record<string, unknown> | null;
  questions: unknown;
  question_scores: StoredQuestionScore[];
  status: string;
  created_at: string;
  /** Derived for UI: `completed_at` when set, else `created_at` */
  updated_at: string;
  completed_at?: string | null;
  overall_score?: number | null;
  grade?: string | null;
  hiring_likelihood?: string | null;
};

/** Saves per-question scores through the server (it derives overall score, grade and completion time). */
export async function updateInterviewSessionScores(params: {
  userId?: string;
  sessionId: string;
  questionScores: StoredQuestionScore[];
  status?: "active" | "completed";
}): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/interview-session", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: params.sessionId,
        question_scores: params.questionScores,
        status: params.status ?? "active",
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return { error: new Error(body?.error ?? `Could not save scores (HTTP ${res.status}).`) };
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Saving scores failed") };
  }
}

export type InterviewSessionSummary = {
  session_id: string;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
  /** Short preview of stored job description, if any */
  jd_preview: string | null;
  question_count: number;
  /** Average score across answered questions, or null if none scored */
  avg_score: number | null;
  question_scores: StoredQuestionScore[];
  questions: ApiQuestion[];
};

export function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && !Number.isNaN(n) ? n : null;
}

export function averageScoreFromStored(scores: StoredQuestionScore[]): number | null {
  const nums = scores.filter((s) => typeof s.score === "number");
  if (!nums.length) return null;
  const sum = nums.reduce((a, s) => a + s.score, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

/** Columns used for the dashboard list (casts keep numeric/timestamps JSON-friendly). */
export const SESSIONS_LIST_SELECT =
  "session_id, status, created_at, completed_at, jd_text, questions, overall_score::float8 as overall_score, question_scores" as const;

/** Full row fields needed to build the post-interview report. */
export const SESSION_REPORT_SELECT =
  "session_id, user_id::text as user_id, jd_text, extracted_data, questions, question_scores, status, created_at, completed_at, overall_score::float8 as overall_score, grade, hiring_likelihood" as const;

export function mapSessionRecordToInterviewRow(raw: Record<string, unknown>): InterviewSessionRow {
  const extractedRaw = raw.extracted_data ?? raw.extracted;
  const extracted =
    extractedRaw !== null &&
    typeof extractedRaw === "object" &&
    !Array.isArray(extractedRaw)
      ? (extractedRaw as Record<string, unknown>)
      : null;

  const qs = raw.question_scores;
  const question_scores: StoredQuestionScore[] = Array.isArray(qs) ? (qs as StoredQuestionScore[]) : [];

  const created_at = iso(raw.created_at);
  const completed_at = iso(raw.completed_at) || null;
  const updated_at = completed_at ?? created_at;

  return {
    session_id: String(raw.session_id ?? ""),
    user_id: String(raw.user_id ?? ""),
    jd_text: typeof raw.jd_text === "string" ? raw.jd_text : null,
    extracted,
    questions: raw.questions,
    question_scores,
    status: String(raw.status ?? ""),
    created_at,
    updated_at,
    completed_at,
    overall_score: num(raw.overall_score),
    grade: typeof raw.grade === "string" ? raw.grade : null,
    hiring_likelihood:
      typeof raw.hiring_likelihood === "string" ? raw.hiring_likelihood : null,
  };
}

/**
 * Maps DB rows to dashboard summaries (shared by API route and optional client helpers).
 */
export function mapSessionRowsToSummaries(
  rows: readonly Record<string, unknown>[]
): InterviewSessionSummary[] {
  if (!rows.length) return [];

  return rows.map((row) => {
    const questionsRaw = row.questions;
    const qCount = Array.isArray(questionsRaw) ? questionsRaw.length : 0;
    const jd = typeof row.jd_text === "string" ? row.jd_text.trim() : "";
    const jd_preview =
      jd.length > 90 ? `${jd.slice(0, 90).trim()}…` : jd || null;

    const created = iso(row.created_at);
    const completed = iso(row.completed_at) || null;
    const updatedAt = completed ?? created;

    const overall = num(row.overall_score);
    const fromOverall = overall === null ? null : Math.round(overall * 10) / 10;

    const qs = row.question_scores;
    const question_scores: StoredQuestionScore[] = Array.isArray(qs)
      ? (qs as StoredQuestionScore[])
      : [];

    const questions: ApiQuestion[] = Array.isArray(questionsRaw)
      ? (questionsRaw as ApiQuestion[])
      : [];

    return {
      session_id: String(row.session_id ?? ""),
      status: row.status === "completed" ? "completed" : "active",
      created_at: created,
      updated_at: updatedAt,
      jd_preview,
      question_count: qCount,
      avg_score: fromOverall,
      question_scores,
      questions,
    };
  });
}
